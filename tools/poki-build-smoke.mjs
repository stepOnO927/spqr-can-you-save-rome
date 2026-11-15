import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {join,resolve,extname} from 'node:path';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const root=resolve('dist/poki'),external=[],bytes=[];let collectBytes=true;
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'),path=resolve(root,'.'+decodeURIComponent(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));if(!path.startsWith(root)){res.writeHead(403).end();return}const body=await readFile(path);if(collectBytes)bytes.push(body.length);res.writeHead(200,{'content-type':mime[extname(path)]||'application/octet-stream'}).end(body)}catch{res.writeHead(404).end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port,browser=await chromium.launch({headless:true}),entryBytes={};
const fakeSDK=`window._pokiEvents=[];window.PokiSDK={init:()=>Promise.resolve(),gameLoadingFinished:()=>_pokiEvents.push('load'),gameplayStart:()=>_pokiEvents.push('start'),gameplayStop:()=>_pokiEvents.push('stop'),commercialBreak:()=>{_pokiEvents.push('break');return Promise.resolve()},openExternalLink:()=>_pokiEvents.push('link')}`;
async function context(){const c=await browser.newContext({viewport:{width:640,height:360},hasTouch:true,isMobile:true});await c.route('**/*',route=>{const u=route.request().url();if(u.startsWith('https://game-cdn.poki.com/scripts/v2/poki-sdk.js'))return route.fulfill({status:200,contentType:'text/javascript',body:fakeSDK});if(!u.startsWith(origin)&&!u.startsWith('blob:')&&!u.startsWith('data:')){external.push(u);return route.abort()}return route.continue()});return c}
try{
 let c=await context(),p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/',{waitUntil:'domcontentloaded'});
 await p.locator('#start-campaign').tap();
 await p.waitForFunction(()=>window._pokiEvents?.includes('start'));
 assert.deepEqual(await p.evaluate(()=>_pokiEvents.slice(0,2)),['load','start']);
 assert.equal(await p.locator('#step').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight),true);
 await p.locator('#step').tap();
 await p.locator('#new').tap();
 await p.locator('#close-setup').tap();
 await p.waitForFunction(()=>_pokiEvents.filter(x=>x==='start').length===2);
 assert.deepEqual(await p.evaluate(()=>_pokiEvents),['load','start','stop','break','start']);
 for(const [width,height] of [[836,470],[1031,580]]){await p.setViewportSize({width,height});assert.equal(await p.locator('#step').evaluate(el=>{const r=el.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&r.right<=innerWidth}),true,'Advance outside '+width+'x'+height);await p.locator('#step').tap();assert.ok(await p.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+2),'Frame scrolls at '+width+'x'+height)}
 assert.deepEqual(errors,[]);
 entryBytes.roman=bytes.reduce((a,b)=>a+b,0);
 await c.close();
 c=await context();p=await c.newPage();errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/map-lab/',{waitUntil:'domcontentloaded'});
 await p.locator('#start-game').tap();
 await p.waitForFunction(()=>window._pokiEvents?.includes('start'));
 assert.deepEqual(await p.evaluate(()=>_pokiEvents.slice(0,2)),['load','start'],'Atlas SDK lifecycle');
 await p.locator('.maplibregl-marker').first().tap({timeout:10000});
 assert.equal(await p.locator('.selection:not(.collapsed)').count(),1);
 assert.deepEqual(errors,[]);
 entryBytes.atlas=bytes.reduce((a,b)=>a+b,0)-entryBytes.roman;
 await c.close();
 c=await context();p=await c.newPage();errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin+'/han/',{waitUntil:'domcontentloaded'});
 await p.locator('#begin').tap();
 await p.waitForFunction(()=>window._pokiEvents?.includes('start'));
 assert.deepEqual(await p.evaluate(()=>_pokiEvents.slice(0,2)),['load','start'],'Han SDK lifecycle');
 await p.locator('#map path.territory[data-region="changan"]').tap({timeout:5000});
 assert.ok((await p.locator('#inspector').textContent()).trim().length>20);
 assert.deepEqual(errors,[]);
 entryBytes.han=bytes.reduce((a,b)=>a+b,0)-entryBytes.roman-entryBytes.atlas;
 collectBytes=false;await p.locator('header a[href="../"]').tap();await p.waitForURL(origin+'/');
 await c.close();
 assert.deepEqual(external,[],'Poki build made blocked external requests');
 console.log(JSON.stringify({entries:3,externalRequests:external.length,localBytes:bytes.reduce((a,b)=>a+b,0),entryBytes}));
}finally{await browser.close();await new Promise(r=>server.close(r))}
