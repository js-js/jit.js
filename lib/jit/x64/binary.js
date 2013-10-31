var assert = require('assert');
var x64 = require('./');

var Asm = x64.Asm;

Asm.prototype.xor = Asm.prototype._binop({
  raxImm: 0x35,
  imm: 0x81,
  immOpcode: 6,
  mr: 0x31,
  rm: 0x32
});
