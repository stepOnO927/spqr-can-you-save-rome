import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}),page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(`${base}/`,{waitUntil:'domcontentloaded'});
 const origin=await page.evaluate(async()=>{const {newGame}=await import('/engine.js?v=faces-empire-2'),s=newGame('caesar'),r=s.regions.find(x=>x.owner==='caesar');s.markets.regions[r.id].goods.iron.stock=5;sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}));return r.id});
 await page.goto(`${base}/map-lab/`,{waitUntil:'domcontentloaded'});await page.locator('#markets').click();
 await page.locator('#market-tariff').selectOption('high');await page.locator('[data-market-export="iron"]').click();
 assert.equal(await page.locator('[data-market-export="iron"]').getAttribute('aria-pressed'),'true');
 await page.locator('#market-sale-origin').selectOption(origin);await page.locator('#market-sale-commodity').selectOption('iron');await page.locator('#market-sale-quantity').fill('3');await page.locator('#market-sale-price').fill('5');
 assert.match(await page.locator('#market-sale-stock').innerText(),/可挂牌库存 5/);await page.locator('#market-sale-post').click();
 assert.match(await page.locator('#command-detail').innerText(),/×3/);await page.locator('#save').click();
 let saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.markets.regions[origin].goods.iron.stock,2);assert.equal(saved.markets.saleOrders[0].available,3);assert.equal(saved.markets.tariffs.caesar,.15);assert.deepEqual(saved.markets.exportRestrictions.caesar,['iron']);
 await page.locator('#language').click();await page.locator('#markets').click();assert.match(await page.locator('#command-detail').innerText(),/CANCEL AND RETURN STOCK/);
 assert.equal(await page.locator('#market-tariff').inputValue(),'high');assert.match(await page.locator('[data-market-export="iron"]').innerText(),/REOPEN EXPORTS/);
 await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('spqr-save-1'));sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state:s}))});await page.reload();await page.locator('#markets').click();
 assert.equal(await page.locator('#market-tariff').inputValue(),'high');assert.equal(await page.locator('[data-market-export="iron"]').getAttribute('aria-pressed'),'true');
 assert.equal(await page.locator('[data-market-cancel-sale]').count(),1);await page.locator('[data-market-cancel-sale]').click();await page.locator('#save').click();
 saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));assert.equal(saved.markets.regions[origin].goods.iron.stock,5);assert.equal(saved.markets.saleOrders[0].status,'cancelled');assert.deepEqual(errors,[]);
 console.log('Roman market sale reserves measured stock and cancellation restores it after bilingual save/load.');
}finally{await browser.close()}
