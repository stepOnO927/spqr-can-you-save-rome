import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame,tick}=await import('/engine.js?v=faces-empire-2'),{sendLetter}=await import('/epistulae.js?v=epistulae-2'),s=newGame('caesar');sendLetter(s,{senderInstitution:'caesar',senderFaction:'caesar',recipient:'caesar',category:'government',subject:['Measured treasury note','实际国库简报'],body:['The treasury report is ready.','国库报告已备妥。'],options:['acknowledge']});tick(s);sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#mail-open').click();assert.match(await page.locator('.mailbox').innerText(),/Measured treasury note/);
 await page.locator('[data-mail-filter="government"]').click();assert.match(await page.locator('.mail-letter').innerText(),/The treasury report is ready/);
 await page.locator('[data-mail-reply="acknowledge"]').first().click();assert.match(await page.locator('.mail-letter').innerText(),/Replied/);
 await page.locator('#mail-close').click();await page.locator('#lang').click();await page.locator('#mail-open').click();assert.match(await page.locator('.mailbox').innerText(),/实际国库简报/);
 assert.deepEqual(errors,[]);console.log('Imperial mailbox opens, filters, replies and stays bilingual in the campaign UI.');
}finally{await browser.close()}
