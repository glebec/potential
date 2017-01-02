'use strict';

const fs = require('fs');
const Potential = require('../core');

// extend the Potential library with additional convenience methods

fs.readdirSync(__dirname)
.filter(filename => filename !== 'index.js')
.map(filename => './' + filename)
.forEach(require);

// create instance method equivalents for each collection static method

/**
 * @method Potential#all
 * @description Instance version of {@link Potential.all}.
 * Uses fulfillment value of instance promise as input iterable.
 */

/**
 * @method Potential#race
 * @description Instance version of {@link Potential.race}.
 * Uses fulfillment value of instance promise as input iterable.
 */

/**
 * @method Potential#map
 * @description Instance version of {@link Potential.map}.
 * Uses fulfillment value of instance promise as input iterable.
 * @param {Function} mapper Mapping function to transform elements.
 */

/**
 * @method Potential#delay
 * @description Instance version of {@link Potential.delay}.
 * Uses fulfillment value of instance promise as input value.
 * @param {Number} delay Milliseconds to wait before fulfilling output promise.
 */

['all', 'race', 'map', 'delay'].forEach(method => {
  Potential.prototype[method] = function (...args) {
    return this.then(value => {
      return Potential[method](value, ...args);
    });
  };
});
