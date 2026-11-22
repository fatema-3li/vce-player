import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const proxy=process.env.HTTPS_PROXY?{server:process.env.HTTPS_PROXY,bypass:'localhost,127.0.0.1'}:undefined;
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox'],proxy});
const url=process.env.APP_URL||'http://localhost:3000';
const questions=[
 {id:'negative',prompt:'Which of the following is NOT a responsibility of the project sponsor?',options:['Risk register','Project charter'],answers:[0],
  explanation:'The cost performance index (CPI) is calculated as CPI = EV / AC.',
  caseStudyTitle:'Risk management',caseStudy:'Update the risk register before submitting a change request.\nFarah discussed the project charter with Acme Corp.'},
 {id:'multiple',prompt:'Which TWO actions should the project manager take? Select all that apply.',options:['Project charter','Risk register','Project sponsor'],answers:[0,1]},
 {id:'matching',type:'matching',prompt:'Match each event to its purpose.',options:['Sprint Review','Sprint Retrospective'],matchingPrompts:['Product feedback','Process improvement'],answers:[0,1]}
];

try{
 for(const viewport of [{width:1280,height:800},{width:390,height:844}]){
  const mobile=viewport.width<600;
  const context=await browser.newContext({viewport,isMobile:mobile,hasTouch:mobile,ignoreHTTPSErrors:Boolean(process.env.VCE_TEST_PROXY_CA)});
  const page=await context.newPage();
  const external=[];
  let activeModelDownload=false;
  page.on('request',request=>{
   const host=new URL(request.url()).hostname;
   if(['cdn.jsdelivr.net','huggingface.co'].includes(host)||host.endsWith('.hf.co')){
    external.push(request);
    if(request.url().includes('encoder_model_quantized.onnx'))activeModelDownload=true;
   }
  });
  const button=name=>page.getByRole('button',{name,exact:true});
  const toggle=root=>root.getByRole('button',{name:'العربية / English',exact:true}).click();
  const item=page.locator('.question');
  const prompt=item.locator('[data-translate=prompt]');
  const waitArabic=locator=>locator.locator('[lang=ar]').first().waitFor({timeout:150000});
  await page.goto(url);
  await page.locator('#import').setInputFiles({name:'local-translation.json',mimeType:'application/json',
   buffer:Buffer.from(JSON.stringify({title:'Local translation fixture',questions:questions.map(question=>({section:'PMP',...question}))}))});
  await page.getByRole('row').filter({hasText:'Local translation fixture'}).waitFor();
  await button('Start…').click();
  await page.locator('[name=candidate]').fill('Local test');
  await button('OK').click();
  await page.locator('[name=answer][value="0"]').check();
  await page.locator('#mark').check();
  const start=Date.now();
  await toggle(page);
  await waitArabic(item);
  const firstMs=Date.now()-start;
  const negative=await prompt.innerText();
  assert.match(negative,/ليس/);
  assert.match(negative,/راعي المشروع/);
  assert.equal(await prompt.evaluate(node=>getComputedStyle(node).direction),'rtl');
  assert.ok(activeModelDownload);
  assert.equal(await page.locator('[name=answer][value="0"]').isChecked(),true);
  assert.equal(await page.locator('#mark').isChecked(),true);
  await button('Show Answer').click();
  const explanation=item.locator('[data-translate=explanation][lang=ar]');
  await explanation.waitFor();
  assert.match(await explanation.innerText(),/CPI = EV \/ AC/);
  assert.match(await item.locator('.explanation b').innerText(),/Answer: A/);
  await button('View Case Study').click();
  const dialog=page.getByRole('dialog');
  const caseStudy=dialog.locator('.case-study[lang=ar]');
  await caseStudy.waitFor();
  assert.match(await caseStudy.innerText(),/سجل المخاطر/);
  assert.match(await caseStudy.innerText(),/طلب التغيير/);
  assert.match(await caseStudy.innerText(),/Acme Corp\./);
  await toggle(dialog);
  assert.equal(await dialog.locator('.case-study').innerText(),questions[0].caseStudy);
  await button('Close').click();
  assert.equal(await prompt.innerText(),questions[0].prompt);
  // The app is already open. Cached strings should remain available with the network disabled.
  await context.setOffline(true);
  await toggle(page);
  await waitArabic(item);
  assert.equal(await prompt.innerText(),negative);
  await context.setOffline(false);
  await button('Next').click();
  await waitArabic(item);
  assert.match(await prompt.innerText(),/الإجراءان.*اختر كل ما ينطبق/);
  await page.locator('[name=answer][value="0"]').check();
  await page.locator('[name=answer][value="1"]').check();
  await toggle(page);
  assert.equal(await page.locator('[name=answer]:checked').count(),2);
  await toggle(page);
  await button('Next').click();
  await item.getByText('الاجتماع الاستعادي للسبرنت',{exact:true}).waitFor();
  await page.locator('[data-card="0"]').click();
  await page.locator('[data-match="0"]').click();
  await page.locator('[data-card="1"]').click();
  await page.locator('[data-match="1"]').click();
  await toggle(page);
  assert.equal(await page.locator('[data-match="0"]').getAttribute('data-value'),'0');
  assert.equal(await page.locator('[data-match="1"]').getAttribute('data-value'),'1');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.ok(external.every(request=>request.method()==='GET'&&!request.postData()));
  console.log(`${viewport.width}px: initial Arabic in ${(firstMs/1000).toFixed(1)}s, "${negative}".`);
  await context.close();
 }
}finally{await browser.close()}
