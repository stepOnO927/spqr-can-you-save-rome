import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1366,height:768}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#roman-faction').selectOption('senate');await page.locator('#difficulty').selectOption('travel');await page.locator('#start-free').click();
 await page.locator('#factions').click();await page.locator('[data-faction="senate"]').click();
 await page.locator('.cursus-senate summary').click();
 const rows=page.locator('.cursus-senator');assert.equal(await rows.count(),12);
 const own=rows.filter({hasText:'普布利乌斯·伦图卢斯'});assert.match(await own.locator('img').first().getAttribute('src'),/fictional-senator-publius-lentulus-128.jpg/);
 assert.equal(await own.locator('img').first().evaluate(img=>img.complete&&img.naturalWidth===128),true);
 const foreign=rows.filter({hasText:'卢基乌斯·卡西乌斯'});assert.equal(await foreign.locator('svg[aria-label]').count(),1);
 await own.locator('.cursus-person').click();assert.match(await page.locator('body').innerText(),/模拟人物|虚构游戏人物/);
 assert.deepEqual(errors,[]);console.log('Opening senator portrait and foreign-knowledge browser checks passed');
}finally{await browser.close()}
