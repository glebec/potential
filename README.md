[![npm version](https://img.shields.io/npm/v/potential.svg?maxAge=3600)](https://www.npmjs.com/package/potential)
[![Codeship](https://img.shields.io/codeship/0a206a10-0928-0134-3bbb-4e1ca58af965.svg)](https://codeship.com/projects/155189)
[![Greenkeeper.io is keeping this repo's dependencies up to date](https://img.shields.io/badge/greenkeeper.io-monitoring-brightgreen.svg?maxAge=3600)](https://greenkeeper.io/)

# Potential.js

## A minimal Promises/A+ implementation

<a href="https://promisesaplus.com/">
    <img src="https://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.1 compliant" align="right"/>
</a>

`Potential` was written as an exercise in passing the full Promises/A+ spec. Emphasis is on adhering to the spec language and commenting the source code accordingly, so as to serve as an educational example.

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

* [`Potential`](#constructor-pattern-recommended)
* [`Potential.defer()`](#deferral-pattern-legacy--internal)
    - `deferral.resolve`
    - `deferral.reject`
    - `deferral.promise`
* [`Potential.resolved` / `Potential.rejected`](#pre-resolved-or-pre-rejected)
    - aliases: `Potential.resolve` / `Potential.reject`
    - [Results of attempted resolution or rejection](#results-of-attempted-resolution-or-rejection)
* [`promise`](#promise-usage)
    - [`promise.then`](#promisethen)
    - [`promise.catch`](#promisecatch)

#### Promise creation

##### Constructor pattern (recommended)

This is the approach favored by ES6 and contemporary promise libraries. You typically only need to construct a promise from scratch if you are wrapping an async routine that does not already return promises. If you already have a promise, you can post-process it by `return`ing or `throw`ing from its handler.

```js
var promise = new Potential(function(resolve, reject){
    // call resolve(val) or reject(val) at some point
})
```

`promise` will be resolved with `val` if `resolve(val)` is called, or rejected with `val` if `reject(val)` is called.

*Side note: when `Potential` is used as a function, it always `return`s a unique promise instance, whether called with `new` or not. In fact, `new` does not affect `Potential`'s return value at all. However, it is still recommended to write the `new` operator if only to emphasize `Potential`'s role as a constructor and avoid confusing style inconsistencies.*

##### Deferral pattern (legacy/internal)

Internally, `Potential` uses deferrals for its implementation, and the constructor API is merely an abstraction. A deferral is just a container grouping a promise with its associated resolver and rejector functions. The constructor pattern hides this conceptually irrelevant wrapper object and discourages leaking the resolver/rejector to different scopes. However, there is nothing wrong with deferrals when used correctly.

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
var resolvedPromise = Potential.resolved(val); // alias: Potential.resolve(val)
var rejectedPromise = Potential.rejected(val); // alias: Potential.reject(val)
```

###### Results of attempted resolution or rejection

There is an important distinction between the terms *resolve* and *fulfill*. A promise fulfilled with `val` will invoke its success handlers with `val`. The resolution procedure however merely *attempts* fulfillment, but can result in rejection under certain circumstances. Examine the table below for details.

Value provided | return of `Potential.resolve` | return of `Potential.reject`
----|----|----
Synchronous value `val` (any JS value, including `undefined`, an `Error` instance, etc.) | a promise fulfilled with `val` | a promise rejected with `val`
Promise/thenable that fulfills with `val` | a promise that fulfills with `val` | a promise that rejects with `val`
Promise/thenable that rejects with `val` | a promise that rejects with `val` | a promise that rejects with `val`

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
