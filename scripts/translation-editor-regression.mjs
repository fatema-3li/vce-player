// Synthetic content only. Run alongside the existing translation regression.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
const fixture={title:'Synthetic editor fixture',questions:[{id:'q1',section:'Test',prompt:'Keep the original.',options:['Choice one','Choice two'],answers:[1],explanation:'The second choice is correct.'}]};
try{
 for(const width of [1280,390]){
  const context=await browser.newContext({viewport:{width,height:844}}),page=await context.newPage();
  await page.goto(process.env.APP_URL||'http://localhost:3000');
  await page.locator('#import').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});
  await page.getByRole('row').filter({hasText:fixture.title}).waitFor();
  await page.getByRole('button',{name:'Properties',exact:true}).click();
  await page.getByRole('button',{name:'Edit Arabic translations',exact:true}).click();
  const row=page.locator('[data-field="prompt"][data-segment="0"]');
  await row.locator('[data-ar]').fill('احتفظ بالنص الأصلي.');
  await row.locator('[data-status]').selectOption('verified');
  await page.getByRole('button',{name:'Save translations',exact:true}).click();
  await page.getByText('Saved locally. Export a backup to keep a separate copy.').waitFor();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export bilingual exam',exact:true}).click();
  const download=await downloadPromise;
  const {readFile}=await import('node:fs/promises');
  const exported=JSON.parse(await readFile(await download.path(),'utf8'));
  assert.equal(exported.questions[0].prompt,fixture.questions[0].prompt);
  assert.deepEqual(exported.questions[0].answers,[1]);
  assert.equal(exported.questions[0].translation.fields.prompt.segments[0].ar,'احتفظ بالنص الأصلي.');
  assert.ok(exported.sourceId);
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByRole('button',{name:'Start…',exact:true}).click();
  await page.getByRole('textbox',{name:'Your name'}).fill('Synthetic tester');
  await page.getByRole('button',{name:'OK',exact:true}).click();
  await page.locator('[name=answer][value="1"]').check();
  await page.getByRole('button',{name:'العربية / English',exact:true}).click();
  await page.locator('[data-translate=prompt]').getByText('احتفظ بالنص الأصلي.').waitFor();
  await page.getByRole('button',{name:'Edit Arabic',exact:true}).click();
  await row.locator('[data-ar]').fill('نص منقح.');
  await row.locator('[data-status]').selectOption('needs-review');
  await page.getByRole('button',{name:'Save translations',exact:true}).click();
  await page.getByText('Saved locally. Export a backup to keep a separate copy.').waitFor();
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.locator('[data-translate=prompt]').getByText('Keep the original.').waitFor();
  assert.equal(await page.locator('[name=answer][value="1"]').isChecked(),true);
  await context.close();console.log('PASS: translation editor and private export at '+width+'px');
 }
}finally{await browser.close()}
