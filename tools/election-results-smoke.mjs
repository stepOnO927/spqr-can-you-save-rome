import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=missing-fate-privacy-1'),{initializeCursus}=await import('/cursus-honorum.js?v=missing-fate-privacy-1');const s=newGame('senate');s.month=9;s.wars=[];s.difficulty='travel';s.factions.senate.treasury=300;initializeCursus(s).selectedOffice={senate:'dictator'};sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();
 assert.equal(await page.locator('[data-cursus-office] option[value="dictator"]').count(),0);
 assert.equal(await page.locator('[data-cursus-office]').inputValue(),'consul','old saves with an invalid office fall back safely');
 await page.locator('.cursus-candidate').first().locator('[data-cursus-action="support"]').click();
 await page.locator('#advance').click();await page.locator('[data-cursus-office]').selectOption('praetor');
 assert.equal((await page.locator('.cursus-election').innerText()).trim(),'','praetor must not show the consul result');
 await page.locator('#save').click();await page.locator('#load').click();await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();
 assert.equal(await page.locator('[data-cursus-office]').inputValue(),'praetor');await page.locator('#advance').click();
 assert.match(await page.locator('.cursus-election').innerText(),/裁判官.*选举.*当选/);
 await page.locator('[data-cursus-office]').selectOption('consul');assert.match(await page.locator('.cursus-election').innerText(),/执政官.*选举.*当选/);
 await page.locator('[data-cursus-office]').selectOption('quaestor');assert.equal((await page.locator('.cursus-election').innerText()).trim(),'');
 await page.locator('#advance').click();assert.match(await page.locator('.cursus-election').innerText(),/财务官.*选举.*当选/);
 await page.locator('#save').click();let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1'))),e=s.world.cursus.elections.find(x=>x.office==='quaestor'&&x.year===s.year);
 assert.ok(e.elected.length>0);assert.ok(s.world.cursus.pendingTerms.some(t=>t.office==='quaestor'&&e.elected.includes(t.id)));
 await page.locator('#advance').click();await page.locator('#save').click();s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.ok(s.world.cursus.magistrates.quaestor.some(t=>e.elected.includes(t.id)),'elected quaestor takes office');
 await page.locator('#load').click();await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();assert.match(await page.locator('.cursus-election').innerText(),/财务官.*选举.*当选/);
 assert.deepEqual(errors,[]);console.log('Election results follow the chosen office through election, succession and save/load.');
}finally{await browser.close()}
