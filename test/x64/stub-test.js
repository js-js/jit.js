var common = require('../common'),
    test = common.test;

if (process.arch !== 'x64')
  return;

describe('JIT.js x64 Stub', function() {
  test('should support stubs', function() {
    this.stubs.define('sum', function() {
      this.add('rax', 'rbx');
      this.Return();
    });

    this.stubs.define('sub', function() {
      this.sub('rax', 'rbx');
      this.Return();
    });

    this.spill([ 'rbx', 'rcx' ], function() {
      this.mov('rax', 20);
      this.mov('rbx', 32);
      this.stub('rcx', 'sum');
      this.mov('rbx', 10);
      this.stub('rcx', 'sub');
    });
    this.Return();
  }, 42);

  test('should support stubs with arguments', function() {
    this.stubs.define('sum', function(arg) {
      this.add('rax', arg);
      this.Return();
    });

    this.spill('rcx', function() {
      this.mov('rax', 20);
      this.stub('rcx', 'sum', 22);
    });
    this.Return();
  }, 42);

  test('should support stubs with runtime calls', function() {
    this.stubs.define('sum', function() {
      this.runtime(function() {
        return 42;
      });
      this.Return();
    });

    this.spill('rcx', function() {
      this.stub('rcx', 'sum');
    });
    this.Return();
  }, 42);
});
