import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=cursus-portraits-1';
import {queueMission,advanceOperations,availableAgents,counterWatchRemaining} from '../character-system.js?v=cursus-portraits-1';
const seedFor=(lo,hi)=>Array.from({length:10000},(_,i)=>i).find(i=>{const q=((Math.imul(i,1664525)+1013904223)>>>0)/4294967296;return q>=lo&&q<hi});
function dispatchWatch(s){const cash=s.factions[s.player].treasury;assert.equal(queueMission(s,s.player,s.player,'counter','counter_spies').ok,true);assert.equal(s.factions[s.player].treasury,cash-8);assert.equal(availableAgents(s,s.player),2);for(let i=0;i<2;i++)advanceOperations(s);assert.equal(counterWatchRemaining(s,s.player),0);s.world.intelSeed=seedFor(.7,.8);advanceOperations(s);assert.equal(s.operations[0].status,'complete');assert.equal(counterWatchRemaining(s,s.player),6);return s}
test('a watch requires time and resources, survives saves and expires after six months',()=>{
 let s=dispatchWatch(newGame('caesar'));assert.equal(availableAgents(s,'caesar'),3);s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(counterWatchRemaining(s,'caesar'),6);s.month+=1;assert.equal(counterWatchRemaining(s,'caesar'),6);s.month+=5;assert.equal(counterWatchRemaining(s,'caesar'),1);s.month+=1;assert.equal(counterWatchRemaining(s,'caesar'),0);
 const poor=newGame('caesar');poor.factions.caesar.treasury=7;assert.equal(queueMission(poor,'caesar','caesar','counter','counter_spies').reason,'treasury');assert.equal(queueMission(poor,'caesar','egypt','counter','counter_spies').reason,'unavailable');
});
test('a watch improves detection and capture without exposing undiscovered missions or guaranteeing interception',()=>{
 const base=newGame('caesar');base.month=3;const watch={start:base.year*12+base.month,end:base.year*12+base.month+5};
 function run(roll,guarded){const s=upgradeSave(JSON.parse(JSON.stringify(base)));if(guarded)s.world.securityWatches={caesar:watch};assert.equal(queueMission(s,'senate','caesar','spy','strength').ok,true);assert.equal(s.log.length,0);s.world.intelSeed=seedFor(roll,roll+.01);for(let i=0;i<4;i++)advanceOperations(s);return s}
 let ordinary=run(.40,false),watched=run(.40,true);assert.equal(ordinary.operations[0].status,'complete');assert.equal(watched.operations[0].status,'detected');assert.equal(ordinary.knowledge.caesar.senate.reports.length,0);assert.equal(ordinary.log.length,0);assert.ok(watched.log.some(x=>x.zh.includes('间谍被')));
 ordinary=run(.27,false);watched=run(.27,true);assert.equal(ordinary.operations[0].status,'detected');assert.equal(watched.operations[0].status,'captured');assert.equal(watched.world.captives[0].holder,'caesar');
 watched=run(.60,true);assert.equal(watched.operations[0].status,'complete');assert.equal(watched.log.length,0);assert.equal(watched.knowledge.caesar.senate.reports.length,0);
});
test('Roman AI can initiate its own watch without publishing a secret operation',()=>{
 const s=newGame('caesar');s.month=1;tick(s);const op=s.operations.find(o=>o.actor==='senate'&&o.subject==='counter_spies');assert.ok(op);assert.equal(op.status,'pending');assert.equal(s.knowledge.caesar.senate.reports.length,0);assert.ok(!s.log.some(e=>/警戒|watch/i.test(e.zh+' '+e.en)));assert.deepEqual(JSON.parse(JSON.stringify(s)),s);
});
