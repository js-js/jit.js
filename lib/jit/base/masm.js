var assert = require('assert');
var base = require('../base');
var jit = require('../../jit');
var util = require('util');

module.exports = BaseMasm;
function BaseMasm(arch, options) {
  base.BaseAsm.call(this, arch, options);

  this._labels = null;
  this._spillCount = null;
  this._freeSpills = null;
};
util.inherits(BaseMasm, base.BaseAsm);

BaseMasm.prototype.ptr = function ptr(buf) {
  return jit.binding.getPointer(buf);
};

BaseMasm.prototype.labelScope = function labelScope(fn) {
  var labels = this._labels;
  this._labels = {};
  fn.call(this);
  this._labels = labels;
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

BaseMasm.prototype.bind = function bind(name) {
  var label = this._label(name);
  label.bind(this._offset);
};

BaseMasm.prototype._reloc = function reloc() {
  return new base.Relocation(this);
};

BaseMasm.prototype.Proc = function Proc(body) {
  // Save and clear spills
  var spillCount = this._spillCount;
  var freeSpills = this._freeSpills;

  this._spillCount = 0;
  this._freeSpills = [];

  this._Proc(body);

  this._spillCount = spillCount;
  this._freeSpills = freeSpills;
};

BaseMasm.prototype.spill = function spill(count, body) {
  if (typeof count === 'function') {
    body = count;
    count = null;
  }

  // Shortcut, will automatically release slot after leaving body
  if (typeof body === 'function') {
    if (count === null) {
      var slot = this.spill();
      body.call(this, slot);
      this.freeSpill(slot);
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
