import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=government-courier-guidance-1');const {addReport}=await import('/character-system.js?v=portraits-hundred-days-1');const s=newGame('caesar');s.year=0;s.month=1;addReport(s,'caesar','egypt',{kind:'health',character:'cleopatra',value:'ill',source:'travelers',confidence:'rumor'});s.year=-1;s.month=12;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 assert.match(await page.locator('#turn-date').innerText(),/公元前1年12月.*公元1年1月/);
 await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-page="intelligence"]').click();await page.locator('#send-inquiry').click();
 await page.locator('#advance').click();assert.match(await page.locator('#turn-date').innerText(),/公元1年1月.*公元1年2月/);
 await page.locator('#factions').click();await page.locator('[data-faction="egypt"]').click();await page.locator('[data-character="cleopatra"]').first().click();assert.match(await page.locator('#command-detail').innerText(),/1\/1 CE/);
 await page.locator('#save').click();let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.year,0);assert.equal(saved.inquiries[0].remaining,3);
 await page.locator('#load').click();assert.match(await page.locator('#turn-date').innerText(),/公元1年1月/);await page.locator('#advance').click();await page.locator('#save').click();saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.inquiries[0].remaining,2);
 assert.deepEqual(errors,[]);console.log('Campaign date and delayed letters remain correct across BCE/CE and save/load.');
}finally{await browser.close()}
