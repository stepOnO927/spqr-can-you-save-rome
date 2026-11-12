import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-han-lang','en'));
 await page.goto(base+'/han/',{waitUntil:'domcontentloaded'});
 await page.locator('#factionSelect').selectOption('kangju');await page.locator('#begin').click();
 const card=page.locator('.ruler-card');
 assert.match(await card.innerText(),/King of Kangju/);
 assert.match(await card.innerText(),/personal name is unrecorded/);
 assert.equal(await card.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 await page.locator('#save').click();
 await page.evaluate(()=>{const key='spqr-han-save-browser',s=JSON.parse(localStorage.getItem(key));s.persons[s.rulers.kangju.personId].alive=false;s.persons[s.rulers.kangju.personId].death=s.year;localStorage.setItem(key,JSON.stringify(s))});
 await page.locator('#load').click();await page.locator('#advance').click();
 assert.match(await card.innerText(),/Original campaign character/);
 assert.match(await card.innerText(),/(Father|Predecessor): King of Kangju/);
 assert.equal(await card.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
 const name=await card.getAttribute('data-ruler');
 await page.locator('#save').click();await page.reload({waitUntil:'domcontentloaded'});await page.locator('#load').click();
 assert.equal(await card.getAttribute('data-ruler'),name);
 await page.locator('#lang').click();assert.match(await card.innerText(),/本战役原创人物/);
 assert.deepEqual(errors,[]);
 console.log('Han ruler browser smoke passed: unknown opening ruler, succession, portrait, save/load and both languages.');
}finally{await browser.close()}
