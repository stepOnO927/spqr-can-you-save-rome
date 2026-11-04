import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js';
import {contestLeadership,advanceDisputes,queueMission,advanceOperations} from '../character-system.js';
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
test('a spy can report the vacancy without automatically informing other observers',()=>{
 const s=newGame('caesar');contestLeadership(s,'egypt','cleopatra');s.world.characters.ptolemy.alive=false;assignSuccession(s,'egypt');
 assert.equal(queueMission(s,'caesar','egypt','spy','leaders').ok,true);s.world.intelSeed=seedFor(.7,.8);for(let i=0;i<4;i++)advanceOperations(s);
 assert.deepEqual(s.knowledge.caesar.egypt.reports[0].leaders,[]);assert.deepEqual(knownLeaders(s,'caesar','egypt'),[]);assert.deepEqual(knownLeaders(s,'senate','egypt'),['cleopatra','ptolemy']);
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
