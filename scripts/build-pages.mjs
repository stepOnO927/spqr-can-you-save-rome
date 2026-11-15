import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist');
const entries=['index.html','map-lab/index.html','han/index.html'];
const publicDocs=['map-lab/SOURCES.md','MAP_SOURCES.md','assets/portraits/SOURCES.md'];
const selected=new Set();

function add(relative){
  const clean=relative.replaceAll('\\','/').split('?')[0].split('#')[0];
  if(!clean||clean.startsWith('/')||clean.split('/').includes('..'))throw Error(`Invalid public path: ${relative}`);
  if(selected.has(clean))return;
  const full=path.join(root,clean);
  if(!fs.existsSync(full)||!fs.statSync(full).isFile())throw Error(`Missing runtime dependency: ${clean}`);
  selected.add(clean);
  const source=fs.readFileSync(full,'utf8');
  if(clean.endsWith('.html')){
    for(const match of source.matchAll(/\b(?:src|href)=["']([^"']+)["']/g))follow(clean,match[1]);
  }else if(clean.endsWith('.js')){
    for(const match of source.matchAll(/\b(?:import|export)\s+(?:[^'";]*?\s+from\s*)?["']([^"']+)["']/g))follow(clean,match[1]);
    for(const match of source.matchAll(/\bimport\s*\(\s*["']([^"']+)["']\s*\)/g))follow(clean,match[1]);
  }else if(clean.endsWith('.css')){
    for(const match of source.matchAll(/\burl\(\s*["']?([^)'"\s]+)["']?\s*\)/g))follow(clean,match[1]);
    for(const match of source.matchAll(/@import\s+["']([^"']+)["']/g))follow(clean,match[1]);
  }
}

function follow(from,reference){
  if(/^(?:[a-z][a-z\d+.-]*:|\/\/|#|data:)/i.test(reference))return;
  const pathname=reference.split(/[?#]/)[0];
  if(!pathname||pathname.endsWith('/'))return;
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(from),pathname));
  add(resolved);
}

for(const entry of entries)add(entry);
for(const doc of publicDocs)add(doc);
// Portrait keys are chosen at runtime from saved characters, so publish every
// display-sized portrait. The source masters and unused 512px files stay private.
for(const name of fs.readdirSync(path.join(root,'assets/portraits'))){
  if(/-128\.jpg$/i.test(name))add(`assets/portraits/${name}`);
}

fs.rmSync(out,{recursive:true,force:true});
for(const relative of [...selected].sort()){
  const target=path.join(out,relative);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.copyFileSync(path.join(root,relative),target);
}
console.log(`Cloudflare Pages: ${selected.size} public files in dist/`);
