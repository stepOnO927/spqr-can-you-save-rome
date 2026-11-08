import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

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
});
