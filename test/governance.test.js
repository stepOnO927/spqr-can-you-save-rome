import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js';
import {deriveGovernment,advanceGovernments,appointDeputy,eligibleDeputies,planSuccession,supportSuccessor} from '../governance.js';
import {assignSuccession,knownLeaders,leadershipTitle} from '../characters.js';
import {advanceCharacters,commandFactor} from '../character-system.js';
import {previewPersonTravel} from '../personal-diplomacy.js';

test('a sick Roman commander retains nominal office while an available officer acts temporarily',()=>{
 const s=newGame('caesar');s.world.characters.caesar.health='seriously_ill';const g=deriveGovernment(s,'caesar');assert.equal(g.kind,'acting_command');assert.deepEqual(g.nominal,['caesar']);assert.deepEqual(g.acting,['antony']);assert.deepEqual(s.world.leadership.caesar,['caesar']);
 s.world.characters.antony.health='dying';assert.deepEqual(deriveGovernment(s,'caesar').acting,['lepidus']);s.world.characters.caesar.health='recovering';assert.equal(deriveGovernment(s,'caesar').kind,'normal');
});
test('a co-ruler can govern without creating a false historical ruler or informing foreign observers',()=>{
 const s=newGame('caesar');s.world.characters.cleopatra.health='seriously_ill';const g=deriveGovernment(s,'egypt');assert.equal(g.kind,'co_ruler_acting');assert.deepEqual(g.acting,['ptolemy']);advanceGovernments(s);
 assert.deepEqual(s.world.leadership.egypt,['cleopatra','ptolemy']);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);assert.equal(s.knowledge.caesar.egypt.reports.length,0);assert.ok(!s.log.some(x=>x.en.includes('co-ruler')));
});
test('separate Mauretanian rulers do not automatically govern each other’s kingdom',()=>{
 const s=newGame();s.world.characters.bocchus.health='seriously_ill';assert.equal(deriveGovernment(s,'mauretania').kind,'constituent_unavailable');assert.deepEqual(s.world.leadership.mauretania,['bocchus','bogud']);
});
test('a vacancy remains unnamed and governance disruption has a real periodic cost',()=>{
 const s=newGame('caesar');s.world.characters.juba.alive=false;assignSuccession(s,'numidia');assert.equal(deriveGovernment(s,'numidia').kind,'vacant');const stability=s.factions.numidia.stability;s.month=3;advanceGovernments(s);assert.equal(s.factions.numidia.stability,stability-1);assert.deepEqual(s.world.leadership.numidia,[]);
});
test('monthly turns and old save migration preserve temporary authority and recovery',()=>{
 let s=newGame('caesar');s.world.characters.caesar.health='seriously_ill';s.month=2;tick(s);assert.equal(s.world.governments.caesar.kind,'acting_command');assert.ok(s.log.some(x=>x.zh.includes('暂时代行')));s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.characters.caesar.health='recovering';tick(s);assert.equal(s.world.governments.caesar.kind,'normal');
});
test('frailty is simulated in later age and slows travel and military command',()=>{
 let found=false;for(let seed=0;seed<1000&&!found;seed++){const s=newGame();s.year=-34;s.month=1;s.world.intelSeed=seed*100000;s.world.characters.caesar.health='healthy';advanceCharacters(s);if(s.world.characters.caesar.health==='frail'){found=true;assert.equal(commandFactor(s,s.armies.find(a=>a.id==='xiii')),.88)}}assert.equal(found,true);
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
test('reported titles distinguish Roman factions, Egyptian joint rule and separate Mauretanian kingdoms',()=>{
 assert.equal(leadershipTitle('caesar',['caesar'])[1],'罗马派系领袖');assert.equal(leadershipTitle('egypt',['cleopatra','ptolemy'])[1],'共同统治者');assert.equal(leadershipTitle('egypt',['ptolemy'])[1],'统治者');assert.equal(leadershipTitle('mauretania',['bocchus','bogud'])[1],'各王国统治者');assert.equal(leadershipTitle('egypt',[])[1],'领导身份未确认');
});
