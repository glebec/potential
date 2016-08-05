'use strict';

//===== EXTENDED LIBRARY =====

module.exports = function (Potential, $Promise) {

  //----- general library methods -----

  // arr of vals, can include promises -> promise for ordered arr of results
  // reject if any value rejects
  Potential.all = function (arrOfValues) {
    var numCompleted = 0;
    var limit = arrOfValues.length;
    var finalResults = [];
    var resultsDeferral = Potential.defer();

    arrOfValues
    .map(val => Potential.resolve(val))
    .forEach((resultPromise, i) => {
      resultPromise
      .then(val => {
        finalResults[i] = val;
        numCompleted++;
        checkIfComplete();
      })
      .catch(resultsDeferral.reject);
    });

    function checkIfComplete () {
      if (numCompleted === limit) resultsDeferral.resolve(finalResults);
    }

    return resultsDeferral.promise;
  };

  //----- promise instance methods -----

  $Promise.debounce = function (sourceFn) {
    var pending;
    function resetPending () {
     pending = null;
    }
    resetPending();
    return function () {
      if (!pending) {
        pending = Promise.resolve(sourceFn.apply(this, arguments));
        pending.then(resetPending, resetPending);
      }
      return pending;
    };
  };

  // syntactic sugar for adding error handlers
  $Promise.prototype.catch = function (onRejected) {
    return this.then(null, onRejected);
  };

  // called on a promise for an arr of vals, spread the final vals over the args of a handler func
  $Promise.prototype.spread = function (handler) {
    return this
    .then(function (promisedArray) {
      return Potential.all(promisedArray);
    })
    .then(function (normalizedArray) {
      return handler.apply(null, normalizedArray);
    });
  };

};
