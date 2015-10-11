var common = require('../common'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Binary', function() {
  test('should support binary', function() {
    this.spill([ 'rbx', 'rcx' ], function() {
      this.mov('rax', 1);
      this.shl('rax', 3);
      this.mov('rbx', 2);
      this.shl('rbx', 1);
      this.or('rax', 'rbx');
      this.or('rax', 2);
      this.and('rax', 13);
      this.mov('rbx', 1);
      this.mov('rcx', 5);
      this.shl('rbx', 'rcx');
      this.or('rax', 'rbx');
    });

    this.Return();
  }, 44);

  test('should support lzcnt', function() {
    var skip = this.label();

    // Check lzcnt
    this.mov('rax', 0x80000001);
    this.cpuid();
    this.test('rcx', 1 << 5);
    this.j('e', skip);

    this.mov('rcx', 0xdead);
    this.lzcnt('rax', 'rcx');
    this.lzcntl('rcx', 'rcx');
    this.add('rax', 'rcx');

    this.Return();

    this.bind(skip);
    this.mov('rax', 0x30 + 0x10);
    this.Return();
  }, 0x30 + 0x10);

  test('should support tzcnt', function() {
    this.mov('rcx', new Buffer('000000000eadbeef', 'hex'));
    this.tzcnt('rax', 'rcx');
    this.tzcntl('rcx', 'rcx');
    this.add('rax', 'rcx');

    this.Return();
  }, 0x21 + 0x20);

  test('should support popcnt', function() {
    this.mov('rcx', new Buffer('deadbeefabbadead', 'hex'));
    this.popcnt('rax', 'rcx');
    this.popcntl('rcx', 'rcx');
    this.add('rax', 'rcx');

    this.Return();
  }, 0x2d + 0x18);
});
