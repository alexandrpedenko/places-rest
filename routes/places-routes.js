const express = require('express');
const { check } = require('express-validator');
const jwt = require('express-jwt');
const placesControllers = require('../controllers/places-controller');
const fileUpload = require('../middleware/file-upload');
const attachUser = require('../middleware/attachUser');

const auth = require('../middleware/auth');

const router = express.Router();

const checkJwt = jwt({
  secret: process.env.JWT_SECRET,
  issuer: 'api.placez',
  audience: 'api.placez',
  algorithms: ['HS256'],
  getToken: (req) => req.cookies.token,
});

router.get('/:pid', placesControllers.getPlacebyId);
router.get('/user/:uid', placesControllers.getPlacesByUserId);

router.use(attachUser);
router.use(checkJwt);

router.post(
  '/',
  fileUpload.single('image'),
  [
    check('title').not().isEmpty(),
    check('description').isLength({ min: 4 }),
    check('address').not().isEmpty(),
  ],
  placesControllers.postNewPlace
);

router.patch(
  '/:pid',

  [check('title').not().isEmpty(), check('description').isLength({ min: 4 })],
  placesControllers.updatePlace
);

router.delete('/:pid', placesControllers.deletePlace);

module.exports = router;
