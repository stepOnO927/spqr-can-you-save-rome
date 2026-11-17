import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=world-kings-guardian-1';
import {configureStartingDifficulty} from '../difficulty.js?v=world-kings-guardian-1';
import {generatedWildernessSites} from '../local-generation.js';
import {localEntity} from '../local-polities.js';
import {wildernessSurveyQuote,startWildernessSurvey,advanceWildernessSurveys} from '../frontier-wilderness.js';
import {footholdQuote,startFoothold} from '../foothold.js';
import {localDiscoveryLevel} from '../local-discovery.js?v=world-kings-guardian-1';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-guardian-1';

const start=(seed=1)=>configureStartingDifficulty(newGame('senate'),'expert',false,{localSeed:seed});
const wilds=state=>state.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.proceduralWilderness);

test('wilderness sites are seeded, sparse, classified and never free sovereign claims',()=>{
 for(const seed of [1,2,42,71]){
  const state=start(seed),sites=wilds(state),again=wilds(start(seed));
  assert.ok(sites.length>=3&&sites.length<=4);
  assert.deepEqual(sites,again);
  assert.equal(state.world.localGeneration.wildernessCount,sites.length);
  assert.equal(new Set(sites.map(site=>site.theater)).size,sites.length);
  assert.equal(state.regions.length-sites.length>sites.length,true);
  for(const site of sites){
   const host=state.regions.find(region=>region.id===site.theater);
   assert.equal(site.controller,null);
   assert.equal(site.legalSovereign,host.owner);
   assert.equal(site.administrativeStatus,'unadministered_land');
   assert.equal(site.historical,false);
   assert.equal(site.spatialAccuracy,'fictional_approximate_point');
   assert.ok(['difficult','seasonal','impassable'].includes(site.wilderness.passability));
   assert.equal(footholdQuote(state,site.id,'senate').ok,false);
  }
  assert.equal(inspectState(state).filter(f=>f.code.startsWith('invalid-generated-wilderness')||f.code==='invalid-local-controller').length,0);
 }
 const options=generatedWildernessSites(1,new Set(['gaul']));assert.equal(options.length,1);
});

test('survey costs resources, needs a local party, pauses when it leaves and preserves legal title',()=>{
 const state=start(1),site=localEntity(state,'generated-wilderness:hispaniaN');
 assert.ok(site);const owner=site.legalSovereign,host=state.regions.find(region=>region.id===site.theater);
 const first=footholdQuote(state,site.id,'senate');assert.equal(first.reason,'no_rights');
 const party=state.armies.find(army=>army.owner==='senate'&&army.region===site.theater&&army.men>=1000);
 assert.ok(party);const treasury=state.factions.senate.treasury,food=state.factions.senate.food;
 assert.equal(startWildernessSurvey(state,site.id,'senate').ok,true);
 assert.equal(state.factions.senate.treasury,treasury-4);assert.equal(state.factions.senate.food,food-1);
 assert.equal(startWildernessSurvey(state,site.id,'senate').reason,'busy');
 party.region='italiaN';state.month=2;assert.equal(advanceWildernessSurveys(state).length,0);assert.equal(site.wilderness.surveyProject.remaining,2);
 party.region=site.theater;assert.equal(advanceWildernessSurveys(state).length,0);assert.equal(site.wilderness.surveyProject.remaining,1);
 assert.equal(advanceWildernessSurveys(state).length,0);assert.equal(site.wilderness.surveyProject.remaining,1);
 state.month=3;assert.deepEqual(advanceWildernessSurveys(state),[{id:site.id,actor:'senate',theater:site.theater}]);
 assert.equal(site.wilderness.surveyProject,null);assert.ok(site.wilderness.surveyedBy.senate);
 assert.equal(localDiscoveryLevel(state,'senate',site.id),4);
 assert.equal(site.controller,null);assert.equal(site.legalSovereign,owner);assert.equal(host.owner,owner);
 assert.equal(footholdQuote(state,site.id,'senate').ok,true);
 assert.equal(startFoothold(state,site.id,'senate').ok,true);
 assert.equal(site.foothold.owner,'senate');assert.equal(site.foothold.level,0);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(localEntity(loaded,site.id),site);
 assert.equal(footholdQuote(loaded,site.id,'senate').reason,'in_progress');
 assert.equal(inspectState(loaded).filter(f=>f.code.startsWith('invalid-generated-wilderness')||f.code==='invalid-local-controller').length,0);
});

test('impassable local features cannot be surveyed or settled',()=>{
 const state=start(1),site=localEntity(state,'generated-wilderness:media');assert.ok(site);
 state.armies.push({owner:'senate',region:'media',men:2000,move:null});
 assert.equal(wildernessSurveyQuote(state,site.id,'senate').reason,'unavailable');
 assert.equal(startWildernessSurvey(state,site.id,'senate').ok,false);
 assert.equal(footholdQuote(state,site.id,'senate').reason,'maximum');
 assert.equal(site.maxFootholdLevel,0);
});
