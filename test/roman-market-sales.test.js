import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-empire-2';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {advanceMarketAI,advanceMarkets,cancelTradeSale,placeTradeOrder,postTradeSale,quoteTrade} from '../trade-markets.js?v=faces-empire-2';

function setup(){
 const s=newGame('armenia');s.relations['armenia:parthia']=45;
 assert.equal(proposeAgreement(s,'armenia','parthia','trade').ok,true);
 const source=s.markets.regions.armenia.goods.iron,destination=s.markets.regions.parthia.goods.iron;
 Object.assign(source,{stock:9,production:0,consumption:0});Object.assign(destination,{stock:0,production:0,consumption:0});
 s.factions.parthia.treasury=1000;return s;
}
const order=(id,quantity)=>({seller:'armenia',buyer:'parthia',origin:'armenia',destination:'parthia',commodity:'iron',quantity,saleOrderId:id});
const next=s=>{if(++s.month>12){s.month=1;s.year++}advanceMarkets(s)};

test('Roman player sales reserve stock and pay only after physical delivery',()=>{
 let s=setup(),source=s.markets.regions.armenia.goods.iron,sellerCash=s.factions.armenia.treasury;
 assert.equal(postTradeSale(s,{origin:'parthia',commodity:'iron',quantity:1,unitPrice:2}).reason,'invalid');
 const posted=postTradeSale(s,{origin:'armenia',commodity:'iron',quantity:5,unitPrice:2});assert.equal(posted.ok,true);assert.equal(source.stock,4);
 const request=order(posted.order.id,3),quote=quoteTrade(s,request);assert.equal(quote.ok,true);assert.equal(quote.price,6);
 const placed=placeTradeOrder(s,{...request,maxTotal:quote.total});assert.equal(placed.ok,true);assert.equal(source.stock,4);assert.equal(posted.order.available,2);assert.equal(sellerCash,s.factions.armenia.treasury);
 s=upgradeSave(structuredClone(s));assert.equal(s.markets.saleOrders[0].available,2);assert.equal(s.markets.shipments[0].saleOrderId,posted.order.id);
 for(let i=0;i<quote.months;i++)next(s);
 assert.equal(s.markets.shipments[0].status,'delivered');assert.equal(s.factions.armenia.treasury,sellerCash+quote.price);assert.equal(s.markets.regions.parthia.goods.iron.stock,3);
 const cancelled=cancelTradeSale(s,posted.order.id);assert.equal(cancelled.ok,true);assert.equal(s.markets.regions.armenia.goods.iron.stock,6);assert.equal(cancelled.order.available,0);
 assert.equal(quoteTrade(s,order(posted.order.id,1)).reason,'unavailable');
});

test('AI cannot buy unlisted Roman stock and can partially fill an explicit listing',()=>{
 const s=setup();s.month=3;
 const without=advanceMarketAI(s);assert.ok(!without.some(x=>x.seller==='armenia'));
 const posted=postTradeSale(s,{origin:'armenia',commodity:'iron',quantity:5,unitPrice:1});assert.equal(posted.ok,true);
 const orders=advanceMarketAI(s),purchase=orders.find(x=>x.seller==='armenia'&&x.buyer==='parthia'&&x.saleOrderId===posted.order.id);
 assert.ok(purchase);assert.equal(purchase.quantity,3);assert.equal(posted.order.available,2);assert.equal(s.markets.regions.armenia.goods.iron.stock,4);
 assert.equal(s.markets.shipments.filter(x=>x.saleOrderId===posted.order.id).length,1);
});

test('conquest releases unfilled listed goods to the captured local market once',()=>{
 const s=setup(),posted=postTradeSale(s,{origin:'armenia',commodity:'iron',quantity:4,unitPrice:2});assert.equal(posted.ok,true);
 const source=s.markets.regions.armenia.goods.iron;assert.equal(source.stock,5);
 s.regions.find(r=>r.id==='armenia').owner='parthia';next(s);
 assert.equal(posted.order.status,'seized');assert.equal(posted.order.available,0);assert.equal(source.stock,9);
 assert.equal(cancelTradeSale(s,posted.order.id).ok,false);next(s);assert.equal(source.stock,9);
 assert.equal(upgradeSave(structuredClone(s)).markets.saleOrders[0].status,'seized');
});
