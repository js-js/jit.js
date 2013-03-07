var jit = exports;

jit.binding = require('bindings')('jit');

jit.generate = require('./jit/api').generate;
jit.compile = require('./jit/api').compile;
