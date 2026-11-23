import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,...(process.env.SPQR_BROWSER_EXECUTABLE?{executablePath:process.env.SPQR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=archived-leads-1');
  const state=newGame('senate'),town=state.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='capua');
  town.controller='senate';town.legalSovereign='caesar';town.administrativeStatus='occupied';town.resistance=30;
  state.world.characters.cicero.location=town.theater;
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 const marker=page.locator('.city-marker[data-city="CAPUA"]');await marker.waitFor({state:'visible'});await marker.evaluate(element=>element.click());
 const box=page.locator('.local-administrator-panel');await box.waitFor();
 assert.match(await box.innerText(),/LOCAL SETTLEMENT ADMINISTRATOR/);
 await box.locator('#settlement-administrator-choice').selectOption('cicero');
 assert.equal(await box.locator('#settlement-administrator-appoint').isDisabled(),false);
 await box.locator('#settlement-administrator-appoint').click();
 assert.match(await page.locator('.local-administrator-panel').innerText(),/Current: Marcus Tullius Cicero/);
 await page.locator('#save').click();
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=archived-leads-1');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:newGame('caesar')}))});
 await page.reload();await page.locator('#load').click();await marker.waitFor({state:'visible'});await marker.evaluate(element=>element.click());
 assert.match(await page.locator('.local-administrator-panel').innerText(),/Current: Marcus Tullius Cicero/);
 assert.deepEqual(errors,[]);
 console.log('A paid city administrator can be appointed from the Map Lab and survives save/load.');
}finally{await browser.close()}
