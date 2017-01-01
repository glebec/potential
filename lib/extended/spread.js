'use strict';

const Potential = require('../core');
require('./all');

Potential.prototype.spread = function spread (handler) {
  return this
  // ensure all values are fulfilled
  .then(promisedArray => Potential.all(promisedArray))
  // spread values over handler's arguments
  .then(fulfilledValues => handler(...fulfilledValues));
};
