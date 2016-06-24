'use strict';
/* eslint id-length: 0 */

//===== CORE PROMISES/A+ LIBRARY =====

//===== Private =====

// helpers for more readable code
function invoke (fns) {
  fns.forEach(fn => fn());
}
function isFunction (maybe) {
  return typeof maybe === 'function';
}
function isObjectOrFunction (maybe) {
  return maybe && !!(typeof maybe).match(/function|object/);
}

// ancillary promise handler group constructor
function ChainLink (onFulfilled, onRejected) {
  this.onFulfilled = isFunction(onFulfilled) ? onFulfilled : null;
  this.onRejected = isFunction(onRejected) ? onRejected : null;
  this.downstream = new Deferral();
}

// making sure only platform code is on the stack before running handlers
function Schedule () {
  var fns = [];
  this.add = fns.push.bind(fns);
  this.run = function () {
    setImmediate(() => { invoke(fns); });
  };
}

//----- Promise class -----

function $Promise () {
  this._state = 'pending';
  this._chains = [];
}

// attaches success and failure handlers to the promised value
$Promise.prototype.then = function then (onFulfilled, onRejected) {
  var newChain = new ChainLink(onFulfilled, onRejected);
  this._chains.push(newChain);
  checkHandlers.call(this);
  return newChain.downstream.promise;
};

function checkHandlers () {
  if (this._state === 'pending' || !this._chains.length) return;
  var handler, schedule = new Schedule();
  this._chains.forEach(chain => {
    handler = this._state === 'resolved' ? chain.onFulfilled : chain.onRejected;
    if (handler) schedule.add(executes(handler, this.value, chain.downstream));
    else if (this._state === 'resolved') chain.downstream.resolve(this.value);
    else if (this._state === 'rejected') chain.downstream.reject(this.value);
  })
  this._chains.length = 0;
  schedule.run();
}

function executes (handler, value, downstream) {
  return function executing () {
    try {
      var x = handler(value);
    } catch (err) {
      return downstream.reject(err);
    }
    promiseResolutionProcedure(downstream, x);
  };
}

// most of the complexity comes from "thenables", objets which may be promises
function promiseResolutionProcedure (downstream, x) { // 2.3
  var promise = downstream.promise,
      resolve = downstream.resolve,
      reject = downstream.reject;
  // 2.3.1
  if (promise === x) {
    reject(new TypeError('handlers must not return current chain'));
    return;
  }
  // 2.3.2
  if (x instanceof $Promise) {
    x.then( promiseResolutionProcedure.bind(null, downstream), reject );
    return;
  }
  // 2.3.4
  if (!isObjectOrFunction(x)) {
    resolve(x);
    return;
  }
  // 2.3.3
  try {
    var then = x.then; // 2.3.3.1
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
  var ran = 0; // 2.3.3.3.3
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
function Deferral () {
  this.promise = new $Promise();
  this.resolve = this.resolve.bind(this);
  this.reject = this.reject.bind(this);
}

// deferrals control their associated promise's final state
Deferral.prototype.resolve = function resolve (value) {
  settle.call(this, 'resolved', value);
};

Deferral.prototype.reject = function reject (reason) {
  settle.call(this, 'rejected', reason);
};

function settle (state, value) {
  if (this.promise._state === 'pending') {
    this.promise._state = state;
    this.promise.value = value;
    checkHandlers.call(this.promise);
  }
}

//===== Public =====

// Library namespace & ES6-style constructor wrapper
function Potential (executor) {
  if (!isFunction(executor)) throw new TypeError('Potential takes a function');
  var deferral = Potential.defer();
  executor( deferral.resolve, deferral.reject );
  return deferral.promise;
}

// Deferral factory function
Potential.defer = function defer () {
  return new Deferral();
};

//----- Library methods -----

// returns a new promise resolved with `value`
Potential.resolved = function resolved (value) {
  var deferral = new Deferral();
  // unwrap value if it is a promise or thenable
  promiseResolutionProcedure(deferral, value);
  return deferral.promise;
};
Potential.resolve = Potential.resolved; // alias

// returns a new promise rejected with `reason`
Potential.rejected = function rejected (reason) {
  var deferral = new Deferral();
  // unwrap value if it is a promise or thenable
  promiseResolutionProcedure(deferral, reason);
  // transform fulfilled promise into rejected
  return deferral.promise.then(value => {
    throw value;
  });
};
Potential.reject = Potential.rejected; // alias

//----- Extend library with additional methods -----
require('./extend')(Potential, $Promise);

// It's alive!
module.exports = Potential;
