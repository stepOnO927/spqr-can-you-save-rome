import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true});
async function check(path,start,advance,save,confirmation){
  const context=await browser.newContext({viewport:{width:1024,height:768}});
  await context.addInitScript(()=>{
    for(const name of ['localStorage','sessionStorage'])
      Object.defineProperty(window,name,{configurable:true,get(){throw new DOMException('Storage denied','SecurityError')}});
  });
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto((process.env.SPQR_TEST_URL||'http://127.0.0.1:5173')+path,{waitUntil:'domcontentloaded',timeout:30000});
  const storageNotice=page.locator('#storage-warning');if(await storageNotice.count())await storageNotice.locator('button').click();
  await page.locator(start).click({timeout:15000});
  assert.equal(await page.locator(start).count()===0||await page.locator(start).isHidden(),true,path+' did not start');
  await page.locator(advance).click({timeout:15000});
  if(path==='/')await page.locator('#new').click({timeout:15000});
  await page.locator(save).click({timeout:15000});
  assert.match(await page.locator(confirmation).textContent(),/session|会话/i,path+' did not explain temporary save');
  assert.deepEqual(errors,[],path+' browser errors');
  await context.close();
}
try{
  await check('/','#start-campaign','#step','[data-slot="save"]','.toast');
  await check('/han/','#begin','#advance','#save','#message');
  await check('/map-lab/','#start-game','#advance','#save','#status');
  console.log('Roman, Han and atlas continue without browser storage; temporary saves are labeled');
}finally{await browser.close()}
