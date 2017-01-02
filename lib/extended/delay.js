'use strict';

const Potential = require('../core');

/**
 * Create a promise which resolves with `value` after `delay` milliseconds.
 * If `value` is a thenable / promise, the timer begins after resolution.
 *
 * @method Potential.delay
 *
 * @param {*} value - Value to resolve with
 * @param {Number} delay - Milliseconds to wait before resolution
 * @returns {Potential} The resolved value
 */

Potential.delay = function (value, delay) {

  return Potential.resolve(value)
  .then(result => new Potential(resolve => {
    setTimeout(() => resolve(result), delay);
  }));

};
