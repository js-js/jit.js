var api = exports;

var assert = require('assert');
var mmap = require('mmap');
var ref = require('ref');
var weak = require('weak');
var util = require('util');
var jit = require('../jit');

function toExecutable(data) {
  var size = data.length;
  if (size % mmap.PAGESIZE !== 0)
    size += mmap.PAGESIZE - (size % mmap.PAGESIZE);

  var prot = mmap.PROT_READ | mmap.PROT_WRITE | mmap.PROT_EXEC;
  var flags = mmap.MAP_PRIVATE | mmap.MAP_ANON;
  var chunk = mmap(size, prot, flags, -1, 0);

  data.copy(chunk);

  weak(data, function() {
    data.unmap();
  });

  return chunk;
}

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
// ### function create (options)
// #### @options {Object} **optional** Backend's options (see BaseAsm):
//                        * `stubs` {Stubs} `jit.stubs()` value
//                        * `zapValue` {Number} a value to push when aligning
//                          stack
//                        * `helpers` {Object} helper methods
// Return jit context.
//
api.create = function create(options) {
  if (!options)
    options = {};

  var backend = options.backend ||
                api.getBackend(options.arch, options.helpers);

  return new backend.Masm(options);
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
  var context = api.create(options);

  fn.call(context);

  return context.compile();
};

//
// ### function wrap (relocs)
// #### @relocs {RelocationInfo} result of `jit.generate()` call
// Wraps result of `jit.generate()` and returns a callable function.
//
api.wrap = function wrap(relocs) {
  var exec = toExecutable(relocs.buffer);

  // Resolve absolute relocations
  relocs.resolve(exec);

  // Wrap into javascript function
  var fn = new jit.binding.FunctionWrap(exec);
  fn = fn.exec.bind(fn);

  // Keep references to exec
  fn._exec = exec;

  return fn;
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
  if (offset)
    return ref.ref(buf.slice(offset));
  else
    return ref.ref(buf);
};
