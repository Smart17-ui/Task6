// Course: created by an instructor. Students only see it once it is published.
const mongoose = require('mongoose');

const LEVELS = ['beginner', 'intermediate', 'advanced'];

const courseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, required: true, trim: true, maxlength: 50 },
    thumbnailUrl: { type: String, trim: true, default: '' },
    level: { type: String, enum: LEVELS, default: 'beginner' },
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isPublished: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    // Include the virtual "lessons" field below when converting to JSON.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// The ordered list of lessons. A virtual is not stored on the course: each lesson
// stores its course and order number, and Mongoose looks them up on .populate().
// That way the order only lives in one place and can never get out of sync.
courseSchema.virtual('lessons', {
  ref: 'Lesson',
  localField: '_id',
  foreignField: 'course',
  options: { sort: { order: 1 } },
});

courseSchema.index({ isPublished: 1, category: 1 });
courseSchema.index({ instructor: 1 });

module.exports = mongoose.model('Course', courseSchema);
module.exports.LEVELS = LEVELS;
