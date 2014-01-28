var x64 = require('./');
var assert = require('assert');
var util = require('util');

module.exports = Masm;

//
// ### function Masm (options)
// #### @options {Object} **optional** See BaseAsm for details.
// X64 Macro Assembler constructor
//
function Masm(options) {
  x64.Asm.call(this, options);
};
util.inherits(Masm, x64.Asm);

// Override methods in BaseMasm

//
// ### function arg (i)
// #### @i {Number} **optional** Argument index
// Get memory cell for specified argument index (or zero)
//
Masm.prototype.arg = function arg(i) {
  return ['rbp', 8 * ((i | 0) + 2)];
};

//
// ### function loadDouble (dst, val)
// #### @dst {String|Array} General purpose register or memory address
// #### @val {Number} Floating point number
// Load raw IEEE754 double number into the register
//
Masm.prototype.loadDouble = function loadDouble(dst, val) {
  var imm = new Buffer(8);
  imm.writeDoubleLE(val, 0);
  this.mov(dst, imm);
};

//
// ### function Return ()
// Emit return instruction sequence and spill restore before it.
//
Masm.prototype.Return = function Return() {
  // If we're inside `this.spill([...], function() {})` -
  // restore all spills before leaving
  this._restoreSpills();

  this.mov('rsp', 'rbp');
  this.pop('rbp');

  // Unroll stack
  var argc = this._currentProc && this._currentProc.argc || 0;
  if (argc % 2 === 1)
    argc++;
  this.ret(argc * 8);

  this._setLastSpillRestore();
};

//
// ### function Proc (name, body)
// #### @name {String|Label} Label name or label
// #### @body {Function} Procedure context
// Platform specific BaseMasm.Proc
//
Masm.prototype._Proc = function Proc(name, body) {
  // Align code
  while (this.getOffset() % 16 !== 0)
    this.int3();

  // Bind label
  if (name)
    this.bind(name);
  var offset = this.getOffset();
  var reloc = this.reloc();

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

//
// ### function spill (i)
// #### @i {Number} Index
// Return spill slot with specified index.
//
Masm.prototype._spill = function _spill(i) {
  return ['rbp', -8 * (i + 1)];
};

//
// ### function stub (src, stub, argv)
// #### @src {String|Array} General purpose register or memory address
// #### @stub {Stub} Stub procedure
// #### @argv {Array} Stub's arguments
// Emit stub call sequence, pushing all stub's arguments on stack
//
Masm.prototype._stub = function stub(src, stub, argv) {
  var reloc = this.reloc();

  // Align stack
  if (argv.length % 2 != 0)
    this.push(this.kZapValue);

  // Push arguments in the reverse order
  for (var i = argv.length - 1; i >= 0; i--)
    this.push(argv[i]);

  // Get stub address
  this.mov(src, new Buffer([0xde, 0xad, 0xbe, 0xef, 0xde, 0xad, 0xbe, 0xef]));
  reloc.use(8);

  // Call stub
  this.call(src);
  stub.use(reloc);
};

//
// ### function runtime (binding, args)
// #### @binding {Runtime} Runtime binding
// #### @args {Array} Arguments
// Invoke runtimeCall stub.
//
Masm.prototype._runtime = function runtime(binding, args) {
  // fn, struct, arg count, padding or arg0
  var usedSlots = 4;

  // fn(struct, ...args)
  if (args && args.length !== 0) {
    assert(args.length <= 4, 'You can supply maximum 4 args on this arch');

    usedSlots += args.length;

    // Either add padding, or remove padding slot
    if (args.length % 2 !== 1)
      this.push(this.kZapValue);
    else
      usedSlots--;

    // Push all arguments in reverse order
    for (var i = args.length - 1; i >= 0; i--)
      this.push(args[i]);

    // Push count of the arguments
    this.push(args.length);
  } else {
    this.push(this.kZapValue);
    this.push(this.kZapValue);
  }

  this.mov('rax', binding.getCallArgument());
  this.push('rax');
  this.mov('rax', binding.getCallAddress());
  this.push('rax');
  this.stub('rax', this._runtimeStub);
  this.add('rsp', (usedSlots * 8));
};

//
// ### function callRuntime ()
// Platform specific runtime stub's body.
//
Masm.prototype._callRuntime = function callRuntime() {
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
  this.mov('rax', this.arg(2));
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
  this.mov('r8', this.arg(6));
  this.bind('3 args');
  this.mov('rcx', this.arg(5));
  this.bind('2 args');
  this.mov('rdx', this.arg(4));
  this.bind('1 arg');
  this.mov('rsi', this.arg(3));
  this.bind('no args');

  // Load struct
  this.mov('rdi', this.arg(1));

  // Here we go in the C++ land
  // fn(struct, arg0, arg1, arg2, arg3)
  this.mov('rax', this.arg(0));
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

  this.Return();
};
