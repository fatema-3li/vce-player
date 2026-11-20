import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
try{
const p=await browser.newPage({viewport:{width:390,height:844}});const url=process.env.APP_URL||'http://localhost:3000';await p.goto(url);
assert.equal(await p.getByRole('button',{name:'Sample JSON',exact:true}).count(),0);assert.equal(await p.locator('[data-select]').count(),0);
const exam={id:'personal',title:'Personal exam',questions:[{id:'q1',section:'General',prompt:'Diagram\n[[VCE_IMAGE:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC]]',options:['A','B'],answers:[0]}]};
const seeded=await browser.newContext({viewport:{width:390,height:844}});
await seeded.addInitScript(e=>localStorage.setItem('exams',JSON.stringify([{id:'sample',title:'Exam Sample',questions:[]},e])),exam);
const migrated=await seeded.newPage();
await migrated.goto(url);
await migrated.getByRole('row').filter({hasText:'Personal exam'}).waitFor();
assert.equal(await migrated.locator('[data-select]').count(),1);
await migrated.getByRole('button',{name:'Start…',exact:true}).click();await migrated.locator('[name=candidate]').fill('Library check');await migrated.getByRole('button',{name:'OK',exact:true}).click();
await migrated.getByRole('button',{name:'View full diagram',exact:true}).click();await migrated.locator('.diagram-viewer img').waitFor();assert.match(await migrated.locator('.diagram-viewer img').getAttribute('src'),/^data:image\/png/);await migrated.getByRole('button',{name:'Close',exact:true}).click();
await migrated.locator('[name=answer][value="0"]').check();await migrated.getByRole('button',{name:'Save Session',exact:true}).click();const table=migrated.getByRole('region',{name:'Saved sessions'});await table.getByRole('button',{name:'Resume session',exact:true}).waitFor();assert.match(await table.innerText(),/Personal exam/);assert.match(await table.innerText(),/1 \/ 1 answered/);
await table.getByRole('button',{name:'Resume session',exact:true}).click();assert.equal(await migrated.locator('[name=answer][value="0"]').isChecked(),true);await migrated.getByRole('button',{name:'Save Session',exact:true}).click();migrated.once('dialog',d=>d.accept());await table.getByRole('button',{name:'Delete',exact:true}).click();await table.getByText(/No saved session yet/).waitFor();assert.match(await table.innerText(),/No saved session yet/);assert.equal(await migrated.locator('[data-select]').count(),1);console.log('PASS: empty personal library, sample migration preserves imports, separate session table resumes/deletes, diagram opens at full resolution.');
}finally{await browser.close()}
