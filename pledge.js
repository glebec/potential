// Private

var Deferral = function Deferral () {

};

var $Promise = function $Promise () {

};

// Public

// Library & ES6-style constructor
var Pledge = module.exports = function Pledge (handOff) {
  var deferral = this.defer();
  handOff(
    deferral.resolve.bind(deferral),
    deferral.reject.bind(deferral)
  );
  return deferral.promise;
};

// Deferral-style factory
Pledge.prototype.defer = function defer () {
  return new Deferral();
};

// Utility methods
Pledge.prototype.resolved = function resolved (value) {
  // body...
};

Pledge.prototype.rejected = function rejected (reason) {
  // body...
};
