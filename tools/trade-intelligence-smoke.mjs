import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const e=await import('/engine.js?v=multipolar-courier-review-1'),c=await import('/character-system.js?v=portraits-hundred-days-1');
  const s=e.newGame('caesar');s.alliances.push(['caesar','numidia']);s.agreements.push({id:'test-trade',type:'trade',status:'active',parties:['caesar','parthia'],expiresAt:s.year*12+s.month+12});
  c.addReport(s,'parthia','egypt',{kind:'health',character:'ptolemy',value:'ill',source:'spy',confidence:'unverified'});
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();
 const options=await page.locator('#mission-ally option').evaluateAll(items=>items.map(x=>x.value));assert.ok(options.includes('parthia'));assert.match(await page.locator('#mission-ally option[value=parthia]').innerText(),/贸易伙伴/);assert.ok(options.includes('numidia'));assert.ok(!options.includes('egypt'));
 await page.locator('#mission-subject').selectOption('health');await page.locator('#mission-person').selectOption('ptolemy');await page.locator('#mission-ally').selectOption('parthia');
 await page.locator('[data-mission="exchange"]').click();assert.match(await page.locator('#mission-feedback').innerText(),/转交方：帕提亚/);await page.locator('#mission-feedback button').first().click();
 await page.locator('#save').click();let s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1'))),op=s.operations.find(x=>x.type==='exchange');assert.equal(op.partner,'parthia');assert.equal(op.subjectCharacter,'ptolemy');assert.equal(op.status,'pending');assert.equal(op.remaining,3);assert.ok(!s.knowledge.caesar.egypt.reports.some(r=>r.source==='exchange'));
 await page.locator('#advance').click();await page.locator('#save').click();s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));op=s.operations.find(x=>x.type==='exchange');assert.equal(op.status,'pending');assert.equal(op.remaining,2);assert.ok(!s.knowledge.caesar.egypt.reports.some(r=>r.source==='exchange'));
 await page.locator('#load').click();await page.locator('#save').click();s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(s.operations.find(x=>x.type==='exchange').remaining,2);
 await page.locator('#advance').click();await page.locator('#advance').click();await page.locator('#save').click();s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));op=s.operations.find(x=>x.type==='exchange');assert.ok(['complete','failed','declined'].includes(op.status));
 if(op.status==='complete'){const report=s.knowledge.caesar.egypt.reports.find(r=>r.source==='exchange');assert.equal(report.fromFaction,'parthia');assert.equal(report.character,'ptolemy');assert.equal(report.value,'ill');await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();assert.match(await page.locator('#mission-records').innerText(),/帕提亚/);assert.match(await page.locator('#mission-records').innerText(),/托勒密十三世/)}
 if(op.status==='declined'){await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();assert.match(await page.locator('#mission-records').innerText(),/被拒绝/)}
 assert.deepEqual(errors,[]);console.log(`Selected a trade partner, preserved the delayed request across save/load, and resolved it: ${op.status}.`);
}finally{await browser.close()}
