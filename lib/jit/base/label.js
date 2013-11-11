var assert = require('assert');
var util = require('util');
var base = require('../base');

//
// ### function Label (asm, name)
// #### @asm {BaseAsm} Assembler instance
// #### @name {String|null} Label name (`null` if label has no name).
// A label constructor.
//
function Label(asm, name) {
  base.Relocation.call(this, asm, name);
};
util.inherits(Label, base.Relocation);
module.exports = Label;

//
// ### function isBound ()
// Return true if underlying relocation was resolved,
// i.e. if `this.bind()` was called on this label.
//
Label.prototype.isBound = function isBound() {
  return this.isResolved();
};

//
// ### function bind (offset)
// #### @offset {Number} Global offset
// Bind label at global offset, will resolve all previous uses.
//
Label.prototype.bind = function bind(offset) {
  this.resolve(offset);
};

//
// ### function use (size, delta, absolute)
// #### @size {Number} Size of use: 1, 2, 4 or 8
// #### @delta {Number} A number to add to the actual delta before resolving
// #### @absolute {Boolean} if true - absolute address will be put at the use
// Create and store use for the later resolution.
// NOTE: Usually should be preceeded by `this.emit*()` call of `size`.
//
Label.prototype.use = function use(size, delta, absolute) {
  Label.super_.prototype.use.call(this, size, function(use, offset) {
    if (delta)
      offset += delta;

    if (absolute) {
      this.asm._addRelocation(size, offset, use.offset);
      return null;
    }

    return offset - use.offset;
  });
};
