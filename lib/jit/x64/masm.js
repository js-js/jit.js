var x64 = require('./');
var util = require('util');

module.exports = Masm;
function Masm(options) {
  x64.Asm.call(this, options);
};
util.inherits(Masm, x64.Asm);
// Macro methods

Masm.prototype.Entry = function Entry(slots) {
  this.push('rbp');
  this.movq('rsp', 'rbp');

  if (slots) {
    // TODO(indutny): allocate stack slots
  }
};

Masm.prototype.Exit = function Exit() {
  this.movq('rbp', 'rsp');
  this.pop('rbp');
  this.ret();
};
