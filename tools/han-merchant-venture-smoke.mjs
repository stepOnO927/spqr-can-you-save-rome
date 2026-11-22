import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const base=process.env.SPQR_URL||'http://127.0.0.1:5173';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.addInitScript(()=>{localStorage.setItem('spqr-han-lang','en');Date.now=()=>123456});
 await page.goto(base+'/han/',{waitUntil:'domcontentloaded'});
 await page.locator('#factionSelect').selectOption('dayuan');await page.locator('#begin').click();await page.locator('#save').click();
 const id=await page.evaluate(async()=>{
  const {loadHanSave,serialize}=await import('/han/engine.js?v=faces-name-disagreement-1');
  const {setRelation,propose}=await import('/han/frontier.js?v=han-1');
  const {createMarketMerchant}=await import('/han/field-identities.js');
  const s=loadHanSave(localStorage.getItem('spqr-han-save-browser'));s.tradeMarkets.embeddedRoman=true;
  setRelation(s,'dayuan','kangju',80);if(propose(s,'dayuan','kangju','market').proposal.status!=='accepted')throw Error('Treaty failed');
  const id=createMarketMerchant(s,'dayuan','dayuan'),person=s.persons[id];person.wealth=30;person.marketReputation=1;person.specialization='horses';s.tradeMarkets.merchants.dayuan=[id];
  s.tradeMarkets.regions.dayuan.goods.horses.stock=12;
  Object.assign(s.tradeMarkets.regions.kangju.goods.horses,{stock:0,production:0,consumption:0});
  localStorage.setItem('spqr-han-save-browser',serialize(s));return id;
 });
 await page.locator('#load').click();await page.locator('#mode').selectOption('trade');await page.locator('[data-market="dayuan"]').click();
 assert.match(await page.locator('#inspector').innerText(),/Merchant ventures.*Merchant-funded|Merchant ventures.*personal capital/s);
 const button=page.locator('[data-east-venture]').first();assert.equal(await button.count(),1);
 assert.match(await button.locator('xpath=..').innerText(),/Horses.*Kangju.*Capital.*Delivery revenue.*Quoted margin/s);
 await page.locator('#save').click();const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-han-save-browser')));
 await button.click();assert.match(await page.locator('#message').innerText(),/Merchant-funded caravan dispatched/);
 await page.locator('#save').click();const placed=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-han-save-browser')));
 const shipment=placed.tradeMarkets.shipments.find(x=>x.financierId===id);assert.ok(shipment);
 assert.equal(placed.tradeMarkets.regions.dayuan.goods.horses.stock,before.tradeMarkets.regions.dayuan.goods.horses.stock-1);
 assert.equal(placed.factions.dayuan.treasury,before.factions.dayuan.treasury+shipment.price);
 assert.equal(placed.factions.kangju.treasury,before.factions.kangju.treasury-shipment.resalePrice);
 assert.equal(placed.persons[id].wealth,before.persons[id].wealth-shipment.financeCost);
 assert.equal(shipment.status,'traveling');
 await page.reload({waitUntil:'domcontentloaded'});await page.locator('#load').click();await page.locator('#mode').selectOption('trade');await page.locator('[data-market="dayuan"]').click();
 for(let i=0;i<shipment.legs.reduce((sum,leg)=>sum+leg.months,0);i++)await page.locator('#advance').click();
 await page.locator('#save').click();const delivered=await page.evaluate(()=>JSON.parse(localStorage.getItem('spqr-han-save-browser')));
 const final=delivered.tradeMarkets.shipments.find(x=>x.id===shipment.id);assert.equal(final.status,'delivered');assert.equal(final.escrow,0);
 assert.equal(delivered.tradeMarkets.regions.kangju.goods.horses.stock,1);
 assert.equal(delivered.tradeMarkets.transactions.filter(x=>x.shipment===shipment.id).length,1);
 assert.match(await page.locator('.market-receipts').innerText(),/Merchant resale/);
 await page.locator('#lang').click();assert.match(await page.locator('#inspector').innerText(),/商人自费商队/);
 assert.match(await page.locator('.market-receipts').innerText(),/商人转售收入/);
 assert.deepEqual(errors,[]);
 console.log('Named merchant funded, dispatched and sold a physical horse lot through a treaty; buyer escrow, save/load, bilingual receipts and one settlement passed in Chromium.');
}finally{await browser.close()}
