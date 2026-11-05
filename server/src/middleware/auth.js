// Authentication ("who are you?") and authorization ("are you allowed?") middleware.
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const httpError = require('../utils/httpError');

// Read the token from the "Authorization: Bearer <token>" header and load its user.
// Returns null when there is no token or it is invalid or expired.
async function getUserFromRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;

  try {
    const payload = jwt.verify(header.slice('Bearer '.length), process.env.JWT_SECRET, {
      algorithms: ['HS256'],
    });
    // Load from the database so deleted users and role changes take effect immediately.
    return await User.findById(payload.id);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) return null; // bad or expired token
    throw error; // a real problem, such as the database being down
  }
}

// Blocks the request unless a valid token is provided.
async function requireAuth(req, res, next) {
  const user = await getUserFromRequest(req);
  if (!user) throw httpError(401, 'Please log in to continue');
  req.user = user;
  next();
}

// For public pages that show extra information to logged-in users.
// A missing or invalid token is fine: the visitor is treated as anonymous.
async function optionalAuth(req, res, next) {
  req.user = await getUserFromRequest(req);
  next();
}

// Blocks the request unless the user has one of the given roles.
// Must run after requireAuth. Example: requireRole('instructor', 'admin')
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw httpError(403, 'You do not have permission to do this');
    }
    next();
  };
}

module.exports = { requireAuth, optionalAuth, requireRole };
