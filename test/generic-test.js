var jit = require('..'),
    assert = require('assert');

describe('JIT.js generic', function() {
  it('should compile basic function', function() {
    var fn = jit.compile(function() {
      this.Entry();
      if (this.arch === 'x64') {
        this.movq(42, 'rax');
      } else if (this.arch === 'ia32') {
        this.movl(42, 'eax');
      }
      this.nop();
      this.Exit();
    });

    assert.equal(fn(), 42);
  });
});
