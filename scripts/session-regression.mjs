import {sample} from '../sample.js';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 const context=await browser.newContext({viewport:{width:390,height:844}});let page=await context.newPage();const url=process.env.APP_URL||'http://localhost:3000';
 await page.clock.install();await page.goto(url);assert.equal(await page.locator('nav').count(),0);
 await page.locator('#import').setInputFiles({name:'practice.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))});await page.getByRole('row').filter({hasText:'Exam Sample'}).waitFor();
 await page.getByRole('button',{name:'Start…',exact:true}).click();await page.locator('[name=candidate]').fill('Resume check');await page.getByRole('button',{name:'OK',exact:true}).click();
 await page.locator('#mark').check();await page.getByRole('button',{name:'Next',exact:true}).click();await page.locator('[name=answer][value="1"]').check();await page.locator('#mark').check();
 await page.selectOption('#review-filter','marked');await page.getByRole('button',{name:'Next',exact:true}).click();await page.clock.runFor(5000);
 const remaining=await page.locator('#clock').innerText();await page.getByRole('button',{name:'Save Session',exact:true}).click();await page.getByRole('button',{name:'Resume session',exact:true}).waitFor();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('session')));assert.equal(saved.questionId,'q2');assert.equal(saved.filter,'marked');assert.equal(saved.paused,true);assert.equal(saved.exam.questions,undefined);
 await page.clock.runFor(60000);await page.close();page=await context.newPage();await page.goto(url);await page.getByRole('button',{name:'Resume session',exact:true}).click();
 assert.match(await page.locator('.question').innerText(),/Item 2 of 2/);assert.equal(await page.locator('[name=answer][value="1"]').isChecked(),true);assert.equal(await page.locator('#mark').isChecked(),true);assert.equal(await page.locator('#clock').innerText(),remaining);
 await page.getByRole('button',{name:'Save Session',exact:true}).click();const other=await browser.newContext();const otherPage=await other.newPage();await otherPage.goto(url);assert.equal(await otherPage.getByRole('button',{name:'Resume session',exact:true}).count(),0);await other.close();
 console.log('PASS: save exits to library; new tab resumes filtered question, answers, marks and timer; independent browser storage stays separate.');
}finally{await browser.close()}
