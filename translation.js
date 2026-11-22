import {renderContent} from './content.js?v=stored-arabic-v1';
import {fingerprint, indexMemory, textParts, resolveSegment} from './translation-data.js?v=stored-arabic-v1';
import {read,write} from './storage.js?v=stored-arabic-v1';

const originals = new WeakMap();
const active = new WeakMap();
let arabic = false;
let indexedMemory, indexedSource;

export function languageButton(inExam=true) {
 return `<button type="button" ${inExam?'data-action="language" ':''}data-translation-toggle aria-pressed="false"><bdi lang="ar">العربية</bdi> / English</button>`;
}

export function restoreLanguage() {
 arabic = read('examLanguage','en') === 'ar';
}

export function toggleLanguage() {
 arabic = !arabic;
 write({examLanguage:arabic ? 'ar' : 'en'}).catch(() => {});
}

export async function applyTranslation(root, fields, context, bindImages) {
 const status = root.querySelector('[data-translation-status]');
 if (!status) return;
 root.querySelector('[data-translation-toggle]')?.setAttribute('aria-pressed',String(arabic));
 const request = {};
 active.set(root,request);
 const layout = root.querySelector('[data-translation-layout]');
 if (layout) {
  layout.dir = arabic ? 'rtl' : 'ltr';
  layout.classList.toggle('arabic-content',arabic);
 }

 const groups = new Map();
 root.querySelectorAll('[data-translate],[data-card-label],[data-match-label],[data-ui-ar]').forEach(element => {
  if (!originals.has(element)) originals.set(element,[...element.childNodes]);
  element.replaceChildren(...originals.get(element));
  element.removeAttribute('dir');
  element.removeAttribute('lang');
  if (!arabic) return;
  const {translate,cardLabel,matchLabel,uiAr} = element.dataset;
  if (uiAr !== undefined) {
   element.textContent = uiAr;
   element.lang = 'ar';
   return;
  }
  const field = translate ?? (cardLabel === undefined ? 'match-'+matchLabel : 'option-'+cardLabel);
  if (!fields[field]?.trim()) return;
  if (!groups.has(field)) groups.set(field,[]);
  groups.get(field).push(element);
 });
 status.textContent = '';
 status.lang = arabic ? 'ar' : 'en';
 status.dir = arabic ? 'rtl' : 'ltr';
 if (!arabic) {
  bindImages?.();
  return;
 }

 const stored = read('translationMemory',null);
 if (!indexedMemory || indexedSource !== stored) {
  indexedMemory = indexMemory(stored);
  indexedSource = stored;
 }
 const memory = indexedMemory;
 const results = await Promise.all([...groups].map(async ([field,elements]) => {
  const source = fields[field];
  const sourceHash = context.examId ? await fingerprint(source) : undefined;
  const parts = textParts(source);
  let translated = 0, total = 0, index = 0;
  const text = parts.map(part => {
   if (!part.text?.trim()) return part.image ?? part.text;
   const trimmed = part.text.trim();
   const result = resolveSegment(trimmed,field,index++,{...context,sourceHash},memory);
   translated += result.translated;
   total += result.total;
   return part.text.replace(trimmed,() => result.translated ? result.text : '\u2066'+trimmed+'\u2069');
  }).join('');
  return {elements,text,translated,total};
 }));
 if (active.get(root) !== request || !status.isConnected || !arabic || root.tagName === 'DIALOG' && !root.open) return;

 let translated = 0, total = 0;
 for (const result of results) {
  translated += result.translated;
  total += result.total;
  for (const element of result.elements) {
   element.dir = result.translated ? 'rtl' : 'ltr';
   element.lang = result.translated ? 'ar' : 'en';
   if (!result.translated) continue;
   if (element.hasAttribute('data-translate') && element.tagName !== 'HEADER') {
    element.innerHTML = renderContent(result.text);
   } else {
    element.textContent = result.text;
   }
  }
 }
 status.textContent = translated === 0 ? 'لا تتوفر ترجمة عربية لهذا النص. يُعرض النص الإنجليزي.'
  : translated < total ? 'الترجمة العربية جزئية. تُعرض الأجزاء المتبقية بالإنجليزية.'
  : 'الترجمة العربية للنص المعروض مكتملة.';
 if (root.querySelector('.exam-image')) status.textContent += ' قد تتطلب تسميات الصور ترجمة منفصلة.';
 bindImages?.();
}
