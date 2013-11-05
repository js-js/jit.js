var jit = require('jit.js');
var Buffer = require('buffer').Buffer;

var stubs = jit.stubs();

// Fixed size memory chunk
var page = new Buffer(1024);

// Set-up pointers to page start and page end
var offset = jit.ptr(page);
var end = jit.ptr(page, page.length);

stubs.define('Alloc', function() {

  // Save 'rbx' and 'rbx' registers
  this.spill(['rbx', 'rcx'], function() {
    // Load offset
    this.mov('rax', this.ptr(offset));
    this.mov('rax', ['rax']);

    // Load end
    this.mov('rbx', this.ptr(end));
    this.mov('rbx', ['rbx']);

    // Calculate new offset
    this.mov('rcx', 'rax');
    this.add('rcx', 16);

    // Check if we won't overflow
    this.cmp('rcx', 'rbx');
    this.j('g', 'overflow');

    // Ok, we're good to go, update offset
    this.mov('rbx', this.ptr(offset));
    this.mov(['rbx'], 'rcx');

    // Set tag
    this.mov(['rax'], 1);
  });

  // Return 'rax'
  this.Return();

  // Overflowed :(
  this.bind('overflow')
  this.runtime(function() {
    console.log('GC is needed, but not implemented');
  });

  // Crash
  this.int3();

  this.Return();
});

module.exports = stubs;
