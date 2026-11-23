import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [width,height] of [[1366,768],[390,844]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width<700,isMobile:width<700});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.locator('#start-campaign').waitFor();
  await page.locator('#start-campaign').click();
  await page.locator('.victory-progress').waitFor({state:'attached'});
  if(width>700)await page.locator('#close-panel').click();
  const visual=await page.evaluate((widthForTest)=>({
   sheet:[...document.styleSheets].some(sheet=>sheet.href?.includes('imperium-visual.css')),
   background:getComputedStyle(document.body).backgroundColor,
   overflow:document.documentElement.scrollWidth>innerWidth,
   progress:(()=>{const r=document.querySelector(widthForTest>700?'.victory-progress':'#campaign-progress').getBoundingClientRect();return r.width>0&&r.height>0&&r.left>=0&&r.right<=innerWidth})(),
   map:(()=>{const r=document.querySelector('.map-wrap').getBoundingClientRect();return r.width>0&&r.height>0})()
  }),width);
  assert.equal(visual.sheet,true,'visual stylesheet must load');
  assert.notEqual(visual.background,'rgb(21, 27, 27)','campaign must use the new basalt theme');
  assert.equal(visual.overflow,false,'campaign must not scroll horizontally');
  assert.equal(visual.progress,true,'victory progress must remain visible');
  assert.equal(visual.map,true,'map must retain an operable area');
  await page.locator('[data-tab="government"]').click();
  await page.locator('.inspector:not(.closed)').waitFor();
  await page.locator('[data-tab="map"]').click();
  const previous=await page.locator('.map-toolbar h2').innerText();
  await page.locator('#step').click();
  assert.notEqual(await page.locator('.map-toolbar h2').innerText(),previous,'advance month must still work');
  assert.deepEqual(errors,[],'visual update must not cause browser errors');
  console.log(`Imperium visual ${width}x${height} passed`);
  await page.close();
 }
}finally{await browser.close()}
