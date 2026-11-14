import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 for(const side of ['caesar','senate']){
  const page=await browser.newPage({viewport:{width:1366,height:768}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
  await page.locator('.setup-panel').waitFor();
  await page.locator('#faction-choice').selectOption(side);
  await page.locator('#start-campaign').click();
  await page.locator('#what-now').click();
  assert.ok(await page.locator('.experience-cards article').count()>=2);
  await page.locator('#experience-close').click();
  await page.locator('[data-army="'+(side==='caesar'?'xiii':'pompey')+'"]').first().click();
  await page.locator('#inspect-supply').click();
  await page.locator('#region-choice').selectOption(side==='caesar'?'roma':'cisalpine');
  if(side==='senate'){assert.match(await page.locator('.experience-lesson').innerText(),/government/i);await page.locator('[data-tab="government"]').click()}
  await page.locator('#campaign-progress').click();
  await page.locator('[data-direction="political"]').click();
  await page.locator('#experience-close').click();
  assert.match(await page.locator('.experience-lesson').innerText(),/real step|defensible step/i);
  await page.locator('[data-tab="government"]').click();
  await page.locator('[data-tax="low"]').click();
  assert.match(await page.locator('.experience-lesson').innerText(),/Advance/i);
  await page.locator('#step').click();
  await page.locator('[data-tab="chronicle"]').click();
  await page.locator('#mail-open').click();
  assert.match(await page.locator('.mailbox').innerText(),/first assessment/i);
  await page.locator('[data-mail-reply="acknowledge"]').first().click();
  await page.locator('#mail-close').click();
  await page.locator('#new').click();
  await page.locator('[data-slot="save"]').click();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
  assert.equal(saved.experience.direction,'political');
  assert.ok(saved.experience.actions.course>0);
  assert.ok(saved.experience.actions.threat>0);
  assert.ok(saved.experience.actions.reply>0);
  assert.equal(saved.experience.openingLetter&&saved.mail.messages.find(m=>m.id===saved.experience.openingLetter)?.courierRisk,0);
  assert.deepEqual(errors,[]);
  await page.close();
 }
 console.log('Roman first hundred days: Caesar and Senate real actions, letter, choices and save passed');
}finally{await browser.close()}
