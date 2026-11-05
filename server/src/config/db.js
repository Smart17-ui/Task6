// Opens the connection to MongoDB through Mongoose.
const mongoose = require('mongoose');

async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy .env.example to .env and fill it in.');
  }
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
}

module.exports = connectDB;
