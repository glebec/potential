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
const _checkHandlers = Symbol('checkHandlers');

class $Promise {

  constructor () {
    this[_state] = PENDING;
    this[_chains] = [];
  }

  then (onFulfilled, onRejected) {
    const newChain = new ChainLink(onFulfilled, onRejected);
    this[_chains].push(newChain);
    this[_checkHandlers]();
    return newChain.downstream.promise;
  }

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

  // debug aids

  inspect (depth, opts) {
    const stateString = symbolToDescription(this[_state]);
    const valueString = inspect(this[_value], opts);
    return `Potential <${stateString}: ${valueString}>`;
  }

  toString () {
    return this.inspect();
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
  if (x instanceof $Promise) {
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

// a parent/manager of an associated promise

const _settle = Symbol('settle');

class Deferral {

  constructor () {
    this.promise = new $Promise();
    this.resolve = this.resolve.bind(this);
    this.reject = this.reject.bind(this);
  }

  resolve (value) {
    this[_settle](FULFILLED, value);
  }

  reject (reason) {
    this[_settle](REJECTED, reason);
  }

  [_settle] (state, value) {
    if (this.promise[_state] === PENDING) {
      this.promise[_state] = state;
      this.promise[_value] = value;
      this.promise[_checkHandlers]();
    }
  }

}

//===== Public =====

// Library namespace & ES6-style constructor wrapper

class Potential {

  constructor (executor) {
    if (!isFunction(executor)) throw new TypeError('Potential takes a function');
    const deferral = Potential.defer();
    executor( deferral.resolve, deferral.reject );
    return deferral.promise;
  }

  static defer () {
    return new Deferral();
  }

  static resolve (value) {
    const deferral = new Deferral();
    promiseResolutionProcedure(deferral, value);
    return deferral.promise;
  }

  static reject (reason) {
    const deferral = new Deferral();
    // N.B. EcmaScript `Promise.reject` does not unwrap promise values.
    deferral.reject(reason);
    return deferral.promise;
  }

}

// Aliases

Potential.resolved = Potential.resolve;
Potential.rejected = Potential.reject;

// exports

const symbols = { _state, _value };

module.exports = {
  Potential,
  $Promise,
  symbols
};
