import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,loadHanSave,serialize} from '../han/engine.js?v=faces-name-disagreement-1';
import {createMarketMerchant} from '../han/field-identities.js';
import {propose,setRelation} from '../han/frontier.js?v=han-1';
import {advanceEasternMarkets,placeEasternTrade,quoteEasternTrade} from '../han/markets.js?v=faces-wheels-1';
import {roll} from '../han/util.js?v=han-1';

const next=s=>{if(++s.month>12){s.month=1;s.year++}advanceEasternMarkets(s)};
function venture(){
 const s=newHanGame('dayuan',{seed:49});s.tradeMarkets.embeddedRoman=true;
 setRelation(s,'dayuan','kangju',80);assert.equal(propose(s,'dayuan','kangju','market').proposal.status,'accepted');
 const id=createMarketMerchant(s,'dayuan','dayuan');s.tradeMarkets.merchants.dayuan=[id];s.persons[id].wealth=30;
 const source=s.tradeMarkets.regions.dayuan.goods.horses,destination=s.tradeMarkets.regions.kangju.goods.horses;
 source.stock=12;destination.stock=0;destination.production=0;destination.consumption=0;
 const request={seller:'dayuan',buyer:'kangju',origin:'dayuan',destination:'kangju',commodity:'horses',quantity:1,financierId:id};
 return {s,id,request,source,destination};
}

test('a named merchant prepays a physical venture and receives only the buyer’s saved delivery payment',()=>{
 let {s,id,request,source,destination}=venture();
 const quote=quoteEasternTrade(s,request),before={seller:s.factions.dayuan.treasury,buyer:s.factions.kangju.treasury,merchant:s.persons[id].wealth,stock:source.stock};
 assert.equal(quote.ok,true,quote.reason);assert.ok(quote.resalePrice>quote.total);
 const placed=placeEasternTrade(s,request);assert.equal(placed.ok,true,placed.reason);
 assert.equal(source.stock,before.stock-1);assert.equal(destination.stock,0);
 assert.equal(s.factions.dayuan.treasury,before.seller+quote.price,'the seller is paid when the merchant buys the lot');
 assert.equal(s.factions.kangju.treasury,before.buyer-quote.resalePrice,'the destination court commits a finite purchase payment');
 assert.equal(s.persons[id].wealth,before.merchant-quote.total);
 s=loadHanSave(serialize(s));const shipment=s.tradeMarkets.shipments.find(x=>x.id===placed.shipment.id);
 assert.equal(shipment.financierId,id);assert.equal(shipment.buyerEscrow,quote.resalePrice);
 for(let i=0;i<quote.months;i++)next(s);
 assert.equal(shipment.status,'delivered');assert.equal(shipment.escrow,0);assert.equal(shipment.buyerEscrow,0);
 assert.equal(s.tradeMarkets.regions.kangju.goods.horses.stock,1);
 assert.equal(s.factions.dayuan.treasury,before.seller+quote.price,'the seller is paid once');
 const tx=s.tradeMarkets.transactions.filter(x=>x.shipment===shipment.id);assert.equal(tx.length,1);
 assert.equal(tx[0].resalePrice,quote.resalePrice);assert.equal(tx[0].financierId,id);
 const fee=tx[0].merchantFee,rent=tx[0].marketHouseRent;
 assert.equal(s.persons[id].wealth,before.merchant-quote.total+quote.resalePrice+fee+(rent&&tx[0].marketHouseId===id?rent:0));
 assert.equal(s.tradeMarkets.transportSpent+s.tradeMarkets.merchantFees+s.tradeMarkets.marketHouseRent,quote.transport);
 const saved=loadHanSave(serialize(s));next(saved);assert.equal(saved.tradeMarkets.transactions.filter(x=>x.shipment===shipment.id).length,1);
});

