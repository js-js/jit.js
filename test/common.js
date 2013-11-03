var jit = require('..');
var assert = require('assert');

exports.jit = jit;

exports.test = function test(name, fn, result) {
  it(name, function() {
    assert.equal(jit.compile(function() {
      this.Proc(fn);
    }, {
      stubs: jit.stubs()
    })(), result);
  });
};
