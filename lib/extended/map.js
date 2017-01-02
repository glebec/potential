'use strict';

const Potential = require('../core');

/**
 * Take a collection of parallel promises, return a promise for an array of
 * corresponding values mapped through a user-provided function. Promises can
 * fulfill in any order, yet the output array will match the original
 * collection. The input collection can be an iterable (arrays are iterables),
 * or a promise for an iterable. The values of the input collection can be any
 * mix of promises and /or normal values. If any input promise rejects, the
 * output promise immediately rejects.
 *
 * @method Potential.map
 *
 * @param {iterable|Thenable.<iterable>} iterable - Collection (or thenable for
 * collection) of values (or thenables for values)
 *
 * @returns {Potential.<Array>} A promise for an array of ordered, non-promise
 * values, mapped through the `mapper`
 */

Potential.map = function map (iterable, mapper) {

  if (typeof mapper !== 'function') {
    throw new TypeError('`Potential.map` needs a mapper function');
  }

  /**
   * An alternate implementation would be almost identical to `all` except it
   * would apply the mapper as each element fulfills.
   */

  return Potential.all(iterable)
  .then(values => values.map(mapper));

};
