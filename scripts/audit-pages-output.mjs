import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const manifest=path.join(root,'pages-output-manifest.txt');
const publicDocs=new Set(['MAP_SOURCES.md','map-lab/SOURCES.md','assets/portraits/SOURCES.md']);
const required=new Set([
 'index.html','map-lab/index.html','han/index.html',
 'fonts.css','assets/fonts/LICENSE.html',
 'assets/fonts/noto-sans-sc-chinese-simplified-400-normal.woff2'
]);
const forbiddenDirectories=new Set(['.git','.github','node_modules','test','tests','tools','scripts']);
const files=[];

function walk(directory){
 for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
  const absolute=path.join(directory,entry.name);
  if(entry.isDirectory())walk(absolute);
  else if(entry.isFile())files.push(path.relative(dist,absolute).split(path.sep).join('/'));
  else throw Error(`Unexpected public entry: ${absolute}`);
 }
}

if(!fs.existsSync(dist)||!fs.statSync(dist).isDirectory())throw Error('Build dist/ before auditing public output');
walk(dist);
if(files.length>20000)throw Error(`Cloudflare Pages file limit exceeded: ${files.length}`);
const seen=new Set(files);
for(const relative of required)if(!seen.has(relative))throw Error(`Required public asset missing: ${relative}`);
let total=0,largest=0;
for(const relative of files){
 const parts=relative.split('/');
 if(parts.some(part=>part.startsWith('.')||forbiddenDirectories.has(part)))throw Error(`Internal path in public output: ${relative}`);
 if(/(?:^|\/)(?:AGENTS|README|NEXT_STEPS|WORLD_EXPANSION|CLOUDFLARE_PAGES_MIGRATION|ANALYTICS_SETUP)/i.test(relative))throw Error(`Internal document in public output: ${relative}`);
 if(relative.endsWith('.md')&&!publicDocs.has(relative))throw Error(`Unexpected public document: ${relative}`);
 if(/(?:\.(?:test|spec)\.[cm]?js|\.(?:env|pem|p12|key|map)|(?:^|\/)package(?:-lock)?\.json)$/i.test(relative))throw Error(`Development or sensitive file in public output: ${relative}`);
 const size=fs.statSync(path.join(dist,relative)).size;
 if(size>25*1024*1024)throw Error(`Cloudflare Pages static asset too large: ${relative}`);
 total+=size;largest=Math.max(largest,size);
}
fs.writeFileSync(manifest,files.sort().map(relative=>`${String(fs.statSync(path.join(dist,relative)).size).padStart(9)}  ${relative}`).join('\n')+'\n');
console.log(`Audited dist/: ${files.length} public files, ${(total/1048576).toFixed(2)} MiB total, ${(largest/1048576).toFixed(2)} MiB largest; manifest saved outside dist/`);
