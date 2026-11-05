const express = require('express');
const { body, query } = require('express-validator');
const controller = require('../controllers/courseController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { LEVELS } = require('../models/Course');

const router = express.Router();

// Only accept http(s) links. Blocks things like "javascript:alert(1)" from ever
// being stored and later placed on a page.
const webUrl = { protocols: ['http', 'https'], require_protocol: true };

// Rules shared by create and update. On update every field is optional, so a
// request can change just one thing.
function courseRules({ isUpdate }) {
  const field = (name) => (isUpdate ? body(name).optional() : body(name));
  return [
    field('title').isString().withMessage('Title is required').trim()
      .notEmpty().withMessage('Title is required')
      .isLength({ max: 120 }).withMessage('Title must be 120 characters or fewer'),
    field('description').isString().withMessage('Description is required').trim()
      .notEmpty().withMessage('Description is required')
      .isLength({ max: 2000 }).withMessage('Description must be 2000 characters or fewer'),
    field('category').isString().withMessage('Category is required').trim()
      .notEmpty().withMessage('Category is required')
      .isLength({ max: 50 }).withMessage('Category must be 50 characters or fewer'),
    body('level').optional().isIn(LEVELS).withMessage(`Level must be one of: ${LEVELS.join(', ')}`),
    body('thumbnailUrl').optional({ values: 'falsy' }).isString().trim()
      .isURL(webUrl).withMessage('Thumbnail must be a valid http(s) URL'),
    body('isPublished').optional().isBoolean({ strict: true })
      .withMessage('isPublished must be true or false'),
  ];
}

// Public catalogue. Static paths are listed before "/:id" so Express doesn't
// treat the word "managed" as a course id.
router.get(
  '/',
  [
    query('search').optional().isString(),
    query('category').optional().isString(),
    query('level').optional().isIn(LEVELS),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
  ],
  validate,
  controller.listCourses
);
router.get('/categories', controller.listCategories);

// Instructors see their own courses here; admins see every course.
router.get('/managed', requireAuth, requireRole('instructor', 'admin'), controller.listManagedCourses);
router.get(
  '/managed/enrollments',
  requireAuth,
  requireRole('instructor', 'admin'),
  controller.listRecentEnrollments
);

router.post(
  '/',
  requireAuth,
  requireRole('instructor', 'admin'),
  courseRules({ isUpdate: false }),
  validate,
  controller.createCourse
);

router.get('/:id', optionalAuth, controller.getCourse);

router.put(
  '/:id',
  requireAuth,
  requireRole('instructor', 'admin'),
  courseRules({ isUpdate: true }),
  validate,
  controller.updateCourse
);

router.delete('/:id', requireAuth, requireRole('instructor', 'admin'), controller.deleteCourse);

router.get('/:id/students', requireAuth, requireRole('instructor', 'admin'), controller.listStudents);

module.exports = router;
