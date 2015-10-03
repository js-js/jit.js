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

  test('should support branching without scope', function() {
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

  test('should support procedures on low regs', function() {
    this.labelScope(function() {
      this.call('rax', 'proc');
      this.Return();

      this.Proc('proc', function() {
        this.mov('rax', 42);
        this.Return();
      });
    });
  }, 42);

  test('should support procedures on high regs', function() {
    this.labelScope(function() {
      this.call('r11', 'proc');
      this.Return();

      this.Proc('proc', function() {
        this.mov('rax', 42);
        this.Return();
      });
    });
  }, 42);

  test('should support set() on low reg', function() {
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

  test('should support set() on high reg', function() {
    this.spill('r8', function() {
      this.xor('r8', 'r8');
      this.mov('rax', 1);
      this.shl('rax', 63);
      this.mul('rax');

      this.set('o', 'r8');
      this.shl('r8', 1);
      this.mov('rax', 'r8');

      this.test('r8', 'r8');

      this.set('z', 'r8');
      this.or('rax', 'r8');
    });

    this.Return();
  }, 2);

  test('should support cmov()', function() {
    this.spill([ 'rbx', 'rcx' ], function() {
      this.mov('rbx', 2);
      this.mov('rcx', 3);

      this.xor('rax', 'rax');
      this.cmp('rax', 1);
      this.cmov('l', 'rax', 'rbx');
      this.cmov('ge', 'rax', 'rcx');
    });

    this.Return();
  }, 2);
});
