import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('..',import.meta.url))),output=resolve(root,'outputs','cartography-review');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.loaded()&&!!map.getSource('nile-delta-wash')},null,{timeout:30000});
 await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[30.8,31.1],zoom:9.05})});
 await page.locator('#map-charting').waitFor({state:'visible',timeout:3000});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !!map.getSource('nile-delta-wash')&&!map.isMoving()&&map.areTilesLoaded()&&map.isSourceLoaded('nile-delta-wash')&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src),ready=!!map.getSource('nile-delta-wash')&&!map.isMoving()&&map.areTilesLoaded()&&map.isSourceLoaded('nile-delta-wash')&&document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99;window.__nileStableAt=ready?(window.__nileStableAt||performance.now()):0;return ready&&performance.now()-window.__nileStableAt>900},null,{timeout:30000});
 await page.waitForTimeout(12000);
 await page.waitForFunction(()=>document.querySelector('#map-charting').hidden&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99,null,{timeout:15000});
 assert.equal(await page.locator('#map-charting').evaluate(element=>getComputedStyle(element).display),'none','the finished map must not retain the charting notice');
 const inspect=async()=>page.evaluate(async()=>{
  const {map}=await import(document.querySelector('script[type="module"]').src),surface=map.getCanvas(),image=await createImageBitmap(surface),copy=document.createElement('canvas');
  copy.width=surface.width;copy.height=surface.height;const context=copy.getContext('2d');context.drawImage(image,0,0);
  const sample=point=>{const screen=map.project(point),x=Math.max(0,Math.min(copy.width-1,Math.round(screen.x*copy.width/surface.clientWidth))),y=Math.max(0,Math.min(copy.height-1,Math.round(screen.y*copy.height/surface.clientHeight)));return [...context.getImageData(x,y,1,1).data].slice(0,3)};
  return {source:map.getSource('nile-delta-wash')?.serialize().type,layer:map.getLayer('nile-delta-close-wash')?.id,delta:sample([30.8,31.1]),desert:sample([30.4,30.7]),sea:sample([30.8,31.55])};
 });
 const withWash=await inspect();
 assert.equal(withWash.source,'image');assert.equal(withWash.layer,'nile-delta-close-wash');
 assert.match(await page.locator('.legend').innerText(),/尼罗河三角洲低地（示意）/);
 assert.match(await page.locator('#map-mode-note').innerText(),/不代表前49年的冲积土或耕地边界/);
 await page.screenshot({path:resolve(output,'nile-delta-wash-current.png')});
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.setLayoutProperty('nile-delta-close-wash','visibility','none')});
 await page.waitForTimeout(500);
 const withoutWash=await inspect(),change=(a,b)=>Math.max(...a.map((value,index)=>Math.abs(value-b[index])));
 assert.ok(change(withWash.delta,withoutWash.delta)>=12,'the wash must visibly differentiate the mapped delta');
 assert.ok(change(withWash.desert,withoutWash.desert)<=2,'the wash must not color the desert outside the schematic region');
 assert.ok(change(withWash.sea,withoutWash.sea)<=2,'the wash must not color the Mediterranean');
 await page.locator('#language').click();
 assert.match(await page.locator('.legend').innerText(),/Nile Delta lowland \(schematic\)/);
 assert.match(await page.locator('#map-mode-note').innerText(),/not a surveyed 49 BCE alluvial or farmland boundary/);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({withWash,withoutWash,output}));
}finally{await browser.close()}
