#!/usr/bin/env node
var jit = require('jit.js'),
    esprima = require('esprima'),
    assert = require('assert');

var ast = esprima.parse(process.argv[2]);

var stubs = require('./stubs');
var utils = require('./utils');

// Compile
var fn = jit.compile(function() {
  // Export some functions from utils
  this.checkSmi = utils.checkSmi;
  this.untagSmi = utils.untagSmi;
  this.heapOffset = utils.heapOffset;

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
  this.checkSmi('rax', function() {
    // Untag smi
    this.untagSmi('rax');
  }, function() {
    this.movq('xmm1', this.heapOffset('rax', 0));

    // Round it towards zero
    this.roundsd('zero', 'xmm1', 'xmm1');

    // Convert double to integer
    this.cvtsd2si('rax', 'xmm1');
  });
}

function visitLiteral(ast) {
  assert.equal(typeof ast.value, 'number');

  if ((ast.value | 0) === ast.value) {
    // Integer
    this.mov('rax', utils.tagSmi(ast.value));
  } else {
    // Allocate new heap number
    this.stub('rax', 'Alloc', 8, 1);

    // Save 'rbx' register
    this.spill('rbx', function() {
      this.loadDouble('rbx', ast.value);
      this.mov(this.heapOffset('rax', 0), 'rbx');
    });
  }
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

    if (ast.operator === '/') {
      // Call stub for division
      this.stub('rax', 'Binary' + ast.operator, 'rax', 'rbx');
    } else {
      this.labelScope(function() {
        // Check if both numbers are SMIs
        this.checkSmi('rax');
        this.j('ne', 'call stub');
        this.checkSmi('rbx');
        this.j('ne', 'call stub');

        if (ast.operator === '+')
          this.add('rax', 'rbx');
        else if (ast.operator === '-')
          this.sub('rax', 'rbx');
        else if (ast.operator === '*')
          this.mul('rbx');

        this.j('done');
        this.bind('call stub');

        this.stub('rax', 'Binary' + ast.operator, 'rax', 'rbx');

        this.bind('done');
      });
    }
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
