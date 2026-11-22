import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const chosen=await page.evaluate(async()=>{const {newGame,tick}=await import('/engine.js?v=observed-identity-1'),{proposeAgreement}=await import('/agreements.js?v=observed-identity-1'),{queueMission}=await import('/character-system.js?v=observed-identity-1');
  function fixture(seed){const s=newGame('caesar');s.difficulty='beginner';s.wars=[];s.relations['egypt:parthia']=60;s.world.intelSeed=seed;proposeAgreement(s,'egypt','parthia','defensive',{secret:true});return s}
  for(let i=1;i<=80;i++){const seed=(i*99173)>>>0,s=fixture(seed);if(!queueMission(s,'caesar','egypt','spy','secret_treaty').ok)continue;for(let n=0;n<4;n++)tick(s);if(s.knowledge.caesar.egypt.reports.some(r=>r.kind==='secret_treaty'&&r.value==='parthia')){sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:fixture(seed)}));return seed}}return null;
 });assert.ok(chosen,'no deterministic successful investigation found');
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();
 await page.locator('#mission-subject').selectOption('secret_treaty');await page.locator('[data-mission="spy"]').click();await page.locator('#mission-feedback button').first().click();assert.match(await page.locator('#mission-feedback').innerText(),/行动已派出/);
 await page.locator('#save').click();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.operations[0].remaining,4);assert.ok(!saved.knowledge.caesar.egypt.reports.some(r=>r.kind==='secret_treaty'));
 await page.locator('#load').click();for(let i=0;i<4;i++)await page.locator('#advance').click();await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();assert.match(await page.locator('#mission-records').innerText(),/秘密协议线索：帕提亚/);
 await page.locator('#return-campaign').click();await page.waitForURL('**/');await page.locator('[data-tab="chessboard"]').click();await page.locator('[data-board-view="power"]').click();await page.locator('[data-board-node="f:egypt"]').first().click();assert.match(await page.locator('.board-evidence').innerText(),/秘密协议报告/);assert.equal(await page.locator('.kind-secret_treaty').count(),1);assert.deepEqual(errors,[]);
 console.log('A paid spy discovers a dated secret-agreement lead after four months; the power network shows only the reported link.');
}finally{await browser.close()}
