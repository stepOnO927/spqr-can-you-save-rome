import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.locator('.setup-panel').waitFor();
 assert.equal(await page.locator('#close-setup').count(),0);
 await page.locator('#setup-language').click();
 await page.locator('[data-slot="load"]').click();assert.match(await page.locator('.setup-feedback').innerText(),/空/);
 await page.locator('#faction-choice').selectOption('senate');await page.locator('#campaign-difficulty').selectOption('hard');await page.locator('#campaign-handicap').check();await page.locator('#start-campaign').click();
 await page.locator('.experience-strip').waitFor();assert.match(await page.locator('.experience-lesson').innerText(),/选择.*军/);
 await page.locator('[data-army="italy"]').first().click();
 await page.locator('#inspect-supply').click();
 await page.locator('#campaign-progress').click();await page.locator('[data-direction="political"]').click();
 assert.match(await page.locator('.experience-dialog').innerText(),/政治和解/);
 await page.locator('#experience-close').click();await page.locator('#step').click();await page.locator('[data-tab="chronicle"]').click();
 await page.locator('#what-now').click();assert.ok(await page.locator('.experience-cards article').count()>0);await page.locator('#experience-close').click();
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.player,'senate');assert.equal(saved.difficulty,'hard');assert.equal(saved.economicHandicap,true);assert.equal(saved.experience.direction,'political');
 await page.locator('#open-atlas').click();await page.waitForURL('**/map-lab/');await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();await page.locator('#inquiry-subject').selectOption('successor');await page.locator('#send-inquiry').click();assert.match(await page.locator('#command-detail').innerText(),/等待回信/);
 await page.locator('#return-campaign').click();await page.waitForURL('http://127.0.0.1:5173/');assert.equal(await page.locator('.setup-panel').count(),0);await page.reload();await page.locator('.setup-panel').waitFor();await page.locator('[data-slot="load"]').click();assert.equal(await page.locator('.setup-panel').count(),0);assert.deepEqual(errors,[]);
 console.log('Senate hands-on guide, direction, next actions, save/load and atlas handoff passed');
}finally{await browser.close()}
