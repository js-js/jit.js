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

  return {
    buffer: context.toBuffer(),
    relocations: context.getRelocations()
  };
};

api.wrap = function wrap(output) {
  var fn = jit.binding.wrap(output.buffer);

  // Copy absolute relocations
  output.relocations.forEach(function(reloc) {
    var offset = fn.getAbsoluteOffset(reloc.value);
    assert(reloc.size === offset.length);
    offset.copy(fn.raw, reloc.offset);
  });

  return fn;
};

api.compile = function compile(fn, options) {
  return api.wrap(api.generate(fn, options));
};
