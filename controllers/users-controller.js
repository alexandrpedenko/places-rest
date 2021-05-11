const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');
const User = require('../models/user');

const getUsers = async (req, res, next) => {
  let users;
  try {
    users = await User.find({}, '-password');
  } catch (error) {
    return next(
      new HttpError('Fetching users failed, please try it again later', 422)
    );
  }

  if (!users || users.length === 0) {
    return next(new HttpError('No one user found', 422));
  }

  res
    .status(201)
    .json({ users: users.map((user) => user.toObject({ getters: true })) });
};

const signUp = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passsed, please check your data', 422)
    );
  }

  const { name, email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    const err = new HttpError('Sing up failed, please try again later', 500);
    return next(err);
  }

  if (existingUser) {
    const error = new HttpError('User already exists', 422);
    return next(error);
  }

  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 12);
  } catch (error) {
    const err = new HttpError('Sing up failed, please try again later', 500);
    return next(err);
  }

  const createdUser = await new User({
    name,
    email,
    image: req.file.path,
    password: hashedPassword,
    places: [],
  });

  try {
    await createdUser.save();
  } catch (error) {
    const err = new HttpError('Sign up failed, please try again', 500);
    return next(err);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: createdUser.id,
        email: createdUser.email,
        iss: 'api.placez',
        aud: 'api.placez',
      },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
    });
  } catch (error) {
    const err = new HttpError('Sign up failed, please try again', 500);
    return next(err);
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token });
};

const logIn = async (req, res, next) => {
  const { email, password } = req.body;

  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (error) {
    const err = new HttpError('Logging up failed, please try again later', 500);
    return next(err);
  }

  if (!existingUser) {
    const error = new HttpError(
      'Invalid credentials, could not log you in',
      403
    );
    return next(error);
  }

  let isValidPasword = false;
  try {
    isValidPasword = await bcrypt.compare(password, existingUser.password);
  } catch (error) {
    const err = new HttpError('Logging up failed, please try again later', 403);
    return next(err);
  }

  if (!isValidPasword) {
    const error = new HttpError(
      'Invalid credentials, could not log you in',
      401
    );
    return next(error);
  }

  let token;
  try {
    token = jwt.sign(
      {
        userId: existingUser.id,
        email: existingUser.email,
        iss: 'api.placez',
        aud: 'api.placez',
      },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
    });
  } catch (error) {
    const err = new HttpError('Logging failed, please try again', 500);
    return next(err);
  }

  res.json({
    userId: existingUser.id,
    email: existingUser.email,
    token: token,
  });
};

exports.getUsers = getUsers;
exports.signUp = signUp;
exports.logIn = logIn;
