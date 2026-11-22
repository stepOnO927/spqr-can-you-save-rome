import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd(),unversioned='<unversioned>';
function gameFiles(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  if(entry.isDirectory())return ['.git','node_modules','dist','test','scripts','tools'].includes(entry.name)?[]:gameFiles(path.join(dir,entry.name));
  return entry.name.endsWith('.js')?[path.join(dir,entry.name)]:[];
 });
}
function moduleReferences(file){
 const source=fs.readFileSync(file,'utf8');
 return [...source.matchAll(/[\x27\x22]([^\x27\x22]+\.js)(?:\?v=([A-Za-z0-9_-]+))?[\x27\x22]/g)].map(([,spec,version])=>({
  target:path.resolve(spec.startsWith('/')?root:path.dirname(file),spec.startsWith('/')?spec.slice(1):spec),
  version:version||unversioned
 }));
}

test('campaign and atlas use one cache version for each shared JavaScript module',()=>{
 const versions=new Map();
 for(const dir of ['.','map-lab'])for(const name of fs.readdirSync(dir)){
  if(!/\.(js|html)$/.test(name)||name.endsWith('.test.js'))continue;
  const file=path.join(dir,name),text=fs.readFileSync(file,'utf8');
  for(const match of text.matchAll(/(?:from\s+|src=)["']([^"'?]+\.js)(?:\?v=([^"']+))?["']/g)){
   const module=path.normalize(path.join(dir,match[1])),version=match[2]||'<unversioned>';
   if(!versions.has(module))versions.set(module,new Map());
   const uses=versions.get(module);if(!uses.has(version))uses.set(version,[]);uses.get(version).push(file);
  }
 }
 const conflicts=[...versions].filter(([,uses])=>uses.size>1).map(([module,uses])=>`${module}: ${JSON.stringify(Object.fromEntries(uses))}`);
 assert.deepEqual(conflicts,[],`A browser can cache different copies of the same game logic:\n${conflicts.join('\n')}`);
 const runtime=new Map();
 for(const file of gameFiles(root))for(const {target,version} of moduleReferences(file)){
  if(!runtime.has(target))runtime.set(target,new Set());runtime.get(target).add(version);
 }
 const multiplePinned=[...runtime].filter(([,seen])=>[...seen].filter(version=>version!==unversioned).length>1);
 assert.deepEqual(multiplePinned,[],`Runtime imports must agree on each module's cache version.`);
 const stale=[];
 for(const dir of ['scripts','tools'])for(const name of fs.readdirSync(dir)){
  if(!name.endsWith('.mjs'))continue;
  const file=path.join(root,dir,name);
  for(const {target,version} of moduleReferences(file)){
   const known=runtime.get(target);if(!known)continue;
   const expected=[...known].find(value=>value!==unversioned)||unversioned;
   if(version!==expected)stale.push(`${path.relative(root,file)}: ${path.relative(root,target)} uses ${version}, expected ${expected}`);
  }
 }
 assert.deepEqual(stale,[],`Browser and simulation scripts must import the same module instance as the game: ${stale.join(', ')}`);
});
