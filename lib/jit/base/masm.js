var assert = require('assert');
var base = require('../base');
var jit = require('../../jit');
var util = require('util');

module.exports = BaseMasm;
function BaseMasm(arch, options) {
  base.BaseAsm.call(this, arch, options);

  this._labels = null;
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
