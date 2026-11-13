import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=faces-empire-2';
import {newHanGame,tick as tickHan,loadHanSave} from '../han/engine.js?v=faces-of-empire-1';
import {rulerPortrait} from '../han/rulers.js?v=faces-of-empire-1';
import {proposeAgreement} from '../agreements.js?v=grand-chessboard-2';
import {advanceMarketAI} from '../trade-markets.js?v=faces-empire-2';

const state=newGame('han');
for(const [a,b] of [['senate','egypt'],['armenia','parthia'],['armenia','galatia'],['senate','galatia']]){
 state.relations[[a,b].sort().join(':')]=70;
 assert.equal(proposeAgreement(state,a,b,'trade').ok,true,`${a}-${b} treaty`);
}
// Four courts face distinct shortages while neighboring treaty partners hold
// actual surplus stock. Each must use the same order and payment path.
for(const [region,good] of [['syria','papyrus'],['armenia','horses'],['egypt','iron'],['galatia','timber']]){const item=state.markets.regions[region].goods[good];item.stock=0;item.production=0}
for(const [region,good] of [['egypt','papyrus'],['parthia','horses'],['syria','iron'],['anatolia','timber']])state.markets.regions[region].goods[good].stock=60;
state.month=3;
const openingOrders=advanceMarketAI(state);
for(const buyer of ['senate','egypt','armenia','galatia'])assert.ok(openingOrders.some(x=>x.buyer===buyer),`${buyer} did not place an order`);
const initialTreasury=Object.fromEntries(Object.entries(state.factions).map(([id,f])=>[id,f.treasury]));
for(let i=0;i<120;i++){
 const before=state.year*12+state.month;tick(state);assert.equal(state.year*12+state.month,before+1,'campaign time stalled');
 if(i===59)Object.assign(state,upgradeSave(structuredClone(state)));
 for(const market of Object.values(state.markets.regions))for(const item of Object.values(market.goods)){
  assert.ok(Number.isSafeInteger(item.stock)&&item.stock>=0&&item.stock<=Math.max(80,item.production*24),`invalid ${market.id} stock`);
  assert.ok(Number.isFinite(item.price)&&item.price>=1&&item.price<=24,`invalid ${market.id} price`);
 }
 for(const shipment of state.markets.shipments){
  assert.ok(shipment.quantity>=1&&shipment.quantity<=20);
  assert.ok(shipment.escrow>=0);
  assert.ok(state.world.characters[shipment.merchantId],`missing merchant for ${shipment.id}`);
  if(shipment.status==='delivered')assert.equal(shipment.escrow,0);
 }
}
assert.equal(state.markets.transportSpent+state.markets.merchantFees,state.markets.transactions.reduce((sum,x)=>sum+x.transport,0),'transport payments must have one destination');
const summary={months:120,year:state.year,month:state.month,openingBuyers:openingOrders.map(x=>x.buyer),shipments:state.markets.shipments.length,delivered:state.markets.transactions.length,blocked:state.markets.shipments.filter(x=>x.status==='blocked').length,merchants:Object.keys(state.markets.merchants).length,merchantFees:state.markets.merchantFees,transportSpent:state.markets.transportSpent,treasuryChange:Object.fromEntries(Object.entries(initialTreasury).map(([id,before])=>[id,(state.factions[id]?.treasury??0)-before]))};
assert.ok(summary.delivered>=4,'the four opening orders must result in actual deliveries');

let han=newHanGame('han',{seed:49,start:'roman'});
const openingHanRuler=han.throne.occupant,openingParthian=han.rulers.parthia.personId;
const openingPortrait=rulerPortrait(han,'parthia');assert.ok(openingPortrait);
for(let i=0;i<120;i++){
 const before=han.year*12+han.month;tickHan(han);assert.equal(han.year*12+han.month,before+1,'Han campaign time stalled');
 if(i===59){han=loadHanSave(JSON.parse(JSON.stringify(han)));assert.equal(rulerPortrait(han,'parthia'),openingPortrait,'the saved ruler portrait changed')}
 for(const [id,f] of Object.entries(han.factions))for(const key of ['treasury','grain','manpower','horses','stability'])assert.ok(Number.isFinite(f[key])&&Math.abs(f[key])<1_000_000,`${id} ${key} diverged`);
 for(const market of Object.values(han.tradeMarkets.regions))for(const item of Object.values(market.goods)){
  assert.ok(Number.isSafeInteger(item.stock)&&item.stock>=0&&item.stock<=Math.max(80,item.production*24),`Han ${market.id} stock diverged`);
  assert.ok(Number.isFinite(item.price)&&item.price>=1&&item.price<=24,`Han ${market.id} price diverged`);
 }
 for(const shipment of han.tradeMarkets.shipments){assert.ok(shipment.escrow>=0);assert.ok(han.persons[shipment.merchantId]);if(shipment.status==='delivered')assert.equal(shipment.escrow,0)}
}
assert.notEqual(han.throne.occupant,openingHanRuler,'the scheduled Han succession did not resolve');
assert.equal(han.throne.occupant,'liu-shi');
assert.equal(han.rulers.parthia.personId,openingParthian,'the Parthian ruler changed without a succession event');
assert.equal(han.tradeMarkets.transportSpent+han.tradeMarkets.merchantFees,han.tradeMarkets.transactions.reduce((sum,x)=>sum+(x.transport||0),0),'Han transport payments must have one destination');
const hanDelivered=han.tradeMarkets.transactions.filter(x=>!['lost','stranded'].includes(x.status)).length;
assert.ok(hanDelivered>=4,'the direct Han market must complete physical deliveries');
console.log(JSON.stringify({...summary,han:{months:120,year:han.year,month:han.month,emperor:han.throne.occupant,markets:Object.keys(han.tradeMarkets.regions).length,shipments:han.tradeMarkets.shipments.length,delivered:hanDelivered}}));
