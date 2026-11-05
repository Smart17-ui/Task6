const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const httpError = require('../utils/httpError');
const { recalculateCourseProgress } = require('../services/progressService');
const {
  canManageCourse,
  findEnrollment,
  getManageableCourse,
  canViewCourse,
} = require('../utils/courseAccess');

// GET /api/courses/:courseId/lessons - the outline only, without lesson content.
async function listLessons(req, res) {
  const course = await Course.findById(req.params.courseId);
  if (!course || !(await canViewCourse(course, req.user))) {
    throw httpError(404, 'Course not found');
  }
  const lessons = await Lesson.find({ course: course._id })
    .select('title order')
    .sort({ order: 1 });
  res.json({ lessons });
}

// GET /api/courses/:courseId/lessons/:lessonId - the full lesson.
// Only enrolled students and the people managing the course may read it.
async function getLesson(req, res) {
  const course = await Course.findById(req.params.courseId);
  if (!course) throw httpError(404, 'Course not found');

  const allowed =
    canManageCourse(course, req.user) || (await findEnrollment(course._id, req.user));
  if (!allowed) {
    throw httpError(403, 'Enroll in this course to open its lessons');
  }

  const lesson = await Lesson.findOne({ _id: req.params.lessonId, course: course._id });
  if (!lesson) throw httpError(404, 'Lesson not found');
  res.json({ lesson });
}

// POST /api/courses/:courseId/lessons - new lessons go at the end of the course.
async function createLesson(req, res) {
  const course = await getManageableCourse(req.params.courseId, req.user);

  const lastLesson = await Lesson.findOne({ course: course._id }).sort({ order: -1 });
  const lesson = await Lesson.create({
    course: course._id,
    title: req.body.title,
    content: req.body.content,
    videoUrl: req.body.videoUrl,
    order: lastLesson ? lastLesson.order + 1 : 1,
  });

  // A new lesson means existing students have done a smaller share of the course.
  await recalculateCourseProgress(course._id);
  res.status(201).json({ lesson });
}

// PUT /api/courses/:courseId/lessons/:lessonId
async function updateLesson(req, res) {
  const course = await getManageableCourse(req.params.courseId, req.user);
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, course: course._id });
  if (!lesson) throw httpError(404, 'Lesson not found');

  for (const field of ['title', 'content', 'videoUrl']) {
    if (req.body[field] !== undefined) lesson[field] = req.body[field];
  }

  await lesson.save();
  res.json({ lesson });
}

// DELETE /api/courses/:courseId/lessons/:lessonId
async function deleteLesson(req, res) {
  const course = await getManageableCourse(req.params.courseId, req.user);
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, course: course._id });
  if (!lesson) throw httpError(404, 'Lesson not found');

  await lesson.deleteOne();

  // Close the gap in the numbering (1, 2, 4 becomes 1, 2, 3).
  await Lesson.updateMany(
    { course: course._id, order: { $gt: lesson.order } },
    { $inc: { order: -1 } }
  );

  // Remove the lesson from students' progress, then recalculate their percentages.
  await Enrollment.updateMany(
    { course: course._id },
    { $pull: { completedLessons: lesson._id } }
  );
  await Enrollment.updateMany(
    { course: course._id, lastAccessedLesson: lesson._id },
    { $set: { lastAccessedLesson: null } }
  );
  await recalculateCourseProgress(course._id);

  // A published course must always have something to study.
  const remaining = await Lesson.countDocuments({ course: course._id });
  if (remaining === 0 && course.isPublished) {
    course.isPublished = false;
    await course.save();
  }

  res.json({ message: 'Lesson deleted', courseUnpublished: remaining === 0 });
}

// PUT /api/courses/:courseId/lessons/reorder  Body: { lessonIds: [id, id, ...] }
async function reorderLessons(req, res) {
  const course = await getManageableCourse(req.params.courseId, req.user);
  const { lessonIds } = req.body;

  // The list must contain each of this course's lessons exactly once.
  const existing = await Lesson.find({ course: course._id }).select('_id');
  const existingIds = new Set(existing.map((lesson) => String(lesson._id)));
  const sameLessons =
    lessonIds.length === existingIds.size &&
    new Set(lessonIds).size === lessonIds.length &&
    lessonIds.every((id) => existingIds.has(id));
  if (!sameLessons) {
    throw httpError(400, "lessonIds must contain each of the course's lessons exactly once");
  }

  await Lesson.bulkWrite(
    lessonIds.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: index + 1 } } },
    }))
  );

  const lessons = await Lesson.find({ course: course._id }).select('title order').sort({ order: 1 });
  res.json({ lessons });
}

module.exports = {
  listLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
};
