import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const e=await import('/engine.js?v=cursus-portraits-1'),s=e.newGame('caesar');s.world.characters.caesar.health='dying';s.wars=[];sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="caesar"]').click();
 assert.match(await page.locator('#command-detail').innerText(),/临时代行|临时指挥/);
 await page.locator('#succession-choice').selectOption('lepidus');await page.locator('#succession-plan').click();await page.locator('#succession-feedback button').click();assert.match(await page.locator('#command-detail').innerText(),/当前安排：马尔库斯·埃米利乌斯·雷必达/);
 await page.locator('#acting-deputy').selectOption('lepidus');await page.locator('#deputy-choose').click();await page.locator('#deputy-feedback button').click();
 await page.locator('#save').click();let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(s.world.successionPlans.caesar,'lepidus');assert.equal(s.world.appointments.caesar,'lepidus');assert.deepEqual(s.world.leadership.caesar,['caesar']);
 await page.locator('#load').click();await page.locator('#save').click();s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(s.world.successionPlans.caesar,'lepidus');assert.equal(s.world.appointments.caesar,'lepidus');
 for(let i=0;i<48&&s.world.characters.caesar.alive;i++){await page.locator('#advance').click();await page.locator('#save').click();s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')))}
 assert.equal(s.world.characters.caesar.alive,false,'the fixture must reach its simulated death');assert.deepEqual(s.world.leadership.caesar,['lepidus']);const change=s.chronicle.entries.find(e=>e.kind==='government'&&e.change==='leadership');assert.ok(change);assert.equal(change.priority,'critical');
 await page.locator('#chronicle').click();assert.match(await page.locator('#command-detail').innerText(),/本方领导由.*凯撒.*雷必达/);await page.locator('#factions').click();await page.locator('[data-faction="caesar"]').click();assert.match(await page.locator('#command-detail').innerText(),/马尔库斯·埃米利乌斯·雷必达/);
 assert.deepEqual(errors,[]);console.log('Illness, acting authority, designated successor, save/load and simulated succession work through the player interface.');
}finally{await browser.close()}
