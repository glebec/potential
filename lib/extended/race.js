'use strict';

const { Potential } = require('../core');

/**
 * Take a collection of parallel promises, return a promise for the first value to fulfill.
 * If any input promise rejects before then, the output promise immediately rejects.
 * The input collection can be an iterable (arrays are iterables), or a promise for an iterable.
 * The values of the input collection can be any mix of promises and /or normal values.
 *
 * @param {iterable|thenable.<iterable>} iterable - Collection (or thenable for collection) of values (or thenables for values)
 * @returns {Potential} A promise for the first value to fulfill
 */

Potential.race = function race (iterable) {

  // `Potential.race` returns a new promise

  return new Potential((resolveRace, rejectRace) => {

    // allow users to supply an iterable *or* a promise for an iterable

    Potential.resolve(iterable)
    .then(actualIterable => {

      // convert the iterable into an Array, and normalize elements which may not be promises

      Array.from(actualIterable)
      .map(element => Potential.resolve(element))
      .forEach(valuePromise => {

        // first promise to settle wins the race (causes output promise to settle in the same way)

        valuePromise
        .then(resolveRace)
        .catch(rejectRace);

      });

    })
    // if for some reason a rejected promise is passed as the input collection, reject the output promise
    .catch(rejectRace);

  });

};
