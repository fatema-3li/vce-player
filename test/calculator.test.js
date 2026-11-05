import {test} from 'node:test';import assert from 'node:assert/strict';import {calculate} from '../calculator.js';
test('calculator handles precedence, decimal precision, parentheses and unary operations',()=>{
 assert.equal(calculate('-2^2'),-4);assert.equal(calculate('2^-2'),0.25);assert.equal(calculate('2+3×4'),14);assert.equal(calculate('(2+3)×4'),20);assert.equal(calculate('0.1+0.2'),0.3);assert.equal(calculate('100×10%'),10);assert.equal(calculate('sqrt(81)'),9);assert.equal(calculate('(5)^2'),25);assert.equal(calculate('-(12)+5'),-7);assert.equal(calculate('1e-5*2'),0.00002);
});
test('calculator rejects zero division, bad expressions and executable input',()=>{
 for(const text of ['1/0','sqrt(-1)','2+','(3+4','alert(1)','1;2','2**3','9'.repeat(201)])assert.throws(()=>calculate(text));
});
