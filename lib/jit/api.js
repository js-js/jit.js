var api = exports;

var jit = require('../jit');

api.getBackend = function getBackend(arch) {
  if (!arch)
    arch = process.arch;

  if (!jit.backends.hasOwnProperty(arch))
    throw new Error('Arch: ' + arch + ' isn\'t supported yet');

  return jit.backends[arch];
};

api.generate = function generate(fn, options) {
  if (!options)
    options = {};

  var backend = options.backend || api.getBackend(options.arch),
      context = new backend.Masm(options);

  fn.call(context);

  return context.toBuffer();
};

api.wrap = function wrap(buffer) {
  return jit.binding.wrap(buffer);
};

api.compile = function compile(fn, options) {
  return api.wrap(api.generate(fn, options));
};
