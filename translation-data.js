import {imageTokens} from './content.js?v=stored-arabic-v1';

export const memoryFormat = 'pmp-translation-memory-v1';

export function questionFields(q) {
 const fields = {prompt:q.prompt, section:q.section, explanation:q.explanation,
  caseStudy:q.caseStudy, caseStudyTitle:q.caseStudyTitle};
 q.options.forEach((text, i) => { fields['option-'+i] = text; });
 q.matchingPrompts?.forEach((text, i) => { fields['match-'+i] = text; });
 return fields;
}

export async function fingerprint(text) {
 const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
 return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('');
}

export function textParts(source) {
 const parts = [];
 let offset = 0;
 for (const image of imageTokens(source)) {
  const index = source.indexOf(image, offset);
  parts.push(...lines(source.slice(offset,index)), {image});
  offset = index + image.length;
 }
 return parts.concat(lines(source.slice(offset)));
}

function lines(text) {
 return text.split(/(\r\n|\r|\n)/).filter(Boolean).map(text => ({text}));
}

export function fieldRole(field) {
 if (/^option-\d+$/.test(field)) return 'option';
 if (/^match-\d+$/.test(field)) return 'matchingSubject';
 return field;
}

const roles = new Set(['prompt','section','explanation','caseStudy','caseStudyTitle','option','matchingSubject']);
const statuses = new Set(['verified','needs-review']);
const hasText = value => typeof value === 'string' && !!value.trim();
const validArabic = value => hasText(value) && !imageTokens(value).length;
const validSegment = entry => statuses.has(entry?.status) &&
 (validArabic(entry.ar) || entry.status === 'needs-review' && entry.ar === undefined) &&
 (entry.reusable === undefined || typeof entry.reusable === 'boolean') &&
 (entry.note === undefined || typeof entry.note === 'string');

export async function examSegments(exam) {
 if (exam.sourceId !== undefined && !hasText(exam.sourceId)) throw Error('Invalid exam sourceId.');
 const entries = [];
 for (const q of exam.questions) {
  if (q.translation === undefined) continue;
  if (!hasText(exam.sourceId) || q.translation?.version !== 1 ||
      !q.translation.fields || Array.isArray(q.translation.fields) || typeof q.translation.fields !== 'object') {
   throw Error('Bilingual questions need an exam sourceId and version 1 translation fields.');
  }
  const fields = questionFields(q);
  for (const [field, entry] of Object.entries(q.translation.fields)) {
   const source = Object.hasOwn(fields,field) ? fields[field] : undefined;
   if (!hasText(source) || entry?.sourceHash !== await fingerprint(source)) {
    throw Error('English source fingerprint mismatch for '+q.id+' / '+field+'.');
   }
   const parts = textParts(source).filter(part => part.text?.trim());
   if (!Array.isArray(entry.segments) || entry.segments.length !== parts.length) {
    throw Error('Translation segment count mismatch for '+q.id+' / '+field+'.');
   }
   entry.segments.forEach((segment, index) => {
    if (segment === null) return;
    if (!validSegment(segment)) {
     throw Error('Invalid translation segment for '+q.id+' / '+field+'.');
    }
    entries.push({
     role:fieldRole(field), en:parts[index].text.trim(), status:segment.status,
     ...(segment.ar === undefined ? {} : {ar:segment.ar}),
     ...(segment.reusable === undefined ? {} : {reusable:segment.reusable}),
     ...(segment.note !== undefined ? {note:segment.note} : {}),
     scope:{examId:exam.sourceId, questionId:q.id, field, sourceHash:entry.sourceHash, index}
    });
   });
  }
 }
 return entries;
}

export function validateMemory(data) {
 if (data?.format !== memoryFormat || !Array.isArray(data.segments) || !Array.isArray(data.glossary)) {
  throw Error('Invalid translation memory format.');
 }
 for (const entry of data.segments) {
  if (!roles.has(entry?.role) || !hasText(entry.en) || !validSegment(entry)) {
   throw Error('Invalid translation memory segment.');
  }
  const scope = entry.scope;
  if (scope !== undefined && (!hasText(scope?.examId) || !hasText(scope.questionId) ||
      !hasText(scope.field) || fieldRole(scope.field) !== entry.role || !/^[0-9a-f]{64}$/.test(scope.sourceHash) ||
      !Number.isInteger(scope.index) || scope.index < 0)) {
   throw Error('Invalid translation memory scope.');
  }
 }
 for (const term of data.glossary) {
  if (!hasText(term?.en) || !validArabic(term.ar)) throw Error('Invalid glossary entry.');
 }
 return data;
}

export function mergeMemory(previous, added) {
 function append(old, updates) {
  const merged = new Map(old.map(entry => [JSON.stringify(entry),entry]));
  for (const entry of updates) merged.set(JSON.stringify(entry),entry);
  return [...merged.values()];
 }
 return {format:memoryFormat, segments:append(previous?.segments || [],added.segments),
  glossary:append(previous?.glossary || [],added.glossary)};
}

const key = (role, en) => JSON.stringify([role,en]);
const scopeKey = ({examId,questionId,field,sourceHash,index}) =>
 JSON.stringify([examId,questionId,field,sourceHash,index]);

export function indexMemory(memory) {
 const exact = new Map();
 const sentences = new Map();
 const scoped = new Map();
 const unscoped = [];
 for (const entry of memory?.segments || []) {
  if (entry.scope) scoped.set(scopeKey(entry.scope),entry);
  else unscoped.push(entry);
 }
 for (const entry of [...unscoped,...scoped.values()]) {
  if (entry.status !== 'verified' || entry.reusable === false) continue;
  const id = key(entry.role,entry.en);
  if (!exact.has(id)) exact.set(id,entry.ar);
  else if (exact.get(id) !== entry.ar) exact.set(id,null);
  if (entry.reusable === true) sentences.set(id,entry.ar);
 }
 return {exact,scoped,sentences};
}

export function resolveSegment(en, field, index, context, memory) {
 const role = fieldRole(field);
 const scoped = memory.scoped.get(scopeKey({...context,field,index}));
 if (scoped?.en === en) {
  return {text:scoped.status === 'verified' ? scoped.ar : en,
   translated:Number(scoped.status === 'verified'), total:1};
 }
 const ar = memory.exact.get(key(role,en));
 if (ar) return {text:ar,translated:1,total:1};

 // Reuse whole, punctuated sentences. Never substitute glossary words into prose.
 const sentences = en.match(/[^.!?]+(?:[.!?]+(?=\s|$)|$)/g);
 if (!sentences || sentences.length < 2 || sentences.join('') !== en) {
  return {text:en,translated:0,total:1};
 }
 let translated = 0;
 const text = sentences.map(sentence => {
  const id = key(role,sentence.trim());
  const match = memory.sentences.has(id) && memory.exact.get(id);
  if (!match) return '\u2066'+sentence+'\u2069';
  translated++;
  return sentence.replace(sentence.trim(),() => match);
 }).join('');
 return {text:translated ? text : en,translated,total:sentences.length};
}
