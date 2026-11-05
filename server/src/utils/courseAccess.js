// Rules for who may see or change a course, kept in one place so that every
// controller applies them the same way.
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const httpError = require('./httpError');

// The course's instructor and admins can manage it.
function canManageCourse(course, user) {
  if (!user) return false;
  // course.instructor may be an id, or a full user object after .populate().
  const instructorId = course.instructor._id || course.instructor;
  return user.role === 'admin' || instructorId.equals(user._id);
}

// Find the student's enrollment in a course, or null if they have none.
function findEnrollment(courseId, user) {
  if (!user) return null;
  return Enrollment.findOne({ course: courseId, student: user._id });
}

// Load a course and check the current user is allowed to change it.
async function getManageableCourse(courseId, user) {
  const course = await Course.findById(courseId);
  if (!course) throw httpError(404, 'Course not found');
  if (!canManageCourse(course, user)) {
    throw httpError(403, 'You can only manage your own courses');
  }
  return course;
}

// Published courses are public. Drafts are only visible to people who manage the
// course, and to students who enrolled before it was unpublished, so that hiding a
// course from the catalogue never takes it away from someone already studying it.
async function canViewCourse(course, user, enrollment) {
  if (course.isPublished) return true;
  if (canManageCourse(course, user)) return true;
  const existing = enrollment === undefined ? await findEnrollment(course._id, user) : enrollment;
  return Boolean(existing);
}

module.exports = { canManageCourse, findEnrollment, getManageableCourse, canViewCourse };
