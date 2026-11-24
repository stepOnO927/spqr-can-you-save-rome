// Bump browser import URLs after changing one or more local modules.
// Usage: node tools/bump-module-versions.mjs development.js
import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const requested=process.argv.slice(2).map(name=>resolve(root,name));
if(!requested.length)throw Error('Pass the changed module paths');
const files=new Set(execFileSync('git',['ls-files','-z'],{cwd:root}).toString().split('\0').filter(name=>/\.(?:js|mjs|html)$/.test(name)&&!/(^|\/)(?:tools|test|vendor|outputs|node_modules)\//.test(name)).map(name=>resolve(root,name)));
for(const file of requested)if(!files.has(file))throw Error(`Not a tracked runtime file: ${file}`);
const source=new Map(await Promise.all([...files].map(async file=>[file,await readFile(file,'utf8')])));
const importUrl=/(['"])(\.{1,2}\/[^'"\s]+?\.m?js\?v=)(\d+)\1/g;
const target=(from,url)=>resolve(dirname(from),url.slice(0,url.indexOf('?')));
const reverse=new Map();
for(const [file,body] of source){
 for(const match of body.matchAll(importUrl)){
  const dependency=target(file,match[2]);
  if(!files.has(dependency))continue;
  if(!reverse.has(dependency))reverse.set(dependency,new Set());
  reverse.get(dependency).add(file);
 }
}
const affected=new Set(requested),queue=[...requested];
for(let i=0;i<queue.length;i++)for(const importer of reverse.get(queue[i])||[])if(!affected.has(importer)){affected.add(importer);queue.push(importer)}
const updates=[];
for(const [file,body] of source){
 let count=0;
 const next=body.replace(importUrl,(whole,quote,url,version)=>{
  if(!affected.has(target(file,url)))return whole;
  count++;
  return `${quote}${url}${Number(version)+1}${quote}`;
 });
 if(count){await writeFile(file,next);updates.push({file:relative(root,file).replaceAll('\\','/'),imports:count})}
}
console.log(JSON.stringify({changedModuleCount:requested.length,updatedImporters:updates},null,2));
