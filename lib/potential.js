'use strict';

//===== CORE PROMISES/A+ LIBRARY =====

//===== Private =====

// helpers for more readable code
function invoke (fns) { fns.forEach(function (fn) { fn(); }); }
function isFunction (maybe) { return typeof maybe === 'function'; }
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
  this.run = function() { setImmediate(function(){ invoke(fns); }); };
}

//----- Promise class -----

function $Promise () {
  this.state = 'pending';
  this.chains = [];
}

// attaches success and failure handlers to the promised value
$Promise.prototype.then = function then (onFulfilled, onRejected) {
  var newChain = new ChainLink(onFulfilled, onRejected);
  this.chains.push(newChain);
  tryHandlers.call(this);
  return newChain.downstream.promise;
};

function tryHandlers () {
  if (this.state === 'pending') return;
  var chain, handler, schedule = new Schedule();
  while (this.chains.length) {
    chain = this.chains.shift();
    handler = this.state === 'resolved' ? chain.onFulfilled : chain.onRejected;
    if (handler) schedule.add(executes(handler, this.value, chain.downstream));
    else if (this.state === 'resolved') chain.downstream.resolve(this.value);
    else if (this.state === 'rejected') chain.downstream.reject(this.value);
  }
  schedule.run();
}

function executes (handler, value, downstream) {
  return function executing () {
    try {
      var x = handler(value);
      promiseResolutionProcedure(downstream, x);
    } catch (err) { downstream.reject(err); }
  };
}

// most of the complexity comes from "thenables", objets which may be promises
function promiseResolutionProcedure (downstream, x) { // 2.3
  var promise = downstream.promise,
      resolve = downstream.resolve,
      reject = downstream.reject;
  if (promise === x) { // 2.3.1
    reject( new TypeError('handlers must not return current chain') );
  } else if ( x instanceof $Promise ) { // 2.3.2
    x.then( promiseResolutionProcedure.bind(null, downstream), reject );
  } else if ( isObjectOrFunction(x) ) { // 2.3.3
    try {
      var then = x.then; // 2.3.3.1
      if ( isFunction(then) ) { // 2.3.3.3
        var ran = 0; // 2.3.3.3.3
        try {
          then.call(
            x,
            function resolvePromise (y) {
              if (!ran++) promiseResolutionProcedure(downstream, y); // 2.3.3.3.1
            },
            function rejectPromise (y) { if (!ran++) reject(y); } // 2.3.3.3.2
          );
        } catch (errCallingThen) { if (!ran) reject(errCallingThen); } // 2.3.3.3.4
      } else resolve(x); // 2.3.3.4
    } catch (errAccessingThen) { reject(errAccessingThen); } // 2.3.3.2
  } else { // 2.3.4
    resolve(x);
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
  return settle.call(this, 'resolved', value);
};

Deferral.prototype.reject = function reject (reason) {
  return settle.call(this, 'rejected', reason);
};

function settle (state, value) {
  if (this.promise.state === 'pending' && state.match(/resolved|rejected/) ) {
    this.promise.state = state;
    this.promise.value = value;
    tryHandlers.call(this.promise);
  }
  return this.promise;
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
  return new Deferral().resolve(value);
};
Potential.resolve = Potential.resolved; // alias

// returns a new promise rejected with `reason`
Potential.rejected = function rejected (reason) {
  return new Deferral().reject(reason);
};
Potential.reject = Potential.rejected; // alias

//----- Extend library with additional methods -----
require('./extend')(Potential, $Promise);

// It's alive!
module.exports = Potential;
