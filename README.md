[![npm version](https://img.shields.io/npm/v/potential.svg?maxAge=3600)](https://www.npmjs.com/package/potential)
[![Codeship](https://img.shields.io/codeship/0a206a10-0928-0134-3bbb-4e1ca58af965.svg)](https://codeship.com/projects/155189)
[![Greenkeeper.io is keeping this repo's dependencies up to date](https://img.shields.io/badge/greenkeeper.io-monitoring-brightgreen.svg?maxAge=3600)](https://greenkeeper.io/)

# Potential.js

## An ES6 Promises/A+ implementation

<a href="https://promisesaplus.com/">
    <img src="https://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.1 compliant" align="right"/>
</a>

`Potential` was written as an exercise in passing the full Promises/A+ spec. Emphasis is on adhering to the spec language and commenting the source code accordingly, so as to serve as an educational example. Extended methods such as `catch`, `all`, `map`, and `spread` are also included.

`Potential` is neither performance-optimized nor designed for maximum safety in production use (e.g. providing type checks, antipattern warnings and similar). Instead, it concentrates on relatively straightforward source code written using recent language features. For a highly performant, feature-rich, robust promise library, check out [Bluebird](http://bluebirdjs.com/docs/getting-started.html).

### Installation

`Potential` is available as an npm module for Node.js projects. You can add it to your project in the usual fashion:

```sh
npm install potential --save
```

Then you can `require` it in your modules like so:

```js
var Potential = require('potential');
```

### API

* [`Potential(executor)`](#constructor-pattern-recommended)
* [`Potential.defer()`](#deferral-pattern-legacy--internal)
  - `deferral.resolve`
  - `deferral.reject`
  - `deferral.promise`
* [`Potential.resolve` / `Potential.reject`](#pre-resolved-or-pre-rejected)
  - [Results of attempted resolution or rejection](#results-of-attempted-resolution-or-rejection)
* [Dual methods (static and instance)](#parallel-promise-management)
  - [`Potential.all`](#potentialall)
  - [`Potential.map`](#potentialmap)
  - [`Potential.race`](#potentialrace)
  - [`Potential.delay`](#potentialdelay)
* [`promise`](#promise-usage)
  - [`promise.then`](#promisethen)
  - [`promise.catch`](#promisecatch)
  - [`promise.finally`](#promisefinally)
  - [`promise.spread`](#promisespread)

#### Promise creation

##### Constructor pattern (recommended)

This is the approach favored by ES6 and contemporary promise libraries. You typically only need to construct a promise from scratch if you are wrapping an async routine that does not already return promises. If you already have a promise, you can post-process it by `return`ing or `throw`ing from its handler.

```js
var promise = new Potential(function(resolve, reject){
    // call resolve(val) or reject(val) at some point
})
```

`promise` will be resolved with `val` if `resolve(val)` is called, or rejected with `val` if `reject(val)` is called. Both the resolver and rejector are pre-bound to the promise.

*Side note: when `Potential` is used as a function, it always `return`s a unique promise instance, whether called with `new` or not. In fact, `new` does not affect `Potential`'s return value at all. However, it is still recommended to write the `new` operator if only to emphasize `Potential`'s role as a constructor and avoid confusing style inconsistencies.*

##### Deferral pattern (legacy/internal)

A deferral is just a container grouping a promise with its associated resolver and rejector functions. The constructor pattern hides this conceptually irrelevant wrapper object and discourages improper leaking of the resolver/rejector to different scopes. However, there is nothing wrong with deferrals when used correctly.

```js
var deferral = Potential.defer();
var promise = deferral.promise;
// call deferral.resolve(val) or deferral.reject(val) at some point
```

`promise` will be resolved with `val` if `deferral.resolve(val)` is called, or rejected with `val` if `deferral.reject(val)` is called. Both `resolve` and `reject` methods are pre-bound to `deferral`.

##### Pre-resolved or Pre-rejected

You can also create promises pre-resolved or pre-rejected with any `val`. Note that `val` can be a synchronous value or even a promise/thenable; nested thenables are recursively unwrapped. This is especially useful when you need to do any of the following:

* create a fresh starting point for a dynamically-built promise chain
* convert a known third-party thenable into a `Potential`-based promise
* normalize an unknown value (synchronous or a promise/thenable) into a promise

```js
var resolvedPromise = Potential.resolve(val);
var rejectedPromise = Potential.reject(val);
```

###### Results of attempted resolution or rejection

There is an important distinction between the terms *resolve* and *fulfill*. A promise fulfilled with `val` will invoke its success handlers with `val`. The resolution procedure however merely *attempts* fulfillment, but can result in rejection under certain circumstances. Examine the table below for details.

Value provided | return of `Potential.resolve` | return of `Potential.reject`
----|----|----
Synchronous value `val` (any JS value, including `undefined`, an `Error` instance, etc.) | a promise fulfilled with `val` | a promise rejected with `val`
Promise/thenable that fulfills with `val` | a promise that fulfills with `val` | a promise that rejects with `val`
Promise/thenable that rejects with `val` | a promise that rejects with `val` | a promise that rejects with `val`

##### Parallel promise management

Promise chains allow for serial processing of asynchronous steps: first do A, then do B, and so on. However, another common need is to wait for multiple independent asynchronous actions to all complete, so that their results can be used together.

###### Potential.all

Take an iterable collection (or promise/thenable for iterable) of values — any of which may be normal values, promises, or thenables — and return a promise for an array of final results:

```js
// foo, bar, baz may be any mix of normal values, promises, and/or thenables
Promise.all([fooPromise, barThenable, bazValue]);
.then(function (results) {
  console.log('finalFoo', results[0]);
  console.log('finalBar', results[1]);
  console.log('finalBaz', results[2]);
})
```

Importantly, the original order of the collection is preserved in the final results, although the individual results may finish at any time. The handler function is only called once *all* results have completed. If *any* of the original promises rejects, the success handler is not called; instead, the returned promise from `.all` is immediately rejected.

Promise instances have an equivalent `all` method:

```js
promiseForArray.all().then(arr => console.log(arr)) // 1, 2, 3
```

The `.all` method is frequently used with [`.spread`](#promisespread).

###### Potential.map

Identical to `.all` except values are passed through a provided mapper function.

```js
// foo, bar, baz may be any mix of normal values, promises, and/or thenables
const mapper = val => val + '!';
const inputArr = [aPromise, bThenable, cValue];
Promise.map(inputArr, mapper);
.then(function (mappedResults) {
  console.log(mappedResults); // a!, b!, c!
});
```

Promise instances have an equivalent `map` method:

```js
promiseForArray.map(val => val + '!').then(arr => console.log(arr)) // 1!, 2!, 3!
```

###### Potential.race

Take an iterable collection (or promise for collection) of input values, thenables, and/or promises. Return a promise for the first value to settle. If any promise rejects before then, reject the output promise.

```js
Potential.race([fastPromiseForA, fasterPromiseForB, slowPromiseForC])
.then(console.log.bind(console)) // B
```

Promise instances have an equivalent `race` method.

##### Potential.delay

Create a promise which delays resolution until X ms.

```js
Potential.delay('hello', 1000)
.then(console.log.bind(console)); // after one second: 'hello'
```

Promise instances have an equivalent `delay` method:

```js
promiseForHello.delay(1000).then(console.log.bind(console)) // after one second: 'hello'
```

#### Promise usage

##### promise.then

A promise's main method is `.then`, which takes two optional handler functions:

```js
promise.then(successFn, failureFn);
```

If either parameter is not a function (e.g. `null`) it is ignored. If `promise` is fulfilled with `val`, then `successFn` will be invoked with `val`. If `promise` is rejected with `val`, then `failureFn` will be invoked with `val`.

`.then` returns a new promise whose fate is tied to the functions passed in (or not) to the previous `.then`.

```js
p1.then(successFn, failureFn) // returns p2 which we can chain `.then` on
  .then(successF2, failureF2);
```

* If `p1` fulfills or rejects with a value and does not have the appropriate handler (`successFn` or `failureFn` is not a function), `p2` is fulfilled or rejected with the same value. This is called bubbling. In other words, values bubble down to the first handler of the correct type in the chain.
* If `p1` fulfills or rejects with a value `v1` and has the appropriate handler (`successFn` or `failureFn` is a function), that handler is invoked with `v1`.
    - if the handler returns a normal value `x`, `p2` is fulfilled with `x`, meaning `successF2` is invoked with `x`.
    - if the handler returns a promise or thenable `pX`, `p2` assimilates that promise or thenable, meaning `p2` will behave as if it were `pX` — calling handlers based on the fulfillment or rejection of `pX`.
    - if the handler `throw`s an error `e`, `p2` is rejected with `e`, meaning `failureF2` is invoked with `e`.

This complex behavior is the reason why promises are versatile, powerful, and expressive.

##### promise.catch

For convenience, an error handler can be inserted into a chain using `catch`:

```js
p1.then(successFn)
  .catch(failureFn)
```

`promise.catch(failureFn)` is just a wrapper for `promise.then(null, failureFn)` and returns the same promise `.then` would. However, note that the following are distinct:

```js
// possibly problematic:
p1.then(successFn, failureFn) // failureFn won't catch errs thrown by successFn

// better:
p1.then(successFn)
  .then(null, failureFn); // failureFn catches both p1 rejection & successFn errors

// same behavior as previous example, but cleaner to write:
p1.then(successFn)
  .catch(failureFn); // failureFn catches both p1 rejection & successFn errors
```

Due to the above, it is generally good practice to add a `catch` *below* success handlers rather than using *parallel* success-error handlers. Remember, because of value bubbling, an error handler can be set at the bottom of a chain:

```js
p1.then(s1)
  .then(s2)
  .then(s3)
  .catch(console.log.bind(console)); // will log errors from p1, s1, s2, or s3.
```

##### promise.finally

Sometimes you want to run a handler to perform a side effect (e.g. resource cleanup) regardless of whether a promise fulfilled or rejected. You may also want to continue the promise chain afterwards with the resulting fulfillment or rejection of your original promise. Finally, you may also want to delay continuation of the promise chain, for coordination purposes. `finally` satisfies all these needs. It lets you register a handler which will be invoked with no arguments, allowing values and rejections to pass through, but waiting on the handler before doing so:

```js
promiseA
.finally(() => {
  promiseB = db.close();
  return promiseB;
})
.then(handlePromiseAResult, handlePromiseAErr) // delayed until promiseB completes, but ignores value/state of promiseB
```

##### promise.spread

If you have a promise for an array of values, calling `.then(function success (arr) {...})` will invoke `success` with a single `arr` of results. If you know ahead of time what each index of the array is supposed to contain, this can lead to code like the following:

```js
promiseForArray
.then(function (results) {
  var rawData = results[0];
  var metaData = results[1];
  var flag = results[2];
  console.log(rawData, metaData, flag);
})
```

If you prefer to use formal parameters rather than an array of indexed results, `.spread` takes a handler function just like `.then`, but *"spreads"* the eventual results over the handler's parameters:

```js
promiseForArray
.spread(function (rawData, metaData, flag) {
  console.log(rawData, metaData, flag);
})
```

Note that `.spread` returns a promise just like `.then`, and its handler behaves just like a `.then` success handler with respect to return values / thrown errors and promise chaining. Importantly, `.spread` does *not* take an optional error handler; any additional function arguments to `.spread` are ignored.

Finally, note that `.spread` implicitly calls `.all` on the values array, so every formal parameter will be a resolved value, not a promise.
