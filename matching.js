// Recover explicit matching pairs from legacy text-only authoring workarounds.
export function matchingQuestion(q) {
 if(q.type==='matching'||!q.options?.length||!q.options.every(o=>!o.trim()))return q;
 const lines=q.prompt.split('\n'),pairs=[];let first=-1,last=-1;
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^\s*(.+?)\s*>{3,}\s*(.+?)\s*$/);
  if(m){if(first<0)first=i;last=i;pairs.push([m[1].trim(),m[2].trim()]);}
 }
 if(pairs.length<2||pairs.length>26||new Set(pairs.map(p=>p[0])).size!==pairs.length)return q;
 if(lines.slice(first,last+1).some(line=>line.trim()&&!/^\s*.+?\s*>{3,}\s*.+?\s*$/.test(line)))return q;
 const options=[...new Set(pairs.map(p=>p[1]))].sort((a,b)=>a.localeCompare(b));
 if(options.length<2)return q;
 const intro=lines.slice(0,first).join('\n').replace(/\(The below is the answer,[\s\S]*?\)/i,'').trim();
 const details=lines.slice(last+1).join('\n').replace(/^\s*Explanation\s*/i,'').trim();
 return {...q,type:'matching',matchingPrompts:pairs.map(p=>p[0]),options,answers:pairs.map(p=>options.indexOf(p[1])),prompt:intro,explanation:[details,q.explanation].filter(Boolean).join('\n\n'),matchingFromText:true};
}
