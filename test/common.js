var jit = require('..');
var assert = require('assert');

exports.jit = jit;

exports.test = function test(name, fn, result) {
  it(name, function() {
    assert.equal(jit.compile(fn)(), result);
  });
};
