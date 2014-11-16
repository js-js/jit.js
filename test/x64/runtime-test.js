var common = require('../common'),
    assert = require('assert'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Runtime', function() {
  var called = 0;

  beforeEach(function() {
    called = 0;
  });

  afterEach(function() {
    assert.equal(called, 0x100);
  });

  test('should support runtime with number ret', function() {
    this.runtime(function(arg) {
      called += arg.readUInt32LE(0);
      return 42;
    }, 0x100);
    this.Return();
  }, 42);

  test('should support runtime with buffer ret', function() {
    this.runtime(function(arg) {
      called += arg.readUInt32LE(0);
      return arg;
    }, 0x100);
    this.Return();
  }, 0x100);

  test('should support runtime with 6 args', function() {
    this.runtime(function(a, b, c, d, e, f) {
      called = 0x100;
      return f.readUInt32LE(0);
    }, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6);
    this.Return();
  }, 6);
});
