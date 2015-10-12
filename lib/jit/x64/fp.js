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
    this.optrexw(dst, src, true, !Array.isArray(src));
    this.emitb(op1);
    this.emitb(op2);
    this.modrm(dst, src, true, !Array.isArray(src));
  };
};

// Movement

//
// ### function movsd (size, dst, src)
// #### @size {Number} Either 32 or 64
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String|Array} Xmm register or memory address
// Emit `movsd`/`movss` instruction.
// (Moves data between two xmm locations)
//
Asm.prototype._movsd = function _movsd(size, dst, src) {
  this.emitb(size === 64 ? 0xf2 : 0xf3);
  if (Array.isArray(dst)) {
    this.optrexw(src, dst, true, false);
    this.emitb(0x0f);
    this.emitb(0x11);
    this.modrm(src, dst, true, false);
  } else if (Array.isArray(src)) {
    this.optrexw(dst, src, true, false);
    this.emitb(0x0f);
    this.emitb(0x10);
    this.modrm(dst, src, true, false);
  } else {
    this.optrexw(src, dst, true, true);
    this.emitb(0x0f);
    this.emitb(0x11);
    this.modrm(src, dst, true, true);
  }
};

//
// ### function movsd (dst, src)
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String|Array} Xmm register or memory address
// Emit `movsd` instruction.
// (Moves data between two xmm locations)
//
Asm.prototype.movsd = function movsd(dst, src) {
  return this._movsd(64, dst, src);
};

//
// ### function movss (dst, src)
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String|Array} Xmm register or memory address
// Emit `movss` instruction.
// (Moves data between two xmm locations)
//
Asm.prototype.movss = function movss(dst, src) {
  return this._movsd(32, dst, src);
};

//
// ### function _movq (size, dst, src)
// #### @size {Number} Either 32 or 64
// #### @dst {String|Array} Xmm or GP register or memory address
// #### @src {String|Array} Xmm or GP register or memory address
// Emit `movq`/`movd` instruction.
//
Asm.prototype._movq = function _movq(size, dst, src) {
  if (this.isGp(src)) {
    this.emitb(0x66);
    this.rex(size, dst, src, true, false);
    this.emitb(0x0f);
    this.emitb(0x6e);
    this.modrm(dst, src, true, false);
  } else if (this.isGp(dst)) {
    this.emitb(0x66);
    this.rex(size, src, dst, true, false);
    this.emitb(0x0f);
    this.emitb(0x7e);
    this.modrm(src, dst, true, false);
  } else if (typeof src === 'string') {
    this.emitb(0x66);
    this.optrex(size, src, dst, true, true);
    this.emitb(0x0f);
    this.emitb(0xd6);
    this.modrm(src, dst, true, true);
  } else {
    this.emitb(0xf3);
    this.optrex(size, dst, src, true, true);
    this.emitb(0x0f);
    this.emitb(0x7e);
    this.modrm(dst, src, true, true);
  }
};

//
// ### function movq (dst, src)
// #### @dst {String|Array} Xmm or GP register or memory address
// #### @src {String|Array} Xmm or GP register or memory address
// Emit `movq` instruction.
// Possible uses:
// * `this.movq(xmmRegOrAddr, gpReg)`
// * `this.movq(gpRegOrAddress, xmmReg)`
// * `this.movq(gpRegOrAddress, gpReg)`
// * `this.movq(gpReg, gpRegOrAddress)`
//
Asm.prototype.movq = function movq(dst, src) {
  this._movq(64, dst, src);
};

//
// ### function movd (dst, src)
// #### @dst {String|Array} Xmm or GP register or memory address
// #### @src {String|Array} Xmm or GP register or memory address
// Emit `movd` instruction.
// Possible uses:
// * `this.movd(xmmRegOrAddr, gpReg)`
// * `this.movd(gpRegOrAddress, xmmReg)`
// * `this.movd(gpRegOrAddress, gpReg)`
// * `this.movd(gpReg, gpRegOrAddress)`
//
Asm.prototype.movd = function movd(dst, src) {
  this._movq(32, dst, src);
};

// Math
// See `_fpMathInstruction` declaration

Asm.prototype.addsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x58);
Asm.prototype.mulsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x59);
Asm.prototype.subsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x5c);
Asm.prototype.divsd = Asm.prototype._fpMathInstruction(0xf2, 0x0f, 0x5e);

