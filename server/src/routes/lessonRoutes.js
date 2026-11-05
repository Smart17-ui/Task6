const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/lessonController');
const { requireAuth, optionalAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');

// mergeParams gives these routes access to :courseId from the parent path.
const router = express.Router({ mergeParams: true });

const canEdit = [requireAuth, requireRole('instructor', 'admin')];

function lessonRules({ isUpdate }) {
  const field = (name) => (isUpdate ? body(name).optional() : body(name));
  return [
    field('title').isString().withMessage('Lesson title is required').trim()
      .notEmpty().withMessage('Lesson title is required')
      .isLength({ max: 120 }).withMessage('Lesson title must be 120 characters or fewer'),
    field('content').isString().withMessage('Lesson content is required')
      .notEmpty().withMessage('Lesson content is required'),
    body('videoUrl').optional({ values: 'falsy' }).isString().trim()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage('Video must be a valid http(s) URL'),
  ];
}

router.get('/', optionalAuth, controller.listLessons);

router.post('/', canEdit, lessonRules({ isUpdate: false }), validate, controller.createLesson);

// "/reorder" is listed before "/:lessonId" so it isn't mistaken for a lesson id.
router.put(
  '/reorder',
  canEdit,
  [
    body('lessonIds').isArray({ min: 1 }).withMessage('lessonIds must be a list of lesson ids'),
    body('lessonIds.*').isMongoId().withMessage('lessonIds must be a list of lesson ids'),
  ],
  validate,
  controller.reorderLessons
);

router.get('/:lessonId', requireAuth, controller.getLesson);
router.put('/:lessonId', canEdit, lessonRules({ isUpdate: true }), validate, controller.updateLesson);
router.delete('/:lessonId', canEdit, controller.deleteLesson);

module.exports = router;
