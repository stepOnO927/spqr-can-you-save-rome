import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-han-lang','en'));
 await page.goto(base+'/han/',{waitUntil:'domcontentloaded'});
 await page.locator('#factionSelect').selectOption('han');await page.locator('#begin').click();
 await page.locator('#court-panel').click();
 assert.equal(await page.locator('[data-court-person]').count(),5);
 assert.deepEqual(await page.locator('[data-court-person] img').evaluateAll(images=>images.map(image=>image.complete&&image.naturalWidth>0)),[true,true,true,true,true]);
 await page.locator('[data-court-person="shi-gao"]').click();
 const profile=page.locator('.court-profile');
 assert.match(await profile.innerText(),/Shi Gao/);
 assert.match(await profile.innerText(),/No current office/);
 assert.match(await profile.innerText(),/No finding/);
 assert.equal(await profile.locator('img').getAttribute('src'),'../assets/portraits/han-shi-gao-128.jpg');
 assert.equal((await profile.locator('img').evaluate(img=>img.naturalWidth))>0,true);
 await page.locator('#court-office').selectOption('dasinong');
 await page.locator('#court-appoint').click();
 assert.match(await page.locator('#message').innerText(),/Appointment made/);
 assert.match(await profile.innerText(),/Grand Minister of Agriculture/);
 await page.locator('#court-audit').click();
 assert.match(await page.locator('#message').innerText(),/Audit opened/);
 assert.equal(await page.locator('#court-audit').isDisabled(),true);
 await page.locator('[data-court-person="hong-gong"]').click();
 assert.equal(await page.locator('#court-office option[value="chengxiang"]').count(),0);
 await page.locator('#save').click();await page.reload({waitUntil:'domcontentloaded'});await page.locator('#load').click();await page.locator('#court-panel').click();
 await page.locator('[data-court-person="shi-gao"]').click();
 assert.match(await profile.innerText(),/Grand Minister of Agriculture/);
 assert.equal(await page.locator('#court-audit').isDisabled(),true);
 await page.locator('#lang').click();assert.match(await profile.innerText(),/史高/);
 assert.match(await profile.innerText(),/大司农/);
 assert.deepEqual(errors,[]);
 console.log('Han court browser smoke passed: five portraits, appointment, audit, save/load and both languages.');
}finally{await browser.close()}
