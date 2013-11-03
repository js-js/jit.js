var jit = require('../jit');

function Stubs(options) {
  this.options = options;
  this.stubs = {};
  this.pending = {};
  this.infos = [];
};
module.exports = Stubs;

Stubs.prototype.define = function define(name, body) {
  if (this.stubs.hasOwnProperty(name))
    throw new Error('Stub: ' + name + ' is already defined');

  this.stubs[name] = new Stub(this, name, body);
};

Stubs.prototype.get = function get(name) {
  if (!this.stubs.hasOwnProperty(name))
    throw new Error('Unknown stub: ' + name);

  return this.stubs[name];
};

Stubs.prototype.compilePending = function compilePending() {
  var pending = Object.keys(this.pending).map(function(name) {
    return this.pending[name];
  }, this);
  if (pending.length === 0)
    return;

  // Compile every stub
  var fn = jit.compile(function() {
    pending.forEach(function(stub) {
      stub.compile(this);
    }, this);
  }, this.options);
  var info = fn._info;

  // Resolve all relocs
  pending.forEach(function(stub) {
    stub.resolve(info);
  });
};

function Stub(stubs, name, body) {
  this.stubs = stubs;
  this.name = name;
  this.body = body;
  this.offset == null;
  this.address = null;
  this.relocs = [];
};

Stub.prototype.addReloc = function addReloc(reloc) {
  if (this.address !== null)
    return reloc.resolve(this.address);

  this.stubs.pending[this.name] = this;
  this.relocs.push(reloc);
};

Stub.prototype.compile = function compile(asm) {
  var body = this.body;

  this.offset = asm.Proc(function() {
    body.call(this);
  });
};

Stub.prototype.resolve = function resolve(info) {
  var addr = info.getAbsoluteOffset(this.offset);

  this.relocs.forEach(function(reloc) {
    reloc.resolve(addr);
  });
  this.address = addr;
  this.relocs = [];
};
