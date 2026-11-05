// Lesson: one step in a course. Its content is markdown text.
const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true },
    videoUrl: { type: String, trim: true, default: '' },
    // Position within the course, starting at 1.
    order: { type: Number, required: true, min: 1 },
  },
  { timestamps: true }
);

// Fetching a course's lessons in order is the most common query, so index it.
lessonSchema.index({ course: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
