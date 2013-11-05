var jit = exports;

jit.binding = require('bindings')('jit');

jit.getBackend = require('./jit/api').getBackend;
jit.wrap = require('./jit/api').wrap;
jit.generate = require('./jit/api').generate;
jit.compile = require('./jit/api').compile;
jit.stubs = require('./jit/api').stubs;
jit.ptr = require('./jit/api').ptr;

jit.BaseAsm = require('./jit/base').BaseAsm;
jit.BaseMasm = require('./jit/base').BaseMasm;
jit.Relocation = require('./jit/base').Relocation;
jit.Label = require('./jit/base').Label;
jit.Stubs = require('./jit/stubs');

jit.backends = {
  x64: require('./jit/x64')
};
