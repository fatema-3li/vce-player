import assert from 'node:assert/strict';
import {examSegments,fingerprint,memoryFormat} from '../translation-data.js';

const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const url=process.env.APP_URL||'http://localhost:3000';
const image='[[VCE_IMAGE:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwAFgAI/ScLbtAAAAABJRU5ErkJggg==]]';

async function bilingual(question,fields){
 question.translation={version:1,fields:{}};
 for(const [field,[en,ar]] of Object.entries(fields)){
  question.translation.fields[field]={sourceHash:await fingerprint(en),segments:[{ar,status:'verified',reusable:true}]};
 }
 return question;
}

const q=await bilingual({
 id:'choose',section:'Scope',prompt:'Which sponsor does not approve 10%?',options:['Sponsor A','Sponsor B'],answers:[1],
 explanation:'Sponsor B does not approve 10%.',caseStudyTitle:'Budget study',caseStudy:'The request requires 10%.\n'+image
},{
 prompt:['Which sponsor does not approve 10%?','أي راعٍ لا يوافق على 10%؟'],
 'option-0':['Sponsor A','الراعي A'],
 'option-1':['Sponsor B','الراعي B'],
 explanation:['Sponsor B does not approve 10%.','الراعي B لا يوافق على 10%.'],
 section:['Scope','النطاق'],
 caseStudyTitle:['Budget study','دراسة الميزانية'],
 caseStudy:['The request requires 10%.\n'+image,'يتطلب الطلب 10%.']
});
const match=await bilingual({
 id:'match',section:'Scope',type:'matching',prompt:'Match each event.',options:['Sprint Review','Retrospective'],
 matchingPrompts:['Process improvement','Product feedback'],answers:[1,0]
},{
 prompt:['Match each event.','طابِق كل فعالية.'],
 'option-0':['Sprint Review','مراجعة السبرنت'],
 'option-1':['Retrospective','الاجتماع الاستعادي'],
 'match-0':['Process improvement','تحسين العمليات'],
 'match-1':['Product feedback','الملاحظات على المنتج']
});
const plain={id:'reuse',section:'Scope',prompt:q.prompt+' Consider the latest data.',options:q.options,answers:[1]};
const exam={sourceId:'test-bilingual',title:'Stored Arabic fixture',questions:[q,match,plain]};
const stale=structuredClone(exam);
stale.questions[0].prompt='Which sponsor approves 10%?';
await assert.rejects(()=>examSegments(stale),/fingerprint mismatch/);

try{
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  const context=await browser.newContext({viewport,isMobile:viewport.width<700,hasTouch:viewport.width<700});
  const page=await context.newPage();
  const errors=[];
  const external=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>{
   if(route.request().url().startsWith(new URL(url).origin+'/'))return route.continue();
   external.push(route.request().url());
   return route.abort();
  });
  const button=name=>page.getByRole('button',{name,exact:true});
  const toggle=()=>button('العربية / English').click();
  const prompt=page.locator('[data-translate=prompt]');
  const status=page.locator('#app [data-translation-status]');
  const importJSON=data=>page.locator('#import').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
  await page.goto(url);
  await importJSON(exam);
  await page.getByRole('row').filter({hasText:exam.title}).waitFor();
  const correction=(await examSegments(exam)).find(entry=>entry.scope.questionId===q.id&&entry.scope.field==='explanation');
  correction.ar='الراعي B لا يوافق على نسبة 10%.';
  await importJSON({format:memoryFormat,segments:[correction],glossary:[{en:'scope',ar:'النطاق'}]});
  await page.getByText('Translation memory imported.',{exact:false}).waitFor();
  await button('Start…').click();
  await page.getByRole('textbox',{name:'Your name'}).fill('Test candidate');
  await button('OK').click();
  await page.locator('[name=answer][value="1"]').check();
  await page.locator('#mark').check();
  await button('Show Answer').click();
  await context.setOffline(true);
  const clock=await page.locator('#clock').innerText();
  await toggle();
  await prompt.getByText('أي راعٍ لا يوافق على 10%؟',{exact:true}).waitFor();
  assert.match(await status.innerText(),/مكتملة/);
  assert.equal(await prompt.getAttribute('dir'),'rtl');
  assert.equal(await page.locator('[name=answer][value="1"]').isChecked(),true);
  assert.equal(await page.locator('#mark').isChecked(),true);
  assert.match(await page.locator('#clock').innerText(),/^Time Remaining: 16:(40|39):/);
  assert.match(clock,/16:(40|39):/);
  assert.match(await page.locator('.explanation').innerText(),/الإجابة: B.*?الراعي B لا يوافق على نسبة 10%/s);
  await button('عرض دراسة الحالة').click();
  await page.locator('dialog').getByText('يتطلب الطلب 10%.').waitFor();
  assert.equal(await page.locator('dialog .exam-image').count(),1);
  await button('Close').click();

  await button('Next').click();
  await page.locator('[data-card="1"]').click();
  await page.locator('[data-match="0"]').click();
  await page.locator('[data-card="0"]').click();
  await page.locator('[data-match="1"]').click();
  await toggle();
  assert.equal(await page.locator('[data-match="0"]').innerText(),'Retrospective');
  await toggle();
  await page.locator('[data-match="0"]').getByText('الاجتماع الاستعادي').waitFor();
  await page.locator('#mark').check();
  await button('Save Session').click();
  await button('Resume session').waitFor();
  await context.setOffline(false);
  await page.reload();
  await button('Resume session').click();
  await page.locator('[data-match="0"]').getByText('الاجتماع الاستعادي').waitFor();
  assert.equal(await page.locator('[data-match="1"]').innerText(),'مراجعة السبرنت');
  assert.equal(await page.locator('#mark').isChecked(),true);

  await button('Next').click();
  await prompt.getByText(/أي راعٍ لا يوافق على 10%؟.*Consider the latest data/).waitFor();
  assert.match(await status.innerText(),/جزئية/);
  await page.locator('[name=answer][value="1"]').check();
  await button('End Exam').click();
  await page.locator('dialog[open] [type=submit]').click();
  await page.locator('dialog[open] [type=submit]').click();
  await page.getByText('3 correct · 0 incorrect or unanswered · 3 total questions').waitFor();
  await button('View Marked').click();
  await prompt.getByText('أي راعٍ لا يوافق على 10%؟',{exact:true}).waitFor();
  await toggle();
  assert.equal(await prompt.innerText(),q.prompt);
  assert.equal(await page.locator('#review-filter').inputValue(),'marked');
  assert.deepEqual(external,[]);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS: stored English–Arabic translation, matching, Show Answer, partial reuse, save/resume and grading at '+viewport.width+'px');
 }
}finally{await browser.close()}
