import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-reported-names-1';
import {newHanGame,loadHanSave} from '../han/engine.js?v=faces-reported-names-1';
import {MATERIALS,canConstruct,startConstruction} from '../inventions.js?v=faces-reported-names-1';
import {placeTradeOrder,advanceMarkets} from '../trade-markets.js?v=faces-reported-names-1';
import {placeEasternTrade,advanceEasternMarkets} from '../han/markets.js?v=faces-reported-names-1';
import {advanceDate} from '../han/util.js?v=faces-reported-names-1';
import {COMMODITIES,marketPrice} from '../market-goods.js?v=faces-reported-names-1';

test('quarried stone is a measured good in both campaigns and old saves',()=>{
 assert.deepEqual(COMMODITIES.stone.unit,['20 tons','二十吨']);
 let roman=newGame('senate');const treasury=roman.factions.senate.treasury;
 for(const market of Object.values(roman.markets.regions))delete market.goods.stone;
 roman=upgradeSave(structuredClone(roman));
 assert.equal(roman.factions.senate.treasury,treasury);
 assert.ok(roman.markets.regions.italiaS.goods.stone.production>0);
 assert.equal(roman.markets.regions.roma.goods.stone.production,0);
 assert.ok(MATERIALS.find(x=>x.id==='bridges').stoneCost>0);
 let han=newHanGame('han',{seed:49});const hanCash=han.factions.han.treasury;
 for(const market of Object.values(han.tradeMarkets.regions))delete market.goods.stone;
 han=loadHanSave(structuredClone(han));
 assert.equal(han.factions.han.treasury,hanCash);
 assert.ok(han.tradeMarkets.regions.hongnong.goods.stone.production>0);
 assert.equal(han.tradeMarkets.regions.changan.goods.stone.production,0);
});

test('a bridge needs delivered local stone and consumes the exact paid batch once',()=>{
 let s=newGame('senate');s.inventions.senate.knownMaterial.push('bridges');
 const source=s.markets.regions.italiaS.goods.stone,destination=s.markets.regions.roma.goods.stone;
 Object.assign(source,{stock:10,production:0,consumption:0});Object.assign(destination,{stock:0,production:0,consumption:0});
 const cash=s.factions.senate.treasury,manpower=s.factions.senate.manpower;
 assert.equal(canConstruct(s,'senate','roma','bridges'),'stone');
 assert.equal(startConstruction(s,'senate','roma','bridges').reason,'stone');
 assert.equal(s.factions.senate.treasury,cash);assert.equal(s.factions.senate.manpower,manpower);
 const order=placeTradeOrder(s,{seller:'senate',buyer:'senate',origin:'italiaS',destination:'roma',commodity:'stone',quantity:2});
 assert.equal(order.ok,true,order.reason);assert.equal(destination.stock,0);assert.equal(source.stock,8);
 s=upgradeSave(structuredClone(s));advanceDate(s);advanceMarkets(s);
 const shipment=s.markets.shipments.find(x=>x.id===order.shipment.id),local=s.markets.regions.roma.goods.stone;
 assert.equal(shipment.status,'delivered');assert.equal(local.stock,2);
 assert.equal(startConstruction(s,'senate','roma','bridges').ok,true);
 assert.equal(local.stock,0);assert.equal(local.usedForConstruction,2);
 assert.equal(s.regions.find(r=>r.id==='roma').construction.materials.stone,2);
 assert.ok(marketPrice(s.markets.regions.roma,'stone')>marketPrice(s.markets.regions.italiaS,'stone'));
 s=upgradeSave(structuredClone(s));advanceDate(s);advanceMarkets(s);
 assert.equal(s.markets.regions.roma.goods.stone.stock,0);
 assert.equal(s.markets.regions.roma.goods.stone.usedForConstruction,2);
 assert.equal(s.markets.transactions.filter(x=>x.shipment===shipment.id).length,1);
});

test('Han quarry stone takes an actual route to the capital',()=>{
 let s=newHanGame('han',{seed:49});
 const source=s.tradeMarkets.regions.hongnong.goods.stone,destination=s.tradeMarkets.regions.changan.goods.stone;
 Object.assign(source,{stock:4,production:0,consumption:0});Object.assign(destination,{stock:0,production:0,consumption:0});
 const order=placeEasternTrade(s,{seller:'han',buyer:'han',origin:'hongnong',destination:'changan',commodity:'stone',quantity:2});
 assert.equal(order.ok,true,order.reason);assert.equal(destination.stock,0);assert.equal(source.stock,2);
 s=loadHanSave(structuredClone(s));
 for(let i=0;i<order.quote.months;i++){advanceDate(s);advanceEasternMarkets(s)}
 assert.equal(s.tradeMarkets.shipments.find(x=>x.id===order.shipment.id).status,'delivered');
 assert.equal(s.tradeMarkets.regions.changan.goods.stone.stock,2);
 assert.equal(s.tradeMarkets.transactions.filter(x=>x.shipment===order.shipment.id).length,1);
});
