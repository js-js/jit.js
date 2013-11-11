var api = exports;

var assert = require('assert');
var util = require('util');
var jit = require('../jit');

//
// ### function getBackend (arch, helpers)
// #### @arch {String} Architecture (x64)
// #### @helpers {Object} **optional** Masm helper methods
// Returns platform-specific Masm constructor.
//
api.getBackend = function getBackend(arch, helpers) {
  if (!arch)
    arch = process.arch;

  if (!jit.backends.hasOwnProperty(arch))
    throw new Error('Arch: ' + arch + ' isn\'t supported yet');

  var backend = jit.backends[arch];

  // Create temporary child class with helper methods
  if (helpers) {
    function HelperMasm(options) {
      backend.Masm.call(this, options);
    }
    util.inherits(HelperMasm, backend.Masm);

    // Copy all helper methods
    Object.keys(helpers).forEach(function(key) {
      this[key] = helpers[key];
    }, HelperMasm.prototype);

    return { Asm: backend.Asm, Masm: HelperMasm };
  }

  return backend;
};

//
// ### function generate (fn, options)
// #### @fn {Function} Generator's body
// #### @options {Object} **optional** Backend's options (see BaseAsm):
//                        * `stubs` {Stubs} `jit.stubs()` value
//                        * `zapValue` {Number} a value to push when aligning
//                          stack
//                        * `helpers` {Object} helper methods
// Run `fn` in the context of backend instance and return result of compilation:
// RelocationInfo instance.
//
api.generate = function generate(fn, options) {
  if (!options)
    options = {};

  var backend = options.backend ||
                api.getBackend(options.arch, options.helpers),
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
// #### @options {Object} Backend's options (see above)
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
