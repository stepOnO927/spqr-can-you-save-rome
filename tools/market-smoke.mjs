import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.SPQR_TEST_URL||'http://127.0.0.1:5173';

const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1500,height:950}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','zh'));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-reported-names-1');
  const state=newGame('caesar');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#markets').click();
 assert.equal(await page.locator('#map-mode').inputValue(),'trade');
 await page.locator('.trade-market-marker').first().waitFor();
 assert.ok(await page.locator('.trade-market-marker').count()>=2);
 assert.match(await page.locator('#map-mode-details').innerText(),/己方市场与商队/);
 await page.locator('#map-mode').selectOption('political');
 assert.equal(await page.locator('.trade-market-marker').count(),0);
 await page.locator('#map-mode').selectOption('trade');
 await page.locator('.trade-market-marker').first().waitFor();
 await page.locator('#market-origin').selectOption('cisalpine');
 await page.locator('#market-destination').selectOption('narbo');
 await page.locator('#market-commodity').selectOption('grain');
 await page.locator('#market-quantity').fill('2');await page.locator('#market-quantity').dispatchEvent('change');
 assert.match(await page.locator('#market-quote').innerText(),/总计/);
 await page.locator('#market-order').click();
 await page.locator('.trade-cargo-marker').first().waitFor();
 assert.match(await page.locator('#map-mode-details').innerText(),/在途货运/);
 assert.match(await page.locator('.market-panel').innerText(),/在途商队/);
 const merchant=await page.locator('[data-market-merchant]').first().getAttribute('data-market-merchant');
 assert.ok(merchant);
 assert.match(await page.locator('.market-panel').innerText(),/商人特权/);
 await page.locator(`[data-grant-merchant="${merchant}"][data-duration="12"]`).click();
 assert.match(await page.locator('.market-panel').innerText(),/待下次承运时生效/);
 await page.locator('[data-market-merchant]').first().click();
 assert.match(await page.locator('#command-detail').innerText(),/虚构商人/);
 await page.locator('#markets').click();
 await page.locator('#save').click();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.markets.shipments.length,1);
 assert.equal(saved.markets.shipments[0].commodity,'grain');
 assert.equal(saved.markets.shipments[0].merchantId,merchant);
 assert.equal(saved.markets.merchantPrivileges[merchant].duration,12);
 await page.locator('#language').click();
 assert.match(await page.locator('.market-panel').innerText(),/SHIPMENTS IN TRANSIT/);
 assert.match(await page.locator('.market-panel').innerText(),/MERCHANT PRIVILEGES/);
 await page.locator('#load').click();await page.locator('#markets').click();
 assert.match(await page.locator('.market-panel').innerText(),/Grain ×2/);
 assert.equal(await page.locator('[data-market-merchant]').first().getAttribute('data-market-merchant'),merchant);
 await page.locator('#advance').click();
 await page.locator('#markets').click();
 assert.match(await page.locator('.market-panel').innerText(),/RECENT TRADE RESULTS/);
 assert.match(await page.locator('.market-panel').innerText(),/49 BCE/);
 assert.match(await page.locator('.market-panel').innerText(),/Cisalpine.*Narbo|Northern Italy.*Narbo/);
 assert.match(await page.locator('.market-panel').innerText(),/Goods.*Transport.*Customs.*Total/);
 assert.match(await page.locator('.market-panel').innerText(),/Destination stock \d+ → \d+.*Local price \d+ → \d+/s);
 await page.locator('#save').click();
 const delivered=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(delivered.markets.shipments[0].status,'delivered');
 assert.equal(delivered.markets.transactions.length,1);
 assert.equal(delivered.markets.transactions[0].merchantId,merchant);
 assert.equal(delivered.markets.transactions[0].origin,'cisalpine');
 assert.equal(delivered.markets.transactions[0].destination,'narbo');
 await page.locator('#language').click();
 assert.match(await page.locator('.market-panel').innerText(),/目的地库存 \d+ → \d+.*当地市价 \d+ → \d+/s);
 // A long border closure must leave a readable refund rather than a ghost
 // shipment that remains in the transit list indefinitely.
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-reported-names-1');
  const {proposeAgreement}=await import('/agreements.js?v=faces-reported-names-1');
  const {placeTradeOrder,advanceMarkets}=await import('/trade-markets.js?v=faces-reported-names-1');
  const state=newGame('han');state.relations['han:parthia']=45;
  if(!proposeAgreement(state,'han','parthia','trade').ok)throw Error('Trade treaty unavailable');
  const placed=placeTradeOrder(state,{seller:'han',buyer:'parthia',origin:'hanGuanzhong',destination:'parthia',commodity:'silk',quantity:1});
  if(!placed.ok)throw Error('Trade order unavailable');
  state.wars.push(['han','parthia']);
  for(let i=0;i<13;i++){if(++state.month>12){state.month=1;state.year++}advanceMarkets(state)}
  if(placed.shipment.status!=='stranded')throw Error('Blocked caravan did not settle');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#markets').click();
 assert.match(await page.locator('.market-panel').innerText(),/商队中止.*货物退回.*退款.*运费支出/s);
 assert.match(await page.locator('.market-panel').innerText(),/公元前\d+年/);
 assert.match(await page.locator('.market-panel').innerText(),/西汉帝国.*帕提亚/);
 await page.locator('#language').click();
 assert.match(await page.locator('.market-panel').innerText(),/Caravan stranded.*Goods returned to.*Refund.*Transport spent/s);
 assert.doesNotMatch(await page.locator('.market-panel').innerText(),/Silk ×1.*TRAVELING/s);
 // A direct Han player can buy from Parthia through the existing oasis and
 // Central Asian network without receiving a fictitious direct border.
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-reported-names-1'),{proposeAgreement}=await import('/agreements.js?v=faces-reported-names-1');
  const state=newGame('han');state.relations['han:parthia']=45;
  if(!proposeAgreement(state,'han','parthia','trade').ok)throw Error('Han-Parthia treaty unavailable');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#markets').click();
 assert.equal(await page.locator('#map-mode').inputValue(),'trade');
 assert.equal(await page.locator('#map-mode').isVisible(),true);
 assert.ok((await page.locator('#market-origin option').evaluateAll(options=>options.map(x=>x.value))).includes('parthia'));
 await page.locator('#market-origin').selectOption('parthia');
 await page.locator('#market-destination').selectOption('hanHexi');
 await page.locator('#market-commodity').selectOption('horses');
 assert.match(await page.locator('#market-quote').innerText(),/个月|months/);
 await page.locator('#market-order').click();
 await page.locator('.trade-cargo-marker').first().waitFor();
 await page.locator('#save-slot').selectOption('2');await page.locator('#save').click();
 const silkRoadOrder=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-2')).markets.shipments[0]);
 assert.ok(silkRoadOrder.route.includes('silk:parthia'));
 assert.ok(silkRoadOrder.legs.some(x=>x.network==='silk'));
 // A delivered horse batch becomes visible mounted scouts when Han raises
 // a force in the receiving theater.
 await page.evaluate(async()=>{
  const {newGame,recruit}=await import('/engine.js?v=faces-reported-names-1');
  const state=newGame('han');state.markets.regions.hanHexi.goods.horses.stock=1;
  if(!recruit(state,'hanHexi'))throw Error('Han recruitment failed');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('[data-army="levy1"]').evaluate(element=>element.click());
 assert.match(await page.locator('#command-detail').innerText(),/Mounted scouts|骑乘侦察兵/);
 await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-reported-names-1');
  const {advanceMarkets}=await import('/trade-markets.js?v=faces-reported-names-1');
  const state=newGame('caesar');state.armies.find(a=>a.owner==='senate').siege={region:'cisalpine',remaining:100};
  advanceMarkets(state);
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'atlas',state}));
 });
 await page.goto(base+'/map-lab/',{waitUntil:'domcontentloaded'});
 await page.locator('#markets').click();
 assert.match(await page.locator('.market-panel').innerText(),/本月围城减产.*谷物产量减半/s);
 await page.locator('#language').click();
 assert.match(await page.locator('.market-panel').innerText(),/Sieged markets this month.*grain output halved/s);
 assert.deepEqual(errors,[]);
 console.log('Market orders, merchant dossiers, Han horse recruitment, bilingual panel and save/load passed in Chromium.');
}catch(error){console.error('Browser page errors:',errors);throw error}finally{await browser.close()}
