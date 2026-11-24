import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(process.env.SPQR_STATIC_ROOT||path.dirname(fileURLToPath(import.meta.url)));
const port=Number(process.env.PORT||5173);
const mime={'.jpg':'image/jpeg','.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8','.woff2':'font/woff2'};
const publicDocuments=new Set(['MAP_SOURCES.md','map-lab/SOURCES.md','assets/portraits/SOURCES.md','assets/fonts/LICENSE.html']);
const publicVendor=new Set(['maplibre-gl.js','maplibre-gl-worker.js','maplibre-gl.css','LICENSE.txt']);
const publicModule=name=>/^[a-z][a-z0-9-]*\.(?:js|css)$/.test(name)&&!/\.(?:test|spec)\.js$/.test(name);

export function publicPathname(requestUrl){
  const pathname=decodeURIComponent(new URL(requestUrl,'http://localhost').pathname);
  if(pathname==='/')return '/index.html';
  if(pathname==='/han/'||pathname==='/map-lab/')return `${pathname}index.html`;
  const parts=pathname.split('/').slice(1);
  if(parts.some(part=>!part||part==='.'||part==='..'||part.startsWith('.')||/[\\\0]/.test(part)))return null;
  const relative=parts.join('/');
  if(publicDocuments.has(relative)||['index.html','inspector.html','release.json'].includes(relative))return pathname;
  if(parts.length===1&&publicModule(parts[0]))return pathname;
  if(parts.length===2&&['han','map-lab'].includes(parts[0])&&(parts[1]==='index.html'||publicModule(parts[1])))return pathname;
  if(parts.length===3&&parts[0]==='assets'&&parts[1]==='portraits'&&/^[a-z0-9-]+-(?:64|128)\.jpg$/.test(parts[2]))return pathname;
  if(parts.length===3&&parts[0]==='assets'&&parts[1]==='fonts'&&/^[a-z0-9-]+\.woff2$/.test(parts[2]))return pathname;
  if(parts.length===2&&parts[0]==='vendor'&&publicVendor.has(parts[1]))return pathname;
  return null;
}

export function createGameServer(){
  const publicRoot=fs.realpathSync(root);
  return http.createServer((req,res)=>{
    let pathname;
    try{pathname=publicPathname(req.url)}catch{res.writeHead(400);res.end('Bad request');return}
    if(new URL(req.url,'http://localhost').pathname==='/han'){res.writeHead(308,{Location:'/han/'});res.end();return}
    if(new URL(req.url,'http://localhost').pathname==='/map-lab'){res.writeHead(308,{Location:'/map-lab/'});res.end();return}
    if(!pathname){res.writeHead(404);res.end('Not found');return}
    const target=path.join(root,pathname.slice(1));
    fs.realpath(target,(realError,realTarget)=>{
      const relative=realTarget&&path.relative(publicRoot,realTarget);
      if(realError||!relative||relative==='..'||relative.startsWith(`..${path.sep}`)||path.isAbsolute(relative)){res.writeHead(404);res.end('Not found');return}
      fs.readFile(realTarget,(error,data)=>{
        if(error){res.writeHead(404);res.end('Not found');return}
        let body=data;
        if(path.extname(realTarget)==='.html'){
          const html=data.toString('utf8').replace(/<script\b[^>]*cloudflareinsights\.com[^>]*>\s*<\/script>/gi,'');
          const marker='<script>window.__SPQR_TEST_MODE={kind:"local_preview"}</script>';
          body=Buffer.from(html.replace(/<head([^>]*)>/i,'<head$1>'+marker));
        }
        res.writeHead(200,{'Content-Type':mime[path.extname(realTarget)]||'application/octet-stream','Cache-Control':'no-cache'});
        res.end(body);
      });
    });
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createGameServer().listen(port,()=>console.log(`SPQR local: http://localhost:${port}`));
