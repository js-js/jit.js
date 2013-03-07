var jit = exports;

jit.binding = require('bindings')('jit');

jit.generate = require('./jit/api').generate;
jit.compile = require('./jit/api').compile;

jit.BaseAsm = require('./jit/base');

jit.backends = {
  x64: require('./jit/x64')
};
