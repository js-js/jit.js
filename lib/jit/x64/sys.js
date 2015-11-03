var assert = require('assert');
var x64 = require('./');

var Asm = x64.Asm;

//
// ### function cpuid ()
// Emit `cpuid`
//
Asm.prototype.cpuid = function cpuid() {
  this.emitb(0x0f);
  this.emitb(0xa2);
};

//
// ### function cpuid ()
// Emit `cpuid`
//
Asm.prototype.cpuid = function cpuid() {
  this.emitb(0x0f);
  this.emitb(0xa2);
};

//
// ### function clflush ()
// Emit `clflush`
//
Asm.prototype.clflush = function clflush(dst) {
  assert(Array.isArray(dst), 'Only memory operand issupported in `clflush`');

  this.emitb(0x0f);
  this.emitb(0xae);
  this.modrm(7, dst);
};

//
// ### function rdtsc ()
// Emit `rdtsc`
//
Asm.prototype.rdtsc = function rdtsc() {
  this.emitb(0x0f);
  this.emitb(0x31);
};

//
// ### function mfence ()
// Emit `mfence`
//
Asm.prototype.mfence = function mfence() {
  this.emitb(0x0f);
  this.emitb(0xae);
  this.emitb(0xf0);
};

//
// ### function lfence ()
// Emit `lfence`
//
Asm.prototype.lfence = function lfence() {
  this.emitb(0x0f);
  this.emitb(0xae);
  this.emitb(0xe8);
};
