import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const view of ['campaign','atlas','han']){
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/'+(view==='campaign'?'':view==='atlas'?'map-lab/':'han/'),{waitUntil:'domcontentloaded'});
  if(view==='campaign'){await page.locator('.setup-advanced').evaluate(el=>el.open=true);await page.locator('#campaign-guide').uncheck();await page.locator('#start-campaign').click();await page.locator('#step').click()}
  if(view==='atlas'){await page.locator('#start-free').click();await page.locator('#advance').click()}
  if(view==='han'){await page.locator('#begin').click();await page.locator('#advance').click()}
  const trigger=page.locator('#save-transfer-open');await trigger.click();assert.equal(await page.locator('#save-transfer-dialog').evaluate(d=>d.open),true);await page.locator('.transfer-close').click();
  assert.deepEqual(errors,[]);console.log(view+' save transfer and time controls passed');await page.close();
 }
 const small=await browser.newPage({viewport:{width:640,height:360}});await small.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});await small.locator('#start-free').click();await small.locator('#compact-menu-toggle').click();await small.locator('#save-transfer-open').click();assert.equal(await small.locator('#save-transfer-dialog').evaluate(d=>d.open),true);await small.close();console.log('atlas compact save transfer passed');
}finally{await browser.close()}
