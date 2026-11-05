import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderContent} from '../content.js';
test('embedded diagrams render as images while other content stays escaped',()=>{
 assert.match(renderContent('Diagram [[VCE_IMAGE:image/png;base64,iVBORw0KGgo=]]'),/src="data:image\/png;base64,iVBORw0KGgo="/);
 assert.equal(renderContent('<script>alert(1)</script>'),'&lt;script&gt;alert(1)&lt;/script&gt;');
 assert.ok(!renderContent('[[VCE_IMAGE:image/svg+xml;base64,PHN2Zz4=]]').includes('<img'));
});
