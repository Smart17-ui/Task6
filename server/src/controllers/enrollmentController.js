const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const httpError = require('../utils/httpError');
const { logActivity, findContinueLesson } = require('../services/progressService');

// POST /api/enrollments  Body: { courseId }
async function enroll(req, res) {
  const course = await Course.findById(req.body.courseId);
  if (!course || !course.isPublished) throw httpError(404, 'Course not found');

  if (await Enrollment.exists({ student: req.user._id, course: course._id })) {
    throw httpError(409, 'You are already enrolled in this course');
  }

  const enrollment = new Enrollment({ student: req.user._id, course: course._id });
  logActivity(enrollment, 'enrolled');
  await enrollment.save();

  res.status(201).json({ enrollment });
}

// GET /api/enrollments/me - everything the student dashboard's course lists need.
async function listMyEnrollments(req, res) {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .populate({ path: 'course', populate: { path: 'instructor', select: 'name' } })
    .sort({ lastAccessedAt: -1, createdAt: -1 });

  // Fetch all the lessons at once and group them by course (avoids one query per course).
  const courseIds = enrollments.map((enrollment) => enrollment.course._id);
  const lessons = await Lesson.find({ course: { $in: courseIds } })
    .select('title order course')
    .sort({ order: 1 });

  const lessonsByCourse = new Map();
  for (const lesson of lessons) {
    const key = String(lesson.course);
    if (!lessonsByCourse.has(key)) lessonsByCourse.set(key, []);
    lessonsByCourse.get(key).push(lesson);
  }

  res.json({
    enrollments: enrollments.map((enrollment) => {
      const courseLessons = lessonsByCourse.get(String(enrollment.course._id)) || [];
      const continueLesson = findContinueLesson(courseLessons, enrollment);
      return {
        _id: enrollment._id,
        course: enrollment.course,
        progressPercent: enrollment.progressPercent,
        completedCount: enrollment.completedLessons.length,
        totalLessons: courseLessons.length,
        lastAccessedAt: enrollment.lastAccessedAt,
        completedAt: enrollment.completedAt,
        continueLesson: continueLesson && { _id: continueLesson._id, title: continueLesson.title },
      };
    }),
  });
}

// DELETE /api/enrollments/:courseId - leaving a course also deletes its progress.
async function unenroll(req, res) {
  const removed = await Enrollment.findOneAndDelete({
    student: req.user._id,
    course: req.params.courseId,
  });
  if (!removed) throw httpError(404, 'You are not enrolled in this course');
  res.json({ message: 'You have left this course' });
}

module.exports = { enroll, listMyEnrollments, unenroll };
