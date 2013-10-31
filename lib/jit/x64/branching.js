var assert = require('assert');
var x64 = require('./');

var Asm = x64.Asm;

Asm.prototype.cmp = Asm.prototype._binop({
  raxImm: 0x3d,
  imm: 0x81,
  immByte: 0x83,
  immOpcode: 7,
  mr: 0x39,
  rm: 0x3b
});


var jccOpcodes = {
  a: 0x77, ae: 0x73, b: 0x72, be: 0x76, c: 0x72, cxz: 0xe3,
  e: 0x74, g: 0x7f, ge: 0x7d, l: 0x7c, le: 0x7e, na: 0x76, nae: 0x72,
  nb: 0x73, nbe: 0x77, nc: 0x73, ne: 0x75, ng: 0x7e, nge: 0x7c,
  nl: 0x7d, nle: 0x7f, no: 0x71, np: 0x7b, ns: 0x79, nz: 0x75,
  o: 0x70, p: 0x7a, pe: 0x7a, po: 0x7b, s: 0x78, z: 0x74
};


Asm.prototype.j= function j(cond, name) {
  var label = this._label(name);
  var opcode = jccOpcodes[cond];

  assert(opcode, 'Uknown jump cond: ' + cond);
  this.emitb(opcode);
  label.use(1);
};
