import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>{if(!localStorage.getItem('spqr-lang'))localStorage.setItem('spqr-lang','zh')});await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.locator('.setup-panel').waitFor();await page.locator('#campaign-difficulty').selectOption('travel');await page.locator('#start-campaign').click();
 await page.waitForURL('**/map-lab/');await page.locator('#return-campaign').click();await page.waitForURL(base+'/');
 await page.locator('.experience-strip').waitFor();assert.match(await page.locator('.feather-panel').innerText(),/羽毛/);
 await page.locator('#what-now').click();assert.ok(await page.locator('.experience-cards article').count()>=2);await page.locator('#experience-close').click();
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.difficulty,'travel');assert.ok(saved.factions.caesar.treasury>=400);assert.equal(saved.armies.filter(a=>a.owner==='caesar'&&a.name[0]==='Travel legion').length,3);assert.equal(Object.keys(saved.world.offices.caesar).length,3);
 await page.locator('#step').click();assert.match(await page.locator('.feather-panel').innerText(),/羽毛/);await page.locator('#lang').click();assert.match(await page.locator('.feather-panel').innerText(),/FEATHER/);
 await page.locator('#open-atlas').click();await page.waitForURL('**/map-lab/');await page.locator('#feather-counsel:not([hidden])').waitFor();await page.locator('#return-campaign').click();await page.waitForURL(base+'/');assert.deepEqual(errors,[]);
 console.log('Travel guidance, Feather, turn, save and cross-view handoff passed');
}finally{await browser.close()}
