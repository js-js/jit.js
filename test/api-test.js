var jit = require('..'),
    assert = require('assert');

describe('JIT.js', function() {
  it('should compile basic function', function() {
    var fn = jit.compile(function() {
      if (this.arch === 'x64') {
        this.push('rbp');
        this.mov('rsp', 'rbp');
        this.mov(42, 'rax');
        this.mov('rbp', 'rsp');
        this.pop('rbp');;
        this.ret();
      }
    });

    assert.equal(fn(), 42);
  });
});
