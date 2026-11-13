import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import bathymetry from '../mediterranean-bathymetry.js';
import {physicalStyle} from '../map-lab/physical-style.js';
import {identity} from '../identity.js';
import {newGrandGame} from '../engine.js';

assert.deepEqual([...new Set(bathymetry.features.map(feature=>feature.properties.depth))].sort((a,b)=>a-b),[200,1000,2000,3000]);
assert.ok(physicalStyle.layers.some(layer=>layer.id==='depth-200'&&layer.source==='bathymetry'));
assert.ok(physicalStyle.sources.rivers.data.features.some(feature=>feature.properties.name==='Tevere'));
assert.ok(physicalStyle.sources.rivers.data.features.some(feature=>feature.properties.name==='Po'));
assert.ok(physicalStyle.sources.rivers.data.features.every(feature=>feature.properties.kind!=='Canal'));
assert.ok(physicalStyle.sources.lakes.data.features.every(feature=>feature.properties.kind!=='Reservoir'));
assert.deepEqual(physicalStyle.sources['elevation-fine'].bounds,[-20,18,60,58]);
assert.deepEqual(physicalStyle.sources['elevation-aegean-higher'].bounds,[21.9,34,31,43]);
assert.equal(physicalStyle.sources['nile-delta'].data.geometry.type,'Polygon');
assert.ok(physicalStyle.layers.some(layer=>layer.id==='nile-delta-alluvium'));

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:Number(process.env.SPQR_ATLAS_WIDTH||1440),height:Number(process.env.SPQR_ATLAS_HEIGHT||900)}});
const errors=[],consoleErrors=[];
const external=[];
const terrainRequests=[];
const missingTerrain=[];
const landcoverRequests=[],missingLandcover=[];
async function waitForTerrain(pattern,message){
 for(let i=0;i<40;i++){
  if(terrainRequests.some(path=>pattern.test(path)))return;
  await page.waitForTimeout(200);
 }
 assert.fail(`${message}: ${terrainRequests.slice(-30).join(', ')}`);
}
page.on('pageerror',error=>errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){external.push(url.hostname);await route.abort();return}
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  if(pathname.includes('/terrain/'))terrainRequests.push(pathname);
  if(pathname.includes('/landcover/'))landcoverRequests.push(pathname);
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{if(pathname.includes('/terrain/'))missingTerrain.push(pathname);if(pathname.includes('/landcover/'))missingLandcover.push(pathname);await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('.maplibregl-canvas').waitFor();
 try{await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',null,{timeout:Number(process.env.SPQR_ATLAS_LOAD_TIMEOUT_MS||60000)})}
 catch(error){console.error('Atlas startup diagnostics',JSON.stringify({pageErrors:errors,consoleErrors:consoleErrors.slice(-12),status:await page.locator('#status').textContent()}));throw error}
 await page.waitForTimeout(1200);
 assert.equal(newGrandGame('caesar').regions.length,120);
 const visibleSites=await page.locator('.grand-site').count();
 assert.ok(visibleSites>0&&visibleSites<120,'Only settlements near the current view should keep live map markers');
 assert.equal(await page.locator('.maplibregl-canvas').isVisible(),true);
 assert.deepEqual(errors,[]);
 assert.ok(terrainRequests.length>0,'Overview terrain tiles were not requested');
 assert.deepEqual(missingTerrain,[]);
 assert.ok(landcoverRequests.length>0,'Overview idealized land-cover tiles were not requested');
 assert.deepEqual(missingLandcover,[]);
 assert.equal(external.includes('s3.amazonaws.com'),false,'Overview terrain unexpectedly needed the network');
 assert.ok(external.every(host=>host==='s3.amazonaws.com'||host.endsWith('googleapis.com')||host.endsWith('gstatic.com')),`Unexpected external dependency: ${external.join(', ')}`);
 await page.locator('#start-free').click();
 const firstLanguage=await page.locator('html').getAttribute('lang');
 assert.match(await page.locator('.map-key').innerText(),firstLanguage==='zh-CN'?/城市 · 颜色表示控制阵营/:/City · color shows controller/);
 for(const [site,owner] of [['cisalpine','caesar'],['italiaN','senate']]){
  const accent=await page.locator(`[data-site="${site}"]`).evaluate(el=>el.style.getPropertyValue('--site-accent'));
  assert.equal(accent,identity(owner).map,`${owner} settlement must match its faction map color`);
 }
 if(page.viewportSize().width>=901&&page.viewportSize().width<=1450){
  const back=await page.locator('#return-campaign').boundingBox();
  assert.ok(back&&back.x>=0&&back.x+back.width<=page.viewportSize().width-4,'Return to campaign must fit in the desktop header');
 }
 assert.equal(await page.locator('[data-site="italiaN"]').evaluate(el=>getComputedStyle(el).position),'absolute','Grand-campaign sites must use map coordinates');
 if(page.viewportSize().width<=600){
  assert.equal(await page.locator('#brief-toggle').getAttribute('aria-expanded'),'false','mobile map should open with its overview folded');
  assert.equal(await page.locator('.brief').isVisible(),false);
  assert.equal(await page.locator('#download-save').isVisible(),true,'mobile save export should not be clipped by the top menu');
  assert.equal(await page.locator('#upload-save').isVisible(),true,'mobile save import should not be clipped by the top menu');
  const sheet=await page.locator('.selection').boundingBox();
  assert.ok(sheet.width>=page.viewportSize().width-30&&sheet.x>=0&&sheet.x+sheet.width<=page.viewportSize().width,'mobile command sheet should span the usable width');
  await page.locator('#brief-toggle').click();assert.equal(await page.locator('.brief').isVisible(),true);
  await page.locator('#brief-toggle').click();assert.equal(await page.locator('.brief').isVisible(),false);
 }
 const initialRelief=page.viewportSize().width>900;
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),String(initialRelief),'Hill shading should default on at desktop size and off on small screens');
 assert.equal(await page.locator('#locator').isVisible(),false,'Locator should not cover the overview');
 await page.locator('#relief-toggle').click();
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),String(!initialRelief));
 await page.locator('#relief-toggle').click();
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),String(initialRelief));
 if(page.viewportSize().width<=600)await page.locator('#brief-toggle').click();
 await page.locator('#map-mode').selectOption('terrain');
 assert.match(await page.locator('.legend').innerText(),firstLanguage==='zh-CN'?/近岸浅海（约0–200米）/:/Coastal shelf \(about 0–200 m\)/);
 assert.match(await page.locator('.legend').innerText(),firstLanguage==='zh-CN'?/河流与天然湖泊/:/Rivers & natural lakes/);
 await page.locator('#language').click();
 assert.match(await page.locator('.map-key').innerText(),firstLanguage==='zh-CN'?/City · color shows controller/:/城市 · 颜色表示控制阵营/);
 assert.match(await page.locator('.legend').innerText(),firstLanguage==='zh-CN'?/Coastal shelf \(about 0–200 m\)/:/近岸浅海（约0–200米）/);
 assert.match(await page.locator('.legend').innerText(),firstLanguage==='zh-CN'?/Rivers & natural lakes/:/河流与天然湖泊/);
 assert.match(await page.locator('.file-transfer a').innerText(),firstLanguage==='zh-CN'?/LEGACY HUB/:/罗马遗产/);
 await page.locator('#map-mode').selectOption('political');
 if(page.viewportSize().width<=600){await page.locator('#brief-toggle').click();assert.equal(await page.locator('.brief').isVisible(),false)}
 if(process.env.SPQR_ATLAS_OVERVIEW_SCREENSHOT){await page.waitForTimeout(600);await page.screenshot({path:process.env.SPQR_ATLAS_OVERVIEW_SCREENSHOT})}
 if(process.env.SPQR_ATLAS_WIDE_SCREENSHOT){await page.locator('#zoom-out').click();await page.locator('#zoom-out').click();await page.waitForTimeout(1300);assert.equal(await page.locator('body').evaluate(el=>el.classList.contains('leader-overview')),true);assert.equal(await page.locator('[data-site="roma"]').evaluate(el=>getComputedStyle(el).fontSize),'0px','Wide overview should show a settlement dot, not a label competing with army flags');await page.screenshot({path:process.env.SPQR_ATLAS_WIDE_SCREENSHOT});await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();await page.waitForTimeout(800);assert.notEqual(await page.locator('[data-site="roma"]').evaluate(el=>getComputedStyle(el).fontSize),'0px','City names should return at regional zoom')}
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 await waitForTerrain(/\/terrain\/6\//,'Zoom 6 did not use bundled terrain');
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 await waitForTerrain(/\/terrain\/7\//,'Zoom 7 did not use bundled terrain');
 if(process.env.SPQR_ATLAS_Z7_SCREENSHOT){await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.isSourceLoaded('elevation-fine')},null,{timeout:45000});await page.waitForTimeout(500);await page.screenshot({path:process.env.SPQR_ATLAS_Z7_SCREENSHOT})}
 if(page.viewportSize().width>900){
  assert.equal(await page.locator('#locator').isVisible(),true,'Zoomed Italy needs a geographic locator');
  assert.match(await page.locator('.locator-title').innerText(),firstLanguage==='zh-CN'?/YOUR POSITION/:/当前位置/);
  const dot=await page.locator('#locator-position').evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));
  assert.ok(dot.x>0&&dot.x<100&&dot.y>0&&dot.y<100,'Locator dot must stay inside the Italy coast inset');
 }else assert.equal(await page.locator('#locator').isVisible(),false,'Narrow screens should keep the map unobstructed');
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 await waitForTerrain(/\/terrain\/8\//,'Zoom 8 did not use bundled terrain');
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 await waitForTerrain(/\/terrain\/9\//,'Zoom 9 did not use bundled terrain');
 assert.deepEqual(missingTerrain,[],'Zoomed Italy requested missing terrain tiles');
 assert.equal(external.includes('s3.amazonaws.com'),false,'Italy zoom needed network terrain');
 if(process.env.SPQR_ATLAS_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_SCREENSHOT});
 if(process.env.SPQR_ATLAS_TERRAIN_SCREENSHOT){await page.locator('#map-mode').selectOption('terrain');await page.waitForTimeout(500);await page.screenshot({path:process.env.SPQR_ATLAS_TERRAIN_SCREENSHOT});await page.locator('#map-mode').selectOption('political')}
 if(process.env.SPQR_ATLAS_RELIEF_SCREENSHOT){if(await page.locator('#relief-toggle').getAttribute('aria-pressed')==='false')await page.locator('#relief-toggle').click();await page.waitForTimeout(500);await page.screenshot({path:process.env.SPQR_ATLAS_RELIEF_SCREENSHOT})}
 if(page.viewportSize().width<=600)await page.locator('#brief-toggle').click();
 await page.locator('[data-objective="italiaN"]').click();await page.waitForTimeout(1200);
 if(page.viewportSize().width<=600)await page.locator('#brief-toggle').click();
 for(let i=0;i<3;i++){await page.locator('#zoom-in').click();await page.waitForTimeout(500)}
 const site=await page.locator('[data-site="italiaN"]').boundingBox();
 assert.ok(Math.abs(site.x-page.viewportSize().width/2)<15,'Ariminum must stay at the map focus');
 if(process.env.SPQR_ATLAS_OBJECTIVE_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_OBJECTIVE_SCREENSHOT});
 if(process.env.SPQR_ATLAS_Z9_RELIEF_SCREENSHOT){if(await page.locator('#relief-toggle').getAttribute('aria-pressed')==='false')await page.locator('#relief-toggle').click();await page.waitForTimeout(650);await page.screenshot({path:process.env.SPQR_ATLAS_Z9_RELIEF_SCREENSHOT})}
 if(process.env.SPQR_ATLAS_RIVER_SCREENSHOT){if(page.viewportSize().width<=600)await page.locator('#brief-toggle').click();await page.locator('[data-objective="roma"]').click();await page.waitForTimeout(1200);for(let i=0;i<3;i++){await page.locator('#zoom-in').click();await page.waitForTimeout(500)}await page.screenshot({path:process.env.SPQR_ATLAS_RIVER_SCREENSHOT})}
 await page.evaluate(()=>localStorage.setItem('spqr-relief-v2','on'));
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',{timeout:30000});
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'true','The enabled relief preference should survive reload');
 const egypt=newGrandGame('egypt');
 await page.evaluate(state=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state})),egypt);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',{timeout:30000});
 await page.waitForTimeout(1400);
 await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();
 await waitForTerrain(/\/terrain\/7\/(7[0-9]|8[0-9])\//,'Eastern Mediterranean zoom 7 did not use bundled local terrain');
 assert.deepEqual(missingTerrain,[],'Egyptian close zoom requested missing terrain tiles');
 if(process.env.SPQR_ATLAS_EGYPT_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_EGYPT_SCREENSHOT});
 await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();await page.waitForTimeout(900);
 await waitForTerrain(/\/terrain\/9\/(29\d|30[0-7])\//,'Egyptian maximum zoom did not use bundled high-detail terrain');
 assert.deepEqual(missingTerrain,[],'Egyptian maximum zoom requested missing terrain tiles');
 assert.equal(external.includes('s3.amazonaws.com'),false,'Egyptian terrain unexpectedly needed the network');
 if(process.env.SPQR_ATLAS_EGYPT_Z9_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_EGYPT_Z9_SCREENSHOT});
 if(process.env.SPQR_ATLAS_EGYPT_Z9_TERRAIN_SCREENSHOT){await page.locator('#map-mode').selectOption('terrain');await page.waitForTimeout(400);await page.screenshot({path:process.env.SPQR_ATLAS_EGYPT_Z9_TERRAIN_SCREENSHOT});await page.locator('#map-mode').selectOption('political')}
 const galatia=newGrandGame('galatia');
 await page.evaluate(state=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state})),galatia);
 await page.reload({waitUntil:'domcontentloaded'});
 try{await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',null,{timeout:60000})}
 catch(error){const status=await page.locator('#status').evaluate(el=>({display:el.style.display,text:el.textContent})).catch(()=>null);throw Error(`Atlas reload did not finish: ${JSON.stringify({status,errors,missingTerrain:missingTerrain.slice(-8)})}`,{cause:error})}
 await page.waitForTimeout(1400);
 terrainRequests.length=0;
 const aegeanCenter=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[27.1,38.6],zoom:9.1});return map.getCenter().toArray()});
 assert.ok(Math.abs(aegeanCenter[0]-27.1)<.1&&Math.abs(aegeanCenter[1]-38.6)<.1,'Aegean screenshot must actually focus on the coast');
 await waitForTerrain(/\/terrain\/9\/294\//,'Aegean maximum zoom did not use bundled high-detail terrain');
 assert.deepEqual(missingTerrain,[],'Aegean maximum zoom requested missing terrain tiles');
 assert.equal(external.includes('s3.amazonaws.com'),false,'Aegean terrain unexpectedly needed the network');
 const aegeanRelief=()=>page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return ['relief-aegean-ultra','relief-aegean-higher'].map(id=>({visibility:map.getLayoutProperty(id,'visibility')||'visible',strength:map.getPaintProperty(id,'hillshade-exaggeration')}))});
 assert.deepEqual(await aegeanRelief(),[{visibility:'visible',strength:.1},{visibility:'visible',strength:.1}]);
 await page.locator('#relief-toggle').click();
 assert.deepEqual((await aegeanRelief()).map(layer=>layer.visibility),['none','none']);
 await page.locator('#relief-toggle').click();
 assert.deepEqual((await aegeanRelief()).map(layer=>layer.visibility),['visible','visible']);
 if(process.env.SPQR_ATLAS_AEGEAN_Z9_SCREENSHOT){await page.waitForTimeout(650);await page.screenshot({path:process.env.SPQR_ATLAS_AEGEAN_Z9_SCREENSHOT})}
 terrainRequests.length=0;
 const iberianCenter=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[-4.78,37.888],zoom:9.1});return map.getCenter().toArray()});
 assert.ok(Math.abs(iberianCenter[0]+4.78)<.1&&Math.abs(iberianCenter[1]-37.888)<.1,'Iberian check must focus on Corduba');
 await waitForTerrain(/\/terrain\/9\/249\//,'Iberian maximum zoom did not use native zoom-9 terrain');
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.isSourceLoaded('elevation-iberia-ultra')&&map.isSourceLoaded('elevation-iberia-higher')},null,{timeout:45000});
 assert.deepEqual(missingTerrain,[],'Iberian close zoom requested missing terrain tiles');
 assert.equal(external.includes('s3.amazonaws.com'),false,'Iberian terrain unexpectedly needed the network');
 assert.equal(await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.getPaintProperty('relief-iberia-higher','hillshade-exaggeration')}),.1);
 terrainRequests.length=0;
 await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[-2.448,41.808],zoom:9.1})});
 await waitForTerrain(/\/terrain\/9\/252\//,'Numantia maximum zoom did not use native Iberian terrain');
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.isSourceLoaded('elevation-iberia-higher')},null,{timeout:45000});
 assert.deepEqual(missingTerrain,[],'Numantia close zoom requested missing terrain tiles');
 if(page.viewportSize().width>=1000)await page.waitForFunction(()=>{
  const source=document.querySelector('#map canvas.maplibregl-canvas');if(!source)return false;
  const sample=document.createElement('canvas');sample.width=110;sample.height=90;
  const context=sample.getContext('2d');context.drawImage(source,source.width*.58,source.height*.16,source.width*.16,source.height*.2,0,0,110,90);
  const pixels=context.getImageData(0,0,110,90).data;let low=255,high=0;
  for(let i=0;i<pixels.length;i+=4){const light=(pixels[i]+pixels[i+1]+pixels[i+2])/3;low=Math.min(low,light);high=Math.max(high,light)}
  return high-low>22;
 },null,{timeout:45000,polling:400});
 if(process.env.SPQR_ATLAS_IBERIA_Z9_SCREENSHOT){await page.waitForTimeout(400);await page.screenshot({path:process.env.SPQR_ATLAS_IBERIA_Z9_SCREENSHOT})}
 terrainRequests.length=0;
 const gallicCenter=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[3.136,45.72],zoom:9.1});return map.getCenter().toArray()});
 assert.ok(Math.abs(gallicCenter[0]-3.136)<.1&&Math.abs(gallicCenter[1]-45.72)<.1,'Gallic close zoom must focus on Gergovia');
 await waitForTerrain(/\/terrain\/9\/260\//,'Gallic maximum zoom did not use native zoom-9 terrain');
 await page.waitForFunction(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.isSourceLoaded('elevation-gaul-ultra')&&map.isSourceLoaded('elevation-gaul-higher')},null,{timeout:45000});
 assert.deepEqual(missingTerrain,[],'Gallic close zoom requested missing terrain tiles');
 assert.equal(external.includes('s3.amazonaws.com'),false,'Gallic terrain unexpectedly needed the network');
 assert.equal(await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.getPaintProperty('relief-gaul-higher','hillshade-exaggeration')}),.1);
 if(process.env.SPQR_ATLAS_GAUL_Z9_SCREENSHOT){await page.waitForTimeout(4000);await page.screenshot({path:process.env.SPQR_ATLAS_GAUL_Z9_SCREENSHOT})}
 for(const [region,lon,lat,tileX] of [
  ['pontic',35.154,42.026,305],['armenia',44.58,39.885,319],['syria',36.16,36.2,307],
  ['parthia',48.51,34.8,324],['leptis',14.293,32.638,276]
 ]){
  terrainRequests.length=0;
  const center=await page.evaluate(async({lon,lat})=>{const {map}=await import(document.querySelector('script[type="module"]').src);map.jumpTo({center:[lon,lat],zoom:9.1});return map.getCenter().toArray()},{lon,lat});
  assert.ok(Math.abs(center[0]-lon)<.1&&Math.abs(center[1]-lat)<.1,`${region} close zoom must reach its named site`);
  await waitForTerrain(new RegExp(`/terrain/9/${tileX}/`),`${region} maximum zoom did not request native terrain`);
  await page.waitForFunction(async region=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.isSourceLoaded(`elevation-${region}-higher`)},region,{timeout:45000});
  assert.deepEqual(missingTerrain,[],`${region} close zoom requested missing terrain tiles`);
  assert.equal(await page.evaluate(async region=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.getPaintProperty(`relief-${region}-higher`,'hillshade-exaggeration')},region),.1);
  if(region==='armenia'){
   const visibility=()=>page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.getLayoutProperty('relief-armenia-higher','visibility')||'visible'});
   await page.locator('#relief-toggle').click();assert.equal(await visibility(),'none','Armenian detail must honor relief off');
   await page.locator('#relief-toggle').click();assert.equal(await visibility(),'visible','Armenian detail must honor relief on');
  }
  const screenshot=process.env[`SPQR_ATLAS_${region.toUpperCase()}_Z9_SCREENSHOT`];
  if(screenshot){await page.waitForTimeout(4000);await page.screenshot({path:screenshot})}
 }
 assert.equal(external.includes('s3.amazonaws.com'),false,'Remaining regional terrain unexpectedly needed the network');
 await page.locator('#resources-help').click();assert.match(await page.locator('.national-budget').innerText(),/Home domain dues · game estimate/);
 await page.locator('#language').click();assert.match(await page.locator('.national-budget').innerText(),/本土领地储粮 · 游戏估算/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'the translated budget must not overflow the screen');
 if(process.env.SPQR_ATLAS_BUDGET_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_BUDGET_SCREENSHOT});
 await page.locator('#language').click();
 const armenia=newGrandGame('armenia');
 await page.evaluate(state=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state})),armenia);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',{timeout:30000});
 await page.waitForTimeout(1400);
 await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();
 await waitForTerrain(/\/terrain\/7\/(7[8-9]|8[0-2])\//,'Armenian zoom 7 did not use bundled mountain terrain');
 assert.deepEqual(missingTerrain,[],'Armenian mountain zoom requested missing terrain tiles');
 if(process.env.SPQR_ATLAS_ARMENIA_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_ARMENIA_SCREENSHOT});
 console.log('Offline atlas loaded MapLibre, 120 settlements, Mediterranean terrain through zoom 7 and native zoom 8-9 relief at every settlement anchor.');
}finally{await browser.close()}
