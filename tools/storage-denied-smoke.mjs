import {chromium} from 'playwright';import assert from 'node:assert/strict';
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const view of ['campaign','atlas','han']){
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{configurable:true,get(){throw new DOMException('Storage denied','SecurityError')}})});
  await page.goto(base+'/'+(view==='campaign'?'':view==='atlas'?'map-lab/':'han/'),{waitUntil:'domcontentloaded'});
  const warning=page.locator('#storage-warning');await warning.waitFor();assert.match(await warning.innerText(),/进度.*关闭或刷新前|progress lasts only/i);assert.match(await warning.innerText(),/不能安全切换地图|switching maps is disabled/i);await warning.locator('button').click();
  if(view==='campaign'){
   await page.locator('#start-campaign').click();await page.locator('#step').click();await page.locator('#open-atlas').click();assert.match(await page.locator('body').innerText(),/无法切换|Could not transfer/);assert.equal(new URL(page.url()).pathname,'/');
   await page.locator('#new').click();await page.locator('[data-slot="save"]').click();assert.ok(await page.evaluate(()=>localStorage.getItem('spqr-save-1')));assert.match(await page.locator('body').innerText(),/暂存|Temporarily saved/);await page.locator('#save-transfer-open').click();const download=page.waitForEvent('download');await page.locator('#save-transfer-export').click();assert.match((await download).suggestedFilename(),/^spqr-saves-.*\.json$/);
  }
  if(view==='atlas'){await page.locator('#start-free').click();await page.locator('#advance').click();await page.locator('#save').click();assert.match(await page.locator('#status').innerText(),/暂存|Temporarily saved/);await page.locator('#return-campaign').click();assert.match(await page.locator('#status').innerText(),/无法切换|Could not transfer/);assert.match(new URL(page.url()).pathname,/map-lab/)}
  if(view==='han'){await page.locator('#begin').click();await page.locator('#advance').click();await page.locator('#save').click();assert.match(await page.locator('#message').innerText(),/暂存|Temporarily saved/)}
  assert.deepEqual(errors,[]);console.log(view+' playable with denied browser storage');await page.close();
 }
 const page=await browser.newPage({viewport:{width:1366,height:768}});await page.addInitScript(()=>Object.defineProperty(window,'sessionStorage',{configurable:true,get(){throw new DOMException('Session storage denied','SecurityError')}}));await page.goto(base+'/',{waitUntil:'domcontentloaded'});assert.match(await page.locator('#storage-warning').innerText(),/不能安全切换地图|switching maps is disabled/i);await page.locator('#storage-warning button').click();await page.locator('#start-campaign').click();await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const saved=await page.evaluate(()=>localStorage.getItem('spqr-save-1'));assert.ok(saved);await page.reload({waitUntil:'domcontentloaded'});assert.equal(await page.evaluate(()=>localStorage.getItem('spqr-save-1')),saved);await page.close();console.log('Persistent saves remain intact when only session storage is denied');
}finally{await browser.close()}
