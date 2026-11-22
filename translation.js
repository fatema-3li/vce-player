import {imageTokens,renderContent} from './content.js?v=arabic-ios-recovery-20261122';
import {repairEncoding} from './text-encoding.js?v=arabic-ios-recovery-20261122';
import {read,write} from './storage.js?v=arabic-ios-recovery-20261122';

import {translateForExam} from './translation-quality.js?v=arabic-ios-recovery-20261122';

const cacheKey='browserArabicV1';
const originals=new WeakMap();
const active=new WeakMap();
const pending=new Map();
// iPadOS can request a desktop site and identify itself as a Mac.
const appleMobile=/iPhone|iPad|iPod/i.test(navigator.userAgent)||
 (navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
let arabic=false;
let worker,job,ready=false,downloaded=new Map();

export function languageButton(inExam=true){
 return `<button type="button" ${inExam?'data-action="language" ':''}data-translation-toggle aria-pressed="false"><bdi lang="ar">العربية</bdi> / English</button>`;
}

function stopWorker(){
 worker?.terminate();
 worker=undefined;
 ready=false;
 downloaded=new Map();
 job?.finish(null,Error('Translation stopped'));
}

export function toggleLanguage(){
 arabic=!arabic;
 if(!arabic)stopWorker();
}

function workerTranslate(text,onProgress){
 if(!worker){
  const url=new URL('./translation-worker.js',import.meta.url);
  url.search=new URL(import.meta.url).search;
  worker=new Worker(url,{type:'module'});
  worker.onmessage=({data})=>{
   if(data.progress){
    downloaded.set(data.progress.file,data.progress.loaded);
    job?.onProgress(`Downloading model · ${Math.min(118,Math.round([...downloaded.values()].reduce((sum,size)=>sum+size,0)/1e6))} of about 118 MB`);
   }else if(data.ready){
    ready=true;
    job?.onProgress('Translating on this device…');
   }else if(data.error){
    stopWorker();
   }else{
    job?.finish(data.value);
   }
  };
  worker.onerror=stopWorker;
 }
 return new Promise((resolve,reject)=>{
  const timeout=setTimeout(stopWorker,ready?30000:180000);
  job={onProgress,finish(value,error){
   clearTimeout(timeout);
   job=undefined;
   if(error)reject(error);
   else resolve(value);
  }};
  onProgress(ready?'Translating on this device…':'Loading translation files…');
  worker.postMessage({text});
 });
}

let queue=Promise.resolve();
async function translate(text,current,onProgress){
 const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),byte=>byte.toString(16).padStart(2,'0')).join('');
 const cached=read(cacheKey,[]).find(([id])=>id===key);
 if(cached)return cached[1];
 if(!current())return;
 if(appleMobile)return translateForExam(text,async ()=>null);
 if(!pending.has(key)){
  const task=queue.then(async ()=>{
   if(!current())return;
   const translated=await workerTranslate(text,onProgress);
   if(translated!==undefined){
    try{
     await write({[cacheKey]:(entries=[])=>{
      const next=[...entries.filter(([id])=>id!==key),[key,translated]];
      while(next.length>500||JSON.stringify(next).length>350000)next.shift();
      return next;
     }});
    }catch{
     // A storage failure still allows the translation to be displayed.
    }
   }
   return translated;
  }).finally(()=>pending.delete(key));
  pending.set(key,task);
  queue=task.catch(()=>{});
 }
 return pending.get(key);
}

function sourceParts(value){
 const source=String(value??'');
 const images=imageTokens(source);
 const result=[];
 let offset=0;
 function appendText(text){
  // Preserve paragraph breaks and split long paragraphs at sentence boundaries.
  for(const line of repairEncoding(text).split(/(\r?\n)/)){
   let remaining=line;
   while(remaining.length>750){
    const sentence=remaining.slice(0,750).search(/[.!?]\s+[^.!?]*$/);
    const space=remaining.lastIndexOf(' ',750);
    const end=sentence>200?sentence+1:space>200?space:750;
    result.push({text:remaining.slice(0,end)});
    remaining=remaining.slice(end);
   }
   result.push({text:remaining});
  }
 }
 for(const image of images){
  const index=source.indexOf(image,offset);
  appendText(source.slice(offset,index));
  result.push({image});
  offset=index+image.length;
 }
 appendText(source.slice(offset));
 return result;
}

