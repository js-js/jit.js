var assert = require('assert');
var jit = require('../../jit');
var util = require('util');

module.exports = Asm;

//
// ### function Asm (options)
// #### @options {Object} **optional** See BaseAsm for details.
// X64 Assembler constructor
//
function Asm(options) {
  jit.BaseMasm.call(this, 'x64', options);

  // General purpose registers
  this.gp = {
    rax: 0, rcx: 1, rdx: 2, rbx: 3,
    rsp: 4, rbp: 5, rsi: 6, rdi: 7,
    r8: 8, r9: 9, r10: 10, r11: 11,
    r12: 12, r13: 13, r14: 14, r15: 15
  };

 // XMM
  this.xmm = {
    xmm0: 0, xmm1: 1, xmm2: 2, xmm3: 3,
    xmm4: 4, xmm5: 5, xmm6: 6, xmm7: 7,
    xmm8: 8, xmm9: 9, xmm10: 10, xmm11: 11,
    xmm12: 12, xmm13: 13, xmm14: 14, xmm15: 15
  };
};
util.inherits(Asm, jit.BaseMasm);

//
// ### function isGp (reg)
// #### @reg {String|Array} Register or memory location
// Check if specified `reg` is a general purpose register or has general
// purpose register base (if memory address).
//
Asm.prototype.isGp = function isGp(reg) {
  if (Array.isArray(reg))
    return this.isGp(reg[0]);
  return this.gp.hasOwnProperty(reg);
};

//
// ### function isXmm (reg)
// #### @reg {String|Array} Register or memory location
// Check if specified `reg` is a xmm register or has xmm register base
// (if memory address).
//
Asm.prototype.isXmm = function isXmm(reg) {
  if (Array.isArray(reg))
    return this.isXmm(reg[0]);
  return this.xmm.hasOwnProperty(reg);
};

//
// ### function getHigh (src, xmmOnly)
// #### @src {String|Array} Register or memory location
// #### @xmmOnly {Boolean} If true - allow only xmm, if false - only gp
// Return high bit of `src`.
//
Asm.prototype.getHigh = function getHigh(src, xmmOnly) {
  // Operand ([reg, offset])
  if (Array.isArray(src)) {
    assert(src.length >= 1);
    return this.getHigh(src[0], xmmOnly);

  // Register ('rax')
  } else if (typeof src === 'string') {
    return (this.getIndex(src, xmmOnly) >> 3) & 1;
  } else {
    throw new Error('getHigh(immediate) is not supported');
  }
};

//
// ### function getLow (src, xmmOnly)
// #### @src {String|Array} Register or memory location
// #### @xmmOnly {Boolean} If true - allow only xmm, if false - only gp
// Return low bits of `src`.
//
Asm.prototype.getLow = function getLow(src, xmmOnly) {
  // Operand ([reg, offset] or [base, index, offset])
  if (Array.isArray(src)) {
    assert(src.length >= 1);
    return this.getLow(src[0], xmmOnly);

  // Register ('rax')
  } else if (typeof src === 'string') {
    return this.getIndex(src, xmmOnly) & 0x7;
  } else {
    throw new Error('getLow(immediate) is not supported');
  }
};

//
// ### function getIndex (src, xmmOnly)
// #### @src {String|Array} Register or memory location
// #### @xmmOnly {Boolean} If true - allow only xmm, if false - only gp
// Return integer representation of `src`.
//
Asm.prototype.getIndex = function getIndex(src, xmmOnly) {
  if (!xmmOnly && this.gp.hasOwnProperty(src))
    return this.gp[src];
  else if (xmmOnly && this.xmm.hasOwnProperty(src))
    return this.xmm[src];
  else
    throw new Error(src + ' not found');
};

//
// ### function rexw (r, rm, rXmmOnly, rmXmmOnly)
// #### @r {String} Register
// #### @rm {String|Array} Register or memory location
// #### @rXmmOnly {Boolean} if true - allow only xmm as `r`, false - only gp
// #### @rmXmmOnly {Boolean} if true - allow only xmm as `rm`, false - only gp
// Emit REX.W prefix for given arguments.
//
Asm.prototype.rexw = function rexw(r, rm, rXmmOnly, rmXmmOnly) {
  // rex.w
  var byte = 0x48;

  // rex.r
  if (r)
    byte |= this.getHigh(r, rXmmOnly) << 2;

  // rex.b
  if (rm)
    byte |= this.getHigh(rm, rmXmmOnly);

  // rex.x
  if (Array.isArray(rm) && rm.length === 3)
    byte |= this.getHigh(rm[1], rmXmmOnly) << 1;

  this.emitb(byte);
};

//
// ### function rexw (r, rm, rXmmOnly, rmXmmOnly)
// #### @r {String} Register
// #### @rm {String|Array} Register or memory location
// #### @rXmmOnly {Boolean} if true - allow only xmm as `r`, false - only gp
// #### @rmXmmOnly {Boolean} if true - allow only xmm as `rm`, false - only gp
// Emit REX.W prefix for given arguments if any of them has high bits.
//
Asm.prototype.optrexw = function optrexw(r, rm, rXmmOnly, rmXmmOnly) {
  if (r && this.getHigh(r, rXmmOnly) || rm && this.getHigh(rm, rmXmmOnly))
    this.rexw(r, rm, rXmmOnly, rmXmmOnly);
};

