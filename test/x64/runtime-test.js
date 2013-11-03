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
    assert.equal(called, 1);
  });

  test('should support runtime', function() {
    this.runtime(function() {
      called++;
      return 42;
    });
    this.Exit();
  }, 42);
});
