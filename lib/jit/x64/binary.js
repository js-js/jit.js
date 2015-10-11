var assert = require('assert');
var x64 = require('./');

var Asm = x64.Asm;

//
// ### function shiftOp (opcode, mode)
// #### @opcode {Number} Instruction opcode
// #### @mode {Number} Mode
// **internal** Generate generic shift operation instruction.
//
Asm.prototype._shiftOp = function shiftOp(opcode, opcodeCl, mode) {
  return function shiftOp(dst, src) {
    assert.equal(typeof dst, 'string');

    this.rexw(null, dst);
    if (src === 'rcx') {
      this.emitb(opcodeCl);
      this.modrm(mode, dst);
    } else {
      assert.equal(typeof src, 'number');
      this.emitb(opcode);
      this.modrm(mode, dst);
      this.emitb(src);
    }
  };
};

// Binary instructions, please look at `_binOp` declaration for details

Asm.prototype.and = Asm.prototype._binOp({
  binary: true,
  raxImm: 0x25,
  raxImmByte: 0x24,
  imm: 0x81,
  immByte: 0x83,
  immMode: 4,
  mr: 0x21,
  rm: 0x23
});

Asm.prototype.or = Asm.prototype._binOp({
  binary: true,
  raxImm: 0x0d,
  raxImmByte: 0x0c,
  imm: 0x81,
  immByte: 0x83,
  immMode: 1,
  mr: 0x09,
  rm: 0x0b
});

Asm.prototype.xor = Asm.prototype._binOp({
  binary: true,
  raxImm: 0x35,
  raxImmByte: 0x34,
  imm: 0x81,
  immByte: 0x83,
  immMode: 6,
  mr: 0x31,
  rm: 0x32
});

//
// ### function neg (src)
// #### @src {Register|Array} General purpose register or memory address
// Negate value in `src` and put it back into `src`
//
Asm.prototype.neg = function neg(src) {
  this.rexw(null, src);
  this.emitb(0xf7);
  this.modrm(3, src);
};

//
// ### function lzcnt (dst, src)
// #### @src {Register|Array} General purpose register or memory address
// Count non-zero leading bits in `src` and put the result to `dst`
//
Asm.prototype.lzcnt = function lzcnt(dst, src) {
  this.emitb(0xf3);
  this.rexw(dst, src);
  this.emitb(0x0f);
  this.emitb(0xbd);
  this.modrm(dst, src);
};

//
// ### function lzcntl (dst, src)
// #### @src {Register|Array} General purpose register or memory address
// Count non-zero leading bits in `src` and put the result to `dst`
//
Asm.prototype.lzcntl = function lzcntl(dst, src) {
  this.emitb(0xf3);
  this.optrex(dst, src);
  this.emitb(0x0f);
  this.emitb(0xbd);
  this.modrm(dst, src);
};

//
// ### function tzcnt (dst, src)
// #### @src {Register|Array} General purpose register or memory address
// Count non-zero leading bits in `src` and put the result to `dst`
//
Asm.prototype.tzcnt = function tzcnt(dst, src) {
  this.emitb(0xf3);
  this.rexw(dst, src);
  this.emitb(0x0f);
  this.emitb(0xbc);
  this.modrm(dst, src);
};

//
// ### function tzcntl (dst, src)
// #### @src {Register|Array} General purpose register or memory address
// Count non-zero leading bits in `src` and put the result to `dst`
//
Asm.prototype.tzcntl = function tzcntl(dst, src) {
  this.emitb(0xf3);
  this.optrex(dst, src);
  this.emitb(0x0f);
  this.emitb(0xbc);
  this.modrm(dst, src);
};

//
// ### function popcnt (dst, src)
// #### @src {Register|Array} General purpose register or memory address
// Count non-zero bits in `src` and put the result to `dst`
//
Asm.prototype.popcnt = function popcnt(dst, src) {
  this.emitb(0xf3);
  this.rexw(dst, src);
  this.emitb(0x0f);
  this.emitb(0xb8);
  this.modrm(dst, src);
};

//
// ### function popcntl (dst, src)
// #### @src {Register|Array} General purpose register or memory address
// Count non-zero bits in `src` and put the result to `dst`
//
Asm.prototype.popcntl = function popcntl(dst, src) {
  this.emitb(0xf3);
  this.optrex(dst, src);
  this.emitb(0x0f);
  this.emitb(0xb8);
  this.modrm(dst, src);
};

// Shift instructions, please look at `_shiftOp` declaration for details

Asm.prototype.shl = Asm.prototype._shiftOp(0xc1, 0xd3, 4);
Asm.prototype.shr = Asm.prototype._shiftOp(0xc1, 0xd3, 5);
Asm.prototype.sar = Asm.prototype._shiftOp(0xc1, 0xd3, 7);
