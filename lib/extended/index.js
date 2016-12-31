'use strict';

const fs = require('fs');
const { Potential, $Promise } = require('../core');

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
 * @param {function} mapper Mapping function to transform elements.
 */

['all', 'race', 'map'].forEach(method => {
  $Promise.prototype[method] = function (...args) {
    return this.then(iterable => {
      return Potential[method](iterable, ...args);
    });
  };
});