test('a raid refunds the buyer’s reserved price but leaves the merchant exposed to the paid cargo',()=>{
 const {s,id,request}=venture(),quote=quoteEasternTrade(s,request),before={seller:s.factions.dayuan.treasury,buyer:s.factions.kangju.treasury,merchant:s.persons[id].wealth};
 const placed=placeEasternTrade(s,request);assert.equal(placed.ok,true);
 const shipment=placed.shipment,hazard=s.regions.find(r=>r.id===shipment.legs[0].to);
 hazard.unrest=1;hazard.fort=0;for(const army of s.armies.filter(a=>a.region===hazard.id))army.men=0;
 const future={...s,month:s.month===12?1:s.month+1,year:s.month===12?s.year+1:s.year};
 let seed=null;for(let candidate=1;candidate<10000;candidate++)if(roll({...future,seed:candidate},`market-bandit:${shipment.id}:${hazard.id}`)<.08){seed=candidate;break}
 assert.ok(seed);s.seed=seed;next(s);
 assert.equal(shipment.status,'lost');assert.equal(shipment.escrow,0);assert.equal(shipment.buyerEscrow,0);
 assert.equal(s.factions.kangju.treasury,before.buyer,'buyer pays nothing for lost goods');
 assert.equal(s.factions.dayuan.treasury,before.seller+quote.price,'the origin court keeps its actual sale proceeds');
 assert.equal(s.tradeMarkets.lostGoods.horses,1);
 const tx=s.tradeMarkets.transactions.find(x=>x.shipment===shipment.id),expected=before.merchant-quote.price-quote.transport+tx.merchantFee;
 assert.equal(s.persons[id].wealth,expected,'merchant loses the purchased cargo and paid carriage');
 assert.equal(tx.sellerAdvance,quote.price);assert.equal(tx.buyerRefund,quote.resalePrice);
 const loaded=loadHanSave(serialize(s));next(loaded);assert.equal(loaded.tradeMarkets.transactions.filter(x=>x.shipment===shipment.id).length,1);
});

test('a venture requires an available named merchant, own capital, buyer demand and access before any debit',()=>{
 const {s,id,request,source,destination}=venture(),before={seller:s.factions.dayuan.treasury,buyer:s.factions.kangju.treasury,merchant:s.persons[id].wealth,stock:source.stock};
 s.persons[id].wealth=1;assert.equal(placeEasternTrade(s,request).reason,'merchant_funds');
 s.persons[id].wealth=before.merchant;destination.stock=20;assert.equal(placeEasternTrade(s,request).reason,'demand');
 destination.stock=0;assert.equal(placeEasternTrade(s,{...request,financierId:'merchant:missing'}).reason,'merchant');
 assert.equal(placeEasternTrade(s,{...request,carrierId:'merchant:missing'}).reason,'merchant');
 assert.deepEqual({seller:s.factions.dayuan.treasury,buyer:s.factions.kangju.treasury,merchant:s.persons[id].wealth,stock:source.stock},before);
});

test('an AI merchant invests on a known adjacent treaty bid without a player order',()=>{
 const s=newHanGame('han',{seed:49});s.tradeMarkets.embeddedRoman=true;s.month=3;
 setRelation(s,'dayuan','kangju',80);assert.equal(propose(s,'dayuan','kangju','market').proposal.status,'accepted');
 const id=createMarketMerchant(s,'dayuan','dayuan'),person=s.persons[id];person.wealth=30;person.marketReputation=1;person.specialization='horses';
 s.tradeMarkets.merchants.dayuan=[id];s.tradeMarkets.regions.dayuan.goods.horses.stock=12;
 const destination=s.tradeMarkets.regions.kangju.goods.horses;destination.stock=0;destination.production=0;destination.consumption=0;
 advanceEasternMarkets(s);
 const shipments=s.tradeMarkets.shipments.filter(x=>x.financierId===id);assert.equal(shipments.length,1);
 assert.equal(shipments[0].seller,'dayuan');assert.equal(shipments[0].buyer,'kangju');
 advanceEasternMarkets(s);assert.equal(s.tradeMarkets.shipments.filter(x=>x.financierId===id).length,1,'same month cannot invest twice');
 const loaded=loadHanSave(serialize(s));next(loaded);
 assert.equal(loaded.tradeMarkets.shipments.find(x=>x.id===shipments[0].id).status,'delivered');
 assert.equal(loaded.tradeMarkets.regions.kangju.goods.horses.stock,1);
});

