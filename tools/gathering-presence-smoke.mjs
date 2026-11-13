import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=gathering-presence-1'),{sendLetter}=await import('/epistulae.js?v=gathering-presence-1'),s=newGame('caesar'),host=s.world.characters['fictional:1'];s.wars=[];host.location=s.world.characters.caesar.location='cisalpine';const m=sendLetter(s,{senderId:host.id,senderFaction:'caesar',recipient:'caesar',category:'invitations',subject:['Gathering','聚会邀请'],body:['Please come','请出席'],options:['accept'],context:{kind:'banquet',leader:'caesar'}}).letter;m.delivery='received';sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});
 await page.reload();await page.locator('#mail-open').click();assert.match(await page.locator('.mailbox').innerText(),/不会自动移动人物/);await page.locator('[data-mail-reply="accept"]').click();assert.match(await page.locator('.mailbox').innerText(),/已回复/);await page.locator('#mail-close').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('spqr-save-1')),host=s.world.characters['fictional:1'];host.travel={destination:'gaul',legs:[{to:'gaul',months:4}],remaining:4};sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});
 await page.reload();await page.locator('#step').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.mail.events.find(e=>e.id.startsWith('invitation:')).status,'missed');assert.equal(saved.world.personalRelations['caesar:fictional:1'],undefined);
 await page.locator('#step').click();await page.locator('#mail-open').click();await page.locator('[data-mail-select]').filter({hasText:'宴会未能举行'}).click();assert.match(await page.locator('.mail-letter').innerText(),/未能在约定地点会面/);assert.deepEqual(errors,[]);
 console.log('Invitation explains travel, misses an absent participant, and delivers the result through the mailbox.');
}finally{await browser.close()}
