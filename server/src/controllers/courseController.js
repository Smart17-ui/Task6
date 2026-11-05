const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const httpError = require('../utils/httpError');
const { findContinueLesson } = require('../services/progressService');
const {
  canManageCourse,
  findEnrollment,
  getManageableCourse,
  canViewCourse,
} = require('../utils/courseAccess');

// Escape special characters so a search like "c++" is treated as plain text rather
// than as a regular expression (which could error or be very slow).
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Add lesson counts, enrollment counts, and average progress to a list of courses.
// Using one aggregation per collection avoids a separate query for every course.
async function withStats(courses) {
  const ids = courses.map((course) => course._id);

  const [lessonCounts, enrollmentStats] = await Promise.all([
    Lesson.aggregate([
      { $match: { course: { $in: ids } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    Enrollment.aggregate([
      { $match: { course: { $in: ids } } },
      { $group: { _id: '$course', count: { $sum: 1 }, average: { $avg: '$progressPercent' } } },
    ]),
  ]);

  const lessonsByCourse = new Map(lessonCounts.map((row) => [String(row._id), row.count]));
  const statsByCourse = new Map(enrollmentStats.map((row) => [String(row._id), row]));

  return courses.map((course) => {
    const stats = statsByCourse.get(String(course._id));
    return {
      ...course.toJSON(),
      lessonCount: lessonsByCourse.get(String(course._id)) || 0,
      enrollmentCount: stats ? stats.count : 0,
      averageProgress: stats ? Math.round(stats.average) : 0,
    };
  });
}

// GET /api/courses?search=&category=&level=&page=&limit=
async function listCourses(req, res) {
  const { search, category, level } = req.query;
  const page = req.query.page || 1;
  const limit = req.query.limit || 12;

  const filter = { isPublished: true };
  if (category) filter.category = category;
  if (level) filter.level = level;
  if (search && search.trim()) {
    const pattern = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ title: pattern }, { description: pattern }, { category: pattern }];
  }

  const [courses, total] = await Promise.all([
    Course.find(filter)
      .populate('instructor', 'name')
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Course.countDocuments(filter),
  ]);

  res.json({
    courses: await withStats(courses),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// GET /api/courses/categories - the options for the catalogue's category filter.
async function listCategories(req, res) {
  const categories = await Course.distinct('category', { isPublished: true });
  res.json({ categories: categories.sort((a, b) => a.localeCompare(b)) });
}

// GET /api/courses/managed - drives the instructor dashboard and admin course list.
async function listManagedCourses(req, res) {
  const filter = req.user.role === 'admin' ? {} : { instructor: req.user._id };
  const courses = await Course.find(filter)
    .populate('instructor', 'name email')
    .sort({ updatedAt: -1 });
  res.json({ courses: await withStats(courses) });
}

// GET /api/courses/:id - course details and lesson outline (never the lesson content).
async function getCourse(req, res) {
  const course = await Course.findById(req.params.id)
    .populate('instructor', 'name')
    .populate({ path: 'lessons', select: 'title order videoUrl' });
  if (!course) throw httpError(404, 'Course not found');

  const enrollment = await findEnrollment(course._id, req.user);

  // Treat a hidden draft as missing, so its existence isn't revealed.
  if (!(await canViewCourse(course, req.user, enrollment))) {
    throw httpError(404, 'Course not found');
  }

  const { lessons, ...courseData } = course.toJSON();
  const continueLesson = enrollment ? findContinueLesson(course.lessons, enrollment) : null;

  res.json({
    course: {
      ...courseData,
      // Tell the outline whether a lesson has a video, without exposing the link.
      lessons: lessons.map(({ _id, title, order, videoUrl }) => ({
        _id,
        title,
        order,
        hasVideo: Boolean(videoUrl),
      })),
    },
    canManage: canManageCourse(course, req.user),
    enrollment: enrollment && {
      completedLessons: enrollment.completedLessons,
      progressPercent: enrollment.progressPercent,
      lastAccessedLesson: enrollment.lastAccessedLesson,
      completedAt: enrollment.completedAt,
      continueLesson: continueLesson && { _id: continueLesson._id, title: continueLesson.title },
    },
  });
}

// POST /api/courses
async function createCourse(req, res) {
  // A brand-new course has no lessons, so it always starts as a draft.
  const { title, description, category, level, thumbnailUrl } = req.body;
  const course = await Course.create({
    title,
    description,
    category,
    level,
    thumbnailUrl,
    instructor: req.user._id, // always the logged-in user, never taken from the request
    isPublished: false,
  });
  res.status(201).json({ course });
}

// PUT /api/courses/:id
async function updateCourse(req, res) {
  const course = await getManageableCourse(req.params.id, req.user);

  // Publishing an empty course would give students nothing to study.
  if (req.body.isPublished === true) {
    const lessonCount = await Lesson.countDocuments({ course: course._id });
    if (lessonCount === 0) {
      throw httpError(400, 'Add at least one lesson before publishing this course');
    }
  }

  // Copy only the fields we allow, so a request can't change e.g. the instructor.
  for (const field of ['title', 'description', 'category', 'level', 'thumbnailUrl', 'isPublished']) {
    if (req.body[field] !== undefined) course[field] = req.body[field];
  }

  await course.save();
  res.json({ course });
}

// DELETE /api/courses/:id - also removes the course's lessons and enrollments.
async function deleteCourse(req, res) {
  const course = await getManageableCourse(req.params.id, req.user);
  await Promise.all([
    Lesson.deleteMany({ course: course._id }),
    Enrollment.deleteMany({ course: course._id }),
  ]);
  await course.deleteOne();
  res.json({ message: 'Course deleted' });
}

// GET /api/courses/:id/students - who is enrolled and how far along they are.
async function listStudents(req, res) {
  const course = await getManageableCourse(req.params.id, req.user);
  const [enrollments, totalLessons] = await Promise.all([
    Enrollment.find({ course: course._id })
      .populate('student', 'name email')
      .populate('lastAccessedLesson', 'title')
      .sort({ progressPercent: -1, createdAt: 1 }),
    Lesson.countDocuments({ course: course._id }),
  ]);

  res.json({
    course: { _id: course._id, title: course.title },
    totalLessons,
    students: enrollments.map((enrollment) => ({
      _id: enrollment._id,
      student: enrollment.student,
      progressPercent: enrollment.progressPercent,
      completedCount: enrollment.completedLessons.length,
      lastAccessedLesson: enrollment.lastAccessedLesson,
      lastAccessedAt: enrollment.lastAccessedAt,
      enrolledAt: enrollment.createdAt,
    })),
  });
}

module.exports = {
  listCourses,
  listCategories,
  listManagedCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listStudents,
};
