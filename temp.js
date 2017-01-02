const Potential = require('./lib');

const x = new Promise(resolve => {
  setTimeout(() => resolve('hi'), 1000);
});

const promise = new Potential(resolve => {
  resolve(x);
  resolve('bye');
});

promise.then(console.log.bind(console));
