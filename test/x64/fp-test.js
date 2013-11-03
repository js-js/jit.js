var common = require('../common'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Floating Point', function() {
  test('should support fp', function() {
    this.loadDouble('rax', 13589.13589);
    this.movq('xmm1', 'rax');
    this.movq('r8', 'xmm1');
    this.movq('xmm15', 'r8');
    this.mulsd('xmm1', 'xmm15');
    this.roundsd('up', 'xmm1', 'xmm1');
    this.cvtsd2si('r8', 'xmm1');
    this.xchg('r8', 'rax');

    this.Exit();
  }, 184664615);
});
