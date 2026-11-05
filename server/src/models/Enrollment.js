// Enrollment: links one student to one course and holds their progress in it.
const mongoose = require('mongoose');

// One entry in the student's recent activity feed. The titles are copied here so
// the feed still reads correctly if a lesson is later renamed or deleted.
const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['enrolled', 'lesson_completed', 'course_completed'],
      required: true,
    },
    lessonTitle: { type: String, default: '' },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const enrollmentSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    completedLessons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lesson' }],
    progressPercent: { type: Number, default: 0, min: 0, max: 100 },
    lastAccessedLesson: { type: mongoose.Schema.Types.ObjectId, ref: 'Lesson', default: null },
    lastAccessedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    activity: [activitySchema],
  },
  {
    timestamps: true,
    // If two requests load the same enrollment and both try to save, the second save
    // fails with a VersionError instead of silently overwriting the first one's work.
    // updateEnrollment() in progressService.js catches that error and tries again.
    optimisticConcurrency: true,
  }
);

// The database itself guarantees a student can only enroll in a course once.
enrollmentSchema.index({ student: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ course: 1 });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
