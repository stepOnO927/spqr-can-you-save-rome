import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||5173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.md':'text/plain; charset=utf-8','.jpg':'image/jpeg','.png':'image/png'};
const rootModules=new Set('app character-system characters chronicle civil-war command-appointments conspiracies control-intelligence data dynasties engine genealogy-ui governance historical-reference historical-territories identity land legacy map office-system personal-diplomacy portrait-registry republican-roads rivers rome60 view-handoff visibility'.split(' ').map(name=>`${name}.js`));
const labModules=new Set('authority-view capture-wait character-ui chronicle-ui identity-knowledge intelligence-summary lab local-governor-ui mediation-ui offices-ui personnel security-ui turn-report tutorial'.split(' ').map(name=>`${name}.js`));

export function publicPathname(requestUrl){
  const pathname=decodeURIComponent(new URL(requestUrl,'http://localhost').pathname);
  if(pathname==='/')return '/index.html';
  if(pathname==='/map-lab/'||pathname==='/map-lab/index.html')return '/map-lab/index.html';
  const name=pathname.slice(1);
  if(rootModules.has(name)||name==='index.html'||name==='style.css'||name==='MAP_SOURCES.md')return pathname;
  if(name==='map-lab/lab.css'||name==='map-lab/SOURCES.md'||name.startsWith('map-lab/')&&labModules.has(name.slice('map-lab/'.length)))return pathname;
  if(/^assets\/portraits\/[a-z0-9-]+\.(?:jpg|png)$/.test(name))return pathname;
  return null;
}

export function createGameServer(){
  return http.createServer((req,res)=>{
    let pathname;
    try{pathname=publicPathname(req.url)}catch{res.writeHead(400);res.end('Bad request');return}
    if(req.url==='/map-lab'){res.writeHead(308,{Location:'/map-lab/'});res.end();return}
    if(!pathname){res.writeHead(404);res.end('Not found');return}
    const target=path.join(root,pathname.slice(1));
    fs.realpath(target,(realErr,realTarget)=>{
      if(realErr||!realTarget.startsWith(root+path.sep)){res.writeHead(404);res.end('Not found');return}
      fs.readFile(realTarget,(err,data)=>{
        if(err){res.writeHead(404);res.end('Not found');return}
        res.writeHead(200,{'Content-Type':mime[path.extname(realTarget)]||'application/octet-stream','Cache-Control':'no-cache'});
        res.end(data);
      });
    });
  });
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createGameServer().listen(port,()=>console.log(`SPQR local: http://localhost:${port}`));
