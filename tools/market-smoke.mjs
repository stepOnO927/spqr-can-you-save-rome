import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-empire-2');
  const state=newGame('caesar');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#markets').click();
 await page.locator('#market-origin').selectOption('cisalpine');
 await page.locator('#market-destination').selectOption('narbo');
 await page.locator('#market-commodity').selectOption('grain');
 await page.locator('#market-quantity').fill('2');await page.locator('#market-quantity').dispatchEvent('change');
 assert.match(await page.locator('#market-quote').innerText(),/总计/);
 await page.locator('#market-order').click();
 assert.match(await page.locator('.market-panel').innerText(),/在途商队/);
 await page.locator('#save').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.markets.shipments.length,1);
 assert.equal(saved.markets.shipments[0].commodity,'grain');
 await page.locator('#language').click();
 assert.match(await page.locator('.market-panel').innerText(),/SHIPMENTS IN TRANSIT/);
 await page.locator('#load').click();await page.locator('#markets').click();
 assert.match(await page.locator('.market-panel').innerText(),/Grain ×2/);
 await page.locator('#advance').click();
 await page.locator('#markets').click();
 assert.match(await page.locator('.market-panel').innerText(),/RECENT DELIVERIES/);
 await page.locator('#save').click();
 const delivered=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(delivered.markets.shipments[0].status,'delivered');
 assert.equal(delivered.markets.transactions.length,1);
 assert.deepEqual(errors,[]);
 console.log('Market order, route delivery, bilingual panel and save/load passed in Chromium.');
}finally{await browser.close()}
