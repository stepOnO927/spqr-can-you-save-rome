import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||5173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/map-lab'){res.writeHead(308,{Location:'/map-lab/'});res.end();return}
  if(pathname==='/legacy'){res.writeHead(308,{Location:'/legacy/'});res.end();return}
  const target=pathname==='/'?path.join(root,'index.html'):pathname==='/map-lab/'?path.join(root,'map-lab','index.html'):pathname==='/legacy/'?path.join(root,'legacy','index.html'):path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(target,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(data);
  });
}).listen(port,()=>console.log(`SPQR local: http://localhost:${port}`));
