var jit = require('../../');

var common = require('../common'),
    test = common.test,
    Buffer = require('buffer').Buffer;

if (process.arch !== 'x64')
  return;

var buf = new Buffer([7, 6, 5, 4, 3, 2, 1, 0]);

describe('JIT.js x64 Basics', function() {
  test('should compile function with high registers', function() {
    this.xor('r11', 'r11');
    this.push('r11');
    this.mov('r11', 34);
    this.mov('rax', 'r11');
    this.pop('r11');
    this.add('r11', 13);
    this.sub('rax', 'r11');
    this.add('rax', 'rax');

    this.Return();
  }, 42);

  test('should support accesing stack', function() {
    this.spill(function(slot) {
      this.mov(slot, 42);
      this.mov('rax', slot);
    });

    this.Return();
  }, 42);

  test('should support accesing multiple slots', function() {
    this.push('rbx');
    this.spill(2, function(slots) {
      this.mov(slots[0], 42);
      this.mov(slots[1], 23);
      this.mov('rax', slots[0]);
      this.mov('rbx', slots[1]);
    });
    this.pop('rbx');

    this.Return();
  }, 42);

  test('should support this.ptr()', function() {
    this.mov('rax', this.ptr(buf));
    this.mov('rax', ['rax']);
    this.Return();
  }, 0x1020304050607);

  test('should support this.lea() on low', function() {
    this.mov('rax', 0xad);
    this.lea('rax', ['rax', 0xde00]);
    this.Return();
  }, 0xdead);

  test('should support this.lea() on high', function() {
    this.spill('r12', function() {
      this.mov('r12', 0xad);
      this.lea('rax', ['r12', 0xde00]);
    });
    this.Return();
  }, 0xdead);

  test('should support complex this.lea()', function() {
    this.spill('r9', function() {
      this.mov('rax', 0x56);
      this.mov('r9', 0x57);
      this.lea('rax', ['rax', 'r9', 0xde00 ]);
    });
    this.Return();
  }, 0xdead);

  test('should support rip addressing', function() {
    this.mov('rax', [ 'rip', 0x9 ]);
    this.Return();
    this.mov('rax', 42);
  }, 42);

  test('should support movzxb/movzxw', function() {
    this.spill('rbx', function() {
      this.mov('rbx', 0xdeadbeef);
      this.push('rbx');
      this.movzxb('rax', [ 'rsp', 0 ]);
      this.movzxw('rbx', [ 'rsp', 0 ]);
      this.add('rax', 'rbx');
      this.pop('rbx');

      this.Return();
    });
  }, 0xef + 0xbeef);

  test('should support movsxb/movsxw/movsxl', function() {
    this.spill('rbx', function() {
      this.mov('rbx', 0xdeadbeef);
      this.push('rbx');
      this.movsxb('rax', [ 'rsp', 0 ]);
      this.movsxw('rbx', [ 'rsp', 0 ]);
      this.movsxl('rcx', [ 'rsp', 0 ]);
      this.add('rax', 'rbx');
      this.add('rax', 'rcx');
      this.pop('rbx');

      this.Return();
    });
  }, -559055411);

  test('should support movl', function() {
    this.spill('rbx', function() {
      this.mov('rbx', new Buffer('78563412efcdab90', 'hex'));
      this.push('rbx');
      this.mov('rax', 'rbx');
      this.movl('rax', [ 'rsp', 0 ]);
      this.pop('rbx');

      this.Return();
    });
  }, 0x12345678);

  var buf42 = new Buffer(8);
  buf42.fill(0);
  buf42.writeUInt32LE(42, 0);
  test('should receive buffer as argument', function() {
    this.mov('rax', [ 'rdi', 0 ]);
    this.Return();
  }, 42, jit.ptr(buf42));
});
