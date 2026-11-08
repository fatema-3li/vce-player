import {repairEncoding} from './text-encoding.js?v=risk-display-20261108';
import {imageIssue} from './image-integrity.js?v=risk-display-20261108';
export function imageTokens(value){return String(value??'').match(/\[\[VCE_IMAGE:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}\]\]/g)||[];}
// Exam content remains escaped text; only bounded raster-image tokens render.
export function renderContent(value) {
 const escape=s=>repairEncoding(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const parts=String(value??'').split(/(\[\[VCE_IMAGE:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}\]\])/g);
 return parts.map((part,i)=>{
  if(!(i%2))return escape(part);
  const data=part.slice(12,-2),[mime,encoded]=data.split(';base64,'),issue=imageIssue(mime,encoded);
  const img=`<img class="exam-image" src="data:${data}" alt="Exam diagram" loading="lazy">`;
  return issue?`<span class="diagram-warning" role="note">${escape(issue)}</span><details class="damaged-diagram"><summary>View extracted image anyway</summary>${img}</details>`:img;
 }).join('');
}
