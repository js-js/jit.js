var x64 = require('./');
var util = require('util');

module.exports = Masm;
function Masm(options) {
  x64.Asm.call(this, options);
};
util.inherits(Masm, x64.Asm);
// Macro methods

Masm.prototype._Proc = function Proc(body) {
  var reloc = this._reloc();

  this.push('rbp');
  this.mov('rbp', 'rsp');

  this.sub('rsp', 0xdeadbeef);
  reloc.use(4);

  body.call(this);

  reloc.resolve(this._spillCount * 8);
};

Masm.prototype.loadDouble = function loadDouble(dst, val) {
  var imm = new Buffer(8);
  imm.writeDoubleLE(val, 0);
  this.mov(dst, imm);
};

Masm.prototype.Exit = function Exit() {
  this.mov('rsp', 'rbp');
  this.pop('rbp');
  this.ret();
};

Masm.prototype._spill = function _spill(id) {
  return ['rbp', -8 * (id + 1)];
};
