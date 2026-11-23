import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..'),out=resolve(root,'outputs','lazio-lakes');
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:')return route.continue();
  if(url.hostname!=='spqr.test')return route.abort();
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.5,42.1],zoom:9.05})});
 await page.locator('#map-charting').waitFor({state:'visible',timeout:5000});
 await page.locator('#map-charting').waitFor({state:'hidden',timeout:30000});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden},null,{timeout:35000});
 for(const [lang,label] of [['en','Lake Bracciano'],['zh','布拉恰诺湖']]){
  if(lang==='zh')await page.locator('#language').click();
  assert.equal(await page.locator('[data-physical-label="bracciano"]').innerText(),label);
  assert.equal(await page.locator('[data-physical-label="bracciano"]').isVisible(),true);
  const rendered=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.queryRenderedFeatures(map.project([12.2314,42.1225]),{layers:['natural-lakes']}).map(feature=>feature.properties.name)});
  assert.ok(rendered.includes('Lago di Bracciano'),`The actual lake fill is missing in ${lang}: ${rendered}`);
  await page.screenshot({path:resolve(out,`rome-${lang}.png`)});
 }
 await page.locator('#map-mode').selectOption('political');
 const political=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.queryRenderedFeatures(map.project([12.2314,42.1225]),{layers:['natural-lakes']}).some(feature=>feature.properties.name==='Lago di Bracciano')});
 assert.equal(political,true,'a political overlay must not erase the lake');
 assert.deepEqual(errors,[]);
 console.log('Lazio lake fill, labels and political-map persistence passed in English and Chinese.');
}finally{await browser.close()}
