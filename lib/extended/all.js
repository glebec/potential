'use strict';

const Potential = require('../core');

/**
 * Take a collection of parallel promises, return a promise for an array of
 * corresponding values. Promises can fulfill in any order, yet the output
 * array will match the original collection. The input collection can be an
 * iterable (arrays are iterables), or a promise for an iterable. The values
 * of the input collection can be any mix of promises and /or normal values.
 * If any input promise rejects, the output promise immediately rejects.
 *
 * @method Potential.all
 *
 * @param {iterable|Thenable.<iterable>} iterable - Collection (or thenable for
 * collection) of values (or thenables for values)
 *
 * @returns {Potential.<Array>} A promise for an array of ordered, non-promise
 * values
 */

Potential.all = function all (iterable) {

  return new Potential((resolveAll, rejectAll) => {

    const finalValues = [];
    const total = iterable.length;
    let numCompleted = 0;

    Potential.resolve(iterable)
    .then(actualIterable => {

      Array.from(actualIterable)
      .map(element => Potential.resolve(element))
      .forEach((valuePromise, idx) => {

        valuePromise
        .then(valueResult => {
          finalValues[idx] = valueResult;
          numCompleted++;
          if (numCompleted === total) resolveAll(finalValues);
        })
        .catch(rejectAll);

      });

    })
    .catch(rejectAll);

  });

};
