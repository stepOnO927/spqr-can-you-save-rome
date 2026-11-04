import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,queueMission} from '../engine.js';
import {knownLeaders} from '../characters.js';
import {advanceOperations,availableAgents} from '../character-system.js';
import {advanceConspiracies,reassurePerson,politicalAmbition,potentialConspirators} from '../conspiracies.js';
import {supportSuccessor} from '../governance.js';

const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
function unrest(s){s.factions.senate.stability=30;s.world.characters.cato.loyalty=25;}

test('a simulated plot forms privately and may change leadership without updating foreign reports',()=>{
 const s=newGame('caesar');unrest(s);s.month=3;s.world.intelSeed=seedFor(.2,.21);advanceConspiracies(s);
 assert.equal(s.world.conspiracies.senate.person,'cato');assert.ok(!s.log.some(e=>/plot|阴谋/.test(e.en+e.zh)));assert.deepEqual(knownLeaders(s,'caesar','senate'),['pompey']);
 s.world.conspiracies.senate.remaining=1;s.world.intelSeed=seedFor(.2,.21);advanceConspiracies(s);
 assert.deepEqual(s.world.leadership.senate,['cato']);assert.deepEqual(knownLeaders(s,'caesar','senate'),['pompey']);assert.equal(s.world.conspiracies.senate,undefined);
});
test('internal investigation takes time and reports only to its sender',()=>{
 let s=newGame('senate');unrest(s);s.world.conspiracies={senate:{person:'cato',remaining:6}};const start=s.factions.senate.treasury;
 assert.equal(queueMission(s,'senate','senate','counter','conspiracy').ok,true);assert.equal(s.factions.senate.treasury,start-8);assert.equal(availableAgents(s,'senate'),2);
 advanceOperations(s);advanceOperations(s);assert.equal(s.operations[0].status,'pending');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=seedFor(.7,.8);advanceOperations(s);
 assert.equal(s.operations[0].status,'complete');assert.equal(s.knowledge.senate.senate.reports[0].character,'cato');assert.equal(s.knowledge.senate.senate.reports[0].verified,false);assert.equal(s.knowledge.caesar.senate.reports.length,0);assert.equal(availableAgents(s,'senate'),3);
});
test('unrest can generate a false accusation, and no reliable information does not disprove a plot',()=>{
 const s=newGame('senate');unrest(s);queueMission(s,'senate','senate','counter','conspiracy');s.world.intelSeed=seedFor(.4,.45);for(let i=0;i<3;i++)advanceOperations(s);
 assert.equal(s.knowledge.senate.senate.reports[0].character,'cato');assert.equal(s.world.conspiracies?.senate,undefined);
 const q=newGame('senate');unrest(q);q.world.conspiracies={senate:{person:'cato',remaining:6}};queueMission(q,'senate','senate','counter','conspiracy');q.world.intelSeed=seedFor(.2,.22);for(let i=0;i<3;i++)advanceOperations(q);
 assert.equal(q.knowledge.senate.senate.reports[0].value,'unknown');assert.equal(q.world.conspiracies.senate.person,'cato');
});
test('a foreign spy may learn a plot without automatic disclosure to other factions',()=>{
 const s=newGame('caesar');unrest(s);s.world.conspiracies={senate:{person:'cato',remaining:6}};assert.equal(queueMission(s,'caesar','senate','spy','conspiracy').ok,true);s.world.intelSeed=seedFor(.7,.8);for(let i=0;i<4;i++)advanceOperations(s);
 assert.equal(s.knowledge.caesar.senate.reports[0].character,'cato');assert.equal(s.knowledge.egypt.senate.reports.length,0);
});
test('reassurance costs resources, can calm a plot and does not reveal whether one exists',()=>{
 const s=newGame('senate');unrest(s);s.world.conspiracies={senate:{person:'cato',remaining:6}};const cash=s.factions.senate.treasury;
 assert.equal(reassurePerson(s,'cato').ok,true);assert.equal(s.factions.senate.treasury,cash-8);assert.equal(s.world.characters.cato.loyalty,40);advanceConspiracies(s);assert.equal(s.world.conspiracies.senate,undefined);
 assert.equal(reassurePerson(s,'cleopatra').reason,'unavailable');assert.equal(queueMission(s,'senate','senate','spy','conspiracy').reason,'unavailable');assert.equal(queueMission(s,'senate','egypt','counter','conspiracy').reason,'unavailable');
});


test('simulated ambition affects political risk and persists without disclosing a secret plot',()=>{
 function setup(ambition){const s=newGame('senate');unrest(s);s.world.characters.cato.ambition=ambition;s.month=3;s.world.intelSeed=seedFor(.26,.27);return s}
 const low=setup(10),high=setup(90);advanceConspiracies(low);advanceConspiracies(high);assert.equal(low.world.conspiracies.senate,undefined);assert.equal(high.world.conspiracies.senate.person,'cato');assert.equal(high.knowledge.senate.senate.reports.length,0);
 let s=newGame('senate');delete s.world.characters.cato.ambition;const initial=politicalAmbition(s,'cato');assert.ok(initial>=35&&initial<=65);assert.equal(supportSuccessor(s,'cato').ok,true);assert.equal(s.world.characters.cato.ambition,initial+5);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(politicalAmbition(s,'cato'),initial+5);
});
test('among similarly disloyal officers, greater ambition increases their priority',()=>{
 const s=newGame('senate');s.world.characters.cato.loyalty=25;s.world.characters.scipio.loyalty=25;s.world.characters.cato.ambition=20;s.world.characters.scipio.ambition=80;assert.equal(potentialConspirators(s,'senate')[0],'scipio');
});
