import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js';
import {queueMission,advanceOperations,availableAgents,requestAgentRelease,advanceAgentRequests} from '../character-system.js';

function captured(){const s=newGame('caesar');assert.equal(queueMission(s,'caesar','egypt','spy','health').ok,true);s.world.intelSeed=0;for(let i=0;i<4;i++)advanceOperations(s);assert.equal(s.operations[0].status,'captured');return s}
test('captured unnamed agents occupy capacity until a delayed successful release',()=>{
 let s=captured();const id=s.world.captives[0].id;assert.equal(availableAgents(s,'caesar'),2);const treasury=s.factions.caesar.treasury;assert.equal(requestAgentRelease(s,'caesar',id).ok,true);assert.equal(s.factions.caesar.treasury,treasury-8);assert.equal(requestAgentRelease(s,'caesar',id).reason,'pending');for(let i=0;i<3;i++)advanceAgentRequests(s);assert.equal(s.world.captives[0].state,'held');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.world.intelSeed=1000;advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'released');assert.equal(availableAgents(s,'caesar'),3);
});
test('refused and unanswered letters leave the agent held and can be retried',()=>{
 for(const [seed,status] of [[0,'refused'],[1972,'no_reply']]){const s=captured(),id=s.world.captives[0].id;requestAgentRelease(s,'caesar',id);s.world.intelSeed=seed;for(let i=0;i<4;i++)advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,status);assert.equal(availableAgents(s,'caesar'),2);assert.equal(requestAgentRelease(s,'caesar',id).ok,true)}
});
test('limited agents, costs and ownership are enforced without resetting old saves',()=>{
 const s=newGame('caesar');s.world.captives=[1,2,3].map(id=>({id:'p'+id,owner:'caesar',holder:'egypt',state:'held'}));assert.equal(queueMission(s,'caesar','egypt','spy','health').reason,'agents');assert.equal(requestAgentRelease(s,'senate','p1').reason,'unavailable');s.factions.caesar.treasury=7;assert.equal(requestAgentRelease(s,'caesar','p1').reason,'treasury');
 const old=newGame();old.operations=[{type:'spy',actor:'caesar',target:'egypt',status:'captured',sentYear:-49,sentMonth:2}];delete old.world.captiveMigration;delete old.world.captives;delete old.world.nextCaptive;const loaded=upgradeSave(JSON.parse(JSON.stringify(old)));assert.equal(loaded.world.captives.length,1);upgradeSave(loaded);assert.equal(loaded.world.captives.length,1);assert.equal(availableAgents(loaded,'caesar'),2);
});
test('normal monthly turns advance release correspondence',()=>{
 const s=captured();requestAgentRelease(s,'caesar',s.world.captives[0].id);tick(s);assert.equal(s.releaseRequests[0].remaining,3);
});
