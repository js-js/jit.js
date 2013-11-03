var assert = require('assert');

function Relocation(asm, name) {
  this.asm = asm;
  this.name = name;
  this.value = null;
  this.uses = [];
};
module.exports = Relocation;

Relocation.prototype.isResolved = function isResolved() {
  return this.value !== null;
};

Relocation.prototype.resolve = function resolve(value) {
  assert(this.value === null, 'Already resolved');
  this.value = value;
  this._replaceUses();
};

Relocation.prototype.use = function use(size, map) {
  // Accumulate uses
  this.uses.push({
    size: size,
    offset: this.asm._getOffset() - size,
    map: map
  });

  // Already resolved
  if (this.value !== null)
    this._replaceUses();
};

Relocation.prototype._replaceUses = function replaceUses() {
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
