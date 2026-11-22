import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=portrait-fourteen-1';
import {configureStartingDifficulty} from '../difficulty.js?v=portrait-fourteen-1';
import {LOCAL_GENERATION_BANDS,VILLAGE_GENERATION_BANDS,LOCAL_REGION_PROFILES,LOCAL_GENERATION_SITES,INDEPENDENT_VILLAGE_SITES,NOMADIC_RANGES,WILDERNESS_SITES,generatedLocalPolities,generatedIndependentVillages,generatedNomadicCommunities,generatedWildernessSites} from '../local-generation.js';
import {localOfferChance,advanceLocalEntities,advanceLocalTrade,localEntity,localTradeOpen,offerLocalContact,localSiegeQuote,besiegeLocalEntity} from '../local-polities.js';
import {localDiscoveryLevel,LOCAL_DISCOVERY_LEVELS} from '../local-discovery.js';
import {advanceVillages} from '../local-villages.js';
import {advanceLocalResistance} from '../local-resistance.js';
import {receivedMail,replyToLetter,advanceMail} from '../epistulae.js?v=portrait-fourteen-1';
import {inspectState} from '../inspector-diagnostics.js?v=portrait-fourteen-1';
import {mailboxHtml} from '../mail-ui.js';

const start=(mode,seed)=>configureStartingDifficulty(newGame('caesar'),mode,false,{localSeed:seed});
const generated=s=>s.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.procedural&&!entity.proceduralVillage&&!entity.proceduralNomad&&!entity.proceduralWilderness);
const villages=s=>s.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.proceduralVillage&&!entity.proceduralIndependentVillage);
const independentVillages=s=>s.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.proceduralIndependentVillage);

test('regional weights vary seeded polity, village, and wilderness density without fixing any one opening',()=>{
 const polities=new Set(LOCAL_GENERATION_SITES.map(site=>site.theater)),villages=new Set(INDEPENDENT_VILLAGE_SITES.map(site=>site.theater)),wilderness=new Set(WILDERNESS_SITES.map(site=>site.theater)),nomads=new Set(NOMADIC_RANGES.flatMap(range=>range.camps.map(camp=>camp.theater)));
 const hits={political:{},village:{},wilderness:{}},counts={political:new Set(),village:new Set(),nomad:new Set(),wilderness:new Set()};
 for(let seed=1;seed<=512;seed++){
  const powers=generatedLocalPolities(seed,'standard',polities),hamlets=generatedIndependentVillages(seed,'standard',villages),camps=generatedNomadicCommunities(seed,'hard',nomads),wilds=generatedWildernessSites(seed,wilderness);
  counts.political.add(powers.length);counts.village.add(hamlets.length);counts.nomad.add(camps.length);counts.wilderness.add(wilds.length);
  for(const entity of powers)hits.political[entity.theater]=(hits.political[entity.theater]||0)+1;
  for(const entity of hamlets)hits.village[entity.theater]=(hits.village[entity.theater]||0)+1;
  for(const entity of wilds)hits.wilderness[entity.theater]=(hits.wilderness[entity.theater]||0)+1;
 }
 for(const values of Object.values(counts))assert.equal(values.size,2,'neighboring seeds must sample both values in each count band');
 assert.ok(hits.political.sicilia>hits.political.africa*1.4);
 assert.ok(hits.village.achaia>hits.village.media*1.5);
 assert.ok(hits.wilderness.egyptUpper>hits.wilderness.hispaniaN);
 for(const theater of new Set([...polities,...villages,...wilderness])){
  const profile=LOCAL_REGION_PROFILES[theater];
  for(const key of ['political','village','nomad','wilderness','population','food','trade','city_state','microstate','tribe','strongman'])assert.ok(profile[key]>=.3&&profile[key]<=2,`${theater} ${key}`);
 }
});

test('plausible local power types vary by seed and stay stable across difficulty and saves',()=>{
 for(const candidate of LOCAL_GENERATION_SITES.filter(site=>site.eligibleTypes)){
  const seen=new Set(),available=new Set([candidate.theater]);
  for(let seed=1;seed<=128;seed++){
   const first=generatedLocalPolities(seed,'travel',available)[0],harder=generatedLocalPolities(seed,'expert',available)[0];
   assert.ok(candidate.eligibleTypes.includes(first.type));
   assert.equal(first.type,harder.type,`${candidate.theater} ${seed}`);
   assert.equal(first.id,harder.id);
   assert.equal(first.government,first.type==='strongman'?'personal_following':first.type==='city_state'?'civic_council':first.type==='tribe'?'tribal_assembly':'local_dynasty');
   assert.equal(Boolean(first.civicOfficers),first.type!=='strongman');
   seen.add(first.type);
  }
  assert.deepEqual([...seen].sort(),[...candidate.eligibleTypes].sort(),candidate.theater);
 }
 const base=start('expert',41),saved=upgradeSave(structuredClone(base));
 assert.deepEqual(generated(saved).map(entity=>[entity.id,entity.type]),generated(base).map(entity=>[entity.id,entity.type]));
});

