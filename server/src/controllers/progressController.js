const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const httpError = require('../utils/httpError');
const {
  applyProgress,
  logActivity,
  updateEnrollment,
  findContinueLesson,
} = require('../services/progressService');

// How many items the dashboard's "recent activity" list shows.
const ACTIVITY_LIMIT = 10;

const NOT_ENROLLED_MESSAGE = 'You are not enrolled in this course';

// Change the current student's enrollment safely, or fail if they aren't enrolled.
async function changeEnrollmentOrFail(req, applyChange) {
  const enrollment = await updateEnrollment(
    { student: req.user._id, course: req.params.courseId },
    applyChange
  );
  if (!enrollment) throw httpError(403, NOT_ENROLLED_MESSAGE);
  return enrollment;
}

// Load a lesson, making sure it really belongs to the course in the URL.
async function getLessonOrFail(req) {
  const lesson = await Lesson.findOne({ _id: req.params.lessonId, course: req.params.courseId });
  if (!lesson) throw httpError(404, 'Lesson not found');
  return lesson;
}

// The progress details sent back by every route in this file.
async function toProgressResponse(enrollment) {
  const lessons = await Lesson.find({ course: enrollment.course })
    .select('title order')
    .sort({ order: 1 });
  const continueLesson = findContinueLesson(lessons, enrollment);

  return {
    courseId: enrollment.course,
    completedLessons: enrollment.completedLessons,
    progressPercent: enrollment.progressPercent,
    lastAccessedLesson: enrollment.lastAccessedLesson,
    completedAt: enrollment.completedAt,
    totalLessons: lessons.length,
    continueLesson: continueLesson && { _id: continueLesson._id, title: continueLesson.title },
  };
}

// GET /api/progress/:courseId
async function getProgress(req, res) {
  const enrollment = await Enrollment.findOne({
    student: req.user._id,
    course: req.params.courseId,
  });
  if (!enrollment) throw httpError(403, NOT_ENROLLED_MESSAGE);
  res.json({ progress: await toProgressResponse(enrollment) });
}

// PUT /api/progress/:courseId/lessons/:lessonId/access
// Remembers where the student is, for "continue where you left off".
async function recordAccess(req, res) {
  const lesson = await getLessonOrFail(req);

  const enrollment = await changeEnrollmentOrFail(req, (current) => {
    current.lastAccessedLesson = lesson._id;
    current.lastAccessedAt = new Date();
  });

  res.json({ progress: await toProgressResponse(enrollment) });
}

// POST /api/progress/:courseId/lessons/:lessonId/complete
async function markComplete(req, res) {
  const lesson = await getLessonOrFail(req);
  const totalLessons = await Lesson.countDocuments({ course: req.params.courseId });

  const enrollment = await changeEnrollmentOrFail(req, (current) => {
    // addToSet ignores duplicates and returns what was actually added, so clicking
    // "complete" twice can't double-count the lesson or repeat the activity entry.
    const added = current.completedLessons.addToSet(lesson._id);
    if (added.length > 0) logActivity(current, 'lesson_completed', lesson.title);

    current.lastAccessedLesson = lesson._id;
    current.lastAccessedAt = new Date();
    applyProgress(current, totalLessons);
  });

  res.json({ progress: await toProgressResponse(enrollment) });
}

// DELETE /api/progress/:courseId/lessons/:lessonId/complete
async function markIncomplete(req, res) {
  const lesson = await getLessonOrFail(req);
  const totalLessons = await Lesson.countDocuments({ course: req.params.courseId });

  const enrollment = await changeEnrollmentOrFail(req, (current) => {
    current.completedLessons.pull(lesson._id);
    applyProgress(current, totalLessons);
  });

  res.json({ progress: await toProgressResponse(enrollment) });
}

// GET /api/progress/activity - newest first, across all of the student's courses.
async function getRecentActivity(req, res) {
  const enrollments = await Enrollment.find({ student: req.user._id })
    .select('course activity')
    .populate('course', 'title');

  const activity = enrollments
    .flatMap((enrollment) =>
      // Reversed so that entries saved at the same moment still list newest first,
      // such as finishing a lesson and finishing the course. (The sort below keeps
      // the existing order of entries with equal times.)
      [...enrollment.activity].reverse().map((entry) => ({
        type: entry.type,
        lessonTitle: entry.lessonTitle,
        at: entry.at,
        course: { _id: enrollment.course._id, title: enrollment.course.title },
      }))
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, ACTIVITY_LIMIT);

  res.json({ activity });
}

module.exports = { getProgress, recordAccess, markComplete, markIncomplete, getRecentActivity };
