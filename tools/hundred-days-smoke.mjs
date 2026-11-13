import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173/han/',{waitUntil:'domcontentloaded'});await page.locator('#begin').click();
 await page.locator('#han-whatnow').waitFor();assert.match(await page.locator('#campaignTitle').innerText(),/48 BCE/);
 await page.locator('#han-whatnow').click();assert.ok(await page.locator('.han-recommendations article').count()>=2);await page.locator('#han-experience-close').click();
 await page.locator('#han-progress').click();await page.locator('[data-han-direction="administration"]').click();assert.match(await page.locator('.han-experience-dialog').innerText(),/Court and administration/);await page.locator('#han-experience-close').click();
 await page.locator('[data-han-open="court"]').click();assert.ok(await page.locator('[data-han-office]').count()>0);await page.locator('#han-experience-close').click();
 await page.locator('#advance').click();assert.match(await page.locator('#message').innerText(),/treasury .*→/);
 await page.locator('#save').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-han-save-browser')));assert.equal(saved.player,'han');assert.equal(saved.experience.direction,'administration');
 await page.locator('#load').click();assert.equal(await page.locator('#han-whatnow').count(),1);
 await page.reload();await page.locator('#factionSelect').selectOption('shanshan');await page.locator('#begin').click();await page.locator('#han-progress').click();assert.match(await page.locator('.han-experience-dialog').innerText(),/independent and resilient/);
 assert.deepEqual(errors,[]);console.log('Han and oasis hands-on guidance, feasible recommendations, time and save/load passed');
}finally{await browser.close()}
