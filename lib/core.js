'use strict';
/* eslint-disable id-length */

const { inspect } = require('util');
const {
  invoke,
  isFunction,
  isObjectOrFunction,
  functionRace,
  symbolToDescription
} = require('./utils');

const _fns = Symbol('fns');

class Schedule {

  constructor () {
    this[_fns] = [];
  }

  add (...fns) {
    this[_fns].push(...fns);
  }

  run () {
    setImmediate(() => invoke(this[_fns]));
  }

}

const PENDING = Symbol('pending');
const FULFILLED = Symbol('fulfilled');
const REJECTED = Symbol('rejected');

const _state = Symbol('state');
const _value = Symbol('value');
const _chains = Symbol('chains');
const _fulfill = Symbol('fulfill');
const _resolve = Symbol('resolve');
const _reject = Symbol('reject');
const _settle = Symbol('settle');
const _checkHandlers = Symbol('checkHandlers');

const forward = value => value;
const rethrow = reason => { throw reason; };
const noop = () => {};

/**
 * @class Promises/A+ compliant promise library
 */

class Potential {

  /**
   * Function which provides user with resolver and rejector for a new promise
   * @callback executor
   * @param {function} resolve - function which will fulfill promise with a value
   * @param {function} reject - function which will reject promise with a reason
   */

  /**
   * Construct a new promise.
   * @param {executor} executor - Called synchronously, is passed methods to control promise fate
   */

  constructor (executor) {
    if (!isFunction(executor)) throw new TypeError('Potential takes a function');
    this[_state] = PENDING;
    this[_chains] = [];
    executor(this[_resolve].bind(this), this[_reject].bind(this));
  }

  // public instance methods

  /**
   * Register a handler for the eventual value/reason of this promise.
   * @param {function} onFulfilled - handler to be invoked with fulfillment value
   * @param {function} onRejected - handler to be invoked with rejection reason
   * @returns {Potential} promise determined by handler results (or lack of handler)
   */

  then (onFulfilled, onRejected) {
    const newChain = {
      onFulfilled: isFunction(onFulfilled) ? onFulfilled : forward,
      onRejected: isFunction(onRejected) ? onRejected : rethrow,
      downstreamPromise: new Potential(noop)
    };
    this[_chains].push(newChain);
    this[_checkHandlers]();
    return newChain.downstreamPromise;
  }

  // private implementation functions

  [_resolve] (value) {
    promiseResolutionProcedure(this, value);
  }

  [_fulfill] (value) {
    this[_settle](FULFILLED, value);
  }

  [_reject] (reason) {
    this[_settle](REJECTED, reason);
  }

  [_settle] (state, value) {
    if (this[_state] !== PENDING) return;
    this[_state] = state;
    this[_value] = value;
    this[_checkHandlers]();
  }

  [_checkHandlers] () {
    if (this[_state] === PENDING || !this[_chains].length) return;
    const schedule = new Schedule();
    const plans = this[_chains].map(chain => {
      const handler = this[_state] === FULFILLED ? chain.onFulfilled : chain.onRejected;
      return executes(handler, this[_value], chain.downstreamPromise);
    });
    schedule.add(...plans);
    this[_chains].length = 0;
    schedule.run();
  }

  // debug aids

  inspect (depth, opts) {
    const stateString = symbolToDescription(this[_state]);
    const valueString = inspect(this[_value], opts);
    return `Potential <${stateString}: ${valueString}>`;
  }

  toString () {
    return this.inspect();
  }

  // statics

  /**
   * Takes a value of unknown type, e.g. normal value, {@link thenable}, or
   * trusted {@link Potential} promise. Wraps normal values in a fulfilled
   * output promise. Converts thenables to trusted {@link Potential} promises.
   * Simply returns {@link Potential} promises as they are. Useful for starting
   * a chain, or normalizing values which may or may not be trusted promises.
   * N.B. while the output promise is normally fulilled, if `resolve` is called
   * with a rejected promise / thenable, the output promise is also rejected
   * as the rejection reason still needs to be handled somewhere.
   *
   * @param {*|thenable|Potential} value - Input to be converted into promise
   * @returns {Potential} Promise in most cases fulfilled with unwrapped value
   */

