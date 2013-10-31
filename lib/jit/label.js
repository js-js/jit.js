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
};

Label.prototype.use = function use(size, delta) {
  var zap = 0xdeadbeef;
  // Emit empty space
  if (size === 1)
    this.asm.emitb(zap);
  else if (size === 2)
    this.asm.emitw(zap);
  else if (size === 4)
    this.asm.emitl(zap);
  else
    this.asm.emitq(zap);

  // Accumulate uses
  this.uses.push({
    size: size,
    offset: this.asm._offset - size,
    delta: delta || 0
  });

  // Already-bound
  if (this.offset !== null)
    this.resolve();
};

Label.prototype.resolve = function resolve() {
  this.uses.forEach(function(use) {
    var size = use.size;
    var delta = use.delta;

    var offset = this.asm._offset;
    this.asm._offset = use.offset;

    var value = this.offset - offset + delta;
    if (size === 1) {
      assert(this.asm.isByte(value), 'offset should fit in one byte');
      this.asm.emitb(value);
    } else if (size === 2) {
      assert(this.asm.isWord(value), 'offset should fit in two bytes');
      this.asm.emitw(value);
    } else if (size === 4) {
      assert(this.asm.isLong(value), 'offset should fit in four bytes');
      this.asm.emitl(value);
    } else {
      this.asm.emitq(value);
    }

    this.asm._offset = offset;
  }, this);

  this.uses = [];
};
