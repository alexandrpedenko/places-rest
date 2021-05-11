const fs = require("fs");
const mongoose = require("mongoose");
const { validationResult } = require("express-validator");

const HttpError = require("../models/http-error");
const getCoordsForAddress = require("../util/location");
const Place = require("../models/place");
const User = require("../models/user");

// GET Place by ID
const getPlacebyId = async (req, res, next) => {
  const placeId = req.params.pid;

  // Find place in DB
  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    const err = new HttpError("Could not find a place by this ID", 500);
    return next(err);
  }

  if (!place) {
    const err = new HttpError("Could not find a place by this ID", 404);
    return next(err);
  }

  // Normalize Mongoose data - getters-true
  res.json({ place: place.toObject({ getters: true }) });
};

// GET Place by User ID
const getPlacesByUserId = async (req, res, next) => {
  const userID = req.params.uid;

  let places;

  try {
    places = await Place.find({ creator: userID });
  } catch (error) {
    const err = new HttpError("Could not find a place by this ID", 500);
    return next(err);
  }

  if (!places || places.length === 0) {
    return next(new HttpError("Could not find a places for this user", 404));
  }

  // Normalize Mongoose data - getters
  res.json({
    places: places.map((place) => place.toObject({ getters: true })),
  });
};

// POST New place
const postNewPlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passsed, please check your data", 422)
    );
  }

  const { title, description, address, creator } = req.body;

  let coordinates;
  try {
    coordinates = await getCoordsForAddress(address);
  } catch (error) {
    return next(error);
  }

  // Create Place Object by Mongoose
  const createdPlace = new Place({
    title,
    description,
    address,
    location: coordinates,
    image: req.file.path,
    creator,
  });

  let user;
  try {
    user = await User.findById(creator);
  } catch (error) {
    const err = new HttpError("Created place failed", 500);
    return next(err);
  }

  if (!user) {
    const error = new HttpError("User is not exists");
    return next(error);
  }

  // Try save it to DB -- with session and Transactions
  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await createdPlace.save({ session: sess });
    user.places.push(createdPlace);
    await user.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    const err = new HttpError(
      "Created place failed, please try again later",
      500
    );
    return next(err);
  }

  res.status(201).json({ place: createdPlace });
};

// Update Place
const updatePlace = async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(
      new HttpError("Invalid inputs passsed, please check your data", 422)
    );
  }

  const { title, description } = req.body;
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId);
  } catch (error) {
    const err = new HttpError(
      "Fetching place failed, please try again later",
      500
    );
    return next(err);
  }

  if (place.creator.toString() !== req.userData.userId) {
    const err = new HttpError("You are not allowed to edit this place", 401);
    return next(err);
  }

  place.title = title;
  place.description = description;

  try {
    await place.save();
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, could not update place. Try it again later...",
      500
    );
    return next(err);
  }

  res.status(200).json({ place: place.toObject({ getters: true }) });
};

// Delete Place
const deletePlace = async (req, res, next) => {
  const placeId = req.params.pid;

  let place;
  try {
    place = await Place.findById(placeId).populate("creator");
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, could not delete place.",
      500
    );
    return next(err);
  }

  if (!place) {
    const err = new HttpError("Could not find a place for this ID", 404);
    return next(err);
  }

  if (place.creator.id !== req.userData.userId) {
    const err = new HttpError("You are not allowed to edit this place", 401);
    return next(err);
  }

  const imagePath = place.image;

  try {
    const sess = await mongoose.startSession();
    sess.startTransaction();

    await place.remove({ session: sess });
    place.creator.places.pull(place);
    await place.creator.save({ session: sess });
    await sess.commitTransaction();
  } catch (error) {
    const err = new HttpError(
      "Something went wrong, could not delete place. Try it again later...",
      500
    );
    return next(err);
  }

  fs.unlink(imagePath, (err) => {
    console.log(err);
  });

  res.status(200).json({ message: "Deleted place" });
};

exports.getPlacebyId = getPlacebyId;
exports.getPlacesByUserId = getPlacesByUserId;
exports.postNewPlace = postNewPlace;
exports.updatePlace = updatePlace;
exports.deletePlace = deletePlace;
