var assert = require('assert');
var x64 = require('./');

var Asm = x64.Asm;

// Binary instructions, please look at `_binOp` declaration for details

Asm.prototype.add = Asm.prototype._binOp({
  raxImm: 0x05,
  imm: 0x81,
  immByte: 0x83,
  immMode: 0,
  mr: 0x01,
  rm: 0x03
});

Asm.prototype.sub = Asm.prototype._binOp({
  raxImm: 0x2d,
  imm: 0x81,
  immByte: 0x83,
  immMode: 5,
  mr: 0x29,
  rm: 0x2a
});

// Unary instructions, please look at `_unOp` declaration for details

Asm.prototype.inc = Asm.prototype._unOp(0xff, 0);
Asm.prototype.dec = Asm.prototype._unOp(0xff, 1);
Asm.prototype.mul = Asm.prototype._unOp(0xf7, 4);
Asm.prototype.imul = Asm.prototype._unOp(0xf7, 5);
Asm.prototype.div = Asm.prototype._unOp(0xf7, 6);
Asm.prototype.idiv = Asm.prototype._unOp(0xf7, 7);
