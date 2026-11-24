import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength,upgradeSave} from '../engine.js?v=faces-name-disagreement-1';
import {sendCoalitionInvitation,advanceCoalitionInvitations} from '../coalition-negotiations.js?v=faces-name-disagreement-1';
import {knownTreatyDocuments} from '../treaty-observation.js?v=treaty-observation-1';
import {advanceCoalitions} from '../coalitions.js?v=faces-name-disagreement-1';
function setup(){const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;s.world.diplomaticKnowledge.caesar={egypt:{id:'egypt',status:'active',parties:['caesar','egypt']},numidia:{id:'numidia',status:'active',parties:['caesar','numidia']}};assert.ok(sendCoalitionInvitation(s,'caesar',['egypt','numidia'],'senate').ok);return s}
const step=(s,roll=()=>.5)=>{if(++s.month>12){s.month=1;s.year++}advanceCoalitionInvitations(s,estimatedStrength,roll)};
const copies=(s,id)=>knownTreatyDocuments(s,id,'coalition');

test('AI members sign and pay at their own courts after receiving the charter, across save-load',()=>{
 let s=setup();const before=s.factions.egypt.treasury;for(let i=0;i<4;i++)step(s);
 assert.equal(copies(s,'caesar').length,1);assert.equal(copies(s,'egypt').length,0);assert.equal(copies(s,'numidia').length,0);assert.equal(s.factions.egypt.treasury,before);
 s=upgradeSave(structuredClone(s));step(s);assert.equal(copies(s,'egypt').length,0);step(s);
 assert.equal(copies(s,'egypt').length,1);assert.equal(copies(s,'numidia').length,1);assert.equal(s.factions.egypt.treasury,before-5);
 assert.equal(s.world.coalitionInvitations[0].signedCopies.egypt.duesPaid,5);
});

test('a lost charter collects no foreign dues and creates no recipient obligations or contribution orders',()=>{
 const s=setup(),cash=s.factions.egypt.treasury;for(let i=0;i<5;i++)step(s);step(s,()=>0);
 assert.equal(s.world.coalitionInvitations[0].status,'accepted');assert.equal(copies(s,'caesar').length,1);assert.equal(copies(s,'egypt').length,0);assert.equal(s.factions.egypt.treasury,cash);
 s.month=9;advanceCoalitions(s);assert.equal(s.factions.egypt.treasury,cash,'the actual charter cannot command an uninformed foreign wallet');
});

test('a member unable to sign notifies others by fallible mail without rewriting the leader result',()=>{
 const s=setup();for(let i=0;i<4;i++)step(s);s.factions.egypt.treasury=0;step(s);step(s);
 assert.equal(copies(s,'egypt').length,0);assert.equal(s.factions.egypt.treasury,0);assert.equal(copies(s,'caesar').length,1);assert.equal(s.world.coalitionInvitations[0].status,'accepted');
 assert.ok(s.mail.events.some(e=>e.type==='treaty_notice'&&e.spec.senderFaction==='egypt'&&e.spec.recipient==='caesar'));
});

test('later foreign wealth cannot rewrite the contribution policy in a returned acceptance',()=>{
 const normal=setup();step(normal);step(normal);const hidden=structuredClone(normal);hidden.factions.egypt.treasury=1;hidden.factions.egypt.food=0;
 for(const s of [normal,hidden]){step(s);step(s)}
 assert.deepEqual(copies(hidden,'caesar'),copies(normal,'caesar'));
});
