import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const side of ['caesar','senate']){
  const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.locator('.setup-panel').waitFor();
  await page.locator('.setup-advanced').evaluate(el=>el.open=true);await page.locator('#faction-choice').selectOption(side);await page.locator('#start-campaign').click();
  const guide=page.locator('.experience-lesson');assert.match(await guide.innerText(),/1\/8/);
  assert.equal(await page.locator('#region-choice').isVisible(),true);await page.locator('[data-experience-go="map"]').click();assert.match(await guide.innerText(),/1\/8/);
  await page.screenshot({path:`first-command-${side}-territory.png`});
  await page.locator('#region-choice').selectOption(side==='caesar'?'narbo':'roma');assert.match(await guide.innerText(),/2\/8/);
  await page.locator('[data-army="'+(side==='caesar'?'xiii':'italy')+'"]').first().click();assert.match(await guide.innerText(),/3\/8/);
  await page.screenshot({path:`first-command-${side}-army.png`});
  await page.locator('#inspect-supply').click();assert.match(await guide.innerText(),/4\/8/);
  await page.locator('#order').click();await page.locator('#march-destination').selectOption(side==='caesar'?'narbo':'roma');assert.match(await guide.innerText(),/5\/8/);
  await page.screenshot({path:`first-command-${side}-order.png`});
  await page.locator('#step').click();assert.match(await guide.innerText(),/6\/8/);
  await page.locator('[data-tab="chronicle"]').click();assert.match(await guide.innerText(),/7\/8/);
  await page.screenshot({path:`first-command-${side}-report.png`});
  await page.locator('[data-tab="government"]').click();await page.locator('[data-tax="low"]').click();assert.match(await guide.innerText(),/8\/8/);
  await page.locator('#campaign-progress').click();await page.locator('[data-direction="political"]').click();await page.locator('#experience-close').click();
  await page.screenshot({path:`first-command-${side}-goal.png`});
  await page.locator('#what-now').click();assert.ok(await page.locator('.experience-cards article').count()>0);await page.locator('#experience-close').click();
  await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  assert.equal(saved.experience.direction,'political');assert.equal(saved.experience.guide.step,8);assert.ok(saved.experience.actions.order>0);assert.deepEqual(errors,[]);
  await page.close();
 }
 const training=await browser.newPage({viewport:{width:1366,height:768}});
 await training.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});await training.locator('#start-training').click();
 await training.locator('#training-badge').waitFor({state:'visible'});await training.locator('#save').click();
 assert.ok(await training.evaluate(()=>localStorage.getItem('spqr-training-save-1')));
 await training.locator('#guide-restart').click();await training.locator('#start-game').click();
 assert.equal(await training.locator('#training-badge').isHidden(),true);await training.locator('#save').click();
 assert.ok(await training.evaluate(()=>localStorage.getItem('spqr-save-1')));
 await training.close();
 console.log('Roman Caesar and Senate eight-action tutorials and save passed');
}finally{await browser.close()}
