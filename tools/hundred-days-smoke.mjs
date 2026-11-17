import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(base+'/han/',{waitUntil:'domcontentloaded'});await page.locator('#begin').click();
 await page.locator('#han-whatnow').waitFor();assert.match(await page.locator('#campaignTitle').innerText(),/49 BCE/);
 assert.match(await page.locator('.han-experience-summary').innerText(),/1\/8/);
 await page.screenshot({path:'first-command-han-territory.png'});
 await page.locator('[data-han-open="region"]').click();assert.match(await page.locator('.han-experience-summary').innerText(),/1\/8/,'Show me must not complete a lesson');
 await page.locator('#map [data-region="changan"]').first().dispatchEvent('click');assert.match(await page.locator('.han-experience-summary').innerText(),/2\/8/);
 await page.locator('[data-select-army="a1"]').click();assert.match(await page.locator('.han-experience-summary').innerText(),/3\/8/);
 await page.locator('#han-inspect-supply').click();assert.match(await page.locator('.han-experience-summary').innerText(),/4\/8/);
 await page.locator('#map [data-region="hongnong"]').first().dispatchEvent('click');assert.match(await page.locator('.han-march-preview').innerText(),/March preview/);assert.match(await page.locator('.han-experience-summary').innerText(),/4\/8/);await page.locator('#han-cancel-preview').click();assert.match(await page.locator('.han-experience-summary').innerText(),/4\/8/);await page.locator('#map [data-region="hongnong"]').first().dispatchEvent('click');await page.locator('#han-confirm-march').click();assert.match(await page.locator('#message').innerText(),/March ordered/);assert.match(await page.locator('.han-experience-summary').innerText(),/5\/8/);
 await page.screenshot({path:'first-command-han-order.png'});
 await page.locator('#advance').click();assert.match(await page.locator('.han-experience-summary').innerText(),/6\/8/);
 await page.locator('[data-han-open="report"]').click();assert.match(await page.locator('.han-experience-dialog').innerText(),/Campaign chronicle/);await page.locator('#han-experience-close').click();assert.match(await page.locator('.han-experience-summary').innerText(),/7\/8/);
 await page.screenshot({path:'first-command-han-report.png'});
 await page.locator('[data-han-open="court"]').click();assert.match(await page.locator('.han-experience-summary').innerText(),/7\/8/);await page.locator('[data-han-office]').first().click();await page.locator('#han-experience-close').click();assert.match(await page.locator('.han-experience-summary').innerText(),/8\/8/);
 await page.locator('[data-han-open="direction"]').click();await page.locator('[data-han-direction="administration"]').click();assert.match(await page.locator('.han-experience-dialog').innerText(),/Court and administration/);await page.locator('#han-experience-close').click();
 await page.locator('#save').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-han-save-browser')));assert.equal(saved.player,'han');assert.equal(saved.experience.direction,'administration');assert.equal(saved.experience.step,8);
 await page.locator('#load').click();assert.equal(await page.locator('#han-whatnow').count(),1);
 await page.reload();await page.locator('#factionSelect').selectOption('shanshan');await page.locator('#begin').click();await page.locator('#han-progress').click();assert.match(await page.locator('.han-experience-dialog').innerText(),/independent and resilient/);
 assert.deepEqual(errors,[]);console.log('Han eight real lessons, Show me, safe march, save/load, and oasis guidance passed');
}finally{await browser.close()}
