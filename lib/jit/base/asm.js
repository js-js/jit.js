var assert = require('assert');
var Buffer = require('buffer').Buffer;

module.exports = BaseAsm;

//
// ### function BaseAsm (arch, options)
// #### @arch {String} Underlying architecture (x64, ia32, ...)
// #### @options {Object} **optional** Assembler options. Possible fields:
//                        * `stubs` - a `jit.stubs()` return value
// **internal** Base assembler constructor
//
function BaseAsm(arch, options) {
  this.arch = arch;
  this.options = options || {};
  this.stubs = options.stubs;

  this._current = null;
  this._left = 0;
  this._offset = 0;
  this._total = 0;
  this._buffers = [];
  this._relocations = [];

  // To keep them referenced
  this._stubRefs = {};
  this._runtimeRefs = [];

  this._reserve();
};

//
// ### function reserve (n)
// #### @n {Number} **optional** Number of bytes to reserve
// **internal** Reserve space in internal buffer for the future writes
//
BaseAsm.prototype._reserve = function reserve(n) {
  // Already have enough space - ignore call
  if (this._left >= n && n)
    return;

  // If we already had one buffer - push it in the list
  if (this._current)
    this._buffers.push(this._current.slice(0, this._offset));

  // Create new buffer
  this._offset = 0;
  this._left = Math.max(n | 0, 4096);
  this._total += this._left;
  this._current = new Buffer(this._left);
};

//
// ### function getOffset ()
// Return global offset including length of all blocks in `_buffers`.
//
BaseAsm.prototype._getOffset = function getOffset() {
  return this._total - this._left;
};

//
// ### function writeAt (size, value, offset)
// #### @size {Number} Size of write: 1, 2, 4 or 8
// #### @value {Number|Buffer} Value to write (must fit into block of `size`)
// #### @offset {Number} Global offset to write at (most likely result of
//                       the `getOffset()` call)
// **internal** Write specified `value` at specified `offset`.
//
BaseAsm.prototype._writeAt = function writeAt(size, value, offset) {
  // Most common case, write in the same buffer
  if (this._getOffset() >= this._total - this._current.length) {
    var off = this._offset;

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

//
// ### function emitb (byte)
// #### @byte {Number} Byte value (8 bits)
// Write byte value at current offset.
//
BaseAsm.prototype.emitb = function emitb(byte) {
  this._reserve(1);
  this._current[this._offset] = byte & 0xff;

  this._left--;
  this._offset++;
};

//
// ### function emitw (word)
// #### @word {Number} Word value (16 bits)
// Write word value at current offset.
//
BaseAsm.prototype.emitw = function emitw(word) {
  this._reserve(2);
  this._current.writeUInt16LE(word, this._offset, true);

  this._left -= 2;
  this._offset += 2;
};

//
// ### function emitl (buf)
// #### @buf {Number|Buffer} Long value (32 bits)
// Write long value at current offset.
//
BaseAsm.prototype.emitl = function emitl(buf) {
  this._reserve(4);

  if (Buffer.isBuffer(buf)) {
    assert.equal(buf.length, 4);

    buf.copy(this._current, this._offset);
  } else {
    this._current.writeUInt32LE(buf, this._offset, true);
  }
  this._left -= 4;
  this._offset += 4;
};

//
// ### function emitq (buf)
// #### @buf {Number|Buffer} Quad value (64 bits)
// Write quad value at current offset.
//
BaseAsm.prototype.emitq = function emitq(buf) {
  if (Buffer.isBuffer(buf)) {
    this._reserve(8);
    assert.equal(buf.length, 8);

    buf.copy(this._current, this._offset);
    this._left -= 8;
    this._offset += 8;
  } else {
    this.emitl((buf >> 32) & 0xffffffff);
    this.emitl(buf & 0xffffffff);
  }
};

//
// ### function isByte (num)
// #### @num {Number} Input number
// Return true if `num` fits into the one byte
//
BaseAsm.prototype.isByte = function isByte(num) {
  if (Buffer.isBuffer(num))
    return num.length === 1;
  else
    return -0x7f <= num && num <= 0x7f;
};

//
// ### function isWord (num)
// #### @num {Number} Input number
// Return true if `num` fits into the two bytes
//
BaseAsm.prototype.isWord = function isWord(num) {
  if (Buffer.isBuffer(num))
    return num.length === 2;
  else
    return -0x7fff <= num && num <= 0x7fff;
};

//
// ### function isWord (num)
// #### @num {Number|Buffer} Input number
// Return true if `num` fits into the four bytes
//
BaseAsm.prototype.isLong = function isLong(num) {
  if (Buffer.isBuffer(num))
    return num.length === 4;
  else
    return -0x7fffffff <= num && num <= 0x7fffffff;
};

//
// ### function isQuad (num)
// #### @num {Number|Buffer} Input number
// Return true if `num` fits into the eight bytes
//
BaseAsm.prototype.isQuad = function isQuad(num) {
  if (Buffer.isBuffer(num))
    return num.length === 8;
  else
    return true;
};

//
// ### function getBuffer ()
// **internal** Concat all internal buffers and compile all used stubs.
// Return buffer, containing all generated code.
//
BaseAsm.prototype._getBuffer = function getBuffer() {
  // Compile all pending stubs
  if (this.stubs)
    this.stubs.compilePending();

  var total = this._total - this._current.length + this._offset;
  return Buffer.concat(this._buffers.concat(this._current), total);
};

//
// ### function getRelocations ()
// **internal** Return all relocations that needs to be resolved.
//
BaseAsm.prototype._getRelocations = function getRelocations() {
  return this._relocations.slice();
};

//
// ### function getReferences ()
// **internal** Get lists of things that should be retained by resulting code
// (usually stubs).
//
BaseAsm.prototype._getReferences = function getReferences() {
  return { stubs: this._stubRefs, runtime: this._runtimeRefs };
};

//
// ### function addRelocation (size, offset, value)
// #### @size {Number} Size of write: 1, 2, 4 or 8
// #### @value {Number|Buffer} Value to write (must fit into block of `size`)
// #### @offset {Number} Global offset to write at (most likely result of
//                       the `getOffset()` call)
// **internal** Add relocation to the internal list.
//
BaseAsm.prototype._addRelocation = function addRelocation(size, value, offset) {
  this._relocations.push({
    size: size,
    value: value,
    offset: offset
  });
};

//
// ### function compile ()
// Return RelocationInfo instance. *Must* be used after compiling code using
// C++ addon.
//
BaseAsm.prototype.compile = function compile() {
  return new RelocationInfo(this._getBuffer(),
                            this._getRelocations(),
                            this._getReferences());
};

//
// ### function RelocationInfo (buffer, relocations, references)
// #### @buffer {Buffer} Buffer containing all instructions
// #### @relocations {Array} All relocations that must be resolved
// #### @references {Array} List of all references
// Constructor of RelocationInfo.
//
function RelocationInfo(buffer, relocations, references) {
  this.buffer = buffer;
  this.relocations = relocations;
  this.references = references;
};

//
// ### function resolve (info)
// #### @info {binding.ExecInfo} Binding output
// Resolve all relocations and put referces into the info.
// Mandatory to call, before using the `info`!
//
RelocationInfo.prototype.resolve = function resolve(info) {
  this.relocations.forEach(function(reloc) {
    var offset = info.getAbsoluteOffset(reloc.value);
    assert(reloc.size === offset.length);
    offset.copy(info.buffer, reloc.offset);
  });
  info._references = this.references;
};
