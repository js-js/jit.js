var assert = require('assert');
var jit = require('../jit');

function Label(asm, name) {
  this.asm = asm;
  this.name = name;
  this.offset = null;
  this.uses = [];
};
module.exports = Label;

Label.prototype.bind = function bind(offset) {
  assert(this.offset === null, 'Already bound');
  this.offset = offset;
  this.resolve();
};

Label.prototype.use = function use(size, delta, absolute) {
  // Accumulate uses
  this.uses.push({
    absolute: !!absolute,
    size: size,
    offset: this.asm._getOffset() - size,
    delta: delta || 0
  });

  // Already-bound
  if (this.offset !== null)
    this.resolve();
};

Label.prototype.resolve = function resolve() {
  this.uses = this.uses.filter(function(use) {
    var size = use.size;
    var delta = use.delta;
    var value = this.offset - this.asm._getOffset() + delta;

    if (use.absolute) {
      this.asm.addRelocation(size, use.offset, value);
      return false;
    }

    if (size === 1)
      assert(this.asm.isByte(value), 'offset should fit in one byte');
    else if (size === 2)
      assert(this.asm.isWord(value), 'offset should fit in two bytes');
    else if (size === 4)
      assert(this.asm.isLong(value), 'offset should fit in four bytes');
    this.asm._writeAt(size, value, use.offset);

    return true;
  }, this);
};
