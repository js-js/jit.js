var x64 = require('./');
var assert = require('assert');
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

Masm.prototype._runtime = function runtime(binding, args) {
  // fn, struct, arg count, padding or arg0
  var usedSlots = 4;

  // fn(struct, ...args)
  if (args && args.length !== 0) {
    assert(args.length <= 4, 'You can supply maximum 4 args on this arch');

    usedSlots += args.length;

    // Either add padding, or remove padding slot
    if (args.length % 2 !== 1)
      this.push(0);
    else
      usedSlots--;

    // Push all arguments in reverse order
    for (var i = args.length - 1; i >= 0; i--)
      this.push(args[i]);

    // Push count of the arguments
    this.push(args.length);
  } else {
    this.push(0);
    this.push(0);
  }

  this.mov('rax', binding.getCallArgument());
  this.push('rax');
  this.mov('rax', binding.getCallAddress());
  this.push('rax');
  this.stub('rax', this._runtimeStub);
  this.add('rsp', (usedSlots * 8));
};

Masm.prototype._runtimeCall = function runtimeCall() {
  // Push every scratch register
  this.push('rdi');
  this.push('rsi');
  this.push('rcx');
  this.push('rdx');

  this.push('r8');
  this.push('r9');
  this.push('r10');
  this.push('r11');

  // Clean-up args
  this.xor('rsi', 'rsi');
  this.xor('rdx', 'rdx');
  this.xor('rcx', 'rcx');
  this.xor('r8', 'r8');

  // Get count of arguments
  this.mov('rax', ['rbp', 4 * 8]);
  this.cmp('rax', 0);
  this.j('e', 'no args');
  this.cmp('rax', 1);
  this.j('e', '1 arg');
  this.cmp('rax', 2);
  this.j('e', '2 args');
  this.cmp('rax', 3);
  this.j('e', '3 args');
  this.cmp('rax', 4);
  this.j('e', '4 args');
  this.int3();

  // Put each arg in appropriate register
  this.bind('4 args');
  this.mov('r8', ['rbp', 8 * 8]);
  this.bind('3 args');
  this.mov('rcx', ['rbp', 7 * 8]);
  this.bind('2 args');
  this.mov('rdx', ['rbp', 6 * 8]);
  this.bind('1 arg');
  this.mov('rsi', ['rbp', 5 * 8]);
  this.bind('no args');

  // Load struct
  this.mov('rdi', ['rbp', 3 * 8]);

  // Here we go in the C++ land
  // fn(struct, arg0, arg1, arg2, arg3)
  this.mov('rax', ['rbp', 2 * 8]);
  this.call('rax');

  // Restore all scratches
  this.pop('r11');
  this.pop('r10');
  this.pop('r9');
  this.pop('r8');

  this.pop('rdx');
  this.pop('rcx');
  this.pop('rsi');
  this.pop('rdi');

  this.Exit();
};
