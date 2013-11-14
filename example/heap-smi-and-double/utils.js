// Export some static non-Masm helpers

exports.tagSmi = function tagSmi(value) {
  return value << 1;
};

// Export some Masm helpers

exports.helpers = {
  untagSmi: untagSmi,
  checkSmi: checkSmi,
  heapOffset: heapOffset
};

function untagSmi(reg) {
  this.shr(reg, 1);
};

function checkSmi(value, t, f) {
  // If no true- and false- bodies were specified -
  // just test the value.
  if (!t && !f)
    return this.test(value, 1);

  // Enter the scope to be able to use named labels
  this.labelScope(function() {
    // Test the value
    this.test(value, 1);

    // Skip SMI case if result is non-zero
    this.j('nz', 'non-smi');

    // Run SMI case
    t.call(this);

    // Jump to the shared end
    this.j('end');

    // Non-SMI case
    this.bind('non-smi');
    f.call(this);

    // Shared end
    this.bind('end');
  });
};

function heapOffset(reg, offset) {
  // NOTE: 8 is the size of pointer on x64 arch,
  // we're adding 1, because first quad word is used for Heap Object Type.
  return [reg, 8 * ((offset | 0) + 1) - 1];
};
