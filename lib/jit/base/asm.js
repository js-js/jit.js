var jit = require('../../jit');
var assert = require('assert');
var WriteBuffer = require('wbuf');
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
  this.stubs = this.options.stubs;

  this._buffer = new WriteBuffer();
  this._buffer.forceReserve = true;
  this._buffer.reserveRate = 4096;
  this._relocations = [];

  // To keep them referenced
  this._stubRefs = {};
  this._runtimeRefs = [];
};

//
// ### function reserve (n)
// #### @n {Number} **optional** Number of bytes to reserve
// **internal** Reserve space in internal buffer for the future writes
//
BaseAsm.prototype._reserve = function reserve(n) {
  this._buffer.reserve(n);
};

//
// ### function getOffset ()
// Return global offset including length of all blocks in `_buffers`.
//
BaseAsm.prototype.getOffset = function getOffset() {
  return this._buffer.size;
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
  assert(offset + size <= this.getOffset());

  var oldBuffer = this._buffer;
  this._buffer = this._buffer.slice(offset, offset + size);
  if (size === 8)
    this.emitq(value);
  else
    this._buffer.writeComb(size, 'le', value);
  this._buffer = oldBuffer;
};

//
// ### function emitb (byte)
// #### @byte {Number} Byte value (8 bits)
// Write byte value at current offset.
//
BaseAsm.prototype.emitb = function emitb(byte) {
  this._buffer.writeUInt8(byte);
};

//
// ### function emitw (word)
// #### @word {Number} Word value (16 bits)
// Write word value at current offset.
//
BaseAsm.prototype.emitw = function emitw(word) {
  this._buffer.writeUInt16LE(word);
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
    this._buffer.copyFrom(buf);
  } else {
    this._buffer.writeUInt32LE(buf);
  }
};

//
// ### function emitq (buf)
// #### @buf {Number|Buffer} Quad value (64 bits)
// Write quad value at current offset.
//
BaseAsm.prototype.emitq = function emitq(buf) {
  this._reserve(8);

  if (Buffer.isBuffer(buf)) {
    assert.equal(buf.length, 8);
    this._buffer.copyFrom(buf);
  } else {
    this._buffer.writeUInt32LE(buf >>> 32);
    this._buffer.writeUInt32LE(buf);
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

  return Buffer.concat(this._buffer.render(), this._buffer.size);
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
  this.length = buffer.length;
};

//
// ### function resolve (exec)
// #### @exec {Buffer} Binding output
// Resolve all relocations and put referces into the info.
// Mandatory to call, before using the `info`!
//
RelocationInfo.prototype.resolve = function resolve(exec) {
  this.relocations.forEach(function(reloc) {
    var offset = jit.ptr(exec, reloc.value);
    assert(reloc.size === offset.length);
    offset.copy(exec, reloc.offset);
  });
  exec._references = this.references;
};
