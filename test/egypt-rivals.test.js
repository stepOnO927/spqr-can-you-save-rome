import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,region,isWar,sendInquiry,tick} from '../engine.js?v=government-intel-courier-1';
import {startDynasticWar,resolveDynasticWars,settleDynasticWar} from '../civil-war.js?v=succession-ui-recovery-1';
import {assignSuccession} from '../characters.js?v=succession-ui-recovery-1';
import {egyptianClaimantCandidate,advanceCharacters,contestLeadership,advanceDisputes,addReport,supportClaimant,advanceOperations,queueMission} from '../character-system.js?v=portraits-hundred-days-1';
// These tests pin pre-IMPERIUM subsystem behaviour with engineered random seeds;
// they run with the expansion's AI layer switched off (world.imperium.enabled=false).
const legacyIsolated=g=>{g.world.imperium={enabled:false};return g};
const seedFor=(min,max)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=min&&q<max});

test('either Egyptian co-ruler can be selected, with discontent influencing but not deciding the choice',()=>{
 const s=newGame('caesar');assert.equal(egyptianClaimantCandidate(s,.1),'cleopatra');assert.equal(egyptianClaimantCandidate(s,.9),'ptolemy');s.world.characters.ptolemy.loyalty=5;assert.equal(egyptianClaimantCandidate(s,.4),'ptolemy');assert.equal(egyptianClaimantCandidate(s,.01),'cleopatra');s.world.characters.ptolemy.health='dying';assert.equal(egyptianClaimantCandidate(s,.9),'cleopatra');s.world.characters.cleopatra.missing={origin:'egypt',remaining:3};assert.equal(egyptianClaimantCandidate(s,.1),null);
});
test('a minor claimant has court supporters and an unnamed field commander, without informing foreign factions',()=>{
 let s=newGame('caesar');assert.equal(contestLeadership(s,'egypt','ptolemy'),true);s.factions.egypt.stability=30;s.world.disputes.egypt.months=5;s.world.disputes.egypt.duration=11;s.world.intelSeed=seedFor(.7,.8);advanceDisputes(s);
 assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.equal(region(s,'egyptUpper').owner,'egypt_claimant');assert.equal(isWar(s,'egypt','egypt_claimant'),true);const army=s.armies.find(a=>a.owner==='egypt_claimant');assert.equal(army.characterId,null);assert.deepEqual(army.commander,['Unnamed officer','未具名军官']);assert.equal(s.world.leadership.egypt_claimant[0],'ptolemy');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));const unit=s.armies.find(a=>a.owner==='egypt_claimant'),before=unit.men;addReport(s,'caesar','egypt',{kind:'claimants',leaders:['ptolemy'],source:'spy'});assert.equal(supportClaimant(s,'caesar','egypt','ptolemy',null,'military').ok,true);s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(unit.men,before+1000);assert.equal(unit.characterId,null);
});

test('a discontented co-ruler can become a claimant through ordinary annual simulation',()=>{const s=newGame('caesar');s.month=1;s.world.characters.cleopatra.loyalty=90;s.world.characters.ptolemy.loyalty=5;s.world.intelSeed=8;advanceCharacters(s);assert.deepEqual(s.world.claimants.egypt,['ptolemy']);assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.equal(s.knowledge.caesar.egypt.reports.length,0)});

