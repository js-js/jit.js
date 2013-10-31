var jit = require('..'),
    assert = require('assert');

if (process.arch !== 'x64') return;

describe('JIT.js x64', function() {
  it('should compile function with high registers', function() {
    var fn = jit.compile(function() {
      this.Entry();

      this.xor('r11', 'r11');
      this.push('r11');
      this.mov('r11', 34);
      this.mov('rax', 'r11');
      this.pop('r11');
      this.add('r11', 13);
      this.sub('rax', 'r11');
      this.add('rax', 'rax');

      this.Exit();
    });

    assert.equal(fn(), 42);
  });

});
