import {test} from 'node:test';import assert from 'node:assert/strict';
import {matchingQuestion} from '../matching.js';import {correct,isAnswered,score,validateExam} from '../engine.js';
const source={id:'m',section:'Agile',prompt:'Match the ceremonies.\n(The below is the answer, please review it.)\nCompleted items >>> Iteration Review\nIteration goal >>> Iteration Planning\nDevelopment flow >>> Daily meeting\n\nExplanation\nThe review examines the result.',options:['','',''],answers:[0],explanation:''};
test('explicit text matching pairs become independent selectable rows with hidden source answers',()=>{
 const q=matchingQuestion(source);assert.equal(q.type,'matching');assert.equal(q.prompt,'Match the ceremonies.');assert.equal(q.matchingPrompts.length,3);assert.equal(q.options[q.answers[0]],'Iteration Review');assert.match(q.explanation,/review examines/);assert.equal(matchingQuestion(q),q);assert.equal(validateExam({title:'Match',questions:[q]}).questions[0],q);
});
test('matching grades each row in order and incomplete rows remain incomplete',()=>{
 const q=matchingQuestion(source);assert.equal(correct(q,q.answers),true);assert.equal(correct(q,[...q.answers].reverse()),false);assert.equal(isAnswered(q,[-1,q.answers[1],q.answers[2]]),false);assert.equal(isAnswered(q,q.answers),true);assert.equal(score([q],{m:q.answers}).score,1000);
});
test('ordinary choice questions and ambiguous text are preserved',()=>{
 assert.equal(matchingQuestion({...source,options:['A','B']} ).type,undefined);const q={...source,prompt:'Just one >>> matching pair'};assert.equal(matchingQuestion(q),q);
});
