// Reproducible browser interaction measurement. No performance threshold is
// implied: CI uses software rendering and local bundled map data.
import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import os from 'node:os';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const errors=[],tiles={ok:0,httpError:0,failed:0,cancelled:0};
const tile=url=>url.includes('/terrain/')||url.includes('/landcover/');
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
async function position(){return page.locator('[data-site="roma"]').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y}})}
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
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(pathname==='/map-lab/physical-style.js'&&process.env.SPQR_MAP_STYLE_OVERRIDE?process.env.SPQR_MAP_STYLE_OVERRIDE:file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});await page.locator('#start-free').click();
 await page.locator('[data-site="roma"]').waitFor();await page.waitForTimeout(8000);
 const renderer=await page.evaluate(()=>{const canvas=document.querySelector('.maplibregl-canvas'),gl=canvas?.getContext('webgl2')||canvas?.getContext('webgl');const ext=gl?.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unavailable'});
 await page.screenshot({path:'outputs/map-benchmark-1920x1080.png'});
 const idle=summarize(await sample(6000));
 const fullRelief=await exercise();
 await page.locator('#reset').click();await page.waitForTimeout(2500);await page.locator('#relief-toggle').click();
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'false');
 await page.reload();await page.waitForFunction(()=>document.querySelector('#relief-toggle')?.getAttribute('aria-pressed')==='false');await page.waitForTimeout(4000);
 const reducedRelief=await exercise();
 await page.locator('#relief-toggle').click();assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'true');
 assert.ok(idle.frames>0,'idle sample must contain observations');
 assert.deepEqual(errors,[],'uncaught browser errors');
 const report={note:'Browser requestAnimationFrame callback cadence, not presented-frame timing; results depend on runner load, software renderer and local file cache.',viewport:{width:1920,height:1080,deviceScaleFactor:1},environment:{platform:os.platform(),architecture:os.arch(),cpu:os.cpus()[0]?.model,browser:browser.version(),renderer},tileRequests:tiles,scenarios:{idle,fullRelief,reducedRelief},pageErrors:errors};
 await writeFile(process.env.SPQR_BENCH_OUTPUT||'map-benchmark.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}finally{await browser.close()}
