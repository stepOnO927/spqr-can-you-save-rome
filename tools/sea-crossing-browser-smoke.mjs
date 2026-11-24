import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const browser=await chromium.launch({headless:true,executablePath:process.env.SPQR_CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('dialog',dialog=>dialog.accept('1'));
try{
 await page.route('http://spqr.test/**',async route=>{
  const pathname=new URL(route.request().url()).pathname;
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep))return route.abort();
  const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.json':'application/json'}[extname(file)]||'application/octet-stream';
  try{await route.fulfill({status:200,contentType:mime,body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Not found'})}
 });
 await page.goto('http://spqr.test/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGrandGame,portZone}=await import('/engine.js?v=255');
  const {stageHandoff}=await import('/view-handoff.js');
  const state=newGrandGame('senate'),unit=state.armies.find(a=>a.id==='italy'),fleet=state.naval.fleets.find(f=>f.id==='senate-adriatic');
  unit.region='t016';unit.men=5200;
  state.regions.find(r=>r.id==='t016').owner='senate';state.regions.find(r=>r.id==='africa').owner='senate';
  fleet.port='t016';fleet.zone=portZone('t016');fleet.ships.transport=2;
  stageHandoff(sessionStorage,state,'campaign');
 });
 await page.reload({waitUntil:'domcontentloaded'});
 assert.equal(await page.locator('.entry-screen').count(),0);
 await page.locator('[data-tab="military"]').click();
 await page.locator('[data-select-army="italy"]').click();
 await page.locator('#order').click();
 await page.evaluate(()=>{const select=document.querySelector('#region-choice');select.value='africa';select.dispatchEvent(new Event('change',{bubbles:true}))});
 await page.locator('#open-atlas').click();
 await page.locator('.maplibregl-canvas').waitFor();
 await page.waitForFunction(()=>document.querySelector('#status')?.style.display==='none',null,{timeout:60000});
 await page.locator('#save').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(before.armies.find(a=>a.id==='italy').move?.sea,true);
 assert.equal(before.armies.find(a=>a.id==='italy').move?.to,'africa');
 assert.equal(before.naval.fleets.find(f=>f.id==='senate-adriatic').order?.kind,'transport');
 await page.locator('#language').click();
 assert.equal(await page.locator('html').getAttribute('lang'),'zh-CN');
 await page.locator('#load').click();
 await page.locator('#save').click();
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(after.armies.find(a=>a.id==='italy').move?.to,'africa');
 assert.equal(after.naval.fleets.find(f=>f.id==='senate-adriatic').order?.kind,'transport');
 assert.deepEqual(errors,[]);
 console.log('Sea crossing browser smoke passed: Ostia–Utica transport, Chinese switch, save and load');
}finally{await browser.close()}
