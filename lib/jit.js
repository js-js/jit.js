var jit = exports;

// Export binding (internal use only)
jit.binding = require('bindings')('jit');

// API methods, see jit/api.js for details

jit.getBackend = require('./jit/api').getBackend;
jit.wrap = require('./jit/api').wrap;
jit.generate = require('./jit/api').generate;
jit.compile = require('./jit/api').compile;
jit.create = require('./jit/api').create;
jit.stubs = require('./jit/api').stubs;
jit.ptr = require('./jit/api').ptr;

// Various base classes (internal use mostly)

jit.BaseAsm = require('./jit/base').BaseAsm;
jit.BaseMasm = require('./jit/base').BaseMasm;
jit.Relocation = require('./jit/base').Relocation;
jit.Label = require('./jit/base').Label;
jit.Stubs = require('./jit/stubs');

// Supported backends

jit.backends = {
  x64: require('./jit/x64')
};