//
// ### function modrm (r, rm, rXmmOnly, rmXmmOnly)
// #### @r {String} Register
// #### @rm {String|Array} Register or memory location
// #### @rXmmOnly {Boolean} if true - allow only xmm as `r`, false - only gp
// #### @rmXmmOnly {Boolean} if true - allow only xmm as `rm`, false - only gp
// Emit modrm byte for given arguments.
//
Asm.prototype.modrm = function modrm(r, rm, rXmmOnly, rmXmmOnly) {
  var mod = 0,
      payload = 0,
      payloadWidth = 0;

  if (Array.isArray(rm)) {
    assert(rm.length >= 1);

    if (rm.length === 1) {
      // [reg]
      mod = 0;
      assert(rm[0] !== 'rsp' && rm[0] !== 'xmm4' &&
             rm[0] !== 'rbp' && rm[0] !== 'xmm5');

      // [reg, offset] or [base, index, offset]
    } else if (rm.length >= 2) {
      var offset = rm[rm.length - 1];

      assert.equal(typeof offset, 'number');
      if (-0x7f <= offset && offset <= 0x7f) {
        // [reg]+disp8
        mod = 1;
        payload = offset;
        payloadWidth = 1;
      } else {
        // [reg]+disp32
        mod = 2;
        payload = offset;
        payloadWidth = 4;
      }
    }
  } else {
    // reg
    mod = 3;
  }

  if (r)
    if (typeof r === 'string')
      r = this.getLow(r, rXmmOnly);
    else if (typeof r === 'number')
      r = r;
    else
      throw new Error('modrm src should be number or string');

  // [base, offset], [base], or reg
  if (mod === 3 || rm.length < 3) {
    var lowRm = this.getLow(rm, rmXmmOnly);
    this.emitb((mod << 6) | (r << 3) | lowRm);

    // [--][--] addressing, needs SIB byte
    // Use: SS=00 Index=100 Base=lowRm
    if (mod !== 3 && lowRm === 4)
      this.emitb(0x20 | lowRm);

  // [base, index, offset]
  } else {
    // modrm byte
    this.emitb((mod << 6) | (r << 3) | 0x4);

    // SIB byte
    assert(rm[0] !== 'rbp' && rm[0] !== 'xmm5');
    assert(rm[1] !== 'rsp' && rm[1] !== 'xmm4');
    var base = this.getLow(rm[0]);
    var index = this.getLow(rm[1]);
    this.emitb((index << 3) | base);
  }

  if (payloadWidth === 1)
    this.emitb(payload);
  else if (payloadWidth === 4)
    this.emitl(payload >>> 0);
};

//
// ### function nop ()
// Emit `nop` instruction.
//
Asm.prototype.nop = function nop() {
  this.emitb(0x90);
};

//
// ### function int3 ()
// Emit debug break instruction.
//
Asm.prototype.int3 = function int3() {
  this.emitb(0xcc);
};

//
// ### function push (src)
// #### @src {String|Array|Number|Buffer} General purpose register, memory
//                                        location, or number (byte or long)
// Emit `push` instruction.
//
Asm.prototype.push = function push(src) {
  if (typeof src === 'string') {
    // push reg
    this.rexw(null, src);
    this.emitb(0x50 | this.getLow(src));
  } else if (Array.isArray(src)) {
    // push [mem]
    this.rexw(null, src);
    this.emitb(0xff);
    this.modrm(6, src);
  } else if (typeof src === 'number') {
    if (this.isByte(src)) {
      // push imm8
      this.emitb(0x6a);
      this.emitb(src >>> 0);
    } else {
      // push imm32
      this.emitb(0x68);
      this.emitl(src >>> 0);
    }
  } else {
    assert(Buffer.isBuffer(src));
    assert.equal(src.length, 4);
    // push imm32
    this.emitb(0x68);
    this.emitl(src);
  }
};

//
// ### function push (dst)
// #### @dst {String|Array} General purpose register or memory address
// Emit `pop` instruction.
//
Asm.prototype.pop = function pop(dst) {
  if (typeof dst === 'string') {
    // push reg
    this.rexw(null, dst);
    this.emitb(0x58 | this.getLow(dst));
  } else {
    assert(Array.isArray(dst));
    // push [mem]
    this.rexw(null, dst);
    this.emitb(0x8f);
    this.modrm(0, dst);
  }
};

