// The city beneath a field standard must stay named and independently selectable.
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:')return route.continue();
  if(url.hostname!=='spqr.test')return route.abort();
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !!map.getLayer('grand-control')},null,{timeout:30000});
 await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.6,44.1],zoom:9.05})});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&document.querySelector('.grand-site[data-site="italiaN"]')?.classList.contains('beside-army')},null,{timeout:30000});
 await page.waitForTimeout(1000);
 const site=page.locator('.grand-site[data-site="italiaN"]');
 const flag=page.locator('.army[data-army="italy"]');
 const check=async()=>{
  const positions=await page.evaluate(()=>{
   const city=document.querySelector('.grand-site[data-site="italiaN"]'),army=document.querySelector('.army[data-army="italy"]');
   const a=city.getBoundingClientRect(),b=army.getBoundingClientRect();
   return {city:city.textContent.trim(),cityWidth:a.width,cityHeight:a.height,armyWidth:b.width,overlap:a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom,compact:city.classList.contains('near-site')||city.classList.contains('near-army')};
  });
  assert.ok(positions.city.length>2,JSON.stringify(positions));
  assert.ok(positions.cityWidth>35&&positions.cityHeight>12,JSON.stringify(positions));
  assert.equal(positions.overlap,false,JSON.stringify(positions));
  assert.equal(positions.compact,false,JSON.stringify(positions));
  await site.click();
  assert.match(await page.locator('#selection-title').textContent(),/Ariminum|阿里米努姆|Northern Italy|北意大利/i);
  await flag.click();
  assert.match(await page.locator('#selection-title').textContent(),/Italian|意大利/i);
  return positions;
 };
 const results=[];
 for(const mode of ['terrain','political','military']){
  await page.locator('#map-mode').selectOption(mode);
  results.push({language:'en',mode,...await check()});
 }
 await page.locator('#language').click();
 for(const mode of ['terrain','political','military']){
  await page.locator('#map-mode').selectOption(mode);
  results.push({language:'zh',mode,...await check()});
 }
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({results,errors},null,2));
}finally{await browser.close()}