Asm.prototype.addss = Asm.prototype._fpMathInstruction(0xf3, 0x0f, 0x58);
Asm.prototype.mulss = Asm.prototype._fpMathInstruction(0xf3, 0x0f, 0x59);
Asm.prototype.subss = Asm.prototype._fpMathInstruction(0xf3, 0x0f, 0x5c);
Asm.prototype.divss = Asm.prototype._fpMathInstruction(0xf3, 0x0f, 0x5e);

// Conversion

//
// ### function _cvtsd2si (dstSize, srcSize, dst, src)
// #### @dstSize {Number} Either 32 or 64
// #### @srcSize {Number} Either 32 or 64
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvtsd2si`/`cvtss2si`.
// Converts double to integer. The value is rounded according to control bits
// in MXCSR.
//
Asm.prototype._cvtsd2si = function _cvtsd2si(dstSize, srcSize, dst, src) {
  this.emitb(srcSize === 64 ? 0xf2 : 0xf3);
  this.rex(dstSize, dst, src, false, !Array.isArray(src));
  this.emitb(0x0f);
  this.emitb(0x2d);
  this.modrm(dst, src, false, !Array.isArray(src));
};

//
// ### function cvtsd2si (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvtsd2si`.
// Converts double to integer. The value is rounded according to control bits
// in MXCSR.
//
Asm.prototype.cvtsd2si = function cvtsd2si(dst, src) {
  return this._cvtsd2si(64, 64, dst, src);
};

//
// ### function cvtss2si (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvtss2si`.
// Converts float to integer. The value is rounded according to control bits
// in MXCSR.
//
Asm.prototype.cvtss2si = function cvtss2si(dst, src) {
  return this._cvtsd2si(64, 32, dst, src);
};

//
// ### function cvtsd2sil (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvtsd2sil`.
// Converts double to integer. The value is rounded according to control bits
// in MXCSR.
//
Asm.prototype.cvtsd2sil = function cvtsd2sil(dst, src) {
  return this._cvtsd2si(32, 64, dst, src);
};

//
// ### function cvtss2sil (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvtss2sil`.
// Converts float to integer. The value is rounded according to control bits
// in MXCSR.
//
Asm.prototype.cvtss2sil = function cvtss2sil(dst, src) {
  return this._cvtsd2si(32, 32, dst, src);
};

//
// ### function _cvttsi2sd (dstSize, srcSize, dst, src)
// #### @dstSize {Number} Either 32 or 64
// #### @srcSize {Number} Either 32 or 64
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvttsd2si`/`cvttss2si`.
// Converts double to integer. The value is rounded towards zero.
//
Asm.prototype._cvttsd2si = function _cvttsi2sd(dstSize, srcSize, dst, src) {
  this.emitb(srcSize === 64 ? 0xf2 : 0xf3);
  this.rex(dstSize, dst, src, false, !Array.isArray(src));
  this.emitb(0x0f);
  this.emitb(0x2c);
  this.modrm(dst, src, false, !Array.isArray(src));
};

//
// ### function cvttsd2si (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvttsd2si`.
// Converts double to integer. The value is rounded towards zero.
//
Asm.prototype.cvttsd2si = function cvttsd2si(dst, src) {
  this._cvttsd2si(64, 64, dst, src);
};

//
// ### function cvttss2si (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvttss2si`.
// Converts float to integer. The value is rounded towards zero.
//
Asm.prototype.cvttss2si = function cvttss2si(dst, src) {
  this._cvttsd2si(64, 32, dst, src);
};

//
// ### function cvttsd2sil (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvttsd2sil`.
// Converts double to integer. The value is rounded towards zero.
//
Asm.prototype.cvttsd2sil = function cvttsd2sil(dst, src) {
  this._cvttsd2si(32, 64, dst, src);
};

//
// ### function cvttss2sil (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String} Xmm register
// Emit `cvttss2sil`.
// Converts float to integer. The value is rounded towards zero.
//
Asm.prototype.cvttss2sil = function cvttss2sil(dst, src) {
  this._cvttsd2si(32, 32, dst, src);
};

