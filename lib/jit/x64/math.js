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
  rm: 0x2b
});

// Unary instructions, please look at `_unOp` declaration for details

Asm.prototype.inc = Asm.prototype._unOp(0xff, 0);
Asm.prototype.dec = Asm.prototype._unOp(0xff, 1);
Asm.prototype.mul = Asm.prototype._unOp(0xf7, 4);
Asm.prototype.imul = Asm.prototype._unOp(0xf7, 5);
Asm.prototype.div = Asm.prototype._unOp(0xf7, 6);
Asm.prototype.idiv = Asm.prototype._unOp(0xf7, 7);
Asm.prototype.divl = Asm.prototype._unOp(0xf7, 6, 32);
Asm.prototype.idivl = Asm.prototype._unOp(0xf7, 7, 32);

//
// ### function imul (dst, src, imm)
// #### @dst {String} General purpose register or memory address
// #### @src {Array|String} **optional** General purpose register or
// ####                     memory address
// #### @imm {Number} **optional** immediate value
// Emit `imul` instruction, possible variations:
// * `this.imul(reg, regOrMem, imm)`
// * `this.imul(reg, regOrMem)`
// * `this.imul(regOrMem)`
//
Asm.prototype.imul = function imul(dst, src, imm) {
  if (!src) {
    src = dst;
    dst = 'rax';
  }

  if (imm) {
    this.rexw(dst, src);
    if (-0x7f <= imm && imm <= 0x7f) {
      this.emitb(0x6b);
      this.modrm(dst, src);
      this.emitb(imm);
    } else {
      this.emitb(0x69);
      this.modrm(dst, src);
      this.emitl(imm >>> 0);
    }
  } else if (dst === 'rax') {
    this.rexw(null, src);
    this.emitb(0xf7);
    this.modrm(5, src);
  } else {
    this.rexw(dst, src);
    this.emitb(0x0f);
    this.emitb(0xaf);
    this.modrm(dst, src);
  }
};

//
// ### function cdq ()
// Sign-extend eax to edx:eax
//
Asm.prototype.cdq = function cdq() {
  this.emitb(0x99);
};

//
// ### function cqo ()
// Sign-extend rax to rdx:rax
//
Asm.prototype.cqo = function cqo() {
  this.rexw(null, null);
  this.emitb(0x99);
};
