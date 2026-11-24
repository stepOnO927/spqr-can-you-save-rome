import {chromium} from 'playwright';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import rivers from '../ariminum-rivers.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url))),output=resolve(root,'outputs','ariminum-rivers');
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],missing=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.protocol==='blob:')return route.continue();
  if(url.hostname!=='spqr.test')return route.abort();
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{missing.push(url.pathname);await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-free').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.locator('#map-mode').selectOption('terrain');
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[12.5,44.16],zoom:9.05})});
 await page.locator('#map-charting').waitFor({state:'hidden',timeout:30000});
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return !map.isMoving()&&map.areTilesLoaded()&&map.isSourceLoaded('ariminum-rivers')&&Number(getComputedStyle(document.querySelector('#map')).opacity)>.99},null,{timeout:30000});
 const visible=await page.evaluate(async features=>{const {map}=await import(document.querySelector('script[type="module"]').src);return features.map(feature=>{const coords=feature.geometry.coordinates,p=map.project(coords[Math.floor(coords.length/2)]);return {name:feature.properties.name,visible:map.queryRenderedFeatures([[p.x-5,p.y-5],[p.x+5,p.y+5]],{layers:['waterways-ariminum']}).some(item=>item.properties.name===feature.properties.name)}})},rivers.features);
 assert.deepEqual(visible.map(item=>item.visible),[true,true],JSON.stringify(visible));
 assert.match(await page.locator('#map-mode-note').innerText(),/modern open-map courses/);
 assert.doesNotMatch(await page.locator('#map-mode-note').innerText(),/The close Tiber and Arno lines/);
 const compact=await page.evaluate(()=>({height:document.querySelector('#map-mode-note').clientHeight,lastLegend:document.querySelector('.legend span:last-child').getBoundingClientRect().bottom}));
 assert.ok(compact.lastLegend<900,'the collapsed source note leaves the complete terrain legend visible');
 await page.locator('#brief-toggle').click();await page.locator('#brief-toggle').click();
 await page.waitForFunction(()=>!document.querySelector('#map-note-toggle').hidden);
 assert.equal(await page.locator('#map-note-toggle').isVisible(),true,'reopening the briefing restores the note control');
 await page.locator('#map-note-toggle').click();
 assert.equal(await page.locator('#map-note-toggle').getAttribute('aria-expanded'),'true');
 assert.ok(await page.locator('#map-mode-note').evaluate(note=>note.clientHeight)>compact.height,'the full historical caveat can be opened');
 await page.locator('#map-note-toggle').click();
 assert.equal(await page.locator('#map-note-toggle').getAttribute('aria-expanded'),'false');
 await page.locator('#map .maplibregl-ctrl-attrib summary').click();
 assert.match(await page.locator('#map .maplibregl-ctrl-attrib-inner').innerText(),/Modern Marecchia and Savio: OpenStreetMap contributors, ODbL 1\.0/);
 await page.locator('#map .maplibregl-ctrl-attrib summary').click();
 await page.screenshot({path:resolve(output,'with-rivers.png')});
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.setLayoutProperty('waterways-ariminum','visibility','none')});
 await page.screenshot({path:resolve(output,'without-rivers.png')});
 await page.locator('#language').click();
 assert.match(await page.locator('#map-mode-note').innerText(),/现代开放地图/);
 assert.match(await page.locator('#map-note-toggle').innerText(),/展开地图说明/);
 assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
 console.log('Modern Marecchia and Savio render at native zoom in both languages without missing assets.');
}finally{await browser.close()}
