import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,...(process.env.SPQR_BROWSER_EXECUTABLE?{executablePath:process.env.SPQR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 const generated=await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=world-kings-trade-1');
  const {configureStartingDifficulty}=await import('/difficulty.js?v=world-kings-trade-1');
  const {localDiscoveryLevel}=await import('/local-discovery.js?v=world-kings-trade-1');
  const s=configureStartingDifficulty(newGame('caesar'),'hard',false,{localSeed:2});
  const entities=s.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.procedural);
  const known=entities.find(entity=>localDiscoveryLevel(s,s.player,entity.id)>=3);
  if(!known)throw Error('no discovered generated polity');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
  return {count:entities.length,name:known.name[0].toUpperCase(),population:known.population,ruler:known.ruler.name[0]};
 });
 assert.ok(generated.count>=6&&generated.count<=7);
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 const marker=page.locator(`.city-marker[data-city="${generated.name}"]`);
 await marker.waitFor({state:'visible'});await marker.click();
 const panel=await page.locator('#command-detail').innerText();
 assert.match(panel,/Fictional autonomous polity generated for this campaign/);
 assert.ok(panel.includes(generated.population.toLocaleString('en-US')));
 assert.ok(panel.includes(generated.ruler));
 assert.match(panel,/NEGOTIATE LOCAL ACCESS/);
 await page.locator('#save').click();
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=world-kings-trade-1');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:newGame('caesar')}))});
 await page.reload();await page.locator('.city-marker').first().waitFor();assert.equal(await marker.count(),0);
 await page.locator('#load').click();await marker.waitFor({state:'visible'});
 await marker.click();assert.ok((await page.locator('#command-detail').innerText()).includes(generated.population.toLocaleString('en-US')));
 assert.ok((await page.locator('#command-detail').innerText()).includes(generated.ruler));
 assert.deepEqual(errors,[]);
 console.log('Built Map Lab displays a generated polity, local actions and the same saved profile after loading.');
}finally{await browser.close()}
