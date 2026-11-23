import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'outputs','cartography-review');
await mkdir(output,{recursive:true});
const width=Number(process.env.SPQR_MAP_WIDTH)||1440,height=Number(process.env.SPQR_MAP_HEIGHT)||(width<=700?844:900),close=process.env.SPQR_MAP_FOCUS_CLOSE==='1',suffix=(close?'-local':'')+(width<=700?`-${width}`:height<=720?`-${width}x${height}`:'');
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width,height}}),errors=[];
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
 if(width>600&&width<=1350&&height<=720){
  const brief=page.locator('.brief'),toggle=page.locator('#brief-toggle');
  assert.equal(await brief.isVisible(),true,'the campaign briefing remains available at entry');
  await page.locator('#development').click();
  assert.equal(await brief.isVisible(),false,'opening Development exposes more of the map');
  assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await page.screenshot({path:resolve(output,`atlas-development${suffix}.png`)});
  await toggle.click();
  assert.equal(await brief.isVisible(),true,'the player can reopen the briefing');
  await page.locator('[data-dev-page="ideas"]').click();
  assert.equal(await brief.isVisible(),true,'changing Development tabs respects the manual choice');
  await page.locator('#language').click();
  assert.match(await toggle.getAttribute('aria-label'),/Collapse campaign briefing/);
 }
 const ready=()=>page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
 await page.evaluate(async close=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:close?[12.6,44.1]:[13.8,42.3],zoom:close?9.05:5.7})},close);
 await page.waitForTimeout(2700);await ready();await page.waitForTimeout(750);
 if(close){
  const ariminum=page.locator('.grand-site[data-site="italiaN"]');
  assert.equal(await ariminum.isVisible(),true);
  const cityAndFlag=()=>page.evaluate(()=>{const city=document.querySelector('.grand-site[data-site="italiaN"]'),flag=document.querySelector('.army[data-army="italy"]'),a=city.getBoundingClientRect(),b=flag.getBoundingClientRect();return {size:getComputedStyle(city).fontSize,named:city.textContent.trim().length>2,overlap:a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom}});
  assert.deepEqual(await cityAndFlag(),{size:'11px',named:true,overlap:false},'Ariminum should stay named beside the field standard without covering it');
  assert.match(await ariminum.getAttribute('aria-label'),/Ariminum|阿里米努姆/);
  await ariminum.focus();
  assert.match(await ariminum.getAttribute('aria-label'),/Ariminum|阿里米努姆/,'keyboard focus should retain the city name');
  await ariminum.blur();
  await page.locator('#language').click();
  assert.match(await ariminum.getAttribute('aria-label'),/阿里米努姆/);
  assert.deepEqual(await cityAndFlag(),{size:'11px',named:true,overlap:false},'the close-map city and standard should stay separate after a language switch');
  await page.locator('#language').click();
 }
 await page.screenshot({path:resolve(output,`atlas-focus-before${suffix}.png`)});
 await page.locator('#atlas-focus').click();
 assert.equal(await page.locator('#locator').isVisible(),false);
 assert.equal(await page.locator('.army').first().isVisible(),false);
 assert.equal(await page.locator(`.grand-site[data-site="${close?'italiaN':'roma'}"]`).isVisible(),true);
 assert.equal(await page.locator('#atlas-caption').isVisible(),true);
 const caption=await page.locator('#atlas-caption').boundingBox(),controls=await page.locator('.map-controls').boundingBox();
 assert.ok(caption.x+caption.width+5<=controls.x,`Focus caption overlaps map controls: ${JSON.stringify({caption,controls})}`);
 await ready();await page.waitForTimeout(750);
 await page.screenshot({path:resolve(output,`atlas-focus-after${suffix}.png`)});
 await page.keyboard.press('Escape');
 assert.equal(await page.locator('body.atlas-focus').count(),0);
 assert.equal(await page.locator('.army').first().isVisible(),true);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({width,before:`outputs/cartography-review/atlas-focus-before${suffix}.png`,after:`outputs/cartography-review/atlas-focus-after${suffix}.png`,errors}));
}finally{await browser.close()}
