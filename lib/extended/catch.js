'use strict';

const { $Promise } = require('../core');

/**
 * Syntactic sugar for adding an error handler to a promise.
 * Identical to calling `this.then(null, handler)`.
 *
 * @method Potential#catch
 * @param {function} onRejected - An error handler to be attached to a promise.
 * @returns {Potential} Resultant promise from attaching an error handler to a promise chain.
 */

$Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected);
};
