'use strict';

//===== EXTENDED LIBRARY =====

module.exports = function (Potential, $Promise) {

  //----- promise methods -----

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

};
