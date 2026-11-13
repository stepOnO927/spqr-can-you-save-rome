import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick} from '../engine.js?v=gathering-presence-1';
import {queueMission,advanceOperations,availableAgents,requestAgentRelease,advanceAgentRequests,answerAgentRelease} from '../character-system.js?v=succession-ui-recovery-1';

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

function incoming(){const s=newGame('caesar');s.world.captives.push({id:'foreign1',owner:'senate',holder:'caesar',state:'held'});return s}
function arrive(s){s.world.intelSeed=1000;advanceAgentRequests(s);advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'awaiting_decision');return s}
test('foreign requests take time to arrive and the player may approve a delayed handover',()=>{
 let s=incoming();const cash=s.factions.senate.treasury;assert.equal(requestAgentRelease(s,'senate','foreign1').ok,true);assert.equal(s.factions.senate.treasury,cash-8);assert.equal(s.log.length,0);assert.equal(answerAgentRelease(s,'foreign1','release').reason,'unavailable');advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'pending');assert.equal(s.log.length,0);s.world.intelSeed=1000;advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'awaiting_decision');assert.match(s.log[0].zh,/来信请求释放/);
 assert.equal(answerAgentRelease(s,'foreign1','release').ok,true);assert.equal(answerAgentRelease(s,'foreign1','release').reason,'unavailable');assert.equal(s.world.captives[0].state,'held');s=upgradeSave(JSON.parse(JSON.stringify(s)));advanceAgentRequests(s);assert.equal(s.world.captives[0].state,'held');s.world.intelSeed=1000;advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'released');assert.equal(s.world.captives[0].state,'released');assert.equal(availableAgents(s,'senate'),3);
});
test('foreign requests can be refused, expire unanswered, or be lost in either direction',()=>{
 let s=incoming();requestAgentRelease(s,'senate','foreign1');arrive(s);assert.equal(answerAgentRelease(s,'foreign1','refuse').ok,true);advanceAgentRequests(s);s.world.intelSeed=1000;advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'refused');assert.equal(s.world.captives[0].state,'held');
 s=incoming();requestAgentRelease(s,'senate','foreign1');arrive(s);for(let i=0;i<6;i++)advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'no_reply');assert.equal(answerAgentRelease(s,'foreign1','release').reason,'unavailable');
 s=incoming();requestAgentRelease(s,'senate','foreign1');advanceAgentRequests(s);s.world.intelSeed=1972;advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'no_reply');assert.equal(s.log.length,0);assert.equal(s.world.captives[0].state,'held');
 s=incoming();requestAgentRelease(s,'senate','foreign1');arrive(s);answerAgentRelease(s,'foreign1','release');advanceAgentRequests(s);s.world.intelSeed=1972;advanceAgentRequests(s);assert.equal(s.releaseRequests[0].status,'no_reply');assert.equal(s.world.captives[0].state,'held');
});
test('AI writes about its own captive and does not publish the letter before arrival',()=>{
 const s=incoming();s.month=2;tick(s);const r=s.releaseRequests.find(x=>x.captiveId==='foreign1');assert.ok(r);assert.equal(r.phase,'outbound');assert.equal(r.remaining,2);assert.ok(!s.log.some(x=>x.zh.includes('来信请求释放')));assert.equal(requestAgentRelease(s,'senate','foreign1').reason,'pending');
});
