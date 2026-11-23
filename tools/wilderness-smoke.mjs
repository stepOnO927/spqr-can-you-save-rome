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
  const {newGame}=await import('/engine.js?v=official-inquiries-1');
  const {configureStartingDifficulty}=await import('/difficulty.js?v=official-inquiries-1');
  const state=configureStartingDifficulty(newGame('senate'),'expert',false,{localSeed:1});state.wars=[];
  const site=state.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='generated-wilderness:hispaniaN');
  if(!site||state.localDiscovery.senate[site.id]?.level<3)throw Error('wilderness not known');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
  return site.name[0].toUpperCase();
 });
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 const marker=page.locator(`.city-marker[data-city="${name}"]`);await marker.waitFor({state:'visible'});
 await marker.evaluate(element=>element.click());
 const initial=await page.locator('#command-detail').innerText();
 assert.match(initial,/WILDERNESS/);assert.match(initial,/Classification/);assert.match(initial,/No field survey/);
 const survey=page.locator('#wilderness-survey');assert.equal(await survey.isDisabled(),false);await survey.click();
 assert.match(await page.locator('#command-detail').innerText(),/Field survey needs 2 more/);
 await page.locator('#save').click();await page.locator('#load').click();
 await marker.evaluate(element=>element.click());assert.match(await page.locator('#command-detail').innerText(),/Field survey needs 2 more/);
 await page.locator('#advance').click();await page.locator('#advance').click();await page.locator('#save').click();
 const state=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 const site=state.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='generated-wilderness:hispaniaN');
 assert.ok(site.wilderness.surveyedBy.senate);assert.equal(site.controller,null);assert.equal(site.legalSovereign,'senate');
 await marker.evaluate(element=>element.click());
 const after=await page.locator('#command-detail').innerText();assert.match(after,/Surveyed by us/);assert.match(after,/OUTPOST|FOOTHOLD|CAMP/i);
 assert.deepEqual(errors,[]);
 console.log('Built Map Lab opens a wilderness site, funds a survey, preserves it through save/load, completes it after two months and offers a limited foothold without annexation.');
}finally{await browser.close()}
