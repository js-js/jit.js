var assert = require('assert');
var x64 = require('./');

var Asm = x64.Asm;

Asm.prototype._shiftOp = function shiftOp(opcode, mode) {
  return function shiftOp(dst, src) {
    assert.equal(typeof dst, 'string');
    assert.equal(typeof src, 'number');
    this.rexw(dst);
    this.emitb(opcode);
    this.modrm(mode, dst);
    this.emitb(src);
  };
};

Asm.prototype.and = Asm.prototype._binop({
  raxImm: 0x25,
  imm: 0x81,
  immByte: 0x83,
  immOpcode: 4,
  mr: 0x21,
  rm: 0x23
});

Asm.prototype.or = Asm.prototype._binop({
  raxImm: 0x0d,
  imm: 0x81,
  immByte: 0x83,
  immOpcode: 1,
  mr: 0x09,
  rm: 0x0b
});

Asm.prototype.xor = Asm.prototype._binop({
  raxImm: 0x35,
  imm: 0x81,
  immByte: 0x83,
  immOpcode: 6,
  mr: 0x31,
  rm: 0x32
});

Asm.prototype.neg = function neg(src) {
  this.rexw(null, src);
  this.emitb(0xf7);
  this.modrm(3, src);
};

Asm.prototype.shl = Asm.prototype._shiftOp(0xc1, 4);
Asm.prototype.shr = Asm.prototype._shiftOp(0xc1, 5);
Asm.prototype.sar = Asm.prototype._shiftOp(0xc1, 7);
