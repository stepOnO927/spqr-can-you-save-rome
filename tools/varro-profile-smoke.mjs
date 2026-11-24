import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#roman-faction').selectOption('senate');
 await page.locator('#start-free').click();
 await page.locator('#factions').click();
 await page.locator('[data-faction="senate"]').click();
 await page.locator('[data-office-choice="finance"]').selectOption('varro');
 await page.locator('[data-office-appoint="finance"]').click();
 await page.locator('#office-feedback button').click();
 await page.locator('[data-character="varro"]').click();
 assert.match(await page.locator('#command-detail').innerText(),/马尔库斯·特伦提乌斯·瓦罗/);
 const portrait=page.locator('#command-detail img[src$="varro-128.jpg"]').first();
 assert.equal(await portrait.evaluate(img=>img.complete&&img.naturalWidth===128),true);
 await page.locator('.historical-entry summary').click();
 assert.match(await page.locator('.historical-entry').innerText(),/公元前49年|前49年/);
 await page.locator('#language').click();
 await page.locator('#factions').click();
 await page.locator('[data-faction="senate"]').click();
 await page.locator('[data-character="varro"]').click();
 assert.match(await page.locator('#command-detail').innerText(),/Marcus Terentius Varro/);
 assert.deepEqual(errors,[]);
 console.log('Varro portrait and bilingual historical profile browser checks passed.');
}finally{await browser.close()}
