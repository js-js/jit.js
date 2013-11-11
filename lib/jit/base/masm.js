var assert = require('assert');
var base = require('../base');
var jit = require('../../jit');
var util = require('util');

module.exports = BaseMasm;

//
// ### function BaseMasm (arch, options)
// #### @arch {String} Underlying architecture (x64, ia32, ...)
// #### @options {Object} **optional** See BaseAsm for details.
// **internal** Base macro assembler constructor
//
function BaseMasm(arch, options) {
  base.BaseAsm.call(this, arch, options);

  this._runtimeStub = '__runtime__';
  this._labels = null;

  // List of functions, each restoring spilled registers
  this._spillRestores = [];

  // Last restore position, used to omit restores insertion
  // right after `this.Return()`
  this._lastSpillRestore = null;

  // Spill free-list and counter
  this._spillCount = null;
  this._freeSpills = null;

  this._init();
};
util.inherits(BaseMasm, base.BaseAsm);

//
// ### function ptr (buf, offset)
// #### @buf {Buffer} Buffer object
// #### @offset {Number} **optional** offset
// Return `Buffer` instance, containing absolute memory address of given `buf`
// with `offset` added to it.
//
BaseMasm.prototype.ptr = function ptr(buf, offset) {
  return jit.ptr(buf, offset);
};

//
// ### function labelScope (fn)
// #### @fn {Function} Label scope's body
// Create new label scope (for named labels) and execute given `fn` in the
// context of it, destroying scope once leaving.
//
BaseMasm.prototype.labelScope = function labelScope(fn) {
  var labels = this._labels;
  this._labels = {};
  fn.call(this);

  // Verify that all labels were bound
  this._verifyLabels();
  this._labels = labels;
};

//
// ### function label (name)
// #### @name {String|Label} **optional** Label name or label
// If name is present - find existing label in label scope or create new, and
// return it.
// Otherwise create label without name.
// If given existing label - just return it.
//
BaseMasm.prototype.label = function label(name) {
  if (!name)
    return new base.Label(this, null);

  // this.label(label)
  if (name instanceof base.Label)
    return name;

  assert(this._labels !== null, 'Can\'t create named label without scope');

  if (this._labels.hasOwnProperty(name)) {
    return this._labels[name];
  } else {
    var label = new base.Label(this, name);
    this._labels[name] = label;
    return label;
  }
};

//
// ### function bind (name)
// #### @name {String|Label} Label name or label
// Bind specified label at current global offset.
//
BaseMasm.prototype.bind = function bind(name) {
  var label = this.label(name);
  label.bind(this._getOffset());
};

//
// ### function Proc (name, body)
// #### @name {String|Label} Label name or label
// #### @body {Function} Procedure context
// Align code, bind given label, write procedure enter instruction sequence,
// and invoke `body`.
// NOTE: `body` should call `this.Return()` in the most of the cases.
//
BaseMasm.prototype.Proc = function Proc(name, body) {
  if (typeof name === 'function') {
    body = name;
    name = null;
  }

  // Save and clear spills
  var spillCount = this._spillCount;
  var freeSpills = this._freeSpills;

  this._spillCount = 0;
  this._freeSpills = [];

  var offset = this._Proc(name, body);

  this._spillCount = spillCount;
  this._freeSpills = freeSpills;

  return offset;
};

