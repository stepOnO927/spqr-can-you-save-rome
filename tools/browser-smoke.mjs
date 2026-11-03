// Runs in CI with Playwright installed separately; the application stays dependency-free.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1920,height:1080},deviceScaleFactor:1});
const errors=[];page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});
 await page.locator('#roman-faction').selectOption('senate');await page.locator('#start-free').click();
 await page.locator('#zoom-out').click();await page.waitForFunction(()=>document.body.classList.contains('leader-overview'));
 const labels=(await page.locator('.leader-map-label').allTextContents()).join(' ');assert.match(labels,/共同统治者/);assert.match(labels,/各王国统治者/);assert.match(labels,/罗马派系领袖/);
 await page.locator('#help').click();await page.locator('#help-search').fill('被俘');assert.match(await page.locator('#help-results').innerText(),/8国库/);
 await page.locator('#language').click();await page.locator('#help-search').fill('captured agents');assert.match(await page.locator('#help-results').innerText(),/8 treasury/);await page.locator('#language').click();
 await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();
 await page.locator('[data-character="cicero"]').click();
 assert.match(await page.locator('#command-detail').innerText(),/游戏战伤次数/);
 await page.locator('#person-destination').selectOption('epirus');await page.locator('#person-travel').click();
 await page.locator('#person-travel-feedback button').click();
 assert.match(await page.locator('#command-detail').innerText(),/正在旅行/);
 await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();
 assert.match(await page.locator('#command-detail').innerText(),/成功会面使双方关系提高3/);
 assert.equal(await page.locator('#claimant-support').isDisabled(),true,'an unreported claimant must not be exposed');
 await page.locator('#inquiry-subject').selectOption('leaders');await page.locator('#send-inquiry').click();
 assert.match(await page.locator('#command-detail').innerText(),/等待回信/);
 await page.locator('[data-mission="spy"]').click();await page.locator('#mission-feedback button').first().click();
 assert.equal(await page.locator('#agent-available').innerText(),'2');
 for(let i=0;i<4;i++)await page.locator('#advance').click();
 await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();
 assert.match(await page.locator('#command-detail').innerText(),/间谍/);
 await page.screenshot({path:'browser-smoke-1920x1080.png'});
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});await page.locator('#app').waitFor();
 assert.deepEqual(errors,[],'uncaught browser errors');console.log('Browser smoke passed: atlas, travel, correspondence, spy, turns, and original campaign.');
} finally {await browser.close()}
