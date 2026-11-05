// Run with PLAYWRIGHT_MODULE pointing to an installed Playwright index.mjs.
// Start npm start first. Uses system Chromium; no app dependencies are required.
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:390,height:844}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.APP_URL||'http://localhost:3000');
 await page.getByRole('button',{name:'History',exact:true}).click();
 assert.match(await page.locator('dialog').innerText(),/No completed exams yet/);
 await page.getByRole('button',{name:'Cancel',exact:true}).click();
 await page.getByRole('button',{name:'Start…',exact:true}).click();
 await page.locator('[name=candidate]').fill('History regression');
 assert.equal(await page.locator('[name=training]').isChecked(),false);
 await page.getByRole('button',{name:'OK',exact:true}).click();
 await page.locator('[name=answer][value="0"]').check();
 await page.getByRole('button',{name:'Show Answer',exact:true}).click();
 assert.match(await page.locator('.explanation').innerText(),/Answer: A/);
 await page.getByRole('button',{name:'Hide Answer',exact:true}).click();
 assert.equal(await page.locator('.explanation').count(),0);
 assert.equal(await page.locator('[name=answer][value="0"]').isChecked(),true);
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'End Exam',exact:true}).click();
 assert.match(await page.locator('.report').innerText(),/Your score: 200\/1000/);
 await page.getByRole('button',{name:'Exit',exact:true}).click();
 await page.reload();
 await page.getByRole('button',{name:'History',exact:true}).click();
 assert.match(await page.locator('dialog').innerText(),/History regression/);
 let navigations=0;page.on('framenavigated',()=>navigations++);
 await page.getByRole('button',{name:'View report',exact:true}).click();
 await page.waitForTimeout(500);
 assert.equal(navigations,0,'Opening history must not submit its form and reload the page');
 assert.equal(await page.locator('dialog').count(),0);
 assert.match(await page.locator('.report').innerText(),/Your score: 200\/1000/);
 await page.selectOption('#report-review','all');
 assert.match(await page.locator('.explanation').innerText(),/Answer: A/);
 assert.deepEqual(errors,[]);
 console.log('PASS: mobile history persists and opens without navigation; Show/Hide Answer works in standard mode without changing selections or scores.');
} finally {await browser.close()}
