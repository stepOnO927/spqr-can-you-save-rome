import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const ids=await page.evaluate(async()=>{const {newGame,upgradeSave}=await import('/engine.js?v=born-portraits-eleven-1'),{createFictionalPerson}=await import('/dynasties.js?v=born-portraits-eleven-1'),{addReport}=await import('/character-system.js?v=born-portraits-eleven-1');let s=newGame('caesar');
  const leader=createFictionalPerson(s,{name:['Reported leader','报告领袖'],faction:'egypt',birthYear:-75}),governor=createFictionalPerson(s,{name:['First name','首份姓名'],faction:'senate',birthYear:-75});addReport(s,'caesar','egypt',{kind:'leaders',leaders:[leader],source:'spy'});addReport(s,'caesar','senate',{kind:'office_theater:roma',value:governor,source:'spy'});
  s.world.dynasties.catalog[governor].name=['Second name','第二份姓名'];s=upgradeSave(structuredClone(s));s.month++;addReport(s,'caesar','senate',{kind:'office_theater:roma',value:governor,source:'envoy'});s.world.dynasties.catalog[leader].name=['Secret leader','秘密领袖'];s.world.dynasties.catalog[governor].name=['Secret governor','秘密行政官'];s=upgradeSave(structuredClone(s));
  sessionStorage.setItem('privacy-fixture',JSON.stringify(s));sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return {leader,governor};
 });
 await page.reload();await page.locator('[data-tab="chessboard"]').click();assert.match(await page.locator('.chessboard').innerText(),/报告领袖/);assert.doesNotMatch(await page.locator('.chessboard').innerText(),/秘密领袖|秘密行政官/);
 await page.evaluate(()=>sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:JSON.parse(sessionStorage.getItem('privacy-fixture'))})));await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('[data-city="ROMA"]').click({force:true});
 const reports=page.locator('#local-governor');assert.match(await reports.innerText(),/首份姓名/);assert.match(await reports.innerText(),/第二份姓名/);assert.doesNotMatch(await reports.innerText(),/秘密行政官/);const buttons=reports.locator(`[data-reported-governor="${ids.governor}"]`);assert.equal(await buttons.count(),2);await buttons.nth(1).click();assert.match(await page.locator('#command-detail').innerText(),/首份姓名/);assert.match(await page.locator('#command-detail').innerText(),/游戏健康\s+未知/);assert.doesNotMatch(await page.locator('#command-detail').innerText(),/秘密行政官/);
 await page.locator('#save').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.knowledge.caesar.senate.reports.filter(r=>r.kind==='office_theater:roma').length,2);assert.deepEqual(errors,[]);console.log('Strategy board and each governor report retain their own observed names after hidden renames.');
}finally{await browser.close()}
