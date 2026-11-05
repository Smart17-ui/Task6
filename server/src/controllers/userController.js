// Admin-only user management.
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Enrollment = require('../models/Enrollment');
const httpError = require('../utils/httpError');

// GET /api/users
async function listUsers(req, res) {
  const users = await User.find().sort({ createdAt: -1 });
  res.json({ users });
}

// PUT /api/users/:id/role  Body: { role }
async function updateRole(req, res) {
  // Stops the last admin from accidentally locking everyone out.
  if (req.user._id.equals(req.params.id)) {
    throw httpError(400, 'You cannot change your own role');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');

  user.role = req.body.role;
  await user.save();
  res.json({ user });
}

// DELETE /api/users/:id - also removes their courses and enrollments, so nothing
// is left pointing at a user who no longer exists.
async function deleteUser(req, res) {
  if (req.user._id.equals(req.params.id)) {
    throw httpError(400, 'You cannot delete your own account');
  }
  const user = await User.findById(req.params.id);
  if (!user) throw httpError(404, 'User not found');

  const courses = await Course.find({ instructor: user._id }).select('_id');
  const courseIds = courses.map((course) => course._id);

  await Promise.all([
    Lesson.deleteMany({ course: { $in: courseIds } }),
    // Their own enrollments, and other students' enrollments in their courses.
    Enrollment.deleteMany({ $or: [{ student: user._id }, { course: { $in: courseIds } }] }),
    Course.deleteMany({ _id: { $in: courseIds } }),
  ]);
  await user.deleteOne();

  res.json({ message: 'User deleted' });
}

module.exports = { listUsers, updateRole, deleteUser };
