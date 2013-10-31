var ia32 = require('./');
var util = require('util');

module.exports = Masm;
function Masm(options) {
  ia32.Asm.call(this, options);

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
util.inherits(Masm, ia32.Asm);

Masm.prototype.Entry = function Entry(slots) {
  this.push('ebp');
  this.movl('esp', 'ebp');

  if (slots) {
    // TODO(indutny): allocate stack slots
  }
};

Masm.prototype.Exit = function Exit() {
  this.movl('ebp', 'esp');
  this.pop('ebp');
  this.ret();
};
