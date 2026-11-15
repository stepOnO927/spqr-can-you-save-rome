import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=world-kings-trade-1';
import {configureStartingDifficulty} from '../difficulty.js?v=world-kings-trade-1';
import {LOCAL_GENERATION_BANDS} from '../local-generation.js';
import {localOfferChance,advanceLocalEntities,localEntity,offerLocalContact,localSiegeQuote,besiegeLocalEntity} from '../local-polities.js';
import {advanceVillages} from '../local-villages.js';
import {advanceLocalResistance} from '../local-resistance.js';
import {receivedMail,replyToLetter} from '../epistulae.js?v=world-kings-trade-1';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-trade-1';

const start=(mode,seed)=>configureStartingDifficulty(newGame('caesar'),mode,false,{localSeed:seed});
const generated=s=>s.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.procedural&&!entity.proceduralVillage);
const villages=s=>s.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.proceduralVillage);

test('difficulty raises generated polity counts and coherent population, militia and resource bands',()=>{
 const modes=['travel','beginner','standard','hard','expert'];
 for(const seed of [1,42,305419896,4000000000]){
  let previous=0,previousAnchor=null;
  for(const mode of modes){
   const s=start(mode,seed),entities=generated(s),band=LOCAL_GENERATION_BANDS[mode],anchor=s.regions.flatMap(r=>r.localEntities||[]).find(e=>e.id==='massilia');
   assert.ok(entities.length>=band.count[0]&&entities.length<=band.count[1]);assert.ok(entities.length>previous);previous=entities.length;
   assert.equal(s.world.localGeneration.count,entities.length);assert.equal(s.world.localGeneration.seed,seed);
   assert.equal(new Set(entities.map(e=>e.name[0])).size,entities.length);
   if(entities.length>=3)for(const type of ['city_state','microstate','tribe'])assert.ok(entities.some(entity=>entity.type===type));
   if(entities.length>=4)assert.ok(entities.some(entity=>entity.type==='strongman'));
   assert.equal(new Set(entities.map(e=>e.ruler.name[0])).size,entities.length);
   for(const e of entities){assert.equal(e.historical,false);assert.equal(e.spatialAccuracy,'fictional_approximate_point');assert.equal(e.controller,e.id);assert.ok(e.population>=e.militia*4);assert.ok(e.food>0&&e.treasury>0);assert.ok(e.strategy>=band.skill[0]&&e.strategy<=band.skill[1]);assert.ok(s.regions.some(r=>r.id===e.theater&&r.localEntities.includes(e)));assert.equal(s.world.localRulers[e.ruler.id].polityId,e.id);assert.deepEqual(s.world.localRulers[e.ruler.id].name,e.ruler.name);assert.ok(s.year-s.world.localRulers[e.ruler.id].birthYear>=28)}
   assert.equal(villages(s).length,entities.filter(e=>e.type==='strongman').length);
   for(const v of villages(s)){const chief=localEntity(s,v.sponsor),host=s.regions.find(r=>r.id===v.theater);assert.equal(v.controller,chief.id);assert.equal(v.legalSovereign,host.owner);assert.equal(chief.legalSovereign,host.owner);assert.equal(chief.claimedSovereignty,false);assert.ok(v.village.population<=chief.population);assert.ok(v.village.storedFood>=v.village.foodNeed*2);assert.deepEqual(v.village.leader,chief.ruler.name)}
   if(previousAnchor){assert.ok(anchor.population>previousAnchor.population);assert.ok(anchor.militia>previousAnchor.militia);assert.ok(anchor.treasury>previousAnchor.treasury);assert.ok(anchor.food>previousAnchor.food)}
   previousAnchor=anchor;
   assert.equal(inspectState(s).filter(f=>['invalid-generated-polity','invalid-generated-village','invalid-generated-village-count','invalid-local-controller','invalid-local-generation','invalid-local-ruler-registry'].includes(f.code)).length,0);
  }
 }
});

