import {createServer} from 'node:http';

const {GOOGLE_CLOUD_PROJECT:project, GLOSSARY_ID:glossary, TRANSLATION_LOCATION:location=glossary?'us-central1':'global',
 APP_ORIGIN:allowedOrigin='https://fatema-3li.github.io', PORT:port=8080}=process.env;
const parent=`projects/${project}/locations/${location}`;
const maxBody=100000, maxCharacters=24000;
const maxCharactersPerMinute=Number(process.env.CHARACTERS_PER_MINUTE||30000);
let used=0, windowEnd=0, token, tokenExpiry=0;

// Protect numeric quantities, commonly written formulas and option references.
const tokenPattern=/\b(?:[A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)*|\d+(?:[.,]\d+)?)\s*(?:=|[×÷+*/−<>≤≥-])\s*(?:\([^()\n]+\)|[A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)*|\d+(?:[.,]\d+)?)(?:\s*(?:[×÷+*/−-])\s*(?:\([^()\n]+\)|[A-Z][A-Z0-9_]*(?:\.[A-Z0-9_]+)*|\d+(?:[.,]\d+)?))*|\b[A-Z](?:\s*(?:,|\/|and|or)\s*[A-Z])+\b|\b[A-Z](?=[.)])|(?<=\b[oO]ption )\b[A-Z]\b|(?<=\b[aA]nswer )\b[A-Z]\b|[$€£]?[-−+]?\d+(?:[.,:/–-]\d+)*\s?[%‰]?/g;
const escape=text=>text.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const unescape=text=>text.replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[\da-f]+);/gi,entity=>{
 const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};
 if(Object.hasOwn(named,entity))return named[entity];
 const hexadecimal=entity.startsWith('&#x');
 return String.fromCodePoint(parseInt(entity.slice(hexadecimal?3:2,-1),hexadecimal?16:10));
});

function prepare(text){
 const protectedText=[];
 let html='',offset=0;
 for(const match of text.matchAll(tokenPattern)){
  const value=match[0].trimEnd();
  const marker=`VCEPH${protectedText.push(value)-1}BEGIN${escape(value)}VCEPHEND`;
  html+=escape(text.slice(offset,match.index))+`<span class="notranslate" translate="no">${marker}</span>`;
  offset=match.index+value.length;
 }
 html+=escape(text.slice(offset));
 return {html,protectedText};
}

function restore(html,protectedText){
 const found=new Set();
 const plain=unescape(html.replace(/<[^>]*>/g,'')).replace(/VCEPH(\d+)BEGIN[\s\S]*?VCEPHEND/g,(_,rawIndex)=>{
  const index=Number(rawIndex);
  if(!Object.hasOwn(protectedText,index)||found.has(index))throw Error('Invalid protected text');
  found.add(index);
  return '\u2066'+protectedText[index]+'\u2069';
 });
 if(found.size!==protectedText.length||!plain.trim())throw Error('Incomplete translation');
 return plain;
}

async function accessToken(){
 if(Date.now()<tokenExpiry)return token;
 const response=await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',{
  headers:{'Metadata-Flavor':'Google'},signal:AbortSignal.timeout(3000)
 });
 if(!response.ok)throw Error('Identity unavailable');
 const identity=await response.json();
 token=identity.access_token;
 tokenExpiry=Date.now()+(identity.expires_in-60)*1000;
 return token;
}

async function translate(prepared){
 const endpoint='https://translation.googleapis.com';
 const response=await fetch(`${endpoint}/v3/${parent}:translateText`,{
  method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${await accessToken()}`},
  signal:AbortSignal.timeout(14000),
  body:JSON.stringify({
   contents:prepared.map(item=>item.html),mimeType:'text/html',sourceLanguageCode:'en',targetLanguageCode:'ar',
   ...(glossary?{glossaryConfig:{glossary:`${parent}/glossaries/${glossary}`,ignoreCase:true}}:{})
  })
 });
 if(!response.ok)throw Error('Provider unavailable');
 const data=await response.json();
 const translations=glossary?data.glossaryTranslations:data.translations;
 if(translations?.length!==prepared.length)throw Error('Incomplete translation');
 return translations.map(({translatedText},index)=>restore(translatedText,prepared[index].protectedText));
}

async function readTexts(request){
 let size=0;
 const chunks=[];
 for await(const chunk of request.iterator({destroyOnReturn:false})){
  size+=chunk.length;
  if(size>maxBody)return null;
  chunks.push(chunk);
 }
 const {texts}=JSON.parse(Buffer.concat(chunks).toString('utf8'));
 if(!Array.isArray(texts)||!texts.length||texts.length>128||texts.some(text=>typeof text!=='string'||!text.trim()||text.length>1600))return null;
 if(texts.some(text=>text.includes('[[VCE_IMAGE:')||text.includes('VCEPH')))return null;
 return texts;
}

const server=createServer(async(request,response)=>{
 function send(status,body){
  response.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
  response.end(JSON.stringify(body));
 }
 if(request.url!=='/translate'||request.headers.origin!==allowedOrigin){send(403,{error:'Origin or route unavailable'});return}
 response.setHeader('Access-Control-Allow-Origin',allowedOrigin);
 response.setHeader('Vary','Origin');
 if(request.method==='OPTIONS'){
  response.writeHead(204,{'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'});
  response.end();return;
 }
 if(request.method!=='POST'||request.headers['content-type']!=='application/json'){send(415,{error:'Expected JSON POST'});return}
 let texts;
 try{texts=await readTexts(request)}catch{send(400,{error:'Invalid JSON'});return}
 if(!texts||texts.reduce((sum,text)=>sum+text.length,0)>8000){send(400,{error:'Invalid translation input'});return}
 const prepared=texts.map(prepare);
 const characters=prepared.reduce((sum,item)=>sum+item.html.length,0);
 if(prepared.some(item=>item.html.length>maxCharacters)){send(400,{error:'Translation segment is too large'});return}
 if(!project){send(503,{error:'Translation service is not configured'});return}
 if(Date.now()>=windowEnd){used=0;windowEnd=Date.now()+60000}
 if(used+characters>maxCharactersPerMinute){send(429,{error:'Translation capacity reached'});return}
 used+=characters;
 try{
  const batches=[];
  let batch=[],size=0;
  for(const item of prepared){
   if(size+item.html.length>maxCharacters){batches.push(batch);batch=[];size=0}
   batch.push(item);size+=item.html.length;
  }
  if(batch.length)batches.push(batch);
  send(200,{translations:(await Promise.all(batches.map(translate))).flat()});
 }catch{send(502,{error:'Translation unavailable'})}
});
server.listen(port);
