#!/usr/bin/env node
var jit = require('jit.js'),
    esprima = require('esprima'),
    assert = require('assert');

var ast = esprima.parse(process.argv[2]);

// Compile
var fn = jit.compile(function() {
  // This will generate default entry boilerplate
  this.Proc(function() {
    visit.call(this, ast);

    // The result should be in 'rax' at this point
    //
    // This will generate default exit boilerplate
    this.Exit();
  });
});

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
  visit.call(this, ast.body[0].expression);
}

function visitLiteral(ast) {
  assert.equal(typeof ast.value, 'number');
  assert.equal(ast.value | 0, ast.value, 'Only integer numbers are supported');

  this.mov('rax', ast.value);
}

function visitBinary(ast) {
  // Preserve 'rbx' after leaving the AST node
  this.push('rbx');

  // Visit left side of expresion
  visit.call(this, ast.right);

  // Move it to 'rbx'
  this.mov('rbx', 'rax');

  // Visit right side of expression (the result is in 'rax')
  visit.call(this, ast.left);

  //
  // So, to conclude, we've left side in 'rax' and right in 'rbx'
  //

  // Execute binary operation
  if (ast.operator === '+') {
    this.add('rax', 'rbx');
  } else if (ast.operator === '-') {
    this.sub('rax', 'rbx');
  } else if (ast.operator === '*') {
    // Signed multiplication
    // rax = rax * rbx
    this.imul('rbx');
  } else if (ast.operator === '/') {
    // Preserve 'rdx'
    this.push('rdx');

    // idiv is diving rdx:rax by rbx, therefore we need to clear rdx
    // before running it
    this.xor('rdx', 'rdx');

    // Signed division, rax = rax / rbx
    this.idiv('rbx');

    // Restore 'rdx'
    this.pop('rdx');
  } else if (ast.operator === '%') {
    // Preserve 'rdx'
    this.push('rdx');

    // Prepare to execute idiv
    this.xor('rdx', 'rdx');
    this.idiv('rbx');

    // imul puts remainedr in 'rdx'
    this.mov('rax', 'rdx');

    // Restore 'rdx'
    this.pop('rdx');
  } else {
    throw new Error('Unsupported binary operator: ' + ast.operator);
  }

  // Restore 'rbx'
  this.pop('rbx');

  // The result is in 'rax'
}

function visitUnary(ast) {
  // Visit argument and put result into 'rax'
  visit.call(this, ast.argument);

  if (ast.operator === '-') {
    // Negate argument
    this.neg('rax');
  } else {
    throw new Error('Unsupported unary operator: ' + ast.operator);
  }
}
