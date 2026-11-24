import test from 'node:test';
import assert from 'node:assert/strict';
import {createGameServer,publicPathname} from '../server.mjs';

test('preview routes expose game pages and optimized assets',()=>{
 for(const [request,expected] of [
  ['/','/index.html'],['/han/','/han/index.html'],['/map-lab/','/map-lab/index.html'],
  ['/inspector.html','/inspector.html'],['/engine.js?v=1','/engine.js'],
  ['/han/play.js','/han/play.js'],['/map-lab/lab.css','/map-lab/lab.css'],
  ['/assets/portraits/arsinoe-128.jpg','/assets/portraits/arsinoe-128.jpg'],
  ['/assets/fonts/noto-sans-sc-chinese-simplified-400-normal.woff2','/assets/fonts/noto-sans-sc-chinese-simplified-400-normal.woff2'],
  ['/map-lab/SOURCES.md','/map-lab/SOURCES.md']
 ])assert.equal(publicPathname(request),expected,request);
});

test('preview routes deny private files and malformed paths',()=>{
 for(const request of [
  '/.git/config','/.env','/package.json','/server.mjs','/tools/browser-smoke.mjs',
  '/test/server.test.js','/scripts/build-pages.mjs','/node_modules/maplibre-gl/package.json',
  '/assets/portraits/arsinoe-master.png','/assets/portraits/arsinoe.jpg',
  '/%2e%2e/.git/config','/assets%5cportraits%5carsinoe-128.jpg','/han//play.js'
 ])assert.equal(publicPathname(request),null,request);
 assert.throws(()=>publicPathname('/%E0%A4%A'),URIError);
});

test('preview server serves campaign pages but cannot read repository files',async t=>{
 const server=createGameServer();
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base=`http://127.0.0.1:${server.address().port}`;
  let page;
  try{page=await fetch(`${base}/han/`)}catch(error){
   if(error?.cause?.code==='EACCES'){t.skip('loopback connections unavailable in this environment');return}
   throw error;
  }
  assert.equal(page.status,200);
  assert.match(await page.text(),/window\.__SPQR_TEST_MODE/);
  const portrait=await fetch(`${base}/assets/portraits/arsinoe-128.jpg`);
  assert.equal(portrait.status,200);
  assert.equal(portrait.headers.get('content-type'),'image/jpeg');
  for(const pathname of ['/.git/config','/package.json','/assets/portraits/arsinoe-master.png']){
   const response=await fetch(`${base}${pathname}`);
   assert.equal(response.status,404,pathname);
  }
  assert.equal((await fetch(`${base}/%E0%A4%A`)).status,400);
 }finally{await new Promise((resolve,reject)=>server.close(error=>error?reject(error):resolve()))}
});
