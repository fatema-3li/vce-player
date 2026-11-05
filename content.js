// Exam content is text except for bounded, embedded PNG/JPEG image tokens.
export function renderContent(value) {
 const escape=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const parts=String(value??'').split(/(\[\[VCE_IMAGE:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}\]\])/g);
 return parts.map((part,i)=>i%2?`<img class="exam-image" src="data:${part.slice(12,-2)}" alt="Exam diagram" loading="lazy">`:escape(part)).join('');
}
