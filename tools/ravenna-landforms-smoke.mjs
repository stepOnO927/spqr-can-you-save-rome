import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'outputs/ravenna-review');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname,file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)){await route.abort();return}
  try{await route.fulfill({status:200,contentType:{'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'}[extname(file)]||'application/octet-stream',body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.16,44.4],zoom:9.05})});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:35000});
 await page.waitForTimeout(800);
 if(/拉文纳/.test(await page.locator('#map-mode-note').innerText()))await page.locator('#language').click();
 await page.locator('#map-charting').waitFor({state:'hidden',timeout:35000});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:35000});
 await page.waitForTimeout(500);
 const ridgeIds=['ravenna-ridge-fill','ravenna-ridge-edge'];
 assert.deepEqual(await page.evaluate(async ids=>{const {map}=await import(document.querySelector('script[type="module"]').src);return ids.map(id=>map.getLayoutProperty(id,'visibility'))},ridgeIds),['visible','visible']);
 assert.match(await page.locator('#map-mode-note').innerText(),/reconstructed beach and river ridges/);
 assert.match(await page.locator('.legend').innerText(),/Ravenna ancient beach ridge/);
 const overflow=await page.locator('.brief').evaluate(el=>({scroll:el.scrollHeight,visible:el.clientHeight,mode:getComputedStyle(el).overflowY}));
 assert.ok(overflow.scroll>overflow.visible&&overflow.mode==='auto','the expanded historical legend must be scrollable');
 await page.locator('.brief').evaluate(el=>{el.scrollTop=el.scrollHeight});
 const lastLegend=await page.locator('.legend span').last().boundingBox(),pane=await page.locator('.brief').boundingBox();
 assert.ok(lastLegend.y+lastLegend.height<=pane.y+pane.height,'the sea symbol must be reachable inside the panel');
 await page.locator('.brief').evaluate(el=>{el.scrollTop=0});
 await page.screenshot({path:resolve(output,'ravenna-ridges-en.png')});
 await page.evaluate(async ids=>{const {map}=await import(document.querySelector('script[type="module"]').src);for(const id of ids)map.setLayoutProperty(id,'visibility','none')},ridgeIds);
 await page.waitForTimeout(450);
 await page.screenshot({path:resolve(output,'ravenna-without-ridges.png')});
 await page.locator('#language').click();
 assert.match(await page.locator('#map-mode-note').innerText(),/约公元100年的古海滩脊与河岸地貌/);
 assert.match(await page.locator('.legend').innerText(),/拉文纳古海滩脊/);
 await page.locator('#map-mode').selectOption('political');
 assert.deepEqual(await page.evaluate(async ids=>{const {map}=await import(document.querySelector('script[type="module"]').src);return ids.map(id=>map.getLayoutProperty(id,'visibility'))},ridgeIds),['none','none']);
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(500);
 if(await page.locator('.brief').evaluate(el=>el.classList.contains('collapsed')))await page.locator('#brief-toggle').click();
 await page.locator('#map-mode').selectOption('terrain');
 const mobile=await page.locator('.brief').evaluate(el=>({height:el.clientHeight,scroll:el.scrollHeight,max:getComputedStyle(el).maxHeight}));
 assert.ok(mobile.height<=844*.46&&mobile.scroll>mobile.height&&parseFloat(mobile.max)<=844*.46,`the phone map panel must retain a scrollable, bounded legend: ${JSON.stringify(mobile)}`);
 await page.locator('.brief').evaluate(el=>{el.scrollTop=el.scrollHeight});
 await page.screenshot({path:resolve(output,'ravenna-phone-legend.png')});
 assert.deepEqual(errors,[]);
 console.log('Ravenna landforms browser smoke passed (English, Chinese, terrain and political modes)');
}finally{await browser.close()}
