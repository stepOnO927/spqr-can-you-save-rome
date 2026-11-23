import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=multipolar-review-1';
import {configureStartingDifficulty} from '../difficulty.js?v=multipolar-review-1';
import {NOMADIC_GENERATION_BANDS,generatedNomadicCommunities} from '../local-generation.js';
import {advanceNomadicCommunities} from '../nomadic-communities.js';
import {localEntity,localContactQuote,offerLocalContact,advanceLocalEntities,localSiegeQuote} from '../local-polities.js';
import {discoverFrontierLocalities} from '../local-discovery.js?v=multipolar-review-1';
import {explorationEntries} from '../map-lab/exploration-map.js?v=multipolar-review-1';
import {inspectState} from '../inspector-diagnostics.js?v=multipolar-review-1';
import {ROUTES} from '../data.js?v=multipolar-review-1';

const start=(mode,seed,player='senate')=>configureStartingDifficulty(newGame(player),mode,false,{localSeed:seed});
const nomads=s=>s.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.proceduralNomad);

test('seeded nomad quantity and coherent herds, followers and ranges rise with difficulty',()=>{
 for(const seed of [1,2,42,71]){
  let previous=-1;
  for(const mode of ['travel','beginner','standard','hard','expert']){
   const s=start(mode,seed),camps=nomads(s),[low,high]=NOMADIC_GENERATION_BANDS[mode];
   assert.ok(camps.length>=low&&camps.length<=high);assert.ok(camps.length>=previous);previous=camps.length;
   assert.equal(s.world.localGeneration.nomadCount,camps.length);
   assert.equal(new Set(camps.map(camp=>camp.name[0])).size,camps.length);
   for(const camp of camps){
    assert.equal(camp.historical,false);assert.equal(camp.claimedSovereignty,false);assert.equal(camp.fort,0);assert.ok(camp.population>=camp.militia*4);assert.ok(camp.herds>0&&camp.food>0&&camp.treasury>0);
    assert.equal(camp.seasonalRange[camp.rangeIndex].theater,camp.theater);
    assert.ok(ROUTES.some(([a,b,kind])=>kind!=='sea'&&(a===camp.seasonalRange[0].theater&&b===camp.seasonalRange[1].theater||b===camp.seasonalRange[0].theater&&a===camp.seasonalRange[1].theater)));
   }
   assert.equal(inspectState(s).filter(f=>f.code.includes('nomad')||f.code==='invalid-local-generation'||f.code==='invalid-local-discovery').length,0);
  }
 }
});

test('the same seasonal range samples stronger people, reserves and judgment on higher modes',()=>{
 const available=new Set(['numidia','mauretania']);
 const groups=['standard','hard','expert'].map(mode=>generatedNomadicCommunities(42,mode,available)[0]);
 for(let i=1;i<groups.length;i++){
  assert.equal(groups[i].id,groups[0].id);
  assert.ok(groups[i].population>groups[i-1].population);
  assert.ok(groups[i].militia>groups[i-1].militia);
  assert.ok(groups[i].treasury>groups[i-1].treasury);
  assert.ok(groups[i].food>=groups[i-1].food);
  assert.ok(groups[i].strategy>=groups[i-1].strategy);
 }
});

test('a mobile camp follows seasonal land points while distant viewers keep only the old sighting',()=>{
 const s=start('expert',2),camp=localEntity(s,'generated-nomad:western-pasture');assert.ok(camp);
 const old=s.localDiscovery.senate[camp.id];assert.equal(old.seenTheater,'numidia');
 s.month=4;const moves=advanceNomadicCommunities(s);assert.ok(moves.some(move=>move.id===camp.id&&move.to==='mauretania'));
 assert.equal(camp.theater,'mauretania');assert.equal(localEntity(s,camp.id),camp);
 assert.equal(advanceNomadicCommunities(s).length,0);
 discoverFrontierLocalities(s,'senate');assert.equal(s.localDiscovery.senate[camp.id].seenTheater,'numidia');
 assert.equal(explorationEntries(s,'senate').find(entry=>entry.id===camp.id).theaterId,'numidia');
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(localEntity(saved,camp.id).theater,'mauretania');
 assert.equal(saved.localDiscovery.senate[camp.id].seenTheater,'numidia');
 assert.equal(inspectState(saved).filter(f=>f.code==='invalid-generated-nomad'||f.code==='invalid-local-discovery').length,0);
 s.month=10;assert.ok(advanceNomadicCommunities(s).some(move=>move.id===camp.id&&move.to==='numidia'));
 discoverFrontierLocalities(s,'senate');assert.equal(s.localDiscovery.senate[camp.id].seenTheater,'numidia');
});

test('war blocks a migration until the destination court makes a paid pasture compact',()=>{
 const s=start('expert',2),camp=localEntity(s,'generated-nomad:western-pasture'),originalHerds=camp.herds;
 s.wars.push(['numidia','mauretania']);s.month=4;
 assert.ok(!advanceNomadicCommunities(s).some(move=>move.id===camp.id));assert.equal(camp.theater,'numidia');assert.equal(camp.herds,originalHerds-1);
 assert.equal(localContactQuote(s,camp.id,'mauretania','access').ok,false);
 assert.equal(localSiegeQuote(s,camp.id,'any','mauretania').reason,'mobile_camp');
 const price=localContactQuote(s,camp.id,'mauretania','pasture');assert.equal(price.ok,true);assert.equal(price.cost,6);
 camp.seed=0;const before=s.factions.mauretania.treasury;
 assert.equal(offerLocalContact(s,camp.id,'mauretania','pasture').ok,true);assert.equal(s.factions.mauretania.treasury,before-6);
 advanceLocalEntities(s);advanceLocalEntities(s);assert.equal(camp.lastOutcome.accepted,true);
 assert.ok(camp.pastureRights.mauretania>s.year*12+s.month);
 s.month=10;assert.ok(advanceNomadicCommunities(s).some(move=>move.id===camp.id&&move.to==='mauretania'));
 assert.equal(camp.legalSovereign,'mauretania');assert.equal(camp.controller,camp.id);assert.equal(camp.claimedSovereignty,false);
 assert.equal(inspectState(s).filter(f=>f.code==='invalid-generated-nomad').length,0);
});
