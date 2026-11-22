// Write the translation template to a private file outside the web root.
import {readFile,writeFile} from 'node:fs/promises';
import {parseVce} from '../vce.js';
import {validateExam} from '../engine.js';
import {matchingQuestion} from '../matching.js';
import {fingerprint,questionFields,textParts} from '../translation-data.js';

const [sourcePath,outputPath,sourceId]=process.argv.slice(2);
if(!sourcePath||!outputPath||!sourceId?.trim()){
 throw Error('Usage: node scripts/prepare-bilingual.mjs input.vce|input.json private-output.json stable-exam-id');
}
const input=await readFile(sourcePath);
const exam=validateExam(/\.vce$/i.test(sourcePath)?parseVce(input):JSON.parse(input.toString('utf8')));
if(exam.sourceId&&exam.sourceId!==sourceId)throw Error('Keep the existing sourceId when updating a bilingual exam.');
exam.sourceId=sourceId;
exam.questions=exam.questions.map(question=>{
 const canonical=matchingQuestion(question);
 return canonical===question ? question : {...canonical,originalQuestion:question};
});
let count=0;
for(const question of exam.questions){
 if(question.translation)throw Error('This file already has translation fields. Update it directly to preserve the existing work.');
 const fields={};
 for(const [field,source] of Object.entries(questionFields(question))){
  if(!source?.trim())continue;
  const parts=textParts(source).filter(part=>part.text?.trim());
  if(!parts.length)continue;
  fields[field]={sourceHash:await fingerprint(source),segments:parts.map(()=>null)};
  count+=parts.length;
 }
 question.translation={version:1,fields};
}
await writeFile(outputPath,JSON.stringify(exam,null,2)+'\n',{flag:'wx',mode:0o600});
console.log(`Prepared ${count} translation segments across ${exam.questions.length} questions.`);
