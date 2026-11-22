import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {fileURLToPath} from 'node:url';
import {createGameServer,publicPathname} from '../server.mjs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function request(port,pathname){return new Promise((resolve,reject)=>{
  const call=http.get({host:'127.0.0.1',port,path:pathname},res=>{
    const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks),type:res.headers['content-type']}));
  });call.on('error',reject);
})}

test('public list covers every current game module and expected pages',()=>{
  for(const directory of ['', 'map-lab', 'han']){
    for(const name of fs.readdirSync(path.join(root,directory)).filter(name=>/\.(js|css)$/.test(name)&&!name.endsWith('.test.js'))){
      const pathname='/'+(directory?directory+'/':'')+name;
      assert.equal(publicPathname(pathname),pathname);
    }
  }
  for(const pathname of ['/','/index.html','/inspector.html','/release.json','/map-lab/','/map-lab/index.html','/han/','/han/index.html','/MAP_SOURCES.md','/map-lab/SOURCES.md','/assets/portraits/SOURCES.md','/vendor/maplibre-gl.js','/assets/portraits/caesar-128.jpg']){
    assert.ok(publicPathname(pathname),pathname);
  }
});

test('private paths are denied and malformed URLs do not stop service',async()=>{
  const server=createGameServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  try{
    for(const pathname of ['/.git/config','/.env','/server.mjs','/package.json','/engine.test.js','/test/server.test.js','/tools/browser-smoke.mjs','/han/README.md','/map-lab/TESTING.md','/assets/portraits/../SOURCES.md','/app.js/../server.mjs']){
      assert.equal((await request(port,pathname)).status,404,pathname);
    }
    assert.equal((await request(port,'/%')).status,400);
    assert.equal((await request(port,'/%E0%A4%A')).status,400);
    const home=await request(port,'/');
    assert.equal(home.status,200);
    assert.match(home.body.toString(),/SPQR/);
    assert.match(home.body.toString(),/__SPQR_TEST_MODE/);
    assert.equal((await request(port,'/map-lab')).status,308);
    assert.equal((await request(port,'/map-lab/')).status,200);
    assert.equal((await request(port,'/han')).status,308);
    assert.equal((await request(port,'/han/')).status,200);
    for(const pathname of ['/app.js','/national-focus.js','/legion-designer.js','/battle-plans.js','/imperium-ui.js','/imperium.css','/release.json','/map-lab/invention-ui.js','/map-lab/territory-facts.js','/han/engine.js','/han/play.css','/assets/portraits/SOURCES.md','/assets/portraits/caesar-128.jpg']){
      assert.equal((await request(port,pathname)).status,200,pathname);
    }
  }finally{await new Promise(resolve=>server.close(resolve))}
});
