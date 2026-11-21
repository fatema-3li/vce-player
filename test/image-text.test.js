import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {repairEncoding} from '../text-encoding.js';import {imageIssue} from '../image-integrity.js';import {imageTokens,renderContent} from '../content.js';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC';
test('encoding repair restores quotation marks and preserves ordinary Unicode',()=>{
 assert.equal(repairEncoding('â€œprocess improvement,â€\u009d'),'“process improvement,”');assert.equal(repairEncoding('Café — العربية'),'Café — العربية');assert.equal(repairEncoding('â not an encoded sequence'),'â not an encoded sequence');assert.ok(!renderContent('â€œ<hello>â€\u009d').includes('<hello>'));
});
test('image validation accepts complete PNGs and catches corruption before presenting a diagram',()=>{
 assert.equal(imageIssue('image/png',png),'');const damaged=Buffer.from(png,'base64');damaged[45]^=1;assert.match(imageIssue('image/png',damaged.toString('base64')),/damaged/);assert.match(renderContent(`[[VCE_IMAGE:image/png;base64,${damaged.toString('base64')}]]`),/diagram-warning/);assert.ok(!renderContent(`[[VCE_IMAGE:image/png;base64,${png}]]`).includes('diagram-warning'));
});
test('Risk uses a verified duplicate and reports the remaining damaged figures',{skip:!process.env.VCE_RISK_TEST_FILE},async()=>{
 const {parseVce}=await import('../vce.js');
 const {questions}=parseVce(readFileSync(process.env.VCE_RISK_TEST_FILE));
 const issues=tokens=>tokens.map(token=>Boolean(imageIssue(...token.slice(12,-2).split(';base64,'))));
 const first=imageTokens(questions[76].caseStudy);
 const second=imageTokens(questions[77].caseStudy);
 assert.equal(first[0],second[0]);
 assert.deepEqual(issues(first),[false,true]);
 assert.deepEqual(issues(second),[false,true]);
 assert.deepEqual(issues(imageTokens(questions[86].prompt)),[true]);
});
