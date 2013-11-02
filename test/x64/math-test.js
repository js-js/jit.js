var common = require('../common'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Math', function() {
  test('should support math basics', function() {
    this.Entry();

    // 12 * 14
    this.mov('r8', 12);
    this.mov('rax', 14);
    this.imul('r8');

    // += 5
    this.mov('r8', 'rax');
    this.mov('rbx', 5);
    this.add('rbx', 'r8');

    // -= 3
    this.mov('r8', 'rbx');
    this.mov('rbx', new Buffer('0300000000000000', 'hex'));
    this.sub('r8', 'rbx');

    // /= 5
    this.mov('rax', 'r8');
    this.mov('r8', 5);
    this.idiv('r8');

    this.Exit();
  }, 34);
});
