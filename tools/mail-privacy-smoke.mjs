import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=frontier-response-1'),{sendLetter}=await import('/epistulae.js?v=portraits-hundred-days-1'),s=newGame('caesar');
  const send=(from,to,thread,body)=>sendLetter(s,{senderInstitution:from,senderFaction:from,recipient:to,threadId:thread,category:'diplomatic',subject:['Notice','来信'],body:[body,body],options:['accept','reject'],context:{kind:'treaty',treatyType:'non_aggression'}}).letter;
  const visible=send('senate','caesar',null,'VISIBLE_MESSAGE');visible.delivery='received';
  const hidden=send('egypt','caesar',visible.threadId,'SECRET_IN_TRANSIT');hidden.senderName=['HIDDEN_SENDER','隐藏发件人'];
  const sent=send('caesar','egypt',null,'OUTGOING_MESSAGE');sent.delivery='received';sent.responses.push({choice:'accept',ai:true,resolved:false,arrival:s.year*12+s.month+3});
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#atlas-mail').click();
 await page.locator('.mailbox').waitFor();let text=await page.locator('.mailbox').innerText();
 assert.match(text,/VISIBLE_MESSAGE/);assert.doesNotMatch(text,/SECRET_IN_TRANSIT|隐藏发件人/);
 assert.doesNotMatch(await page.locator('#mail-sender').innerText(),/隐藏发件人/);
 await page.locator('[data-mail-filter="sent"]').click();text=await page.locator('.mailbox').innerText();
 assert.match(text,/OUTGOING_MESSAGE/);assert.match(text,/已寄出/);assert.doesNotMatch(text,/接受协定/);
 await page.locator('#mail-close').click();assert.equal(await page.locator('.mailbox').count(),0);assert.deepEqual(errors,[]);
 console.log('Atlas opens the real mailbox; undelivered contents and unknown responses stay hidden.');
}finally{await browser.close()}
