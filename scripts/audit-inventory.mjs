import fs from 'node:fs/promises';
import path from 'node:path';

const root=process.cwd(),entries=['index.html','map-lab/index.html','han/index.html'];
const excluded=new Set(['.git','node_modules','diagnostics','dist']);
async function walk(dir=''){
  const out=[];
  for(const item of await fs.readdir(path.join(root,dir),{withFileTypes:true})){
    if(excluded.has(item.name))continue;
    const rel=path.posix.join(dir,item.name);
    if(item.isDirectory())out.push(...await walk(rel));
    else out.push(rel);
  }
  return out;
}
const files=await walk(),set=new Set(files),textFiles=files.filter(f=>/\.(?:js|mjs|cjs|html|css|json|md|yml)$/.test(f));
const content=new Map(await Promise.all(textFiles.map(async f=>[f,await fs.readFile(path.join(root,f),'utf8')])));
function role(f){
  if(f.startsWith('assets/'))return 'Assets';
  if(f.startsWith('test/')||f.endsWith('.test.js'))return 'Testing';
  if(f.startsWith('tools/')||f.startsWith('scripts/')||f.startsWith('.github/'))return 'Development Tools';
  if(f.startsWith('han/'))return f.endsWith('.css')||f.endsWith('.html')||/\/(?:play|map|east-ui|experience-ui)\.js$/.test(f)?'DLC UI':'DLC Simulation';
  if(f.startsWith('map-lab/'))return f.endsWith('.css')||f.endsWith('.html')||/-ui\.js$|\/lab\.js$/.test(f)?'Map UI':'Map Data/Logic';
  if(/(?:engine|rome60|multipolar|scenarios)\.js$/.test(f))return 'Core Simulation';
  if(/(?:character|dynast|portrait|genealogy|personal|political-contact)/.test(f))return 'Characters/Politics';
  if(/(?:army|battle|legion|military|movement|strategic-planning)/.test(f))return 'Military';
  if(/(?:diplom|agreement|coalition|frontier)/.test(f))return 'Diplomacy';
  if(/(?:trade|invention|national-focus|land|religion)/.test(f))return 'Economy/Research';
  if(/(?:map|historical-territories|rivers|roads)/.test(f))return 'Map/Geography';
  if(/(?:epistulae|mail|chronicle|experience)/.test(f))return 'Events/UI';
  if(/(?:save|handoff|legacy)/.test(f))return 'Persistence';
  if(/\.html$|\.css$|(?:app|ui)\.js$/.test(f))return 'UI';
  return 'Other Runtime/Documentation';
}
const deps=new Map(),missing=[];
function resolve(from,ref){
  if(!ref.startsWith('.'))return null;
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(from),ref.split(/[?#]/)[0]));
  return target;
}
for(const f of textFiles){
  const s=content.get(f),refs=[];
  if(f.endsWith('.html')){
    for(const m of s.matchAll(/(?:src|href)=["']([^"']+)["']/g))refs.push(m[1]);
  }else if(/\.(?:js|mjs|cjs)$/.test(f)){
    for(const m of s.matchAll(/(?:\bfrom\s*|\bimport\s*\(|\bimport\s*)["']([^"']+)["']/g))refs.push(m[1]);
  }else if(f.endsWith('.css')){
    for(const m of s.matchAll(/@import\s+(?:url\()?["']([^"']+)["']/g))refs.push(m[1]);
    for(const m of s.matchAll(/url\(["']?([^"')]+)["']?\)/g))refs.push(m[1]);
  }
  const targets=[];
  for(const ref of refs){
    const target=resolve(f,ref);
    if(!target)continue;
    if(set.has(target))targets.push(target);
    else missing.push({from:f,ref,target});
  }
  deps.set(f,[...new Set(targets)]);
}
const reachable=new Set(),queue=[...entries];
while(queue.length){const f=queue.shift();if(reachable.has(f)||!set.has(f))continue;reachable.add(f);queue.push(...(deps.get(f)||[]));}
const source=files.filter(f=>/\.(?:js|mjs|cjs|css|html)$/.test(f)&&!f.startsWith('test/')&&!f.startsWith('tools/')&&!f.startsWith('scripts/')&&!f.startsWith('.github/'));
const candidates=source.filter(f=>!reachable.has(f));
const byRole=Object.groupBy(files,role);
const summary={generatedAt:new Date().toISOString(),entryPoints:entries,totalFiles:files.length,totalBytes:(await Promise.all(files.map(f=>fs.stat(path.join(root,f))))).reduce((n,s)=>n+s.size,0),byRole:Object.fromEntries(Object.entries(byRole).map(([key,value])=>[key,value.length])),runtimeSourceFiles:source.length,reachableRuntimeFiles:source.length-candidates.length,unreachedCandidates:candidates,missingLocalReferences:missing,externalReferenceCount:[...content.values()].reduce((n,s)=>n+[...s.matchAll(/https?:\/\//g)].length,0)};
await fs.mkdir(path.join(root,'diagnostics'),{recursive:true});
await fs.writeFile(path.join(root,'diagnostics','inventory.json'),JSON.stringify({summary,files:files.map(f=>({path:f,role:role(f),reachable:reachable.has(f),dependencies:deps.get(f)||[]}))},null,2));
await fs.writeFile(path.join(root,'diagnostics','inventory.md'),`# Source inventory\n\nGenerated ${summary.generatedAt}. Import reachability is a candidate signal, not proof that a feature is unused or broken.\n\n- Entry points: ${entries.join(', ')}\n- Files: ${files.length}; runtime source: ${source.length}; statically reachable: ${summary.reachableRuntimeFiles}\n- Unreached runtime candidates: ${candidates.length}; missing local references: ${missing.length}\n\n## Roles\n\n${Object.entries(summary.byRole).map(([k,v])=>`- ${k}: ${v}`).join('\n')}\n\n## Unreached candidates\n\n${candidates.map(x=>`- \`${x}\``).join('\n')||'None'}\n\n## Missing local references\n\n${missing.map(x=>`- \`${x.from}\` → \`${x.ref}\``).join('\n')||'None'}\n`);
console.log(JSON.stringify(summary));
