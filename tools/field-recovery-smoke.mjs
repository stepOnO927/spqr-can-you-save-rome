import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:600,height:800}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#start-overlay:not([hidden])').waitFor({timeout:30000});
 await page.locator('#roman-faction').selectOption('caesar');
 await page.locator('#start-game').click();
 await page.locator('#guide:not([hidden])').waitFor({timeout:60000});
 await page.waitForFunction(()=>document.querySelector('#brief-toggle')?.hasAttribute('aria-expanded')&&document.querySelector('#selection-toggle')?.hasAttribute('aria-expanded'));
 await page.waitForTimeout(200);
 if(await page.locator('.brief').evaluate(el=>el.classList.contains('collapsed')))await page.locator('#brief-toggle').click({force:true});
 if(await page.locator('.selection').evaluate(el=>el.classList.contains('collapsed')))await page.locator('#selection-toggle').click({force:true});
 const panels=await page.evaluate(()=>{
  const box=id=>{const r=document.querySelector(id).getBoundingClientRect();return {top:r.top,bottom:r.bottom}};
  return {brief:box('.brief'),selection:box('.selection'),guide:box('#guide'),briefOpen:!document.querySelector('.brief').classList.contains('collapsed'),selectionOpen:!document.querySelector('.selection').classList.contains('collapsed')};
 });
 assert.ok(panels.briefOpen&&panels.selectionOpen,JSON.stringify(panels));
 assert.ok(panels.brief.bottom<=panels.selection.top+2,JSON.stringify(panels));
 assert.ok(panels.selection.bottom<=panels.guide.top+2,JSON.stringify(panels));
 await page.locator('#guide-skip').click();
 await page.locator('[data-army="xiii"]').click({force:true});
 const reinforce=page.locator('[data-order="reinforce"]');
 assert.match(await page.locator('.reinforcement-note').innerText(),/国库10.*粮食3.*兵源1000/);
 assert.equal(await reinforce.isDisabled(),false);
 await reinforce.click();
 assert.equal(await page.locator('[data-order="reinforce"]').isDisabled(),true);
 assert.match(await page.locator('.reinforcement-note').innerText(),/本月已补员/);
 await page.locator('#lab-orders select').selectOption('italiaN');
 assert.match(await page.locator('.preview-detail').innerText(),/可能未经战斗就失守/);
 await page.locator('#lab-orders button').click();
 assert.match(await page.locator('#status').innerText(),/可能未经战斗就失守/);
 for(let i=0;i<7;i++)await page.locator('#advance').click();
 assert.match(await page.locator('.brief .kicker').innerText(),/49年8月/);
 assert.deepEqual(errors,[]);
 console.log('Narrow tutorial, reinforcement cap, vacating warning, and live campaign date passed');
}finally{await browser.close()}
