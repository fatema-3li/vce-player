import {test} from 'node:test';
import assert from 'node:assert/strict';
import {score,correct,validateExam} from '../engine.js';
import {sample} from '../sample.js';
test('multi-select requires exactly the correct answers',()=>{const q=sample.questions[3];assert.equal(correct(q,[1,2]),true);assert.equal(correct(q,[1]),false);assert.equal(correct(q,[1,2,3]),false);assert.equal(correct(q),false)});
test('score includes unanswered questions and section totals',()=>{const r=score(sample.questions,{q1:[0],q2:[1],q3:[2],q4:[1,2]});assert.equal(r.score,800);assert.equal(r.correct,4);assert.deepEqual(r.sections['Configuring Access to Resources'],{items:2,correct:2});assert.equal(score(sample.questions,{}).score,0)});
test('imports reject invalid indexes and duplicate IDs',()=>{assert.equal(validateExam(sample),sample);const e=structuredClone(sample);e.questions[0].answers=[99];assert.throws(()=>validateExam(e));e.questions[0]=e.questions[1];assert.throws(()=>validateExam(e))});
