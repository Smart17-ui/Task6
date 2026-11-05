const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/enrollmentController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Every enrollment route is for logged-in students only.
router.use(requireAuth, requireRole('student'));

router.post(
  '/',
  [body('courseId').isMongoId().withMessage('A valid courseId is required')],
  validate,
  controller.enroll
);
router.get('/me', controller.listMyEnrollments);
router.delete('/:courseId', controller.unenroll);

module.exports = router;
