import {introductionArabic} from './introduction-arabic.js?v=introduction-native-fix-20261124';
const questions = new Map(introductionArabic.map(q=>[q.id,q]));

// Require the original prompt and field fingerprints: never guess by question order.
export function bundledTranslation(questionId,promptHash,field,sourceHash,index) {
 const question=questions.get(questionId);
 if (!question || question.promptHash!==promptHash) return undefined;
 const entry=question.fields[field];
 return entry?.sourceHash===sourceHash ? entry.ar[index] : undefined;
}