//
// ### function _cvtsi2sd (dstSize, srcSize, dst, src)
// #### @dstSize {Number} Either 32 or 64
// #### @srcSize {Number} Either 32 or 64
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String} General purpose register
// Emit `cvtsi2sd`/`cvtsi2ss`.
// Converts integer to double.
//
Asm.prototype._cvtsi2sd = function _cvtsi2sd(dstSize, srcSize, dst, src) {
  this.emitb(srcSize === 64 ? 0xf2 : 0xf3);
  this.rex(dstSize, dst, src, true, false);
  this.emitb(0x0f);
  this.emitb(0x2a);
  this.modrm(dst, src, true, false);
};

//
// ### function cvtsi2sd (dst, src)
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String} General purpose register
// Emit `cvtsi2sd`.
// Converts integer to double.
//
Asm.prototype.cvtsi2sd = function cvtsi2sd(dst, src) {
  return this._cvtsi2sd(64, 64, dst, src);
};

//
// ### function cvtsi2ss (dst, src)
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String} General purpose register
// Emit `cvtsi2ss`.
// Converts integer to float.
//
Asm.prototype.cvtsi2ss = function cvtsi2ss(dst, src) {
  return this._cvtsi2sd(64, 32, dst, src);
};

//
// ### function cvtsi2sdl (dst, src)
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String} General purpose register
// Emit `cvtsi2sdl`.
// Converts integer to double.
//
Asm.prototype.cvtsi2sdl = function cvtsi2sdl(dst, src) {
  return this._cvtsi2sd(32, 64, dst, src);
};

//
// ### function cvtsi2ssl (dst, src)
// #### @dst {String|Array} Xmm register or memory address
// #### @src {String} General purpose register
// Emit `cvtsi2ssl`.
// Converts integer to float.
//
Asm.prototype.cvtsi2ssl = function cvtsi2ssl(dst, src) {
  return this._cvtsi2sd(32, 32, dst, src);
};

var roundMode = {
  nearest: 0,
  down: 1,
  up: 2,
  zero: 3
};

//
// ### function _roundsd (size, mode, dst, src)
// #### @size {Number} Either 32 or 64
// #### @mode {String} Round mode (see struct above)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `roundsd`/`roundss` instruction.
// Rounds double number in `src` and puts result into the `dst`.
//
Asm.prototype._roundsd = function _roundsd(size, mode, dst, src) {
  var modeByte = roundMode[mode];
  assert(modeByte !== undefined);

  this.emitb(0x66);
  this.optrexw(dst, src, true, true);
  this.emitb(0x0f);
  this.emitb(0x3a);
  this.emitb(size === 64 ? 0x0b : 0x0a);
  this.modrm(dst, src, true, true);
  this.emitb(modeByte);
};

//
// ### function roundsd (mode, dst, src)
// #### @mode {String} Round mode (see struct above)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `roundsd` instruction.
// Rounds double number in `src` and puts result into the `dst`.
//
Asm.prototype.roundsd = function roundsd(mode, dst, src) {
  this._roundsd(64, mode, dst, src);
};

//
// ### function roundss (mode, dst, src)
// #### @mode {String} Round mode (see struct above)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `roundss` instruction.
// Rounds float number in `src` and puts result into the `dst`.
//
Asm.prototype.roundss = function roundss(mode, dst, src) {
  this._roundsd(32, mode, dst, src);
};

//
// ### function _sqrtsd (size, dst, src)
// #### @size {Number} Either 32 or 64
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `sqrtsd`/`sqrtss` instruction.
// Cmputes square root of number in `src` and puts result into the `dst`.
//
Asm.prototype._sqrtsd = function _sqrtsd(size, dst, src) {
  this.optrex(size, dst, src, true, true);
  this.emitb(size === 64 ? 0xf2 : 0xf3);
  this.emitb(0x0f);
  this.emitb(0x51);
  this.modrm(dst, src, true, true);
};

//
// ### function sqrtsd (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `sqrtsd` instruction.
// Cmputes square root of number in `src` and puts result into the `dst`.
//
Asm.prototype.sqrtsd = function sqrtsd(dst, src) {
  this._sqrtsd(64, dst, src);
};

//
// ### function sqrtss (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `sqrtss` instruction.
// Cmputes square root of number in `src` and puts result into the `dst`.
//
Asm.prototype.sqrtss = function sqrtss(dst, src) {
  this._sqrtsd(32, dst, src);
};

//
// ### function _maxsd (size, dst, src)
// #### @size {Number} Either 32 or 64
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `maxsd`/`maxss` instruction.
// Cmputes square root of number in `src` and puts result into the `dst`.
//
Asm.prototype._maxsd = function _maxsd(size, dst, src) {
  this.optrex(size, dst, src, true, true);
  this.emitb(size === 64 ? 0xf2 : 0xf3);
  this.emitb(0x0f);
  this.emitb(0x5f);
  this.modrm(dst, src, true, true);
};

