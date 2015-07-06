'use strict';

//===== EXTENDED LIBRARY =====

module.exports = function (Potential, $Promise) {

  //----- promise methods -----

  // syntactic sugar for adding error handlers
  $Promise.prototype.catch = function (onRejected) {
    return this.then(null, onRejected);
  };

};
