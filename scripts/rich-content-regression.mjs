import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),alerts=[],errors=[];page.on('dialog',async d=>{alerts.push(d.message());await d.dismiss()});page.on('pageerror',e=>errors.push(e.message));await page.goto(process.env.APP_URL||'http://localhost:3000');
 for(const [key,title] of [['VCE_GOVERNANCE_TEST_FILE','10 Governance 2027'],['VCE_RISK_TEST_FILE','09 Risk 2027']]){
  if(!process.env[key])throw Error(`Set ${key} to the private fixture.`);await page.locator('#import').setInputFiles(process.env[key]);await page.getByRole('row').filter({hasText:title}).waitFor();
 }
 assert.deepEqual(alerts,[]);await page.reload();assert.equal(await page.locator('[data-select]').count(),2);await page.getByRole('row').filter({hasText:'09 Risk 2027'}).click();
 await page.getByRole('button',{name:'Start…',exact:true}).click();await page.locator('[name=candidate]').fill('Risk check');await page.locator('[name=mode][value=range]').check();await page.locator('[name=from]').fill('77');await page.locator('[name=to]').fill('78');await page.getByRole('button',{name:'OK',exact:true}).click();
 await page.getByRole('button',{name:'View Case Study',exact:true}).click();assert.match(await page.locator('.case-study').innerText(),/• Monthly, multi-functional risk sessions/);assert.equal(await page.locator('dialog .exam-image').count(),2);
 assert.equal(await page.locator('dialog .diagram-warning').count(),2);
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.locator('[name=answer][value="0"]').check();await page.getByRole('button',{name:'Show Answer',exact:true}).click();assert.match(await page.locator('.explanation').innerText(),/Answer: A/);await page.getByRole('button',{name:'Save Session',exact:true}).click();
 assert.deepEqual(alerts,[]);await page.reload();await page.getByRole('button',{name:'Resume session',exact:true}).click();assert.equal(await page.locator('[name=answer][value="0"]').isChecked(),true);assert.deepEqual(errors,[]);console.log('PASS: both files import and persist, Risk case-study bullets and damaged images are explicitly identified on phone, answers reveal and session resumes.');
}finally{await browser.close()}
