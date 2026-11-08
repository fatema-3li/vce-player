// A successful <img> load can still contain truncated/black pixels. Validate
// format integrity before treating extracted bytes as a usable diagram.
const crcTable=Array.from({length:256},(_,i)=>{let c=i;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);return c>>>0;});
const crc=bytes=>{let c=0xffffffff;for(const b of bytes)c=(c>>>8)^crcTable[(c^b)&255];return (c^0xffffffff)>>>0;};
const cache=new Map();
export function imageIssue(mime,encoded){
 const key=mime+encoded;if(cache.has(key))return cache.get(key);
 let issue='';
 try{
  const binary=atob(encoded),bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),view=new DataView(bytes.buffer);
  if(mime==='image/png'){
   if(![137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))throw Error();
   let pos=8,ended=false;
   while(pos+12<=bytes.length){const n=view.getUint32(pos),end=pos+n+12;if(end>bytes.length||crc(bytes.subarray(pos+4,end-4))!==view.getUint32(end-4))throw Error();const kind=String.fromCharCode(...bytes.subarray(pos+4,pos+8));pos=end;if(kind==='IEND'){ended=n===0&&pos===bytes.length;break;}}
   if(!ended)throw Error();
  }else{
   if(bytes[0]!==255||bytes[1]!==216)throw Error();let pos=2,ended=false;
   while(pos<bytes.length){
    if(bytes[pos++]!==255)throw Error();while(bytes[pos]===255)pos++;const marker=bytes[pos++];
    if(marker===217){ended=true;break;}if(marker===1||marker>=208&&marker<=215)continue;
    if(!(marker>=192&&marker<=207||marker>=218&&marker<=239||marker===254)||pos+2>bytes.length)throw Error();
    const size=view.getUint16(pos);if(size<2||pos+size>bytes.length)throw Error();pos+=size;
    if(marker===218){while(pos<bytes.length-1){if(bytes[pos]!==255){pos++;continue;}let next=pos+1;while(bytes[next]===255)next++;if(bytes[next]===0||bytes[next]>=208&&bytes[next]<=215){pos=next+1;continue;}break;}}
   }
   if(!ended)throw Error();
  }
 }catch{issue='This extracted diagram contains damaged image data and cannot be displayed reliably. A working source image is needed.';}
 if(cache.size>=32)cache.delete(cache.keys().next().value);cache.set(key,issue);return issue;
}
