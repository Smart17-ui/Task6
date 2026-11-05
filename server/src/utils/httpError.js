// Creates an Error carrying an HTTP status code. Throw it from any controller and
// the error handler middleware turns it into a JSON response.
//
// Example: throw httpError(404, 'Course not found');
function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

module.exports = httpError;
