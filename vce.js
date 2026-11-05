// Format-31 interoperability reader. Field framing documented at
// https://github.com/jgt87/vce-player/blob/main/docs/VCE-FILE-FORMAT.md
// Independently implemented; rejects unsupported structures rather than guessing.
const fail = message => { throw new Error(message); };
const f = (a,b) => (((a^b)|1)*(((a+b)&255)^1))&255;
const roundEven = x => { const lo=Math.floor(x), d=x-lo; return d===0.5 ? lo+(lo%2!==0?1:0) : Math.round(x); };
const g = (a,b,i) => ((roundEven(a*Math.sin(b))&255)^i)&255;
class Reader {
 constructor(bytes){this.bytes=bytes;this.pos=0;}
 take(n){if(!Number.isSafeInteger(n)||n<0||n>this.bytes.length-this.pos)fail('Truncated or invalid VCE data.');const v=this.bytes.subarray(this.pos,this.pos+n);this.pos+=n;return v;}
 byte(){return this.take(1)[0];}
 int(){const b=this.take(4);return new DataView(b.buffer,b.byteOffset,4).getUint32(0,true);}
 header(){const seed=this.byte();let key=g(128,f(seed,seed^128),0),n=0;for(let i=0;i<4;i++){const c=this.byte(),p=c^key;n+=p*2**(8*i);key=g(key,f(c,p),i+1);}return {n,key};}
 field(){let {n,key}=this.header();const raw=this.take(n),plain=new Uint8Array(n);for(let i=0;i<n;i++){const c=raw[i],p=c^key;plain[i]=p;key=g(key,f(c,p),((i+4)&255)+1);}return plain;}
 text(){return new TextDecoder('windows-1252').decode(this.field());}
}
function richText(bytes){
 const raw=new TextDecoder('latin1').decode(bytes); // ASCII controls only; content is decoded from original bytes.
 if(!raw.startsWith('-8 1 3 1\r\n'))fail('Unsupported VCE document format.');
 const matches=[...raw.matchAll(/(-?\d+(?: -?\d+){4} (?:-?\d+|"[^"\r\n]*")(?: -?\d+){0,7})\r\n/g)];
 if(!matches.length)fail('Missing VCE text records.');
 let result='';
 for(let i=0;i<matches.length;i++){
  const match=matches[i],values=match[1].split(' ').map(Number),style=values[0];
  if(style===-3){
   const start=match.index+match[0].length;
   const header=/^\r\n(TPngImage|TJPEGImage)\r\n(?:width=\d+\r\n)?(?:height=\d+\r\n)?/.exec(raw.slice(start));
   if(!header)fail('Unsupported VCE image header.');
   const lengthPos=start+header[0].length;
   if(lengthPos+4>bytes.length)fail('Truncated VCE image header.');
   const size=new DataView(bytes.buffer,bytes.byteOffset+lengthPos,4).getUint32(0,true),imageStart=lengthPos+4,end=imageStart+size;
   if(!size||end>bytes.length)fail('Truncated VCE image.');
   const image=bytes.subarray(imageStart,end),png=header[1]==='TPngImage';
   if(png ? ![137,80,78,71,13,10,26,10].every((b,j)=>image[j]===b) : image[0]!==255||image[1]!==216)fail('Invalid VCE image signature.');
   let binary='';for(let j=0;j<image.length;j+=8192)binary+=String.fromCharCode(...image.subarray(j,j+8192));
   result+='\n[[VCE_IMAGE:'+ (png?'image/png':'image/jpeg')+';base64,'+btoa(binary)+']]\n';
   while(i+1<matches.length&&matches[i+1].index<end)i++;
   continue;
  }
  if(style===-9&&match[1]==='-9 0 0 0 0 0 7'){result+='\n';continue;}
  if(style<0){if(style!==-12)fail('This VCE contains an unsupported rich-content item.');continue;}
  let body=bytes.subarray(match.index+match[0].length,i+1<matches.length?matches[i+1].index:bytes.length);
  if(body.length>=2&&body.at(-2)===13&&body.at(-1)===10)body=body.subarray(0,-2);
  const unicode=!!(values[3]&8);
  if(unicode&&body.length%2)fail('Invalid VCE Unicode text.');
  result+=new TextDecoder(unicode?'utf-16le':'windows-1252',{fatal:true}).decode(body).replace(/[\u2028\u2029]/g,'\n');
 }
 return result.trim();
}
function documents(bytes){const r=new Reader(bytes),docs=[];while(r.pos<bytes.length){if(docs.length>100)fail('Too many VCE document parts.');const {n}=r.header();docs.push(richText(r.take(n)));}return docs;}
export function parseVce(buffer){
 const bytes=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
 if(bytes.length>5e6)fail('VCE files must be smaller than 5 MB.');
 const r=new Reader(bytes);
 if(r.byte()!==0x85||r.byte()!==0xa8)fail('Not a valid VCE file.');
 const version=r.byte()*10+r.byte();
 if(version!==31)fail(`VCE format ${version} is not supported yet. This reader supports format 3.1 textual choice exams.`);
 const flags=r.byte();if(flags&4)fail('Password-protected VCE files are not supported.');
 const number=r.text(),title=r.text(),passingScore=r.int(),timeLimit=r.int(),fileVersion=r.text();
 r.take(34);r.field(); // four timestamps, two flags, reserved field
 r.field(); // shared font styles
 richText(r.field()); // description: validate supported content
 const sectionCount=r.int();if(sectionCount!==0)fail('VCE files with named sections are not supported yet.');
 const examCount=r.int();if(examCount<1||examCount>100)fail('Invalid VCE exam count.');
 const questions=[];
 for(let examIndex=0;examIndex<examCount;examIndex++){
  if(r.byte()!==0)fail('VCE case-study exam groups are not supported yet.');
  const group=r.text(),count=r.int();if(count<1||count>10000)fail('Invalid VCE question count.');
  for(let i=0;i<count;i++){
   r.byte();const {n}=r.header(),end=r.pos+n;if(end>bytes.length)fail('Truncated VCE question.');
   const type=r.byte();if(type!==0&&type!==1)fail(`VCE question type ${type} is not supported yet.`);
   const section=r.int();r.int();const extra=r.int();if(extra!==0)fail('Unsupported VCE question extension.');
   const docs=documents(r.field()),answer=r.text(),choices=r.int();r.take(3);r.field();
   if(r.pos!==end||choices<2||choices>26||docs.length!==choices+2)fail('VCE question boundaries or choice counts do not match.');
   if(!/^[A-Z]+$/.test(answer)||new Set(answer).size!==answer.length)fail('Invalid VCE correct-answer data.');
   const answers=[...answer].map(c=>c.charCodeAt(0)-65);if(answers.some(a=>a>=choices))fail('VCE answer refers to a missing choice.');
   questions.push({id:`vce-${examIndex+1}-${i+1}`,section:section===0xffffffff?group:`${group} / Section ${section}`,prompt:docs[0],options:docs.slice(1,1+choices),answers,explanation:docs.at(-1)});
  }
 }
 if(bytes.length-r.pos!==12||r.int()!==bytes.length)fail('VCE file length check failed.');
 return {title,number,questions,sourceFormat:'vce-31',passingScore,timeLimit,fileVersion};
}
