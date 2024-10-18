const mongoose = require('mongoose');
const secret = require('../secret/secret');

mongoose.connect(secret.mongodb)
  .then(() => {
    console.log('MongoDB is connected successfully');
  })
  .catch((err) => {
    console.log(`MongoDB connection problem: ${err.message}`);
    process.exit(1);
  });
