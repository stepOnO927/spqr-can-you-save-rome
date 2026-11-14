import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const e=await import('/engine.js?v=multipolar-courier-review-1'),m=await import('/epistulae.js?v=portraits-hundred-days-1'),s=e.newGame('caesar');e.diplomacy(s,'parthia','caesar','war');(s.inquiries||=[]).push({actor:'parthia',target:'caesar',subject:'peace',status:'awaiting_decision',duration:4,remaining:6,sentYear:s.year,sentMonth:s.month});s.month+=2;m.syncPeaceLetters(s);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});
 await page.reload();await page.locator('#mail-open').click();await page.locator('[data-mail-select]').filter({hasText:'议和提议'}).click();const letter=page.locator('.mail-letter');assert.match(await letter.innerText(),/寄出/);assert.match(await letter.innerText(),/收到/);await page.locator('[data-mail-reply="accept"]').click();assert.match(await letter.innerText(),/已回复/);
 await page.locator('#mail-close').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const s=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1'))),inquiry=s.inquiries.find(x=>x.actor==='parthia'&&x.subject==='peace'),reply=s.mail.messages.find(m=>m.id===inquiry.replyMailId);assert.equal(inquiry.phase,'return');assert.equal(reply.delivery,'traveling');assert.equal(reply.context.kind,'peace_reply');assert.ok(s.wars.some(w=>w.includes('caesar')&&w.includes('parthia')));assert.deepEqual(errors,[]);
 console.log('Peace mail shows sent and received dates and saves the authoritative reply courier.');
}finally{await browser.close()}