function fieldsIn(root,fields){
 const elements=new Map();
 root.querySelectorAll('[data-translate],[data-card-label],[data-match-label]').forEach(element=>{
  const {translate,cardLabel,matchLabel}=element.dataset;
  const field=translate??(cardLabel===undefined?'match-'+matchLabel:'option-'+cardLabel);
  if(!fields[field]?.trim())return;
  if(!elements.has(field))elements.set(field,[]);
  elements.get(field).push(element);
  if(!originals.has(element))originals.set(element,[...element.childNodes]);
 });
 return elements;
}

export async function applyTranslation(root,fields,bindImages,onEnglish){
 const status=root.querySelector('[data-translation-status]');
 if(!status)return;
 const button=root.querySelector('[data-translation-toggle]');
 button?.setAttribute('aria-pressed',String(arabic));
 const request={};
 active.set(root,request);
 const current=()=>active.get(root)===request&&status.isConnected&&arabic&&(root.tagName!=='DIALOG'||root.open);
 const entries=fieldsIn(root,fields);
 if(!arabic){
  for(const elements of entries.values())for(const element of elements){
   if(element.lang!=='ar')continue;
   element.replaceChildren(...originals.get(element));
   element.removeAttribute('lang');
   element.removeAttribute('dir');
  }
  status.textContent='';
  return;
 }
 const message=document.createElement('span');
 const cancel=document.createElement('button');
 cancel.type='button';
 cancel.textContent='Continue in English';
 cancel.onclick=()=>{
  toggleLanguage();
  applyTranslation(root,fields,bindImages,onEnglish);
  onEnglish?.();
 };
 status.replaceChildren(message,' ',cancel);
 const segments=[...entries].map(([field,elements])=>[elements,sourceParts(fields[field])]);
 const total=segments.flatMap(([,parts])=>parts).filter(({text})=>text?.trim()).length;
 let done=0,partial=false;
 const progress=value=>{
  if(current())message.textContent=appleMobile
   ?`Checking cached Arabic and glossary phrases… ${done}/${total} text sections.`
   :`${value} ${done}/${total} text sections. Model and runtime files come from Hugging Face and jsDelivr. Exam text stays on this device.`;
 };
 progress('Preparing Arabic translation…');
 try{
  for(const [elements,parts] of segments){
   let value='',isArabic=false;
   for(const {image,text} of parts){
    if(!current())return;
    if(image||!text.trim()){value+=image??text;continue}
    const [,before,content,after]=text.match(/^(\s*)(.*?)(\s*)$/s);
    let translated=await translate(content,current,progress);
    if(!current())return;
    if(translated===undefined){
     // The owning view can change while a shared request is still queued.
     translated=await translate(content,current,progress);
     if(!current())return;
    }
    done++;
    progress('Translating on this device…');
    if(typeof translated==='string'&&/[\p{Script=Arabic}]/u.test(translated)&&!imageTokens(translated).length){
     value+=before+translated+after;
     isArabic=true;
    }else{
     value+=before+'\u2066'+content+'\u2069'+after;
     partial=true;
    }
   }
   if(!isArabic)continue;
   for(const element of elements){
    if(element.hasAttribute('data-translate')&&element.tagName!=='HEADER')element.innerHTML=renderContent(value);
    else element.textContent=value;
    element.lang='ar';
    element.dir='rtl';
   }
  }
  if(!current())return;
  status.replaceChildren(partial?(appleMobile
  ?'Full Arabic translation is paused on iPhone and iPad because the model can close the browser. Cached Arabic and glossary phrases are available. Other text stays in English.'
  :'Some text stayed in English because it could not be translated safely.'):'');
 }catch{
  if(!current())return;
  message.textContent='Arabic translation could not be loaded or completed. Check your connection or device storage, then try again. ';
  const retry=document.createElement('button');
  retry.type='button';
  retry.textContent='Retry';
  retry.onclick=()=>applyTranslation(root,fields,bindImages,onEnglish);
  status.append(' ',retry);
 }finally{
  if(current())bindImages?.();
 }
}
