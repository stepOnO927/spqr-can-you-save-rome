import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>localStorage.setItem('spqr-lang','en'));
 await page.goto(base+'/',{waitUntil:'domcontentloaded'});
 const shipmentId=await page.evaluate(async()=>{
  const {newGame}=await import('/engine.js?v=faces-family-age-1');
  const {attachHanWorld,advanceHanWorld}=await import('/han/world.js?v=faces-family-age-1');
  const {proposeAgreement}=await import('/agreements.js?v=agreement-courier-1');
  const {postTradeSale,advanceMarketAI,advanceMarkets}=await import('/trade-markets.js?v=faces-wheels-1');
  const {advanceDate}=await import('/han/util.js?v=han-1');
  const s=newGame('caesar'),w=attachHanWorld(s,{seed:49});
  s.regions.find(r=>r.id==='syria').owner='caesar';s.relations['caesar:parthia']=70;
  if(!proposeAgreement(s,'caesar','parthia','trade').ok)throw Error('Trade access unavailable');
  Object.assign(s.markets.regions.syria.goods.copper,{stock:20,production:0,consumption:0});
  Object.assign(s.markets.regions.parthia.goods.copper,{stock:0,production:0,consumption:0});
  Object.assign(w.state.tradeMarkets.regions.ctesiphon.goods.copper,{stock:0,production:0,consumption:0});
  w.state.tradeMarkets.autonomousEnabled=false;s.factions.parthia.treasury=200;
  const sale=postTradeSale(s,{origin:'syria',commodity:'copper',quantity:5,unitPrice:1});
  if(!sale.ok)throw Error('Sale unavailable');s.month=3;
  const shipment=advanceMarketAI(s).find(x=>x.seller==='caesar'&&x.buyer==='parthia'&&x.saleOrderId===sale.order.id);
  if(!shipment)throw Error('Parthian AI did not purchase the listed copper');
  for(let i=0;i<shipment.legs[0].months;i++){advanceDate(s);advanceMarkets(s);advanceHanWorld(s)}
  if(shipment.status!=='delivered'||w.state.tradeMarkets.regions.ctesiphon.goods.copper.stock!==shipment.quantity)throw Error('Eastern inventory transfer failed');
  sessionStorage.setItem('spqr-view-handoff-v1',JSON.stringify({target:'campaign',state:s}));return shipment.id;
 });
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-tab="east"]').click();
 assert.match(await page.locator('.inspector').innerText(),/Your cargo received by Parthian brokers.*Copper × 3/s);
 await page.evaluate(()=>document.querySelector('#save').click());
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-save-1')));
 assert.equal(saved.world.hanWorld.bridge.romanExports[shipmentId].quantity,3);
 assert.equal(saved.markets.regions.parthia.goods.copper.stock,0);
 assert.equal(saved.world.hanWorld.state.tradeMarkets.regions.ctesiphon.goods.copper.stock,3);
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('[data-slot="load"]').click();await page.locator('[data-tab="east"]').click();
 assert.match(await page.locator('.inspector').innerText(),/Your cargo received by Parthian brokers.*Copper × 3/s);
 await page.locator('#lang').click();
 assert.match(await page.locator('.inspector').innerText(),/经安息商人转售的本方货物.*铜 × 3/s);
 assert.deepEqual(errors,[]);
 console.log('Roman copper reached Parthian eastern stock through a paid AI caravan; the bilingual receipt survived reload.');
}finally{await browser.close()}
