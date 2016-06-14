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

    it('can unwrap a resolved promise', function (done) {
      var resolved = Potential.resolve(sentinel);
      Potential.resolve(resolved)
      .then(function (value) {
        expect(value).to.equal(sentinel);
        done();
      })
      .catch(done);
    });

    it('can unwrap an eventually-resolved promise', function (done) {
      var deferral = Potential.defer();
      var toBeResolved = deferral.promise;
      Potential.resolve(toBeResolved)
      .then(function (value) {
        expect(value).to.equal(sentinel);
        done();
      })
      .catch(done);
      setTimeout(function () {
        deferral.resolve(sentinel);
      }, 10);
    });

    it('can unwrap a rejected promise', function (done) {
      var rejected = Potential.reject(sentinel);
      Potential.resolve(rejected)
      .then(done) // this handler should not be called
      .catch(function (reason) {
        expect(reason).to.equal(sentinel);
        done();
      });
    });

    it('can unwrap an eventually-rejected promise', function (done) {
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

    it('can unwrap a resolved promise', function (done) {
      var resolved = Potential.resolve(sentinel);
      Potential.reject(resolved)
      .then(done) // this handler should not be called
      .catch(function (reason) {
        expect(reason).to.equal(sentinel);
        done();
      });
    });

    it('can unwrap a rejected promise', function (done) {
      var rejected = Potential.reject(sentinel);
      Potential.resolve(rejected)
      .then(done) // this handler should not be called
      .catch(function (reason) {
        expect(reason).to.equal(sentinel);
        done();
      });
    });

  });

});
