import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import assert from 'node:assert/strict';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const context=await browser.newContext({viewport:{width:1440,height:900}});
 await context.route('https://**/*',route=>route.abort());
 await context.route('http://spqr.test/**',async route=>{
  const url=new URL(route.request().url()),relative=url.pathname==='/map-lab/'?'map-lab/index.html':url.pathname.slice(1),target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep)){await route.abort();return}
  try{const body=await readFile(target),ext=path.extname(target),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'}[ext]||'application/octet-stream';await route.fulfill({status:200,contentType:type,body})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 const page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 if(await page.locator('html').getAttribute('lang')!=='zh-CN')await page.locator('#language').click();
 const details=page.locator('#map .maplibregl-ctrl-attrib'),summary=details.locator('summary');
 await details.waitFor();
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.loaded()&&map.areTilesLoaded()},null,{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#map .maplibregl-ctrl-attrib')?.open===false,null,{timeout:10000});
 assert.equal(await details.evaluate(el=>el.open),false);
 assert.ok(await details.evaluate(el=>el.getBoundingClientRect().width)<50,'collapsed credit should not cover the map');
 assert.match(await summary.getAttribute('aria-label'),/地图数据来源/);
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.6,43.9],zoom:6.35})});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.areTilesLoaded()&&document.querySelector('#map-charting').hidden},null,{timeout:30000});
 assert.equal(await details.evaluate(el=>el.open),false,'charting another area must not expand attribution over the map');
 await page.screenshot({path:path.join(root,'outputs','atlas-attribution-collapsed.png')});
 await summary.click();
 await page.waitForTimeout(250);
 assert.equal(await details.evaluate(el=>el.open),true);
 assert.match(await details.locator('.maplibregl-ctrl-attrib-inner').innerText(),/GSHHG 2\.3\.7/);
 assert.match(await details.locator('.maplibregl-ctrl-attrib-inner').innerText(),/Mapzen Terrain Tiles/);
 await summary.press('Enter');
 assert.equal(await details.evaluate(el=>el.open),false);
 await page.locator('#language').click();
 assert.match(await summary.getAttribute('aria-label'),/View map data sources/);
 await page.setViewportSize({width:390,height:844});
 await page.waitForFunction(()=>{const el=document.querySelector('#map .maplibregl-ctrl-attrib summary'),control=el?.getBoundingClientRect();if(!control||control.width>=50)return false;return ['.brief','.selection','.map-controls'].every(selector=>{const box=document.querySelector(selector).getBoundingClientRect();return control.right<=box.left||control.left>=box.right||control.bottom<=box.top||control.top>=box.bottom})},null,{timeout:5000});
 await page.screenshot({path:path.join(root,'outputs','atlas-attribution-mobile.png')});
 await summary.click();
 assert.equal(await details.evaluate(el=>el.open),true);
 assert.ok(await details.evaluate(el=>el.getBoundingClientRect().width)<=390);
 await summary.press('Enter');
 await page.setViewportSize({width:320,height:700});
 await page.waitForFunction(()=>{const el=document.querySelector('#map .maplibregl-ctrl-attrib summary'),control=el?.getBoundingClientRect();if(!control||control.width>=50)return false;return ['.brief','.map-controls'].every(selector=>{const box=document.querySelector(selector).getBoundingClientRect();return control.right<=box.left||control.left>=box.right||control.bottom<=box.top||control.top>=box.bottom})},null,{timeout:5000});
 assert.deepEqual(errors,[]);
 console.log('Atlas credits stay compact, open by mouse and keyboard, and retain full sources in both languages.');
}finally{await browser.close()}
