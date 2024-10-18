const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const uploadRoute = require('./routes/uploadeRoute');
const app = express();

// this is for mongodb connection
require('./database/mongodb')

// data connection helpers
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// file uploade handler in this code
app.use('/api', uploadRoute);


// all error in this sectiton thats means world error handler
app.use((err, req, res, next) => {
  console.error('You have a world error:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });
  res.status(500).json({
    message: 'You have a world error',
    error: {
      name: err.name,
      message: err.message,
      stack: err.stack,
    },
  });
});


// server running process or port
const PORT = process.env.PORT || 7898;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
