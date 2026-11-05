// Run before publishing frontend changes so browsers fetch a consistent module graph.
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
const root=new URL('../',import.meta.url),tag=process.argv[2]||Date.now().toString(36);
if(!/^[A-Za-z0-9_-]+$/.test(tag))throw Error('Use an alphanumeric release tag.');
for(const name of readdirSync(root).filter(n=>n.endsWith('.js'))){
 const path=new URL(name,root),before=readFileSync(path,'utf8');
 const after=before.replace(/((?:from\s*|import\s*)['"])(\.\/[^'"]+\.js)(?:\?v=[^'"]*)?(['"])/g,`$1$2?v=${tag}$3`);
 if(after!==before)writeFileSync(path,after);
}
const html=new URL('index.html',root);
writeFileSync(html,readFileSync(html,'utf8').replace(/(href="style\.css|src="app\.js)(?:\?v=[^"]*)?"/g,`$1?v=${tag}"`));
console.log(`Stamped frontend assets: ${tag}`);
