import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 for(const view of ['atlas','campaign']){
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  const id=await page.evaluate(async view=>{const {newGame}=await import('/engine.js?v=office-intel-privacy-1'),{initializeCursus}=await import('/cursus-honorum.js?v=office-intel-privacy-1'),s=newGame('caesar'),c=initializeCursus(s),id=c.senators.find(x=>x.faction==='caesar').id;for(const key of ['caesar','antony','lepidus']){s.world.characters[key].alive=false;s.world.characters[key].health='deceased'}s.world.leadership.caesar=[];s.factions.caesar.treasury=100;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:view,state:s}));return id},view);
  if(view==='atlas'){
   await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="caesar"]').click();
   await page.locator('#vacant-leader').selectOption(id);assert.match(await page.locator('#command-detail').innerText(),/补任罗马指挥职位/);await page.locator('#vacant-appoint').click();await page.locator('#vacant-feedback button').click();
   await page.locator('#save').click();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.deepEqual(saved.world.leadership.caesar,[id]);assert.equal(saved.factions.caesar.treasury,95);
   await page.locator('#load').click();await page.locator('#factions').click();await page.locator('[data-faction="caesar"]').click();assert.equal(await page.locator('#vacant-appoint').count(),0);
  }else{
   await page.reload();await page.locator('[data-tab="government"]').click();const box=page.locator('.genealogy');await box.locator('[data-vacant-person]').selectOption(id);await box.locator('[data-vacant-appoint]').click();assert.equal(await page.locator('[data-vacant-appoint]').count(),0);
   await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.deepEqual(saved.world.leadership.caesar,[id]);assert.equal(saved.factions.caesar.treasury,95);
  }
 }
 assert.deepEqual(errors,[]);console.log('Roman command vacancies can be filled and saved in both campaign views.');
}finally{await browser.close()}
