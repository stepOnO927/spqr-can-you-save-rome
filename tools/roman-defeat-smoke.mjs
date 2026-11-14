import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.locator('#faction-choice').selectOption('caesar');
 await page.locator('#campaign-guide').uncheck();
 await page.locator('#start-campaign').click();
 await page.locator('#new').click();
 await page.locator('[data-slot="save"]').click();
 await page.evaluate(()=>{
  const key='spqr-save-1',s=JSON.parse(localStorage.getItem(key));
  s.armies=s.armies.filter(a=>a.owner!=='caesar');
  localStorage.setItem(key,JSON.stringify(s));
 });
 await page.locator('#new').click();
 await page.locator('[data-slot="load"]').click();
 await page.locator('#step').click();
 assert.match(await page.locator('.victory-progress').innerText(),/NO FIELD ARMY/);
 for(let i=0;i<2;i++)await page.locator('#step').click();
 assert.match(await page.locator('.victory-progress').innerText(),/NO FIELD ARMY/);
 assert.equal(await page.locator('#step').isDisabled(),false);
 await page.locator('#step').click();
 assert.match(await page.locator('.victory-progress').innerText(),/CAMPAIGN DEFEAT/);
 assert.equal(await page.locator('#step').isDisabled(),true);
 const date=await page.locator('.map-toolbar h2').innerText();
 await page.locator('#new').click();
 await page.locator('[data-slot="save"]').click();
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-slot="load"]').click();
 assert.equal(await page.locator('.map-toolbar h2').innerText(),date);
 assert.equal(await page.locator('#step').isDisabled(),true);
 await page.locator('#lang').click();
 assert.match(await page.locator('.victory-progress').innerText(),/战役失败/);
 await page.locator('[data-tab="legacy"]').click();
 await page.locator('#finalize-campaign').click();
 assert.match(await page.locator('.legacy-entry').first().innerText(),/战败/);
 assert.equal(await page.locator('#finalize-campaign').count(),0);
 assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-legacy-archive')).at(0).defeat),true);
 assert.deepEqual(errors,[]);
 console.log('Roman defeat browser smoke passed: recovery deadline, defeat, frozen date, save/load and Legacy archive.');
}finally{await browser.close()}
