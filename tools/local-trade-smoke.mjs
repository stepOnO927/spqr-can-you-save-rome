import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,...(process.env.SPQR_BROWSER_EXECUTABLE?{executablePath:process.env.SPQR_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
const base=`http://127.0.0.1:${process.env.SPQR_SMOKE_PORT||5173}`;
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=world-kings-guardian-1');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:newGame('caesar')}))});
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 const marker=page.locator('.city-marker[data-city="MASSILIA"]');await marker.waitFor({state:'visible'});await marker.evaluate(element=>element.click());
 const button=page.locator('#local-trade');assert.equal(await button.isDisabled(),false);await button.click();
 await page.locator('#advance').click();await page.locator('#advance').click();
 await marker.evaluate(element=>element.click());assert.match(await page.locator('#command-detail').innerText(),/Local trade compact: 24 months remain/);
 assert.match(await page.locator('#command-detail').innerText(),/Simulated local accounts 3\/-49/);
 await page.locator('#save').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1'))),city=saved.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='massilia');
 assert.equal(city.lastOutcome.proposal,'trade');assert.equal(city.lastOutcome.accepted,true);
 assert.equal(city.lastCivicBudget.month,3);assert.equal(city.lastCivicBudget.production,2);
 assert.deepEqual({food:city.food,treasury:city.treasury,trade:city.lastTrade?.food}, {food:10,treasury:23,trade:2});
 assert.equal(city.controller,'massilia');assert.equal(city.access.caesar,undefined);
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=world-kings-guardian-1');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:newGame('caesar')}))});
 await page.reload();await page.locator('#load').click();await marker.waitFor({state:'visible'});await marker.evaluate(element=>element.click());
 assert.match(await page.locator('#command-detail').innerText(),/Local trade compact: 24 months remain/);
 assert.deepEqual(errors,[]);
 console.log('A city-state trade compact transfers finite food for real treasury without changing passage or title, and survives save/load.');
 const generatedName=await page.evaluate(async()=>{const [{newGame},{configureStartingDifficulty}]=await Promise.all([import('/engine.js?v=world-kings-guardian-1'),import('/difficulty.js?v=world-kings-guardian-1')]);const state=configureStartingDifficulty(newGame('senate'),'expert',false,{localSeed:273}),city=state.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='generated:sicilia');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));return city.name[0]});
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 await page.locator(`[data-city="${generatedName.toUpperCase()}"]`).evaluate(element=>element.click());
 assert.match(await page.locator('#command-detail').innerText(),/Fictional campaign officials: steward/);
 await page.locator('#advance').click();await page.locator('#save').click();
 const generated=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')).regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id==='generated:sicilia'));
 assert.ok(generated.civicOfficers.steward.id&&generated.civicOfficers.captain.id);
 assert.ok(generated.lastCivicBudget.stewardBenefit>=0&&generated.lastCivicBudget.captainBenefit>=0);
 assert.deepEqual(errors,[]);
 console.log('A generated city shows named fictional officers whose fiscal effects persist in a browser save.');
}finally{await browser.close()}
