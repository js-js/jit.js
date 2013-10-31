var assert = require('assert');
var x64 = require('./');

var Asm = x64.Asm;

Asm.prototype.add = Asm.prototype._binop({
  raxImm: 0x05,
  imm: 0x81,
  immOpcode: 0,
  mr: 0x01,
  rm: 0x03
});

Asm.prototype.sub = Asm.prototype._binop({
  raxImm: 0x2d,
  imm: 0x81,
  immOpcode: 5,
  mr: 0x29,
  rm: 0x2a
});

Asm.prototype.imul = function imul(src) {
  this.rexw(null, src);
  this.emitb(0xf7);
  this.modrm(5, src);
};

Asm.prototype.idiv = function imul(src) {
  this.rexw(null, src);
  this.emitb(0xf7);
  this.modrm(7, src);
};
