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
});
