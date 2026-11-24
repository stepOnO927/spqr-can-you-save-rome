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
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-name-disagreement-1');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:newGame('han')}));
 });
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#factions').click();
 await page.locator('[data-faction="han"]').click();
 await page.locator('[data-character="han_xuan"]').first().click();
 const hanPortrait=page.locator('#command-detail img[src$="han-liu-xun-128.jpg"]').first();
 assert.equal(await hanPortrait.evaluate(img=>img.complete&&img.naturalWidth===128),true);
 assert.match(await page.locator('#command-detail').innerText(),/Liu Xun/);
 assert.deepEqual(errors,[]);
 console.log('Varro bilingual profile and integrated Han ruler portrait browser checks passed.');
}finally{await browser.close()}
