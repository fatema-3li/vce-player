import assert from 'node:assert/strict';import {sample} from '../sample.js';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
 for(const mobile of [false,true]){
 const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},hasTouch:mobile,isMobile:mobile});await page.goto(process.env.APP_URL||'http://localhost:3000');
 await page.locator('#import').setInputFiles({name:'practice.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sample))});await page.getByRole('row').filter({hasText:'Exam Sample'}).waitFor();await page.getByRole('button',{name:'Start…',exact:true}).click();await page.locator('[name=candidate]').fill('Move test');await page.getByRole('button',{name:'OK',exact:true}).click();await page.getByRole('button',{name:'Calculator',exact:true}).click();
 const panel=page.locator('.floating-calculator'),handle=page.getByRole('button',{name:'Move calculator',exact:true});assert.equal(await page.locator(':modal').count(),0);const before=await panel.boundingBox(),h=await handle.boundingBox();
 const from={x:h.x+h.width/2,y:h.y+h.height/2},to={x:from.x-35,y:from.y+95};
 if(mobile){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[from]});for(let n=1;n<=8;n++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from.x+(to.x-from.x)*n/8,y:from.y+(to.y-from.y)*n/8}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
 else{await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});await page.mouse.up();}
 const after=await panel.boundingBox();assert.ok(after.y>before.y+70);assert.ok(after.x>=8);assert.ok(after.x+after.width<=(mobile?390:1440));
 await page.locator('#calculation').fill('1500+250');await page.getByRole('button',{name:'Equals',exact:true}).click();assert.equal(await page.locator('#calculation').inputValue(),'1750');
 await page.getByRole('button',{name:'Minimize calculator',exact:true}).click();assert.equal(await page.locator('[data-calc-body]').isVisible(),false);await page.locator('[name=answer][value="0"]').check();assert.equal(await page.locator('[name=answer][value="0"]').isChecked(),true);await page.getByRole('button',{name:'Expand calculator',exact:true}).click();assert.equal(await page.locator('#calculation').inputValue(),'1750');
 await page.getByRole('button',{name:'Move calculator',exact:true}).focus();await page.keyboard.press('ArrowUp');assert.ok((await panel.boundingBox()).y<after.y);
 await page.getByRole('button',{name:'Close',exact:true}).click();await page.getByRole('button',{name:'Calculator',exact:true}).click();assert.equal(await panel.count(),1);assert.equal(await page.locator('#calculation').inputValue(),'1750');
 await page.setViewportSize({width:mobile?844:1024,height:mobile?390:700});const fit=await panel.boundingBox();assert.ok(fit.y>=0);assert.ok(fit.y+fit.height<=(mobile?390:700)+1);await page.getByRole('button',{name:'Close',exact:true}).click();await page.close();
 }
 console.log('PASS: mouse/touch movement, nonmodal background answering, minimize/expand, keyboard movement, calculation preservation, singleton panel, viewport bounds.');
}finally{await browser.close()}
