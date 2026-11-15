import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=world-kings-trade-1';
import {configureStartingDifficulty} from '../difficulty.js?v=world-kings-trade-1';
import {LOCAL_GENERATION_BANDS} from '../local-generation.js';
import {localOfferChance,advanceLocalEntities} from '../local-polities.js';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-trade-1';

const start=(mode,seed)=>configureStartingDifficulty(newGame('caesar'),mode,false,{localSeed:seed});
const generated=s=>s.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.procedural);

test('difficulty raises generated polity counts and coherent population, militia and resource bands',()=>{
 const modes=['travel','beginner','standard','hard','expert'];
 for(const seed of [1,42,305419896,4000000000]){
  let previous=0,previousAnchor=null;
  for(const mode of modes){
   const s=start(mode,seed),entities=generated(s),band=LOCAL_GENERATION_BANDS[mode],anchor=s.regions.flatMap(r=>r.localEntities||[]).find(e=>e.id==='massilia');
   assert.ok(entities.length>=band.count[0]&&entities.length<=band.count[1]);assert.ok(entities.length>previous);previous=entities.length;
   assert.equal(s.world.localGeneration.count,entities.length);assert.equal(s.world.localGeneration.seed,seed);
   assert.equal(new Set(entities.map(e=>e.name[0])).size,entities.length);
   if(entities.length>=3)assert.deepEqual(new Set(entities.map(e=>e.type)),new Set(['city_state','microstate','tribe']));
   for(const e of entities){assert.equal(e.historical,false);assert.equal(e.spatialAccuracy,'fictional_approximate_point');assert.equal(e.controller,e.id);assert.ok(e.population>=e.militia*4);assert.ok(e.food>0&&e.treasury>0);assert.ok(e.strategy>=band.skill[0]&&e.strategy<=band.skill[1]);assert.ok(s.regions.some(r=>r.id===e.theater&&r.localEntities.includes(e)))}
   if(previousAnchor){assert.ok(anchor.population>previousAnchor.population);assert.ok(anchor.militia>previousAnchor.militia);assert.ok(anchor.treasury>previousAnchor.treasury);assert.ok(anchor.food>previousAnchor.food)}
   previousAnchor=anchor;
   assert.equal(inspectState(s).filter(f=>f.code==='invalid-generated-polity'||f.code==='invalid-local-generation').length,0);
  }
 }
});

test('campaigns vary by seed, replay the same seed, and keep all generated values through saves',()=>{
 const first=start('standard',71),again=start('standard',71),other=start('standard',72);
 assert.deepEqual(generated(first),generated(again));
 assert.notDeepEqual(generated(first).map(e=>e.name),generated(other).map(e=>e.name));
 const saved=upgradeSave(JSON.parse(JSON.stringify(first)));
 assert.deepEqual(generated(saved),generated(first));assert.deepEqual(saved.world.localGeneration,first.world.localGeneration);
 const legacy=newGame('caesar');const upgraded=upgradeSave(JSON.parse(JSON.stringify(legacy)));
 assert.equal(generated(upgraded).length,0);assert.equal(upgraded.world.localGeneration,undefined);
});

test('higher council skill weighs local strength and nearby military pressure in negotiations',()=>{
 const s=start('expert',100),e=generated(s)[0];
 e.strategy=1;e.treasury=40;
 const noPressure=localOfferChance(s,e,'caesar','protectorate');
 e.strategy=5;assert.ok(localOfferChance(s,e,'caesar','protectorate')<noPressure);
 s.armies.push({owner:'caesar',region:e.theater,men:e.militia*3,move:null});
 const underPressure=localOfferChance(s,e,'caesar','protectorate');
 assert.ok(underPressure>noPressure);
});

test('capable local councils spend their own reserves to mobilize under a stronger nearby army',()=>{
 const s=start('expert',2),e=generated(s)[0];e.strategy=5;e.treasury=Math.max(20,e.treasury);e.food=Math.max(10,e.food);
 s.armies.push({owner:'caesar',region:e.theater,men:e.militia*3,move:null});s.month=3;
 const before={militia:e.militia,treasury:e.treasury,food:e.food};advanceLocalEntities(s);
 assert.ok(e.militia>before.militia);assert.ok(e.militia<=Math.floor(e.population*.22));
 assert.equal(e.treasury,before.treasury-4);assert.equal(e.food,before.food-2);
 assert.deepEqual(e.lastMobilized,{year:s.year,month:3});
 const after={militia:e.militia,treasury:e.treasury,food:e.food};advanceLocalEntities(s);
 assert.deepEqual({militia:e.militia,treasury:e.treasury,food:e.food},after);
 e.strategy=1;advanceLocalEntities(s);
 assert.deepEqual({militia:e.militia,treasury:e.treasury,food:e.food},after);
});

test('a well funded council can improve its fort once in a quiet year',()=>{
 const s=start('expert',2),e=generated(s)[0];s.armies=s.armies.filter(army=>army.region!==e.theater);
 e.strategy=5;e.fort=1;e.treasury=30;e.food=10;s.month=12;
 advanceLocalEntities(s);assert.equal(e.fort,2);assert.equal(e.treasury,18);assert.equal(e.food,8);
 advanceLocalEntities(s);assert.equal(e.fort,2);assert.equal(e.treasury,18);assert.equal(e.food,8);
});