//
// #### function spill (count, body)
// ##### @count {Number|String|Array|null} **optional** Register to spill
// ##### @body {Function} **optional** Spill context
// Could be used in various forms and ways:
// 1. `this.spill()` - return a free spill slot that *must* be released using
//    `this.freeSpill(spill)`
// 2. `this.spill(function(slot) {})` - calls `body` with a spill slot and
//    automatically releases it before leaving the `body` and before each
//    `this.Return()` call
// 3. `this.spill(N, function(slot1, slot2, ...) {})` - same as above, but with
//    `N` spill slots (where `N` is a number)
// 4. `this.spill('rax', function() {})` - spill and release automatically
//    specified register.
// 5. `this.spill(['rax', ..], function() {})` - spill and release automatically
//    the set of specified registers.
//
BaseMasm.prototype.spill = function spill(count, body) {
  if (typeof count === 'function') {
    body = count;
    count = null;
  }

  // Shortcut, will automatically release slot after leaving body
  if (typeof body === 'function') {
    // this.spill();
    if (count === null) {
      var slot = this.spill();
      body.call(this, slot);
      this.freeSpill(slot);

    // this.spill(['rax', 'rbx'], function() {})
    } else if (Array.isArray(count)) {
      var self = this;
      var regs = count;
      var spills = null;

      function save() {
        for (var i = 0; i < spills.length; i++)
          self.mov(spills[i], regs[i]);
      }

      function restore() {
        for (var i = 0; i < spills.length; i++)
          self.mov(regs[i], spills[i]);
      }

      this.spill(regs.length, function(slots) {
        spills = slots;
        save();

        // Keep track of all required restores to insert them
        // before `this.Return()`s
        this._spillRestores.push(restore);
        body.call(this, slots.slice());
        this._spillRestores.pop();

        // Optimization, do not insert restores right after `this.Return()`
        if (this._lastSpillRestore !== this._getOffset())
          restore();
      });

    // this.spill('rax', function() {})
    } else if (typeof count === 'string') {
      this.spill([count], body);

    // this.spill(3, function(slots) {})
    } else {
      var slots = [];
      for (var i = 0; i < count; i++)
        slots.push(this.spill());

      body.call(this, slots);

      for (var i = 0; i < count; i++)
        this.freeSpill(slots[i]);
    }
    return;
  }

  assert(this._spillCount !== null && this._freeSpills !== null,
         'Can\'t get spill outside Proc');

  if (this._freeSpills.length > 0)
    return this._freeSpills.pop();

  return this._spill(this._spillCount++);
};

//
// ### function freeSpill (spill)
// #### @spill {Array} Spill slot
// See `this.spill()` above for information.
//
BaseMasm.prototype.freeSpill = function freeSpill(spill) {
  assert(this._spillCount !== null && this._freeSpills !== null,
         'Can\'t free spill outside Proc');
  this._freeSpills.push(spill);
};

//
// ### function stub (dst, name)
//

//
// ### function call (dst, name, ...argv)
// #### @dst {String|Array} General purpose register or memory address to use
//                          as a call target
// #### @name {String} Name of stub
// #### @argv - Stub arguments
// Invoke stub with specified arguments using `dst` for storing `stub` address.
//
BaseMasm.prototype.stub = function stub(dst, name) {
  assert(this.stubs, 'Assembler should be created with `stubs` option');
  var argv = Array.prototype.slice.call(arguments, 2);

  var s = this.stubs.get(name);
  assert.equal(s.argc,
               argv.length,
               'Incorrect number of arguments for stub: ' + name);

  // Retain stub
  this._stubRefs[name] = s;

  // Generate invocation code
  this._stub(dst, s, argv);
};

//
// ### function runtime (fn)
// #### @fn {Function} Runtime function
// Invoke runtime function, returning value in result the register, (usually
// `rax` or `eax`, depending on arch).
//
BaseMasm.prototype.runtime = function runtime(fn) {
  assert(this.stubs, 'Assembler should be created with `stubs` option');

  var binding = new jit.binding.Runtime(fn);
  this._runtimeRefs.push(binding);
  this._runtime(binding);
};

//
// ### function init ()
// **internal** Initialize macro assembler. Define runtime call stub.
//
BaseMasm.prototype._init = function init() {
  if (this.stubs && !this.stubs.has(this._runtimeStub))
    this.stubs.define(this._runtimeStub, this._callRuntime);
};

//
// ### function verifyLabels ()
// **internal** Verify that all labels in scope was bound
//
BaseMasm.prototype._verifyLabels = function verifyLabels() {
  // Verify that all labels were bound
  Object.keys(this._labels).forEach(function(name) {
    var label = this._labels[name];
    assert(label.isBound());
  }, this);
};

//
// ### function restoreSpills ()
// **internal** Restore all stacked spills
//
BaseMasm.prototype._restoreSpills = function restoreSpills() {
  for (var i = this._spillRestores.length - 1; i >= 0; i--)
    this._spillRestores[i]();
};

//
// ### function setLastSpillRestore ()
// **internal** Set last spill restore position right after `this.Return()`.
// Used to avoid restoring spills right after `this.Return()`
//
BaseMasm.prototype._setLastSpillRestore = function setLastSpillRestore() {
  this._lastSpillRestore = this._getOffset();
};

//
// ### function reloc ()
// Create and return new relocation.
//
BaseMasm.prototype._reloc = function reloc() {
  return new base.Relocation(this);
};

// Methods that should be overrided by arch-specific Masm
var override = [
  '_spill', '_Proc', '_stub', '_runtime', '_callRuntime',
  'loadDouble', 'arg'
];

override.forEach(function(name) {
  BaseMasm.prototype[name] = function __override_() {
    throw new Error(name + ' not supported on this arch');
  };
});