test('campaigns vary by seed, replay the same seed, and keep all generated values through saves',()=>{
 const first=start('standard',71),again=start('standard',71),other=start('standard',72);
 assert.deepEqual(generated(first),generated(again));
 assert.notDeepEqual(generated(first).map(e=>e.name),generated(other).map(e=>e.name));
 const saved=upgradeSave(JSON.parse(JSON.stringify(first)));
 assert.deepEqual(generated(saved),generated(first));assert.deepEqual(saved.world.localGeneration,first.world.localGeneration);
 assert.deepEqual(villages(saved),villages(first));
 assert.deepEqual(saved.world.localRulers,first.world.localRulers);
 const legacy=newGame('caesar');const upgraded=upgradeSave(JSON.parse(JSON.stringify(legacy)));
 assert.equal(generated(upgraded).length,0);assert.equal(upgraded.world.localGeneration,undefined);
 assert.equal(upgraded.world.localRulers['commagene-antiochus-i'].polityId,'commagene');
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

test('a generated ruler stays identified in the saved outcome and the player receives one delayed envoy report',()=>{
 const s=start('expert',2),e=localEntity(s,'generated:narbo');
 assert.ok(e?.ruler?.name?.[0]);
 assert.equal(offerLocalContact(s,e.id,'caesar','access').ok,true);
 assert.equal(receivedMail(s).filter(m=>m.context?.kind==='local_contact_result').length,0);
 for(let n=0;n<2;n++){s.month++;advanceLocalEntities(s)}
 const result=receivedMail(s).filter(m=>m.context?.kind==='local_contact_result');
 assert.equal(result.length,1);assert.equal(result[0].context.polityId,e.id);
 assert.deepEqual(result[0].context.rulerName,e.ruler.name);
 assert.ok(result[0].body[0].includes(e.ruler.name[0]));
 assert.equal(result[0].context.accepted,e.lastOutcome.accepted);
 assert.equal(e.lastOutcome.mailId,result[0].id);
 assert.equal(replyToLetter(s,result[0].id,'acknowledge',{}).ok,true);
 assert.equal(result[0].responses[0].choice,'acknowledge');
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(receivedMail(saved).filter(m=>m.context?.kind==='local_contact_result'),result);
 advanceLocalEntities(saved);
 assert.equal(receivedMail(saved).filter(m=>m.context?.kind==='local_contact_result').length,1);
 assert.equal(inspectState(saved).filter(f=>f.code==='invalid-local-ruler-registry').length,0);
});

test('a strongman draws only civilian surplus once each quarter and keeps a separate legal title',()=>{
 const s=start('standard',2),chief=generated(s).find(e=>e.type==='strongman'),village=localEntity(s,`generated-village:${chief.theater}`);
 assert.ok(chief&&village);s.month=3;
 village.village.storedFood=village.village.foodNeed*2+1;
 const food=chief.food,satisfaction=village.village.satisfaction;
 advanceLocalEntities(s);assert.equal(chief.food,food+1);assert.equal(village.village.storedFood,village.village.foodNeed*2);assert.equal(village.village.satisfaction,satisfaction-1);
 advanceLocalEntities(s);assert.equal(chief.food,food+1);assert.equal(village.village.storedFood,village.village.foodNeed*2);
 advanceVillages(s);assert.equal(village.controller,chief.id);
 assert.notEqual(chief.legalSovereign,chief.id);assert.equal(chief.claimedSovereignty,false);
 assert.equal(inspectState(s).filter(f=>f.code.startsWith('invalid-generated')||f.code==='invalid-local-controller').length,0);
});

test('service is delayed, costs treasury, and never annexes the chief or village',()=>{
 const s=start('standard',2),chief=generated(s).find(e=>e.type==='strongman'),village=localEntity(s,`generated-village:${chief.theater}`);
 const actor=s.regions.find(r=>r.id===chief.theater).owner,legal=chief.legalSovereign,before=s.factions[actor].treasury;
 assert.equal(offerLocalContact(s,chief.id,actor,'protectorate').ok,false);
 assert.equal(offerLocalContact(s,chief.id,actor,'service').ok,true);
 assert.equal(s.factions[actor].treasury,before-12);
 assert.equal(chief.pending.remaining,2);
 advanceLocalEntities(s);assert.equal(chief.pending.remaining,1);
 advanceLocalEntities(s);assert.equal(chief.pending,null);
 assert.equal(chief.controller,chief.id);assert.equal(village.controller,chief.id);assert.equal(chief.legalSovereign,legal);assert.equal(village.legalSovereign,legal);
 assert.equal(chief.allegiance,chief.lastOutcome.accepted?actor:null);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(localEntity(saved,chief.id),chief);assert.deepEqual(localEntity(saved,village.id),village);
});

test('occupation transfers a dependent village and a successful local revolt restores personal control',()=>{
 const s=start('standard',2),chief=generated(s).find(e=>e.type==='strongman'),village=localEntity(s,`generated-village:${chief.theater}`),host=s.regions.find(r=>r.id===chief.theater),actor=host.owner;
 chief.controller=actor;chief.militaryOccupier=actor;chief.administrativeStatus='occupied';chief.resistance=100;
 village.controller=actor;village.lastPatronController=actor;village.militaryOccupier=actor;
 s.armies=s.armies.filter(a=>a.region!==chief.theater);
 const result=advanceLocalResistance(s);
 assert.ok(result.some(event=>event.id===chief.id));assert.equal(chief.controller,chief.id);assert.equal(chief.administrativeStatus,'personal_rule');assert.equal(village.controller,chief.id);assert.equal(village.legalSovereign,actor);
 assert.equal(inspectState(s).filter(f=>f.code==='invalid-local-controller'||f.code==='invalid-generated-village').length,0);
 host.owner=Object.keys(s.factions).find(id=>id!==actor);
 advanceVillages(s);assert.equal(village.controller,host.owner);assert.equal(village.administrativeStatus,'occupied');
});

test('an army-backed assault occupies the chief and village without annexing the host theater',()=>{
 const s=start('hard',2),chief=generated(s).find(e=>e.type==='strongman'),village=localEntity(s,`generated-village:${chief.theater}`),host=s.regions.find(r=>r.id===chief.theater),actor=host.owner;
 const army=s.armies.find(a=>a.owner===actor&&a.region===chief.theater&&a.men>=chief.militia*1.5&&!a.move);
 assert.ok(army);const owner=host.owner,legal=chief.legalSovereign,food=s.factions[actor].food;
 const quote=localSiegeQuote(s,chief.id,army.id,actor);assert.equal(quote.ok,true);
 assert.equal(besiegeLocalEntity(s,chief.id,army.id,actor).ok,true);assert.equal(s.factions[actor].food,food-8);
 for(let month=0;month<quote.months;month++)advanceLocalEntities(s);
 assert.equal(chief.controller,actor);assert.equal(village.controller,actor);assert.equal(host.owner,owner);assert.equal(chief.legalSovereign,legal);assert.equal(village.legalSovereign,legal);
 assert.equal(inspectState(s).filter(f=>f.code==='invalid-local-controller'||f.code==='invalid-generated-village').length,0);
});
