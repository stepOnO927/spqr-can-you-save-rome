import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,estimatedStrength,tick} from '../engine.js?v=world-kings-estate-village-1';
import {formCoalition} from '../coalitions.js?v=world-kings-estate-village-1';
import {COALITION_AID,sendCoalitionAidRequest,advanceCoalitionAidRequests,proposeCoalitionAidAI} from '../coalition-assistance.js?v=world-kings-estate-village-1';
import {syncCoalitionAidLetters,receivedMail,replyToLetter} from '../epistulae.js?v=world-kings-estate-village-1';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-estate-village-1';

const roll=()=>.5;
function council(){
 const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 const result=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);assert.ok(result.ok,JSON.stringify(result));return {s,c:result.coalition};
}

test('coalition assistance moves actual treasury and food after a delayed AI decision',()=>{
 let {s,c}=council(),owners=s.regions.map(r=>r.owner),actorCash=s.factions.caesar.treasury,actorFood=s.factions.caesar.food,donorCash=s.factions.egypt.treasury,donorFood=s.factions.egypt.food;
 const sent=sendCoalitionAidRequest(s,c.id,'caesar','egypt');assert.ok(sent.ok);assert.equal(s.factions.caesar.treasury,actorCash-2);
 advanceCoalitionAidRequests(s,roll);assert.equal(sent.request.phase,'outbound');advanceCoalitionAidRequests(s,roll);assert.equal(sent.request.phase,'return');
 assert.equal(s.factions.egypt.treasury,donorCash-COALITION_AID.treasury);assert.equal(s.factions.egypt.food,donorFood-COALITION_AID.food);
 s=upgradeSave(structuredClone(s));advanceCoalitionAidRequests(s,roll);advanceCoalitionAidRequests(s,roll);
 assert.equal(s.world.coalitionAidRequests[0].status,'accepted');assert.equal(s.factions.caesar.treasury,actorCash-2+COALITION_AID.treasury);assert.equal(s.factions.caesar.food,actorFood+COALITION_AID.food);
 assert.deepEqual(s.regions.map(r=>r.owner),owners);syncCoalitionAidLetters(s);assert.ok(receivedMail(s).some(m=>m.context?.kind==='coalition_aid_result'));
});

test('player donor receives an explicit letter and commits only after answering',()=>{
 const {s,c}=council(),cash=s.factions.caesar.treasury,food=s.factions.caesar.food,recipientCash=s.factions.egypt.treasury;
 const sent=sendCoalitionAidRequest(s,c.id,'egypt','caesar');assert.ok(sent.ok);
 advanceCoalitionAidRequests(s,roll);advanceCoalitionAidRequests(s,roll);assert.equal(sent.request.phase,'awaiting_player');assert.equal(s.factions.caesar.treasury,cash);
 syncCoalitionAidLetters(s);const letter=receivedMail(s).find(m=>m.context?.kind==='coalition_aid_request');assert.ok(letter);assert.ok(letter.options.includes('send_coalition_aid'));
 assert.equal(replyToLetter(s,letter.id,'send_coalition_aid',{}).ok,true);assert.equal(s.factions.caesar.treasury,cash-8);assert.equal(s.factions.caesar.food,food-6);
 advanceCoalitionAidRequests(s,roll);advanceCoalitionAidRequests(s,roll);assert.equal(sent.request.status,'accepted');assert.equal(s.factions.egypt.treasury,recipientCash-2+8);
 syncCoalitionAidLetters(s);assert.ok(receivedMail(s).some(m=>m.context?.kind==='coalition_aid_result'));
});

test('refusal leaves donor reserves intact, and repeated asks cool down',()=>{
 const {s,c}=council(),cash=s.factions.caesar.treasury,food=s.factions.caesar.food;
 const sent=sendCoalitionAidRequest(s,c.id,'egypt','caesar');assert.ok(sent.ok);assert.equal(sendCoalitionAidRequest(s,c.id,'egypt','caesar').reason,'cooldown');
 advanceCoalitionAidRequests(s,roll);advanceCoalitionAidRequests(s,roll);syncCoalitionAidLetters(s);
 const letter=receivedMail(s).find(m=>m.context?.kind==='coalition_aid_request');assert.equal(replyToLetter(s,letter.id,'refuse',{}).ok,true);
 advanceCoalitionAidRequests(s,roll);advanceCoalitionAidRequests(s,roll);assert.equal(sent.request.status,'refused');assert.equal(s.factions.caesar.treasury,cash);assert.equal(s.factions.caesar.food,food);
});

test('lost request and player silence never transfer resources',()=>{
 const first=council(),cash=first.s.factions.caesar.treasury;
 const lost=sendCoalitionAidRequest(first.s,first.c.id,'egypt','caesar');assert.ok(lost.ok);
 advanceCoalitionAidRequests(first.s,()=>0);advanceCoalitionAidRequests(first.s,()=>0);
 assert.equal(lost.request.status,'no_reply');assert.equal(first.s.factions.caesar.treasury,cash);
 const second=council(),food=second.s.factions.caesar.food,request=sendCoalitionAidRequest(second.s,second.c.id,'egypt','caesar');assert.ok(request.ok);
 advanceCoalitionAidRequests(second.s,roll);advanceCoalitionAidRequests(second.s,roll);
 for(let i=0;i<8;i++)advanceCoalitionAidRequests(second.s,roll);
 assert.equal(request.request.status,'no_reply');assert.equal(second.s.factions.caesar.food,food);
});

test('AI request uses its own shortages and does not issue a player request automatically',()=>{
 const {s,c}=council();s.month=6;s.factions.egypt.treasury=10;s.relations['egypt:numidia']=35;
 proposeCoalitionAidAI(s);assert.equal(s.world.coalitionAidRequests.length,1);assert.equal(s.world.coalitionAidRequests[0].requester,'egypt');assert.equal(s.world.coalitionAidRequests[0].recipient,'caesar');
});

test('real month tick delivers player-facing aid request and Inspector flags malformed records',()=>{
 let {s,c}=council();const sent=sendCoalitionAidRequest(s,c.id,'egypt','caesar');assert.ok(sent.ok);
 tick(s);tick(s);assert.ok(receivedMail(s).some(m=>m.context?.kind==='coalition_aid_request'));
 s=upgradeSave(structuredClone(s));s.world.coalitionAidRequests[0].recipient='phantom';const before=structuredClone(s.world.coalitionAidRequests);
 assert.ok(inspectState(s).some(x=>x.code==='invalid-coalition-aid'&&x.path==='world.coalitionAidRequests[0]'));assert.deepEqual(s.world.coalitionAidRequests,before);
});
