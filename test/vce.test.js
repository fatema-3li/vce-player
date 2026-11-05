import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseVce} from '../vce.js';
import {validateExam,score} from '../engine.js';
test('rejects unknown formats and malformed files',()=>{
 assert.throws(()=>parseVce(new Uint8Array()),/Truncated/);
 assert.throws(()=>parseVce(new Uint8Array([0x85,0xa8,6,2])),/format 62/);
 assert.throws(()=>parseVce(new Uint8Array([1,2,3,4])),/Not a valid/);
});
// Private user exams stay outside the repository; set VCE_TEST_FILE to test one.
test('native VCE fixture has complete graded questions',{skip:!process.env.VCE_TEST_FILE},()=>{
 const raw=readFileSync(process.env.VCE_TEST_FILE),exam=validateExam(parseVce(raw));
 assert.equal(exam.title,'01 Introduction 2027');assert.equal(exam.questions.length,40);
 assert.equal(exam.passingScore,800);
 assert.equal(exam.questions.filter(q=>q.answers.length>1).length,3);
 assert.deepEqual(exam.questions[0].answers,[2]);
 for(const q of exam.questions){assert.ok(q.prompt.length);assert.ok(q.explanation.length);assert.ok(q.options.every(o=>o.length));assert.ok(!q.prompt.includes('\0'));}
 assert.equal(score(exam.questions,Object.fromEntries(exam.questions.map(q=>[q.id,q.answers]))).score,1000);
 assert.equal(score(exam.questions,{}).score,0);
 assert.throws(()=>parseVce(raw.subarray(0,raw.length-20)));
});
