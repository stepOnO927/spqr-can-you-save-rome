// Reproducible browser interaction measurement. No performance threshold is
// implied: CI uses software rendering and network-hosted map data.
import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import os from 'node:os';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[],tiles={ok:0,httpError:0,failed:0,cancelled:0};
const tile=url=>/server\.arcgisonline\.com|elevation-tiles-prod\.s3\.amazonaws\.com|s3\.amazonaws\.com\/elevation-tiles-prod/.test(url);
page.on('pageerror',error=>errors.push(error.message));
page.on('response',response=>{if(tile(response.url())){if(response.ok())tiles.ok++;else tiles.httpError++}});
page.on('requestfailed',request=>{if(tile(request.url())){if(request.failure()?.errorText?.includes('ERR_ABORTED'))tiles.cancelled++;else tiles.failed++}});

async function sample(durationMs){
 return page.evaluate(ms=>new Promise(resolve=>{
  const deltas=[],begin=performance.now();let previous=null;
  function frame(now){if(previous!==null)deltas.push(now-previous);previous=now;if(now-begin<ms)requestAnimationFrame(frame);else resolve({elapsedMs:now-begin,deltas})}
  requestAnimationFrame(frame);
 }),durationMs);
}
function summarize(sample){
 const values=sample.deltas.slice().sort((a,b)=>a-b),at=p=>values[Math.min(values.length-1,Math.ceil(values.length*p)-1)]??null;
 return {elapsedMs:Math.round(sample.elapsedMs),frames:values.length,callbackFps:Math.round(values.length*100000/sample.elapsedMs)/100,p50Ms:at(.5),p95Ms:at(.95),p99Ms:at(.99),over50ms:values.filter(x=>x>50).length};
}
async function position(){return page.locator('[data-city="ROMA"]').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y}})}
async function exercise(){
 const beforePan=await position(),panSample=sample(6000);
 for(const end=Date.now()+5400;Date.now()<end;){await page.mouse.move(1200,350);await page.mouse.down();await page.mouse.move(1245,365,{steps:10});await page.mouse.up();await page.waitForTimeout(200)}
 const pan=summarize(await panSample),afterPan=await position();
 const beforeZoom=await position(),zoomSample=sample(6000);await page.mouse.move(1200,350);
 for(let i=0;i<3;i++){await page.mouse.wheel(0,-120);await page.waitForTimeout(350)}
 await page.waitForTimeout(500);const zoomed=await position();
 for(let i=0,end=Date.now()+3100;Date.now()<end;i++){await page.mouse.wheel(0,i%6<3?120:-120);await page.waitForTimeout(300)}
 const zoom=summarize(await zoomSample),afterZoom=await position();
 assert.ok(Math.hypot(afterPan.x-beforePan.x,afterPan.y-beforePan.y)>10,'dragging must move the map');
 assert.ok(Math.hypot(zoomed.x-beforeZoom.x,zoomed.y-beforeZoom.y)>3,'scrolling must zoom the map');
 assert.ok(pan.frames>0&&zoom.frames>0,'frame samples must contain observations');
 return {pan,zoom,interaction:{beforePan,afterPan,beforeZoom,zoomed,afterZoom}};
}
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});await page.locator('#start-free').click();
 await page.locator('[data-city="ROMA"]').waitFor();await page.waitForTimeout(8000);
 const renderer=await page.evaluate(()=>{const canvas=document.querySelector('.maplibregl-canvas'),gl=canvas?.getContext('webgl2')||canvas?.getContext('webgl');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'});
 await page.screenshot({path:'map-benchmark-1920x1080.png'});
 const idle=summarize(await sample(6000));
 const fullRelief=await exercise();
 await page.locator('#reset').click();await page.waitForTimeout(2500);await page.locator('#relief-toggle').click();
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'false');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#relief-toggle')?.getAttribute('aria-pressed')==='false');await page.waitForTimeout(4000);
 const reducedRelief=await exercise();
 await page.locator('#relief-toggle').click();assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'true');
 assert.ok(idle.frames>0,'idle sample must contain observations');
 assert.deepEqual(errors,[],'uncaught browser errors');
 const report={note:'Browser requestAnimationFrame callback cadence, not presented-frame timing; results depend on runner load, software renderer, cache and network.',viewport:{width:1920,height:1080,deviceScaleFactor:1},environment:{platform:os.platform(),architecture:os.arch(),cpu:os.cpus()[0]?.model,browser:browser.version(),renderer},tileRequests:tiles,scenarios:{idle,fullRelief,reducedRelief},pageErrors:errors};
 await writeFile('map-benchmark.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
