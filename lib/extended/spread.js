'use strict';

const { Potential, $Promise } = require('../core');
require('./all');

$Promise.prototype.spread = function spread (handler) {
  return this
  // ensure all values are fulfilled
  .then(promisedArray => Potential.all(promisedArray))
  // spread values over handler's arguments
  .then(fulfilledValues => handler(...fulfilledValues));
};
