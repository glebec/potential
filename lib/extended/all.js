'use strict';

const { Potential } = require('../core');

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
 * @static
 *
 * @param {Iterable|Thenable.<Iterable>} iterable - Collection (or thenable for
 * collection) of values (or thenables for values)
 *
 * @returns {Potential.<Array>} A promise for an array of ordered, non-promise
 * values
 *
 * @example <caption>Simple</caption>
 * Potential.all([promiseFor1, promiseFor2, promiseFor3])
 * .then(values => {
 *   values.forEach(console.log.bind(console)) // 1, 2, 3
 * })
 *
 * @example <caption>Mixed input values and promises</caption>
 * Potential.all([promiseFor1, 2, promiseFor3])
 * .then(values => {
 *   values.forEach(console.log.bind(console)) // 1, 2, 3
 * })
 *
 * @see {@link Potential.map}
 * @see {@link Potential.race}
 */

Potential.all = function all (iterable) {

  // `Potential.all` returns a new promise

  return new Potential((resolveAll, rejectAll) => {

    // maintain state about completing promises

    const finalValues = [];
    const total = iterable.length;
    let numCompleted = 0;

    // allow users to supply an iterable *or* a promise for an iterable

    Potential.resolve(iterable)
    .then(actualIterable => {

      // convert the iterable into an Array, and normalize elements which may not be promises

      Array.from(actualIterable)
      .map(element => Potential.resolve(element))
      .forEach((valuePromise, idx) => {

        // wait for each promise to fulfill, and place the result in the correct output slot

        valuePromise
        .then(valueResult => {
          finalValues[idx] = valueResult;
          numCompleted++;
          // once all original promises fulfill, fulfill the output promise
          if (numCompleted === total) resolveAll(finalValues);
        })
        // if any input promise fails, reject the output promise
        .catch(rejectAll);

      });

    })
    // if for some reason a rejected promise is passed as the input collection, reject the output promise
    .catch(rejectAll);

  });

};
