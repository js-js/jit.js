var x64 = require('./');
var util = require('util');

module.exports = Masm;
function Masm(options) {
  x64.Asm.call(this, options);
};
util.inherits(Masm, x64.Asm);
// Macro methods

Masm.prototype._Proc = function Proc(name, body) {
  // Align code
  while (this._getOffset() % 16 !== 0)
    this.int3();

  // Bind label
  if (name)
    this.bind(name);
  var offset = this._getOffset();
  var reloc = this._reloc();

  this.push('rbp');
  this.mov('rbp', 'rsp');

  this.sub('rsp', 0xdeadbeef);
  reloc.use(4);

  body.call(this);

  var spillCount = this._spillCount * 8;
  if (spillCount % 16 !== 0)
    spillCount += 16 - spillCount % 16;
  reloc.resolve(spillCount);

  return offset;
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

Masm.prototype._stub = function stub(src, stub) {
  var reloc = this._reloc();
  this.mov(src, new Buffer([0xde, 0xad, 0xbe, 0xef, 0xde, 0xad, 0xbe, 0xef]));
  reloc.use(8);
  this.call(src);

  stub.addReloc(reloc);
};