//
// ### function maxsd (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `maxsd` instruction.
// Cmputes square root of number in `src` and puts result into the `dst`.
//
Asm.prototype.maxsd = function maxsd(dst, src) {
  this._maxsd(64, dst, src);
};

//
// ### function maxss (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `maxss` instruction.
// Cmputes square root of number in `src` and puts result into the `dst`.
//
Asm.prototype.maxss = function maxss(dst, src) {
  this._maxsd(32, dst, src);
};

//
// ### function _minsd (size, dst, src)
// #### @size {Number} Either 32 or 64
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `minsd`/`minss` instruction.
// Cmputes square root of number in `src` and puts result into the `dst`.
//
Asm.prototype._minsd = function _minsd(size, dst, src) {
  this.optrex(size, dst, src, true, true);
  this.emitb(size === 64 ? 0xf2 : 0xf3);
  this.emitb(0x0f);
  this.emitb(0x5d);
  this.modrm(dst, src, true, true);
};

//
// ### function minsd (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `minsd` instruction.
// Cmputes square root of number in `src` and puts result into the `dst`.
//
Asm.prototype.minsd = function minsd(dst, src) {
  this._minsd(64, dst, src);
};

//
// ### function minss (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `minss` instruction.
// Cmputes square root of number in `src` and puts result into the `dst`.
//
Asm.prototype.minss = function minss(dst, src) {
  this._minsd(32, dst, src);
};

// Branching

//
// ### function ucomisd (size, dst, src)
// #### @size {Number} Either 32 or 64
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `ucomisd`/`ucomiss` instruction.
// Compare two xmm values and set flags.
//
Asm.prototype._ucomisd = function _ucomisd(size, dst, src) {
  if (size === 64)
    this.emitb(0x66);
  this.optrexw(dst, src, true, !Array.isArray(src));
  this.emitb(0x0f);
  this.emitb(0x2e);
  this.modrm(dst, src, true, !Array.isArray(src));
};

//
// ### function ucomisd (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `ucomisd` instruction.
// Compare two xmm values and set flags.
//
Asm.prototype.ucomisd = function ucomisd(dst, src) {
  this._ucomisd(64, dst, src);
};

//
// ### function ucomiss (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `ucomiss` instruction.
// Compare two xmm values and set flags.
//
Asm.prototype.ucomiss = function ucomiss(dst, src) {
  this._ucomisd(32, dst, src);
};

//
// ### function pcmpeqd (dst, src)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Emit `pcmpeqd` instruction.
// Compare packed doublewords in `dst` and `src`, and set `dst` to all `1` or
// `0` bits, depending on the result.
//
Asm.prototype.pcmpeqd = Asm.prototype._fpMathInstruction(0x66, 0x0f, 0x76);

//
// ### function psrlq (dst, shift)
// #### @dst {String} Xmm register
// #### @shift {Number} Immediate value
// Emit `psrlq` instruction.
// Shift bits right.
//
Asm.prototype.psrlq = function psrlq(dst, shift) {
  this.emitb(0x66);
  this.optrex(64, null, dst, true, true);
  this.emitb(0x0f);
  this.emitb(0x73);
  this.modrm(2, dst, true, true);
  this.emitb(shift);
};

//
// ### function psllq (dst, shift)
// #### @dst {String} Xmm register
// #### @shift {Number} Immediate value
// Emit `psllq` instruction.
// Shift bits left.
//
Asm.prototype.psllq = function psllq(dst, shift) {
  this.emitb(0x66);
  this.optrex(64, null, dst, true, true);
  this.emitb(0x0f);
  this.emitb(0x73);
  this.modrm(6, dst, true, true);
  this.emitb(shift);
};

//
// ### function xorpd (dst, left, right)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Bit-wise exclusive-or
//
Asm.prototype.xorpd = Asm.prototype._fpMathInstruction(0x66, 0x0f, 0x57);

//
// ### function andpd (dst, left, right)
// #### @dst {String} Xmm register
// #### @src {String|Array} Xmm register or memory address
// Bit-wise and
//
Asm.prototype.andpd = Asm.prototype._fpMathInstruction(0x66, 0x0f, 0x54);
