import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>{localStorage.setItem('spqr-han-lang','en');Date.now=()=>500});
 await page.goto((process.env.SPQR_URL||'http://127.0.0.1:5173')+'/han/',{waitUntil:'domcontentloaded'});
 await page.locator('#factionSelect').selectOption('han');await page.locator('#begin').click();
 for(let i=0;i<12;i++)await page.locator('#advance').click();
 await page.locator('#court-panel').click();await page.locator('[data-court-person="yu-dingguo"]').click();
 const profile=page.locator('.court-profile');
 assert.match(await profile.innerText(),/Campaign court allies\s+Liu Gengsheng/);
 assert.match(await profile.innerText(),/form a court alliance after serving together/);
 await page.locator('#save').click();await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#load').click();await page.locator('#court-panel').click();
 await page.locator('[data-court-person="yu-dingguo"]').click();
 assert.match(await profile.innerText(),/Campaign court allies\s+Liu Gengsheng/);
 await page.locator('#lang').click();
 assert.match(await profile.innerText(),/本局朝廷盟友\s+刘更生/);
 assert.deepEqual(errors,[]);
 console.log('Han ministers form a consequential court alliance that remains visible after save/load in both languages.');
}finally{await browser.close()}
