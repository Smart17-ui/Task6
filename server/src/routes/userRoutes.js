const express = require('express');
const { body } = require('express-validator');
const controller = require('../controllers/userController');
const { requireAuth, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { ROLES } = require('../models/User');

const router = express.Router();

// Every route here is for admins only.
router.use(requireAuth, requireRole('admin'));

router.get('/', controller.listUsers);
router.put(
  '/:id/role',
  [body('role').isIn(ROLES).withMessage(`Role must be one of: ${ROLES.join(', ')}`)],
  validate,
  controller.updateRole
);
router.delete('/:id', controller.deleteUser);

module.exports = router;
