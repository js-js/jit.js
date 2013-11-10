var assert = require('assert');
var base = require('../base');
var jit = require('../../jit');
var util = require('util');

module.exports = BaseMasm;
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

BaseMasm.prototype.ptr = function ptr(buf, offset) {
  return jit.ptr(buf, offset);
};

BaseMasm.prototype.labelScope = function labelScope(fn) {
  var labels = this._labels;
  this._labels = {};
  fn.call(this);
  this._verifyLabels();
  this._labels = labels;
};

BaseMasm.prototype.bind = function bind(name) {
  var label = this._label(name);
  label.bind(this._offset);
};

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

BaseMasm.prototype.freeSpill = function freeSpill(spill) {
  assert(this._spillCount !== null && this._freeSpills !== null,
         'Can\'t free spill outside Proc');
  this._freeSpills.push(spill);
};

BaseMasm.prototype.stub = function stub(src, name) {
  assert(this.stubs, 'Assembler should be created with `stubs` option');
  var argv = Array.prototype.slice.call(arguments, 2);

  var s = this.stubs.get(name);
  assert.equal(s.argc,
               argv.length,
               'Incorrect number of arguments for stub: ' + name);

  // Retain stub
  this._stubRefs[name] = s;

  // Generate invocation code
  this._stub(src, s, argv);
};

BaseMasm.prototype.runtime = function runtime(fn) {
  assert(this.stubs, 'Assembler should be created with `stubs` option');

  var binding = new jit.binding.Runtime(fn);
  this._runtimeRefs.push(binding);
  this._runtime(binding);
};

// Private methods

BaseMasm.prototype._init = function init() {
  if (this.stubs && !this.stubs.has(this._runtimeStub))
    this.stubs.define(this._runtimeStub, this._runtimeCall);
};

BaseMasm.prototype._verifyLabels = function verifyLabels() {
  // Verify that all labels were bound
  Object.keys(this._labels).forEach(function(name) {
    var label = this._labels[name];
    assert(label.isBound());
  }, this);
};

BaseMasm.prototype._label = function label(name) {
  if (this._labels.hasOwnProperty(name)) {
    return this._labels[name];
  } else {
    var label = new base.Label(this, name);
    this._labels[name] = label;
    return label;
  }

};

BaseMasm.prototype._restoreSpills = function restoreSpills() {
  for (var i = this._spillRestores.length - 1; i >= 0; i--)
    this._spillRestores[i]();
};

BaseMasm.prototype._setLastSpillRestore = function setLastSpillRestore() {
  this._lastSpillRestore = this._getOffset();
};

BaseMasm.prototype._reloc = function reloc() {
  return new base.Relocation(this);
};

BaseMasm.prototype._spill = function spill() {
  throw new Error('Not supported on this arch');
};

BaseMasm.prototype._Proc = function Proc() {
  throw new Error('Not supported on this arch');
};

BaseMasm.prototype._stub = function stub() {
  throw new Error('Not supported on this arch');
};

BaseMasm.prototype._runtime = function runtime() {
  throw new Error('Not supported on this arch');
};

BaseMasm.prototype._runtimeCall = function runtimeCall() {
  throw new Error('Not supported on this arch');
};

BaseMasm.prototype.loadDouble = function loadDouble() {
  throw new Error('Not supported on this arch');
};

BaseMasm.prototype.arg = function arg() {
  throw new Error('Not supported on this arch');
};
