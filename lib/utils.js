'use strict';

// Utility functions for cleaner code in the main module

const invoke = fns => fns.forEach(fn => fn());

const isFunction = maybe => typeof maybe === 'function';

const isObjectOrFunction = maybe => maybe && !!(typeof maybe).match(/function|object/);

const once = func => {
  let ran = false;
  return (...args) => {
    if (!ran) func(...args);
    ran = true;
  };
};

const symbolToDescription = symbol => symbol.toString().slice(7, -1);

module.exports = {
  invoke,
  isFunction,
  isObjectOrFunction,
  once,
  symbolToDescription
};
