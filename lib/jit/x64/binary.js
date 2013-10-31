var assert = require('assert');
var x64 = require('./');

var Asm = x64.Asm;

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
