var common = require('../common'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Branching', function() {
  test('should support branching', function() {
    this.Entry();

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

    this.Exit();
  }, 10);

  test('should support procedures', function() {
    this.labelScope(function() {
      this.Entry();
      this.call('rax', 'proc');
      this.Exit();

      this.bind('proc');
      this.Entry();
      this.mov('rax', 42);
      this.Exit();
    });
  }, 42);
});
