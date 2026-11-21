import {imageTokens,renderContent} from './content.js?v=arabic-20261121';
import {repairEncoding} from './text-encoding.js?v=arabic-20261121';
import {translationEndpoint} from './translation-config.js?v=arabic-20261121';

const cacheKey='pmp-arabic-translations-v1';
const originals=new WeakMap();
const active=new WeakMap();
const pending=new Map();
let arabic=false;
let cache;
try{cache=new Map(JSON.parse(localStorage.getItem(cacheKey)||'[]'))}catch{cache=new Map()}

export function languageButton(){
 return '<button data-action="language" aria-pressed="false"><bdi lang="ar">العربية</bdi> / English</button>';
}
export function toggleLanguage(){arabic=!arabic}

function remember(key,translated){
 cache.set(key,translated);
 while(cache.size>100||JSON.stringify([...cache]).length>350000)cache.delete(cache.keys().next().value);
 try{localStorage.setItem(cacheKey,JSON.stringify([...cache]))}catch{}
}

async function translate(texts){
 const bytes=new TextEncoder().encode(JSON.stringify([translationEndpoint,texts]));
 const key=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');
 if(cache.has(key))return cache.get(key);
 if(!pending.has(key)){
  pending.set(key,(async()=>{
   const response=await fetch(translationEndpoint,{
    method:'POST',headers:{'Content-Type':'application/json'},
    credentials:'omit',body:JSON.stringify({texts}),signal:AbortSignal.timeout(20000)
   });
   if(!response.ok)throw Error('Translation request failed');
   const {translations}=await response.json();
   if(!Array.isArray(translations)||translations.length!==texts.length||translations.some(s=>typeof s!=='string'||!s.trim()||imageTokens(s).length))throw Error('Invalid translation response');
   remember(key,translations);
   return translations;
  })().finally(()=>pending.delete(key)));
 }
 return pending.get(key);
}

function sourceParts(value){
 const source=String(value??'');
 const images=imageTokens(source);
 const result=[];
 let offset=0;
 function appendText(text){
  // Preserve paragraph breaks and keep each API entry within the provider limit.
  for(const line of repairEncoding(text).split(/(\r?\n)/)){
   let remaining=line;
   while(remaining.length>1600){
    const space=remaining.lastIndexOf(' ',1600);
    const end=space>800?space:1600;
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

async function translateBatches(texts){
 const batches=[];
 let batch=[],size=0;
 for(const text of texts){
  if(batch.length>=100||size+text.length>8000){
   batches.push(batch);
   batch=[];size=0;
  }
  batch.push(text);
  size+=text.length;
 }
 if(batch.length)batches.push(batch);
 const translations=[];
 for(const group of batches)translations.push(...await translate(group));
 return translations;
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

export async function applyTranslation(root,fields,bindImages){
 const status=root.querySelector('[data-translation-status]');
 if(!status)return;
 const button=root.querySelector('[data-action=language]');
 button?.setAttribute('aria-pressed',String(arabic));
 const request={};
 active.set(root,request);
 const current=()=>active.get(root)===request&&status.isConnected&&arabic;
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
 if(!translationEndpoint){
  status.textContent='Arabic translation is awaiting service setup. English is available.';
  return;
 }

 // Cache the question, explanation and case study separately so revealing an
 // explanation or opening a shared case study does not resend question text.
 const groups=Map.groupBy(entries,([field])=>field==='explanation'?'explanation':field.startsWith('caseStudy')?'caseStudy':'question');
 status.textContent='Loading Arabic translation…';
 const results=await Promise.allSettled([...groups.values()].map(async group=>{
  const texts=[];
  const segments=group.map(([field,elements])=>[elements,sourceParts(fields[field]).map(({image,text})=>{
   if(image)return image;
   if(!text.trim())return text;
   const [,before,content,after]=text.match(/^(\s*)(.*?)(\s*)$/s);
   return [before,texts.push(content)-1,after];
  })]);
  const translated=await translateBatches(texts);
  if(!current())return;
  for(const [elements,segmentsForField] of segments){
   const value=segmentsForField.map(part=>Array.isArray(part)?part[0]+translated[part[1]]+part[2]:part).join('');
   for(const element of elements){
    if(element.hasAttribute('data-translate')&&element.tagName!=='HEADER')element.innerHTML=renderContent(value);
    else element.textContent=value;
    element.lang='ar';
    element.dir='rtl';
   }
  }
 }));
 if(!current())return;
 bindImages?.();
 if(results.every(result=>result.status==='fulfilled'))status.textContent='';
 else{
  status.textContent='Some content could not be translated and is shown in English. ';
  const retry=document.createElement('button');
  retry.type='button';
  retry.textContent='Retry';
  retry.onclick=()=>applyTranslation(root,fields,bindImages);
  status.append(retry);
 }
}
