const axios = require('axios');
const HttpError = require('../models/http-error');

async function getCoordsForAddress(address) {
  const responce = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${process.env.MAPS_APIKEY}
  `);

  const data = responce.data;
  if (!data || data.status === 'ZERO_RESULTS') {
    const error = new HttpError(
      'Could not find location for the specified address',
      422
    );

    throw error;
  }

  const coordinates = data.results[0].geometry.location;
  return coordinates;
}

module.exports = getCoordsForAddress;
