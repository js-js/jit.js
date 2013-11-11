exports.Asm = require('./asm');
exports.Masm = require('./masm');

// Add Binary extensions to Asm
require('./binary');

// Add Math extensions to Asm
require('./math');

// Add Branching extensions to Asm
require('./branching');

// Add Floating Point extensions to Asm
require('./fp');
