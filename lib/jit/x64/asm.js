var assert = require('assert');
var jit = require('../../jit');
var util = require('util');

module.exports = Asm;
function Asm(options) {
  jit.BaseAsm.call(this, 'x64', options);

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
util.inherits(Asm, jit.BaseAsm);

Asm.prototype.isGp = function isGp(reg) {
  if (Array.isArray(reg))
    return this.isGp(reg[0]);
  return this.gp.hasOwnProperty(reg);
};

Asm.prototype.isXmm = function isXmm(reg) {
  if (Array.isArray(reg))
    return this.isXmm(reg[0]);
  return this.xmm.hasOwnProperty(reg);
};

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

Asm.prototype.getLow = function getLow(src, xmmOnly) {
  // Operand ([reg, offset])
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

Asm.prototype.getIndex = function getIndex(src, xmmOnly) {
  if (!xmmOnly && this.gp.hasOwnProperty(src))
    return this.gp[src];
  else if (xmmOnly && this.xmm.hasOwnProperty(src))
    return this.xmm[src];
  else
    throw new Error(src + ' not found');
};

// Emit rex.w prefix
Asm.prototype.rexw = function rexw(r, rm, rXmmOnly, rmXmmOnly) {
  // rex.w
  var byte = 0x48;

  // rex.r
  if (r)
    byte |= this.getHigh(r, rXmmOnly) << 2;

  // rex.b
  if (rm)
    byte |= this.getHigh(rm, rmXmmOnly);

  this.emitb(byte);
};

// Emit rex.w prefix only if operands have high bits
Asm.prototype.optrexw = function optrexw(r, rm, rXmmOnly, rmXmmOnly) {
  if (r && this.getHigh(r, rXmmOnly) || rm && this.getHigh(rm, rmXmmOnly))
    this.rexw(r, rm, rXmmOnly, rmXmmOnly);
};

// Emit modrm byte
Asm.prototype.modrm = function modrm(r, rm, rXmmOnly, rmXmmOnly) {
  var mod = 0,
      payload = 0,
      payloadWidth = 0;

  if (Array.isArray(rm)) {
    assert(rm.length >= 1);

    if (rm.length === 1) {
      // [reg]
      mod = 0;
      assert(rm !== 4 && rm !== 5);
    } else if (rm.length >= 2) {
      var offset = rm[1];

      assert(rm !== 4);
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

  this.emitb((mod << 6) | (r << 3) | this.getLow(rm, rmXmmOnly));

  if (payloadWidth === 1)
    this.emitb(payload);
  else if (payloadWidth === 4)
    this.emitl(payload >>> 0);
};

Asm.prototype.nop = function nop() {
  this.emitb(0x90);
};

Asm.prototype.int3 = function int3() {
  this.emitb(0xcc);
};

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

Asm.prototype.ret = function ret(count) {
  if (!count) {
    this.emitb(0xc3);
  } else {
    this.emitb(0xc2);
    this.emitw(count);
  }
};

Asm.prototype.xchg = function xchg(dst, src) {
  // Swap arguments
  if (src === 'rax' || Array.isArray(dst))
    return this.xchg(src, dst);

  if (dst === 'rax' && typeof src === 'string') {
    this.rexw(dst, src);
    this.emitb(0x90 | this.getLow(src));
  } else {
    this.rexw(src, dst);
    this.emitb(0x87);
    this.modrm(src, dst);
  }
};

// Generics

Asm.prototype._binop = function binop(options) {
  var raxImm = options.raxImm,
      imm = options.imm,
      immByte = options.immByte,
      immOpcode = options.immOpcode,
      mr = options.mr,
      rm = options.rm;

  return function binop(dst, src) {
    if (dst === 'rax' && typeof src === 'number') {
      this.rexw(null, dst);
      this.emitb(raxImm);
      this.emitl(src);
    } else if (typeof src === 'number') {
      this.rexw(null, dst);
      if (this.isByte(src)) {
        this.emitb(immByte);
        this.modrm(immOpcode, dst);
        this.emitb(src);
      } else {
        this.emitb(imm);
        this.modrm(immOpcode, dst);
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

Asm.prototype._unop = function unop(opcode, mode) {
  return function unop(src) {
    this.rexw(null, src);
    this.emitb(opcode);
    this.modrm(mode, src);
  };
};
