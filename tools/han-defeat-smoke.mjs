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
 await page.locator('#save').click();
 await page.evaluate(()=>{const key='spqr-han-save-browser',s=JSON.parse(localStorage.getItem(key));s.armies=s.armies.filter(a=>a.owner!=='han');s.wars=[['han','zhizhi']];localStorage.setItem(key,JSON.stringify(s))});
 await page.locator('#load').click();
 await page.locator('#advance').click();assert.match(await page.locator('#chronicle').innerText(),/No field army remains/);
 for(let i=0;i<5;i++)await page.locator('#advance').click();
 assert.match(await page.locator('.campaign-defeat').innerText(),/Campaign lost/);
 assert.match(await page.locator('.campaign-defeat').innerText(),/Six wartime months/);
 assert.equal(await page.locator('#advance').isDisabled(),true);
 const date=await page.locator('#campaignTitle').innerText();
 await page.locator('#save').click();await page.reload({waitUntil:'domcontentloaded'});await page.locator('#load').click();
 assert.equal(await page.locator('#campaignTitle').innerText(),date);
 assert.equal(await page.locator('#advance').isDisabled(),true);
 await page.locator('#lang').click();assert.match(await page.locator('.campaign-defeat').innerText(),/战役失败/);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#factionSelect').selectOption('han');await page.locator('#begin').click();await page.locator('#save').click();
 await page.evaluate(()=>{const key='spqr-han-save-browser',s=JSON.parse(localStorage.getItem(key));s.armies=s.armies.filter(a=>!(a.owner==='han'&&a.region==='dunhuang'));const invader=s.armies.find(a=>a.owner==='zhizhi');invader.region='dunhuang';invader.move=null;s.regions.find(r=>r.id==='dunhuang').fort=0;s.wars=[['han','zhizhi']];localStorage.setItem(key,JSON.stringify(s))});
 await page.locator('#load').click();await page.locator('#advance').click();
 assert.match(await page.locator('.territory-alert').innerText(),/Territory lost/);
 await page.locator('#lang').click();assert.match(await page.locator('.territory-alert').innerText(),/失地警报/);
 assert.equal(await page.locator('#advance').isDisabled(),false);
 assert.deepEqual(errors,[]);
 console.log('Han defeat browser smoke passed: army collapse, final summary, frozen date, save/load, both languages and territory-loss alert.');
}finally{await browser.close()}
