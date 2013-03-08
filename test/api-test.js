var jit = require('..'),
    assert = require('assert');

describe('JIT.js', function() {
  it('should compile basic function', function() {
    var fn = jit.compile(function() {
      if (this.arch === 'x64') {
        this.push('rbp');
        this.movq('rsp', 'rbp');
        this.movq(42, 'rax');
        this.movq('rbp', 'rsp');
        this.nop();
        this.pop('rbp');;
        this.ret();
      } else if (this.arch === 'ia32') {
        this.push('ebp');
        this.movl('esp', 'ebp');
        this.movl(42, 'eax');
        this.movl('ebp', 'esp');
        this.nop();
        this.pop('ebp');;
        this.ret();
      }
    });

    assert.equal(fn(), 42);
  });

  if (process.arch === 'x64') {
    it('should compile function with high registers', function() {
      var fn = jit.compile(function() {
        this.push('rbp');
        this.movq('rsp', 'rbp');
        this.push('r11');
        this.movq(42, 'r11');
        this.movq('r11', 'rax');
        this.pop('r11');
        this.movq('rbp', 'rsp');
        this.pop('rbp');;
        this.ret();
      });

      assert.equal(fn(), 42);
    });
  }
});
