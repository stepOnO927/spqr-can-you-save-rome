import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {newGrandGame} from '../engine.js';
import {portZone} from '../naval.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const state=newGrandGame('senate'),own=state.naval.fleets.find(fleet=>fleet.owner==='senate'),enemy=state.naval.fleets.find(fleet=>fleet.owner==='caesar');
own.order={kind:'supply',targetPort:'italiaS',cargo:12,path:[]};
enemy.port=null;enemy.zone=portZone('italiaS');enemy.order={kind:'blockade',targetPort:'italiaS',path:[]};
state.naval.reports.push({kind:'pirate-raid',owner:'senate',zone:'adriatic',year:state.year,month:state.month},{kind:'pirate-raid',owner:'caesar',zone:'eastern',year:state.year,month:state.month});
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:Number(process.env.SPQR_MARITIME_WIDTH||1440),height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.protocol==='blob:'){await route.continue();return}
  if(url.hostname!=='spqr.test'){await route.abort();return}
  const file=resolve(root,'.'+(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
  if(!file.startsWith(root+sep)){await route.abort();return}
  const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.addInitScript(value=>{localStorage.setItem('spqr-lang','en');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:value}))},state);
 await page.goto('http://spqr.test/map-lab/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',null,{timeout:60000});
 await page.locator('#naval').click();
 try{await page.locator('.maritime-alert.blockade').first().waitFor({state:'attached'})}catch(error){const status=await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return {style:map.isStyleLoaded(),loaded:map.loaded(),tiles:map.areTilesLoaded(),unloaded:Object.keys(map.getStyle().sources).filter(id=>!map.isSourceLoaded(id))}});throw Error(`Maritime markers missing: ${JSON.stringify(status)}; ${error.message}`)}
 assert.match(await page.locator('.legend').innerText(),/Blockade|封锁/);
 assert.ok(await page.locator('.maritime-alert.convoy').count());
 assert.ok(await page.locator('.maritime-alert.hazard').count());
 assert.equal(await page.locator('.maritime-alert.hazard').count(),1,'foreign pirate reports must stay hidden');
 assert.match(await page.locator('.maritime-alert.blockade').first().getAttribute('title'),/Port is blockaded/);
 assert.match(await page.locator('.maritime-alert.convoy').first().getAttribute('title'),/12 food/);
 if(process.env.SPQR_MARITIME_SCREENSHOT)await page.screenshot({path:process.env.SPQR_MARITIME_SCREENSHOT});
 await page.locator('#language').click();
 assert.match(await page.locator('.legend').innerText(),/有日期的危险报告/);
 assert.match(await page.locator('.maritime-alert.blockade').first().getAttribute('title'),/港口正受封锁/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'maritime map must not overflow a narrow viewport');
 if(page.viewportSize().width<=600&&!await page.locator('#map-mode').isVisible())await page.locator('#brief-toggle').click();
 await page.locator('#map-mode').selectOption('political');
 assert.equal(await page.locator('.maritime-alert').count(),0);
 assert.equal(await page.evaluate(async()=>{const {map}=await import(document.querySelector('script[type="module"]').src);return map.getPaintProperty('naval-lanes','line-opacity')}),0);
 assert.deepEqual(errors,[]);
 console.log('Maritime map shows observed hazards, own convoy and real port blockade in both languages; political mode clears the symbols.');
}finally{await browser.close()}
