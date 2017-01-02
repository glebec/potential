'use strict';

const Potential = require('../core');
require('./all');

/**
 * Called on a promise for an iterable, `spread` allows attaching a fufillment
 * handler which receives the final values as explicit arguments (instead of
 * as an array of values).
 *
 * @method Potential#spread
 *
 * @param {function} handler - Fulfillment handler, will be invoked with
 * multiple arguments
 *
 * @returns {Potential} promise for result of handler (or parent promise
 * rejection)
 */

Potential.prototype.spread = function spread (handler) {
  return this
  .then(promisedIterable => Potential.all(promisedIterable))
  .then(fulfilledValues => handler(...fulfilledValues));
};
