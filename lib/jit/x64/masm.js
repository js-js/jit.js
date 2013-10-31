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
  this.mov('rbp', 'rsp');

  if (slots)
    this.sub('rsp', 8 * slots);
};

Masm.prototype.Exit = function Exit() {
  this.mov('rsp', 'rbp');
  this.pop('rbp');
  this.ret();
};