test('a second Egyptian claimant preserves the existing dispute, support and hidden state',()=>{
 let s=newGame('caesar');assert.equal(contestLeadership(s,'egypt','cleopatra'),true);s.factions.egypt.stability=30;Object.assign(s.world.disputes.egypt,{months:3,duration:7,support:{cleopatra:15},militaryAid:{cleopatra:1000}});assert.equal(contestLeadership(s,'egypt','arsinoe'),true);assert.deepEqual(s.world.claimants.egypt,['cleopatra','arsinoe']);assert.equal(s.world.disputes.egypt.months,3);assert.equal(s.world.disputes.egypt.duration,7);assert.equal(s.world.disputes.egypt.support.cleopatra,15);assert.equal(s.world.disputes.egypt.militaryAid.cleopatra,1000);assert.equal(s.knowledge.caesar.egypt.reports.length,0);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(s.world.claimants.egypt,['cleopatra','arsinoe']);
});
test('settling one claimant does not erase another claim or its support',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;contestLeadership(s,'egypt','arsinoe');s.factions.egypt.stability=70;s.world.disputes.egypt.months=5;s.world.disputes.egypt.support={arsinoe:15};s.world.characters.cleopatra.loyalty=75;s.world.intelSeed=seedFor(.01,.1);advanceDisputes(s);assert.deepEqual(s.world.claimants.egypt,['arsinoe']);assert.ok(s.world.leadership.egypt.includes('cleopatra'));assert.equal(s.world.disputes.egypt.support.arsinoe,15);assert.equal(s.world.disputeHistory[0].outcome,'reconciliation');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('an uncertain-age claimant has an unnamed commander and other claims survive a civil-war victory',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;contestLeadership(s,'egypt','arsinoe');s.world.disputes.egypt.support={cleopatra:15};s.world.disputes.egypt.militaryAid={cleopatra:1000};assert.equal(startDynasticWar(s,'egypt','arsinoe'),true);const unit=s.armies.find(a=>a.owner==='egypt_claimant');assert.equal(unit.characterId,null);assert.deepEqual(unit.commander,['Unnamed officer','未具名军官']);assert.equal(s.world.disputes.egypt.war.claimant,'arsinoe');for(const r of s.regions)if(r.owner==='egypt')r.owner='caesar';s.armies=s.armies.filter(a=>a.owner!=='egypt');resolveDynasticWars(s);assert.deepEqual(s.world.leadership.egypt,['arsinoe']);assert.ok(s.world.claimants.egypt.includes('cleopatra'));assert.ok(s.world.claimants.egypt.includes('ptolemy'));assert.ok(s.world.disputes.egypt);assert.equal(s.world.disputes.egypt.support.cleopatra,15);assert.equal(s.world.disputes.egypt.militaryAid.cleopatra,1000);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('old saves receive the additional figure once without overwriting existing state',()=>{
 let s=newGame('caesar');delete s.world.characters.arsinoe;delete s.world.arsinoeInitialized;s.world.characters.cleopatra.health='wounded';s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.characters.arsinoe.faction,'egypt');assert.equal(s.world.characters.cleopatra.health,'wounded');s.world.characters.arsinoe.health='ill';s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.characters.arsinoe.health,'ill');assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});

test('a second claimant may emerge during an ordinary annual update without revealing herself abroad',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;s.month=1;s.world.intelSeed=5;advanceCharacters(s);assert.ok(s.world.claimants.egypt.includes('cleopatra'));assert.ok(s.world.claimants.egypt.includes('arsinoe'));assert.equal(s.knowledge.caesar.egypt.reports.length,0);assert.deepEqual(s.knowledge.caesar.egypt.reportedLeaders,['cleopatra','ptolemy']);
});
test('a player can discover and contact the new claimant only after a report',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;contestLeadership(s,'egypt','arsinoe');assert.equal(supportClaimant(s,'caesar','egypt','arsinoe').reason,'unavailable');assert.equal(queueMission(s,'caesar','egypt','spy','claimants').ok,true);s.world.intelSeed=seedFor(.72,.8);for(let i=0;i<4;i++)advanceOperations(s);assert.ok(s.knowledge.caesar.egypt.reports[0].leaders.includes('arsinoe'));assert.equal(supportClaimant(s,'caesar','egypt','arsinoe').ok,true);assert.equal(s.operations[0].status,'pending');assert.equal(s.operations[0].remaining,4);assert.equal(s.knowledge.senate.egypt.reports.length,0);
});

test('an incumbent vacancy preserves other claimants’ support when one claimant succeeds',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;contestLeadership(s,'egypt','arsinoe');s.world.characters.ptolemy.alive=false;assignSuccession(s,'egypt');s.month++;s.world.disputes.egypt.months=5;s.world.disputes.egypt.support={cleopatra:15,arsinoe:20};s.world.disputes.egypt.militaryAid={cleopatra:1000,arsinoe:1000};s.world.characters.cleopatra.influence=80;s.world.characters.arsinoe.influence=40;const manpower=s.factions.egypt.manpower;s.world.intelSeed=seedFor(.2,.3);advanceDisputes(s);assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.deepEqual(s.world.claimants.egypt,['arsinoe']);assert.equal(s.world.disputes.egypt.support.arsinoe,20);assert.equal(s.world.disputes.egypt.militaryAid.arsinoe,1000);assert.equal(s.factions.egypt.manpower,manpower+1000);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});

test('a negotiated settlement retains support for other unresolved claimants',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;contestLeadership(s,'egypt','arsinoe');s.world.disputes.egypt.support={cleopatra:15};s.world.disputes.egypt.militaryAid={cleopatra:1000};assert.equal(startDynasticWar(s,'egypt','arsinoe'),true);assert.equal(settleDynasticWar(s,'egypt'),true);assert.deepEqual(s.world.claimants.egypt,['cleopatra']);assert.equal(s.world.disputes.egypt.support.cleopatra,15);assert.equal(s.world.disputes.egypt.militaryAid.cleopatra,1000);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});

