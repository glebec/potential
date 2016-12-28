'use strict';

const fs = require('fs');
const { Potential, $Promise } = require('../core');

// extend the Potential library with additional convenience methods

fs.readdirSync(__dirname)
.filter(filename => filename !== 'index.js')
.map(filename => './' + filename)
.forEach(require);

// create instance method equivalents for each collection static method

['all', 'race', 'map'].forEach(method => {
  $Promise.prototype[method] = function (...args) {
    return this.then(value => {
      return Potential[method](value, ...args);
    });
  };
});
