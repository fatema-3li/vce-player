// Undo valid UTF-8 sequences that were mistakenly saved as Windows-1252 text.
// Only common mojibake lead characters are considered; ordinary Unicode is kept.
const reverse=new Map(),cp=new TextDecoder('windows-1252'),utf8=new TextDecoder('utf-8',{fatal:true});
for(let i=0;i<256;i++)reverse.set(cp.decode(Uint8Array.of(i)),i);
export function repairEncoding(value){
 let text=String(value??'');
 for(let pass=0;pass<2;pass++){
  let result='',changed=false;
  for(let i=0;i<text.length;i++){
   const lead=reverse.get(text[i]),size=lead===0xc2||lead===0xc3?2:lead===0xe2?3:lead===0xf0?4:0;
   if(size){
    const bytes=[lead];for(let j=1;j<size;j++){const byte=reverse.get(text[i+j]);if(byte===undefined||byte<0x80||byte>0xbf)break;bytes.push(byte);}
    if(bytes.length===size){try{result+=utf8.decode(Uint8Array.from(bytes));i+=size-1;changed=true;continue;}catch{}}
   }
   result+=text[i];
  }
  text=result;if(!changed)break;
 }
 return text;
}