  static resolve (value) {
    if (value instanceof Potential) return value;
    return new Potential(resolve => resolve(value));
  }

  /**
   * Takes a reason of any type. Returns a promise rejected with that reason.
   * N.B. EcmaScript `Promise.reject` does not unwrap promise values; a
   * thenable or promise can itself be a rejection reason. However, it is
   * very strongly recommended that one only ever use proper Error children
   * for rejections.
   *
   * @param {*} reason - Input to be use for rejection reason
   * @returns {Potential} Promise rejected with the passed-in reason
   */

  static reject (reason) {
    return new Potential((resolve, reject) => reject(reason));
  }

  /**
   * Construct a new {@link Deferral} instance. Older (pre-ES6) structure for
   * associating promise with resolver and rejector; constructor now preferred.
   * @returns {Deferral} A new deferral
   */

  static defer () {
    return new Deferral();
  }

}

function executes (handler, value, downstreamPromise) {
  return function executing () {
    try {
      const x = handler(value);
      promiseResolutionProcedure(downstreamPromise, x);
    } catch (err) {
      return downstreamPromise[_reject](err);
    }
  };
}

// 2.3
// most of the complexity comes from "thenables", objects which may be promises
function promiseResolutionProcedure (promise, x) {

  // 2.3.1
  if (promise === x) {
    promise[_reject](new TypeError('handlers must not return current chain'));
    return;
  }
  // 2.3.2
  if (x instanceof Potential) {
    x.then(
      promise[_fulfill].bind(promise),
      promise[_reject].bind(promise)
    );
    return;
  }
  // 2.3.4
  if (!isObjectOrFunction(x)) {
    promise[_fulfill](x);
    return;
  }
  // 2.3.3
  let then;
  try {
    then = x.then; // 2.3.3.1
  } catch (errAccessingThen) {
    promise[_reject](errAccessingThen); // 2.3.3.2
    return;
  }
  // 2.3.3.4
  if (!isFunction(then)) {
    promise[_fulfill](x);
    return;
  }

  const funcs = functionRace();
  const resolver = funcs.register(promise[_resolve].bind(promise));
  const rejector = funcs.register(promise[_reject].bind(promise));

  // 2.3.3.3
  try {
    then.call(x, resolver, rejector);
  } catch (errCallingThen) { // 2.3.3.3.4
    rejector(errCallingThen);
  }

}

//----- Deferral class -----

/**
 * @class An object holding a promise with its associated resolver and rejector
 */

class Deferral {

  /**
   * Create a new {@link deferral}
   */

  constructor () {

    /**
     * The newly-constructed promise
     * @name Deferral#promise
     * @type {Potential}
     */

    this.promise = new Potential((resolve, reject) => {

      /**
       * Resolves this deferral's associated promise with the passed-in value
       * @param {*} value - The value to attempt resolution
       */

      this.resolve = resolve;

      /**
       * Rejects this deferral's associated promise with the passed-in reason
       * @param {*} reason - The rejection reason to assign to this promise
       */

      this.reject = reject;

    });

  }

}

module.exports = Potential;

/**
 * In A+ spec language, a "thenable" is an object with a `then` method, which
 * might be a spec-compliant promise (or might not be). In practice, this means
 * a promise-like object from a different source than the given promise
 * library, which is identified through duck typing. {@link Potential.resolve}
 * allows the user to convert a thenable into a trusted {@link Potential}
 * promise.
 *
 * @class
 * @name Thenable
 */

/**
 * Presumptive method to attach handler functions for when a thenable settles
 * @method Thenable#then
 */
