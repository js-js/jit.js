var common = require('../common'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Binary', function() {
  test('should support binary', function() {
    this.mov('rax', 1);
    this.shl('rax', 3);
    this.mov('rbx', 2);
    this.shl('rbx', 1);
    this.or('rax', 'rbx');
    this.or('rax', 2);
    this.and('rax', 13);

    this.Return();
  }, 12);
});