test('fictional local names vary by seed and broad theater without repeating one global style',()=>{
 const theaters=['hispaniaN','achaia','syria','numidia'];
 const samples=theaters.map(theater=>new Set(Array.from({length:128},(_,seed)=>generatedLocalPolities(seed+1,'standard',new Set([theater]))[0].name[0].split(' ')[0])));
 const leaders=theaters.map(theater=>new Set(Array.from({length:128},(_,seed)=>generatedLocalPolities(seed+1,'standard',new Set([theater]))[0].ruler.name[0].split(' ').at(-1))));
 for(const names of samples)assert.ok(names.size>=9);
 for(let i=0;i<samples.length;i++)for(let j=i+1;j<samples.length;j++)assert.equal([...samples[i]].filter(name=>samples[j].has(name)).length,0);
 for(const names of leaders)assert.ok(names.size>=8);
 for(let i=0;i<leaders.length;i++)for(let j=i+1;j<leaders.length;j++)assert.equal([...leaders[i]].filter(name=>leaders[j].has(name)).length,0);
});

test('one seeded microstate never weakens when difficulty rises',()=>{
 const modes=['travel','beginner','standard','hard','expert'];
 for(let seed=1;seed<=64;seed++){
  let previous=null;
  for(const mode of modes){
   const polity=generatedLocalPolities(seed,mode,new Set(['syria']))[0];
   assert.equal(polity.type,'microstate');
   if(previous)for(const key of ['population','militia','treasury','food','fort','strategy'])assert.ok(polity[key]>=previous[key],`${seed}: ${mode} ${key}`);
   previous=polity;
  }
 }
});

test('difficulty raises generated polity counts and coherent population, militia and resource bands',()=>{
 const modes=['travel','beginner','standard','hard','expert'];
 for(const seed of [1,42,305419896,4000000000]){
  let previous=0,previousAnchor=null;const previousProfiles=new Map();
  for(const mode of modes){
   const s=start(mode,seed),entities=generated(s),band=LOCAL_GENERATION_BANDS[mode],anchor=s.regions.flatMap(r=>r.localEntities||[]).find(e=>e.id==='massilia');
   assert.ok(entities.length>=band.count[0]&&entities.length<=band.count[1]);assert.ok(entities.length>previous);previous=entities.length;
   assert.equal(s.world.localGeneration.count,entities.length);assert.equal(s.world.localGeneration.seed,seed);
   assert.equal(new Set(entities.map(e=>e.name[0])).size,entities.length);
   if(entities.length===1)assert.ok(['city_state','microstate'].includes(entities[0].type));
   if(entities.length>=2)for(const type of ['city_state','microstate'])assert.ok(entities.some(entity=>entity.type===type));
   if(entities.length>=3)for(const type of ['city_state','microstate','tribe'])assert.ok(entities.some(entity=>entity.type===type));
   if(entities.length>=4)assert.ok(entities.some(entity=>entity.type==='strongman'));
   if(entities.length>=6)for(const type of ['city_state','microstate'])assert.ok(entities.filter(entity=>entity.type===type).length>=2);
   if(entities.length>=8)for(const type of ['tribe','strongman'])assert.ok(entities.filter(entity=>entity.type===type).length>=2);
   assert.equal(new Set(entities.map(e=>e.ruler.name[0])).size,entities.length);
   for(const e of entities){assert.equal(e.historical,false);assert.equal(e.spatialAccuracy,'fictional_approximate_point');assert.equal(e.controller,e.id);assert.ok(e.population>=e.militia*4);assert.ok(e.food>0&&e.treasury>0);assert.ok(e.strategy>=band.skill[0]&&e.strategy<=band.skill[1]);assert.ok(s.regions.some(r=>r.id===e.theater&&r.localEntities.includes(e)));assert.equal(s.world.localRulers[e.ruler.id].polityId,e.id);assert.deepEqual(s.world.localRulers[e.ruler.id].name,e.ruler.name);assert.ok(s.year-s.world.localRulers[e.ruler.id].birthYear>=28);const prior=previousProfiles.get(e.id);if(prior)for(const key of ['population','militia','treasury','food','fort','strategy'])assert.ok(e[key]>=prior[key],`${e.id} ${key} fell at ${mode}`);previousProfiles.set(e.id,e)}
   assert.equal(villages(s).length,entities.filter(e=>e.type==='strongman').length);
   const independents=independentVillages(s),villageBand=VILLAGE_GENERATION_BANDS[mode];
   assert.ok(independents.length>=villageBand[0]&&independents.length<=villageBand[1]);
   assert.equal(s.world.localGeneration.independentVillageCount,independents.length);
   assert.equal(new Set(independents.map(v=>v.name[0])).size,independents.length);
   for(const v of independents){const host=s.regions.find(r=>r.id===v.theater);assert.equal(v.controller,host.owner);assert.equal(v.legalSovereign,host.owner);assert.equal(v.historical,false);assert.equal(v.spatialAccuracy,'fictional_approximate_point');assert.ok(v.village.population>=100);assert.ok(v.village.storedFood>=v.village.foodNeed*2);assert.ok(v.village.foodProduction>v.village.foodNeed)}
   for(const v of villages(s)){const chief=localEntity(s,v.sponsor),host=s.regions.find(r=>r.id===v.theater);assert.equal(v.controller,chief.id);assert.equal(v.legalSovereign,host.owner);assert.equal(chief.legalSovereign,host.owner);assert.equal(chief.claimedSovereignty,false);assert.ok(v.village.population<=chief.population);assert.ok(v.village.storedFood>=v.village.foodNeed*2);assert.deepEqual(v.village.leader,chief.ruler.name)}
   if(previousAnchor){assert.ok(anchor.population>previousAnchor.population);assert.ok(anchor.militia>previousAnchor.militia);assert.ok(anchor.treasury>previousAnchor.treasury);assert.ok(anchor.food>previousAnchor.food)}
   previousAnchor=anchor;
   assert.equal(inspectState(s).filter(f=>['invalid-generated-polity','invalid-generated-village','invalid-generated-village-count','invalid-independent-village-count','invalid-local-controller','invalid-local-generation','invalid-local-ruler-registry'].includes(f.code)).length,0);
  }
 }
});

