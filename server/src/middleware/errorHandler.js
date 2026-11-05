// Turns anything that goes wrong into a consistent JSON response: { message, errors? }

// Runs when no route matched the request.
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// Express recognises error handlers by their four arguments, so `next` must stay
// in the signature even though it is unused.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // An id that isn't a valid MongoDB id can't match anything, so it's simply "not found".
  if (err.name === 'CastError') {
    return res.status(404).json({ message: 'Resource not found' });
  }

  // A Mongoose schema rule failed.
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
    return res.status(400).json({ message: errors[0].message, errors });
  }

  // A unique index was violated, e.g. the same email registered twice at once.
  if (err.code === 11000) {
    return res.status(409).json({ message: 'That record already exists' });
  }

  const status = err.status || 500;

  // Unexpected errors are logged for us, but their details stay hidden from users.
  if (status >= 500) {
    console.error(err);
    return res.status(status).json({ message: 'Something went wrong on the server' });
  }
  return res.status(status).json({ message: err.message });
}

module.exports = { notFound, errorHandler };
