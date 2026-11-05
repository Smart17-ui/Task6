// Builds and configures the Express application.
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const lessonRoutes = require('./routes/lessonRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const progressRoutes = require('./routes/progressRoutes');
const userRoutes = require('./routes/userRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Hosts like Render sit in front of the app as a proxy. This tells Express to
// read the real visitor IP from that proxy, which the login rate limiter needs.
app.set('trust proxy', 1);

// Adds common security-related HTTP headers.
app.use(helmet());

// CORS: only the websites listed in CLIENT_URL may call this API from a browser.
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim().replace(/\/$/, ''));
app.use(cors({ origin: allowedOrigins }));

// Parse JSON request bodies into req.body. The limit leaves room for long lessons.
app.use(express.json({ limit: '1mb' }));

// A simple endpoint for uptime checks (Render's health check uses it).
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Feature routes.
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/courses/:courseId/lessons', lessonRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/users', userRoutes);

// These must come last: they catch unknown routes and any errors thrown above.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
