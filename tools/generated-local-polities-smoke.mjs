import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,...(process.env.SPQR_BROWSER_EXECUTABLE?{executablePath:process.env.SPQR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
// Seed 3 places both a city and a chief in Caesar's opening discoveries,
// while Senate also controls a generated independent village.
const fixtureSeed=3;
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 const generated=await page.evaluate(async(seed)=>{
  const {newGame}=await import('/engine.js?v=world-kings-estate-village-1');
  const {configureStartingDifficulty}=await import('/difficulty.js?v=world-kings-estate-village-1');
  const {localDiscoveryLevel}=await import('/local-discovery.js?v=world-kings-estate-village-1');
  const {advanceVillages}=await import('/local-villages.js');
  const s=configureStartingDifficulty(newGame('caesar'),'hard',false,{localSeed:seed});
  const entities=s.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.procedural&&!entity.proceduralVillage&&!entity.proceduralNomad&&!entity.proceduralWilderness);
  const known=entities.find(entity=>entity.type==='city_state'&&localDiscoveryLevel(s,s.player,entity.id)>=3);
  const chief=entities.find(entity=>entity.type==='strongman'&&localDiscoveryLevel(s,s.player,entity.id)>=3);
  const village=s.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.sponsor===chief?.id);
  if(!known||!chief||!village)throw Error('no discovered generated city, chief and village');
  village.village.road=1;village.village.granary=1;village.village.storedFood=Math.max(village.village.storedFood,village.village.foodNeed*4);s.month=6;advanceVillages(s);
  if(village.village.lastEvent?.kind!=='harvest')throw Error('no seeded village harvest event');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
  return {count:entities.length,name:known.name[0].toUpperCase(),population:known.population,ruler:known.ruler.name[0],chief:chief.name[0].toUpperCase(),village:village.name[0].toUpperCase(),chiefPopulation:chief.population,villagePopulation:village.village.population};
 },fixtureSeed);
 assert.ok(generated.count>=6&&generated.count<=7);
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 const marker=page.locator(`.city-marker[data-city="${generated.name}"]`);
 await marker.waitFor({state:'visible'});await marker.click();
 const panel=await page.locator('#command-detail').innerText();
 assert.match(panel,/Fictional autonomous polity generated for this campaign/);
 assert.ok(panel.includes(generated.population.toLocaleString('en-US')));
 assert.ok(panel.includes(generated.ruler));
 assert.match(panel,/NEGOTIATE LOCAL ACCESS/);
 assert.match(panel,/NEGOTIATE LOCAL TRADE/);
 const chiefMarker=page.locator(`.city-marker[data-city="${generated.chief}"]`);
 await chiefMarker.waitFor({state:'visible'});await chiefMarker.click();
 const chiefPanel=await page.locator('#command-detail').innerText();
 assert.match(chiefPanel,/LOCAL STRONGMAN/);assert.match(chiefPanel,/INVITE CHIEF INTO SERVICE/);assert.match(chiefPanel,/RECOGNIZE LOCAL TITLE/);
 assert.equal(await page.locator('#tribal-recognition').isDisabled(),false);
 assert.ok(chiefPanel.includes(generated.chiefPopulation.toLocaleString('en-US')));
 assert.match(chiefPanel,/legal title:/);assert.match(chiefPanel,/personal control is not a recognized sovereign border/);
 await page.locator('#tribal-service').click();
 assert.match(await page.locator('#command-detail').innerText(),/Offer takes 2 more months/);
 const villageMarker=page.locator(`.city-marker[data-city="${generated.village}"]`);
 await villageMarker.waitFor({state:'visible'});await villageMarker.click();
 const villagePanel=await page.locator('#command-detail').innerText();
 assert.match(villagePanel,/Local chief:/);assert.match(villagePanel,/Personal service does not transfer the village/);
 assert.match(villagePanel,/Harvest gathering used one local food/);
 assert.ok(villagePanel.includes(String(generated.villagePopulation)));
 assert.equal(await page.locator('#village-granary').isDisabled(),true);
 await page.locator('#save').click();
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=world-kings-estate-village-1');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:newGame('caesar')}))});
 await page.reload();await page.locator('.city-marker').first().waitFor();assert.equal(await marker.count(),0);
 await page.locator('#load').click();await marker.waitFor({state:'visible'});
 await marker.click();assert.ok((await page.locator('#command-detail').innerText()).includes(generated.population.toLocaleString('en-US')));
 assert.ok((await page.locator('#command-detail').innerText()).includes(generated.ruler));
 await chiefMarker.click();assert.match(await page.locator('#command-detail').innerText(),/Offer takes 2 more months/);
 await villageMarker.click();assert.match(await page.locator('#command-detail').innerText(),/Personal service does not transfer the village/);assert.match(await page.locator('#command-detail').innerText(),/Harvest gathering used one local food/);
 const independent=await page.evaluate(async(seed)=>{
  const {newGame}=await import('/engine.js?v=world-kings-estate-village-1');
  const {configureStartingDifficulty}=await import('/difficulty.js?v=world-kings-estate-village-1');
  const s=configureStartingDifficulty(newGame('senate'),'hard',false,{localSeed:seed});
  const village=s.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.proceduralIndependentVillage&&entity.controller===s.player);
  if(!village)throw Error('no owned independent village');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
  return village.name[0].toUpperCase();
 },fixtureSeed);
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 const independentMarker=page.locator(`.city-marker[data-city="${independent}"]`);
 // The second fixture can place its village beyond the initial map viewport.
 // Dispatch the marker's real DOM click handler after confirming it exists.
 await independentMarker.waitFor({state:'visible'});await independentMarker.evaluate(marker=>marker.click());
 assert.match(await page.locator('#command-detail').innerText(),/Fictional village generated for this campaign/);
 assert.equal(await page.locator('#village-granary').isDisabled(),false);
 await page.locator('#village-granary').click();
 assert.match(await page.locator('#command-detail').innerText(),/granary project: 2 months remaining/i);
 assert.deepEqual(errors,[]);
 console.log('Built Map Lab displays a generated city, strongman, dependent and independent villages; service persists and a village can start a funded project.');
}finally{await browser.close()}