test('campaigns vary by seed, replay the same seed, and keep all generated values through saves',()=>{
 const first=start('standard',71),again=start('standard',71),other=start('standard',72);
 assert.deepEqual(generated(first),generated(again));
 assert.notDeepEqual(generated(first).map(e=>e.name),generated(other).map(e=>e.name));
 assert.deepEqual(independentVillages(first),independentVillages(again));
 assert.notDeepEqual(independentVillages(first).map(e=>e.name),independentVillages(other).map(e=>e.name));
 const saved=upgradeSave(JSON.parse(JSON.stringify(first)));
 assert.deepEqual(generated(saved),generated(first));assert.deepEqual(saved.world.localGeneration,first.world.localGeneration);
 assert.deepEqual(villages(saved),villages(first));
 assert.deepEqual(independentVillages(saved),independentVillages(first));
 assert.deepEqual(saved.world.localRulers,first.world.localRulers);
 const legacy=newGame('caesar');const upgraded=upgradeSave(JSON.parse(JSON.stringify(legacy)));
 assert.equal(generated(upgraded).length,0);assert.equal(upgraded.world.localGeneration,undefined);
 assert.equal(independentVillages(upgraded).length,0);
 assert.equal(upgraded.world.localRulers['commagene-antiochus-i'].polityId,'commagene');
});

test('a generated independent village follows host control while retaining its legal title',()=>{
 const s=start('hard',9),village=independentVillages(s)[0],host=s.regions.find(region=>region.id===village.theater);
 const original=host.owner,conqueror=Object.keys(s.factions).find(id=>id!==original&&id!=='rebels');
 assert.equal(village.controller,original);
 host.owner=conqueror;
 advanceVillages(s);
 assert.equal(village.controller,conqueror);
 assert.equal(village.legalSovereign,original);
 assert.equal(village.administrativeStatus,'occupied');
 assert.equal(inspectState(s).filter(item=>['invalid-generated-village','invalid-local-controller','invalid-independent-village-count'].includes(item.code)).length,0);
});

test('higher council skill weighs local strength and nearby military pressure in negotiations',()=>{
 const s=start('expert',100),e=generated(s).find(entity=>entity.type==='city_state');
 e.strategy=1;e.treasury=40;
 const noPressure=localOfferChance(s,e,'caesar','protectorate');
 e.strategy=5;assert.ok(localOfferChance(s,e,'caesar','protectorate')<noPressure);
 s.armies.push({owner:'caesar',region:e.theater,men:e.militia*3,move:null});
 const underPressure=localOfferChance(s,e,'caesar','protectorate');
 assert.ok(underPressure>noPressure);
});

test('capable local councils spend their own reserves to mobilize under a stronger nearby army',()=>{
 const s=start('expert',9),e=generated(s)[0];e.strategy=5;e.treasury=Math.max(20,e.treasury);e.food=Math.max(10,e.food);
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
 const s=start('expert',9),e=generated(s)[0];s.armies=s.armies.filter(army=>army.region!==e.theater);
 e.strategy=5;e.fort=1;e.treasury=30;e.food=10;s.month=12;
 advanceLocalEntities(s);assert.equal(e.fort,2);assert.equal(e.treasury,18);assert.equal(e.food,8);
 advanceLocalEntities(s);assert.equal(e.fort,2);assert.equal(e.treasury,18);assert.equal(e.food,8);
});