test('a merchant venture pays actual transit customs and balances all money over a long route',()=>{
 let s=newHanGame('kangju',{seed:49});s.tradeMarkets.embeddedRoman=true;
 setRelation(s,'han','kangju',80);assert.equal(propose(s,'kangju','han','market').proposal.status,'accepted');
 const id=createMarketMerchant(s,'kangju','kangju');s.tradeMarkets.merchants.kangju=[id];s.persons[id].wealth=100;
 Object.assign(s.tradeMarkets.regions.dunhuang.goods.horses,{stock:0,production:0,consumption:0});
 s.tradeMarkets.tariffs.wusun=0;s.tradeMarkets.tariffs.qiuci=0;
 const request={seller:'kangju',buyer:'han',origin:'kangju',destination:'dunhuang',commodity:'horses',quantity:1,financierId:id};
 const quote=quoteEasternTrade(s,request);assert.equal(quote.ok,true,quote.reason);assert.ok(quote.months>1);assert.equal(quote.tariffs.reduce((sum,t)=>sum+t.amount,0),1);
 const cash=faction=>s.factions[faction].treasury,before={seller:cash('kangju'),buyer:cash('han'),transit:cash('shanshan'),merchant:s.persons[id].wealth};
 const result=placeEasternTrade(s,request);assert.equal(result.ok,true);
 s=loadHanSave(serialize(s));for(let i=0;i<quote.months;i++)next(s);
 const shipment=s.tradeMarkets.shipments.find(x=>x.id===result.shipment.id),tx=s.tradeMarkets.transactions.find(x=>x.shipment===shipment.id);
 assert.equal(shipment.status,'delivered');assert.equal(cash('kangju')-before.seller,quote.price);
 assert.equal(cash('han')-before.buyer,-quote.resalePrice);
 assert.equal(cash('shanshan')-before.transit,1);
 assert.equal(s.persons[id].wealth-before.merchant,-quote.total+quote.resalePrice+tx.merchantFee);
 assert.equal(quote.price-quote.resalePrice+1+(s.persons[id].wealth-before.merchant)+s.tradeMarkets.transportSpent,0,'every treasury, merchant and transport entry balances');
 assert.equal(s.tradeMarkets.regions.dunhuang.goods.horses.stock,1);
});

test('a returning merchant can buy abroad and retain a real home after resale',()=>{
 let s=newHanGame('han',{seed:49});s.tradeMarkets.embeddedRoman=true;
 setRelation(s,'shule','dayuan',80);assert.equal(propose(s,'shule','dayuan','market').proposal.status,'accepted');
 const id=createMarketMerchant(s,'shule','dayuan'),merchant=s.persons[id];merchant.wealth=30;merchant.marketReputation=1;merchant.specialization='horses';merchant.marketHome='shule';merchant.marketReturn={to:'shule',months:2,arrive:s.year*12+s.month+2};
 s.tradeMarkets.merchants.shule=[id];s.tradeMarkets.regions.dayuan.goods.horses.stock=12;
 Object.assign(s.tradeMarkets.regions.shule.goods.horses,{stock:0,production:0,consumption:0});
 const request={seller:'dayuan',buyer:'shule',origin:'dayuan',destination:'shule',commodity:'horses',quantity:1,financierId:id};
 const quote=quoteEasternTrade(s,request);assert.equal(quote.ok,true,quote.reason);
 const result=placeEasternTrade(s,request);assert.equal(result.ok,true,result.reason);
 assert.equal(result.shipment.sponsor,'shule');assert.equal(merchant.marketHome,'shule');assert.equal(merchant.marketReturn,undefined);
 s=loadHanSave(serialize(s));for(let i=0;i<quote.months;i++)next(s);
 const saved=s.persons[id];assert.equal(s.tradeMarkets.shipments.find(x=>x.id===result.shipment.id).status,'delivered');
 assert.equal(saved.location,'shule');assert.equal(saved.marketHome,'shule');assert.equal(saved.marketReturn,undefined);
 assert.equal(s.tradeMarkets.regions.shule.goods.horses.stock,1);
});
