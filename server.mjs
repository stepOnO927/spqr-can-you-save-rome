import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const port=Number(process.env.PORT||5173);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8'};
http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  const target=pathname==='/'?path.join(root,'index.html'):path.resolve(root,'.'+pathname);
  if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return}
  fs.readFile(target,(err,data)=>{
    if(err){res.writeHead(404);res.end('Not found');return}
    res.writeHead(200,{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Cache-Control':'no-cache'});
    res.end(data);
  });
}).listen(port,()=>console.log(`SPQR local: http://localhost:${port}`));

