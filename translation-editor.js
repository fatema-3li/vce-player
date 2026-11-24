import {questionFields,textParts,translationSnapshot,examSegments,mergeMemory,memoryFormat} from './translation-data.js?v=introduction-arabic-20261124';
import {renderContent} from './content.js?v=introduction-arabic-20261124';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function downloadJSON(data,name){
 const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));
 const link=document.createElement('a');link.href=url;link.download=name;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export async function openTranslationEditor({exam,memory,modal,commit,onSaved,questionId}){
 const snapshot=await translationSnapshot(exam,memory);
 let index=Math.max(0,snapshot.questions.findIndex(q=>q.id===questionId));
 const d=modal('Arabic translations / الترجمات العربية',`<p>Translations stay in this browser. Export a backup after editing. English and answer keys cannot be edited here.</p><label>Question <select data-question aria-label="Translation question">${snapshot.questions.map((q,i)=>`<option value="${i}">${i+1} · ${esc(q.id)}</option>`).join('')}</select></label><p data-coverage role="status"></p><div data-fields></div><p data-edit-status role="status"></p><div class="actions"><button type="button" data-save-translations>Save translations</button><button type="button" data-download-bilingual>Export bilingual exam</button><button type="button" data-download-memory>Export translation memory</button></div>`);
 d.classList.add('translation-editor');
 let dirty=false;
 const coverage=()=>{
  let total=0,verified=0,drafts=0;
  for(const q of snapshot.questions)for(const field of Object.values(q.translation.fields))for(const s of field.segments){total++;if(s?.status==='verified')verified++;else if(s)drafts++;}
  d.querySelector('[data-coverage]').textContent=`${verified}/${total} verified text segments · ${drafts} need review · ${total-verified-drafts} untranslated. Image labels require separate transcription/OCR.`;
 };
 const render=()=>{
  const q=snapshot.questions[index];
  d.querySelector('[data-fields]').innerHTML=Object.entries(q.translation.fields).map(([field,entry])=>{
   const sources=textParts(questionFields(q)[field]).filter(p=>p.text?.trim());
   return `<fieldset><legend>${esc(field)}</legend>${entry.segments.map((segment,i)=>`<div class="translation-segment" data-field="${esc(field)}" data-segment="${i}"><div lang="en" dir="ltr">${renderContent(sources[i].text)}</div><label>العربية <textarea dir="rtl" lang="ar" data-ar>${esc(segment?.ar)}</textarea></label><label>Status <select data-status><option value="needs-review" ${segment?.status==='verified'?'':'selected'}>Needs review / draft</option><option value="verified" ${segment?.status==='verified'?'selected':''}>Verified translation</option></select></label><label>Reuse <select data-reuse><option value="scoped" ${segment?.reusable===false?'selected':''}>This question only</option><option value="exact" ${segment?.reusable===undefined?'selected':''}>Exact text in the same field role</option><option value="sentence" ${segment?.reusable===true?'selected':''}>Exact text and whole sentences</option></select></label><label>Ambiguity / context note <input data-note value="${esc(segment?.note)}"></label></div>`).join('')}</fieldset>`;
  }).join('');coverage();
 };
 const collect=()=>{
  const q=snapshot.questions[index];
  for(const row of d.querySelectorAll('[data-segment]')){
   const ar=row.querySelector('[data-ar]').value.trim(),note=row.querySelector('[data-note]').value.trim();
   const status=row.querySelector('[data-status]').value;
   if(!ar&&status==='verified')throw Error('A verified translation needs Arabic text.');
   q.translation.fields[row.dataset.field].segments[+row.dataset.segment]=!ar&&!note?(q.translation.fields[row.dataset.field].segments[+row.dataset.segment]?{status:'needs-review',reusable:false,note:'Translation cleared; awaiting replacement.'}:null):{...(ar?{ar}:{}),status,...(row.querySelector('[data-reuse]').value==='exact'?{}:{reusable:row.querySelector('[data-reuse]').value==='sentence'}),...(note?{note}:{})};
  }
 };
 d.querySelector('[data-fields]').oninput=()=>{dirty=true;};
 const notify=error=>{d.querySelector('[data-edit-status]').textContent=error.message;};
 d.querySelector('[data-question]').onchange=event=>{
  try{collect();index=+event.target.value;render();}catch(error){event.target.value=index;notify(error);}
 };
 let currentMemory=memory||{format:memoryFormat,segments:[],glossary:[]};
 const persist=async()=>{
  collect();
  const segments=await examSegments(snapshot);
  // Retain scoped revision history, including blank/draft corrections.
  const merged=mergeMemory(currentMemory,{segments,glossary:[]});
  if(!await commit(snapshot,merged))return false;
  currentMemory=merged;dirty=false;coverage();onSaved?.();
  d.querySelector('[data-edit-status]').textContent='Saved locally. Export a backup to keep a separate copy.';
  return true;
 };
 d.querySelector('[data-save-translations]').onclick=()=>persist().catch(notify);
 d.querySelector('[data-download-bilingual]').onclick=()=>persist().then(ok=>{if(ok)downloadJSON(snapshot,'bilingual-exam.json');}).catch(notify);
 d.querySelector('[data-download-memory]').onclick=()=>persist().then(ok=>{if(ok)downloadJSON(currentMemory,'pmp-translation-memory.json');}).catch(notify);
 const close=event=>{if(dirty&&!confirm('Discard unsaved translation edits?'))event.preventDefault();};
 d.addEventListener('cancel',close);
 d.querySelector('[data-close]').onclick=()=>{if(!dirty||confirm('Discard unsaved translation edits?'))d.close();};
 d.querySelector('[data-question]').value=String(index);
 render();
}
