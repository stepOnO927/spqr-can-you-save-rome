// Check rendered land/sea pixels as well as feature queries. A huge ocean
// polygon once painted a blue rectangle over Ligurian land despite correct
// queryRenderedFeatures results, so geometry-only tests missed the defect.
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.protocol==='blob:')return route.continue();
  if(url.hostname!=='spqr.test')return route.abort();
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor();await page.locator('#start-free').click();
 await page.locator('[data-site="roma"]').waitFor();await page.waitForTimeout(6000);
 const scenes=[
  {name:'liguria',center:[8.2,44.2],zoom:5.45,land:[8.2,44.8],sea:[8.2,43.6]},
  {name:'alexandria',center:[29.9,31.2],zoom:8.4,land:[29.85,30.7],sea:[30,31.8]},
  {name:'aegean',center:[27,38.2],zoom:7.5,land:[27.5,38.2],sea:[25.5,38.2]},
  {name:'africa',center:[10,37.1],zoom:7.5,land:[10,36.7],sea:[10,37.5]}
 ];
 for(const scene of scenes){
  await page.evaluate(async({center,zoom})=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center,zoom})},scene);
  await page.waitForTimeout(2000);
  const pixels=await page.evaluate(async({land,sea})=>{
   const {map}=await import(document.querySelector('script[type="module"]').src),canvas=map.getCanvas(),gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
   const sample=coordinate=>{const p=map.project(coordinate),color=new Uint8Array(4);gl.readPixels(Math.round(p.x),Math.round(canvas.height-p.y),1,1,gl.RGBA,gl.UNSIGNED_BYTE,color);return [...color]};
   return {land:sample(land),sea:sample(sea)};
  },scene);
  assert.ok(pixels.land[0]>pixels.sea[0]+55&&pixels.land[0]>110,`${scene.name}: land should remain visibly distinct from sea: ${JSON.stringify(pixels)}`);
  assert.ok(pixels.sea[0]<100,`${scene.name}: offshore water should retain its sea palette: ${JSON.stringify(pixels)}`);
  await page.screenshot({path:`outputs/coast-mask-${scene.name}.png`});
  console.log(scene.name,pixels);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close()}
