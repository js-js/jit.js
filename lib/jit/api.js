var api = exports;

var assert = require('assert');
var jit = require('../jit');

//
// ### function getBackend (arch)
// #### @arch {String} Architecture (x64)
// Returns platform-specific Masm constructor.
//
api.getBackend = function getBackend(arch) {
  if (!arch)
    arch = process.arch;

  if (!jit.backends.hasOwnProperty(arch))
    throw new Error('Arch: ' + arch + ' isn\'t supported yet');

  return jit.backends[arch];
};

//
// ### function generate (fn, options)
// #### @fn {Function} Generator's body
// #### @options {Object} Backend's options (see BaseAsm), usually may contain
//                        only a `stubs` property with `jit.stubs()` value
// Run `fn` in the context of backend instance and return result of compilation:
// RelocationInfo instance.
//
api.generate = function generate(fn, options) {
  if (!options)
    options = {};

  var backend = options.backend || api.getBackend(options.arch),
      context = new backend.Masm(options);

  fn.call(context);

  return context.compile();
};

//
// ### function wrap (relocs)
// #### @relocs {RelocationInfo} result of `jit.generate()` call
// Wraps result of `jit.generate()` and returns a callable function.
//
api.wrap = function wrap(relocs) {
  var info = new jit.binding.ExecInfo(relocs.buffer);

  // Resolve absolute relocations
  relocs.resolve(info);

  // Keep references to info
  var exec = info.exec.bind(info);
  exec._info = info;
  return exec;
};

//
// ### function compile (fn, options)
// #### @fn {Function} Generator's body
// #### @options {Object} Backend's options (see BaseAsm), usually may contain
//                        only a `stubs` property with `jit.stubs()` value
// Combines `jit.generate()` and `jit.wrap().
//
api.compile = function compile(fn, options) {
  return api.wrap(api.generate(fn, options));
};

//
// ### function stubs (options)
// #### @options {Object} Backend's options (see BaseAsm)
// Returns jit.Stubs instance.
//
api.stubs = function stubs(options) {
  return new jit.Stubs(options);
};

//
// ### function ptr (buf, offset)
// #### @buf {Buffer} Buffer object
// #### @offset {Number} **optional** offset
// Return `Buffer` instance, containing absolute memory address of given `buf`
// with `offset` added to it.
//
api.ptr = function ptr(buf, offset) {
  return jit.binding.getPointer(buf, offset);
};
