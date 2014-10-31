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

  test('should support branching without scpe', function() {
    this.xor('rax', 'rax');
    this.mov('rcx', 10);

    var loop = this.label();
    this.bind(loop);

    this.inc('rax');
    this.dec('rcx');
    this.cmp('rcx', 0);

    this.j('ne', loop);

    // Just to test jumping
    var out = this.label();
    this.jl(out);
    this.bind(out);

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

  test('should support set()', function() {
    this.spill('rbx', function() {
      this.xor('rbx', 'rbx');
      this.mov('rax', 1);
      this.shl('rax', 63);
      this.mul('rax');

      this.set('o', 'rbx');
      this.shl('rbx', 1);
      this.mov('rax', 'rbx');

      this.test('rbx', 'rbx');

      this.set('z', 'rbx');
      this.or('rax', 'rbx');
    });

    this.Return();
  }, 2);
});
