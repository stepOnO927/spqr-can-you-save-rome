import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-han-lang','en'));
 for(const [faction,label] of [['wusun','Wusun'],['huhanye','Xiongnu']]){
  await page.goto(base+'/han/',{waitUntil:'domcontentloaded'});
  await page.locator('#factionSelect').selectOption(faction);
  await page.locator('#begin').click();
  const banner=page.locator('#overview .realm-banner .faction-banner');
  await banner.waitFor({state:'visible'});
  assert.match(await page.locator('#overview .realm-banner').innerText(),new RegExp(label));
  const standard=page.locator('#map [data-army] .faction-standard').first();
  await standard.waitFor({state:'visible'});
  assert.equal(await standard.evaluate(el=>getComputedStyle(el).width),'15px');
  assert.equal(await page.locator('#map [data-army] .glyph').count(),0);
  const bannerColor=await banner.getAttribute('style');
  if(faction==='wusun')assert.match(bannerColor,/#3f6f6a/);
  else assert.match(bannerColor,/#77613d/);
  await page.locator('#lang').click();
  assert.match(await page.locator('#overview .realm-banner').innerText(),faction==='wusun'?/乌孙/:/匈奴/);
  assert.equal(await standard.count()>0,true);
  await page.locator('#save').click();
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('#load').click();
  assert.equal(await page.locator('#overview .realm-banner .faction-banner').getAttribute('style'),bannerColor);
  assert.equal(await page.locator('#map [data-army] .faction-standard').count()>0,true);
 }
 assert.deepEqual(errors,[]);
 console.log('Eastern faction banners and army standards browser checks passed.');
}finally{await browser.close()}
