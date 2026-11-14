import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{const e=await import('/engine.js?v=strategic-player-offer-1'),s=e.newGame('senate');sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}))});await page.reload();
 await page.locator('[data-tab="government"]').click();
 for(const [id,key] of [['fictional:5','fictional-fabius'],['fictional:6','fictional-flavia'],['fictional:9','fictional-maron'],['fictional:10','fictional-helena']]){
  const img=page.locator(`[data-gene-person="${id}"] img`);assert.match(await img.getAttribute('src'),new RegExp(`${key}-128\\.jpg`));await img.evaluate(async element=>{await element.decode();if(element.naturalWidth!==128)throw Error('portrait did not load')});
 }
 await page.locator('#new').click();await page.locator('[data-slot="save"]').click();await page.locator('#new').click();await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="government"]').click();assert.match(await page.locator('[data-gene-person="fictional:5"] img').getAttribute('src'),/fictional-fabius-128/);
 assert.deepEqual(errors,[]);console.log('Distinct opening portraits load through the real family tree and survive save/load.');
}finally{await browser.close()}
