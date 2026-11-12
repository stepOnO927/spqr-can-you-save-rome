import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=newborn-age-1';
import {queueMission,advanceOperations,requestAgentRelease,advanceAgentRequests} from '../character-system.js?v=newborn-age-1';
import {successorFor} from '../characters.js?v=newborn-age-1';
import {availableCommanders} from '../command-appointments.js?v=newborn-age-1';

test('a captured spy retains one named identity through captivity, save and release',()=>{
 let s=newGame('caesar');const dispatch=queueMission(s,'caesar','egypt','spy','health');
 assert.equal(dispatch.ok,true);const id=dispatch.agentId;
 assert.match(id,/^fictional:\d+$/);assert.equal(s.operations[0].agentId,id);
 assert.equal(s.world.characters[id].profession,'spy');assert.ok(s.world.dynasties.catalog[id].name[0]);
 assert.equal(successorFor(s,'caesar').includes(id),false);
 s.world.intelSeed=0;for(let i=0;i<dispatch.duration;i++)advanceOperations(s);
 const captive=s.world.captives[0];assert.equal(captive.personId,id);assert.equal(s.world.characters[id].detainedBy,'egypt');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.world.captives[0].personId,id);
 assert.equal(requestAgentRelease(s,'caesar',captive.id).ok,true);
 for(let i=0;i<3;i++)advanceAgentRequests(s);s.world.intelSeed=1000;advanceAgentRequests(s);
 assert.equal(s.world.captives[0].state,'released');assert.equal(s.world.characters[id].detainedBy,undefined);
 assert.equal(s.world.characters[id].faction,'caesar');
});

test('new envoys are named, while a foreign hidden dispatch produces no public identity notice',()=>{
 const s=newGame('caesar'),envoy=queueMission(s,'caesar','egypt','envoy','leaders');
 assert.equal(envoy.ok,true);assert.equal(s.world.characters[envoy.agentId].profession,'envoy');
 assert.ok(s.log[0].en.includes(s.world.dynasties.catalog[envoy.agentId].name[0]));
 s.world.characters[envoy.agentId].location='cisalpine';
 assert.equal(availableCommanders(s,'xiii').includes(envoy.agentId),false);
 s.log=[];const spy=queueMission(s,'senate','egypt','spy','strength');
 assert.equal(spy.ok,true);assert.ok(s.world.characters[spy.agentId]);assert.equal(s.log.length,0);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.operations.find(o=>o.actor==='senate').agentId,spy.agentId);
});

test('old active missions and captives gain identities once without resetting saved state',()=>{
 let s=newGame('caesar');s.operations=[{actor:'caesar',target:'egypt',type:'envoy',subject:'leaders',status:'pending',remaining:2,duration:4,sentYear:-49,sentMonth:1}];
 s.world.captives=[{id:'old-agent',owner:'senate',holder:'caesar',state:'held'}];
 const cash=s.factions.caesar.treasury,seed=s.seed;
 s=upgradeSave(JSON.parse(JSON.stringify(s)));
 const envoy=s.operations[0].agentId,captive=s.world.captives[0].personId;
 assert.match(envoy,/^fictional:\d+$/);assert.match(captive,/^fictional:\d+$/);
 assert.equal(s.world.characters[captive].detainedBy,'caesar');
 assert.equal(s.factions.caesar.treasury,cash);assert.equal(s.seed,seed);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.operations[0].agentId,envoy);
 assert.equal(s.world.captives[0].personId,captive);
});
