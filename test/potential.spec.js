'use strict';
var expect = require('chai').expect;
var Potential = require('../lib/potential.js');

/**
 * Note: the main spec for Potential is the A+ spec, which can be run
 * via `npm run test:aplus`. This spec file on the other hand tests
 * core library features that A+ does not cover.
 */

describe('Potential', function () {

  var sentinel;
  beforeEach(function () {
    sentinel = { sentinel: 'sentinel' };
  });

  describe('.resolve', function () {

    it('creates a promise that fulfills with a passed-in value', function (done) {
      Potential.resolve(sentinel)
      .then(function (value) {
        expect(value).to.equal(sentinel);
        done();
      })
      .catch(done);
    });

    it('can unwrap a fulfilled promise', function (done) {
      var fulfilled = Potential.resolve(sentinel);
      Potential.resolve(fulfilled)
      .then(function (value) {
        expect(value).to.equal(sentinel);
        done();
      })
      .catch(done);
    });

    it('can unwrap an eventually-fulfilled promise', function (done) {
      var deferral = Potential.defer();
      var toBeFulfilled = deferral.promise;
      Potential.resolve(toBeFulfilled)
      .then(function (value) {
        expect(value).to.equal(sentinel);
        done();
      })
      .catch(done);
      setTimeout(function () {
        deferral.resolve(sentinel);
      }, 10);
    });

    it('rejects when unwrapping a rejected promise', function (done) {
      var rejected = Potential.reject(sentinel);
      Potential.resolve(rejected)
      .then(done) // this handler should not be called
      .catch(function (reason) {
        expect(reason).to.equal(sentinel);
        done();
      });
    });

    it('rejects when unwrapping an eventually-rejected promise', function (done) {
      var deferral = Potential.defer();
      var toBeRejected = deferral.promise;
      Potential.resolve(toBeRejected)
      .then(done) // this handler should not be called
      .catch(function (reason) {
        expect(reason).to.equal(sentinel);
        done();
      });
      setTimeout(function () {
        deferral.reject(sentinel);
      }, 10);
    });

  });

  describe('.reject', function () {

    it('creates a promise that rejects with a passed-in value', function (done) {
      Potential.reject(sentinel)
      .then(done) // this handler should not be called
      .catch(function (value) {
        expect(value).to.equal(sentinel);
        done();
      });
    });

    it('can unwrap a fulfilled promise', function (done) {
      var fulfilled = Potential.resolve(sentinel);
      Potential.reject(fulfilled)
      .then(done) // this handler should not be called
      .catch(function (reason) {
        expect(reason).to.equal(sentinel);
        done();
      });
    });

    it('can unwrap an eventually-fulfilled promise', function (done) {
      var deferral = Potential.defer();
      var toBeFulfilled = deferral.promise;
      Potential.reject(toBeFulfilled)
      .then(done) // this handler should not be called
      .catch(function (reason) {
        expect(reason).to.equal(sentinel);
        done();
      });
      setTimeout(function () {
        deferral.resolve(sentinel);
      }, 10);
    });

    it('can unwrap a rejected promise', function (done) {
      var rejected = Potential.reject(sentinel);
      Potential.reject(rejected)
      .then(done) // this handler should not be called
      .catch(function (reason) {
        expect(reason).to.equal(sentinel);
        done();
      });
    });

    it('can unwrap an eventually-rejected promise', function (done) {
      var deferral = Potential.defer();
      var toBeRejected = deferral.promise;
      Potential.reject(toBeRejected)
      .then(done) // this handler should not be called
      .catch(function (reason) {
        expect(reason).to.equal(sentinel);
        done();
      });
      setTimeout(function () {
        deferral.reject(sentinel);
      }, 10);
    });

  });

  describe('.all', function () {

    it('given an array of simple values returns a promise for an array of the same values', function (done) {
      var arr = [1, 'hi', {}];
      Potential.all(arr)
      .then(function (results) {
        expect(results).to.deep.equal(arr);
        done();
      })
      .catch(done);
    });

    it('given an array of promises returns a promise for an array of the final values', function (done) {
      var onePromise = Potential.resolve(7);
      var twoPromise = Potential.resolve('hello');
      var threePromise = Potential.resolve(null);
      var arr = [onePromise, twoPromise, threePromise];
      Potential.all(arr)
      .then(function (results) {
        expect(results).to.deep.equal([7, 'hello', null]);
        done();
      })
      .catch(done);
    });

    it('given an array of thenables returns a promise for an array of the final values', function (done) {
      var oneThenable = new Promise(function (resolve) { resolve(undefined); });
      var twoThenable = new Promise(function (resolve) { resolve([ null ]); });
      var threeThenable = new Promise(function (resolve) { resolve(9); });
      var arr = [oneThenable, twoThenable, threeThenable];
      Potential.all(arr)
      .then(function (results) {
        expect(results).to.deep.equal([undefined, [ null ], 9]);
        done();
      })
      .catch(done);
    });

    it('given a mixed array returns a promise for an array of final values', function (done) {
      var one = 1;
      var twoPromise = Potential.resolve(2);
      var threeThenable = new Promise(function (resolve) { resolve(3); });
      var arr = [one, twoPromise, threeThenable];
      Potential.all(arr)
      .then(function (results) {
        expect(results).to.deep.equal([1, 2, 3]);
        done();
      })
      .catch(done);
    });

    it('rejects if any of the array elements reject', function (done) {
      var rejected = Potential.reject(new Error('rejected'));
      var arr = [1, rejected, 3];
      Potential.all(arr)
      .then(function () {
        done(new Error('this promise should not have fulfilled'));
      })
      .catch(function (err) {
        expect(err.message).to.equal('rejected');
        done();
      });
    });

  });

});

describe('A promise', function () {

  describe('.catch', function () {

    it('serves as a convenience for error handling', function (done) {
      Potential.resolve()
      .then(function () {
        throw new Error('should go to catch');
      })
      .then(function () {
        done(new Error('this handler should not have been invoked'));
      })
      .catch(function (err) {
        expect(err.message).to.equal('should go to catch');
        done();
      })
      .then(null, done);
    });

    it('returns a normal promise', function (done) {
      var ran = false;
      Potential.reject()
      .catch(function () {
        ran = true;
        return 'success value';
      })
      .then(function (val) {
        expect(val).to.equal('success value');
        expect(ran).to.be.true;
        done();
      })
      .then(null, done);
    });

  });

  describe('.spread', function () {

    it('spreads a promised array of values over formal params', function (done) {
      Potential.resolve([1, 2, 3])
      .spread(function (one, two, three) {
        expect(one).to.equal(1);
        expect(two).to.equal(2);
        expect(three).to.equal(3);
        done();
      })
      .catch(done);
    });

    it('implicitly uses `.all` to unwrap promise/thenable elements', function (done) {
      var onePromise = Potential.resolve(1);
      var twoThenable = new Promise(function (resolve) { resolve(2); });
      Potential.resolve([onePromise, twoThenable, 3])
      .spread(function (one, two, three) {
        expect(one).to.equal(1);
        expect(two).to.equal(2);
        expect(three).to.equal(3);
        done();
      })
      .catch(done);
    });

    it('returns a normal promise', function (done) {
      Potential.resolve([1, 2, 3])
      .spread(function (one, two, three) {
        return one + two + three;
      })
      .then(function (result) {
        expect(result).to.equal(6);
        done();
      })
      .catch(done);
    });

  });

});
