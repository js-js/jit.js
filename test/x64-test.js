var jit = require('..'),
    assert = require('assert');

if (process.arch !== 'x64') return;

function test(name, fn, result) {
  it(name, function() {
    assert.equal(jit.compile(fn)(), result);
  });
}

describe('JIT.js x64', function() {
  test('should compile function with high registers', function() {
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
  }, 42);

  test('should support math basics', function() {
    this.Entry();

    // 12 * 14
    this.mov('r8', 12);
    this.mov('rax', 14);
    this.imul('r8');

    // += 5
    this.mov('r8', 'rax');
    this.mov('rbx', 5);
    this.add('rbx', 'r8');

    // -= 3
    this.mov('r8', 'rbx');
    this.mov('rbx', new Buffer('0000000000000003', 'hex'));
    this.sub('r8', 'rbx');

    // /= 5
    this.mov('rax', 'r8');
    this.mov('r8', 5);
    this.idiv('r8');

    this.Exit();
  }, 34);

  test('should support binary', function() {
    this.Entry();

    this.mov('rax', 1);
    this.shl('rax', 3);
    this.mov('rbx', 2);
    this.shl('rbx', 1);
    this.or('rax', 'rbx');
    this.or('rax', 2);
    this.and('rax', 13);

    this.Exit();
  }, 12);

  test('should support branching', function() {
    this.Entry();

    this.xor('rax', 'rax');
    this.mov('rcx', 10);
    this.labelScope(function() {
      this.bind('loop');

      this.inc('rax');
      this.dec('rcx');
      this.cmp('rcx', 0);

      this.j('ne', 'loop');

      // Just to test jumping
      this.jl('out');
      this.bind('out');
    });

    this.Exit();
  }, 10);
});