test('military aid for another claimant never reinforces the active rival army',()=>{
 let s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;contestLeadership(s,'egypt','arsinoe');assert.equal(startDynasticWar(s,'egypt','arsinoe'),true);
 addReport(s,'caesar','egypt',{kind:'claimants',leaders:['cleopatra'],source:'spy'});const before=s.armies.find(a=>a.owner==='egypt_claimant').men;
 assert.equal(supportClaimant(s,'caesar','egypt','cleopatra',null,'military').ok,true);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1000;
 for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.operations[0].status,'pending');assert.equal(s.world.disputes.egypt.militaryAid,undefined);
 advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(s.armies.find(a=>a.owner==='egypt_claimant').men,before);assert.equal(s.world.disputes.egypt.militaryAid.cleopatra,1000);
 assert.equal(settleDynasticWar(s,'egypt'),true);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.disputes.egypt.militaryAid.cleopatra,1000);assert.equal(s.knowledge.senate.egypt.reports.length,0);
});

test('letters and missions addressed to an old claimant court do not reach a later rebellion',()=>{
 let s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;contestLeadership(s,'egypt','arsinoe');assert.equal(startDynasticWar(s,'egypt','arsinoe'),true);
 s.controlKnowledge.caesar.egyptUpper={owner:'egypt_claimant',year:-49,month:1,source:'travelers'};
 assert.equal(sendInquiry(s,'caesar','egypt_claimant').ok,true);assert.equal(queueMission(s,'caesar','egypt_claimant','spy','leaders').ok,true);
 assert.equal(settleDynasticWar(s,'egypt'),true);for(const a of s.armies)if(a.region==='egyptUpper')a.region='egypt';assert.equal(startDynasticWar(s,'egypt','cleopatra'),true);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1000;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,'failed');assert.equal(s.knowledge.caesar.egypt_claimant.reports.length,0);
 for(let i=0;i<4;i++)tick(s);assert.equal(s.inquiries[0].status,'no_reply');assert.equal(s.knowledge.caesar.egypt_claimant.reports.length,0);
});

test('a prepared response can still arrive after the original claimant court falls',()=>{
 const s=legacyIsolated(newGame('caesar'));contestLeadership(s,'egypt','cleopatra');assert.equal(startDynasticWar(s,'egypt','cleopatra'),true);s.controlKnowledge.caesar.egyptUpper={owner:'egypt_claimant',year:-49,month:1,source:'travelers'};assert.equal(sendInquiry(s,'caesar','egypt_claimant').ok,true);
 // A previously composed reply is already in transit; ending the court does not erase it.
 s.inquiries[0].sealed={status:'answered',year:-49,month:1,report:{kind:'leaders',leaders:['cleopatra'],source:'official',confidence:'unverified'}};assert.equal(settleDynasticWar(s,'egypt'),true);s.world.intelSeed=1000;
 for(let i=0;i<4;i++)tick(s);assert.equal(s.inquiries[0].status,'answered');
});

test('the death of the last claimant resolves an incumbent vacancy and preserves accepted reserves',()=>{
 let s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.characters.ptolemy.alive=false;s.world.characters.ptolemy.health='deceased';assignSuccession(s,'egypt');assert.deepEqual(s.world.leadership.egypt,[]);
 s.world.disputes.egypt.militaryAid={cleopatra:1000};s.world.characters.cleopatra.alive=false;s.world.characters.cleopatra.health='deceased';const before=s.factions.egypt.manpower;
 s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceDisputes(s);assert.deepEqual(s.world.leadership.egypt,['arsinoe']);assert.equal(s.world.disputes.egypt,undefined);assert.equal(s.factions.egypt.manpower,before+1000);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
 advanceDisputes(s);assert.equal(s.factions.egypt.manpower,before+1000);
});
test('a deceased claimant does not erase a living rival or that rival’s backing',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;contestLeadership(s,'egypt','arsinoe');s.world.disputes.egypt.militaryAid={cleopatra:1000,arsinoe:1000};s.world.disputes.egypt.support={cleopatra:15,arsinoe:20};s.world.characters.cleopatra.alive=false;s.world.characters.cleopatra.health='deceased';const before=s.factions.egypt.manpower;
 advanceDisputes(s);assert.deepEqual(s.world.claimants.egypt,['arsinoe']);assert.equal(s.factions.egypt.manpower,before+1000);assert.equal(s.world.disputes.egypt.militaryAid.arsinoe,1000);assert.equal(s.world.disputes.egypt.support.arsinoe,20);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
