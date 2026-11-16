import {chromium} from 'playwright';import assert from 'node:assert/strict';
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=reported-contact-1'),s=newGame('caesar');s.world.dynasties.seed=0;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});await page.reload();
 await page.locator('[data-tab="government"]').click();const genealogy=page.locator('.genealogy');assert.match(await genealogy.innerText(),/回信约需四个月，可能被拒或遗失/);
 await page.locator('[data-accord-contact]').selectOption({index:0});await page.locator('[data-accord-kind="pledge"]').click();assert.match(await genealogy.innerText(),/等待回信/);
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(s.world.dynasties.familyAccords[0].status,'pending');assert.equal(s.world.dynasties.familyAccords[0].courierSeed,0);
 for(let i=0;i<4;i++)await page.locator('#step').click();await page.locator('[data-tab="government"]').click();assert.match(await genealogy.innerText(),/未收到回信/);await page.locator('#new').click();await page.locator('[data-slot="save"]').click();s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(s.world.dynasties.familyAccords[0].status,'no_reply');assert.deepEqual(errors,[]);console.log('Family guarantee courier can be lost after a playable, saved delay.');
}finally{await browser.close()}
