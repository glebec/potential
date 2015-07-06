# Potential.js

## A minimal Promises/A+ implementation

<a href="https://promisesaplus.com/">
    <img src="https://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 2.1 compliant" align="right"/>
</a>

`Potential` was written as an exercise in passing the full Promises/A+ spec. Emphasis is on adhering to the spec language and commenting the source code accordingly.

### Installation

`Potential` is available as an npm module for Node.js projects. You can add it to your project with `npm install potential --save`, or use it globally with `npm install potential -g`. Then you can `require` it in your modules like so:

```js
var Potential = require('potential');
```

### API

#### Promise creation

##### Constructor pattern (recommended)

This is the approach favored by ES6 and contemporary promise libraries. You should only need to construct a promise from scratch if you are wrapping an async method that does not already return promises. If you already have a promise, you can post-process it by `return`ing or `throw`ing from its handler.

```js
var promise = new Potential(function(resolve, reject){
    // call resolve(val) or reject(val) at some point
})
```

`promise` will be resolved with `val` if `resolve(val)` is called, or rejected with `val` if `reject(val)` is called.

*Side note: when `Potential` is used as a function, it always `return`s a unique promise instance, whether called with `new` or not. In fact, `new` does not affect `Potential`'s return value at all. However, it is still recommended to write the `new` operator if only to underscore `Potential`'s role as a constructor and avoid confusing style inconsistencies.*

##### Deferral pattern (legacy / internal)

Internally, `Potential` uses deferrals for its implementation, and the constructor API is simply a wrapper. Although the constructor pattern removes the need for this third entity, there is technically nothing wrong with deferrals so long as they are not being abused to generate new promises from existing chains (an unfortunate, albeit common, anti-pattern).

```js
var deferral = Potential.defer();
// call deferral.resolve(val) or deferral.reject(val) at some point
var promise = deferral.promise;
```

`promise` will be resolved with `val` if `deferral.resolve(val)` is called, or rejected with `val` if `deferral.reject(val)` is called.

##### Pre-resolved or Pre-rejected

You can also create promises pre-resolved or rejected with any value `val`. This is useful when you are not sure if `val` is already a promise or not, or if you want to create a starting point for an iteratively-built promise chain.

```js
var resolvedPromise = Potential.resolved(val); // alias: Potential.resolve(val)
var rejectedPromise = Potential.rejected(val); // alias: Potential.reject(val)
```

#### Promise usage

##### promise.then

A promise's main method is `.then`, which takes two optional handler functions:

```js
promise.then(successFn, failureFn);
```

If either parameter is not a function (e.g. `null`) it is ignored. If `promise` is resolved with `val`, then `successFn` will be invoked with `val`. If `promise` is rejected with `val`, then `failureFn` will be invoked with `val`.

`.then` returns a new promise whose fate is tied to the functions passed in (or not) to the previous `.then`.

```js
p1.then(successFn, failureFn) // returns p2 which we can chain `.then` on
  .then(successF2, failureF2);
```

* If `p1` resolves or rejects with a value and does not have the appropriate handler (`successFn` or `failureFn` is not a function), `p2` is resolved or rejected with the same value. This is called bubbling. In other words, values bubble down to the first handler of the correct type in the chain.
* If `p1` resolves or rejects with a value `v1` and has the appropriate handler (`successFn` or `failureFn` is a function), that handler is invoked with `v1`.
    - if the handler returns a normal value `x`, `p2` is resolved with `x`, meaning `successF2` is invoked with `x`.
    - if the handler returns a promise or thenable `pX`, `p2` assimilates that promise or thenable, meaning `successF2` is invoked with the promised value `x`.
    - if the handler `throw`s an error `e`, `p2` is rejected with `e`, meaning `failureF2` is invoked with `e`.

This complex behavior is the reason why promises are versatile, powerful, and expressive.

##### promise.catch

For convenience, an error handler can be inserted into a chain using `catch`:

```js
p1.then(successFn)
  .catch(failureFn)
```

`promise.catch(failureFn)` is just a wrapper for `promise.then(null, failureFn)` and returns the same promise `.then` does. However, note that the following are distinct:

```js
// potentially problematic:
p1.then(successFn, failureFn) // failureFn won't catch errs thrown by successFn
// better:
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

### Changelog

#### 2015-06-06 v 1.0.1

Added `catch`.
