var common = require('../common'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Spills', function() {
  test('should support returns in closure', function() {
    this.mov('rax', 42);

    this.spill('rax', function() {
      this.Return();
    });
  }, 42);

  test('should support returns outside closure', function() {
    this.labelScope(function() {
      this.mov('rax', 42);

      this.spill('rax', function() {
        this.j('skip');
        this.Return();
        this.bind('skip');
      });

      this.Return();
    });
  }, 42);
});
