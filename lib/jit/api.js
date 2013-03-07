var api = exports;

var jit = require('../jit');

api.generate = function generate(fn, options) {
  return new Buffer(0);
};

api.compile = function compile(fn, options) {
  var buffer = api.generate(fn, options);

  return jit.binding.wrap(buffer);
};
