var assert = require('assert');
var util = require('util');
var base = require('../base');

function Label(asm, name) {
  base.Relocation.call(this, asm);

  this.name = name;
};
util.inherits(Label, base.Relocation);
module.exports = Label;

Label.prototype.bind = function bind(offset) {
  this.resolve(offset);
};

Label.prototype.use = function use(size, delta, absolute) {
  Label.super_.prototype.use.call(this, size, function(use, offset) {
    if (delta)
      offset += delta;

    if (absolute) {
      this.asm.addRelocation(size, use.offset, offset);
      return null;
    }

    return offset - this.asm._getOffset();
  });
};
