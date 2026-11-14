import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=peace-mail-courier-1'),{sendLetter}=await import('/epistulae.js?v=peace-mail-courier-1'),s=newGame('caesar');s.wars=[];s.mail.preferences.pauseCritical=false;
  for(const army of s.armies){army.move=null;army.siege=null}
  const urgent=sendLetter(s,{senderInstitution:'caesar',senderFaction:'caesar',recipient:'caesar',category:'government',priority:'critical',subject:['TEST URGENT','测试紧急来信'],body:['Message received','书信已送达']}).letter;urgent.arrival=s.year*12+s.month+1;
  const future=sendLetter(s,{senderInstitution:'egypt',senderFaction:'egypt',recipient:'caesar',category:'diplomatic',subject:['SECRET FUTURE','尚未送达的秘密'],body:['Not yet received','未送达']}).letter;future.arrival=s.year*12+s.month+10;
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));
 });
 await page.reload();await page.locator('#mail-open').click();await page.locator('#mail-pause').check();await page.locator('#mail-close').click();await page.locator('#open-atlas').click();await page.locator('#atlas-mail').waitFor();
 assert.match(await page.locator('#atlas-mail').getAttribute('aria-label'),/0封未读/);
 await page.locator('#play-time').click();await page.waitForFunction(()=>document.querySelector('#atlas-mail')?.textContent.includes('· 1'),null,{timeout:20000});
 assert.match(await page.locator('#status').innerText(),/紧急来信已送达/);assert.equal(await page.locator('#play-time').innerText(),'开始');
 const date=await page.locator('#turn-date').innerText();await page.waitForTimeout(2300);assert.equal(await page.locator('#turn-date').innerText(),date,'critical mail must stop automatic time');
 await page.locator('#atlas-mail').click();await page.locator('.mailbox').waitFor();const mailbox=await page.locator('.mailbox').innerText();assert.match(mailbox,/测试紧急来信/);assert.doesNotMatch(mailbox,/尚未送达的秘密/);assert.deepEqual(errors,[]);
 for(const archive of [false,true]){
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.evaluate(async archive=>{const {newGame}=await import('/engine.js?v=peace-mail-courier-1'),{sendLetter}=await import('/epistulae.js?v=peace-mail-courier-1'),s=newGame('caesar');s.wars=[];s.mail.preferences.muteRoutine=true;s.mail.preferences.autoArchiveRoutine=archive;for(const a of s.armies){a.move=null;a.siege=null}const m=sendLetter(s,{senderInstitution:'caesar',senderFaction:'caesar',recipient:'caesar',category:'government',priority:'routine',subject:['Routine','普通来信'],body:['Routine','普通来信']}).letter;m.arrival=s.year*12+s.month+1;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))},archive);
  await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#advance').click();
  assert.match(await page.locator('#atlas-mail').getAttribute('aria-label'),archive?/0封未读/:/1封未读/);assert.doesNotMatch(await page.locator('#status').innerText(),/新来信已送达/);
  if(!archive){await page.setViewportSize({width:390,height:844});await page.locator('#compact-menu-toggle').waitFor({state:'visible'});assert.match(await page.locator('#compact-menu-toggle').innerText(),/· 1/);await page.locator('#compact-menu-toggle').click();assert.equal(await page.locator('#atlas-mail').isVisible(),true);await page.setViewportSize({width:1600,height:1000})}
 }
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=peace-mail-courier-1'),{sendLetter}=await import('/epistulae.js?v=peace-mail-courier-1'),s=newGame('caesar');s.wars=[];s.mail.preferences.pauseCritical=false;for(const a of s.armies){a.move=null;a.siege=null}const m=sendLetter(s,{senderInstitution:'caesar',senderFaction:'caesar',recipient:'caesar',category:'government',priority:'critical',subject:['Urgent','紧急'],body:['Urgent','紧急']}).letter;m.arrival=s.year*12+s.month+1;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await page.locator('#play-time').click();await page.waitForFunction(()=>document.querySelector('#atlas-mail')?.textContent.includes('· 1'),null,{timeout:20000});assert.equal(await page.locator('#play-time').innerText(),'暂停','disabling critical-mail pause must leave time running');await page.locator('#play-time').click();
 console.log('Critical mail pauses the terrain map, shows an unread count, and opens the received message.');
}finally{await browser.close()}