test('a generated ruler stays identified in the saved outcome and the player receives one delayed envoy report',()=>{
 const s=start('expert',9),e=localEntity(s,'generated:narbo');
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
 const s=start('standard',9),chief=generated(s).find(e=>e.type==='strongman'),village=localEntity(s,`generated-village:${chief.theater}`);
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
 const s=start('standard',9),chief=generated(s).find(e=>e.type==='strongman'),village=localEntity(s,`generated-village:${chief.theater}`);
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

test('a host court can recognize a chief title without gaining passage or village control',()=>{
 const s=start('hard',9),chief=generated(s).find(entity=>entity.type==='strongman'),village=localEntity(s,`generated-village:${chief.theater}`);
 const actor=s.regions.find(region=>region.id===chief.theater).owner,treasury=s.factions[actor].treasury;
 chief.seed=0;
 const before=localOfferChance(s,chief,actor,'service');
 assert.equal(offerLocalContact(s,chief.id,actor,'recognition').ok,true);
 assert.equal(s.factions[actor].treasury,treasury-8);
 assert.equal(chief.pending.remaining,2);
 advanceLocalEntities(s);advanceLocalEntities(s);
 assert.equal(chief.lastOutcome.accepted,true);
 assert.equal(chief.recognizedBy,actor);
 assert.deepEqual(chief.titleRecognizedAt,{year:s.year,month:s.month});
 assert.equal(chief.controller,chief.id);
 assert.equal(chief.allegiance,null);
 assert.equal(chief.access[actor],undefined);
 assert.equal(village.controller,chief.id);
 assert.equal(village.village.satisfaction,65);
 assert.ok(localOfferChance(s,chief,actor,'service')>before);
 assert.deepEqual(localEntity(upgradeSave(structuredClone(s)),chief.id).titleRecognizedAt,chief.titleRecognizedAt);
 assert.equal(inspectState(s).filter(item=>item.code==='invalid-local-recognition').length,0);
 chief.titleRecognizedAt.month=13;
 assert.ok(inspectState(s).some(item=>item.code==='invalid-local-recognition'));
});

test('hard nonplayer court initiates a paid title negotiation with a local chief',()=>{
 const s=configureStartingDifficulty(newGame('senate'),'hard',false,{localSeed:9});
 const chief=generated(s).find(entity=>entity.type==='strongman'&&s.regions.find(region=>region.id===entity.theater).owner==='caesar');
 assert.ok(chief);
 s.factions.caesar.treasury=100;
 tick(s);
 assert.equal(chief.pending?.proposal,'recognition');
 assert.equal(chief.pending?.actor,'caesar');
 assert.equal(s.factions.caesar.treasury<=92,true);
 assert.equal(chief.controller,chief.id);
});

test('a strongman requests a local charter without gaining sovereignty or army passage',()=>{
 const s=start('hard',9),chief=generated(s).find(entity=>entity.type==='strongman'&&s.regions.find(region=>region.id===entity.theater).owner==='caesar');
 assert.ok(chief);chief.strategy=5;chief.treasury=10;chief.militia=Math.max(chief.militia,Math.ceil(chief.population*.1));
 const village=localEntity(s,`generated-village:${chief.theater}`),legal=chief.legalSovereign;
 s.month=4;advanceLocalEntities(s);
 const letter=s.mail.messages.find(mail=>mail.context?.kind==='strongman_charter_request'&&mail.context.polityId===chief.id);
 assert.ok(letter);assert.deepEqual(letter.senderName,chief.ruler.name);
 assert.deepEqual(chief.lastCharterPetitionAt,{year:s.year,month:4});
 letter.delivery='received';const cash=s.factions.caesar.treasury;
 s.factions.caesar.treasury=4;
 assert.equal(replyToLetter(s,letter.id,'grant_local_charter',{}).reason,'treasury');
 assert.equal(letter.responses.length,0);
 s.factions.caesar.treasury=cash;
 assert.equal(replyToLetter(s,letter.id,'grant_local_charter',{}).ok,true);
 assert.equal(s.factions.caesar.treasury,cash-5);
 assert.equal(chief.localCharter.active,true);
 assert.equal(chief.controller,chief.id);assert.equal(chief.legalSovereign,legal);assert.equal(chief.access.caesar,undefined);
 assert.equal(village.controller,chief.id);assert.equal(village.village.satisfaction,65);
 s.month=6;const paid=s.factions.caesar.treasury;advanceLocalEntities(s);
 assert.equal(s.factions.caesar.treasury,paid+2);assert.equal(chief.localCharter.arrears,0);
 advanceLocalEntities(s);assert.equal(s.factions.caesar.treasury,paid+2);
 const restored=upgradeSave(structuredClone(s));assert.deepEqual(localEntity(restored,chief.id).localCharter,chief.localCharter);
 assert.equal(inspectState(s).filter(item=>item.code==='invalid-local-charter').length,0);
 restored.regions.flatMap(region=>region.localEntities||[]).find(entity=>entity.id===chief.id).localCharter.granted.month=13;
 assert.ok(inspectState(restored).some(item=>item.code==='invalid-local-charter'));
 s.month=12;chief.treasury=0;advanceLocalEntities(s);assert.equal(chief.localCharter.arrears,1);
 s.year++;s.month=6;advanceLocalEntities(s);assert.equal(chief.localCharter.active,false);assert.equal(chief.administrativeStatus,'personal_rule');
});

test('an old charter petition cannot be granted after the host theater changes hands',()=>{
 const s=start('hard',9),chief=generated(s).find(entity=>entity.type==='strongman'&&s.regions.find(region=>region.id===entity.theater).owner==='caesar');
 assert.ok(chief);chief.strategy=5;chief.treasury=10;chief.militia=Math.max(chief.militia,Math.ceil(chief.population*.1));
 s.month=4;advanceLocalEntities(s);
 const letter=s.mail.messages.find(mail=>mail.context?.kind==='strongman_charter_request'&&mail.context.polityId===chief.id);
 assert.ok(letter);letter.delivery='received';s.regions.find(region=>region.id===chief.theater).owner='senate';
 assert.equal(replyToLetter(s,letter.id,'grant_local_charter',{}).reason,'changed_state');
 assert.equal(chief.localCharter,undefined);
});

test('a known strongman can secure a delayed household charter from a nonplayer host',()=>{
 const s=configureStartingDifficulty(newGame('senate'),'hard',false,{localSeed:9});
 const chief=generated(s).find(entity=>entity.type==='strongman'&&s.regions.find(region=>region.id===entity.theater).owner==='caesar');
 assert.ok(chief);chief.strategy=5;chief.treasury=12;chief.militia=Math.max(chief.militia,Math.ceil(chief.population*.1));
 const village=localEntity(s,`generated-village:${chief.theater}`),legal=chief.legalSovereign;
 village.village.storedFood=village.village.foodNeed*2;
 s.factions.caesar.treasury=40;s.factions.caesar.stability=70;s.month=4;
 s.localDiscovery.caesar[chief.id]={level:0,year:s.year,month:s.month,source:'unknown'};
 advanceLocalEntities(s);assert.equal(chief.npcCharterOffer,undefined);
 s.localDiscovery.caesar[chief.id]={level:3,year:s.year,month:s.month,source:'frontier'};
 advanceLocalEntities(s);
 assert.equal(chief.npcCharterOffer.host,'caesar');assert.equal(chief.localCharter,undefined);
 assert.equal(localEntity(upgradeSave(structuredClone(s)),chief.id).npcCharterOffer.remaining,2);
 assert.equal(inspectState(s).filter(item=>item.code==='invalid-local-npc-charter-offer').length,0);
 s.month=5;advanceLocalEntities(s);assert.equal(chief.npcCharterOffer.remaining,1);
 advanceLocalEntities(s);assert.equal(chief.npcCharterOffer.remaining,1);
 s.month=6;advanceLocalEntities(s);
 assert.equal(chief.npcCharterOffer,null);assert.equal(chief.lastNpcCharterOutcome.accepted,true);
 assert.equal(chief.localCharter.host,'caesar');assert.equal(chief.localCharter.active,true);
 assert.equal(s.factions.caesar.treasury,35);assert.equal(chief.controller,chief.id);
 assert.equal(chief.legalSovereign,legal);assert.equal(chief.access.caesar,undefined);
 assert.equal(village.controller,chief.id);assert.equal(village.village.satisfaction,65);
 assert.ok(!s.log.some(item=>item.en?.includes(chief.name[0])),'the player does not learn foreign charter terms instantly');
 s.month=12;const treasury=s.factions.caesar.treasury;advanceLocalEntities(s);
 assert.equal(s.factions.caesar.treasury,treasury+2);
 const restored=upgradeSave(structuredClone(s));assert.deepEqual(localEntity(restored,chief.id).localCharter,chief.localCharter);
 chief.lastNpcCharterAt.month=13;assert.ok(inspectState(s).some(item=>item.code==='invalid-local-npc-charter-date'));
});

test('a nonplayer household charter fails if the host loses the theater in transit',()=>{
 const s=configureStartingDifficulty(newGame('senate'),'hard',false,{localSeed:9});
 const chief=generated(s).find(entity=>entity.type==='strongman'&&s.regions.find(region=>region.id===entity.theater).owner==='caesar');
 assert.ok(chief);chief.strategy=5;chief.treasury=12;chief.militia=Math.max(chief.militia,Math.ceil(chief.population*.1));
 s.factions.caesar.treasury=40;s.factions.caesar.stability=70;s.month=4;advanceLocalEntities(s);
 assert.equal(chief.npcCharterOffer.host,'caesar');
 s.regions.find(region=>region.id===chief.theater).owner='senate';
 s.month=5;advanceLocalEntities(s);s.month=6;advanceLocalEntities(s);
 assert.equal(chief.lastNpcCharterOutcome.accepted,false);assert.equal(chief.localCharter,undefined);
 assert.equal(s.factions.caesar.treasury,40);
});

test('a capable generated polity can request player-approved, funded food trade',()=>{
 const s=start('expert',8),entity=generated(s).find(site=>['city_state','microstate','tribe'].includes(site.type));
 assert.ok(entity);
 const theater=s.regions.find(region=>region.id===entity.theater);
 theater.owner='caesar';entity.strategy=2;entity.food=30;entity.treasury=12;
 s.factions.caesar.food=10;s.factions.caesar.treasury=40;s.month=4;
 advanceLocalEntities(s);
 assert.ok(!s.mail.messages.some(mail=>mail.context?.kind==='local_trade_petition'&&mail.context.polityId===entity.id),'a weak council does not initiate this negotiation');
 entity.strategy=5;advanceLocalEntities(s);
 const letter=s.mail.messages.find(mail=>mail.context?.kind==='local_trade_petition'&&mail.context.polityId===entity.id);
 assert.ok(letter);assert.deepEqual(letter.senderName,entity.ruler.name);
 assert.ok(letter.arrival>s.year*12+s.month,'the proposal travels by courier');
 assert.equal(entity.tradeRights?.caesar,undefined);
 assert.equal(inspectState(s).filter(item=>item.code==='invalid-local-trade-petition').length,0);
 assert.equal(localEntity(upgradeSave(structuredClone(s)),entity.id).tradePetitionMailId,letter.id);
 advanceLocalEntities(s);
 assert.equal(s.mail.messages.filter(mail=>mail.context?.kind==='local_trade_petition'&&mail.context.polityId===entity.id).length,1);
 s.month=letter.arrival-s.year*12;advanceMail(s);
 assert.ok(receivedMail(s).some(mail=>mail.id===letter.id));
 assert.match(mailboxHtml(s,{sender:entity.id}),/Food compact proposed by/);
 assert.equal(replyToLetter(s,letter.id,'accept_local_trade',{}).ok,true);
 assert.equal(entity.tradeRights?.caesar,undefined,'the pact waits for the return courier');
 const replyMonths=entity.tradePetitionReply.remaining;
 advanceLocalEntities(s);
 assert.equal(entity.tradePetitionReply.remaining,replyMonths,'the return courier cannot travel twice in one month');
 assert.equal(localEntity(upgradeSave(structuredClone(s)),entity.id).tradePetitionReply.remaining,replyMonths);
 assert.equal(inspectState(s).filter(item=>item.code==='invalid-local-trade-reply').length,0);
 for(let month=0;month<replyMonths;month++){
  if(++s.month>12){s.month=1;s.year++}
  advanceLocalEntities(s);
  if(month<replyMonths-1)assert.equal(entity.tradeRights?.caesar,undefined);
 }
 assert.ok(entity.tradeRights.caesar>s.year*12+s.month);
 assert.ok(receivedMail(s).some(mail=>mail.context?.kind==='local_trade_reply_result'&&mail.context.polityId===entity.id&&mail.context.accepted));
 assert.equal(entity.controller,entity.id);assert.equal(theater.owner,'caesar');
 while(s.month%3!==0||s.localTradeLastAdvancedAt===s.year*12+s.month){if(++s.month>12){s.month=1;s.year++}}
 const before={localFood:entity.food,localTreasury:entity.treasury,courtFood:s.factions.caesar.food,courtTreasury:s.factions.caesar.treasury};
 advanceLocalTrade(s);
 assert.equal(entity.food,before.localFood-2);assert.equal(entity.treasury,before.localTreasury+3);
 assert.equal(s.factions.caesar.food,before.courtFood+2);assert.equal(s.factions.caesar.treasury,before.courtTreasury-3);
 const restored=upgradeSave(structuredClone(s));assert.equal(localEntity(restored,entity.id).tradeRights.caesar,entity.tradeRights.caesar);
 restored.regions.flatMap(region=>region.localEntities||[]).find(site=>site.id===entity.id).lastTradePetitionAt.month=13;
 assert.ok(inspectState(restored).some(item=>item.code==='invalid-local-trade-petition'));
});

test('an acceptance reveals no secret change and creates no right across closed commerce',()=>{
 const s=start('expert',8),entity=generated(s).find(site=>['city_state','microstate','tribe'].includes(site.type));
 const theater=s.regions.find(region=>region.id===entity.theater);
 theater.owner='caesar';entity.strategy=5;entity.food=30;entity.treasury=12;
 s.factions.caesar.food=10;s.factions.caesar.treasury=40;s.month=4;advanceLocalEntities(s);
 const letter=s.mail.messages.find(mail=>mail.context?.kind==='local_trade_petition'&&mail.context.polityId===entity.id);
 assert.ok(letter);letter.delivery='received';
 theater.owner='senate';s.borderPolicies.senate.commercial='closed';
 assert.equal(replyToLetter(s,letter.id,'accept_local_trade',{}).ok,true,'dispatch does not inspect secret current control');
 assert.equal(entity.tradeRights?.caesar,undefined);
 const replyMonths=entity.tradePetitionReply.remaining;
 for(let month=0;month<replyMonths;month++){if(++s.month>12){s.month=1;s.year++}advanceLocalEntities(s)}
 assert.equal(entity.tradePetitionReply,null);assert.equal(entity.tradeRights?.caesar,undefined);
 assert.ok(receivedMail(s).some(mail=>mail.context?.kind==='local_trade_reply_result'&&mail.context.polityId===entity.id&&!mail.context.accepted));
});

test('an unrelated access negotiation does not cancel an accepted local food compact',()=>{
 const s=start('expert',8),entity=generated(s).find(site=>['city_state','microstate','tribe'].includes(site.type));
 s.regions.find(region=>region.id===entity.theater).owner='caesar';
 entity.strategy=5;entity.food=30;entity.treasury=12;
 s.factions.caesar.food=10;s.factions.caesar.treasury=40;s.month=4;advanceLocalEntities(s);
 const letter=s.mail.messages.find(mail=>mail.context?.kind==='local_trade_petition'&&mail.context.polityId===entity.id);
 assert.ok(letter);s.month=letter.arrival-s.year*12;advanceMail(s);
 assert.equal(replyToLetter(s,letter.id,'accept_local_trade',{}).ok,true);
 entity.pending={actor:'mauretania',proposal:'access',remaining:5};
 const months=entity.tradePetitionReply.remaining;
 for(let month=0;month<months;month++){if(++s.month>12){s.month=1;s.year++}advanceLocalEntities(s)}
 assert.equal(entity.pending.proposal,'access');
 assert.ok(entity.tradeRights.caesar>s.year*12+s.month);
 assert.ok(receivedMail(s).some(mail=>mail.context?.kind==='local_trade_reply_result'&&mail.context.accepted));
});

test('refusing a generated locality trade petition creates no right',()=>{
 const s=start('expert',8),entity=generated(s).find(site=>['city_state','microstate','tribe'].includes(site.type));
 s.regions.find(region=>region.id===entity.theater).owner='caesar';entity.strategy=5;entity.food=30;entity.treasury=12;
 s.factions.caesar.food=10;s.factions.caesar.treasury=40;s.month=4;advanceLocalEntities(s);
 const letter=s.mail.messages.find(mail=>mail.context?.kind==='local_trade_petition'&&mail.context.polityId===entity.id);
 assert.ok(letter);s.month=letter.arrival-s.year*12;advanceMail(s);
 assert.equal(replyToLetter(s,letter.id,'refuse',{}).ok,true);
 const months=entity.tradePetitionReply.remaining;
 for(let month=0;month<months;month++){if(++s.month>12){s.month=1;s.year++}advanceLocalEntities(s)}
 assert.equal(entity.tradeRights?.caesar,undefined);
 assert.equal(entity.lastOutcome.accepted,false);
});

test('a commercial route closing while the acceptance returns prevents a stale compact',()=>{
 const s=start('expert',8),entity=generated(s).find(site=>['city_state','microstate','tribe'].includes(site.type));
 const theater=s.regions.find(region=>region.id===entity.theater);
 theater.owner='caesar';entity.strategy=5;entity.food=30;entity.treasury=12;
 s.factions.caesar.food=10;s.factions.caesar.treasury=40;s.month=4;advanceLocalEntities(s);
 const letter=s.mail.messages.find(mail=>mail.context?.kind==='local_trade_petition'&&mail.context.polityId===entity.id);
 assert.ok(letter);s.month=letter.arrival-s.year*12;advanceMail(s);
 assert.equal(replyToLetter(s,letter.id,'accept_local_trade',{}).ok,true);
 const replyMonths=entity.tradePetitionReply.remaining;
 theater.owner='senate';s.borderPolicies.senate.commercial='closed';
 for(let month=0;month<replyMonths;month++){if(++s.month>12){s.month=1;s.year++}advanceLocalEntities(s)}
 assert.equal(entity.tradeRights?.caesar,undefined);
 assert.equal(entity.lastOutcome.accepted,false);
});

test('a known hungry nonplayer neighbor can conclude its own delayed local food compact',()=>{
 const s=start('expert',8),entity=generated(s).find(site=>['city_state','microstate','tribe'].includes(site.type));
 const theater=s.regions.find(region=>region.id===entity.theater);theater.owner='senate';
 entity.strategy=5;entity.food=30;entity.treasury=12;
 for(const court of Object.values(s.factions))court.food=100;
 s.factions.senate.food=10;s.factions.senate.treasury=40;s.month=4;
 s.localDiscovery.senate[entity.id]={level:0,year:s.year,month:s.month,source:'unknown'};
 assert.equal(localTradeOpen(s,entity,'senate'),true);
 advanceLocalEntities(s);assert.equal(entity.npcTradeOffer,undefined,'a court cannot negotiate with an unknown locality');
 s.localDiscovery.senate[entity.id]={level:LOCAL_DISCOVERY_LEVELS.identified,year:s.year,month:s.month,source:'frontier'};
 advanceLocalEntities(s);
 assert.equal(localDiscoveryLevel(s,'senate',entity.id),LOCAL_DISCOVERY_LEVELS.identified);
 assert.equal(entity.npcTradeOffer.host,'senate');assert.equal(entity.tradeRights?.senate,undefined);
 assert.equal(localEntity(upgradeSave(structuredClone(s)),entity.id).npcTradeOffer.remaining,2);
 assert.equal(inspectState(s).filter(item=>item.code==='invalid-local-npc-trade-offer').length,0);
 s.month=5;advanceLocalEntities(s);assert.equal(entity.npcTradeOffer.remaining,1);assert.equal(entity.tradeRights?.senate,undefined);
 advanceLocalEntities(s);assert.equal(entity.npcTradeOffer.remaining,1,'the envoy advances only once per month');
 entity.pending={actor:'mauretania',proposal:'access',remaining:2};
 s.month=6;advanceLocalEntities(s);
 assert.equal(entity.npcTradeOffer,null);assert.equal(entity.lastNpcTradeOutcome.accepted,true);
 assert.equal(entity.pending.proposal,'access','a separate access negotiation remains open');
 assert.ok(entity.tradeRights.senate>s.year*12+s.month);
 s.month=9;
 for(const site of s.regions.flatMap(region=>region.localEntities||[]))if(site!==entity)site.tradeRights={};
 const before={localFood:entity.food,localTreasury:entity.treasury,courtFood:s.factions.senate.food,courtTreasury:s.factions.senate.treasury};
 advanceLocalTrade(s);
 assert.equal(entity.food,before.localFood-2);assert.equal(entity.treasury,before.localTreasury+3);
 assert.equal(s.factions.senate.food,before.courtFood+2);assert.equal(s.factions.senate.treasury,before.courtTreasury-3);
 assert.ok(!s.log.some(item=>item.en?.includes(`from ${entity.name[0]}`)),'a foreign compact is not revealed in the player chronicle');
 assert.equal(localEntity(upgradeSave(structuredClone(s)),entity.id).lastNpcTradeOutcome.host,'senate');
 entity.lastNpcTradeOfferAt.month=13;
 assert.ok(inspectState(s).some(item=>item.code==='invalid-local-npc-trade-date'));
});

test('a nonplayer court may no longer need food when a local offer reaches it',()=>{
 const s=start('expert',8),entity=generated(s).find(site=>['city_state','microstate','tribe'].includes(site.type));
 s.regions.find(region=>region.id===entity.theater).owner='senate';entity.strategy=5;entity.food=30;
 for(const court of Object.values(s.factions))court.food=100;
 s.factions.senate.food=10;s.factions.senate.treasury=40;s.month=4;
 s.localDiscovery.senate[entity.id]={level:3,year:s.year,month:s.month,source:'frontier'};
 advanceLocalEntities(s);assert.equal(entity.npcTradeOffer.host,'senate');
 s.factions.senate.food=40;s.month=5;advanceLocalEntities(s);s.month=6;advanceLocalEntities(s);
 assert.equal(entity.lastNpcTradeOutcome.accepted,false);assert.equal(entity.tradeRights?.senate,undefined);
 assert.equal(inspectState(s).filter(item=>item.code==='invalid-local-npc-trade-outcome').length,0);
});

test('a threatened autonomous polity can seek a funded nonplayer protector without transferring local control',()=>{
 const s=start('expert',8),entity=generated(s).find(site=>['city_state','microstate','tribe'].includes(site.type));
 const theater=s.regions.find(region=>region.id===entity.theater),host='senate',threat=Object.keys(s.factions).find(id=>id!==host&&id!==s.player);
 const originalTitle=entity.legalSovereign;
 theater.owner=host;entity.strategy=5;entity.treasury=20;s.factions[host].treasury=40;s.factions[host].stability=80;
 s.localDiscovery[host][entity.id]={level:LOCAL_DISCOVERY_LEVELS.identified,year:s.year,month:s.month,source:'frontier'};
 s.armies=s.armies.filter(army=>army.region!==entity.theater);
 s.armies.push({id:'test-local-threat',owner:threat,region:entity.theater,men:entity.militia+10000,morale:80,skill:2,experience:1,move:null,siege:null});
 s.wars.push([host,threat]);
 s.month=4;advanceLocalEntities(s);
 assert.equal(entity.npcProtectorateOffer.host,host);assert.equal(entity.npcProtectorateOffer.remaining,3);
 assert.equal(entity.treasury,18,'the local court funds its own envoy');assert.equal(entity.overlord,null);
 const restored=localEntity(upgradeSave(structuredClone(s)),entity.id);
 assert.equal(restored.npcProtectorateOffer.remaining,3);
 assert.equal(inspectState(s).filter(item=>item.code==='invalid-local-npc-protectorate-offer').length,0);
 s.month=5;advanceLocalEntities(s);advanceLocalEntities(s);assert.equal(entity.npcProtectorateOffer.remaining,2,'one month cannot deliver several replies');
 s.month=6;advanceLocalEntities(s);assert.equal(entity.npcProtectorateOffer.remaining,1);
 const before={host:s.factions[host].treasury,local:entity.treasury};
 s.month=7;advanceLocalEntities(s);
 assert.equal(entity.npcProtectorateOffer,null);assert.equal(entity.overlord,host);assert.equal(entity.controller,entity.id);
 assert.equal(entity.legalSovereign,originalTitle);assert.equal(s.factions[host].treasury,before.host-6);
 assert.equal(entity.treasury,before.local+6);assert.equal(entity.lastNpcProtectorateOutcome.accepted,true);
 assert.ok(!s.log.some(item=>item.en?.includes(entity.name[0])),'hidden nonplayer business stays out of the player chronicle');
 assert.equal(localEntity(upgradeSave(structuredClone(s)),entity.id).overlord,host);
 entity.lastNpcProtectorateAt.month=13;
 assert.ok(inspectState(s).some(item=>item.code==='invalid-local-npc-protectorate-date'));
});

test('a vanished hostile army cancels a local protection petition',()=>{
 const s=start('expert',8),entity=generated(s).find(site=>['city_state','microstate','tribe'].includes(site.type));
 const theater=s.regions.find(region=>region.id===entity.theater),host='senate',threat=Object.keys(s.factions).find(id=>id!==host&&id!==s.player);
 theater.owner=host;entity.strategy=5;entity.treasury=20;s.factions[host].treasury=40;s.factions[host].stability=80;
 s.localDiscovery[host][entity.id]={level:LOCAL_DISCOVERY_LEVELS.identified,year:s.year,month:s.month,source:'frontier'};
 s.armies=s.armies.filter(army=>army.region!==entity.theater);
 s.armies.push({id:'test-local-threat',owner:threat,region:entity.theater,men:entity.militia+10000,morale:80,skill:2,experience:1,move:null,siege:null});
 s.wars.push([host,threat]);
 s.month=4;advanceLocalEntities(s);assert.ok(entity.npcProtectorateOffer);
 s.armies=s.armies.filter(army=>army.id!=='test-local-threat');
 for(const month of [5,6]){s.month=month;advanceLocalEntities(s)}
 const beforeHost=s.factions[host].treasury;s.month=7;advanceLocalEntities(s);
 assert.equal(entity.lastNpcProtectorateOutcome.accepted,false);assert.equal(entity.overlord,null);
 assert.equal(s.factions[host].treasury,beforeHost,'the host pays only when it accepts');
 assert.equal(inspectState(s).filter(item=>item.code==='invalid-local-npc-protectorate-outcome').length,0);
});

test('occupation transfers a dependent village and a successful local revolt restores personal control',()=>{
 const s=start('standard',9),chief=generated(s).find(e=>e.type==='strongman'),village=localEntity(s,`generated-village:${chief.theater}`),host=s.regions.find(r=>r.id===chief.theater),actor=host.owner;
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
 const s=start('hard',9),chief=generated(s).find(e=>e.type==='strongman'),village=localEntity(s,`generated-village:${chief.theater}`),host=s.regions.find(r=>r.id===chief.theater),actor=host.owner;
 const army=s.armies.find(a=>a.owner===actor&&a.region===chief.theater&&a.men>=chief.militia*1.5&&!a.move);
 assert.ok(army);const owner=host.owner,legal=chief.legalSovereign,food=s.factions[actor].food;
 const quote=localSiegeQuote(s,chief.id,army.id,actor);assert.equal(quote.ok,true);
 assert.equal(besiegeLocalEntity(s,chief.id,army.id,actor).ok,true);assert.equal(s.factions[actor].food,food-8);
 for(let month=0;month<quote.months;month++)advanceLocalEntities(s);
 assert.equal(chief.controller,actor);assert.equal(village.controller,actor);assert.equal(host.owner,owner);assert.equal(chief.legalSovereign,legal);assert.equal(village.legalSovereign,legal);
 assert.equal(inspectState(s).filter(f=>f.code==='invalid-local-controller'||f.code==='invalid-generated-village').length,0);
});
