import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,recruit,recruitEquipmentStock,provisionRomanArmy} from '../engine.js?v=succession-lead-1';
import {templatesFor,recruitFormation,recruitmentQuote} from '../legion-designer.js?v=succession-lead-1';
import {advanceMarkets,placeTradeOrder} from '../trade-markets.js?v=faces-wheels-1';
import {COMMODITIES} from '../market-goods.js?v=faces-wheels-1';
import {advanceInventions} from '../inventions.js?v=mission-discount-1';

const next=s=>{if(++s.month>12){s.month=1;s.year++}advanceMarkets(s)};

test('ordinary Roman levies require delivered local weapons and debit them exactly once',()=>{
 let s=newGame('caesar');const faction=s.factions.caesar,local=s.markets.regions.cisalpine.goods.weapons;
 const source=s.markets.regions.gaul.goods.weapons;
 local.stock=0;local.production=0;source.stock=1;source.production=0;
 const before={treasury:faction.treasury,food:faction.food,manpower:faction.manpower,armies:s.armies.length};
 assert.equal(recruitEquipmentStock(s,'cisalpine','caesar'),0);
 assert.equal(recruitEquipmentStock(s,'roma','caesar'),null,'foreign depot stock stays hidden');
 assert.equal(recruit(s,'cisalpine'),false);
 assert.equal(faction.treasury,before.treasury);assert.equal(faction.food,before.food);
 assert.equal(faction.manpower,before.manpower);assert.equal(s.armies.length,before.armies);
 const order=placeTradeOrder(s,{seller:'caesar',buyer:'caesar',origin:'gaul',destination:'cisalpine',commodity:'weapons',quantity:1});
 assert.equal(order.ok,true,order.reason);assert.equal(recruit(s,'cisalpine'),false,'in-flight cargo cannot equip troops');
 s=upgradeSave(structuredClone(s));for(let i=0;i<order.quote.months;i++)next(s);
 assert.equal(s.markets.shipments.find(x=>x.id===order.shipment.id).status,'delivered');
 assert.equal(recruitEquipmentStock(s,'cisalpine','caesar'),1);
 assert.equal(recruit(s,'cisalpine'),true);
 const unit=s.armies.at(-1),item=s.markets.regions.cisalpine.goods.weapons;
 assert.deepEqual(unit.equipmentMaterials,{weapons:1});assert.equal(item.stock,0);
 assert.equal(item.usedForRecruitment,1);assert.equal(s.armies.length,before.armies+1);
 const saved=upgradeSave(structuredClone(s));assert.equal(saved.markets.regions.cisalpine.goods.weapons.stock,0);
 assert.equal(saved.armies.at(-1).equipmentMaterials.weapons,1);
 assert.equal(recruit(saved,'cisalpine'),false,'the same batch cannot equip another levy');
});

test('non-Roman local levies do not require Roman equipment stock',()=>{
 const s=newGame('egypt');s.markets.regions.egypt.goods.weapons.stock=0;
 assert.equal(recruitEquipmentStock(s,'egypt','egypt'),null);
 assert.equal(recruit(s,'egypt'),true);
 assert.equal(s.armies.at(-1).equipmentMaterials,undefined);
});

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

test('Roman field rations move from a local depot into a saved army and reduce real famine losses',()=>{
 const s=newGame('caesar');s.wars=[];
 const army=s.armies.find(a=>a.id==='xiii'),goods=s.markets.regions.cisalpine.goods.provisions;
 goods.stock=2;goods.production=0;
 assert.equal(provisionRomanArmy(s,'senate',army.id).reason,'invalid','a rival cannot load this army');
 assert.equal(provisionRomanArmy(s,'caesar',army.id,3).reason,'provisions','empty stock cannot be borrowed');
 assert.equal(provisionRomanArmy(s,'caesar',army.id,2).ok,true);
 assert.equal(goods.stock,0);assert.equal(goods.usedForMilitary,2);
 assert.equal(army.fieldRations,12000);
 const dry=upgradeSave(structuredClone(s));dry.armies.find(a=>a.id==='xiii').fieldRations=0;
 const saved=upgradeSave(structuredClone(s));
 assert.equal(saved.armies.find(a=>a.id==='xiii').fieldRations,12000);
 for(const game of [saved,dry])game.factions.caesar.food=-100;
 tick(saved);tick(dry);
 const fed=saved.armies.find(a=>a.id==='xiii'),unfed=dry.armies.find(a=>a.id==='xiii');
 assert.ok(fed.men>unfed.men,'finite rations prevent actual starvation deaths');
 assert.equal(fed.provisionsUsed,7200);assert.equal(fed.fieldRations,4800);
 assert.ok(saved.log.some(entry=>entry.zh?.includes('避免了')&&entry.zh.includes('缺粮减员')),'the turn report explains the real effect');
 assert.equal(unfed.fieldRations,0);
});

test('Roman rations cannot be loaded while marching or from a lost depot',()=>{
 const s=newGame('caesar'),army=s.armies.find(a=>a.id==='xiii'),item=s.markets.regions.cisalpine.goods.provisions;
 const before=item.stock;army.move={to:'italiaN',remaining:2};
 assert.equal(provisionRomanArmy(s,'caesar',army.id).reason,'invalid');
 assert.equal(item.stock,before);army.move=null;
 s.regions.find(r=>r.id==='cisalpine').owner='senate';
 assert.equal(provisionRomanArmy(s,'caesar',army.id).reason,'invalid');
 assert.equal(item.stock,before);
 s.regions.find(r=>r.id==='cisalpine').owner='caesar';
 army.fieldRations=army.men*6+6000;
 assert.equal(provisionRomanArmy(s,'caesar',army.id).reason,'capacity');
 assert.equal(item.stock,before);
});
