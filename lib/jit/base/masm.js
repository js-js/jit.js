var assert = require('assert');
var base = require('../base');
var jit = require('../../jit');
var util = require('util');

module.exports = BaseMasm;
function BaseMasm(arch, options) {
  base.BaseAsm.call(this, arch, options);

  this._runtimeStub = '__runtime__';
  this._labels = null;
  this._spillCount = null;
  this._freeSpills = null;

  this._init();
};
util.inherits(BaseMasm, base.BaseAsm);

BaseMasm.prototype.ptr = function ptr(buf, offset) {
  return jit.binding.getPointer(buf, offset);
};

BaseMasm.prototype.labelScope = function labelScope(fn) {
  var labels = this._labels;
  this._labels = {};
  fn.call(this);
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
      var regs = count;
      this.spill(regs.length, function(slots) {
        for (var i = 0; i < slots.length; i++)
          this.mov(slots[i], regs[i]);
        body.call(this);
        for (var i = 0; i < slots.length; i++)
          this.mov(regs[i], slots[i]);
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

  var s = this.stubs.get(name);
  this._stubRefs[name] = s;
  this._stub(src, s);
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

BaseMasm.prototype._label = function label(name) {
  if (this._labels.hasOwnProperty(name)) {
    return this._labels[name];
  } else {
    var label = new base.Label(this, name);
    this._labels[name] = label;
    return label;
  }

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
