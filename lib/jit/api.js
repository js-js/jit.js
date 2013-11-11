var api = exports;

var assert = require('assert');
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

  return context.compile();
};

api.wrap = function wrap(relocs) {
  var info = new jit.binding.ExecInfo(relocs.buffer);

  // Resolve absolute relocations
  relocs.resolve(info);

  // Keep references to info
  var exec = info.exec.bind(info);
  exec._info = info;
  return exec;
};

api.compile = function compile(fn, options) {
  return api.wrap(api.generate(fn, options));
};

api.stubs = function stubs(options) {
  return new jit.Stubs(options);
};

api.ptr = function ptr(buf, offset) {
  return jit.binding.getPointer(buf, offset);
};
