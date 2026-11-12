import test from 'node:test';
import assert from 'node:assert/strict';
import {newHanGame,tick,loadHanSave,serialize} from '../han/engine.js';

test('a conquered player realm settles once and the date cannot advance afterward',()=>{
 const s=newHanGame('shanshan',{seed:20});
 for(const r of s.regions)if(r.owner==='shanshan')r.owner='zhizhi';
 s.armies=s.armies.filter(a=>a.owner!=='shanshan');
 tick(s);assert.equal(s.finalized?.outcome,'defeat');assert.equal(s.finalized.reason,'conquest');
 const date=[s.year,s.month],finales=s.log.filter(e=>e.kind==='finale').length;
 tick(s);assert.deepEqual([s.year,s.month],date);assert.equal(s.log.filter(e=>e.kind==='finale').length,finales);
 assert.deepEqual(loadHanSave(serialize(s)).finalized,s.finalized);
});

test('six wartime months without any player field army end in a battle summary',()=>{
 const s=newHanGame('han',{seed:22});s.armies=s.armies.filter(a=>a.owner!=='han');s.wars=[['han','zhizhi']];
 for(let i=0;i<5;i++){tick(s);assert.equal(s.finalized,null)}
 assert.equal(s.noArmyWarMonths,5);
 tick(s);assert.equal(s.finalized?.reason,'army_collapse');assert.equal(s.finalized.armies,0);
 assert.ok(s.log.some(e=>e.kind==='warning'));assert.equal(s.log.at(-1).kind,'finale');
});

test('an army-free peace remains recoverable and an older impossible save settles on load',()=>{
 const s=newHanGame('han',{seed:23});s.armies=s.armies.filter(a=>a.owner!=='han');s.wars=[];
 for(let i=0;i<8;i++)tick(s);
 assert.equal(s.finalized,null);assert.equal(s.noArmyWarMonths,0);
 const old=newHanGame('shanshan',{seed:24});for(const r of old.regions)if(r.owner==='shanshan')r.owner='zhizhi';old.armies=old.armies.filter(a=>a.owner!=='shanshan');
 delete old.noArmyWarMonths;delete old.territorylessMonths;
 const restored=loadHanSave(serialize(old));assert.equal(restored.finalized?.reason,'conquest');
});

test('actual siege loss records the lost region for a visible warning',()=>{
 const s=newHanGame('shanshan',{seed:25});s.armies=s.armies.filter(a=>a.owner!=='shanshan');s.wars=[['shanshan','zhizhi']];
 const r=s.regions.find(r=>r.id==='shanshan');r.fort=0;
 const invader=s.armies.find(a=>a.owner==='zhizhi');invader.region='shanshan';invader.move=null;
 tick(s);
 assert.equal(r.owner,'zhizhi');assert.equal(s.lastPlayerTerritoryLoss?.region,'shanshan');
 assert.equal(s.lastPlayerTerritoryLoss?.to,'zhizhi');
});
