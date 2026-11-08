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

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:Number(process.env.SPQR_ATLAS_WIDTH||1440),height:Number(process.env.SPQR_ATLAS_HEIGHT||900)}});
const errors=[];
const external=[];
const terrainRequests=[];
const missingTerrain=[];
const landcoverRequests=[],missingLandcover=[];
page.on('pageerror',error=>errors.push(error.message));
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
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',{timeout:30000});
 await page.waitForTimeout(1200);
 assert.equal(await page.locator('.grand-site').count(),120);
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
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'false','Hill shading should start disabled');
 assert.equal(await page.locator('#locator').isVisible(),false,'Locator should not cover the overview');
 await page.locator('#relief-toggle').click();
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'true');
 await page.locator('#relief-toggle').click();
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'false');
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
 assert.ok(terrainRequests.some(path=>path.includes('/terrain/6/')),'Zoom 6 did not use bundled terrain');
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 assert.ok(terrainRequests.some(path=>path.includes('/terrain/7/')),'Zoom 7 did not use bundled terrain');
 if(process.env.SPQR_ATLAS_Z7_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_Z7_SCREENSHOT});
 if(page.viewportSize().width>900){
  assert.equal(await page.locator('#locator').isVisible(),true,'Zoomed Italy needs a geographic locator');
  assert.match(await page.locator('.locator-title').innerText(),firstLanguage==='zh-CN'?/YOUR POSITION/:/当前位置/);
  const dot=await page.locator('#locator-position').evaluate(el=>({x:parseFloat(el.style.left),y:parseFloat(el.style.top)}));
  assert.ok(dot.x>0&&dot.x<100&&dot.y>0&&dot.y<100,'Locator dot must stay inside the Italy coast inset');
 }else assert.equal(await page.locator('#locator').isVisible(),false,'Narrow screens should keep the map unobstructed');
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 assert.ok(terrainRequests.some(path=>path.includes('/terrain/8/')),'Zoom 8 did not use bundled terrain');
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 assert.ok(terrainRequests.some(path=>path.includes('/terrain/9/')),'Zoom 9 did not use bundled terrain');
 assert.deepEqual(missingTerrain,[],'Zoomed Italy requested missing terrain tiles');
 assert.equal(external.includes('s3.amazonaws.com'),false,'Italy zoom needed network terrain');
 if(process.env.SPQR_ATLAS_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_SCREENSHOT});
 if(process.env.SPQR_ATLAS_TERRAIN_SCREENSHOT){await page.locator('#map-mode').selectOption('terrain');await page.waitForTimeout(500);await page.screenshot({path:process.env.SPQR_ATLAS_TERRAIN_SCREENSHOT});await page.locator('#map-mode').selectOption('political')}
 if(process.env.SPQR_ATLAS_RELIEF_SCREENSHOT){await page.locator('#relief-toggle').click();await page.waitForTimeout(500);await page.screenshot({path:process.env.SPQR_ATLAS_RELIEF_SCREENSHOT})}
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
 await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();await page.waitForTimeout(900);
 assert.ok(terrainRequests.some(path=>/\/terrain\/7\/(7[0-9]|8[0-9])\//.test(path)),'Eastern Mediterranean zoom 7 did not use bundled local terrain');
 assert.deepEqual(missingTerrain,[],'Egyptian close zoom requested missing terrain tiles');
 if(process.env.SPQR_ATLAS_EGYPT_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_EGYPT_SCREENSHOT});
 await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();await page.waitForTimeout(900);
 assert.deepEqual(missingTerrain,[],'Egyptian maximum zoom requested missing terrain tiles');
 assert.equal(external.includes('s3.amazonaws.com'),false,'Egyptian terrain unexpectedly needed the network');
 if(process.env.SPQR_ATLAS_EGYPT_Z9_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_EGYPT_Z9_SCREENSHOT});
 const armenia=newGrandGame('armenia');
 await page.evaluate(state=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state})),armenia);
 await page.reload({waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',{timeout:30000});
 await page.waitForTimeout(1400);
 await page.locator('#zoom-in').click();await page.locator('#zoom-in').click();await page.waitForTimeout(900);
 assert.ok(terrainRequests.some(path=>/\/terrain\/7\/(7[8-9]|8[0-2])\//.test(path)),'Armenian zoom 7 did not use bundled mountain terrain');
 assert.deepEqual(missingTerrain,[],'Armenian mountain zoom requested missing terrain tiles');
 if(process.env.SPQR_ATLAS_ARMENIA_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_ARMENIA_SCREENSHOT});
 console.log('Offline atlas loaded MapLibre, 120 settlements, Mediterranean terrain through zoom 7 and Italy through zoom 9.');
}finally{await browser.close()}
