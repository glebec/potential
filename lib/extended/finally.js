'use strict';

const Potential = require('../core');

/**
 * Instance method for attaching a handler function to run when a promise
 * settles. The handler is invoked with no arguments, as it would have no
 * reliable means to distinguish between success and failure values.
 * Potential#finally therefore is intended to handle temporal side effects in a
 * promise chain, such as the cleaning up of resources. Potential#finally
 * returns a promise which is fulfilled with the parent value or rejected with
 * the parent reason, so that the chain can be continued almost as if #finally
 * had never existed. However, this returned promise does wait on the results
 * of `onSettled`, meaning the continuation of the chain can be delayed if
 * necessary.
 *
 * @method Potential#finally
 *
 * @param {function} onSettled - A handler to be attached to a parent promise.
 * Will be invoked with no arguments when parent settles.
 *
 * @returns {Potential} A promise which waits for `onSettled` to complete
 * (including any returned promise value settling), then settles according to
 * the *parent* promise state and value.
 */

Potential.prototype.finally = function (onSettled) {
  return this.then(
    value  => Potential.resolve(onSettled()).then(() => value),
    reason => Potential.resolve(onSettled()).then(() => { throw reason; })
  );
};
