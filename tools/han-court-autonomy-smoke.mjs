import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>{localStorage.setItem('spqr-han-lang','en');Date.now=()=>500});
 await page.goto((process.env.SPQR_URL||'http://127.0.0.1:5173')+'/han/',{waitUntil:'domcontentloaded'});
 await page.locator('#factionSelect').selectOption('han');await page.locator('#begin').click();
 for(let i=0;i<17;i++)await page.locator('#advance').click();
 await page.locator('#court-panel').click();await page.locator('[data-court-person="zhou-kan"]').click();
 await page.locator('#court-office').selectOption('yushi');await page.locator('#court-appoint').click();
 assert.match(await page.locator('#message').innerText(),/Appointment made/);
 await page.locator('#advance').click();await page.locator('[data-court-person="shi-gao"]').click();
 const profile=page.locator('.court-profile');
 assert.match(await profile.innerText(),/requests an investigation of Shi Gao/);
 await page.locator('#save').click();await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#load').click();await page.locator('#court-panel').click();
 await page.locator('[data-court-person="shi-gao"]').click();
 assert.match(await profile.innerText(),/requests an investigation of Shi Gao/);
 await page.locator('#lang').click();assert.match(await profile.innerText(),/提请稽查/);
 assert.deepEqual(errors,[]);
 console.log('The Han censor autonomously begins a saved, bilingual investigation after appointment.');
}finally{await browser.close()}
