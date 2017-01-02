'use strict';

const Potential = require('../core');

/**
 * Take a collection of parallel promises, return a promise for the first value
 * to fulfill. If any input promise rejects before then, the output promise
 * immediately rejects. The input collection can be an iterable (arrays are
 * iterables), or a promise for an iterable. The values of the input collection
 * can be any mix of promises and /or normal values.
 *
 * @param {iterable|Thenable.<iterable>} iterable - Collection (or thenable for
 * collection) of values (or thenables for values)
 *
 * @returns {Potential} A promise for the first value to fulfill
 */

Potential.race = function race (iterable) {

  return new Potential((resolveRace, rejectRace) => {

    Potential.resolve(iterable)
    .then(actualIterable => {

      Array.from(actualIterable)
      .map(element => Potential.resolve(element))
      .forEach(valuePromise => {

        valuePromise
        .then(resolveRace)
        .catch(rejectRace);

      });

    })
    .catch(rejectRace);

  });

};
