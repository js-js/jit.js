var jit = require('jit.js');
var Buffer = require('buffer').Buffer;

var stubs = jit.stubs();

// Create fixed size memory chunk
var page = new Buffer(1024);

// Set-up pointers to page start and page end
var offset = jit.ptr(page);
var end = jit.ptr(page, page.length);

stubs.define('Alloc', function() {
  this.int3();

  // Save 'rbx' and 'rbx' registers
  this.spill(['rbx', 'rcx'], function() {
    // Load `offset`
    //
    // NOTE: We'll use pointer to `offset` variable, to be able to update
    // it below
    this.mov('rax', this.ptr(offset));
    this.mov('rax', ['rax']);

    // Load end
    //
    // NOTE: Same applies to end, though, we're not updating it right now
    this.mov('rbx', this.ptr(end));
    this.mov('rbx', ['rbx']);

    // Calculate new `offset`
    this.mov('rcx', 'rax');

    // We'll assume that all allocations are 16 bytes = two 64bit pointers
    this.add('rcx', 16);

    // Check if we won't overflow our fixed size buffer
    this.cmp('rcx', 'rbx');

    // this.j() performs conditional jump to the specified label.
    // 'g' stands for 'greater'
    // 'overflow' is a label name, bound below
    this.j('g', 'overflow');

    // Ok, we're good to go, update offset
    this.mov('rbx', this.ptr(offset));
    this.mov(['rbx'], 'rcx');

    // First 64bit pointer is reserved for 'tag', second one is a `double` value
    this.mov(['rax'], 1);

    // Return 'rax'
    this.Return();

    // Overflowed :(
    this.bind('overflow')

    // Invoke javascript function!
    // NOTE: This is really funky stuff, but I'm not going to dive deep
    // into it right now
    this.runtime(function() {
      console.log('GC is needed, but not implemented');
    });

    // Crash
    this.int3();

    this.Return();
  });
});

module.exports = stubs;
