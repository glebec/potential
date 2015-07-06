<a href="https://promisesaplus.com/">
    <img src="https://promisesaplus.com/assets/logo-small.png" alt="Promises/A+ logo" title="Promises/A+ 1.0 compliant" align="right"/>
</a>

# Potential.js

## A minimal Promises/A+ implementation

`Potential` was written as an exercise in passing the full Promises/A+ spec. Emphasis is on adhering to the spec language and commenting the source code accordingly.

### Installation

`Potential` is available as an npm module for Node.js projects. You can add it to your project with `npm install potential --save`, or use it globally with `npm install potential -g`. Then you can `require` it in your modules like so:

```js
var Potential = require('potential');
```

### API

#### Creation

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
var resolvedPromiseWithVal = Potential.resolved(val);
var rejectedPromiseWithVal = Potential.rejected(val);
```
