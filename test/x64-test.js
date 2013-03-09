var jit = require('..'),
    assert = require('assert');

if (process.arch !== 'x64') return;

describe('JIT.js x64', function() {
  it('should compile function with high registers', function() {
    var fn = jit.compile(function() {
      this.Entry();
      this.push('r11');
      this.movq(42, 'r11');
      this.movq('r11', 'rax');
      this.pop('r11');
      this.Exit();
    });

    assert.equal(fn(), 42);
  });
});
