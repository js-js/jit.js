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
  this._relocations = [];

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

BaseAsm.prototype._getOffset = function getOffset() {
  return this._total - this._left;
};

BaseAsm.prototype._writeAt = function writeAt(size, value, offset) {
  // Most common case, write in the same buffer
  if (this._getOffset() >= this._total - this._current.length) {
    var off= this._offset;

    this._offset = offset + this._current.length - this._total;
    this._left += size;

    if (size === 1)
      this.emitb(value);
    else if (size === 2)
      this.emitw(value)
    else if (size === 4)
      this.emitl(value);
    else
      this.emitq(value);

    this._offset = off;
    return;
  }

  var abs = 0;
  for (var i = 0; i < this._buffers.length; i++) {
    var buf = this._buffers[i];

    if (abs >= offset || offset >= abs + buf.len) {
      abs += buf.len;
      continue;
    }

    var current = this._current;
    var left = this._left;
    var off= this._offset;

    this._current = buf;
    this._left = size;
    this._offset = offset - abs;

    if (size === 1)
      this.emitb(value);
    else if (size === 2)
      this.emitw(value)
    else if (size === 4)
      this.emitl(value);
    else
      this.emitq(value);

    this._current = current;
    this._left = left;
    this._offset = off;
  }
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
  if (this._left < 4)
    this._allocate(4);

  if (Buffer.isBuffer(buf)) {
    assert.equal(buf.length, 4);

    buf.copy(this._current, this._offset);
  } else {
    this._current.writeUInt32LE(buf, this._offset, true);
  }
  this._left -= 4;
  this._offset += 4;
};

BaseAsm.prototype.emitq = function emitq(buf) {
  if (Buffer.isBuffer(buf)) {
    if (this._left < 8)
      this._allocate(8);
    assert.equal(buf.length, 8);

    buf.copy(this._current, this._offset);
    this._left -= 8;
    this._offset += 8;
  } else {
    this.emitl((buf >> 32) & 0xffffffff);
    this.emitl(buf & 0xffffffff);
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

BaseAsm.prototype.ptr = function ptr(buf) {
  return jit.binding.getPointer(buf);
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

BaseAsm.prototype.addRelocation = function addRelocation(size, offset, value) {
  this._relocations.push({
    size: size,
    offset: offset,
    value: value
  });
};

BaseAsm.prototype.getRelocations = function getRelocations() {
  return this._relocations.slice();
};
