'use strict';

// Utility functions for cleaner code in the main module

const invoke = fns => fns.forEach(fn => fn());

const isFunction = maybe => typeof maybe === 'function';

const isObjectOrFunction = maybe => maybe && !!(typeof maybe).match(/function|object/);

const functionRace = () => {
  let ran = false;
  return {
    register: func => (...args) => {
      if (ran) return;
      func(...args);
      ran = true;
    }
  };
};

const symbolToDescription = symbol => symbol.toString().slice(7, -1);

module.exports = {
  invoke,
  isFunction,
  isObjectOrFunction,
  functionRace,
  symbolToDescription
};
