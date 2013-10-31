var assert = require('assert');
var Buffer = require('buffer').Buffer;
var jit = require('../jit');

module.exports = BaseAsm;
function BaseAsm(arch, options) {
  this.arch = arch;
  this.options = options;

  this._labels = null;
  this._current = null;
  this._left = 0;
  this._offset = 0;
  this._total = 0;
  this._buffers = [];

  this._allocate();
};

BaseAsm.prototype._allocate = function allocate(n) {
  if (this._current)
    this._buffers.push(this._current.slice(0, this._offset));

  this._offset = 0;
  this._left = Math.max(n || 0, 4096);
  this._total += this._left;
  this._current = new Buffer(this._left);
};

BaseAsm.prototype.emitb = function emitb(byte) {
  if (this._left < 1)
    this._allocate(1);
  this._current[this._offset] = byte & 0xff;

  this._left--;
  this._offset++;
};

BaseAsm.prototype.emitw = function emitw(word) {
  if (this._left < 2)
    this._allocate(2);
  this._current.writeUInt16LE(word, this._offset, true);

  this._left -= 2;
  this._offset += 2;
};

BaseAsm.prototype.emitl = function emitl(buf) {
  if (Buffer.isBuffer(buf)) {
    assert.equal(buf.length, 4);
    this.emitw(((buf[2] & 0xff) << 8) | (buf[3] & 0xff));
    this.emitw(((buf[0] & 0xff) << 8) | (buf[1] & 0xff));
  } else {
    if (this._left < 4)
      this._allocate(4);
    this._current.writeUInt32LE(buf, this._offset, true);
    this._left -= 4;
    this._offset += 4;
  }
};

BaseAsm.prototype.emitq = function emitq(buf) {
  if (Buffer.isBuffer(buf)) {
    assert.equal(buf.length, 8);
    this.emitl(buf.slice(4, 8));
    this.emitl(buf.slice(0, 4));
  } else {
    this.emitl(buf & 0xffffffff);
    this.emitl((buf >> 32) & 0xffffffff);
  }
};

BaseAsm.prototype.toBuffer = function toBuffer() {
  var total = this._total - this._current.length + this._offset;
  return Buffer.concat(this._buffers.concat(this._current), total);
};

BaseAsm.prototype.isByte = function isByte(num) {
  return -0x7f <= num && num <= 0x7f;
};

BaseAsm.prototype.isWord = function isWord(num) {
  return -0x7fff <= num && num <= 0x7fff;
};

BaseAsm.prototype.isLong = function isLong(num) {
  return -0x7fffffff <= num && num <= 0x7fffffff;
};

BaseAsm.prototype.labelScope = function labelScope(fn) {
  var labels = this._labels;
  this._labels = {};
  fn.call(this);
  this._labels = labels;
};

BaseAsm.prototype._label = function label(name) {
  if (this._labels.hasOwnProperty(name)) {
    return this._labels[name];
  } else {
    var label = new jit.Label(this, name);
    this._labels[name] = label;
    return label;
  }

};

BaseAsm.prototype.bind = function bind(name) {
  var label = this._label(name);
  label.bind(this._offset);
};

BaseAsm.prototype.getRelocation = function getRelocation() {
  return [];
};
