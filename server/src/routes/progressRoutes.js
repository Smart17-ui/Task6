const express = require('express');
const controller = require('../controllers/progressController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Progress belongs to students. Each handler also checks for an enrollment.
router.use(requireAuth, requireRole('student'));

// "/activity" is listed before "/:courseId" so it isn't mistaken for a course id.
router.get('/activity', controller.getRecentActivity);

router.get('/:courseId', controller.getProgress);
router.put('/:courseId/lessons/:lessonId/access', controller.recordAccess);
router.post('/:courseId/lessons/:lessonId/complete', controller.markComplete);
router.delete('/:courseId/lessons/:lessonId/complete', controller.markIncomplete);

module.exports = router;
