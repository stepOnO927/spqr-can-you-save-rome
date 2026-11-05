import test from 'node:test';
import assert from 'node:assert/strict';
import {GRAND_SITES,GRAND_ROUTES,GRAND_GROUPS} from './grand-map-data.js';
import {newGame,newGrandGame,convertToGrandMap,upgradeSave,previewMarch,moveArmy,tick} from './engine.js';
import {grandAdjacent,armySupply,encircled,holdPosition,strategicRetreat,flankFactor} from './grand-operations.js';
import grandPolygons from './grand-territory-polygons.js';

test('120 actual territories, 30 in Italy and Sicily, each with a bounded map polygon and graph entry',()=>{
 const s=newGrandGame('senate'),italian=['cisalpine','italiaN','roma','italiaS','sicilia'];assert.equal(s.regions.length,120);assert.equal(italian.reduce((n,id)=>n+GRAND_GROUPS[id].length,0),30);assert.equal(grandPolygons.features.length,120);const ids=new Set(s.regions.map(r=>r.id));
 for(const r of s.regions){assert.ok(Number.isFinite(r.lon)&&Number.isFinite(r.lat));assert.ok(ids.has(r.macro));assert.ok(r.population>0);assert.ok(grandAdjacent(r.id).length>0);assert.ok(grandPolygons.features.some(f=>f.properties.id===r.id&&f.geometry.coordinates.length))}
 for(const [a,b,kind] of GRAND_ROUTES){assert.ok(ids.has(a)&&ids.has(b));if(kind==='sea'){assert.equal(s.regions.find(r=>r.id===a).port,true);assert.equal(s.regions.find(r=>r.id===b).port,true)}}
 const seen=new Set([s.regions[0].id]),queue=[s.regions[0].id];while(queue.length)for(const e of grandAdjacent(queue.shift()))if(!seen.has(e.to)){seen.add(e.to);queue.push(e.to)}assert.equal(seen.size,120);
});
test('multi territory march travels leg by leg and plans realistic time',()=>{
 const s=newGrandGame('caesar'),plan=previewMarch(s,'xiii','roma');assert.equal(plan.ok,true);assert.ok(plan.path.length>=3);const start=s.armies.find(a=>a.id==='xiii');assert.equal(start.region,'cisalpine');const out=moveArmy(s,'xiii','roma');assert.equal(out.ok,true);assert.equal(start.move.to,plan.path[0].id);tick(s);assert.notEqual(start.region,'roma');assert.ok(start.move||start.region===plan.path[0].id);
});
test('cut supply creates encirclement and real attrition; hold and retreat obey map',()=>{
 const s=newGrandGame('caesar'),a=s.armies.find(x=>x.id==='xiii');a.region='t005';a.move=null;a.siege=null;assert.equal(holdPosition(s,a.id).ok,true);tick(s);assert.ok(a.prepared>=1);const exit=grandAdjacent(a.region).find(e=>!e.sea&&s.regions.find(r=>r.id===e.to).owner===a.owner);assert.ok(exit);assert.equal(strategicRetreat(s,a.id,exit.to).ok,true);
 const isolated=s.armies.find(x=>x.id==='xiii');isolated.region='t005';for(const r of s.regions)if(r.id!==isolated.region&&r.owner==='caesar')r.owner='senate';assert.equal(encircled(s,isolated),true);assert.ok(armySupply(s,isolated)<.5);const men=isolated.men;tick(s);assert.ok(isolated.men<men);assert.equal(strategicRetreat(s,isolated.id,exit.to).ok,false);
});
test('flanking requires distinct friendly attack directions and explicit coordination',()=>{
 const s=newGrandGame('caesar'),target=s.regions.find(r=>r.id==='italiaN'),attack=s.armies.find(a=>a.id==='xiii'),approach=grandAdjacent(target.id).filter(e=>!e.sea&&e.to!==attack.region);assert.ok(approach.length);s.armies.push({id:'support-test',owner:'caesar',region:approach[0].to,men:2500,move:null});assert.equal(flankFactor(s,attack,target),1);attack.coordinated=true;assert.equal(flankFactor(s,attack,target),1.06);
});
test('legacy save migration preserves political state, characters, intelligence and armies',()=>{
 const old=newGame('senate');old.regions.find(r=>r.id==='roma').loyalty=31;old.factions.senate.treasury=77;old.log.push({year:-49,month:1,en:'test',zh:'测试'});const name=old.world.characters.cicero.name;old.armies.find(a=>a.id==='xiii').move={to:'roma',remaining:1,sea:false};const converted=convertToGrandMap(structuredClone(old));assert.equal(converted.regions.length,120);assert.equal(converted.regions.find(r=>r.id==='roma').loyalty,31);assert.equal(converted.factions.senate.treasury,77);assert.equal(converted.world.characters.cicero.name,name);assert.equal(converted.log.at(-1).en,'test');assert.notEqual(converted.armies.find(a=>a.id==='xiii').move.to,'roma');assert.equal(upgradeSave(structuredClone(converted)).regions.length,120);assert.equal(old.regions.length,22);
});
test('both factions survive a 36 month long campaign with combat and AI movement',()=>{
 for(const faction of ['caesar','senate']){const s=newGrandGame(faction);for(let i=0;i<36;i++)tick(s);assert.equal(s.year,-46);assert.equal(s.month,1);assert.equal(s.regions.length,120);assert.ok(s.battles.length>0);assert.ok(s.log.length>10)}
});
