import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=guardian-age-1'),{requestPersonalMeeting,advancePersonalDiplomacy}=await import('/personal-diplomacy.js?v=guardian-age-1');const s=newGame('caesar');s.wars=[];s.relations['caesar:egypt']=26;s.world.characters['fictional:1'].location='egypt';s.world.intelSeed=1000;if(!requestPersonalMeeting(s,'fictional:1','cleopatra','egypt').ok)throw Error('meeting request unavailable');for(let i=0;i<2;i++){s.month++;advancePersonalDiplomacy(s)}if(s.meetings[0].status!=='met'||s.meetings[0].contactCredit!==1)throw Error('meeting fixture failed');sessionStorage.setItem('contact-credit-fixture',JSON.stringify(s))});
 for(const trust of [-100,100]){
  await page.evaluate(trust=>{const s=JSON.parse(sessionStorage.getItem('contact-credit-fixture'));s.world.personalRelations['cleopatra:fictional:1'].trust=trust;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))},trust);
  await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="diplomacy"]').click();
  assert.match(await page.locator('#command-detail').innerText(),/个人联系加成：1/);assert.equal(await page.locator('[data-diplomacy="alliance"]').isEnabled(),true);
  await page.locator('#save').click();await page.locator('#load').click();await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="diplomacy"]').click();assert.match(await page.locator('#command-detail').innerText(),/个人联系加成：1/);
  await page.locator('[data-diplomacy="alliance"]').click();assert.match(await page.locator('#diplomacy-feedback').innerText(),/已寄出/);await page.locator('#save').click();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(s.world.agreementLetters[0].status,'pending');assert.equal(s.meetings[0].contactCredit,1);
 }
 assert.deepEqual(errors,[]);console.log('Diplomatic contact credit uses the recorded meeting across hidden trust changes and save/load; alliance proposals remain delayed.');
}finally{await browser.close()}
