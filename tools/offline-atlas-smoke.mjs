import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import bathymetry from '../mediterranean-bathymetry.js';
import {physicalStyle} from '../map-lab/physical-style.js';

assert.deepEqual([...new Set(bathymetry.features.map(feature=>feature.properties.depth))].sort((a,b)=>a-b),[200,1000,2000,3000]);
assert.ok(physicalStyle.layers.some(layer=>layer.id==='depth-200'&&layer.source==='bathymetry'));

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:Number(process.env.SPQR_ATLAS_WIDTH||1440),height:Number(process.env.SPQR_ATLAS_HEIGHT||900)}});
const errors=[];
const external=[];
const terrainRequests=[];
const missingTerrain=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){external.push(url.hostname);await route.abort();return}
  const pathname=url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname;
  if(pathname.includes('/terrain/'))terrainRequests.push(pathname);
  const file=resolve(root,'.'+pathname);
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}
  catch{if(pathname.includes('/terrain/'))missingTerrain.push(pathname);await route.fulfill({status:404,body:'Not found'})}
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
 assert.equal(external.includes('s3.amazonaws.com'),false,'Overview terrain unexpectedly needed the network');
 assert.ok(external.every(host=>host==='s3.amazonaws.com'||host.endsWith('googleapis.com')||host.endsWith('gstatic.com')),`Unexpected external dependency: ${external.join(', ')}`);
 await page.locator('#start-free').click();
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
 await page.locator('#relief-toggle').click();
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'true');
 await page.locator('#relief-toggle').click();
 assert.equal(await page.locator('#relief-toggle').getAttribute('aria-pressed'),'false');
 if(page.viewportSize().width<=600)await page.locator('#brief-toggle').click();
 await page.locator('#map-mode').selectOption('terrain');
 const firstLanguage=await page.locator('html').getAttribute('lang');
 assert.match(await page.locator('.legend').innerText(),firstLanguage==='zh-CN'?/近岸浅海（约0–200米）/:/Coastal shelf \(about 0–200 m\)/);
 await page.locator('#language').click();
 assert.match(await page.locator('.legend').innerText(),firstLanguage==='zh-CN'?/Coastal shelf \(about 0–200 m\)/:/近岸浅海（约0–200米）/);
 assert.match(await page.locator('.file-transfer a').innerText(),firstLanguage==='zh-CN'?/LEGACY HUB/:/罗马遗产/);
 await page.locator('#map-mode').selectOption('political');
 if(page.viewportSize().width<=600){await page.locator('#brief-toggle').click();assert.equal(await page.locator('.brief').isVisible(),false)}
 if(process.env.SPQR_ATLAS_OVERVIEW_SCREENSHOT){await page.waitForTimeout(600);await page.screenshot({path:process.env.SPQR_ATLAS_OVERVIEW_SCREENSHOT})}
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 assert.ok(terrainRequests.some(path=>path.includes('/terrain/6/')),'Zoom 6 did not use bundled terrain');
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 assert.ok(terrainRequests.some(path=>path.includes('/terrain/7/')),'Zoom 7 did not use bundled terrain');
 await page.locator('#zoom-in').click();await page.waitForTimeout(1200);
 assert.ok(terrainRequests.some(path=>path.includes('/terrain/8/')),'Zoom 8 did not use bundled terrain');
 assert.deepEqual(missingTerrain,[],'Zoomed Italy requested missing terrain tiles');
 assert.equal(external.includes('s3.amazonaws.com'),false,'Italy zoom needed network terrain');
 if(process.env.SPQR_ATLAS_SCREENSHOT)await page.screenshot({path:process.env.SPQR_ATLAS_SCREENSHOT});
 if(process.env.SPQR_ATLAS_RELIEF_SCREENSHOT){await page.locator('#relief-toggle').click();await page.waitForTimeout(500);await page.screenshot({path:process.env.SPQR_ATLAS_RELIEF_SCREENSHOT})}
 console.log('Offline atlas loaded MapLibre, 120 settlement markers and local terrain through Italy zoom 8.');
}finally{await browser.close()}
