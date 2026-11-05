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

// How many students the instructor dashboard's "new students" list shows.
const RECENT_ENROLLMENTS_LIMIT = 6;

// Escape special characters so a search like "c++" is treated as plain text rather
// than as a regular expression (which could error or be very slow).
function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Counts how many enrollments have reached a given progress value, for use in $group.
const countWhereProgressIs = (percent) => ({
  $sum: { $cond: [{ $eq: ['$progressPercent', percent] }, 1, 0] },
});

// Add lesson and enrollment counts to a list of courses. Student progress is only
// included on request, because it's for instructors and not the public catalogue.
// Using one aggregation per collection avoids a separate query for every course.
async function withStats(courses, { includeProgress = false } = {}) {
  const ids = courses.map((course) => course._id);

  const [lessonCounts, enrollmentStats] = await Promise.all([
    Lesson.aggregate([
      { $match: { course: { $in: ids } } },
      { $group: { _id: '$course', count: { $sum: 1 } } },
    ]),
    Enrollment.aggregate([
      { $match: { course: { $in: ids } } },
      {
        $group: {
          _id: '$course',
          count: { $sum: 1 },
          average: { $avg: '$progressPercent' },
          completed: countWhereProgressIs(100),
        },
      },
    ]),
  ]);

  const lessonsByCourse = new Map(lessonCounts.map((row) => [String(row._id), row.count]));
  const statsByCourse = new Map(enrollmentStats.map((row) => [String(row._id), row]));

  return courses.map((course) => {
    const stats = statsByCourse.get(String(course._id));
    const summary = {
      ...course.toJSON(),
      lessonCount: lessonsByCourse.get(String(course._id)) || 0,
      enrollmentCount: stats ? stats.count : 0,
    };
    if (includeProgress) {
      summary.averageProgress = stats ? Math.round(stats.average) : 0;
      summary.completedCount = stats ? stats.completed : 0;
    }
    return summary;
  });
}

// Headline numbers across a set of courses. Students are counted once each, even if
// they're enrolled in several of the courses.
async function summarizeEnrollments(courseIds) {
  const [totals] = await Enrollment.aggregate([
    { $match: { course: { $in: courseIds } } },
    {
      $group: {
        _id: null,
        enrollments: { $sum: 1 },
        students: { $addToSet: '$student' },
        average: { $avg: '$progressPercent' },
        completed: countWhereProgressIs(100),
      },
    },
  ]);

  if (!totals) return { students: 0, enrollments: 0, averageProgress: 0, completionRate: 0 };
  return {
    students: totals.students.length,
    enrollments: totals.enrollments,
    averageProgress: Math.round(totals.average),
    completionRate: Math.round((totals.completed / totals.enrollments) * 100),
  };
}

// Instructors manage their own courses; admins manage all of them.
const managedCoursesFilter = (user) => (user.role === 'admin' ? {} : { instructor: user._id });

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
  const courses = await Course.find(managedCoursesFilter(req.user))
    .populate('instructor', 'name email')
    .sort({ updatedAt: -1 });

  res.json({
    courses: await withStats(courses, { includeProgress: true }),
    summary: await summarizeEnrollments(courses.map((course) => course._id)),
  });
}

// GET /api/courses/managed/enrollments - the newest students across managed courses.
async function listRecentEnrollments(req, res) {
  const courses = await Course.find(managedCoursesFilter(req.user)).select('_id');
  const enrollments = await Enrollment.find({ course: { $in: courses.map((c) => c._id) } })
    .populate('student', 'name')
    .populate('course', 'title')
    .sort({ createdAt: -1 })
    .limit(RECENT_ENROLLMENTS_LIMIT);

  res.json({
    enrollments: enrollments.map((enrollment) => ({
      _id: enrollment._id,
      student: enrollment.student,
      course: enrollment.course,
      progressPercent: enrollment.progressPercent,
      enrolledAt: enrollment.createdAt,
    })),
  });
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
  listRecentEnrollments,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  listStudents,
};
