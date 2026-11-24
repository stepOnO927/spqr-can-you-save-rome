import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=faces-name-disagreement-1';
import {MATERIALS,advanceInventions,buildingModifiers,canConstruct,startConstruction,startResearch} from '../inventions.js?v=mission-discount-1';
import {advanceMarkets} from '../trade-markets.js?v=faces-import-legs-1';
import {advanceReligion} from '../religion.js?v=faces-name-disagreement-1';

const complete=(s,region)=>{while(region.construction)advanceInventions(s)};

test('quarry works need a real stone source and increase measured stone output once',()=>{
 let s=newGame('senate'),source=s.regions.find(r=>r.id==='italiaS');
 s.inventions.senate.knownMaterial.push('quarries');
 assert.equal(canConstruct(s,'senate','roma','quarries'),'site');
 const before=s.markets.regions.italiaS.goods.stone.production,cash=s.factions.senate.treasury;
 assert.equal(startConstruction(s,'senate',source.id,'quarries').ok,true);
 assert.equal(s.factions.senate.treasury,cash-MATERIALS.find(x=>x.id==='quarries').buildCost);
 assert.equal(s.markets.regions.italiaS.goods.stone.production,before);
 complete(s,source);
 assert.equal(s.markets.regions.italiaS.goods.stone.production,before+1);
 s=upgradeSave(structuredClone(s));
 assert.equal(s.markets.regions.italiaS.goods.stone.production,before+1);
 advanceInventions(s);
 assert.equal(s.markets.regions.italiaS.goods.stone.production,before+1);
});

test('a completed urban market hall increases the actual local stock ceiling',()=>{
 const s=newGame('senate'),rome=s.regions.find(r=>r.id==='roma');
 s.inventions.senate.knownMaterial.push('market_halls');
 assert.equal(canConstruct(s,'senate','italiaS','market_halls'),'site');
 assert.equal(startConstruction(s,'senate','roma','market_halls').ok,true);complete(s,rome);
 assert.equal(buildingModifiers(rome).storage,20);
 const control=structuredClone(s);
 control.regions.find(r=>r.id==='roma').buildings=[];
 for(const state of [s,control]){const good=state.markets.regions.roma.goods.grain;Object.assign(good,{stock:100,production:0,consumption:0});state.month++;advanceMarkets(state)}
 assert.equal(s.markets.regions.roma.goods.grain.stock-control.markets.regions.roma.goods.grain.stock,20);
 assert.ok(s.markets.regions.roma.goods.grain.stock<=100);
});

test('an urban scholarly collection speeds later research and public baths improve annual satisfaction',()=>{
 const s=newGame('senate'),rome=s.regions.find(r=>r.id==='roma');
 s.markets.regions.roma.goods.stone.stock=3;
 s.inventions.senate.knownMaterial.push('archives','baths','water');
 assert.equal(startConstruction(s,'senate','roma','archives').ok,true);complete(s,rome);
 const control=structuredClone(s);control.regions.find(r=>r.id==='roma').buildings=[];
 assert.equal(startResearch(control,'senate','sewers').remaining-startResearch(s,'senate','sewers').remaining,1);
 s.inventions.senate.research=null;
 assert.equal(startConstruction(s,'senate','roma','baths').ok,true);complete(s,rome);
 assert.equal(buildingModifiers(rome).satisfaction,2);
 const withoutBaths=structuredClone(s);withoutBaths.regions.find(r=>r.id==='roma').buildings=withoutBaths.regions.find(r=>r.id==='roma').buildings.filter(id=>id!=='baths');
 s.month=12;withoutBaths.month=12;advanceReligion(s);advanceReligion(withoutBaths);
 assert.equal(rome.population.satisfaction,withoutBaths.regions.find(r=>r.id==='roma').population.satisfaction+2);
});

test('a civic record office raises real local tax and loyalty while charging upkeep',()=>{
 const s=newGame('senate'),rome=s.regions.find(r=>r.id==='roma');
 s.inventions.senate.knownMaterial.push('civic_offices');
 const item=MATERIALS.find(x=>x.id==='civic_offices');
 assert.ok(item.source.startsWith('https://')&&item.image.startsWith('data:image/svg+xml,'));
 assert.equal(startConstruction(s,'senate','roma','civic_offices').ok,true);complete(s,rome);
 assert.deepEqual({tax:buildingModifiers(rome).tax,loyalty:buildingModifiers(rome).loyalty,upkeep:buildingModifiers(rome).upkeep},{tax:1,loyalty:1,upkeep:1});
});
