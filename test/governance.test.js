import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=multipolar-confidence-1';
import {deriveGovernment,advanceGovernments,appointDeputy,eligibleDeputies,planSuccession,supportSuccessor,validSuccessionPlan,withdrawSuccessionPlan} from '../governance.js?v=succession-ui-recovery-1';
import {assignSuccession,knownLeaders,leadershipTitle} from '../characters.js?v=succession-ui-recovery-1';
import {advanceCharacters,commandFactor,queueMission,advanceOperations} from '../character-system.js?v=succession-ui-recovery-1';
import {previewPersonTravel} from '../personal-diplomacy.js?v=succession-ui-recovery-1';
import {createFictionalPerson} from '../dynasties.js?v=succession-ui-recovery-1';

test('a sick Roman commander retains nominal office while an available officer acts temporarily',()=>{
 const s=newGame('caesar');s.world.characters.caesar.health='seriously_ill';const g=deriveGovernment(s,'caesar');assert.equal(g.kind,'acting_command');assert.deepEqual(g.nominal,['caesar']);assert.deepEqual(g.acting,['antony']);assert.deepEqual(s.world.leadership.caesar,['caesar']);
 s.world.characters.antony.health='dying';assert.deepEqual(deriveGovernment(s,'caesar').acting,['lepidus']);s.world.characters.caesar.health='recovering';assert.equal(deriveGovernment(s,'caesar').kind,'normal');
});
test('a co-ruler can govern without creating a false historical ruler or informing foreign observers',()=>{
 const s=newGame('caesar');s.year=-45;s.world.characters.cleopatra.health='seriously_ill';const g=deriveGovernment(s,'egypt');assert.equal(g.kind,'co_ruler_acting');assert.deepEqual(g.acting,['ptolemy']);advanceGovernments(s);
 assert.deepEqual(s.world.leadership.egypt,['cleopatra','ptolemy']);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);assert.equal(s.knowledge.caesar.egypt.reports.length,0);assert.ok(!s.log.some(x=>x.en.includes('co-ruler')));
});
test('a definitely underage monarch keeps nominal rule while an adult co-ruler or unnamed regent acts',()=>{
 let s=newGame('caesar');let g=deriveGovernment(s,'egypt');assert.deepEqual(g.nominal,['cleopatra','ptolemy']);assert.equal(g.kind,'co_ruler_acting');assert.deepEqual(g.acting,['cleopatra']);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 s.world.characters.cleopatra.alive=false;assignSuccession(s,'egypt');g=deriveGovernment(s,'egypt');assert.deepEqual(g.nominal,['ptolemy']);assert.equal(g.kind,'regency');assert.deepEqual(g.acting,[]);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.year=-47;assert.equal(deriveGovernment(s,'egypt').kind,'regency');s.year=-46;assert.equal(deriveGovernment(s,'egypt').kind,'normal');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('a definitely underage successor cannot act as regent for an incapacitated co-ruler',()=>{
 const s=newGame('caesar');s.world.characters.cleopatra.health='seriously_ill';const g=deriveGovernment(s,'egypt');assert.equal(g.kind,'regency');assert.deepEqual(g.acting,[]);assert.deepEqual(g.nominal,['cleopatra','ptolemy']);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('a minority regency is known to a foreign faction only through a dated investigation',()=>{
 const s=newGame('caesar');s.world.characters.cleopatra.alive=false;assignSuccession(s,'egypt');advanceGovernments(s);assert.equal(s.world.governments.egypt.kind,'regency');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 const mission=queueMission(s,'caesar','egypt','spy','authority');s.world.intelSeed=1000;for(let i=0;i<mission.duration;i++)advanceOperations(s);const report=s.knowledge.caesar.egypt.reports[0];assert.equal(report.value.kind,'regency');assert.deepEqual(report.value.actors,[]);assert.equal(report.verified,false);assert.equal(s.knowledge.senate.egypt.reports.length,0);
 s.year=-46;assert.equal(deriveGovernment(s,'egypt').kind,'normal');assert.equal(report.value.kind,'regency');
});
test('acting deputies must be in controlled territory and not marching, without revealing changes abroad',()=>{
 let s=newGame('caesar');s.world.characters.caesar.health='seriously_ill';
 assert.deepEqual(deriveGovernment(s,'caesar').acting,['antony']);
 s.world.characters.antony.location='roma';
 assert.deepEqual(deriveGovernment(s,'caesar').acting,['lepidus']);
 s.world.characters.lepidus.location='roma';
 assert.deepEqual(deriveGovernment(s,'caesar').acting,[]);
 assert.equal(appointDeputy(s,'antony').reason,'unavailable');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 s.world.characters.antony.location='cisalpine';
 s.armies.push({id:'antony-test',owner:'caesar',characterId:'antony',region:'cisalpine',men:1000,move:{to:'italiaN',remaining:1}});
 assert.deepEqual(deriveGovernment(s,'caesar').acting,[]);
 s.armies.at(-1).move=null;
 s.armies.at(-1).region='roma';
 assert.deepEqual(deriveGovernment(s,'caesar').acting,[]);
 s.armies.at(-1).region='cisalpine';s.world.characters.antony.location='roma';
 assert.deepEqual(deriveGovernment(s,'caesar').acting,['antony']);
 assert.equal(s.knowledge.senate.caesar.reports.length,0);
});
test('separate Mauretanian rulers do not automatically govern each other’s kingdom',()=>{
 const s=newGame();s.world.characters.bocchus.health='seriously_ill';assert.equal(deriveGovernment(s,'mauretania').kind,'constituent_unavailable');assert.deepEqual(s.world.leadership.mauretania,['bocchus','bogud']);
});
test('both Mauretanian rulers can be incapacitated without creating a shared regency',()=>{
 let s=newGame('caesar');s.world.characters.bocchus.health='seriously_ill';s.world.characters.bogud.health='dying';s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(deriveGovernment(s,'mauretania'),{kind:'constituent_unavailable',nominal:['bocchus','bogud'],acting:[]});assert.equal(s.knowledge.caesar.mauretania.reports.length,0);
 const mission=queueMission(s,'caesar','mauretania','spy','authority');s.world.intelSeed=1000;for(let i=0;i<mission.duration;i++)advanceOperations(s);assert.equal(s.knowledge.caesar.mauretania.reports[0].value.kind,'constituent_unavailable');assert.deepEqual(s.knowledge.caesar.mauretania.reports[0].value.actors,[]);assert.equal(s.knowledge.senate.mauretania.reports.length,0);
 s.world.characters.bogud.health='recovering';assert.deepEqual(deriveGovernment(s,'mauretania').acting,['bogud']);
});
test('both separate Mauretanian kingdoms can be vacant without inventing a single ruler',()=>{
 let s=newGame('caesar');for(const id of ['bocchus','bogud']){s.world.characters[id].alive=false;s.world.characters[id].health='deceased'}assignSuccession(s,'mauretania');s=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(deriveGovernment(s,'mauretania'),{kind:'constituent_vacant',nominal:[],acting:[]});assert.deepEqual(knownLeaders(s,'caesar','mauretania'),['bocchus','bogud']);
 const mission=queueMission(s,'caesar','mauretania','spy','authority');s.world.intelSeed=1000;for(let i=0;i<mission.duration;i++)advanceOperations(s);assert.equal(s.knowledge.caesar.mauretania.reports[0].value.kind,'constituent_vacant');assert.deepEqual(s.knowledge.caesar.mauretania.reports[0].value.actors,[]);assert.equal(s.knowledge.senate.mauretania.reports.length,0);
});
test('the loss of one Mauretanian ruler leaves the other kingdom separately administered',()=>{
 for(const [lost,survivor] of [['bocchus','bogud'],['bogud','bocchus']]){
  let s=newGame('caesar');s.world.characters[lost].alive=false;assignSuccession(s,'mauretania');
  assert.deepEqual(s.world.leadership.mauretania,[survivor]);assert.equal(deriveGovernment(s,'mauretania').kind,'constituent_vacant');assert.deepEqual(deriveGovernment(s,'mauretania').acting,[survivor]);
  const stability=s.factions.mauretania.stability;s.month=3;advanceGovernments(s);assert.equal(s.factions.mauretania.stability,stability-1);
  assert.deepEqual(knownLeaders(s,'caesar','mauretania'),['bocchus','bogud']);assert.equal(s.knowledge.caesar.mauretania.reports.length,0);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(deriveGovernment(s,'mauretania').kind,'constituent_vacant');
  const mission=queueMission(s,'caesar','mauretania','spy','authority');s.world.intelSeed=1000;for(let i=0;i<mission.duration;i++)advanceOperations(s);
  assert.equal(s.knowledge.caesar.mauretania.reports[0].value.kind,'constituent_vacant');assert.deepEqual(s.knowledge.caesar.mauretania.reports[0].value.actors,[survivor]);assert.equal(s.knowledge.senate.mauretania.reports.length,0);
  s.world.characters[survivor].health='seriously_ill';assert.deepEqual(deriveGovernment(s,'mauretania').acting,[]);
 }
});
test('a vacancy remains unnamed and governance disruption has a real periodic cost',()=>{
 const s=newGame('caesar');s.world.characters.juba.alive=false;assignSuccession(s,'numidia');assert.equal(deriveGovernment(s,'numidia').kind,'vacant');const stability=s.factions.numidia.stability;s.month=3;advanceGovernments(s);assert.equal(s.factions.numidia.stability,stability-1);assert.deepEqual(s.world.leadership.numidia,[]);
});
test('monthly turns and old save migration preserve temporary authority and recovery',()=>{
 let s=newGame('caesar');s.world.characters.caesar.health='seriously_ill';s.month=2;tick(s);assert.equal(s.world.governments.caesar.kind,'acting_command');assert.ok(s.log.some(x=>x.zh.includes('暂时代行')));s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.characters.caesar.health='recovering';tick(s);assert.equal(s.world.governments.caesar.kind,'normal');
});
test('frailty is simulated in later age and slows travel and military command',()=>{
 let found=false;for(let seed=0;seed<2500&&!found;seed++){const s=newGame();s.year=-34;s.month=1;s.world.intelSeed=seed;s.world.characters.caesar.health='healthy';advanceCharacters(s);if(s.world.characters.caesar.health==='frail'){found=true;assert.equal(commandFactor(s,s.armies.find(a=>a.id==='xiii')),.88)}}assert.equal(found,true);
 const s=newGame('senate'),ordinary=previewPersonTravel(s,'cicero','epirus');s.world.characters.cicero.health='frail';const frail=previewPersonTravel(s,'cicero','epirus');assert.ok(frail.months>ordinary.months);
});
test('a player can appoint another eligible deputy without changing formal succession',()=>{
 let s=newGame('caesar');s.world.characters.caesar.health='seriously_ill';const initial=s.factions.caesar.treasury;assert.deepEqual(deriveGovernment(s,'caesar').acting,['antony']);assert.equal(appointDeputy(s,'lepidus').ok,true);assert.equal(s.factions.caesar.treasury,initial-5);assert.deepEqual(s.world.leadership.caesar,['caesar']);assert.deepEqual(deriveGovernment(s,'caesar').acting,['lepidus']);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(deriveGovernment(s,'caesar').acting,['lepidus']);assert.equal(appointDeputy(s,'lepidus').reason,'already');
 s.world.characters.lepidus.travel={destination:'gaul',legs:[],remaining:1};assert.deepEqual(deriveGovernment(s,'caesar').acting,['antony']);delete s.world.characters.lepidus.travel;s.world.characters.lepidus.alive=false;assert.deepEqual(deriveGovernment(s,'caesar').acting,['antony']);
});
test('appointment rejects outsiders, unavailable candidates and insufficient funds',()=>{
 const s=newGame('caesar');s.world.characters.caesar.health='seriously_ill';assert.equal(appointDeputy(s,'pompey').reason,'unavailable');s.world.characters.lepidus.health='dying';assert.equal(appointDeputy(s,'lepidus').reason,'unavailable');s.world.characters.lepidus.health='healthy';s.factions.caesar.treasury=4;assert.equal(appointDeputy(s,'lepidus').reason,'treasury');assert.equal(s.factions.caesar.treasury,4);
 s.world.characters.antony.faction='senate';assert.equal(eligibleDeputies(s,'caesar').includes('antony'),false);s.world.characters.caesar.alive=false;assignSuccession(s,'caesar');assert.deepEqual(s.world.leadership.caesar,['lepidus']);
});
test('succession plans are saved and select an eligible designated successor only after the office is vacant',()=>{
 let s=newGame('caesar');const treasury=s.factions.caesar.treasury;assert.equal(planSuccession(s,'lepidus').ok,true);assert.equal(s.factions.caesar.treasury,treasury-5);assert.deepEqual(s.world.leadership.caesar,['caesar']);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.characters.caesar.alive=false;assignSuccession(s,'caesar');assert.deepEqual(s.world.leadership.caesar,['lepidus']);
 const fallback=newGame('caesar');planSuccession(fallback,'lepidus');fallback.world.characters.lepidus.alive=false;fallback.world.characters.caesar.alive=false;assignSuccession(fallback,'caesar');assert.deepEqual(fallback.world.leadership.caesar,['antony']);
});

test('a designation is consumed only when a vacancy is actually filled',()=>{
 let s=newGame('caesar');assert.equal(planSuccession(s,'lepidus').ok,true);s.world.characters.caesar.alive=false;
 assert.deepEqual(assignSuccession(s,'caesar'),['lepidus']);assert.equal(s.world.successionPlans.caesar,undefined);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.successionPlans.caesar,undefined);
 const fallback=newGame('caesar');planSuccession(fallback,'lepidus');fallback.world.characters.lepidus.alive=false;fallback.world.characters.caesar.alive=false;
 assert.deepEqual(assignSuccession(fallback,'caesar'),['antony']);assert.equal(fallback.world.successionPlans.caesar,undefined);
 const empty=newGame('caesar');planSuccession(empty,'lepidus');for(const id of ['caesar','lepidus','antony'])empty.world.characters[id].alive=false;
 assert.deepEqual(assignSuccession(empty,'caesar'),[]);assert.equal(empty.world.successionPlans.caesar,'lepidus');assert.equal(withdrawSuccessionPlan(empty).ok,true);
 const joint=newGame('egypt');joint.world.successionPlans.egypt='arsinoe';joint.world.characters.cleopatra.alive=false;
 assert.deepEqual(assignSuccession(joint,'egypt'),['ptolemy']);assert.equal(joint.world.successionPlans.egypt,'arsinoe');
});

test('separate Mauretanian kingdoms do not spend money on an unusable joint succession plan',()=>{
 const s=newGame('caesar'),candidate=createFictionalPerson(s,{name:['Court member','宫廷成员'],faction:'mauretania',birthYear:-80,location:'mauretania'});
 s.month=6;s.factions.mauretania.stability=35;const treasury=s.factions.mauretania.treasury;advanceGovernments(s);
 assert.equal(s.world.successionPlans.mauretania,undefined);assert.equal(s.factions.mauretania.treasury,treasury);
 s.world.successionPlans.mauretania=candidate;assert.equal(validSuccessionPlan(s,'mauretania'),null);
 const spy=queueMission(s,'caesar','mauretania','spy','succession');assert.equal(spy.ok,true);s.world.intelSeed=1000;for(let i=0;i<spy.duration;i++)advanceOperations(s);
 assert.equal(s.knowledge.caesar.mauretania.reports[0].value,'unknown');
});
test('succession plans cannot displace a surviving co-ruler or appoint a foreign defector',()=>{
 const s=newGame('egypt');assert.equal(planSuccession(s,'ptolemy').reason,'unavailable');s.world.characters.cleopatra.alive=false;assignSuccession(s,'egypt');assert.deepEqual(s.world.leadership.egypt,['ptolemy']);
 const roman=newGame('caesar');roman.world.characters.lepidus.faction='senate';assert.equal(planSuccession(roman,'lepidus').reason,'unavailable');assert.equal(roman.factions.caesar.treasury,90);
});
test('backing a candidate changes fallback authority at a cost without publishing foreign intelligence',()=>{
 let s=newGame('caesar');const money=s.factions.caesar.treasury,rival=s.world.characters.antony.loyalty;
 assert.equal(supportSuccessor(s,'lepidus').ok,true);assert.equal(s.factions.caesar.treasury,money-8);assert.equal(s.world.characters.lepidus.influence,65);assert.equal(s.world.characters.antony.loyalty,rival-3);
 assert.deepEqual(s.world.leadership.caesar,['caesar']);assert.deepEqual(knownLeaders(s,'senate','caesar'),['caesar']);assert.equal(s.knowledge.senate.caesar.reports.length,0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.characters.caesar.health='seriously_ill';assert.deepEqual(deriveGovernment(s,'caesar').acting,['lepidus']);
 s.world.characters.caesar.alive=false;assert.deepEqual(assignSuccession(s,'caesar'),['lepidus']);
 const reject=newGame('caesar');reject.factions.caesar.treasury=7;assert.equal(supportSuccessor(reject,'lepidus').reason,'treasury');assert.equal(supportSuccessor(reject,'pompey').reason,'unavailable');assert.equal(reject.world.characters.lepidus.influence,50);
});
test('an explicit succession plan remains decisive over a better-connected candidate',()=>{
 const s=newGame('caesar');assert.equal(planSuccession(s,'antony').ok,true);assert.equal(supportSuccessor(s,'lepidus').ok,true);s.world.characters.caesar.alive=false;assert.deepEqual(assignSuccession(s,'caesar'),['antony']);
});
test('an NPC may privately prepare succession and a later spy report can reveal it',()=>{
 const s=newGame('caesar');s.month=6;s.factions.senate.stability=40;const cash=s.factions.senate.treasury;
 advanceGovernments(s);assert.equal(s.world.successionPlans.senate,'cato');assert.equal(s.factions.senate.treasury,cash-5);assert.equal(s.knowledge.caesar.senate.reports.length,0);assert.ok(!s.log.some(e=>e.en.includes('successor')));
 const probe=queueMission(s,'caesar','senate','spy','succession');assert.equal(probe.ok,true);s.world.intelSeed=1000;for(let i=0;i<probe.duration;i++)advanceOperations(s);
 const report=s.knowledge.caesar.senate.reports[0];assert.equal(report.kind,'succession');assert.equal(report.value,'cato');assert.equal(report.verified,false);assert.equal(s.knowledge.egypt.senate.reports.length,0);
 const later=JSON.parse(JSON.stringify(s));later.world.characters.pompey.alive=false;assert.deepEqual(assignSuccession(later,'senate'),['cato']);
});
test('an unknown succession report does not prove a plan is absent',()=>{
 const s=newGame('caesar');s.world.successionPlans.parthia='pacorus';const mission=queueMission(s,'caesar','parthia','envoy','succession');assert.equal(mission.ok,true);
 const seed=Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=.5&&q<.6});s.world.intelSeed=seed;for(let i=0;i<mission.duration;i++)advanceOperations(s);
 assert.equal(s.knowledge.caesar.parthia.reports[0].value,'unknown');assert.equal(s.world.successionPlans.parthia,'pacorus');assert.equal(s.knowledge.caesar.parthia.reports[0].verified,false);
});
test('reported titles distinguish Roman factions, Egyptian joint rule and separate Mauretanian kingdoms',()=>{
 assert.equal(leadershipTitle('caesar',['caesar'])[1],'罗马派系领袖');assert.equal(leadershipTitle('egypt',['cleopatra','ptolemy'])[1],'共同统治者');assert.equal(leadershipTitle('egypt',['ptolemy'])[1],'统治者');assert.equal(leadershipTitle('mauretania',['bocchus','bogud'])[1],'各王国统治者');assert.equal(leadershipTitle('egypt',[])[1],'领导身份未确认');
});

test('a nomination can be withdrawn without a refund and default succession survives save migration',()=>{
 let s=newGame('caesar');const money=s.factions.caesar.treasury;
 assert.equal(planSuccession(s,'lepidus').ok,true);assert.equal(validSuccessionPlan(s,'caesar'),'lepidus');assert.equal(withdrawSuccessionPlan(s).ok,true);assert.equal(withdrawSuccessionPlan(s).reason,'unavailable');assert.equal(s.factions.caesar.treasury,money-5);assert.equal(s.knowledge.senate.caesar.reports.length,0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.characters.caesar.alive=false;assert.deepEqual(assignSuccession(s,'caesar'),['antony']);
});
test('invalid nominations remain stored but are not revealed as valid by a new spy report',()=>{
 const s=newGame('caesar');s.world.successionPlans.senate='cato';assert.equal(validSuccessionPlan(s,'senate'),'cato');s.world.characters.cato.missing=true;assert.equal(validSuccessionPlan(s,'senate'),null);
 const probe=queueMission(s,'caesar','senate','spy','succession');assert.equal(probe.ok,true);s.world.intelSeed=1000;for(let i=0;i<probe.duration;i++)advanceOperations(s);assert.equal(s.knowledge.caesar.senate.reports[0].value,'unknown');assert.equal(s.world.successionPlans.senate,'cato');assert.equal(s.knowledge.egypt.senate.reports.length,0);
 s.world.characters.cato.missing=false;assert.equal(validSuccessionPlan(s,'senate'),'cato');assert.equal(s.knowledge.caesar.senate.reports[0].value,'unknown');s.world.characters.cato.faction='caesar';assert.equal(validSuccessionPlan(s,'senate'),null);
});
