var jit = require('../jit');
var util = require('util');

//
// ### function Stubs (options)
// #### @options {Object} Options passed to BaseAsm's created in the process
// Stubs constructor
//
function Stubs(options) {
  this.options = options;
  this.stubs = {};
  this.pending = {};
  this.infos = [];
};
module.exports = Stubs;

//
// ### function define (name, body)
// #### @name {String} Stub's name
// #### @body {Function} Stub's body
// Define new stub.
// NOTE: body will be called in the context of BaseAsm
//
Stubs.prototype.define = function define(name, body) {
  if (this.stubs.hasOwnProperty(name))
    throw new Error('Stub: ' + name + ' is already defined');

  this.stubs[name] = new Stub(this, name, body);
};

//
// ### function has (name)
// #### @name {String} Stub's name
// Returns true if stub with given name is present.
//
Stubs.prototype.has = function has(name) {
  return this.stubs.hasOwnProperty(name);
};

//
// ### function get (name)
// #### @name {String} Stub's name
// Returns stub with specified name.
//
Stubs.prototype.get = function get(name) {
  if (!this.stubs.hasOwnProperty(name))
    throw new Error('Unknown stub: ' + name);

  return this.stubs[name];
};

//
// ### function compilePending ()
// Compile all pending stubs.
//
Stubs.prototype.compilePending = function compilePending() {
  var pending = Object.keys(this.pending).map(function(name) {
    return this.pending[name];
  }, this);
  if (pending.length === 0)
    return;
  this.pending = {};

  // Compile every stub
  var fn = jit.compile(function() {
    pending.forEach(function(stub) {
      stub.compile(this);
    }, this);
  }, util._extend({ stubs: this }, this.options));
  var buf = fn._buffer;

  // Resolve all uses
  pending.forEach(function(stub) {
    stub.resolve(buf);
  });
};

//
// ### function Stub (stubs, name, body)
// #### @stubs {Stubs} Stubs instance
// #### @name {String} Stub's name
// #### @body {Function} Stub's body
// Stub constructor
//
function Stub(stubs, name, body) {
  this.stubs = stubs;
  this.name = name;
  this.body = body;
  this.argc = body.length;
  this.offset == null;
  this.exec = null;
  this.address = null;
  this.uses = [];
};

//
// ### function use (reloc)
// #### @reloc {Relocation} relocation
// Use stub at `reloc`
//
Stub.prototype.use = function use(reloc) {
  if (this.address !== null)
    return reloc.resolve(this.address);

  this.stubs.pending[this.name] = this;
  this.uses.push(reloc);
};

//
// ### function compile (asm)
// #### @asm {BaseAsm} BaseAsm instance
// Compile Stub.
//
Stub.prototype.compile = function compile(asm) {
  var self = this;
  var body = this.body;

  this.offset = asm.Proc(self.argc, function() {
    this.labelScope(function() {
      var args = [];
      for (var i = 0; i < self.argc; i++)
        args.push(this.arg(i));
      body.apply(this, args);
    });
  });
};

//
// ### function resolve (exec)
// #### @exec {Buffer}
// Resolve all stub uses.
//
Stub.prototype.resolve = function resolve(exec) {
  var addr = jit.ptr(exec, this.offset);

  this.uses.forEach(function(reloc) {
    reloc.resolve(addr);
  });
  this.uses = [];
  this.exec = exec;
  this.address = addr;
};
