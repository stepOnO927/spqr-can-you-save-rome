import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=cursus-portraits-1';
import {queueMission,advanceOperations,missionDuration} from '../character-system.js?v=cursus-portraits-1';
const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});

test('an envoy improves relations only after travel and reception, without giving secret reports',()=>{
 let s=newGame('senate');const duration=missionDuration(s,'senate','egypt','envoy'),funds=s.factions.senate.treasury;assert.equal(queueMission(s,'senate','egypt','envoy','relations').ok,true);assert.equal(s.factions.senate.treasury,funds-8);assert.equal(queueMission(s,'senate','egypt','envoy','relations').reason,'pending');for(let i=0;i<duration-1;i++)advanceOperations(s);assert.equal(s.operations[0].status,'pending');assert.equal(s.relations['egypt:senate']||0,0);s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=seedFor(.7,.8);advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(s.relations['egypt:senate'],8);assert.equal(s.knowledge.senate.egypt.reports.length,0);assert.match(s.log[0].zh,/关系最多提高8/);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.operations[0].subject,'relations');assert.equal(s.operations[0].status,'complete');
});
test('envoy diplomacy can be declined or fail, does not exceed the relation cap, and is not a spy mission',()=>{
 for(const [seed,outcome] of [[seedFor(.05,.1),'failed'],[seedFor(.34,.36),'declined']]){const s=newGame('senate');queueMission(s,'senate','egypt','envoy','relations');s.operations[0].remaining=1;s.world.intelSeed=seed;advanceOperations(s);assert.equal(s.operations[0].status,outcome);assert.equal(s.relations['egypt:senate']||0,0);assert.equal(s.knowledge.senate.egypt.reports.length,0)}
 const s=newGame('senate');s.relations['egypt:senate']=98;queueMission(s,'senate','egypt','envoy','relations');s.operations[0].remaining=1;s.world.intelSeed=seedFor(.7,.8);advanceOperations(s);assert.equal(s.relations['egypt:senate'],100);assert.equal(queueMission(s,'senate','egypt','spy','relations').reason,'subject');assert.equal(queueMission(s,'senate','egypt','travelers','relations').reason,'subject');
});
