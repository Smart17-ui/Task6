// Fills the database with sample users, courses, lessons, and progress.
// Run with: npm run seed
//
// WARNING: this deletes ALL existing data first. It refuses to run when
// NODE_ENV is "production", so it can't wipe a live site by accident.
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const { applyProgress, logActivity } = require('../services/progressService');
const courses = require('./sampleCourses');

const USERS = {
  admin: { name: 'Avery Admin', email: 'admin@example.com', password: 'Admin123!', role: 'admin' },
  instructor: {
    name: 'Imani Okafor',
    email: 'instructor@example.com',
    password: 'Instructor123!',
    role: 'instructor',
  },
  student: { name: 'Sam Student', email: 'student@example.com', password: 'Student123!', role: 'student' },
  // A second student makes the instructor's "average progress" figure meaningful.
  student2: { name: 'Riley Chen', email: 'riley@example.com', password: 'Student123!', role: 'student' },
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Create an enrollment with the first `completedCount` lessons already finished.
// `startedDaysAgo` spreads the activity out over time, one entry per day, so the
// dashboard's recent activity looks like real use.
async function enroll(student, course, lessons, completedCount, startedDaysAgo) {
  const enrollment = new Enrollment({ student: student._id, course: course._id });
  logActivity(enrollment, 'enrolled');

  for (const lesson of lessons.slice(0, completedCount)) {
    enrollment.completedLessons.push(lesson._id);
    logActivity(enrollment, 'lesson_completed', lesson.title);
  }

  applyProgress(enrollment, lessons.length);

  const startedAt = Date.now() - startedDaysAgo * DAY_IN_MS;
  enrollment.createdAt = new Date(startedAt);
  enrollment.activity.forEach((entry, index) => {
    entry.at = new Date(startedAt + index * DAY_IN_MS);
  });

  const lastActiveAt = enrollment.activity[enrollment.activity.length - 1].at;
  if (enrollment.completedAt) enrollment.completedAt = lastActiveAt;

  // A partly finished student "left off" at the lesson after their last completed one.
  if (completedCount > 0) {
    enrollment.lastAccessedLesson = lessons[Math.min(completedCount, lessons.length - 1)]._id;
    enrollment.lastAccessedAt = lastActiveAt;
  }

  await enrollment.save();
}

async function seed() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to seed: NODE_ENV is "production" and seeding deletes all data.');
  }

  await connectDB(process.env.MONGODB_URI);

  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Lesson.deleteMany({}),
    Enrollment.deleteMany({}),
  ]);

  // create() runs one at a time through the "save" hook, which hashes each password.
  const instructor = await User.create(USERS.instructor);
  const student = await User.create(USERS.student);
  const student2 = await User.create(USERS.student2);
  await User.create(USERS.admin);

  const created = [];
  for (const { lessons, ...courseData } of courses) {
    const course = await Course.create({ ...courseData, instructor: instructor._id });
    const courseLessons = await Lesson.insertMany(
      lessons.map((lesson, index) => ({ ...lesson, course: course._id, order: index + 1 }))
    );
    created.push({ course, lessons: courseLessons });
  }

  // Give the dashboards something to show: one course in progress, one finished.
  const [webBasics, jsEssentials, designBasics] = created;
  await enroll(student, webBasics.course, webBasics.lessons, 2, 3);
  await enroll(student, designBasics.course, designBasics.lessons, designBasics.lessons.length, 10);
  await enroll(student2, webBasics.course, webBasics.lessons, 1, 5);
  await enroll(student2, jsEssentials.course, jsEssentials.lessons, 0, 2);

  console.log('\nSeed complete. Test accounts:');
  for (const { email, password, role } of Object.values(USERS)) {
    console.log(`  ${role.padEnd(11)} ${email.padEnd(25)} ${password}`);
  }
}

seed()
  .catch((error) => {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
