export const correct = (q, answer = []) => answer.length === q.answers.length && q.answers.every(a => answer.includes(a));
export function score(questions, answers) {
 const sections = {};
 let count = 0;
 for (const q of questions) {
  const ok = correct(q, answers[q.id]); count += Number(ok);
  const s = sections[q.section] ||= {items:0,correct:0}; s.items++; s.correct += Number(ok);
 }
 return {correct:count,total:questions.length,score:questions.length ? Math.round(count/questions.length*1000):0,sections};
}
export function validateExam(e) {
 if (!e || typeof e.title !== 'string' || !e.title.trim() || !Array.isArray(e.questions) || !e.questions.length) throw Error('An exam needs a title and at least one question.');
 const ids = new Set();
 for (const q of e.questions) {
  if (typeof q.id !== 'string' || !q.id || ids.has(q.id) || typeof q.prompt !== 'string' || typeof q.section !== 'string' || !Array.isArray(q.options) || q.options.length < 2 || !q.options.every(o=>typeof o==='string') || !Array.isArray(q.answers) || !q.answers.length || new Set(q.answers).size!==q.answers.length || !q.answers.every(a=>Number.isInteger(a)&&a>=0&&a<q.options.length)) throw Error('Invalid question: use unique string IDs, a prompt, section, options, and valid answer indexes.');
  if(q.explanation!==undefined && typeof q.explanation!=='string') throw Error('Explanations must be text.');
  for(const field of ['caseStudy','caseStudyTitle']) if(q[field]!==undefined && typeof q[field]!=='string') throw Error('Case study content and title must be text.');
  ids.add(q.id);
 }
 return e;
}
