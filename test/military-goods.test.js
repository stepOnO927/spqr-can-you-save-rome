import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-reported-names-1';
import {templatesFor,recruitFormation,recruitmentQuote} from '../legion-designer.js?v=faces-reported-names-1';
import {advanceMarkets,placeTradeOrder} from '../trade-markets.js?v=faces-reported-names-1';
import {COMMODITIES} from '../market-goods.js?v=faces-reported-names-1';
import {advanceInventions} from '../inventions.js?v=faces-reported-names-1';

const next=s=>{if(++s.month>12){s.month=1;s.year++}advanceMarkets(s)};

test('Roman formation weapons are forged from iron and delivered before recruitment',()=>{
 let s=newGame('caesar');const fac=s.factions.caesar;fac.treasury=500;fac.manpower=30000;fac.food=200;
 const forge=s.markets.regions.cisalpine.goods,source=s.markets.regions.gaul.goods;
 Object.assign(forge.iron,{stock:1,production:0,consumption:0});Object.assign(forge.weapons,{stock:0,production:1,consumption:0});
 advanceMarkets(s);assert.equal(forge.iron.stock,0);assert.equal(forge.iron.usedForManufacture,1);
 assert.equal(forge.weapons.stock,1);assert.equal(forge.weapons.produced,1);
 const template=templatesFor(s,'caesar').find(t=>t.name==='Standard Field Legion');
 const quote=recruitmentQuote(s,'caesar',template.id);assert.equal(quote.weapons,1);
 const first=recruitFormation(s,'caesar','cisalpine',template.id);assert.equal(first.ok,true,first.reason);
 assert.equal(forge.weapons.stock,0);assert.equal(forge.weapons.usedForRecruitment,1);
 assert.deepEqual(s.armies.find(a=>a.id===first.armyId).equipmentMaterials,{weapons:1});
 const cash=fac.treasury,people=fac.manpower;
 assert.equal(recruitFormation(s,'caesar','cisalpine',template.id).reason,'weapons');
 assert.equal(fac.treasury,cash);assert.equal(fac.manpower,people);
 source.weapons.stock=1;source.weapons.production=0;
 const order=placeTradeOrder(s,{seller:'caesar',buyer:'caesar',origin:'gaul',destination:'cisalpine',commodity:'weapons',quantity:1});
 assert.equal(order.ok,true,order.reason);assert.equal(recruitFormation(s,'caesar','cisalpine',template.id).reason,'weapons');
 s=upgradeSave(structuredClone(s));for(let i=0;i<order.quote.months;i++)next(s);
 assert.equal(s.markets.shipments.find(x=>x.id===order.shipment.id).status,'delivered');
 const second=recruitFormation(s,'caesar','cisalpine',template.id);assert.equal(second.ok,true,second.reason);
 assert.equal(s.markets.regions.cisalpine.goods.weapons.usedForRecruitment,2);
 assert.equal(s.markets.regions.cisalpine.goods.weapons.stock,0);
});

test('legacy markets gain the two physical military goods once without resetting the campaign',()=>{
 const s=newGame('senate'),cash=s.factions.senate.treasury;
 for(const market of Object.values(s.markets.regions)){delete market.goods.weapons;delete market.goods.provisions}
 const first=upgradeSave(structuredClone(s));
 assert.deepEqual(Object.keys(COMMODITIES).filter(good=>first.markets.regions.roma.goods[good]),Object.keys(COMMODITIES));
 assert.equal(first.factions.senate.treasury,cash);
 first.markets.regions.roma.goods.weapons.stock=0;
 const second=upgradeSave(structuredClone(first));
 assert.equal(second.markets.regions.roma.goods.weapons.stock,0,'migration cannot replenish a used stock');
});

test('completed metalworking enables local weapon production from finite iron',()=>{
 const s=newGame('caesar'),site=s.regions.find(r=>r.id==='gaul'),goods=s.markets.regions.gaul.goods;
 assert.equal(goods.weapons.production,0);
 site.construction={id:'metalworking',owner:'caesar',remaining:1};
 Object.assign(goods.iron,{stock:2,production:0,consumption:0});
 advanceInventions(s);
 assert.ok(site.buildings.includes('metalworking'));
 assert.equal(goods.weapons.production,1);
 advanceMarkets(s);
 assert.equal(goods.iron.usedForManufacture,1);
 assert.equal(goods.weapons.produced,1);
});
