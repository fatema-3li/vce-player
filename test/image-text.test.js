import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {repairEncoding} from '../text-encoding.js';import {imageIssue} from '../image-integrity.js';import {renderContent} from '../content.js';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4//8/AAX+Av4N70a4AAAAAElFTkSuQmCC';
test('encoding repair restores quotation marks and preserves ordinary Unicode',()=>{
 assert.equal(repairEncoding('â€œprocess improvement,â€\u009d'),'“process improvement,”');assert.equal(repairEncoding('Café — العربية'),'Café — العربية');assert.equal(repairEncoding('â not an encoded sequence'),'â not an encoded sequence');assert.ok(!renderContent('â€œ<hello>â€\u009d').includes('<hello>'));
});
test('image validation accepts complete PNGs and catches corruption before presenting a diagram',()=>{
 assert.equal(imageIssue('image/png',png),'');const damaged=Buffer.from(png,'base64');damaged[45]^=1;assert.match(imageIssue('image/png',damaged.toString('base64')),/damaged/);assert.match(renderContent(`[[VCE_IMAGE:image/png;base64,${damaged.toString('base64')}]]`),/diagram-warning/);assert.ok(!renderContent(`[[VCE_IMAGE:image/png;base64,${png}]]`).includes('diagram-warning'));
});
test('Risk chart and both case-study images are checked beyond browser load metadata',{skip:!process.env.VCE_RISK_TEST_FILE},async()=>{
 const {parseVce}=await import('../vce.js');const exam=parseVce(readFileSync(process.env.VCE_RISK_TEST_FILE));let count=0;
 for(const content of [exam.questions[76].caseStudy,exam.questions[86].prompt])for(const match of content.matchAll(/\[\[VCE_IMAGE:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/=]+)\]\]/g)){assert.match(imageIssue(match[1],match[2]),/damaged/);count++;}assert.equal(count,3);
});
