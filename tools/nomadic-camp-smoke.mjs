import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,...(process.env.SPQR_BROWSER_EXECUTABLE?{executablePath:process.env.SPQR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 const name=await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=world-kings-contact-1');
  const {configureStartingDifficulty}=await import('/difficulty.js?v=world-kings-contact-1');
  const s=configureStartingDifficulty(newGame('senate'),'expert',false,{localSeed:1});s.wars=[];
  const camp=s.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='generated-nomad:western-pasture');
  if(!camp||s.localDiscovery.senate[camp.id]?.seenTheater!=='numidia')throw Error('frontier camp not discovered');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
  return camp.name[0].toUpperCase();
 });
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 const marker=page.locator(`.city-marker[data-city="${name}"]`);await marker.waitFor({state:'visible'});
 await marker.evaluate(element=>element.click());
 const initial=await page.locator('#command-detail').innerText();
 assert.match(initial,/NOMADIC CAMP/);assert.match(initial,/Herds/);assert.match(initial,/seasonal range/);
 const offer=page.locator('#nomad-pasture');assert.equal(await offer.isDisabled(),false);await offer.click();
 assert.match(await page.locator('#command-detail').innerText(),/Offer takes 2 more months/);
 await page.locator('#save').click();await page.locator('#load').click();
 await marker.evaluate(element=>element.click());assert.match(await page.locator('#command-detail').innerText(),/Offer takes 2 more months/);
 for(let month=0;month<3;month++)await page.locator('#advance').click();
 assert.match(await page.locator('#selection-detail').innerText(),/Last sighting:/);
 assert.doesNotMatch(await page.locator('#selection-detail').innerText(),/Mauretania/i);
 await page.locator('#save').click();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 const camp=state.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='generated-nomad:western-pasture');
 assert.equal(camp.theater,'mauretania');assert.equal(state.localDiscovery.senate[camp.id].seenTheater,'numidia');
 assert.equal(await marker.isVisible(),false);assert.deepEqual(errors,[]);
 console.log('Built Map Lab shows a known nomad camp and pasture offer; the camp migrates in April while an out-of-range viewer retains only its old sighting.');
}finally{await browser.close()}
