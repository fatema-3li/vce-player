import test from 'node:test';
import assert from 'node:assert/strict';
import {examSegments,fingerprint,indexMemory,resolveSegment,mergeMemory,translationSnapshot,validateMemory,memoryFormat} from '../translation-data.js';
import {score} from '../engine.js';
const scope=async()=>({examId:'private-test',questionId:'q1',field:'prompt',sourceHash:await fingerprint('Do not stop.'),index:0});
const empty=()=>({format:memoryFormat,segments:[],glossary:[]});
test('correction history supports reverting to an earlier translation',async()=>{
 const a={role:'prompt',en:'Do not stop.',ar:'لا تتوقف.',status:'verified',scope:await scope()},b={...a,ar:'لا تتوقف عن العمل.'};
 const merged=mergeMemory(mergeMemory({...empty(),segments:[a]},{segments:[b],glossary:[]}),{segments:[a],glossary:[]});
 assert.equal(merged.segments.length,2);
 assert.equal(resolveSegment(a.en,'prompt',0,a.scope,indexMemory(merged)).text,a.ar);
});
test('ambiguous exact reuse falls back to English and respects field roles',()=>{
 const entries=['قبول الخطر.','قبول التسليم.'].map(ar=>({role:'option',en:'Accept.',ar,status:'verified',reusable:true}));
 const memory=indexMemory({...empty(),segments:entries});
 assert.equal(resolveSegment('Accept.','option-0',0,{},memory).translated,0);
 assert.equal(resolveSegment('Accept.','prompt',0,{},memory).translated,0);
});
test('only explicitly reusable whole sentences can form partial translations',()=>{
 const memory=indexMemory({...empty(),segments:[{role:'prompt',en:'Do not stop.',ar:'لا تتوقف.',status:'verified',reusable:true}]});
 const partial=resolveSegment('Do not stop. Review the risk.','prompt',0,{},memory);
 assert.equal(partial.translated,1);assert.equal(partial.total,2);assert.match(partial.text,/لا تتوقف.*Review the risk/s);
 assert.equal(resolveSegment('Do not stop work.','prompt',0,{},memory).translated,0);
});
test('scoped review records veto reusable translations',async()=>{
 const s=await scope();
 const memory=indexMemory({...empty(),segments:[{role:'prompt',en:'Do not stop.',ar:'لا تتوقف.',status:'verified'},
 {role:'prompt',en:'Do not stop.',status:'needs-review',scope:s}]});
 assert.equal(resolveSegment('Do not stop.','prompt',0,s,memory).translated,0);
});
test('snapshot preserves source, matching relationships and scores',async()=>{
 const q={id:'q1',section:'Test',prompt:'Match.',type:'matching',options:['Review','Planning'],matchingPrompts:['Feedback','Goal'],answers:[0,1],caseStudy:'Study.'};
 const exam={title:'Synthetic fixture',questions:[q]},snap=await translationSnapshot(exam,empty());
 assert.ok(snap.sourceId.startsWith('exam-sha256-'));
 assert.deepEqual(exam,{title:'Synthetic fixture',questions:[q]});
 const {translation,...unchanged}=snap.questions[0];assert.deepEqual(unchanged,q);
 assert.equal(translation.fields['match-1'].segments.length,1);
 assert.deepEqual(score(snap.questions,{q1:[0,1]}),score(exam.questions,{q1:[0,1]}));
 assert.equal((await translationSnapshot(exam,empty())).sourceId,snap.sourceId);
 snap.questions[0].translation.fields.prompt.segments[0]={ar:'طابِق.',status:'verified'};
 const records=await examSegments(snap);assert.equal(records.length,1);
 const refreshed=await translationSnapshot(snap,{...empty(),segments:[{...records[0],ar:'طابق العناصر.'}]});
 assert.equal(refreshed.questions[0].translation.fields.prompt.segments[0].ar,'طابق العناصر.');
 snap.questions[0].prompt='Changed source.';await assert.rejects(()=>examSegments(snap),/fingerprint mismatch/);
});
test('invalid memory and empty verified records are rejected',()=>{
 assert.throws(()=>validateMemory({...empty(),segments:[{role:'prompt',en:'Source',ar:'',status:'verified'}]}));
 assert.throws(()=>validateMemory({...empty(),segments:[{role:'answerKey',en:'Source',ar:'النص',status:'verified'}]}));
 assert.throws(()=>validateMemory({...empty(),glossary:[{en:'term',ar:'[[VCE_IMAGE:image/png;base64,AA==]]'}]}));
});
