var jit = require('../../jit'),
    util = require('util');

module.exports = Asm;
function Asm(options) {
  jit.BaseAsm.call(this, 'ia32', options);

  // General purpose registers
  this.gp = {
    eax: 0, ecx: 1, edx: 2, ebx: 3,
    esp: 4, ebp: 5, esi: 6, edi: 7
  };

  // XMM
  this.xmm = {
    xmm0: 0, xmm1: 1, xmm2: 2, xmm3: 3,
    xmm4: 4, xmm5: 5, xmm6: 6, xmm7: 7
  };
};
util.inherits(Asm, jit.BaseAsm);

Asm.prototype.getIndex = function getIndex(src) {
  if (this.gp.hasOwnProperty(src)) {
    return this.gp[src];
  } else if (this.xmm.hasOwnProperty(src)) {
    return this.xmm[src];
  } else {
    throw new Error(src + ' not found');
  }
};

// Emit modrm byte
Asm.prototype.modrm = function modrm(src, dst) {
  var mod = 0,
      rm = 0,
      reg = 0,
      payload = 0,
      payloadWidth = 0;

  if (Array.isArray(dst)) {
    assert(dst.length >= 1);

    // [reg]
    if (dst.length === 1) {
      mod = 0;
    } else if (dst.length >= 2) {
      var offset = dst[1];

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
  } else if (dst) {
    // reg
    mod = 3;
    rm = this.getIndex(dst);
  }

  if (src) reg = typeof src === 'string' ? this.getIndex(src) : src;

  this.emitb((mod << 6) | (reg << 3) | rm);

  if (payloadWidth === 1) {
    this.emitb(payload);
  } else if (payloadWidth === 4) {
    this.emitl(payload >>> 0);
  }
};

Asm.prototype.nop = function nop() {
  this.emitb(0x90);
};

Asm.prototype.push = function push(src) {
  if (typeof src === 'string') {
    // push reg
    this.emitb(0x50 | this.getIndex(src));
  } else if (Array.isArray(src)) {
    // push [mem]
    this.emitb(0xff);
    this.modrm(6, src);
  } else {
    if (typeof src === 'number') {
      if (-0x7f >= src && src <= 0x7f) {
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
  }
};

Asm.prototype.pop = function pop(dst) {
  if (typeof dst === 'string') {
    // push reg
    this.emitb(0x58 | this.getIndex(dst));
  } else {
    assert(Array.isArray(dst));
    // push [mem]
    this.emitb(0x8f);
    this.modrm(6, dst);
  }
};

Asm.prototype.movl = function mov(src, dst) {
  if (typeof src === 'string' && typeof dst === 'string') {
    this.emitb(0x89);
    this.modrm(src, dst);
  } else if (typeof src === 'number') {
    this.emitb(0xc7);
    this.modrm(0, dst);
    this.emitl(src);
  } else if (Buffer.isBuffer(src)) {
    this.emitb(0xb8 | this.getIndex(dst));
    this.emitl(src);
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
