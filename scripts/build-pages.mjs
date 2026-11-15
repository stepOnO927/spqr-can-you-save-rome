import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'dist');
const entries=['index.html','map-lab/index.html','han/index.html','release.json'];
const publicDocs=['map-lab/SOURCES.md','MAP_SOURCES.md','assets/portraits/SOURCES.md'];
const selected=new Set();
const limit=25*1024*1024;
const vendor=new Map([
  ['vendor/maplibre-gl.js','node_modules/maplibre-gl/dist/maplibre-gl.mjs'],
  ['vendor/maplibre-gl-worker.js','node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'],
  ['vendor/maplibre-gl.css','node_modules/maplibre-gl/dist/maplibre-gl.css'],
  ['vendor/LICENSE.txt','node_modules/maplibre-gl/LICENSE.txt']
]);

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
for(const name of vendor.keys())selected.add(name);
if(selected.size>20000)throw Error('Cloudflare Pages Free plan file count exceeded');
for(const relative of selected){
  if(/(^|\/)(?:test|tests|tools|scripts|\.github|node_modules)\//.test(relative)||/(?:^|\/)\./.test(relative)||/\.(?:test|spec)\.[cm]?js$/.test(relative))throw Error(`Internal file selected: ${relative}`);
  if(relative.endsWith('.md')&&!publicDocs.includes(relative))throw Error(`Internal document selected: ${relative}`);
}

fs.rmSync(out,{recursive:true,force:true});
let total=0,largest=0;
for(const relative of [...selected].sort()){
  const target=path.join(out,relative);
  const source=path.join(root,vendor.get(relative)||relative);
  let data=fs.readFileSync(source);
  if(relative.endsWith('.html')){
    let html=data.toString('utf8').replace(/(?:\s*<!-- Cloudflare Web Analytics -->)?\s*<script\b[^>]*\bsrc="https:\/\/static\.cloudflareinsights\.com\/beacon\.min\.js"[^>]*>\s*<\/script>(?:\s*<!-- End Cloudflare Web Analytics -->)?/g,'');
    if(relative==='map-lab/index.html')html=html.replace('https://unpkg.com/maplibre-gl@5.9.0/dist/maplibre-gl.css','../vendor/maplibre-gl.css').replace(/<script src="https:\/\/unpkg\.com\/maplibre-gl@5\.9\.0\/dist\/maplibre-gl\.js"><\/script><script type="module" src="([^"]+)"><\/script>/,(_,lab)=>`<script type="module">import * as maplibregl from "../vendor/maplibre-gl.js"; maplibregl.setWorkerUrl(new URL("../vendor/maplibre-gl-worker.js",location.href).href); window.maplibregl=maplibregl; await import("${lab}");</script>`);
    if(html.includes('static.cloudflareinsights.com/beacon.min.js')||html.includes('unpkg.com/maplibre-gl@5.9.0'))throw Error(`Unconverted public dependency: ${relative}`);
    data=Buffer.from(html);
  }
  if(relative==='map-lab/SOURCES.md')data=Buffer.from(data.toString('utf8').replace('MapLibre GL JS 5.9.0','MapLibre GL JS 6.18.0'));
  if(relative==='vendor/maplibre-gl.js'||relative==='vendor/maplibre-gl-worker.js')data=Buffer.from(data.toString('utf8').replace(/\n\/\/# sourceMappingURL=.*$/m,''));
  if(data.length>limit)throw Error(`${relative} exceeds Cloudflare Pages' 25 MiB static asset limit`);
  fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,data);
  total+=data.length;largest=Math.max(largest,data.length);
}
console.log(`Cloudflare Pages: ${selected.size} public files in dist/; ${(total/1048576).toFixed(2)} MiB total; largest ${(largest/1048576).toFixed(2)} MiB`);
