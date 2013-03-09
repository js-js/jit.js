var jit = exports;

jit.binding = require('bindings')('jit');

jit.getBackend = require('./jit/api').getBackend;
jit.wrap = require('./jit/api').wrap;
jit.generate = require('./jit/api').generate;
jit.compile = require('./jit/api').compile;

jit.BaseMasm = require('./jit/base');

jit.backends = {
  x64: require('./jit/x64'),
  ia32: require('./jit/ia32')
};
