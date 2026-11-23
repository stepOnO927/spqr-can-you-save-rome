import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=institutional-senders-1'),state=newGame('caesar');
  state.armies.find(army=>army.id==='xiii').region='italiaS';
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 const corfinium=page.locator('.city-marker[data-city="CORFINIUM"]');
 await corfinium.waitFor({state:'visible'});
 await corfinium.evaluate(node=>node.click());
 let panel=page.locator('#command-detail');
 assert.match(await panel.innerText(),/ROMAN TOWN · Corfinium/);
 assert.match(await panel.innerText(),/Domitius Ahenobarbus/);
 assert.match(await panel.innerText(),/Local control: Senate/);
 assert.match(await panel.innerText(),/Source: Caesar, Civil Wars I/);
 assert.equal(await page.locator('#town-siege').isDisabled(),false);
 await page.locator('#town-siege').click();
 assert.match(await panel.innerText(),/Siege takes/);
 await page.locator('#save').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 const town=saved.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='corfinium');
 assert.equal(town.siege.actor,'caesar');
 assert.equal(town.legalSovereign,'senate');
 assert.equal(saved.regions.find(region=>region.id==='italiaS').owner,'senate');
 const iguvium=page.locator('.city-marker[data-city="IGUVIUM"]');
 await iguvium.waitFor({state:'visible'});
 await iguvium.evaluate(node=>node.click());
 panel=page.locator('#command-detail');
 assert.match(await panel.innerText(),/ROMAN TOWN · Iguvium/);
 assert.match(await panel.innerText(),/Thermus/);
 assert.deepEqual(errors,[]);
 console.log('Corfinium and Iguvium appear as sourced towns; a saved local siege leaves theater control and legal title distinct.');
}finally{await browser.close()}
