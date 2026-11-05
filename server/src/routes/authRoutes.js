const express = require('express');
const rateLimit = require('express-rate-limit').default;
const { body } = require('express-validator');
const { register, login, getMe } = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Slow down password guessing: at most 20 attempts per IP every 15 minutes.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please try again in a few minutes.' },
  skip: () => process.env.NODE_ENV === 'test',
});

router.post(
  '/register',
  authLimiter,
  [
    body('name').isString().trim().notEmpty().withMessage('Name is required')
      .isLength({ max: 80 }).withMessage('Name must be 80 characters or fewer'),
    body('email').isString().withMessage('Please enter a valid email address').trim()
      .isEmail().withMessage('Please enter a valid email address'),
    // bcrypt only uses the first 72 bytes of a password, hence the upper limit.
    body('password').isString().withMessage('Password is required')
      .isLength({ min: 8, max: 72 }).withMessage('Password must be 8 to 72 characters long'),
    // "admin" is deliberately not allowed here: admins can't be self-registered.
    body('role').optional().isIn(['student', 'instructor'])
      .withMessage('Role must be student or instructor'),
  ],
  validate,
  register
);

router.post(
  '/login',
  authLimiter,
  [
    body('email').isString().withMessage('Please enter a valid email address').trim()
      .isEmail().withMessage('Please enter a valid email address'),
    body('password').isString().notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.get('/me', requireAuth, getMe);

module.exports = router;
