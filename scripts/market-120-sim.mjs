import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=faces-name-disagreement-1';
import {newHanGame,tick as tickHan,loadHanSave} from '../han/engine.js?v=faces-name-disagreement-1';
import {rulerPortrait} from '../han/rulers.js';
import {courtPortraitSrc} from '../han/court-portrait.js';
import {proposeAgreement} from '../agreements.js?v=focus-agreement-consent-1';
import {advanceMarketAI} from '../trade-markets.js?v=faces-import-passage-1';

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
const romanPopulation=state.regions.reduce((sum,region)=>sum+region.population.total,0);
for(let i=0;i<120;i++){
 const before=state.year*12+state.month;tick(state);assert.equal(state.year*12+state.month,before+1,'campaign time stalled');
 if(i===59)Object.assign(state,upgradeSave(structuredClone(state)));
 const population=state.regions.reduce((sum,region)=>sum+region.population.total,0);
 assert.ok(Number.isSafeInteger(population)&&population>=romanPopulation/2,'Roman population collapsed or diverged');
 for(const [id,faction] of Object.entries(state.factions))for(const key of ['treasury','food','manpower'])assert.ok(Number.isFinite(faction[key])&&Math.abs(faction[key])<1_000_000,`${id} ${key} diverged`);
 for(const [id,faction] of Object.entries(state.factions))for(const key of ['stability','legitimacy'])if(faction[key]!=null)assert.ok(Number.isFinite(faction[key])&&faction[key]>=0&&faction[key]<=100,`${id} ${key} left its bounds`);
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
const hanPopulation=han.regions.reduce((sum,region)=>sum+region.pop,0);
const openingPortrait=rulerPortrait(han,'parthia');assert.ok(openingPortrait);
for(let i=0;i<120;i++){
 const before=han.year*12+han.month;tickHan(han);assert.equal(han.year*12+han.month,before+1,'Han campaign time stalled');
 if(i===59){const known=new Map(Object.entries(han.persons).map(([id,person])=>[id,[person.name?.[0],person.appearanceSeed,person.portrait]]));han=loadHanSave(JSON.parse(JSON.stringify(han)));assert.equal(rulerPortrait(han,'parthia'),openingPortrait,'the saved ruler portrait changed');for(const [id,identity] of known)assert.deepEqual([han.persons[id]?.name?.[0],han.persons[id]?.appearanceSeed,han.persons[id]?.portrait],identity,`person ${id} changed on load`)}
 const population=han.regions.reduce((sum,region)=>sum+region.pop,0);
 assert.ok(Number.isSafeInteger(population)&&population>=hanPopulation/2,'Han population collapsed or diverged');
 for(const [office,id] of Object.entries(han.court.offices||{})){if(!id)continue;const person=han.persons[id];assert.ok(person?.name?.[0]&&person.alive,`unnamed or dead Han ${office}`);assert.ok(courtPortraitSrc(person,128,han),`missing portrait for Han ${office}`)}
 for(const [id,f] of Object.entries(han.factions))for(const key of ['treasury','grain','manpower','horses','stability'])assert.ok(Number.isFinite(f[key])&&Math.abs(f[key])<1_000_000,`${id} ${key} diverged`);
 for(const [id,f] of Object.entries(han.factions))assert.ok(f.stability>=0&&f.stability<=100,`${id} stability left its bounds`);
 for(const market of Object.values(han.tradeMarkets.regions))for(const item of Object.values(market.goods)){
  assert.ok(Number.isSafeInteger(item.stock)&&item.stock>=0&&item.stock<=Math.max(80,item.production*24),`Han ${market.id} stock diverged`);
  assert.ok(Number.isFinite(item.price)&&item.price>=1&&item.price<=24,`Han ${market.id} price diverged`);
 }
 for(const shipment of han.tradeMarkets.shipments){assert.ok(shipment.escrow>=0);assert.ok(han.persons[shipment.merchantId]);if(shipment.status==='delivered')assert.equal(shipment.escrow,0)}
}
assert.notEqual(han.throne.occupant,openingHanRuler,'the scheduled Han succession did not resolve');
assert.equal(han.throne.occupant,'liu-shi');
assert.equal(han.rulers.parthia.personId,openingParthian,'the Parthian ruler changed without a succession event');
assert.equal(han.tradeMarkets.transportSpent+han.tradeMarkets.merchantFees+han.tradeMarkets.marketHouseRent,han.tradeMarkets.transactions.reduce((sum,x)=>sum+(x.transport||0),0),'Han transport payments must have one destination');
const hanDelivered=han.tradeMarkets.transactions.filter(x=>!['lost','stranded'].includes(x.status)).length;
assert.ok(hanDelivered>=4,'the direct Han market must complete physical deliveries');
// Run the entire eastern network without a player placing an opening order.
// A resale counts only when the seller physically received the same good in an
// earlier paid caravan and the second caravan also completed its own settlement.
let autonomous=newHanGame(null,{seed:49});
const easternGoods=Object.keys(autonomous.tradeMarkets.regions[autonomous.regions[0].id].goods);
// Inventory, reserved sale lots, and in-flight cargo are three locations for
// the same units. Grain and iron consumed by manufacturing appear in the raw
// input ledger; the finished goods appear in their own production ledger.
const goodsBalance=(campaign,good)=>{
 const markets=campaign.tradeMarkets,items=Object.values(markets.regions).map(market=>market.goods[good]);
 const total=field=>items.reduce((sum,item)=>sum+(item[field]||0),0);
 const reserved=markets.saleOrders.filter(order=>order.status==='open'&&order.commodity===good).reduce((sum,order)=>sum+order.available,0);
 const traveling=markets.shipments.filter(shipment=>['traveling','blocked'].includes(shipment.status)&&shipment.commodity===good).reduce((sum,shipment)=>sum+shipment.quantity,0);
 return {physical:total('stock')+reserved+traveling,produced:total('produced'),consumed:total('consumed'),discarded:total('surplusDiscarded'),manufactured:total('usedForManufacture'),military:total('usedForRecruitment')+total('usedForMilitary'),lost:markets.lostGoods[good]||0,requisitioned:good==='horses'?markets.requisitionedHorses:0};
};
const openingGoods=Object.fromEntries(easternGoods.map(good=>[good,goodsBalance(autonomous,good).physical]));
for(let i=0;i<120;i++){
 const before=autonomous.year*12+autonomous.month;tickHan(autonomous);
 assert.equal(autonomous.year*12+autonomous.month,before+1,'autonomous eastern time stalled');
 if(i===59)autonomous=loadHanSave(JSON.parse(JSON.stringify(autonomous)));
 for(const good of easternGoods){const balance=goodsBalance(autonomous,good);assert.equal(balance.physical+balance.consumed+balance.discarded+balance.manufactured+balance.military+balance.lost+balance.requisitioned,openingGoods[good]+balance.produced,`${good} units were created or lost after month ${i+1}`)}
}
const paid=autonomous.tradeMarkets.transactions.filter(x=>x.price>0),shipmentById=new Map(autonomous.tradeMarkets.shipments.map(x=>[x.id,x]));
const ventures=autonomous.tradeMarkets.shipments.filter(x=>x.financierId);
assert.ok(ventures.length>=2,'named merchants should fund actual autonomous caravans in an ordinary ten-year eastern campaign');
const multiLegVentures=ventures.filter(x=>x.status==='delivered'&&x.path.length>=3);
assert.ok(multiLegVentures.length>=1,'a named merchant should independently deliver and settle cargo beyond an adjacent market');
for(const shipment of ventures){
 assert.ok(autonomous.persons[shipment.financierId]?.name?.[0]);
 assert.ok(shipment.financeCost>0&&shipment.resalePrice>shipment.financeCost);
 if(shipment.status==='delivered'){
  assert.equal(shipment.buyerEscrow,0);assert.equal(shipment.escrow,0);
  const receipts=autonomous.tradeMarkets.transactions.filter(x=>x.shipment===shipment.id);
  assert.equal(receipts.length,1,'a self-funded sale must settle once');
  assert.equal(receipts[0].resalePrice,shipment.resalePrice);
 }
}
for(const shipment of han.tradeMarkets.shipments.filter(x=>x.financierId))assert.ok(shipment.seller!=='han'&&shipment.buyer!=='han','AI venture must not spend or sell player goods without an order');
const dated=tx=>tx.year*12+tx.month;
const resales=paid.filter(tx=>autonomous.tradeMarkets.regions[tx.origin]?.goods[tx.commodity]?.production===0&&paid.some(earlier=>earlier.destination===tx.origin&&earlier.buyer===tx.seller&&earlier.commodity===tx.commodity&&dated(earlier)<dated(tx)));
assert.ok(resales.length>=4,'independent courts should complete several physical intermediary resales over ten years');
for(const tx of resales){
 const shipment=shipmentById.get(tx.shipment);
 assert.equal(shipment?.status,'delivered');assert.equal(shipment.escrow,0);
 assert.equal(shipment.price,tx.price);assert.equal(shipment.quantity,tx.quantity);
 assert.equal(autonomous.persons[shipment.merchantId]?.profession,'merchant');
 assert.equal(autonomous.tradeMarkets.transactions.filter(entry=>entry.shipment===tx.shipment).length,1,'a resale must settle once');
}
console.log(JSON.stringify({...summary,han:{months:120,year:han.year,month:han.month,emperor:han.throne.occupant,markets:Object.keys(han.tradeMarkets.regions).length,shipments:han.tradeMarkets.shipments.length,delivered:hanDelivered},autonomous:{months:120,delivered:paid.length,resales:resales.length,goods:[...new Set(resales.map(x=>x.commodity))],merchantVentures:ventures.length,multiLegVentures:multiLegVentures.length}}));
