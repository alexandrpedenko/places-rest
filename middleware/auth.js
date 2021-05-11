const jwt = require('jsonwebtoken');
const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }

  try {
    // console.log(req.headers.authorization);
    const token = req.headers.authorization.split(' ')[1]; // Authorization: "Bearer Token"

    if (!token) {
      throw new Error('Authentication error');
    }

    const decodedToken = jwt.verify(token, `${process.env.JWT_SECRET}`);
    req.userData = { userId: decodedToken.userId };

    next();
  } catch (error) {
    const err = new HttpError('Authorization failed', 403);
    return next(err);
  }
};
