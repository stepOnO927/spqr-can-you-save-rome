import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength,upgradeSave} from '../engine.js?v=frontier-response-1';
import {sendCoalitionInvitation,advanceCoalitionInvitations} from '../coalition-negotiations.js?v=diplomatic-chronicle-1';
import {initializeChronicle,syncChronicleDispatches} from '../chronicle.js?v=succession-ui-recovery-1';

function setup(){
 const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 s.world.diplomaticKnowledge.caesar={egypt:{id:'egypt',status:'active',parties:['caesar','egypt']},numidia:{id:'numidia',status:'active',parties:['caesar','numidia']}};
 return s;
}
const roll=()=>.5;
function step(s,random=roll){s.month++;advanceCoalitionInvitations(s,estimatedStrength,random)}
test('a coalition invitation travels, recipients decide, and membership costs real money only on formation',()=>{
 let s=setup();initializeChronicle(s);const before=s.factions.caesar.treasury,egypt=s.factions.egypt.treasury;
 assert.deepEqual(sendCoalitionInvitation(s,'caesar',['egypt','numidia'],'senate'),{ok:true,id:1,cost:3,months:4});
 assert.equal(s.factions.caesar.treasury,before-3);assert.equal(s.factions.egypt.treasury,egypt);assert.equal((s.coalitions?.length||0),0);
 step(s);step(s);assert.equal(s.world.coalitionInvitations[0].status,'pending');assert.equal((s.coalitions?.length||0),0);
 s=upgradeSave(structuredClone(s));step(s);step(s);assert.equal(s.world.coalitionInvitations[0].status,'accepted');assert.equal(s.coalitions.length,1);assert.equal(s.factions.egypt.treasury,egypt-5);syncChronicleDispatches(s);assert.ok(s.chronicle.entries.some(e=>e.topic==='diplomacy'&&e.zh==='各方同意结盟。'));
});
test('private recipient finances do not prevent sending or produce a premature visible refusal',()=>{
 const a=setup(),b=setup();b.factions.egypt.treasury=0;
 assert.deepEqual(sendCoalitionInvitation(a,'caesar',['egypt','numidia'],'senate'),sendCoalitionInvitation(b,'caesar',['egypt','numidia'],'senate'));
 step(a);step(a);step(b);step(b);assert.equal(a.world.coalitionInvitations[0].status,'pending');assert.equal(b.world.coalitionInvitations[0].status,'pending');
 step(b);step(b);assert.equal(b.world.coalitionInvitations[0].status,'refused');assert.equal((b.coalitions?.length||0),0);
});
test('lost invitations return no reply and never create a coalition',()=>{
 const s=setup();assert.ok(sendCoalitionInvitation(s,'caesar',['egypt','numidia'],'senate').ok);
 step(s,()=>0);step(s,()=>0);step(s);step(s);assert.equal(s.world.coalitionInvitations[0].status,'no_reply');assert.equal((s.coalitions?.length||0),0);
});
