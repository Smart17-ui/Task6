// Progress calculations shared by the progress, lesson, and enrollment controllers.
const Enrollment = require('../models/Enrollment');
const Lesson = require('../models/Lesson');

// How many activity entries to keep per enrollment, so documents can't grow forever.
const MAX_ACTIVITY_ENTRIES = 20;

// How many times to retry a save that collided with another request.
const MAX_SAVE_ATTEMPTS = 10;

// We round down so a course only reads 100% when every lesson really is complete
// (normal rounding would show 199 of 200 lessons as 100%).
function calculatePercent(completedCount, totalLessons) {
  if (totalLessons === 0) return 0;
  return Math.floor((completedCount / totalLessons) * 100);
}

function logActivity(enrollment, type, lessonTitle = '') {
  enrollment.activity.push({ type, lessonTitle, at: new Date() });
  if (enrollment.activity.length > MAX_ACTIVITY_ENTRIES) {
    enrollment.activity = enrollment.activity.slice(-MAX_ACTIVITY_ENTRIES);
  }
}

// Update an enrollment's percentage and completion date from its completed lessons.
// Saving is left to the caller.
function applyProgress(enrollment, totalLessons) {
  enrollment.progressPercent = calculatePercent(enrollment.completedLessons.length, totalLessons);

  const isComplete = enrollment.progressPercent === 100;
  if (isComplete && !enrollment.completedAt) {
    enrollment.completedAt = new Date();
    logActivity(enrollment, 'course_completed');
  } else if (!isComplete) {
    enrollment.completedAt = null;
  }
}

// Load an enrollment, apply a change, and save it. If another request saved the same
// enrollment in the meantime, start again from the fresh copy, so that no update is
// lost and the percentage always matches the completed lessons.
// Returns the saved enrollment, or null if no enrollment matches the filter.
async function updateEnrollment(filter, applyChange) {
  for (let attempt = 1; ; attempt += 1) {
    const enrollment = await Enrollment.findOne(filter);
    if (!enrollment) return null;

    applyChange(enrollment);

    try {
      return await enrollment.save();
    } catch (error) {
      if (error.name !== 'VersionError' || attempt >= MAX_SAVE_ATTEMPTS) throw error;
    }
  }
}

// Recalculate every student in a course. Needed whenever lessons are added or
// removed, because that changes the percentage even though the student did nothing.
async function recalculateCourseProgress(courseId) {
  const totalLessons = await Lesson.countDocuments({ course: courseId });
  const enrollments = await Enrollment.find({ course: courseId }).select('_id');
  await Promise.all(
    enrollments.map(({ _id }) =>
      updateEnrollment({ _id }, (enrollment) => applyProgress(enrollment, totalLessons))
    )
  );
}

// Decide which lesson the "Continue" button should open.
// `lessons` must be sorted by order.
function findContinueLesson(lessons, enrollment) {
  const isDone = (lesson) => enrollment.completedLessons.some((id) => id.equals(lesson._id));
  const lastId = enrollment.lastAccessedLesson;
  const lastIndex = lastId ? lessons.findIndex((lesson) => lesson._id.equals(lastId)) : -1;

  // 1. They left a lesson unfinished: go back to it.
  if (lastIndex !== -1 && !isDone(lessons[lastIndex])) return lessons[lastIndex];

  // 2. Otherwise the next unfinished lesson after it, then any unfinished lesson.
  const next = lessons.slice(lastIndex + 1).find((lesson) => !isDone(lesson));
  if (next) return next;
  const anyUnfinished = lessons.find((lesson) => !isDone(lesson));
  if (anyUnfinished) return anyUnfinished;

  // 3. Everything is done: reopen the last lesson they saw, or the first lesson.
  return lessons[lastIndex] || lessons[0] || null;
}

module.exports = {
  calculatePercent,
  logActivity,
  applyProgress,
  updateEnrollment,
  recalculateCourseProgress,
  findContinueLesson,
};
