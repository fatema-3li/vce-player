import assert from 'node:assert/strict';
import {sample} from '../sample.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const viewport of [{width:1440,height:900},{width:390,height:844}]){
  const page=await browser.newPage({viewport});const scripts=[];page.on('request',r=>{if(/\.js(?:\?|$)/.test(r.url()))scripts.push(r.url())});await page.goto(process.env.APP_URL||'http://localhost:3000');
  assert.ok(scripts.length>=6);const release=new URL(scripts[0]).searchParams.get('v');assert.ok(release);assert.ok(scripts.every(u=>new URL(u).searchParams.get('v')===release));
  await page.locator('#import').setInputFiles({name:'practice.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))});await page.getByRole('row').filter({hasText:'Exam Sample'}).waitFor();
  await page.getByRole('button',{name:'Start…',exact:true}).click();assert.equal(await page.locator('[name=mode][value=all]').isChecked(),true);assert.equal(await page.locator('[name=timer]').isChecked(),false);await page.locator('[name=candidate]').fill('Default check');await page.getByRole('button',{name:'OK',exact:true}).click();assert.match(await page.locator('#clock').innerText(),/Elapsed Time/);
  await page.getByRole('button',{name:'Save Session',exact:true}).click();const y=await page.getByRole('region',{name:'Saved sessions'}).boundingBox(),library=await page.locator('.library').boundingBox();assert.ok(y.y<library.y);assert.ok(y.y<300);
  await page.getByRole('button',{name:'Refresh app',exact:true}).click();await page.waitForURL(/\?v=/);await page.getByRole('button',{name:'Resume session',exact:true}).waitFor();assert.ok(await page.locator('[data-select]').count()>0);
  await page.getByRole('button',{name:'Start…',exact:true}).click();assert.equal(await page.locator('[name=mode][value=all]').isChecked(),true);await page.locator('[name=timer]').check();await page.getByRole('button',{name:'OK',exact:true}).click();assert.match(await page.locator('#clock').innerText(),/Time Remaining/);
  await page.close();
 }
 console.log('PASS: PC and phone defaults, timer opt-in, saved sessions near top, versioned assets, refresh preserves browser data.');
}finally{await browser.close()}
