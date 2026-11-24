import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseVce} from '../vce.js';
import {questionFields,textParts,fingerprint} from '../translation-data.js';
import {applyTranslation,toggleLanguage} from '../translation.js';
import {bundledTranslation} from '../bundled-translations.js';
import {renderContent} from '../content.js';

// Minimal DOM adapter exercises the real renderer with empty browser memory.
function rootFor(fields){
 const elements=Object.keys(fields).filter(k=>fields[k]?.trim()).map(field=>({
  dataset:{translate:field},childNodes:[],tagName:'DIV',innerHTML:'',
  replaceChildren(){},removeAttribute(){},hasAttribute(k){return k==='data-translate';}
 }));
 const status={isConnected:true},layout={classList:{toggle(){}}},toggle={setAttribute(){}};
 return {elements,status,tagName:'DIV',
  querySelector(s){return s==='[data-translation-status]'?status:s==='[data-translation-layout]'?layout:s==='[data-translation-toggle]'?toggle:null;},
  querySelectorAll(){return elements;}
 };
}
test('native VCE renders full bundled Arabic without sourceId or imported memory',{skip:!process.env.VCE_TEST_FILE},async()=>{
 const exam=parseVce(readFileSync(process.env.VCE_TEST_FILE));
 assert.equal(exam.sourceId,undefined);
 toggleLanguage();
 try{
  let count=0;
  for(const q of exam.questions){
   const fields=questionFields(q),root=rootFor(fields);
   await applyTranslation(root,fields,{questionId:q.id});
   assert.match(root.status.textContent,/مكتملة/);
   const promptHash=await fingerprint(q.prompt);
   for(const el of root.elements){
    const field=el.dataset.translate,source=fields[field],hash=await fingerprint(source);
    let index=0;
    const expected=textParts(source).map(p=>{
     if(!p.text?.trim())return p.image??p.text;
     const ar=bundledTranslation(q.id,promptHash,field,hash,index++);
     count++;assert.ok(ar);
     return p.text.replace(p.text.trim(),()=>ar);
    }).join('');
    assert.equal(el.innerHTML,renderContent(expected));
    assert.equal(el.dir,'rtl');
   }
  }
  assert.equal(count,489);
 }finally{toggleLanguage();}
});
