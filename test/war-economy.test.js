import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,forecastEconomy,projectTaxPath,upgradeSave} from '../engine.js?v=born-portraits-eleven-1';
import {advanceMarkets} from '../trade-markets.js?v=born-portraits-eleven-1';
import {newHanGame,tick as tickHan,loadHanSave,serialize} from '../han/engine.js?v=born-portraits-eleven-1';
import {advanceEasternMarkets} from '../han/markets.js?v=born-portraits-eleven-1';
import {agriculturalDisruption,agriculturalProduction,grainProvisionFactor} from '../war-economy.js?v=born-portraits-eleven-1';

test('scarce owned grain raises Roman army costs in both forecast and actual budget',()=>{
 const ample=newGame('caesar'),scarce=upgradeSave(structuredClone(ample));
 for(const r of ample.regions.filter(r=>r.owner==='caesar'))ample.markets.regions[r.id].goods.grain.stock=80;
 for(const r of scarce.regions.filter(r=>r.owner==='caesar'))scarce.markets.regions[r.id].goods.grain.stock=0;
 assert.ok(grainProvisionFactor(scarce,'caesar','gaul',scarce.markets)>grainProvisionFactor(ample,'caesar','gaul',ample.markets));
 assert.ok(forecastEconomy(scarce).treasury<forecastEconomy(ample).treasury);
 assert.equal(projectTaxPath(scarce,'caesar','normal',1)[0].treasury,forecastEconomy(scarce).treasury);
 assert.ok(projectTaxPath(scarce,'caesar','normal',1)[0].treasury<projectTaxPath(ample,'caesar','normal',1)[0].treasury);
});

test('Han military provisioning responds to its own grain price without reading a foreign warehouse',()=>{
 const ample=newHanGame('han',{seed:49}),scarce=loadHanSave(serialize(ample));
 for(const r of ample.regions.filter(r=>r.owner==='han'))ample.tradeMarkets.regions[r.id].goods.grain.stock=80;
 for(const r of scarce.regions.filter(r=>r.owner==='han'))scarce.tradeMarkets.regions[r.id].goods.grain.stock=0;
 assert.ok(grainProvisionFactor(scarce,'han','changan',scarce.tradeMarkets)>grainProvisionFactor(ample,'han','changan',ample.tradeMarkets));
 const abroad=grainProvisionFactor(scarce,'han','kangju',scarce.tradeMarkets);
 scarce.tradeMarkets.regions.kangju.goods.grain.stock=999999;
 assert.equal(grainProvisionFactor(scarce,'han','kangju',scarce.tradeMarkets),abroad);
 tickHan(ample);tickHan(scarce);
 assert.ok(scarce.factions.han.treasury<ample.factions.han.treasury);
 assert.equal(loadHanSave(serialize(scarce)).factions.han.treasury,scarce.factions.han.treasury);
});

test('Roman siege reduces only the besieged province harvest, market stock, and faction food',()=>{
 const peaceful=newGame('caesar'),sieged=upgradeSave(structuredClone(peaceful));
 const raider=sieged.armies.find(a=>a.id==='xiii');
 raider.siege={region:'africa',remaining:3};
 const province=sieged.regions.find(r=>r.id==='africa');
 assert.equal(agriculturalDisruption(sieged,province),true);
 assert.equal(agriculturalProduction(sieged,province,province.food),Math.floor(province.food/2));
 assert.equal(forecastEconomy(sieged,'senate').food<forecastEconomy(peaceful,'senate').food,true);
 assert.equal(agriculturalDisruption(sieged,sieged.regions.find(r=>r.id==='roma')),false);
 for(const s of [peaceful,sieged])s.markets.regions.africa.goods.grain.stock=9;
 advanceMarkets(peaceful);advanceMarkets(sieged);
 const full=peaceful.markets.regions.africa.goods.grain,damaged=sieged.markets.regions.africa.goods.grain;
 assert.equal(damaged.warDisrupted,true);
 assert.equal(damaged.produced,Math.floor(full.production/2));
 assert.equal(full.produced,full.production);
 assert.equal(damaged.stock,9+damaged.produced-damaged.consumed-(damaged.usedForManufacture||0));
 assert.equal(damaged.usedForManufacture,sieged.markets.regions.africa.goods.provisions.produced);
 assert.equal(damaged.stock<full.stock,true);
 assert.equal(damaged.price>=full.price,true);
 const prior=damaged.produced;advanceMarkets(sieged);assert.equal(damaged.produced,prior,'same month cannot produce twice');
 const restored=upgradeSave(structuredClone(sieged));
 assert.equal(restored.markets.regions.africa.goods.grain.produced,damaged.produced);
 assert.equal(restored.markets.regions.africa.goods.grain.warDisrupted,true);
});

test('Han hostile occupation reduces local grain while a distant war leaves farms unchanged',()=>{
 const peaceful=newHanGame('han',{seed:49}),occupied=loadHanSave(serialize(peaceful));
 occupied.wars.push(['han','zhizhi']);
 const raider=occupied.armies.find(a=>a.owner==='zhizhi'&&a.men>0);
 raider.region='changan';raider.move=null;
 const capital=occupied.regions.find(r=>r.id==='changan');
 assert.equal(agriculturalDisruption(occupied,capital),true);
 assert.equal(agriculturalDisruption(occupied,occupied.regions.find(r=>r.id==='shu')),false);
 assert.equal(agriculturalProduction(occupied,capital,capital.grain),Math.floor(capital.grain/2));
 for(const s of [peaceful,occupied])s.tradeMarkets.regions.changan.goods.grain.stock=8;
 advanceEasternMarkets(peaceful);advanceEasternMarkets(occupied);
 const full=peaceful.tradeMarkets.regions.changan.goods.grain,damaged=occupied.tradeMarkets.regions.changan.goods.grain;
 assert.equal(damaged.warDisrupted,true);
 assert.equal(damaged.produced,Math.floor(full.production/2));
 assert.equal(damaged.stock,8+damaged.produced-damaged.consumed-(damaged.usedForManufacture||0));
 assert.equal(damaged.usedForManufacture,occupied.tradeMarkets.regions.changan.goods.provisions.produced);
 assert.equal(damaged.stock<full.stock,true);
 assert.equal(damaged.price>=full.price,true);
 const prior=damaged.produced;advanceEasternMarkets(occupied);assert.equal(damaged.produced,prior);
 const restored=loadHanSave(serialize(occupied));
 assert.equal(restored.tradeMarkets.regions.changan.goods.grain.produced,damaged.produced);
 assert.equal(restored.tradeMarkets.regions.changan.goods.grain.warDisrupted,true);
});

test('a march or a war in another theater does not disrupt agriculture',()=>{
 const s=newGame('caesar'),province=s.regions.find(r=>r.id==='africa'),raider=s.armies.find(a=>a.id==='xiii');
 assert.equal(agriculturalDisruption(s,province),false);
 raider.region=province.id;raider.move={to:'roma',remaining:1};
 assert.equal(agriculturalDisruption(s,province),false);
 raider.move=null;assert.equal(agriculturalDisruption(s,province),true);
 s.wars=[];assert.equal(agriculturalDisruption(s,province),false);
});
