// Private

var HandlerGroup = function HandlerGroup (successCb, failureCb) {
  this.successCb = (typeof successCb === 'function') ? successCb : null;
  this.failureCb = (typeof failureCb === 'function') ? failureCb : null;
  this.forwarder = new Deferral();
};

var $Promise = function $Promise () {
  this.state = 'pending';
  this.handlers = [];
  this.schedule = function schedule (fn) {
    schedule.fns = schedule.fns || [];
    if (fn) schedule.fns.push(fn);
    else setImmediate(function(){
      var newIndex = schedule.fns.length;
      schedule.fns.forEach(function(fn){ fn(); });
      schedule.fns = schedule.fns.slice(newIndex);
    });
  };
};

$Promise.prototype.then = function then (successCb, failureCb) {
  var newGroup = new HandlerGroup(successCb, failureCb);
  this.handlers.push(newGroup);
  this.tryHandlers();
  return newGroup.forwarder.promise;
};

$Promise.prototype.tryHandlers = function tryHandlers () {
  var group, handler, bubble, output;
  if (this.state === 'pending') return;
  while (this.handlers.length) {
    group = this.handlers.shift();
    handler = (this.state === 'resolved') ? group.successCb : group.failureCb;
    if (!handler) {
      bubble = (this.state === 'resolved') ? 'resolve' : 'reject';
      group.forwarder[bubble](this.value);
    } else {
      this.schedule(executes(handler, this.value, group.forwarder));
    }
  }
  this.schedule();
};

function executes (handler, value, forwarder) {
  return function executing () {
    try {
      output = handler(value);
      if (output === forwarder.promise) {
        var er = new TypeError('cannot forward the promise returned by .then');
        forwarder.reject(er);
      } else if (output instanceof $Promise) {
        output.then(
          function(value) { forwarder.resolve(value); },
          function(error) { forwarder.reject(error); }
        );
      } else forwarder.resolve(output);
    } catch (err) {
      forwarder.reject(err);
    }
  };
}

var Deferral = function Deferral () {
  this.promise = new $Promise();
  this.resolve = this.resolve.bind(this);
  this.reject  = this.reject.bind(this);
};

Deferral.prototype.resolve = function resolve (value) {
  if (this.promise.state !== 'pending') return;
  this.promise.state = 'resolved';
  this.promise.value = value;
  this.promise.tryHandlers();
  return this.promise;
};

Deferral.prototype.reject = function reject (reason) {
  if (this.promise.state !== 'pending') return;
  this.promise.state = 'rejected';
  this.promise.value = reason;
  this.promise.tryHandlers();
  return this.promise;
};

// Public

// Library & ES6-style constructor
var Pledge = function Pledge (handOff) {
  var deferral = this.defer();
  handOff( deferral.resolve, deferral.reject );
  return deferral.promise;
};

// Deferral-style factory
Pledge.defer = function defer () {
  return new Deferral();
};

// Utility methods
Pledge.resolved = function resolved (value) {
  return new Deferral().resolve(value);
};

Pledge.rejected = function rejected (reason) {
  return new Deferral().reject(reason);
};

// It's alive!
module.exports = Pledge;
