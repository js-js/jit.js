var jit = require('../../');

var common = require('../common'),
    test = common.test,
    Buffer = require('buffer').Buffer;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 System', function() {
  test('should support clflush', function() {
    this.clflush([ 'rsp', 8 ]);

    this.xor('rax', 'rax');
    this.Return();
  }, 0x0);

  test('should support rdtsc', function() {
    this.rdtsc();

    this.xor('rax', 'rax');
    this.Return();
  }, 0x0);
});
