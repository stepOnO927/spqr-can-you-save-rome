import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-empire-2';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {advanceMarketAI,advanceMarketDiplomacy,advanceMarkets,quoteTrade} from '../trade-markets.js?v=faces-empire-2';

const tradeState=player=>{
 const s=newGame(player);s.relations['egypt:senate']=55;
 assert.equal(proposeAgreement(s,'egypt','senate','trade').ok,true);
 s.month=3;return s;
};

test('an AI court buys a scarce good from a neighboring treaty market with real escrow',()=>{
 const s=tradeState('caesar'),before=structuredClone(s.markets),buyerCash=s.factions.senate.treasury;
 const orders=advanceMarketAI(s),order=orders.find(x=>x.buyer==='senate');assert.ok(order);assert.equal(order.seller,'egypt');
 assert.equal(order.commodity,'papyrus');assert.equal(order.origin,'egypt');assert.equal(order.destination,'syria');
 assert.equal(s.factions.senate.treasury,buyerCash-order.escrow);
 assert.equal(s.markets.regions.egypt.goods.papyrus.stock,before.regions.egypt.goods.papyrus.stock-order.quantity);
 assert.equal(advanceMarketAI(s).length,0,'a pending shipment prevents duplicate quarterly orders');
 const saved=upgradeSave(structuredClone(s));
 for(let i=0;i<order.legs[0].months;i++){saved.month++;advanceMarkets(saved)}
 assert.equal(saved.markets.shipments.find(x=>x.id===order.id).status,'delivered');
 assert.ok(saved.markets.transactions.some(x=>x.shipment===order.id));
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
 assert.deepEqual(advanceMarketAI(s).filter(x=>x.buyer==='senate'),[]);
 assert.equal(s.markets.shipments.filter(x=>x.buyer==='senate').length,0);
});

test('a scarce horse lot goes to the stronger affordable bid and settles at its actual price',()=>{
 const s=newGame('caesar');s.month=3;
 for(const buyer of ['armenia','senate']){
  s.relations[[buyer,'parthia'].sort().join(':')]=55;
  assert.equal(proposeAgreement(s,buyer,'parthia','trade').ok,true);
 }
 for(const market of Object.values(s.markets.regions))for(const item of Object.values(market.goods))item.stock=100;
 const source=s.markets.regions.parthia.goods.horses;source.stock=5;source.production=0;source.consumption=0;
 s.markets.regions.media.goods.horses.stock=5;s.markets.regions.media.goods.horses.production=0;
 for(const id of ['armenia','syria']){
  const good=s.markets.regions[id].goods.horses;good.stock=id==='syria'?0:1;good.production=0;
 }
 s.factions.armenia.treasury=26;s.factions.senate.treasury=100;
 const base=quoteTrade(s,{seller:'parthia',buyer:'senate',origin:'parthia',destination:'syria',commodity:'horses',quantity:1});
 assert.equal(base.ok,true);
 const orders=advanceMarketAI(s),winner=orders.find(x=>x.seller==='parthia'&&x.commodity==='horses');
 assert.ok(winner);assert.equal(winner.buyer,'senate');assert.ok(winner.price>base.price);
 assert.equal(s.markets.regions.parthia.goods.horses.stock,4);
 assert.equal(s.factions.senate.treasury,100-winner.escrow);
 assert.ok(!orders.some(x=>x.buyer==='armenia'&&x.origin==='parthia'&&x.commodity==='horses'));
 assert.ok(orders.some(x=>x.buyer==='armenia'&&x.origin==='media'&&x.commodity==='horses'),'the losing buyer finds another stocked source');
 const sellerCash=s.factions.parthia.treasury,saved=upgradeSave(structuredClone(s));
 for(let i=0;i<winner.legs[0].months;i++){saved.month++;advanceMarkets(saved)}
 assert.equal(saved.markets.shipments.find(x=>x.id===winner.id).status,'delivered');
 assert.ok(saved.markets.transactions.some(x=>x.shipment===winner.id&&x.price===winner.price));
 assert.equal(saved.factions.parthia.treasury,sellerCash+winner.price);
});
test('AI trade cannot silently remove goods from a player market',()=>{
 const s=tradeState('egypt'),before=s.markets.regions.egypt.goods.papyrus.stock;
 assert.deepEqual(advanceMarketAI(s),[]);
 assert.equal(s.markets.regions.egypt.goods.papyrus.stock,before);
 assert.equal(s.markets.shipments.length,0);
});
test('autoplay merchants can price a real Han to Parthia silk route',()=>{
 const s=newGame('han');s.relations['han:parthia']=55;
 assert.equal(proposeAgreement(s,'han','parthia','trade').ok,true);
 s.markets.regions.hanHexi.goods.silk.stock=80;
 s.markets.regions.parthia.goods.silk.stock=0;s.markets.regions.parthia.goods.silk.production=0;
 s.factions.parthia.treasury=100;s.month=3;
 const order=advanceMarketAI(s,{autoplayPlayer:true}).find(x=>x.buyer==='parthia'&&x.seller==='han');
 assert.ok(order);assert.equal(order.commodity,'silk');assert.ok(order.route.includes('silk:bactra'));
 assert.ok(order.legs.length>8);assert.ok(s.factions.parthia.treasury>=20);
});

test('an AI buyer proposes market access for its own shortage and then orders real goods',()=>{
 const s=newGame('caesar');s.month=6;s.relations['egypt:senate']=45;
 for(const market of Object.values(s.markets.regions))for(const item of Object.values(market.goods))item.stock=100;
 s.markets.regions.syria.goods.papyrus.stock=0;
 const attempts=advanceMarketDiplomacy(s),proposal=attempts.find(x=>x.buyer==='senate');
 assert.equal(proposal?.seller,'egypt');assert.equal(proposal.status,'accepted');
 assert.ok(s.agreements.some(x=>x.type==='trade'&&x.parties.includes('senate')&&x.parties.includes('egypt')));
 assert.ok(advanceMarketAI(s).some(x=>x.buyer==='senate'&&x.commodity==='papyrus'));
 assert.deepEqual(advanceMarketDiplomacy(s),[],'the same monthly tick cannot propose twice');
 assert.ok(!attempts.some(x=>x.buyer==='caesar'||x.seller==='caesar'),'normal AI cannot bind the player to a treaty');
});

test('a rejected AI proposal has a saved cooldown and cannot spend the player treasury',()=>{
 const s=newGame('caesar');s.month=6;s.relations['egypt:senate']=-30;
 for(const market of Object.values(s.markets.regions))for(const item of Object.values(market.goods))item.stock=100;
 s.markets.regions.syria.goods.papyrus.stock=0;
 const cash=s.factions.caesar.treasury,attempt=advanceMarketDiplomacy(s).find(x=>x.buyer==='senate');
 assert.equal(attempt?.seller,'egypt');assert.equal(attempt.status,'declined');
 assert.equal(s.factions.caesar.treasury,cash);
 assert.ok(!s.agreements.some(x=>x.type==='trade'&&x.parties.includes('senate')&&x.parties.includes('egypt')));
 const restored=upgradeSave(structuredClone(s));restored.month=12;
 assert.ok(!advanceMarketDiplomacy(restored).some(x=>x.buyer==='senate'&&x.seller==='egypt'));
});
