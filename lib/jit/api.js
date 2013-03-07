var api = exports;

var jit = require('../jit');

function createContext(arch, options) {
  if (!jit.backends.hasOwnProperty(arch)) {
    throw new Error('Arch: ' + arch + ' isn\'t supported yet');
  }

  return new jit.backends[arch](arch, options);
};

api.generate = function generate(fn, options) {
  if (!options) options = {};

  var ctx = createContext(options.arch || process.arch, options);

  fn.call(ctx);

  return ctx.toBuffer();
};

api.compile = function compile(fn, options) {
  var buffer = api.generate(fn, options);

  return jit.binding.wrap(buffer);
};
