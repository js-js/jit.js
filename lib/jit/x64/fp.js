var assert = require('assert');
var Buffer = require('buffer').Buffer;
var x64 = require('./');

var Asm = x64.Asm;

//
// ### function fpMathInstruction (prefix, op1, op2)
// #### @prefix {Number} Instruction prefix
// #### @op1 {Number} First part of opcode
// #### @op2 {Number} Second part of opcode
// Generate generic FP math operation
//
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

//
// ### function movsd (dst, src)
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String|Array} Xmm register or memory address
// Emit `movsd` instruction.
// (Moves data between two xmm locations)
//
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

//
// ### function movq (dst, src)
// #### @dst {String|Array} Xmm or GP register or memory address
// #### @src {String|Array} Xmm or GP register or memory address
// Emit `movsd` instruction.
// Possible uses:
// * `this.movq(xmmRegOrAddr, gpReg)`
// * `this.movq(gpRegOrAddress, xmmReg)`
// * `this.movq(gpRegOrAddress, gpReg)`
// * `this.movq(gpReg, gpRegOrAddress)`
//
// TODO(indutny): find out why do we need movsd
//
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
// See `_fpMathInstruction` declaration

Asm.prototype.addsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x58);
Asm.prototype.mulsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x59);
Asm.prototype.subsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x5c);
Asm.prototype.divsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x5e);

// Conversion

//
// ### function cvtsd2si (dst, src)
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String} General purpose register
// Emit `cvtsd2si`.
// Converts double to integer. The value is rounded according to control bits
// in MXCSR.
//
Asm.prototype.cvtsd2si = function cvtsd2si(dst, src) {
  this.emitb(0xf2);
  this.rexw(dst, src, false, true);
  this.emitb(0x0f);
  this.emitb(0x2d);
  this.modrm(dst, src, false, true);
};

//
// ### function cvttsi2sd (dst, src)
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String} General purpose register
// Emit `cvttsd2si`.
// Converts integer to double. The value is rounded towards zero.
//
Asm.prototype.cvttsd2si = function cvttsi2sd(dst, src) {
  this.emitb(0xf2);
  this.rexw(dst, src, true, false);
  this.emitb(0x0f);
  this.emitb(0x2c);
  this.modrm(dst, src, true, false);
};

//
// ### function cvtsi2sd (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvtsi2sd`.
// Converts integer to double.
//
Asm.prototype.cvtsi2sd = function cvtsi2sd(dst, src) {
  this.emitb(0xf2);
  this.rexw(dst, src, true, false);
  this.emitb(0x0f);
  this.emitb(0x2a);
  this.modrm(dst, src, true, false);
};

var roundMode = {
  nearest: 0,
  down: 1,
  up: 2,
  zero: 3
};

//
// ### function roundsd (mode, dst, src)
// #### @mode {String} Round mode (see struct above)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `roundsd` instruction.
// Rounds double number in `src` and puts result into the `dst`.
//
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

//
// ### function ucomisd (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `ucomisd` instruction.
// Compare two xmm values and set flags.
//
Asm.prototype.ucomisd = function ucomisd(dst, src) {
  this.emitb(0x66);
  this.optrexw(dst, src, true, true);
  this.emitb(0x0f);
  this.emitb(0x2e);
  this.modrm(dst, src, true, true);
};
