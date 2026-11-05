// Entry point: load settings, connect to the database, then start listening.
// The Express app itself lives in app.js so tests can use it without a real port.
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 4000;

async function start() {
  // Fail immediately with a clear message rather than on the first login.
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
  }

  await connectDB(process.env.MONGODB_URI);
  app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
}

start().catch((error) => {
  console.error('Could not start the server:', error.message);
  process.exit(1);
});
