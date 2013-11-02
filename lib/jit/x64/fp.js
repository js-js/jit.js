var assert = require('assert');
var Buffer = require('buffer').Buffer;
var x64 = require('./');

var Asm = x64.Asm;

Asm.prototype._fpMoveInstruction = function fpMoveInstruction(options) {
  var rmPrefix = options.rm.prefix,
      mrPrefix = options.mr.prefix,
      rmOp1 = options.rm.op1,
      rmOp2 = options.rm.op2,
      mrOp1 = options.mr.op1,
      mrOp2 = options.mr.op2;

  return function instruction(dst, src) {
  };
};

Asm.prototype._fpMathInstruction = function fpMathInstruction(prefix,
                                                              op1,
                                                              op2) {
  return function instruction(dst, src) {
    this.emitb(prefix);
    this.optrexw(dst, src, true, true);
    this.emitb(op1);
    this.emitb(op2);
    this.modrm(dst, src, true, true);
  };
};

// Movement

Asm.prototype.movsd = function movsd(dst, src) {
  this.emitb(0xf2);
  if (typeof src === 'string') {
    this.optrexw(src, dst, true, true);
    this.emitb(0x0f);
    this.emitb(0x10);
    this.modrm(src, dst, true, true);
  } else {
    this.optrexw(dst, src, true, true);
    this.emitb(0x0f);
    this.emitb(0x11);
    this.modrm(dst, src, true, true);
  }
};

Asm.prototype.movq = function movq(dst, src) {
  if (this.isGp(src)) {
    this.emitb(0x66);
    this.rexw(dst, src, true, false);
    this.emitb(0x0f);
    this.emitb(0x6e);
    this.modrm(dst, src, true, false);
  } else if (this.isGp(dst)) {
    this.emitb(0x66);
    this.rexw(src, dst, true, false);
    this.emitb(0x0f);
    this.emitb(0x7e);
    this.modrm(src, dst, true, false);
  } else if (typeof src === 'string') {
    this.emitb(0x66);
    this.optrexw(src, dst, true, true);
    this.emitb(0x0f);
    this.emitb(0xd6);
    this.modrm(src, dst, true, true);
  } else {
    this.emitb(0xf3);
    this.optrexw(dst, src, true, true);
    this.emitb(0x0f);
    this.emitb(0x7e);
    this.modrm(dst, src, true, true);
  }
};

// Math

Asm.prototype.addsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x58);
Asm.prototype.mulsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x59);
Asm.prototype.subsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x5c);
Asm.prototype.divsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x5e);

// Conversion

Asm.prototype.cvtsd2si = function cvtsd2si(dst, src) {
  this.emitb(0xf2);
  this.rexw(dst, src, false, true);
  this.emitb(0x0f);
  this.emitb(0x2d);
  this.modrm(dst, src, false, true);
};

Asm.prototype.cvtsi2sd = function cvtsi2sd(dst, src) {
  this.emitb(0xf2);
  this.rexw(dst, src, true, false);
  this.emitb(0x0f);
  this.emitb(0x2a);
  this.modrm(dst, src, true, false);
};

Asm.prototype.cvttsi2sd = function cvttsi2sd(dst, src) {
  this.emitb(0xf2);
  this.rexw(dst, src, true, false);
  this.emitb(0x0f);
  this.emitb(0x2c);
  this.modrm(dst, src, true, false);
};

var roundMode = {
  nearest: 0,
  down: 1,
  up: 2,
  zero: 3
};

Asm.prototype.roundsd = function cvttsi2sd(mode, dst, src) {
  var modeByte = roundMode[mode];
  assert(modeByte);

  this.emitb(0x66);
  this.optrexw(dst, src, true, true);
  this.emitb(0x0f);
  this.emitb(0x3a);
  this.emitb(0x0b);
  this.modrm(dst, src, true, true);
  this.emitb(modeByte);
};

// Branching

Asm.prototype.ucomisd = function ucomisd(dst, src) {
  this.emitb(0x66);
  this.optrexw(dst, src, true, true);
  this.emitb(0x0f);
  this.emitb(0x2e);
  this.modrm(dst, src, true, true);
};
