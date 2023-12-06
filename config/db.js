
const mongoose = require('mongoose');

function initializeDatabase(connectionString) {
  mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });

  const db = mongoose.connection;

  db.on('error', (error) => {
    console.error('MongoDB connection error:', error);
  });

  db.once('open', () => {
    console.log('Connected to MongoDB');
    // Start your Express server here
  });
}

module.exports = {
  initializeDatabase,
};
