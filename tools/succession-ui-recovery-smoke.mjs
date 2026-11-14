import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const child=await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=multipolar-courier-review-1'),{createFictionalPerson}=await import('/dynasties.js?v=portraits-hundred-days-1'),s=newGame('caesar');s.world.romanRegimes={caesar:'roman_principate'};s.wars=[];s.factions.caesar.treasury=100;const id=createFictionalPerson(s,{name:['Fictional child','虚构继任子女'],faction:'caesar',birthYear:s.year-8,parents:['caesar'],location:'cisalpine',sex:'female'});sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));return id});
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="caesar"]').click();
 await page.locator('#succession-choice').selectOption(child);assert.equal(await page.locator('#succession-support').isDisabled(),true);await page.locator('#succession-choice').selectOption('lepidus');assert.equal(await page.locator('#succession-support').isEnabled(),true);
 await page.locator('#succession-choice').selectOption(child);await page.locator('#succession-plan').click();await page.locator('#succession-feedback button').click();assert.match(await page.locator('#command-detail').innerText(),/当前安排：虚构继任子女/);
 await page.locator('#save').click();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.world.successionPlans.caesar,child);assert.equal(saved.factions.caesar.treasury,95);
 await page.evaluate(async()=>{const s=JSON.parse(localStorage.getItem('spqr-save-1')),{assignSuccession}=await import('/characters.js?v=succession-ui-recovery-1');s.world.characters.caesar.alive=false;s.world.characters.caesar.health='deceased';assignSuccession(s,'caesar');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.reload();await page.locator('#factions').click();await page.locator('[data-faction="caesar"]').click();assert.match(await page.locator('#command-detail').innerText(),/虚构继任子女/);assert.match(await page.locator('#command-detail').innerText(),/摄政|临时代行/);
 await page.locator('#save').click();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.deepEqual(saved.world.leadership.caesar,[child]);assert.equal(saved.world.successionPlans.caesar,undefined);await page.locator('#load').click();
 for(const vacant of [false,true]){
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.evaluate(async vacant=>{const {newGame}=await import('/engine.js?v=multipolar-courier-review-1'),{planSuccession}=await import('/governance.js?v=portraits-hundred-days-1'),s=newGame('caesar');s.factions.caesar.treasury=100;planSuccession(s,'lepidus');s.world.characters.lepidus.alive=false;s.world.characters.antony.alive=false;if(vacant){s.world.characters.caesar.alive=false;s.world.successionPlans.caesar='fictional:999'}sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))},vacant);
  await page.reload();await page.locator('[data-tab="government"]').click();const box=page.locator('.genealogy');assert.match(await box.innerText(),/已失效或存在争议/);if(vacant){assert.match(await box.innerText(),/身份未记录的人物/);assert.doesNotMatch(await box.innerText(),/fictional:999/)}
  assert.equal(await box.locator('[data-succession-plan]').isDisabled(),true);await box.locator('[data-succession-withdraw]').click();assert.equal(await box.locator('[data-succession-withdraw]').count(),0);
  await page.locator('#new').click();await page.locator('[data-slot="save"]').click();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.world.successionPlans.caesar,undefined);assert.equal(saved.factions.caesar.treasury,95);
 }
 assert.deepEqual(errors,[]);console.log('Child designation, regency, consumed plans and withdrawal of invalid plans work in both views.');
}finally{await browser.close()}
