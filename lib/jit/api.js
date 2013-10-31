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

  return {
    buffer: context.toBuffer(),
    relocation: context.getRelocation()
  };
};

api.wrap = function wrap(output) {
  return jit.binding.wrap(output.buffer, output.relocation);
};

api.compile = function compile(fn, options) {
  return api.wrap(api.generate(fn, options));
};
