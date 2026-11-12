import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-empire-2';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {advanceMarketAI,advanceMarkets} from '../trade-markets.js?v=faces-empire-2';

const tradeState=player=>{
 const s=newGame(player);s.relations['egypt:senate']=55;
 assert.equal(proposeAgreement(s,'egypt','senate','trade').ok,true);
 s.month=3;return s;
};

test('an AI court buys a scarce good from a neighboring treaty market with real escrow',()=>{
 const s=tradeState('caesar'),before=structuredClone(s.markets),buyerCash=s.factions.senate.treasury;
 const orders=advanceMarketAI(s);assert.equal(orders.length,1);
 const order=orders[0];assert.equal(order.buyer,'senate');assert.equal(order.seller,'egypt');
 assert.equal(order.commodity,'papyrus');assert.equal(order.origin,'egypt');assert.equal(order.destination,'syria');
 assert.equal(s.factions.senate.treasury,buyerCash-order.escrow);
 assert.equal(s.markets.regions.egypt.goods.papyrus.stock,before.regions.egypt.goods.papyrus.stock-order.quantity);
 assert.equal(advanceMarketAI(s).length,0,'a pending shipment prevents duplicate quarterly orders');
 const saved=upgradeSave(structuredClone(s));
 for(let i=0;i<order.legs[0].months;i++){saved.month++;advanceMarkets(saved)}
 assert.equal(saved.markets.shipments[0].status,'delivered');
 assert.equal(saved.markets.transactions.length,1);
});

test('AI-to-AI market activity does not appear as a player dispatch',()=>{
 const s=tradeState('caesar'),priorLog=s.log.length;
 const [order]=advanceMarketAI(s);assert.ok(order);assert.notEqual(order.seller,s.player);assert.notEqual(order.buyer,s.player);
 for(let i=0;i<order.legs[0].months;i++){s.month++;advanceMarkets(s)}
 assert.equal(s.log.length,priorLog);
});

test('an AI cannot buy from an empty market or spend below its reserve',()=>{
 const s=tradeState('caesar');s.markets.regions.egypt.goods.papyrus.stock=0;
 s.factions.senate.treasury=20;
 assert.deepEqual(advanceMarketAI(s),[]);
 assert.equal(s.markets.shipments.length,0);
});
test('AI trade cannot silently remove goods from a player market',()=>{
 const s=tradeState('egypt'),before=s.markets.regions.egypt.goods.papyrus.stock;
 assert.deepEqual(advanceMarketAI(s),[]);
 assert.equal(s.markets.regions.egypt.goods.papyrus.stock,before);
 assert.equal(s.markets.shipments.length,0);
});
