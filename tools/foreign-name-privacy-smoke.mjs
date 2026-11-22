import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const id=await page.evaluate(async()=>{
  const {newGame,upgradeSave}=await import('/engine.js?v=marriage-economy-merge-1'),{createFictionalPerson}=await import('/dynasties.js?v=marriage-economy-merge-1'),{addReport}=await import('/character-system.js?v=marriage-economy-merge-1');
  let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Reported name','报告姓名'],faction:'egypt',birthYear:-75,location:'egypt'});addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'spy'});s.world.dynasties.catalog[id].name=['Secret renamed','秘密改名'];s=upgradeSave(structuredClone(s));sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));return id;
 });
 await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();
 const records=page.locator('#mission-records');assert.match(await records.innerText(),/报告姓名/);assert.doesNotMatch(await page.locator('#command-detail').innerText(),/秘密改名/);
 await records.locator(`[data-character="${id}"]`).first().click();assert.match(await page.locator('#command-detail').innerText(),/报告姓名/);assert.doesNotMatch(await page.locator('#command-detail').innerText(),/秘密改名/);
 await page.locator('#save').click();await page.locator('#load').click();await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();assert.match(await page.locator('#mission-records').innerText(),/报告姓名/);assert.doesNotMatch(await page.locator('#command-detail').innerText(),/秘密改名/);assert.deepEqual(errors,[]);
 console.log('Foreign intelligence and dossiers preserve delivered names across hidden renames and save/load.');
}finally{await browser.close()}
