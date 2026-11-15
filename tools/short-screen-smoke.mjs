import {chromium} from 'playwright';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [width,height] of [[640,360],[836,470],[1031,580]]){
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  for(const selector of ['#faction-choice','#campaign-difficulty','#start-campaign']){const r=await page.locator(selector).boundingBox();assert.ok(r&&r.y>=0&&r.y+r.height<=height,selector+' must fit without scrolling');const hit=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,{x:r.x+r.width/2,y:r.y+r.height/2});assert.equal(hit,selector.slice(1),selector+' must not be covered')}
  await page.locator('#faction-choice').selectOption('senate');await page.locator('#campaign-difficulty').selectOption('standard');await page.locator('#campaign-guide').uncheck();await page.locator('#start-campaign').tap();
  const step=page.locator('#step'),rect=await step.boundingBox();assert.ok(rect&&rect.y>=0&&rect.y+rect.height<=height,'Advance must fit in the viewport');const before=await page.locator('.map-toolbar h2').innerText();await step.tap();assert.notEqual(await page.locator('.map-toolbar h2').innerText(),before);assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
  await page.locator('[data-tab="government"]').tap();assert.equal(await page.locator('.inspector:not(.closed)').count(),1);await page.locator('#new').tap();await page.locator('[data-slot="save"]').tap();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.player,'senate');assert.equal(saved.difficulty,'standard');assert.deepEqual(errors,[]);console.log(width+'x'+height+' touch setup, advance and save passed');await page.close();
 }
}finally{await browser.close()}
