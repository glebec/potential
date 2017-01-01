'use strict';
/* eslint-disable id-length */

const { inspect } = require('util');
const {
  invoke,
  isFunction,
  isObjectOrFunction,
  symbolToDescription
} = require('./utils');

//===== CORE PROMISES/A+ LIBRARY =====

//===== Private =====

// constants

const PENDING = Symbol('pending');
const FULFILLED = Symbol('fulfilled');
const REJECTED = Symbol('rejected');

// ancillary promise handler group constructor

const FORWARD = value => value;
const RETHROW = reason => { throw reason; };

class ChainLink {

  constructor (onFulfilled, onRejected) {
    this.onFulfilled = isFunction(onFulfilled) ? onFulfilled : FORWARD;
    this.onRejected = isFunction(onRejected) ? onRejected : RETHROW;
    this.downstream = new Deferral();
  }

}

// making sure only platform code is on the stack before running handlers

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

//----- Promise class -----

const _state = Symbol('state');
const _value = Symbol('value');
const _chains = Symbol('chains');
const _fulfill = Symbol('fulfill');
const _resolve = Symbol('resolve');
const _reject = Symbol('reject');
const _settle = Symbol('settle');
const _checkHandlers = Symbol('checkHandlers');

/**
 * @class Promises/A+ compliant promise library
 */

class Potential {

  /**
   * Construct a new promise.
   * @param {function} executor - TODO FILL IN
   */

  constructor (executor) {
    if (!isFunction(executor)) throw new TypeError('Potential takes a function');
    this[_state] = PENDING;
    this[_chains] = [];
    const boundResolver = this[_resolve].bind(this);
    const boundRejector = this[_reject].bind(this);
    executor(boundResolver, boundRejector);
  }

  then (onFulfilled, onRejected) {
    const newChain = new ChainLink(onFulfilled, onRejected);
    this[_chains].push(newChain);
    this[_checkHandlers]();
    return newChain.downstream.promise;
  }

  // private implementation functions

  [_checkHandlers] () {
    if (this[_state] === PENDING || !this[_chains].length) return;
    const schedule = new Schedule();
    const plans = this[_chains].map(chain => {
      const handler = this[_state] === FULFILLED ? chain.onFulfilled : chain.onRejected;
      return executes(handler, this[_value], chain.downstream);
    });
    schedule.add(...plans);
    this[_chains].length = 0;
    schedule.run();
  }

  [_resolve] (value) {
    const deferralLike = {
      promise: this,
      resolve: this[_fulfill].bind(this),
      reject: this[_reject].bind(this)
    };
    promiseResolutionProcedure(deferralLike, value);
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
    const deferral = new Deferral();
    promiseResolutionProcedure(deferral, value);
    return deferral.promise;
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
    const deferral = new Deferral();
    deferral.reject(reason);
    return deferral.promise;
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

function executes (handler, value, downstream) {
  return function executing () {
    try {
      const x = handler(value);
      promiseResolutionProcedure(downstream, x);
    } catch (err) {
      return downstream.reject(err);
    }
  };
}

// 2.3
// most of the complexity comes from "thenables", objects which may be promises
function promiseResolutionProcedure (downstream, x) {
  const { promise, resolve, reject } = downstream;

  // 2.3.1
  if (promise === x) {
    reject(new TypeError('handlers must not return current chain'));
    return;
  }
  // 2.3.2
  if (x instanceof Potential) {
    x.then(value => promiseResolutionProcedure(downstream, value), reject);
    return;
  }
  // 2.3.4
  if (!isObjectOrFunction(x)) {
    resolve(x);
    return;
  }
  // 2.3.3
  let then;
  try {
    then = x.then; // 2.3.3.1
  } catch (errAccessingThen) {
    reject(errAccessingThen); // 2.3.3.2
    return;
  }
  // 2.3.3.4
  if (!isFunction(then)) {
    resolve(x);
    return;
  }
  // 2.3.3.3
  let ran = 0; // 2.3.3.3.3
  try {
    then.call(x, resolvePromise, rejectPromise);
  } catch (errCallingThen) { // 2.3.3.3.4
    if (!ran) reject(errCallingThen);
  }

  function resolvePromise (y) { // 2.3.3.3.1
    if (!ran++) promiseResolutionProcedure(downstream, y);
  }
  function rejectPromise (r) { // 2.3.3.3.2
    if (!ran++) reject(r);
  }
}

//----- Deferral class -----

/**
 * @class An object holding a promise with its associated resolver and rejecter
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
