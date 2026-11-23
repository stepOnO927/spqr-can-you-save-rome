import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import romanDrainage from '../map-lab/po-plain-roman.js';

const root=resolve(import.meta.dirname,'..');
const output=resolve(root,'outputs/po-roman-drainage');
await mkdir(output,{recursive:true});
assert.equal(romanDrainage.features.length,163);
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.webp':'image/webp'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[10.7,44.8],zoom:9.05})});
 await page.locator('#map-charting').waitFor({state:'visible',timeout:5000});
 await page.locator('#map-charting').waitFor({state:'hidden',timeout:30000});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
 const drawn=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return {source:!!map.getSource('po-roman-drainage'),visibility:map.getLayoutProperty('po-roman-drainage-line','visibility'),rendered:map.queryRenderedFeatures({layers:['po-roman-drainage-line']}).length}});
 assert.equal(drawn.source,true);assert.equal(drawn.visibility,'visible');assert.ok(drawn.rendered>0);
 assert.match(await page.locator('#map-mode-note').innerText(),/Roman drainage and land division/);
 assert.match(await page.locator('.legend').innerText(),/Roman drainage traces/);
 await page.screenshot({path:resolve(output,'english-terrain.png')});
 await page.locator('#map-mode').selectOption('political');
 assert.equal(await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.getLayoutProperty('po-roman-drainage-line','visibility')}),'none');
 await page.locator('#map-mode').selectOption('terrain');
 await page.locator('#language').click();
 assert.match(await page.locator('#map-mode-note').innerText(),/罗马时期排水与土地划分痕迹/);
 assert.match(await page.locator('.legend').innerText(),/罗马时期排水痕迹/);
 await page.screenshot({path:resolve(output,'chinese-terrain.png')});
 await page.setViewportSize({width:390,height:844});
 if(!await page.locator('.brief').isVisible())await page.locator('#brief-toggle').click();
 const mobile=await page.evaluate(()=>({width:document.documentElement.scrollWidth,visible:document.querySelector('.brief').clientHeight,content:document.querySelector('.brief').scrollHeight}));
 assert.equal(mobile.width,390);
 assert.ok(mobile.content>mobile.visible,`the long historical note and legend should remain scrollable on a phone: ${JSON.stringify(mobile)}`);
 await page.locator('.brief').evaluate(el=>el.scrollTop=el.scrollHeight);
 await page.screenshot({path:resolve(output,'chinese-mobile.png')});
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({features:romanDrainage.features.length,rendered:drawn.rendered,mobile,errors}));
}finally{await browser.close()}
