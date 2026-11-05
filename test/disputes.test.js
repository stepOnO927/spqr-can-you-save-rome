import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js';
import {contestLeadership,advanceDisputes,queueMission,advanceOperations,addReport,supportClaimant} from '../character-system.js';
import {knownLeaders,assignSuccession} from '../characters.js';
import {deriveGovernment} from '../governance.js';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});

test('a stable court can reconcile after time, while foreign knowledge remains unchanged',()=>{
 let s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');for(let i=0;i<5;i++)advanceDisputes(s);assert.deepEqual(s.world.leadership.egypt,['ptolemy']);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1972;advanceDisputes(s);
 assert.deepEqual(s.world.leadership.egypt,['ptolemy','cleopatra']);assert.deepEqual(s.world.claimants.egypt,[]);assert.equal(s.world.disputeHistory[0].outcome,'reconciliation');assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('an unstable court may experience a takeover and an opposing claimant without fabricating people',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.factions.egypt.stability=30;s.world.disputes.egypt.months=5;s.world.intelSeed=1972;advanceDisputes(s);
 assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.deepEqual(s.world.claimants.egypt,['ptolemy']);assert.equal(s.factions.egypt.stability,26);assert.equal(s.world.disputeHistory[0].outcome,'takeover');assert.equal(s.world.disputes.egypt.months,0);assert.equal(s.knowledge.caesar.egypt.reports.length,0);assert.ok(!s.log.some(x=>x.en.includes('court struggle')));
});
test('claimants who die are removed, and separate Mauretanian kingdoms cannot be treated as co-rulers',()=>{
 const s=newGame();assert.equal(contestLeadership(s,'mauretania','bocchus'),false);contestLeadership(s,'egypt','cleopatra');s.world.characters.cleopatra.alive=false;advanceDisputes(s);assert.deepEqual(s.world.claimants.egypt,[]);assert.equal(s.world.disputes.egypt,undefined);
});
test('campaign turns progress a live dispute rather than leaving it frozen',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.disputes.egypt.months=3;tick(s);assert.equal(s.world.disputes.egypt.months,4);
});
test('death during a dispute leaves a vacancy until a claimant establishes authority',()=>{
 let s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.disputes.egypt.months=5;s.world.characters.ptolemy.alive=false;
 assert.deepEqual(assignSuccession(s,'egypt'),[]);assert.equal(deriveGovernment(s,'egypt').kind,'vacant');assert.deepEqual(s.world.claimants.egypt,['cleopatra']);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);
 advanceDisputes(s);assert.equal(s.world.disputes.egypt.months,0);for(let i=0;i<5;i++){s.month++;advanceDisputes(s)}s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=seedFor(.7,.8);s.month++;advanceDisputes(s);
 assert.deepEqual(s.world.leadership.egypt,[]);assert.equal(s.world.disputes.egypt.months,0);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);
 for(let i=0;i<5;i++)advanceDisputes(s);s.world.intelSeed=seedFor(.3,.35);advanceDisputes(s);
 assert.deepEqual(s.world.leadership.egypt,['cleopatra']);assert.deepEqual(s.world.claimants.egypt,[]);assert.equal(s.world.disputeHistory[0].outcome,'succession');assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);assert.equal(s.knowledge.caesar.egypt.reports.length,0);
});
test('a spy finding no identifiable leaders does not erase previous reports or inform other observers',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.characters.ptolemy.alive=false;assignSuccession(s,'egypt');
 assert.equal(queueMission(s,'caesar','egypt','spy','leaders').ok,true);s.world.intelSeed=seedFor(.7,.8);for(let i=0;i<4;i++)advanceOperations(s);
 assert.deepEqual(s.knowledge.caesar.egypt.reports[0].leaders,[]);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);assert.deepEqual(knownLeaders(s,'senate','egypt'),['cleopatra','ptolemy']);
});
test('a claimant who dies during an interregnum is not installed as ruler',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.characters.ptolemy.alive=false;assignSuccession(s,'egypt');s.world.characters.cleopatra.alive=false;s.month++;advanceDisputes(s);
 assert.deepEqual(s.world.claimants.egypt,[]);assert.deepEqual(s.world.leadership.egypt,[]);assert.equal(deriveGovernment(s,'egypt').kind,'vacant');assert.equal(s.world.disputes.egypt,undefined);
});
test('an ordinary monthly tick leaves time for an unresolved succession after the incumbent dies',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.disputes.egypt.months=5;s.world.characters.ptolemy.health='dying';s.month=12;s.world.intelSeed=1000;tick(s);
 assert.equal(s.world.characters.ptolemy.alive,false);assert.deepEqual(s.world.leadership.egypt,[]);assert.deepEqual(s.world.claimants.egypt,['cleopatra']);assert.equal(s.world.disputes.egypt.months,0);assert.equal(s.world.governments.egypt.kind,'vacant');assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);
});
test('accepted backing can affect a claimant’s chance without guaranteeing succession',()=>{
 function trial(support,seed){const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.characters.ptolemy.alive=false;assignSuccession(s,'egypt');s.month=2;s.world.disputes.egypt.months=5;s.world.disputes.egypt.support={cleopatra:support};s.world.intelSeed=seed;advanceDisputes(s);return s}
 const q=seedFor(.6,.62);assert.deepEqual(trial(0,q).world.leadership.egypt,[]);assert.deepEqual(trial(30,q).world.leadership.egypt,['cleopatra']);assert.deepEqual(trial(30,seedFor(.9,.95)).world.leadership.egypt,[]);
});

