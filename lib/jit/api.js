var api = exports;

var jit = require('../jit');

api.getBackend = function getBackend(arch) {
  if (!jit.backends.hasOwnProperty(arch)) {
    throw new Error('Arch: ' + arch + ' isn\'t supported yet');
  }

  return jit.backends[arch];
};

api.generate = function generate(fn, options) {
  if (!options) options = {};

  var backend = api.getBackend(options.arch || process.arch),
      context = new backend(options);

  fn.call(context);

  return context.toBuffer();
};

api.compile = function compile(fn, options) {
  var buffer = api.generate(fn, options);

  return jit.binding.wrap(buffer);
};