//
// ### function mov (dst, src)
// #### @dst {String|Array} General purpose register or memory address
// #### @src {String|Array|Buffer|Number} General purpose register, memory
//                                        address, long number, or quad buffer
// Emit `mov` instruction, possible combinations:
// * `this.mov(regOrMem, number)`
// * `this.mov(regOrMem, buffer)`
// * `this.mov(regOrMem, reg)`
// * `this.mov(reg, regOrMem)`
//
Asm.prototype.mov = function mov(dst, src) {
  if (typeof src === 'number') {
    this.rexw(null, dst);
    this.emitb(0xc7);
    this.modrm(0, dst);
    this.emitl(src);
  } else if (Buffer.isBuffer(src)) {
    this.rexw(null, dst);
    this.emitb(0xb8 | this.getLow(dst));
    this.emitq(src);
  } else if (typeof src === 'string') {
    this.rexw(src, dst);
    this.emitb(0x89);
    this.modrm(src, dst);
  } else if (typeof dst === 'string') {
    this.rexw(dst, src);
    this.emitb(0x8b);
    this.modrm(dst, src);
  } else {
    throw new Error('mov arguments not supported: (' + src + ', ' + dst + ')');
  }
};

//
// ### function ret (count)
// #### @count {Number} **optional** number of on-stack arguments to discard
// Emit `ret` instruction.
//
Asm.prototype.ret = function ret(count) {
  if (!count) {
    this.emitb(0xc3);
  } else {
    this.emitb(0xc2);
    this.emitw(count);
  }
};

//
// ### function xchg (dst, src)
// #### @dst {Array|String} General purpose register or memory address
// #### @src {Array|String} General purpose register or memory address
// Emit `xchg` instruction, possible variations:
// * `this.xchg(regOrMem, reg)`
// * `this.xchg(reg, regOrMem)`
//
Asm.prototype.xchg = function xchg(dst, src) {
  // Swap arguments
  if (src === 'rax' || Array.isArray(dst))
    return this.xchg(src, dst);

  if (dst === 'rax' && typeof src === 'string') {
    this.rexw(dst, src);
    this.emitb(0x90 | this.getLow(src));
  } else if (typeof src === 'string') {
    this.rexw(src, dst);
    this.emitb(0x87);
    this.modrm(src, dst);
  } else if (typeof dst === 'string') {
    this.rexw(dst, src);
    this.emitb(0x87);
    this.modrm(dst, src);
  }
};

//
// ### function lea (dst, src)
// #### @dst {Array|String} General purpose register or memory address
// #### @src {Array} Memory address
// Emit `lea` instruction, possible variations:
// * `this.lea(reg, regOrMem)`
//
Asm.prototype.lea = function lea(dst, src) {
  assert(Array.isArray(src), 'lea supports only memory source');
  this.rexw(dst, src);
  this.emitb(0x8d);
  this.modrm(dst, src);
};

// Generics

//
// ### function binOp (options)
// #### @options {Object} Instruction's options
// **internal**
// Generate generic binary operation instruction using supplied `options`.
// `options` should contain following properties:
// * `raxImm` - opcode for `this.binop('rax', num)`
// * `imm` - opcode for `this.binop(regOrMem, num)` where `num` is long
// * `immByte` - opcode for `this.binop(regOrMem, num)` where `num` is byte
// * `immMode` - mode for `this.binop(regOrMem, num)`
// * `mr` - opcode for `this.binop(regOrMem, reg)`
// * `rm` - **optional** opcode for `this.binop(reg, regOrMem)`
//
Asm.prototype._binOp = function binOp(options) {
  var raxImm = options.raxImm,
      raxImmByte = options.raxImmByte,
      imm = options.imm,
      immByte = options.immByte,
      immMode = options.immMode,
      mr = options.mr,
      rm = options.rm;

  return function binop(dst, src) {
    if (dst === 'rax' && typeof src === 'number') {
      if (this.isByte(src) && raxImmByte) {
        if (options.binary)
          this.optrexw(null, dst);
        else
          this.rexw(null, dst);
        this.emitb(raxImmByte);
        this.emitb(src);
      } else {
        this.rexw(null, dst);
        this.emitb(raxImm);
        this.emitl(src);
      }
    } else if (typeof src === 'number') {
      if (this.isByte(src)) {
        if (options.binary)
          this.optrexw(null, dst);
        else
          this.rexw(null, dst);
        this.emitb(immByte);
        this.modrm(immMode, dst);
        this.emitb(src);
      } else {
        this.rexw(null, dst);
        this.emitb(imm);
        this.modrm(immMode, dst);
        this.emitl(src);
      }
    } else if (typeof src === 'string') {
      this.rexw(src, dst);
      this.emitb(mr);
      this.modrm(src, dst);
    } else {
      assert(rm, 'Operation doesn\'t support rm mode');
      assert(typeof dst === 'string');
      this.rexw(dst, src);
      this.emitb(rm);
      this.modrm(dst, src);
    }
  };
};

//
// ### function unOp (opcode, mode)
// #### @opcode {Number} Instruction opcode
// #### @mode {Number} Mode
// **internal** Generate generic unary operation instruction.
//
Asm.prototype._unOp = function unOp(opcode, mode) {
  return function unop(src) {
    this.rexw(null, src);
    this.emitb(opcode);
    this.modrm(mode, src);
  };
};
