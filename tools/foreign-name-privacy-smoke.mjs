import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 const id=await page.evaluate(async()=>{
  const {newGame,upgradeSave}=await import('/engine.js?v=dated-subject-names-1'),{createFictionalPerson}=await import('/dynasties.js?v=dated-subject-names-1'),{addReport}=await import('/character-system.js?v=dated-subject-names-1');
  let s=newGame('caesar');const id=createFictionalPerson(s,{name:['Reported name','报告姓名'],faction:'egypt',birthYear:-75,location:'egypt'});addReport(s,'caesar','egypt',{kind:'leaders',leaders:[id],source:'spy'});addReport(s,'caesar','egypt',{kind:'health',character:id,value:'healthy',source:'spy',peopleNames:{[id]:['Earlier name','旧报告姓名']}});addReport(s,'caesar','egypt',{kind:'health',character:id,value:'ill',source:'envoy',peopleNames:{}});s.world.dynasties.catalog[id].name=['Secret renamed','秘密改名'];s=upgradeSave(structuredClone(s));sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));return id;
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();
 const records=page.locator('#mission-records');const early=records.locator('[data-report-entry]').filter({hasText:'健康：旧报告姓名'}),legacy=records.locator('[data-report-entry]').filter({hasText:'健康：姓名未记录'});assert.equal(await early.count(),1);assert.equal(await legacy.count(),1);await early.locator(`[data-character="${id}"]`).click();assert.match(await page.locator('#selection-title').innerText(),/旧报告姓名/);await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();assert.match(await records.innerText(),/报告姓名/);assert.doesNotMatch(await page.locator('#command-detail').innerText(),/秘密改名/);
 await records.locator('[data-report-entry]').filter({hasText:'报告的领导人：报告姓名'}).locator(`[data-character="${id}"]`).click();assert.match(await page.locator('#command-detail').innerText(),/报告姓名/);assert.doesNotMatch(await page.locator('#command-detail').innerText(),/秘密改名/);
 await page.locator('#save').click();await page.locator('#load').click();await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();assert.match(await page.locator('#mission-records').innerText(),/报告姓名/);assert.match(await page.locator('#mission-records').innerText(),/旧报告姓名/);assert.match(await page.locator('#mission-records').innerText(),/健康：姓名未记录/);assert.doesNotMatch(await page.locator('#command-detail').innerText(),/秘密改名/);assert.deepEqual(errors,[]);
 console.log('Foreign intelligence and dossiers preserve delivered names across hidden renames and save/load.');
}finally{await browser.close()}
