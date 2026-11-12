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
 const merchant=await page.locator('[data-market-merchant]').first().getAttribute('data-market-merchant');
 assert.ok(merchant);
 await page.locator('[data-market-merchant]').first().click();
 assert.match(await page.locator('#command-detail').innerText(),/虚构商人/);
 await page.locator('#markets').click();
 await page.locator('#save').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.markets.shipments.length,1);
 assert.equal(saved.markets.shipments[0].commodity,'grain');
 assert.equal(saved.markets.shipments[0].merchantId,merchant);
 await page.locator('#language').click();
 assert.match(await page.locator('.market-panel').innerText(),/SHIPMENTS IN TRANSIT/);
 await page.locator('#load').click();await page.locator('#markets').click();
 assert.match(await page.locator('.market-panel').innerText(),/Grain ×2/);
 assert.equal(await page.locator('[data-market-merchant]').first().getAttribute('data-market-merchant'),merchant);
 await page.locator('#advance').click();
 await page.locator('#markets').click();
 assert.match(await page.locator('.market-panel').innerText(),/RECENT DELIVERIES/);
 assert.match(await page.locator('.market-panel').innerText(),/Cisalpine.*Narbo|Northern Italy.*Narbo/);
 assert.match(await page.locator('.market-panel').innerText(),/Goods.*Transport.*Customs.*Total/);
 await page.locator('#save').click();
 const delivered=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(delivered.markets.shipments[0].status,'delivered');
 assert.equal(delivered.markets.transactions.length,1);
 assert.equal(delivered.markets.transactions[0].merchantId,merchant);
 assert.equal(delivered.markets.transactions[0].origin,'cisalpine');
 assert.equal(delivered.markets.transactions[0].destination,'narbo');
 // A direct Han player can buy from Parthia through the existing oasis and
 // Central Asian network without receiving a fictitious direct border.
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-empire-2'),{proposeAgreement}=await import('/agreements.js?v=grand-chessboard-2');
  const state=newGame('han');state.relations['han:parthia']=45;
  if(!proposeAgreement(state,'han','parthia','trade').ok)throw Error('Han-Parthia treaty unavailable');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#markets').click();
 assert.ok((await page.locator('#market-origin option').evaluateAll(options=>options.map(x=>x.value))).includes('parthia'));
 await page.locator('#market-origin').selectOption('parthia');
 await page.locator('#market-destination').selectOption('hanHexi');
 await page.locator('#market-commodity').selectOption('horses');
 assert.match(await page.locator('#market-quote').innerText(),/个月|months/);
 await page.locator('#market-order').click();
 await page.locator('#save-slot').selectOption('2');await page.locator('#save').click();
 const silkRoadOrder=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-2')).markets.shipments[0]);
 assert.ok(silkRoadOrder.route.includes('silk:parthia'));
 assert.ok(silkRoadOrder.legs.some(x=>x.network==='silk'));
 // A delivered horse batch becomes visible mounted scouts when Han raises
 // a force in the receiving theater.
 await page.evaluate(async()=>{
  const {newGame,recruit}=await import('/engine.js?v=faces-empire-2');
  const state=newGame('han');state.markets.regions.hanHexi.goods.horses.stock=1;
  if(!recruit(state,'hanHexi'))throw Error('Han recruitment failed');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.goto('http://127.0.0.1:5173/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-army="levy1"]').evaluate(element=>element.click());
 assert.match(await page.locator('#command-detail').innerText(),/Mounted scouts|骑乘侦察兵/);
 assert.deepEqual(errors,[]);
 console.log('Market orders, merchant dossiers, Han horse recruitment, bilingual panel and save/load passed in Chromium.');
}catch(error){console.error('Browser page errors:',errors);throw error}finally{await browser.close()}
