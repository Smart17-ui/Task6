const jwt = require('jsonwebtoken');
const User = require('../models/User');
const httpError = require('../utils/httpError');

// Create a signed login token containing only the user's id.
function createToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /api/auth/register
async function register(req, res) {
  const { name, password, role } = req.body;
  const email = req.body.email.toLowerCase();

  if (await User.exists({ email })) {
    throw httpError(409, 'An account with that email already exists');
  }

  const user = await User.create({ name, email, password, role: role || 'student' });
  res.status(201).json({ token: createToken(user), user });
}

// POST /api/auth/login
async function login(req, res) {
  const email = req.body.email.toLowerCase();

  // The password is hidden by default, so ask for it explicitly here.
  const user = await User.findOne({ email }).select('+password');

  // Use the same message for both failures so attackers can't discover which
  // email addresses have accounts.
  if (!user || !(await user.comparePassword(req.body.password))) {
    throw httpError(401, 'Incorrect email or password');
  }

  res.json({ token: createToken(user), user });
}

// GET /api/auth/me - lets the frontend restore the session after a page reload.
function getMe(req, res) {
  res.json({ user: req.user });
}

// There is no logout endpoint: a JWT is stored by the browser, so logging out
// means the frontend deletes it. See the README for the trade-offs.

module.exports = { register, login, getMe };
