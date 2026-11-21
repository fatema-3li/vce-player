import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const url=process.env.APP_URL||'http://localhost:3000';
const image='[[VCE_IMAGE:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==]]';
const exam={title:'Translation fixture',questions:[
 {id:'multiple',section:'Scope',prompt:'Which sponsor does not approve 10%?',options:['Sponsor A','Sponsor B'],answers:[1],explanation:'Option B does not approve 10%.',caseStudyTitle:'Budget study',caseStudy:'The change request requires 10%.\n'+image},
 {id:'match',section:'Agile',type:'matching',prompt:'Match the events.',options:['Sprint Review','Retrospective'],answers:[1,0],matchingPrompts:['Process improvement','Product feedback']},
 {id:'error',section:'Agile',prompt:'Fallback question',options:['First','Second'],answers:[0]}
]};
const translations=new Map(Object.entries({
 'Which sponsor does not approve 10%?':'أي راعٍ لا يوافق على 10%؟',
 'Sponsor A':'الراعي A','Sponsor B':'الراعي B','Option B does not approve 10%.':'الخيار B لا يوافق على 10%.',
 'Budget study':'دراسة الميزانية','The change request requires 10%.':'يتطلب طلب التغيير 10%.',
 'Match the events.':'طابِق الفعاليات.','Sprint Review':'مراجعة السبرنت','Retrospective':'الاجتماع الاستعادي',
 'Process improvement':'تحسين العمليات','Product feedback':'الملاحظات على المنتج',
 'Fallback question':'سؤال بديل','First':'الأول','Second':'الثاني','Updated fallback question':'السؤال البديل المحدّث'
}));
try{
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  const mobile=viewport.width<700;
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile});
  const page=await context.newPage();
  await page.route('**/translation-config.js*',route=>route.fulfill({contentType:'text/javascript',body:"export const translationEndpoint='/mock-translation';"}));
  let requests=[],fail=true;
  await page.route('**/mock-translation',async route=>{
   const {texts}=route.request().postDataJSON();
   requests.push(texts);
   assert.ok(texts.every(text=>!text.includes('VCE_IMAGE')&&!text.includes('Test candidate')));
   if(fail&&texts.includes('Fallback question')){await route.fulfill({status:502});return}
   await route.fulfill({json:{translations:texts.map(text=>translations.get(text.trim()))}});
  });
  const button=name=>page.getByRole('button',{name,exact:true});
  const toggle=()=>button('العربية / English').click();
  const prompt=page.locator('[data-translate=prompt]');
  await page.goto(url);
  const importExam=async data=>{
   await page.locator('#import').setInputFiles({name:'fixture.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});
   await page.getByRole('row').filter({hasText:data.title}).waitFor();
  };
  await importExam(exam);
  await button('Start…').click();
  assert.equal(await page.locator('dialog input').count(),1);
  await page.getByRole('textbox',{name:'Your name'}).fill('Test candidate');
  await button('OK').click();
  assert.match(await page.locator('#clock').innerText(),/^Time Remaining: 16:(40:00|39:59)$/);
  const checked=page.locator('[name=answer][value="1"]');
  await checked.check();
  await page.locator('#mark').check();
  await toggle();
  await page.getByText('أي راعٍ لا يوافق على 10%؟',{exact:true}).waitFor();
  assert.equal(await prompt.evaluate(e=>getComputedStyle(e).direction),'rtl');
  assert.equal(await checked.isChecked(),true);
  assert.equal(await page.locator('#mark').isChecked(),true);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.equal(requests.length,1);
  await button('Show Answer').click();
  await page.getByText('الخيار B لا يوافق على 10%.',{exact:true}).waitFor();
  assert.match(await page.locator('.explanation b').innerText(),/Answer: B/);
  await button('View Case Study').click();
  await page.getByText('دراسة الميزانية',{exact:true}).waitFor();
  assert.match(await page.locator('.case-study').innerText(),/طلب التغيير يتطلب|يتطلب طلب التغيير/);
  assert.equal(await page.locator('.case-study img').getAttribute('src'),'data:'+image.slice(12,-2));
  await button('Close').click();
  await toggle();
  assert.equal(await prompt.innerText(),exam.questions[0].prompt);
  assert.equal(await checked.isChecked(),true);
  await toggle();
  await page.getByText('أي راعٍ لا يوافق على 10%؟',{exact:true}).waitFor();
  assert.equal(requests.length,3);
  await button('Next').click();
  await page.getByText('طابِق الفعاليات.',{exact:true}).waitFor();
  if(mobile){
   await page.locator('[data-card="1"]').tap();
   await page.locator('[data-match="0"]').tap();
  }else{
   const card=await page.locator('[data-card="1"]').boundingBox();
   const target=await page.locator('[data-match="0"]').boundingBox();
   await page.mouse.move(card.x+card.width/2,card.y+card.height/2);
   await page.mouse.down();
   await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:10});
   await page.mouse.up();
  }
  await page.locator('[data-card="0"]').click();
  await page.locator('[data-match="1"]').click();
  await toggle();
  assert.equal(await page.locator('[data-match="0"]').getAttribute('data-value'),'1');
  assert.equal(await page.locator('[data-match="1"]').getAttribute('data-value'),'0');
  assert.equal(await prompt.innerText(),exam.questions[1].prompt);
  await toggle();
  await button('Next').click();
  await page.getByText(/could not be translated/).waitFor();
  assert.equal(await prompt.innerText(),exam.questions[2].prompt);
  fail=false;
  await button('Retry').click();
  await page.getByText('سؤال بديل',{exact:true}).waitFor();
  await page.locator('[name=answer][value="0"]').check();
  await button('Save Session').click();
  await button('Resume session').waitFor();
  await page.reload();
  await button('Resume session').click();
  assert.equal(await prompt.innerText(),exam.questions[2].prompt);
  const before=requests.length;
  await toggle();
  await page.getByText('سؤال بديل',{exact:true}).waitFor();
  assert.equal(requests.length,before);
  await button('End Exam').click();
  await button('Continue').click();
  await button('Submit Exam').click();
  await page.locator('.report').waitFor();
  assert.match(await page.locator('.report').innerText(),/Your score: 1000\/1000/);
  await button('View Marked').click();
  await page.getByText('أي راعٍ لا يوافق على 10%؟',{exact:true}).waitFor();
  await toggle();
  assert.equal(await prompt.innerText(),exam.questions[0].prompt);
  await button('Back to Report').click();
  await button('Exit').click();
  await importExam({...exam,title:'Updated exam',questions:[{...exam.questions[2],prompt:'Updated fallback question'}]});
  await button('Start…').click();
  await button('OK').click();
  await toggle();
  await page.getByText('السؤال البديل المحدّث',{exact:true}).waitFor();
  assert.deepEqual(requests.at(-1),['Updated fallback question','First','Second']);
  await context.close();
 }
 console.log('PASS: Arabic and English on desktop and phone, on-demand requests, cache invalidation, retry, matching, scores and saved sessions.');
}finally{await browser.close()}
