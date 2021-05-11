const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const csrf = require('csurf');
require('dotenv').config();

const HttpError = require('./models/http-error');
const placesRoutes = require('./routes/places-routes.js');
const userRoutes = require('./routes/users-routes');

const app = express();

const csrfProtection = csrf({
  cookie: true,
});

// Body-Parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(cookieParser());

// Set Access to uploads routes
app.use('/uploads/images', express.static(path.join('uploads', 'images')));

app.use('/api/users', userRoutes);

app.use(csrfProtection);

app.get('/api/crsf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use('/api/places', placesRoutes);

// Error routes middleware
// app.use((req, res, next) => {
//   const error = new HttpError('Could not find this route', 404);
//   throw error;
// });

// Error handler
app.use((error, req, res, next) => {
  if (req.file) {
    fs.unlink(req.file.path, (err) => {
      console.log(err);
    });
  }

  if (res.headerSent) {
    next(error);
  }

  res.status(error.code || 500);
  res.json({ message: error.message || 'An unknow error occured' });
});

const PORT = process.env.PORT || 5000;

// Set static folder
app.use(express.static('build'));
app.get('*', (req, res) =>
  res.sendFile(path.resolve(__dirname, 'build', 'index.html'))
);

// Connect to DB mongoose and start server
mongoose
  .connect(`${process.env.DB_STRING}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  })
  .catch((error) => console.log(error));
