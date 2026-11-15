import {execFileSync} from 'node:child_process';
import {cp,copyFile,readFile,writeFile,mkdir,rm,stat} from 'node:fs/promises';
import {join,dirname,extname} from 'node:path';

const root=process.cwd(),out=join(root,'dist','poki');
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const runtime=tracked.filter(p=>!p.startsWith('test/')&&!p.startsWith('tests/')&&!p.startsWith('tools/')&&!p.startsWith('scripts/')&&!p.startsWith('.github/')&&!p.includes('-master.')&&!/\\.(test|spec)\\.[cm]?js$/.test(p)&&
  (['.js','.css','.html','.json','.geojson','.png','.jpg','.jpeg','.webp','.svg','.woff','.woff2'].includes(extname(p))||p==='map-lab/SOURCES.md'));
await rm(out,{recursive:true,force:true});
for(const p of runtime){const dest=join(out,p);await mkdir(dirname(dest),{recursive:true});await copyFile(join(root,p),dest)}
for(const p of ['poki-bridge.js','map-lab/poki-style.js']){const dest=join(out,p);await mkdir(dirname(dest),{recursive:true});await copyFile(join(root,p),dest)}
const vendor=join(out,'vendor');await mkdir(vendor,{recursive:true});
for(const [src,dest] of [
 ['maplibre-gl/dist/maplibre-gl.js','maplibre-gl.js'],
 ['maplibre-gl/dist/maplibre-gl.css','maplibre-gl.css'],
 ['html2canvas/dist/html2canvas.min.js','html2canvas.min.js']
]){try{await copyFile(join(root,'node_modules',src),join(vendor,dest))}catch{throw Error('Missing '+src+'; install maplibre-gl@5.9.0 and html2canvas@1.4.1 before building')}}
const sdk='<script src="https://game-cdn.poki.com/scripts/v2/poki-sdk.js"></script>';
for(const p of ['index.html','map-lab/index.html','han/index.html']){
 let html=await readFile(join(out,p),'utf8');
 html=html.replace(/\s*<!-- Cloudflare Web Analytics -->[\s\S]*?<!-- End Cloudflare Web Analytics -->/g,'');
 html=html.replace(/https:\/\/unpkg\.com\/maplibre-gl@5\.9\.0\/dist\/maplibre-gl\.(js|css)/g,(_,ext)=>'../vendor/maplibre-gl.'+ext);
 const bridge='<script type="module" src="'+(p==='index.html'?'./':'../')+'poki-bridge.js"></script>';
 if(html.includes('</head>'))html=html.replace('</head>',sdk+bridge+'</head>');
 else html=html.replace('<body>',sdk+bridge+'<body>');
 if(p==='map-lab/index.html')html=html.replace('MODERN LAND COVER &amp; ELEVATION · HISTORICAL OVERLAYS APPROXIMATE','LOCAL COASTLINE · HISTORICAL OVERLAYS APPROXIMATE');
 await writeFile(join(out,p),html);
}
let css=await readFile(join(out,'map-lab/lab.css'),'utf8');
css=css.replace(/@import\s+url\(['"]?https:\/\/fonts\.googleapis\.com[^;]+;/g,'');
await writeFile(join(out,'map-lab/lab.css'),css);
let lab=await readFile(join(out,'map-lab/lab.js'),'utf8');
const begin=lab.indexOf('const map = new maplibregl.Map('),end=lab.indexOf('const cities=',begin);
if(begin<0||end<0)throw Error('Atlas map constructor changed; review Poki offline transform');
lab=lab.slice(0,begin)+
"const map = new maplibregl.Map({container:'map',canvasContextAttributes:{preserveDrawingBuffer:true},center:[12.4,43.2],zoom:5.45,minZoom:3.6,maxZoom:9.2,attributionControl:{compact:true},style:offlineMapStyle(historical,rivers)});"+
'\n\n'+lab.slice(end);
lab="import {offlineMapStyle} from './poki-style.js';\n"+lab;
lab=lab.replace('https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js','../vendor/html2canvas.min.js');
await writeFile(join(out,'map-lab/lab.js'),lab);
const external=[];
for(const p of ['index.html','map-lab/index.html','han/index.html','map-lab/lab.css','map-lab/lab.js']){
 const body=await readFile(join(out,p),'utf8');
 for(const u of body.matchAll(/https?:\/\/[^'"\s)<>]+/g))if(!u[0].startsWith('https://game-cdn.poki.com/')&&!/historical|source|Via |source:|source=/.test(body.slice(Math.max(0,u.index-70),u.index)))external.push({file:p,url:u[0]});
}
const sizes=await Promise.all(runtime.map(async p=>({path:p,bytes:(await stat(join(out,p))).size})));
const manifest={entrypoints:['index.html','map-lab/index.html','han/index.html'],files:runtime.length+5,bytes:sizes.reduce((n,x)=>n+x.bytes,0),externalCandidates:external};
await writeFile(join(out,'poki-build-report.json'),JSON.stringify(manifest,null,2));
console.log(JSON.stringify({out,files:manifest.files,bytes:manifest.bytes,externalCandidates:external.length}));
