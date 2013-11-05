#!/usr/bin/env node
var jit = require('jit.js'),
    esprima = require('esprima'),
    assert = require('assert');

var ast = esprima.parse(process.argv[2]);

var stubs = require('./stubs');

// Compile
var fn = jit.compile(function() {
  // This will generate default entry boilerplate
  this.Proc(function() {
    visit.call(this, ast);

    // The result should be in 'rax' at this point
    //
    // This will generate default exit boilerplate
    this.Return();
  });
}, { stubs: stubs });

// Execute
console.log(fn());

function visit(ast) {
  if (ast.type === 'Program')
    visitProgram.call(this, ast);
  else if (ast.type === 'Literal')
    visitLiteral.call(this, ast);
  else if (ast.type === 'UnaryExpression')
    visitUnary.call(this, ast);
  else if (ast.type === 'BinaryExpression')
    visitBinary.call(this, ast);
  else
    throw new Error('Unknown ast node: ' + ast.type);
}

function visitProgram(ast) {
  assert.equal(ast.body.length, 1, 'Only one statement programs are supported');
  assert.equal(ast.body[0].type, 'ExpressionStatement');

  // We've a pointer in 'rax', convert it to integer
  visit.call(this, ast.body[0].expression);

  // Get floating point number out of heap number
  this.movq('xmm1', ['rax', 8]);

  // Round it towards zero
  this.roundsd('zero', 'xmm1', 'xmm1');

  // Convert double to integer
  this.cvtsd2si('rax', 'xmm1');
}

function visitLiteral(ast) {
  assert.equal(typeof ast.value, 'number');

  // Allocate new heap number
  this.stub('rax', 'Alloc');

  // Save 'rbx' register
  this.spill('rbx', function() {
    this.loadDouble('rbx', ast.value);
    this.mov(['rax', 8], 'rbx');
  });
}

function visitBinary(ast) {
  // Preserve 'rbx' after leaving the AST node
  this.spill('rbx', function() {
    // Visit left side of expresion
    visit.call(this, ast.right);

    // Move it to 'rbx'
    this.mov('rbx', 'rax');

    // Visit right side of expression (the result is in 'rax')
    visit.call(this, ast.left);

    //
    // So, to conclude, we've left side in 'rax' and right in 'rbx'
    //

    // Lets load their double values
    this.movq('xmm1', ['rax', 8]);
    this.movq('xmm2', ['rbx', 8]);

    // Execute binary operation
    if (ast.operator === '+') {
      this.addsd('xmm1', 'xmm2');
    } else if (ast.operator === '-') {
      this.subsd('xmm1', 'xmm2');
    } else if (ast.operator === '*') {
      this.mulsd('xmm1', 'xmm2');
    } else if (ast.operator === '/') {
      this.divsd('xmm1', 'xmm2');
    } else {
      throw new Error('Unsupported binary operator: ' + ast.operator);
    }

    // Allocate new number, and put value in it
    this.stub('rax', 'Alloc');
    this.movq(['rax', 8], 'xmm1');
  });
}

function visitUnary(ast) {
  if (ast.operator === '-') {
    // Negate argument by emulating binary expression
    visit.call(this, {
      type: 'BinaryExpression',
      operator: '*',
      left: ast.argument,
      right: { type: 'Literal', value: -1 }
    })
  } else {
    throw new Error('Unsupported unary operator: ' + ast.operator);
  }
}
