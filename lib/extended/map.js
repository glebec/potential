'use strict';

const Potential = require('../core');

Potential.map = function map (iterable, mapper) {

  if (typeof mapper !== 'function') {
    throw new TypeError('`Potential.map` needs a mapper function');
  }

  /**
   * A very simple implementation would use `all`:
   *
   */

  return Potential.all(iterable)
  .then(values => values.map(mapper));

};
