import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}});await page.goto(process.env.APP_URL||'http://localhost:3000');
 if(!process.env.VCE_AGILE_TEST_FILE)throw Error('Set VCE_AGILE_TEST_FILE to the private Agile fixture.');
 await page.locator('#import').setInputFiles(process.env.VCE_AGILE_TEST_FILE);await page.getByRole('row').filter({hasText:'02 Agile 2027'}).waitFor();
 await page.getByRole('button',{name:'Start…',exact:true}).click();await page.locator('[name=candidate]').fill('Matching check');await page.locator('[name=mode][value=range]').check();await page.locator('[name=from]').fill('7');await page.locator('[name=to]').fill('7');await page.getByRole('button',{name:'OK',exact:true}).click();
 assert.equal(await page.locator('[data-match]').count(),4);assert.equal(await page.locator('[name=answer]').count(),0);assert.equal(await page.locator('.explanation').count(),0);assert.ok(!(await page.locator('.question p').innerText()).includes('>>>'));
 await page.locator('[data-match="0"]').selectOption({label:'Iteration Review'});await page.getByRole('button',{name:'Save Session',exact:true}).click();assert.match(await page.getByRole('region',{name:'Saved sessions'}).innerText(),/0 \/ 1 answered/);await page.reload();await page.getByRole('button',{name:'Resume session',exact:true}).click();assert.equal(await page.locator('[data-match="0"] option:checked').innerText(),'Iteration Review');
 for(const [i,label] of ['Iteration Review','Iteration Planning','Iteration retrospective','Daily meeting'].entries())await page.locator(`[data-match="${i}"]`).selectOption({label});
 await page.getByRole('button',{name:'Show Answer',exact:true}).click();assert.equal(await page.locator('.matching-row .right').count(),4);assert.match(await page.locator('.explanation').innerText(),/four-hour/);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'End Exam',exact:true}).click();assert.match(await page.locator('.report').innerText(),/Your score: 1000\/1000/);await page.selectOption('#report-review','all');assert.equal(await page.locator('[data-match]:disabled').count(),4);
 await page.evaluate(()=>{
  const exams=JSON.parse(localStorage.getItem('exams')),exam=exams.find(e=>e.title==='02 Agile 2027'),q=exam.questions[6];
  const legacy={...q,prompt:q.prompt+'\n'+q.matchingPrompts.map((p,i)=>p+' >>> '+q.options[q.answers[i]]).join('\n')+'\nExplanation\n'+q.explanation,options:['','','',''],answers:[0],explanation:''};
  delete legacy.type;delete legacy.matchingPrompts;delete legacy.matchingFromText;exam.questions[6]=legacy;
  localStorage.setItem('exams',JSON.stringify(exams));localStorage.setItem('session',JSON.stringify({exam,questions:[legacy],candidate:'Legacy',answers:{[legacy.id]:[0]},marked:[],index:0,elapsed:0,limit:null,paused:true,filter:'all'}));
 });await page.reload();await page.getByRole('button',{name:'Resume session',exact:true}).click();assert.equal(await page.locator('[data-match]').count(),4);assert.deepEqual(await page.locator('[data-match]').evaluateAll(items=>items.map(i=>i.value)),['-1','-1','-1','-1']);
 console.log('PASS: native Agile matching question, hidden solutions, partial progress, resume, mobile layout, full score, read-only review.');
}finally{await browser.close()}
