import {test} from 'node:test';
import assert from 'node:assert/strict';
import {bundledTranslation} from '../bundled-translations.js';
import {introductionArabic} from '../introduction-arabic.js';

test('approved Introduction catalogue has complete fingerprint-bound translations',()=>{
 assert.equal(introductionArabic.length,40);
 let count=0;
 for(const q of introductionArabic){
  assert.match(q.promptHash,/^[a-f0-9]{64}$/);
  for(const [field,entry] of Object.entries(q.fields)){
   assert.match(entry.sourceHash,/^[a-f0-9]{64}$/);
   entry.ar.forEach((ar,index)=>{
    assert.match(ar,/[\u0600-\u06ff]/);
    assert.equal(bundledTranslation(q.id,q.promptHash,field,entry.sourceHash,index),ar);
    count++;
   });
  }
 }
 assert.equal(count,489);
});

test('unrelated or changed exam text cannot receive a guessed translation',()=>{
 const q=introductionArabic[0],f=q.fields.prompt;
 assert.equal(bundledTranslation('other-id',q.promptHash,'prompt',f.sourceHash,0),undefined);
 assert.equal(bundledTranslation(q.id,'0'.repeat(64),'prompt',f.sourceHash,0),undefined);
 assert.equal(bundledTranslation(q.id,q.promptHash,'prompt','0'.repeat(64),0),undefined);
 assert.equal(bundledTranslation(q.id,q.promptHash,'unknown',f.sourceHash,0),undefined);
 assert.equal(bundledTranslation(q.id,q.promptHash,'prompt',f.sourceHash,999),undefined);
});
