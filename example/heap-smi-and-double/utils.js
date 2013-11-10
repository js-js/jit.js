exports.tagSmi = function tagSmi(value) {
  return value << 1;
};

exports.untagSmi = function untagSmi(reg) {
  this.shr(reg, 1);
};

exports.checkSmi = function checkSmi(value, t, f) {
  if (!t && !f)
    return this.test(value, 1);

  this.labelScope(function() {
    this.test(value, 1);
    this.j('ne', 'non-smi');
    t.call(this);
    this.j('end');
    this.bind('non-smi');
    f.call(this);
    this.bind('end');
  });
};

exports.heapOffset = function heapOffset(reg, offset) {
  return [reg, 8 * ((offset | 0) + 1) - 1];
};
