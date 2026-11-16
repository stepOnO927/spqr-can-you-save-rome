// Inspect native terrain and the selected hillshade at a settled Cyrene view.
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[],missing=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{if(url.pathname.includes('/terrain/'))missing.push(url.pathname);await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[21.8583,32.825],zoom:9.05})});
 // The charting curtain can reopen while MapLibre replaces fallback DEM tiles.
 await page.waitForTimeout(12000);
 await page.waitForFunction(async()=>{
  const {map,activeReliefLayer}=await import(document.querySelector('script[type="module"]').src);
  const settled=!map.isMoving()&&map.areTilesLoaded()&&map.isSourceLoaded('elevation-cyrene-higher')&&activeReliefLayer==='relief-cyrene-higher'&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99;
  window.__cyreneStableSince=settled?(window.__cyreneStableSince||performance.now()):0;
  return settled&&performance.now()-window.__cyreneStableSince>3000;
 },null,{timeout:45000});
 const facts=await page.evaluate(async()=>{const {map,activeReliefLayer}=await import(document.querySelector('script[type="module"]').src),b=map.getBounds();return {zoom:map.getZoom(),bounds:[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()],activeReliefLayer,detailLoaded:map.isSourceLoaded('elevation-cyrene-higher'),opacity:getComputedStyle(document.querySelector('#map')).opacity}});
 await mkdir(resolve(root,'outputs','terrain-layer-review'),{recursive:true});
 assert.equal((await page.locator('#language').textContent()).trim(),'EN');
 await page.screenshot({path:resolve(root,'outputs','terrain-layer-review','cyrene-current.png')});
 await page.locator('#language').click();
 assert.equal((await page.locator('#language').textContent()).trim(),'中文');
 assert.equal(await page.evaluate(async()=>{const {activeReliefLayer}=await import(document.querySelector('script[type="module"]').src);return activeReliefLayer}),'relief-cyrene-higher');
 await page.screenshot({path:resolve(root,'outputs','terrain-layer-review','cyrene-en.png')});
 console.log(JSON.stringify({facts,missing,errors}));
 assert.equal(facts.activeReliefLayer,'relief-cyrene-higher');
 assert.equal(facts.detailLoaded,true);
 assert.equal(facts.opacity,'1');
 assert.deepEqual(missing,[]);
 assert.deepEqual(errors,[]);
}finally{await browser.close()}
