// Private

var HandlerGroup = function HandlerGroup (successCb, failureCb) {
  this.successCb = (typeof successCb === 'function') ? successCb : null;
  this.failureCb = (typeof failureCb === 'function') ? failureCb : null;
  this.forwarder = new Deferral();
};

var $Promise = function $Promise () {
  this._internal = {
    state : 'pending',
    handlers : [],
    schedule : function schedule (fn) {
      schedule.fns = schedule.fns || [];
      if (fn) schedule.fns.push(fn);
      else process.nextTick(function(){
        var newIndex = schedule.fns.length;
        schedule.fns.forEach(function(fn){ fn(); });
        schedule.fns = schedule.fns.slice(newIndex);
      });
    }
  };
};

$Promise.prototype.then = function then (successCb, failureCb) {
  var newGroup = new HandlerGroup(successCb, failureCb);
  this._internal.handlers.push(newGroup);
  this.tryHandlers();
  return newGroup.forwarder.promise;
};

$Promise.prototype.tryHandlers = function tryHandlers () {
  var my = this._internal, group, handler, bubble, output;
  if (my.state === 'pending') return;
  while (my.handlers.length) {
    group = my.handlers.shift();
    handler = (my.state === 'resolved') ? group.successCb : group.failureCb;
    if (!handler) {
      bubble = (my.state === 'resolved') ? 'resolve' : 'reject';
      group.forwarder[bubble](my.value);
    } else {
      my.schedule(executes(handler, my.value, group.forwarder));
    }
  }
  my.schedule();
};

function executes (handler, value, forwarder) {
  return function executing () {
    try {
      output = handler(value);
      forwarder.resolve(output);
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
  if (this.promise._internal.state !== 'pending') return;
  this.promise._internal.state = 'resolved';
  this.promise._internal.value = value;
  this.promise.tryHandlers();
  return this.promise;
};

Deferral.prototype.reject = function reject (reason) {
  if (this.promise._internal.state !== 'pending') return;
  this.promise._internal.state = 'rejected';
  this.promise._internal.value = reason;
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
