// Runs after express-validator's rules and stops the request if any rule failed.
const { validationResult } = require('express-validator');

function validate(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  // Send one message per field so the frontend can show it next to the right input.
  const errors = result.array({ onlyFirstError: true }).map((error) => ({
    field: error.path,
    message: error.msg,
  }));
  return res.status(400).json({ message: errors[0].message, errors });
}

module.exports = validate;
