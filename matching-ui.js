const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderMatching(q,answers=[],{reveal=false,readOnly=false}={}){
 return `<div class="matching-options"><p class="muted" data-match-status aria-live="polite">${readOnly?'Your saved matches.':'Drag a ceremony card onto a subject, or tap a card and then a target. Cards can be reused.'}</p>${readOnly?'':`<div class="match-bank" aria-label="Ceremony cards">${q.options.map((o,i)=>`<button type="button" class="match-card" data-card="${i}" aria-pressed="false">⠿ ${escape(o)}</button>`).join('')}</div>`}${q.matchingPrompts.map((left,i)=>`<div class="matching-row"><span>${escape(left)}</span><div><button type="button" class="match-target" data-match="${i}" data-value="${answers[i]??-1}" aria-label="Match: ${escape(left)}" ${readOnly?'disabled':''}>${escape(q.options[answers[i]]??'Drop a card here')}</button>${!readOnly&&answers[i]>=0?`<button type="button" class="match-clear" data-clear-match="${i}" aria-label="Clear match: ${escape(left)}">Clear</button>`:''}</div>${reveal?`<span class="right">Correct match: ${escape(q.options[q.answers[i]])}</span>`:''}</div>`).join('')}</div>`;
}
export function bindMatching(q,answers,onChange,{readOnly=false}={}){
 if(readOnly)return;
 let selected=null;
 function apply(row,card){const values=q.matchingPrompts.map((_,i)=>answers[i]??-1);values[row]=card;onChange(values);}
 const status=document.querySelector('[data-match-status]');
 document.querySelectorAll('[data-match]').forEach(target=>target.onclick=()=>{
  if(selected===null){status.textContent='Choose a ceremony card first.';return;}
  apply(+target.dataset.match,selected);
 });
 document.querySelectorAll('[data-clear-match]').forEach(button=>button.onclick=()=>apply(+button.dataset.clearMatch,-1));
 document.querySelectorAll('[data-card]').forEach(card=>{
  let drag=null,suppressClick=false;
  card.onclick=()=>{
   if(suppressClick){suppressClick=false;return;}
   selected=+card.dataset.card;
   document.querySelectorAll('[data-card]').forEach(c=>c.setAttribute('aria-pressed',String(c===card)));
   status.textContent=`${q.options[selected]} selected. Tap a target to place it.`;
  };
  function highlight(){
   document.querySelectorAll('.match-over').forEach(e=>e.classList.remove('match-over'));
   const target=document.elementFromPoint(drag.x,drag.y)?.closest('[data-match]');
   if(target&&!target.disabled)target.classList.add('match-over');
   return target;
  }
  function tick(){
   if(!drag?.ghost)return;
   const step=drag.y<65?-12:drag.y>innerHeight-65?12:0;
   if(step){window.scrollBy(0,step);highlight();}
   drag.frame=requestAnimationFrame(tick);
  }
  function cleanup(){
   if(!drag)return;cancelAnimationFrame(drag.frame);drag.ghost?.remove();
   document.querySelectorAll('.match-over').forEach(e=>e.classList.remove('match-over'));
   drag=null;
  }
  card.onpointerdown=e=>{
   if(!e.isPrimary||e.button!==0)return;
   suppressClick=false;drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x:e.clientX,y:e.clientY};card.setPointerCapture(e.pointerId);
  };
  card.onpointermove=e=>{
   if(!drag||e.pointerId!==drag.id)return;
   drag.x=e.clientX;drag.y=e.clientY;
   if(!drag.ghost&&Math.hypot(drag.x-drag.startX,drag.y-drag.startY)>8){
    const ghost=document.createElement('div');ghost.className='match-ghost';ghost.textContent=q.options[+card.dataset.card];document.body.append(ghost);drag.ghost=ghost;drag.frame=requestAnimationFrame(tick);
   }
   if(drag.ghost){drag.ghost.style.left=`${drag.x}px`;drag.ghost.style.top=`${drag.y}px`;highlight();}
  };
  card.onpointerup=e=>{
   if(!drag||e.pointerId!==drag.id)return;
   const moved=!!drag.ghost,target=moved?highlight():null;cleanup();
   if(moved){suppressClick=true;e.preventDefault();if(target&&!target.disabled)apply(+target.dataset.match,+card.dataset.card);}
  };
  card.onpointercancel=cleanup;card.onlostpointercapture=cleanup;
 });
}
