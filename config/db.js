const dotenv = require('dotenv');
const mongoose = require('mongoose');
dotenv.config();

const dbuser = process.env.MDBUSER;
const dbpass = process.env.MDBPASS;
//change
// Replace these with your MongoDB Atlas connection string and database name
const connectionString = `mongodb+srv://${dbuser}:${dbpass}@cluster0.flwyiot.mongodb.net/sample_restaurants`;

const initializeMongoDB = async () => {
  try {
    await mongoose.connect(connectionString, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1); // Exit the process if MongoDB connection fails
  }
};

module.exports = initializeMongoDB;