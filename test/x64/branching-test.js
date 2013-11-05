var common = require('../common'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Branching', function() {
  test('should support branching', function() {
    this.xor('rax', 'rax');
    this.mov('rcx', 10);
    this.labelScope(function() {
      this.bind('loop');

      this.inc('rax');
      this.dec('rcx');
      this.cmp('rcx', 0);

      this.j('ne', 'loop');

      // Just to test jumping
      this.jl('out');
      this.bind('out');
    });

    this.Return();
  }, 10);

  test('should support procedures', function() {
    this.labelScope(function() {
      this.call('rax', 'proc');
      this.Return();

      this.Proc('proc', function() {
        this.mov('rax', 42);
        this.Return();
      });
    });
  }, 42);
});
