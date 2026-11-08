import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});
 await page.locator('#start-free').click();
 await page.locator('[data-army="xiii"] .faction-standard').waitFor();
 assert.equal(await page.locator('[data-army="xiii"] .faction-standard').count(),1);
 await page.locator('#factions').click();
 assert.equal(await page.locator('.faction-directory [data-faction] .faction-insignia').count(),9);
 await page.locator('#insignia-encyclopedia').click();
 assert.equal(await page.locator('.insignia-entry').count(),9);
 assert.equal(await page.locator('.insignia-entry .faction-mark').count(),27);
 assert.match(await page.locator('#selection-detail').innerText(),/original game reconstructions/i);
 await page.locator('#language').click();
 assert.match(await page.locator('#selection-detail').innerText(),/游戏复原设计/);
 assert.match(await page.locator('.insignia-entry').first().innerText(),/政治起源/);
 await page.locator('#factions').click();
 await page.locator('[data-faction="egypt"]').click();
 assert.equal(await page.locator('.faction-focus .faction-banner').count(),1);
 assert.match(await page.locator('#command-detail').innerText(),/游戏复原标识/);
 assert.deepEqual(errors,[]);
 await page.close();
 const campaign=await browser.newPage({viewport:{width:1440,height:900}}),campaignErrors=[];
 campaign.on('pageerror',e=>campaignErrors.push(e.message));
 await campaign.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 await campaign.locator('.map-footer .faction-mark').first().waitFor({state:'attached'});
 assert.equal(await campaign.locator('.map-footer .faction-mark').count(),3);
 await campaign.locator('[data-tab="government"]').click();
 assert.equal(await campaign.locator('.panel-heading .faction-banner').count(),1);
 assert.deepEqual(campaignErrors,[]);
 console.log('Phase VI: army standards, nine faction kits, bilingual encyclopedia, diplomacy and government verified');
}finally{await browser.close()}
