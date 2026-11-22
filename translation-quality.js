const glossary = new Map([
 ['project charter','ميثاق المشروع'],
 ['risk register','سجل المخاطر'],
 ['change request','طلب تغيير'],
 ['project sponsor','راعي المشروع'],
 ['project manager','مدير المشروع'],
 ['cost performance index','مؤشر أداء التكلفة'],
 ['earned value','القيمة المكتسبة'],
 ['actual cost','التكلفة الفعلية'],
 ['sprint review','مراجعة السبرنت'],
 ['sprint retrospective','الاجتماع الاستعادي للسبرنت'],
 ['retrospective','الاجتماع الاستعادي'],
 ['cost baseline','خط أساس التكلفة'],
 ['schedule baseline','خط أساس الجدول الزمني'],
 ['work breakdown structure','هيكل تجزئة العمل']
]);

const arabic=/\p{Script=Arabic}/u;
const negation=/\b(?:not|never|no|neither|none|without|cannot)\b|n['’]t\b/i;
const exception=/\b(?:except|excluding)\b/i;
const wordCounts=/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i;
const formula=/\b[A-Za-z][A-Za-z0-9_]*\s*=\s*[A-Za-z0-9_(][A-Za-z0-9_ .()/*+−-]*[A-Za-z0-9_)]/g;
const numeric=/(?:[$€£+−-]\s*)?\d+(?:[.,:/-]\d+)*(?:\s*[%‰])?/g;
const reference=/(?:\b(?:option|answer|choice|sponsor)\s+([A-Z])\b)|\b([A-Z]{2,}[A-Z0-9-]*)\b/g;
const name=/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;

export async function translateForExam(text,infer){
 const term=glossary.get(text.toLowerCase());
 if(term)return term;
 if(!/[a-z]/i.test(text))return null;
 if(/^select all (?:that apply|applicable answers)\.?$/i.test(text))return 'اختر كل ما ينطبق.';
 const twoActions=text.match(/^which two actions should the (.+?) take\?(\s+select all that apply\.)?$/i);
 const role=twoActions&&glossary.get(twoActions[1].toLowerCase());
 if(role)return `ما الإجراءان اللذان ينبغي ل${role} اتخاذهما؟`+(twoActions[2]?' اختر كل ما ينطبق.':'');
 // Keep the equation as a left-to-right run and translate its known label.
 const equation=text.match(/^the (.+?) \(([A-Z][A-Z0-9]*)\) is calculated as ([A-Z][A-Z0-9]*\s*=\s*[A-Z0-9_ ()/*+−.-]+)\.$/i);
 const label=equation&&glossary.get(equation[1].toLowerCase());
 if(label)return `يُحسب ${label} (\u2066${equation[2]}\u2069) بالمعادلة \u2066${equation[3]}\u2069.`;

 let output=await infer(text);
 if(!output||!arabic.test(output))return null;
 output=output.replaceAll('مؤشر أداء التكاليف','مؤشر أداء التكلفة')
  .replaceAll('ليس مسؤولية من مسؤولية','ليس من مسؤوليات');
 if(/\bproject charter\b/i.test(text)){
  output=output.replaceAll('مشروع عقد الإيجار','ميثاق المشروع').replaceAll('ميثاق المشاريع','ميثاق المشروع');
 }
 if(negation.test(text)&&!/(?:^|\s)(?:و?لا|و?لم|و?لن|ليس\p{L}*|غير|دون|بدون|أبداً)(?=\s|[.،؟]|$)/u.test(output))return null;
 if(exception.test(text)&&!/(?:باستثناء|إلا|ما عدا|سوى|عدا)/u.test(output))return null;
 // Written counts can disappear even when the rest of the question reads naturally.
 if(wordCounts.test(text))return null;
 const numbers=value=>value.match(numeric)?.map(token=>token.replace(/\s/g,''))??[];
 if(JSON.stringify(numbers(text))!==JSON.stringify(numbers(output)))return null;
 for(const expression of text.match(formula)??[]){
  if(!output.includes(expression))return null;
  output=output.replace(expression,`\u2066${expression}\u2069`);
 }
 for(const [,letter,abbreviation] of text.matchAll(reference)){
  const token=letter??abbreviation;
  if(/^(NOT|EXCEPT|SELECT|ALL)$/.test(token))continue;
  if(!new RegExp(`\\b${token}\\b`).test(output))return null;
 }
 for(const properName of text.match(name)??[]){
  if(!glossary.has(properName.toLowerCase())&&!output.includes(properName))return null;
 }
 return output;
}
