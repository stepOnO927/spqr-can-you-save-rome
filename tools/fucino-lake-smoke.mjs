import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..'),out=resolve(root,'outputs','fucino-lake');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.protocol==='blob:')return route.continue();if(url.hostname!=='spqr.test')return route.abort();
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[13.55,42.0],zoom:9.05})});
 await page.locator('#map-charting').waitFor({state:'visible',timeout:5000});
 await page.locator('#map-charting').waitFor({state:'hidden',timeout:30000});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden},null,{timeout:35000});
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);for(const id of ['fucino-historical-fill','fucino-historical-shore'])map.setLayoutProperty(id,'visibility','none');document.querySelector('[data-physical-label="fucinus"]').hidden=true});
 await page.screenshot({path:resolve(out,'before.png')});
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);for(const id of ['fucino-historical-fill','fucino-historical-shore'])map.setLayoutProperty(id,'visibility','visible');document.querySelector('[data-physical-label="fucinus"]').hidden=false});
 for(const [lang,label,note] of [['en','Lacus Fucinus · approx.',/not surveyed/],['zh','富奇诺湖 · 约略',/未被精确测定/]]){
  if(lang==='zh')await page.locator('#language').click();
  assert.equal(await page.locator('[data-physical-label="fucinus"]').innerText(),label);
  assert.equal(await page.locator('[data-physical-label="fucinus"]').isVisible(),true);
  assert.match(await page.locator('#map-mode-note').innerText(),note);
  assert.match(await page.locator('.legend').innerText(),lang==='zh'?/古湖岸参考线/:/Approximate ancient lakeshore/);
  const found=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.queryRenderedFeatures(map.project([13.547222,41.995]),{layers:['fucino-historical-fill']}).map(feature=>feature.properties.name)});
  assert.ok(found.includes('Lacus Fucinus'),`Missing rendered historical lake in ${lang}: ${found}`);
  await page.screenshot({path:resolve(out,`${lang}.png`)});
 }
 await page.locator('#map-mode').selectOption('political');
 const political=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.queryRenderedFeatures(map.project([13.547222,41.995]),{layers:['fucino-historical-fill','sea-final']}).map(feature=>feature.layer.id)});
 assert.ok(political.includes('fucino-historical-fill'));
 assert.equal(political.includes('sea-final'),false,'modern sea mask must not cover inland Fucino');
 assert.deepEqual(errors,[]);
 console.log('Fucino model, uncertainty note, bilingual labels, political mode and land/sea separation passed.');
}finally{await browser.close()}
