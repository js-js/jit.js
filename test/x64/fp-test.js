var common = require('../common'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Floating Point', function() {
  test('should support double-fp', function() {
    this.loadDouble('rax', 13589.13589);
    this.movq('xmm1', 'rax');
    this.movq('r8', 'xmm1');
    this.movq('xmm15', 'r8');
    this.mulsd('xmm1', 'xmm15');
    this.roundsd('up', 'xmm1', 'xmm1');
    this.cvtsd2si('r8', 'xmm1');
    this.xchg('r8', 'rax');

    this.Return();
  }, 184664615);

  test('should support float-fp', function() {
    this.loadFloat('rax', 13589.13589);
    this.movd('xmm1', 'rax');
    this.movd('r8', 'xmm1');
    this.movd('xmm15', 'r8');
    this.mulss('xmm1', 'xmm15');
    this.roundss('up', 'xmm1', 'xmm1');
    this.cvtss2si('r8', 'xmm1');
    this.xchg('r8', 'rax');

    this.Return();
  }, 184664608);

  test('should support sqrt', function() {
    this.loadDouble('rax', 13589.13589);
    this.movq('xmm1', 'rax');
    this.sqrtsd('xmm1', 'xmm1');
    this.cvtsd2si('rax', 'xmm1');
    this.Return();
  }, 117);

  test('should support maxsd', function() {
    this.loadDouble('rax', 123);
    this.loadDouble('rcx', 456);
    this.movq('xmm1', 'rax');
    this.movq('xmm2', 'rcx');
    this.maxsd('xmm1', 'xmm2');
    this.cvtsd2si('rax', 'xmm1');
    this.Return();
  }, 456);

  test('should support minsd', function() {
    this.loadDouble('rax', 123);
    this.loadDouble('rcx', 456);
    this.movq('xmm1', 'rax');
    this.movq('xmm2', 'rcx');
    this.minsd('xmm1', 'xmm2');
    this.cvtsd2si('rax', 'xmm1');
    this.Return();
  }, 123);
});
