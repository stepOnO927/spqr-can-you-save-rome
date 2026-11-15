import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const output=resolve(root,'outputs','cartography-review');
await mkdir(output,{recursive:true});
const width=Number(process.env.SPQR_MAP_WIDTH)||1440,suffix=width<=700?`-${width}`:'';
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width,height:width<=700?844:900}}),errors=[];
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
 const ready=()=>page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[13.8,42.3],zoom:5.7})});
 await page.waitForTimeout(2700);await ready();await page.waitForTimeout(750);
 await page.screenshot({path:resolve(output,`atlas-focus-before${suffix}.png`)});
 await page.locator('#atlas-focus').click();
 assert.equal(await page.locator('#locator').isVisible(),false);
 assert.equal(await page.locator('.army').first().isVisible(),false);
 assert.equal(await page.locator('.grand-site').first().isVisible(),false);
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
