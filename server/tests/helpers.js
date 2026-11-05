// Shared test tools. Tests run against a throwaway in-memory MongoDB, so they need
// no setup and can never touch your real data.
const mongoose = require('mongoose');
const request = require('supertest');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Course = require('../src/models/Course');
const Lesson = require('../src/models/Lesson');

let mongoServer;

async function connectTestDb() {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  // Wait for unique indexes, so tests that rely on them behave like production.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

async function clearTestDb() {
  await Promise.all(Object.values(mongoose.models).map((model) => model.deleteMany({})));
}

async function closeTestDb() {
  await mongoose.disconnect();
  await mongoServer.stop();
}

// Create a user directly in the database and log them in through the API.
// Returns the user and an "auth" header value for requests.
async function createUserAndLogin(role = 'student', email = `${role}@test.com`) {
  const password = 'Password123';
  const user = await User.create({ name: `Test ${role}`, email, password, role });
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return { user, auth: `Bearer ${res.body.token}` };
}

// Create a course with the given number of lessons, published by default.
async function createCourse(instructor, { lessonCount = 2, isPublished = true } = {}) {
  const course = await Course.create({
    title: 'Test Course',
    description: 'A course for testing',
    category: 'Testing',
    instructor: instructor._id,
    isPublished,
  });
  const lessons = [];
  for (let order = 1; order <= lessonCount; order += 1) {
    lessons.push(
      await Lesson.create({
        course: course._id,
        title: `Lesson ${order}`,
        content: `Secret content of lesson ${order}`,
        order,
      })
    );
  }
  return { course, lessons };
}

module.exports = {
  app,
  request,
  connectTestDb,
  clearTestDb,
  closeTestDb,
  createUserAndLogin,
  createCourse,
};
