import {openCalculator} from './calculator.js?v=blue-player-20261121';
import {renderMatching,bindMatching} from './matching-ui.js?v=blue-player-20261121';
import {matchingQuestion} from './matching.js?v=blue-player-20261121';
import {renderContent,imageTokens} from './content.js?v=blue-player-20261121';
import {parseVce} from './vce.js?v=blue-player-20261121';
import {score,correct,validateExam,isAnswered} from './engine.js?v=blue-player-20261121';
const $=s=>document.querySelector(s), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {initializeStorage,read,write} from './storage.js?v=blue-player-20261121';
let exams=[],selected,session=null,view='library',show=false,review=false,filter='all',message='',textSize=100;
let saving=false;
const own=(record,key,fallback)=>Object.hasOwn(record,key)?record[key]:fallback;

async function save(changes,silent=false){
 try{await write(changes);return true}catch{
  if(!silent) alert('Browser storage is full or unavailable. Your changes could not be saved.');
  return false;
 }
}
function applyTextSize(){document.documentElement.style.setProperty('--exam-text-size',`${textSize}%`);}
function textTools(){return `<div class="text-tools" role="group" aria-label="Text size"><button data-action="text-smaller" aria-label="Decrease text size" ${textSize===100?'disabled':''}>A−</button><button data-action="text-reset" aria-label="Reset text size">${textSize}%</button><button data-action="text-larger" aria-label="Increase text size" ${textSize===200?'disabled':''}>A+</button></div>`;}
const passing=e=>Number.isInteger(e.passingScore)&&e.passingScore>=0&&e.passingScore<=1000?e.passingScore:700;
const exam=()=>exams.find(e=>e.id===selected), fmt=n=>`${Math.floor(n/3600)}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
function frame(body,foot='',status=''){ $('#app').innerHTML=`<main class="shell ${['exam','section'].includes(view)?'exam-shell':''}"><header>${['exam','section'].includes(view)?`<span>${esc(session.exam.title)} <span class="candidate">· ${esc(session.candidate)}</span></span><span id="clock">${review?'':clock()}</span>`:`<span class="icon">P</span><span>${esc(session&&view!=='library'?session.exam.title+' – Exam A – ': '')}VCE Player</span>`}</header>${body}${status?`<div class="status">${status}</div>`:''}${foot?`<div class="footer">${foot}</div>`:''}</main>`; }
function library(){session=null;view='library';frame(`<div class="strip app-toolbar"><span class="muted">Your personal exam practice library</span><span class="spacer"></span>${textTools()}</div><div class="content">${savedSessionsTable()}<div class="library"><table><thead><tr><th>Title</th><th>File name</th><th>Questions</th></tr></thead><tbody>${exams.map(e=>`<tr tabindex="0" data-select="${esc(e.id)}" class="${e.id===selected?'selected':''}"><td>▣ &nbsp;${esc(e.number||'')} ${esc(e.title)}</td><td class="muted">${esc(e.title)}.json</td><td>${e.questions.length}</td></tr>`).join('')}</tbody></table><div class="actions"><button class="primary" data-action="setup" ${exam()?'':'disabled'}>Start…</button><button data-action="import">Add…</button><button data-action="remove" ${exam()?'':'disabled'}>Remove</button><button data-action="properties" ${exam()?'':'disabled'}>Properties</button><button data-action="history">History</button><button data-action="refresh-app">Refresh app</button></div></div>${exams.length?'':'<p class="empty">Add your VCE exam to begin.</p>'}</div><div class="notice">Import .vce format 3.1 exams with text choices, or JSON exams. Unsupported VCE versions and question types are reported.</div>`, '', `${esc(message)} Select an exam and click Start. Progress and scores are stored in this browser.`);bind();}
function savedSessionsTable(){
 const saved=read('session',null);
 return `<section class="saved-sessions" aria-label="Saved sessions"><h2>Saved sessions</h2>${saved?`<div class="table-scroll"><table><thead><tr><th>Exam / Candidate</th><th>Progress</th><th>Time</th><th>Actions</th></tr></thead><tbody><tr><td>${esc(saved.exam.title)}<br><span class="muted">${esc(saved.candidate)}</span></td><td>${saved.questions.filter(q=>isAnswered(q,saved.answers[q.id])).length} / ${saved.questions.length} answered</td><td>${saved.limit===null?'Elapsed':'Remaining'}<br>${fmt(saved.limit===null?saved.elapsed:Math.max(0,saved.limit-saved.elapsed))}</td><td><button data-action="resume">Resume session</button> <button data-action="delete-session">Delete</button></td></tr></tbody></table></div>`:'<p class="muted">No saved session yet. During an exam, tap Save Session to continue later.</p>'}</section>`;
}
function modal(title,body,submit){const d=document.createElement('dialog');d.innerHTML=`<header>${esc(title)}</header><form>${body}<div class="dialogfoot"><button type="button" data-close>Cancel</button>${submit?'<button class="primary" type="submit">OK</button>':''}</div></form>`;document.body.append(d);d.querySelector('[data-close]').onclick=()=>d.close();d.onclose=()=>d.remove();d.querySelector('form').onsubmit=e=>{e.preventDefault();if(submit)submit(new FormData(e.target),d)};d.showModal();return d;}
function setup(){const e=exam();if(!e)return;const sections=[...new Set(e.questions.map(q=>q.section))];modal('Exam Mode for Standard Exam',`<label class="row">Candidate name: <input name="candidate" type="text" value="${esc(read('candidate',''))}" placeholder="Your name" required maxlength="100"></label><fieldset><legend>Exam Mode</legend><label class="row"><input type="radio" name="mode" value="all" checked>Take selected exam: <b>Exam A</b></label><label class="row"><input type="radio" name="mode" value="sections">Take questions from selected sections only:</label><div class="sections">${sections.map((s,i)=>`<label class="row"><input name="section" type="checkbox" value="${i}">${esc(s)} (${e.questions.filter(q=>q.section===s).length})</label>`).join('')}</div><label class="row"><input type="radio" name="mode" value="count">Take <input name="count" type="number" value="${e.questions.length}" min="1" max="${e.questions.length}" style="width:70px"> questions from entire exam</label><label class="row"><input type="radio" name="mode" value="range">Take question range from <input name="from" type="number" value="1" min="1" max="${e.questions.length}" style="width:60px"> to <input name="to" type="number" value="${e.questions.length}" min="1" max="${e.questions.length}" style="width:60px"></label><label class="row"><input name="training" type="checkbox">Training mode (show answers while practicing)</label></fieldset><fieldset><legend>Timer</legend><label class="row"><input name="timer" type="checkbox">Timer on <span class="spacer"></span>Time limit (minutes): <input name="minutes" type="number" min="1" max="1440" value="120" style="width:80px"></label></fieldset>`,(f,d)=>{let qs=e.questions;if(f.get('mode')==='sections')qs=qs.filter(q=>f.getAll('section').map(i=>sections[+i]).includes(q.section));if(f.get('mode')==='count')qs=[...qs].sort(()=>Math.random()-.5).slice(0,+f.get('count'));if(f.get('mode')==='range')qs=qs.slice(+f.get('from')-1,+f.get('to'));if(!qs.length){alert('Select at least one question or a valid range.');return}save({candidate:f.get('candidate')});start(e,qs,f.get('candidate'),f.has('timer')?+f.get('minutes')*60:null,f.has('training'));d.close()});}
function persistSession(silent=false){
 if(!session||!['exam','section'].includes(view)||review||saving)return false;
 const q=visible()[session.index];
 const {questions:unused,...examInfo}=session.exam;
 return save({session:{...session,exam:examInfo,paused:true,filter,questionId:q?.id,screen:view}},silent);
}
function resumeSession(){
 session=structuredClone(read('session',null));if(!session)return;
 session.questions=session.questions.map(q=>{
  const updated=matchingQuestion(q);
  if(updated!==q)delete session.answers[q.id];
  return updated;
 });
 ensureAnnotations();
 review=false;filter=session.filter||'all';show=false;message='';session.paused=false;
 if(session.questionId){
  let index=visible().findIndex(q=>q.id===session.questionId);
  if(index<0){filter='all';index=visible().findIndex(q=>q.id===session.questionId)}
  session.index=Math.max(0,index);
 }
 if(session.screen==='section')renderSection();else renderExam();
}
function ensureAnnotations(){
 session.comments??={};
 session.annotations??={};
 session.seen??=session.questions.filter(q=>isAnswered(q,own(session.answers,q.id,[]))).map(q=>q.id);
 session.sectionFilter??='all';
}
function start(e,qs,candidate,limit,training){
 session={id:crypto.randomUUID(),exam:structuredClone(e),questions:structuredClone(qs),candidate,limit,training,answers:{},marked:[],index:0,elapsed:0,paused:false,date:new Date().toISOString()};
 ensureAnnotations();
 view='exam';review=false;filter='all';show=false;renderExam();
}
function visible(){return session.questions.filter(q=>filter==='marked'?session.marked.includes(q.id):filter==='incomplete'?questionStatus(q)!=='Complete':filter==='incorrect'?!correct(q,own(session.answers,q.id,[])):true)}
function setAnswer(id,values){
 Object.defineProperty(session.answers,id,{value:values,enumerable:true,configurable:true,writable:true});
}
function questionStatus(q){
 const answer=own(session.answers,q.id,[]);
 const complete=isAnswered(q,answer)&&(q.type==='matching'||answer.length>=q.answers.length);
 return complete?'Complete':session.seen.includes(q.id)?'Incomplete':'Unseen';
}
function questionTable(questions){
 if(!questions.length)return '<p>No questions match this filter.</p>';
 return `<div class="exam-table-scroll"><table class="exam-table"><thead><tr><th scope="col">Question</th><th scope="col">Status</th><th scope="col">Flagged</th><th scope="col">Comment</th></tr></thead><tbody>${questions.map(q=>{
  const number=session.questions.indexOf(q)+1,status=questionStatus(q);
  return `<tr><td><button type="button" data-jump="${number-1}">Question ${number}</button></td><td><span class="question-status ${status.toLowerCase()}">${status}</span></td><td>${session.marked.includes(q.id)?'Yes':'—'}</td><td>${own(session.comments,q.id,'')?'Yes':'—'}</td></tr>`;
 }).join('')}</tbody></table></div>`;
}
function bindJumps(root,close){
 root.querySelectorAll('[data-jump]').forEach(button=>button.onclick=()=>{
  const q=session.questions[+button.dataset.jump];
  let index=visible().indexOf(q);
  if(index<0){filter='all';index=session.questions.indexOf(q)}
  session.index=index;
  show=review;
  close?.();
  renderExam();
 });
}
function renderSection(){
 view='section';
 const subsets={
  all:session.questions,
  incomplete:session.questions.filter(q=>questionStatus(q)==='Incomplete'),
  unseen:session.questions.filter(q=>questionStatus(q)==='Unseen'),
  marked:session.questions.filter(q=>session.marked.includes(q.id))
 };
 const labels={all:'All',incomplete:'Incomplete',unseen:'Unseen',marked:'Flagged'};
 frame(session.paused?pausePanel():`<div class="content section-review"><h1>Section Review</h1>
 <div class="review-tabs" role="group" aria-label="Section review filter">${Object.entries(labels).map(([key,label])=>`<button data-section-filter="${key}" aria-pressed="${session.sectionFilter===key}">${label} (${subsets[key].length})</button>`).join('')}</div>
 ${questionTable(subsets[session.sectionFilter])}</div>`,
 `<button data-action="end" class="exam-end">End Exam</button><span class="spacer"></span>${sessionControls()}<button data-action="back-question" ${session.paused?'disabled':''}>Back to Question</button>`);
 bind();
 bindJumps($('#app'));
 document.querySelectorAll('[data-section-filter]').forEach(button=>button.onclick=()=>{
  session.sectionFilter=button.dataset.sectionFilter;
  renderSection();
  $(`[data-section-filter="${session.sectionFilter}"]`)?.focus();
 });
}
function pausePanel(){
 return '<div class="content question"><div class="pause"><h2>Exam paused</h2><p>Resume when you’re ready.</p></div></div>';
}
function sessionControls(){
 return `<button data-action="pause">${session.paused?'Resume':'Pause'}</button><button data-action="save">Save Session</button>`;
}
const filterLabels={all:'View All',marked:'View Marked',incorrect:'View Incorrect',incomplete:'View Incomplete'};
function renderExam(){
 view='exam';
 const list=visible(),paused=session.paused&&!review;
 session.index=Math.max(0,Math.min(session.index,list.length-1));
 const q=list[session.index],reveal=show;
 if(q&&!paused&&!review&&!session.seen.includes(q.id))session.seen.push(q.id);
 const toolbar=q&&!paused?`<div class="exam-toolbar" role="group" aria-label="Exam tools">
 <button data-action="comment">Comment${own(session.comments,q.id,'')?' ✓':''}</button>
 ${review?'':`<button data-action="highlight">Highlight</button><button data-action="strike">Strikethrough</button>`}
 <button data-action="calculator">Calculator</button><span class="spacer"></span>
 <label class="flag-control"><input id="mark" type="checkbox" ${session.marked.includes(q.id)?'checked':''} ${review?'disabled':''}> Flag for Review</label>${textTools()}</div>`:'';
 const content=paused?pausePanel():`<div class="content question">${q?`
 <div class="question-tools"><span>Item ${session.index+1} of ${list.length} · Question ${session.questions.indexOf(q)+1}</span><span class="spacer"></span>
 <button data-action="answer">${reveal?'Hide':'Show'} Answer</button>
 ${q.caseStudy?.trim()?'<button data-action="case-study">View Case Study</button>':''}</div>
 <p data-annotate="prompt">${renderContent(q.prompt)}</p>
 ${q.caseStudy&&imageTokens(q.caseStudy).length?`<section class="question-diagrams" aria-label="Case study diagrams"><h3>Case study diagrams</h3><p class="muted">These figures belong to the report referenced in this question. View Case Study for the full report.</p>${renderContent(imageTokens(q.caseStudy).join("\n"))}</section>`:''}
 <div class="options">${q.type==='matching'?renderMatching(q,own(session.answers,q.id,[]),{reveal,readOnly:review}):q.options.map((option,index)=>`
 <label class="option ${reveal?(q.answers.includes(index)?'right':'wrong'):''}">
 <input type="${q.answers.length>1?'checkbox':'radio'}" name="answer" value="${index}" ${own(session.answers,q.id,[]).includes(index)?'checked':''} ${review?'disabled':''}>
 <span>${String.fromCharCode(65+index)}.</span><span data-annotate="option-${index}">${renderContent(option||'(No option text in source file)')}</span></label>`).join('')}</div>
 ${reveal?`<div class="explanation"><b>Answer: ${q.type==='matching'?esc(q.matchingPrompts.map((p,i)=>p+' → '+q.options[q.answers[i]]).join('\n')):q.answers.map(i=>String.fromCharCode(65+i)).join(', ')}</b>\nSection: ${esc(q.section)}\n\n${renderContent(q.explanation||'No explanation provided.')}</div>`:''}
 <div class="question-instruction">${q.type==='matching'?'Drag a card onto each matching subject.':q.answers.length>1?'Select all that apply.':'Select the best choice.'}</div>`:'<p>No questions match this filter.</p>'}</div>`;
 frame(toolbar+content,
 `${review?'<button data-action="report">Back to Report</button>':`<button data-action="end" class="exam-end">End Exam</button>${sessionControls()}`}
 <span class="spacer"></span>
 ${review?`<select id="review-filter" aria-label="Review questions">${Object.entries(filterLabels).map(([key,label])=>`<option value="${key}" ${filter===key?'selected':''}>${label}</option>`).join('')}</select>`:''}
 ${paused?'':`<button data-action="prev" ${session.index===0?'disabled':''}>Previous</button><button data-action="navigator">Navigator</button>
 <button data-action="next" ${review&&session.index>=list.length-1?'disabled':''}>${!review&&session.index>=list.length-1?'Section Review':'Next'}</button>`}`);
 bind();
 if(paused)return;
 if(review)$('#review-filter').onchange=e=>openFilter(e.target.value);
 if(!q)return;
 $('#mark').onchange=e=>{
  session.marked=e.target.checked?[...session.marked,q.id]:session.marked.filter(id=>id!==q.id);
  if(!visible().includes(q)){filter='all';session.index=session.questions.indexOf(q);renderExam();$('#mark')?.focus()}
 };
 if(q.type==='matching')bindMatching(q,own(session.answers,q.id,[]),values=>{
  setAnswer(q.id,values);
  // Keep the edited question visible if completing it removes it from the filter.
  if(!visible().includes(q)){filter='all';session.index=session.questions.indexOf(q)}
  renderExam();
 },{readOnly:review});
 document.querySelectorAll('[name=answer]').forEach(input=>input.onchange=()=>{
  setAnswer(q.id,[...document.querySelectorAll('[name=answer]:checked')].map(i=>+i.value));
  if(!visible().includes(q)){
   filter='all';session.index=session.questions.indexOf(q);renderExam();
   $(`[name=answer][value="${input.value}"]`)?.focus();
  }
 });
 paintAnnotations(q);
}
function openFilter(value){
 filter=value;
 session.index=0;
 renderExam();
 $('#review-filter')?.focus();
}
function textNodes(element){
 const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);
 const nodes=[];
 while(walker.nextNode())nodes.push(walker.currentNode);
 return nodes;
}
function paintAnnotations(q){
 const annotations=own(session.annotations,q.id,[]);
 document.querySelectorAll('[data-annotate]').forEach(element=>{
  const segments=annotations.filter(a=>a.region===element.dataset.annotate);
  let position=0;
  for(const node of textNodes(element)){
   const start=position;
   position+=node.length;
   const cuts=[...new Set([start,position,...segments.flatMap(a=>[a.start,a.end]).filter(n=>n>start&&n<position)])].sort((a,b)=>a-b);
   const fragment=document.createDocumentFragment();
   for(let i=1;i<cuts.length;i++){
    const from=cuts[i-1],to=cuts[i];
    const active=segments.filter(a=>a.start<=from&&a.end>=to);
    const text=node.data.slice(from-start,to-start);
    if(!active.length){fragment.append(text);continue}
    const span=document.createElement('span');
    span.className=active.map(a=>'annotation-'+a.kind).join(' ');
    span.textContent=text;
    fragment.append(span);
   }
   node.replaceWith(fragment);
  }
 });
}
let capturedSelection;
function annotationRange(kind){
 const selection=window.getSelection();
 if(!selection?.rangeCount||selection.isCollapsed)return;
 const range=selection.getRangeAt(0);
 const element=[...document.querySelectorAll('[data-annotate]')].find(el=>el.contains(range.startContainer)&&el.contains(range.endContainer));
 if(!element)return;
 const prefix=range.cloneRange();
 prefix.selectNodeContents(element);
 prefix.setEnd(range.startContainer,range.startOffset);
 const start=prefix.toString().length;
 return {region:element.dataset.annotate,start,end:start+range.toString().length,kind};
}
function annotate(kind){
 const range=annotationRange(kind)||capturedSelection;
 capturedSelection=undefined;
 if(!range){alert('Select text in the question or an answer, then choose the annotation tool.');return}
 const q=visible()[session.index];
 const annotations=own(session.annotations,q.id,[]);
 const same=a=>a.region===range.region&&a.start===range.start&&a.end===range.end&&a.kind===kind;
 Object.defineProperty(session.annotations,q.id,{value:annotations.some(same)?annotations.filter(a=>!same(a)):[...annotations,{...range,kind}],enumerable:true,configurable:true,writable:true});
 window.getSelection()?.removeAllRanges();
 renderExam();
}
function comment(){
 const q=visible()[session.index],text=own(session.comments,q.id,'');
 const d=modal('Question Comment',`<label class="comment-field">Comment<textarea name="comment" rows="5" maxlength="4000" ${review?'readonly':''}>${esc(text)}</textarea></label>`,review?undefined:(form,dialog)=>{
  Object.defineProperty(session.comments,q.id,{value:form.get('comment').trim(),enumerable:true,configurable:true,writable:true});
  dialog.close();
  renderExam();
 });
 d.classList.add('exam-dialog');
 const submit=d.querySelector('[type=submit]');
 if(submit)submit.textContent='Save';
}
function navigatorDialog(){
 const d=modal('Question Navigator',questionTable(session.questions));
 d.classList.add('exam-dialog','navigator-dialog');
 d.querySelector('[data-close]').textContent='Close';
 bindJumps(d,()=>d.close());
}
function confirmEnd(step=1){
 const incomplete=session.questions.filter(q=>questionStatus(q)!=='Complete').length;
 const title=step===1?'End Exam':'Confirm End Exam';
 const details=step===1&&incomplete?`You have ${incomplete} incomplete or unseen ${incomplete===1?'question':'questions'}. `:'';
 const d=modal(title,`<p>${details}${step===1?'Continue to exam submission?':'Submit your answers and display your score report?'}</p>`,(_,dialog)=>{
  dialog.close();
  if(step===1)confirmEnd(2);
  else finish();
 });
 d.classList.add('exam-dialog','end-dialog');
 d.querySelector('[type=submit]').textContent=step===1?'Continue':'Submit Exam';
}
function clock(){return session.limit===null?`Elapsed Time: ${fmt(session.elapsed)}`:`Time Remaining: ${fmt(Math.max(0,session.limit-session.elapsed))}`;}
const sameAttempt=(a,b)=>Boolean(a&&b&&(a.id&&b.id?a.id===b.id:
 a.date===b.date&&a.candidate===b.candidate&&a.exam.id===b.exam.id));
async function finish(){
 if(saving)return;
 saving=true;
 session.paused=true;
 const result=score(session.questions,session.answers);
 const {questions:unused,...examInfo}=session.exam;
 const attempt={...session,exam:examInfo,id:session.id||crypto.randomUUID(),paused:false,result};
 const saved=await save({
  history:items=>(items||[]).some(item=>sameAttempt(item,attempt))?items:[attempt,...(items||[])],
  session:previous=>sameAttempt(previous,session)?undefined:previous
 });
 saving=false;
 if(!saved){view==='section'?renderSection():renderExam();return}
 document.querySelectorAll('.end-dialog[open]').forEach(dialog=>dialog.close());
 session=attempt;
 report();
}
function report(){view='report';review=false;const r=session.result||score(session.questions,session.answers);const threshold=passing(session.exam);const date=new Date(session.date);frame(`<div class="strip"><span class="spacer"></span>Elapsed Time: ${fmt(session.elapsed)}</div><div class="content"><article class="report"><h1>Examination Score Report</h1><h2>${esc(session.exam.title)}</h2><div class="metadata"><span><b>CANDIDATE:</b> ${esc(session.candidate)}</span><span><b>DATE:</b> ${esc(date.toLocaleDateString())}</span><span><b>EXAM NUMBER:</b> ${esc(session.exam.number||'—')}</span><span><b>ELAPSED TIME:</b> ${fmt(session.elapsed)}</span></div><div class="chart"><div class="barrow"><span>Required score</span><div class="track"><div class="bar" style="width:${threshold/10}%"></div></div></div><div class="barrow"><span>Your score</span><div class="track"><div class="bar you ${r.score<threshold?'failed':''}" style="width:${r.score/10}%"></div></div></div><div class="ticks"><span>0</span><span>500</span><span>1000</span></div></div><div class="score-grid"><span><b>Passing score:</b> ${threshold}/1000</span><span><b>Your score:</b> ${r.score}/1000</span><span><b>Grade:</b> <strong class="${r.score>=threshold?'right':'wrong'}">${r.score>=threshold?'Pass':'Fail'}</strong></span></div><p>${r.correct} correct · ${r.total-r.correct} incorrect or unanswered · ${r.total} total questions</p><table class="breakdown"><thead><tr><th>Section</th><th>Items</th><th>Percent correct</th></tr></thead><tbody>${Object.entries(r.sections).map(([s,v])=>`<tr><td>${esc(s)}</td><td>${v.items}</td><td>${Math.round(v.correct/v.items*100)}%</td></tr>`).join('')}</tbody></table></article></div>`,`<select id="report-review" aria-label="Review results"><option value="">Review…</option><option value="all">Review All</option><option value="marked">View Marked</option><option value="incomplete">Review Incomplete</option><option value="incorrect">Review Incorrect</option></select><button data-action="view-marked">View Marked</button><select id="retake" aria-label="Retake exam"><option value="">Retake…</option><option value="all">All questions</option><option value="incorrect">Incorrect questions</option><option value="incomplete">Incomplete questions</option><option value="marked">Marked questions</option></select><button data-action="print">Print Report</button><span class="spacer"></span><button data-action="exit">Exit</button>`,'Review answers or retake selected questions.');bind();$('#report-review').onchange=e=>{if(e.target.value)openReview(e.target.value)};$('#retake').onchange=e=>{if(!e.target.value)return;filter=e.target.value;const qs=visible();if(!qs.length){alert('No questions match this filter.');e.target.value='';return}start(session.exam,qs,session.candidate,session.limit,session.training)};}
function openReview(selectedFilter){
 ensureAnnotations();
 review=true;
 show=true;
 openFilter(selectedFilter);
}
function bind(){document.querySelectorAll('.exam-image').forEach(img=>{img.tabIndex=0;img.setAttribute('role','button');img.setAttribute('aria-label','View full diagram');const open=()=>{action.imageSource=img.src;action('image')};img.onclick=open;img.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}}});document.querySelectorAll('[data-select]').forEach(el=>{el.onclick=()=>{selected=el.dataset.select;library()};el.ondblclick=setup;el.onkeydown=e=>{if(e.key==='Enter'){selected=el.dataset.select;setup()}}});document.querySelectorAll('[data-action]').forEach(el=>{
 el.onclick=()=>action(el.dataset.action);
 if(['highlight','strike'].includes(el.dataset.action))el.onpointerdown=event=>{
  capturedSelection=annotationRange(el.dataset.action);
  if(capturedSelection&&event.pointerType==='mouse')event.preventDefault();
 };
});}
function historyDialog(){
 const history=read('history',[]);
 const d=modal('Exam History',history.length?history.map((h,i)=>`
 <p><button type="button" data-history="${i}">View report</button> ${esc(h.exam.title)} · ${esc(h.candidate)} · ${h.result.score}/1000 · ${esc(new Date(h.date).toLocaleDateString())}
 <button type="button" data-delete-history="${i}" aria-label="Delete attempt ${i+1}">Delete</button></p>`).join('')+'<button type="button" data-clear-history>Clear History</button>':'<p>No completed exams yet.</p>');
 const remove=async(button,confirmMessage,update)=>{
  if(!confirm(confirmMessage))return;
  button.disabled=true;
  if(await save({history:update})){if(d.open){d.close();historyDialog()}}
  else button.disabled=false;
 };
 d.querySelectorAll('[data-history]').forEach(button=>button.onclick=()=>{
  session=structuredClone(history[+button.dataset.history]);d.close();report();
 });
 d.querySelectorAll('[data-delete-history]').forEach(button=>button.onclick=()=>remove(button,'Delete this attempt from history?',items=>(items||[]).filter(item=>!sameAttempt(item,history[+button.dataset.deleteHistory]))));
 const clear=d.querySelector('[data-clear-history]');
 if(clear)clear.onclick=()=>remove(clear,'Clear all completed attempts from history?',[]);
}
async function action(a){
 if(saving)return;
 switch(a){
 case 'text-smaller':case 'text-larger':case 'text-reset':{
  const size=a==='text-reset'?100:Math.max(100,Math.min(200,textSize+(a==='text-larger'?10:-10)));
  textSize=size;
  applyTextSize();
  if(view==='exam')renderExam();else library();
  await save({textSize:size});
  break;
 }
 case 'refresh-app':{
  const url=new URL(location.href);
  url.searchParams.set('v',Date.now().toString(36));
  location.assign(url.href);
  break;
 }
 case 'setup':setup();break;
 case 'import':$('#import').click();break;
 case 'remove':
  if(confirm('Remove this exam from your library?')){
   const id=selected;
   if(await save({exams:items=>(items||[]).filter(e=>e.id!==id)})){
    loadExams();
    selected=exams[0]?.id;
    library();
   }
  }
  break;
 case 'properties':modal('Exam Properties',`<h2>${esc(exam().title)}</h2><p>${exam().questions.length} questions · Passing score: ${passing(exam())}/1000</p><p>${[...new Set(exam().questions.map(q=>q.section))].map(esc).join('<br>')}</p>`);break;
 case 'history':historyDialog();break;
 case 'resume':resumeSession();break;
 case 'delete-session':
  if(confirm('Delete the saved session? Your imported exam will be kept.')){
   const saved=read('session',null);
   if(await save({session:previous=>sameAttempt(saved,previous)?undefined:previous})){
    message='Saved session deleted.';
    library();
   }
  }
  break;
 case 'prev':session.index--;show=review;renderExam();break;
 case 'next':
  if(!review&&session.index>=visible().length-1){renderSection();break}
  session.index++;
  show=review;
  renderExam();
  break;
 case 'back-question':renderExam();break;
 case 'answer':show=!show;renderExam();break;
 case 'pause':session.paused=!session.paused;view==='section'?renderSection():renderExam();break;
 case 'save':{
  const pending=persistSession();
  saving=true;
  const saved=await pending;
  saving=false;
  if(saved){message='Session saved. Choose Resume session to continue later.';library()}
  break;
 }
 case 'end':confirmEnd();break;
 case 'navigator':navigatorDialog();break;
 case 'comment':comment();break;
 case 'highlight':case 'strike':annotate(a);break;
 case 'view-marked':openReview('marked');break;
 case 'report':report();break;
 case 'print':window.print();break;
 case 'exit':message='';library();break;
 case 'image':{
  const d=modal('Exam diagram','<div class="diagram-viewer"><img alt="Exam diagram at full resolution"></div><p class="muted">Scroll to view the full diagram.</p>');
  d.querySelector('img').src=action.imageSource;
  d.querySelector('[data-close]').textContent='Close';
  break;
 }
 case 'case-study':{
  const q=visible()[session.index];
  if(!q?.caseStudy?.trim())break;
  const d=modal(q.caseStudyTitle||'Case Study',`<div class="case-study">${renderContent(q.caseStudy)}</div>`);
  d.querySelector('[data-close]').textContent='Close';
  bind();
  break;
 }
 case 'calculator':openCalculator();break;
 }
}

function loadExams(){
 exams=read('exams',[]).filter(e=>e.id!=='sample').map(e=>({...e,questions:e.questions.map(matchingQuestion)}));
}

$('#import').onchange=async event=>{
 const file=event.target.files[0];
 if(!file)return;
 try{
  const parsed=validateExam(file.name.toLowerCase().endsWith('.vce')?parseVce(await file.arrayBuffer()):JSON.parse(await file.text()));
  parsed.id=crypto.randomUUID();
  if(await save({exams:items=>[...(items||[]),parsed]})){
   // This request is best-effort and remains under browser control.
   navigator.storage?.persist?.().catch(()=>{});
   loadExams();
   selected=parsed.id;
   library();
  }
 }catch(error){alert('Import failed: '+error.message)}
 finally{event.target.value=''}
};
setInterval(()=>{
 if(!['exam','section'].includes(view)||review||session.paused||saving)return;
 session.elapsed++;
 if(session.limit!==null&&session.elapsed>=session.limit){finish();return}
 const display=$('#clock');
 if(display)display.textContent=clock();
},1000);
window.addEventListener('pagehide',()=>persistSession(true));
document.addEventListener('visibilitychange',()=>{
 if(!['exam','section'].includes(view)||review)return;
 if(document.hidden){session.paused=true;persistSession(true)}
 else if(!saving){view==='section'?renderSection():renderExam()}
});

try{
 await initializeStorage();
 loadExams();
 selected=exams[0]?.id;
 textSize=Math.max(100,Math.min(200,Number(read('textSize',100))||100));
 applyTextSize();
 library();
}catch{
 frame('<div class="content" role="alert">Browser storage could not be opened. Reload this page to retry.</div>');
}
