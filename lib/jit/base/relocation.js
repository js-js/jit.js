var assert = require('assert');

//
// ### function Relocation (asm, name)
// #### @asm {BaseAsm} Assembler instance
// ##### @name {String} Relocation name
// Relocation constructor
//
function Relocation(asm, name) {
  this.asm = asm;
  this.name = name;
  this.value = null;
  this.uses = [];
};
module.exports = Relocation;

//
// ### function isResolved ()
// Return true if `this.resolve()` was called on the relocation.
//
Relocation.prototype.isResolved = function isResolved() {
  return this.value !== null;
};

//
// ### function resolve (value)
// #### @value {Any} Any non-undefined value
// Resolve relocation by giving value to all uses.
//
Relocation.prototype.resolve = function resolve(value) {
  assert(this.value === null, 'Already resolved');
  this.value = value;
  this._resolveUses();
};

//
// ### function use (size, map)
// #### @size {Number} Size of use: 1, 2, 4 or 8
// #### @map {Function} **optional** A mapping function for the resolution value
// Add use for the relocation.
// NOTE: If relocation was resolved - use will be resolved immediately too.
//       Also, `use()` is usually called after `asm.emit*()`.
//
Relocation.prototype.use = function use(size, map) {
  // Accumulate uses
  this.uses.push({
    size: size,
    offset: this.asm.getOffset() - size,
    map: map
  });

  // Already resolved
  if (this.value !== null)
    this._resolveUses();
};

//
// ### function resolveUses ()
// **internal** Resolve all collected uses
//
Relocation.prototype._resolveUses = function resolveUses() {
  var uses = this.uses;
  this.uses = [];

  uses.forEach(function(use) {
    var size = use.size;

    var value = use.map ? use.map.call(this, use, this.value) : this.value;
    if (value === null)
      return;

    if (size === 1)
      assert(this.asm.isByte(value), 'offset should fit in one byte');
    else if (size === 2)
      assert(this.asm.isWord(value), 'offset should fit in two bytes');
    else if (size === 4)
      assert(this.asm.isLong(value), 'offset should fit in four bytes');
    else if (size === 8)
      assert(this.asm.isQuad(value), 'offset should fit in eight bytes');
    this.asm._writeAt(size, value, use.offset);
  }, this);
};
