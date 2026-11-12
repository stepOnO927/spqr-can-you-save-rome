import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-empire-2';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {COMMODITIES,initializeMarkets,quoteTrade,placeTradeOrder,advanceMarkets} from '../trade-markets.js?v=faces-empire-2';

const deal=()=>{
 const s=newGame('armenia');s.relations['armenia:parthia']=45;
 assert.equal(proposeAgreement(s,'armenia','parthia','trade').ok,true);
 return s;
};
const request={seller:'parthia',buyer:'armenia',origin:'parthia',destination:'armenia',commodity:'horses',quantity:2};

test('markets have measured units, local output and bounded shortage prices',()=>{
 const s=newGame('armenia'),parthia=s.markets.regions.parthia,egypt=s.markets.regions.egypt;
 assert.deepEqual(COMMODITIES.horses.unit,['100 head','百匹']);
 assert.ok(parthia.goods.horses.production>0);
 assert.ok(egypt.goods.papyrus.production>0);
 const normal=parthia.goods.horses.price;
 parthia.goods.horses.stock=0;s.month++;advanceMarkets(s);
 assert.ok(parthia.goods.horses.price>=normal);
 assert.ok(parthia.goods.horses.price<=COMMODITIES.horses.basePrice*3);
});

test('a horse order escrows goods and money, travels, then pays and delivers exactly once',()=>{
 const s=deal(),quote=quoteTrade(s,request),stock=s.markets.regions.parthia.goods.horses.stock,buyerMoney=s.factions.armenia.treasury,sellerMoney=s.factions.parthia.treasury;
 assert.equal(quote.ok,true);assert.ok(quote.months>=1);assert.deepEqual(quote.route,['parthia','armenia']);
 const result=placeTradeOrder(s,request);assert.equal(result.ok,true);
 assert.equal(s.markets.regions.parthia.goods.horses.stock,stock-2);
 assert.equal(s.factions.armenia.treasury,buyerMoney-quote.total);
 assert.equal(s.factions.parthia.treasury,sellerMoney);
 let loaded=upgradeSave(structuredClone(s)),destination=loaded.markets.regions.armenia.goods.horses.stock;
 const local=loaded.markets.regions.armenia.goods.horses;
 for(let i=0;i<quote.months-1;i++){loaded.month++;advanceMarkets(loaded);assert.equal(loaded.markets.shipments[0].status,'traveling')}
 loaded.month++;advanceMarkets(loaded);
 assert.equal(loaded.markets.shipments[0].status,'delivered');
 assert.equal(loaded.markets.shipments[0].escrow,0);
 assert.equal(loaded.factions.parthia.treasury,sellerMoney+quote.price);
 assert.equal(loaded.markets.transportSpent,quote.transport);
 assert.equal(loaded.markets.regions.armenia.goods.horses.stock,destination+quote.months*(local.production-local.consumption)+2);
 assert.equal(loaded.markets.transactions.length,1);
 advanceMarkets(loaded);assert.equal(loaded.markets.transactions.length,1);
 assert.equal(loaded.markets.transportSpent,quote.transport);
 assert.equal(upgradeSave(structuredClone(loaded)).markets.transactions.length,1);
});

test('border war blocks an actual shipment until passage is restored',()=>{
 const s=deal(),shipment=placeTradeOrder(s,request).shipment;
 s.wars.push(['armenia','parthia']);s.month++;advanceMarkets(s);
 assert.equal(shipment.status,'blocked');assert.equal(s.markets.transactions.length,0);
 s.wars=s.wars.filter(w=>!w.includes('armenia'));
 for(let i=0;i<shipment.legs[0].months;i++){s.month++;advanceMarkets(s)}
 assert.equal(shipment.status,'delivered');assert.equal(s.markets.transactions.length,1);
});

test('orders reject unaffordable, missing-stock and geographically disconnected trades',()=>{
 const s=deal(),before=structuredClone(s.markets.regions.parthia.goods.horses);
 assert.equal(placeTradeOrder(s,{...request,quantity:1000}).reason,'invalid');
 assert.equal(placeTradeOrder(s,{...request,quantity:20}).reason,'unavailable');
 s.factions.armenia.treasury=0;assert.equal(placeTradeOrder(s,request).reason,'treasury');
 assert.deepEqual(s.markets.regions.parthia.goods.horses,before);
 const han=newGame('han');han.relations['han:parthia']=45;assert.equal(proposeAgreement(han,'han','parthia','trade').ok,true);
 assert.equal(quoteTrade(han,{seller:'han',buyer:'parthia',origin:'hanGuanzhong',destination:'parthia',commodity:'silk',quantity:1}).reason,'route');
});

test('old saves gain markets once without changing existing treasury or region ownership',()=>{
 const s=newGame('caesar'),cash=s.factions.caesar.treasury,owners=s.regions.map(r=>r.owner);delete s.markets;
 const restored=upgradeSave(structuredClone(s)),again=upgradeSave(structuredClone(restored));
 assert.equal(restored.factions.caesar.treasury,cash);
 assert.deepEqual(restored.regions.map(r=>r.owner),owners);
 assert.deepEqual(again.markets,restored.markets);
 assert.equal(Object.keys(initializeMarkets(again).regions).length,again.regions.length);
});