test('a rival claimant is not automatically installed as regent over an incapacitated incumbent',()=>{
 const s=newGame('caesar');assert.equal(contestLeadership(s,'egypt','cleopatra'),true);s.world.characters.ptolemy.health='seriously_ill';const g=deriveGovernment(s,'egypt');assert.equal(g.kind,'regency');assert.deepEqual(g.nominal,['ptolemy']);assert.deepEqual(g.acting,[]);assert.deepEqual(s.world.claimants.egypt,['cleopatra']);assert.deepEqual(knownLeaders(s,'caesar','egypt'),['cleopatra','ptolemy']);
});
test('an incapacitated or traveling claimant cannot establish authority until available',()=>{
 for(const change of [c=>c.health='seriously_ill',c=>c.health='dying',c=>c.travel={destination:'egypt',legs:[],remaining:1},c=>c.missing={year:-49,month:1}]){
  const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.characters.ptolemy.alive=false;assignSuccession(s,'egypt');s.month=2;change(s.world.characters.cleopatra);s.world.disputes.egypt.months=5;s.world.intelSeed=seedFor(.3,.35);advanceDisputes(s);assert.deepEqual(s.world.leadership.egypt,[]);assert.deepEqual(s.world.claimants.egypt,['cleopatra']);
  const restored=upgradeSave(JSON.parse(JSON.stringify(s)));restored.world.characters.cleopatra.health='healthy';delete restored.world.characters.cleopatra.travel;delete restored.world.characters.cleopatra.missing;restored.world.disputes.egypt.months=5;restored.world.intelSeed=seedFor(.3,.35);advanceDisputes(restored);assert.deepEqual(restored.world.leadership.egypt,['cleopatra']);
 }
});
test('an unavailable claimant cannot instigate or resolve a court struggle',()=>{
 const opening=newGame('caesar');opening.world.characters.cleopatra.health='seriously_ill';assert.equal(contestLeadership(opening,'egypt','cleopatra'),false);
 for(const change of [c=>c.health='seriously_ill',c=>c.travel={destination:'egypt',legs:[],remaining:1}]){const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');change(s.world.characters.cleopatra);s.factions.egypt.stability=20;s.world.disputes.egypt.months=5;s.world.intelSeed=seedFor(.1,.12);advanceDisputes(s);assert.deepEqual(s.world.leadership.egypt,['ptolemy']);assert.deepEqual(s.world.claimants.egypt,['cleopatra']);assert.equal(s.world.disputeHistory.length,0)}
});


test('Parthian dynastic rivalry remains hidden until investigated and is not automatic joint rule',()=>{
 const s=newGame('caesar');s.world.characters.pacorus.loyalty=20;assert.equal(contestLeadership(s,'parthia','pacorus'),true);assert.deepEqual(s.world.leadership.parthia,['orodes']);assert.deepEqual(s.world.claimants.parthia,['pacorus']);assert.deepEqual(knownLeaders(s,'caesar','parthia'),['orodes']);assert.equal(s.knowledge.caesar.parthia.reports.length,0);
 const m=queueMission(s,'caesar','parthia','spy','claimants');s.world.intelSeed=seedFor(.7,.8);for(let i=0;i<m.duration;i++)advanceOperations(s);assert.deepEqual(s.knowledge.caesar.parthia.reports[0].leaders,['pacorus']);assert.equal(s.knowledge.senate.parthia.reports.length,0);
 s.world.characters.pacorus.loyalty=60;s.world.disputes.parthia.months=5;s.world.intelSeed=seedFor(.02,.05);advanceDisputes(s);assert.deepEqual(s.world.leadership.parthia,['orodes']);assert.deepEqual(s.world.claimants.parthia,[]);assert.equal(s.world.disputeHistory[0].outcome,'reconciliation');
});
test('Parthian claimant backing is delayed and a disputed vacancy is not automatically filled',()=>{
 let s=newGame('caesar');s.world.characters.pacorus.loyalty=20;contestLeadership(s,'parthia','pacorus');assert.equal(supportClaimant(s,'caesar','parthia','pacorus').reason,'unavailable');addReport(s,'caesar','parthia',{kind:'claimants',leaders:['pacorus'],source:'spy',confidence:'unverified'});assert.equal(supportClaimant(s,'caesar','parthia','pacorus').ok,true);for(let i=0;i<3;i++)advanceOperations(s);assert.equal(s.operations[0].status,'pending');s.world.intelSeed=seedFor(.8,.9);advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(s.world.disputes.parthia.support.pacorus,15);
 s.world.characters.orodes.alive=false;assert.deepEqual(assignSuccession(s,'parthia'),[]);assert.equal(deriveGovernment(s,'parthia').kind,'vacant');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.month=2;s.world.disputes.parthia.months=5;s.world.intelSeed=seedFor(.4,.45);advanceDisputes(s);assert.deepEqual(s.world.leadership.parthia,['pacorus']);assert.deepEqual(knownLeaders(s,'caesar','parthia'),['orodes']);
});
test('Parthian takeovers use known characters and leave a rival claim, not an invented co-ruler',()=>{
 const s=newGame('caesar');s.world.characters.pacorus.loyalty=20;contestLeadership(s,'parthia','pacorus');s.factions.parthia.stability=20;s.world.disputes.parthia.months=5;s.world.intelSeed=seedFor(.15,.2);advanceDisputes(s);assert.deepEqual(s.world.leadership.parthia,['pacorus']);assert.deepEqual(s.world.claimants.parthia,['orodes']);assert.equal(s.world.disputeHistory[0].outcome,'takeover');assert.deepEqual(knownLeaders(s,'caesar','parthia'),['orodes']);
});

test('a prolonged court dispute strains stability and treasury without revealing secret state',()=>{
 for(const faction of ['egypt','parthia']){
  let s=newGame('caesar');if(faction==='parthia')s.world.characters.pacorus.loyalty=20;assert.equal(contestLeadership(s,faction,faction==='egypt'?'cleopatra':'pacorus'),true);
  const stability=s.factions[faction].stability,treasury=s.factions[faction].treasury,known=structuredClone(s.knowledge.caesar[faction]);
  advanceDisputes(s);advanceDisputes(s);assert.equal(s.factions[faction].stability,stability);assert.equal(s.factions[faction].treasury,treasury);
  s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceDisputes(s);assert.equal(s.factions[faction].stability,stability-1);assert.equal(s.factions[faction].treasury,treasury-3);assert.deepEqual(s.knowledge.caesar[faction],known);assert.equal(s.world.disputes[faction].duration,3);
  s.world.claimants[faction]=[];advanceDisputes(s);const after=s.factions[faction].treasury;for(let i=0;i<3;i++)advanceDisputes(s);assert.equal(s.factions[faction].treasury,after);assert.equal(s.world.disputes[faction],undefined);
 }
});
test('older unresolved disputes start the pressure clock safely on load',()=>{
 let s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.disputes.egypt.months=3;delete s.world.disputes.egypt.duration;s=upgradeSave(JSON.parse(JSON.stringify(s)));const cash=s.factions.egypt.treasury;advanceDisputes(s);assert.equal(s.world.disputes.egypt.duration,1);assert.equal(s.factions.egypt.treasury,cash);
});
