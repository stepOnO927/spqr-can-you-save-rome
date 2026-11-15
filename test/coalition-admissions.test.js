import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength,upgradeSave,tick} from '../engine.js?v=world-kings-trade-1';
import {formCoalition} from '../coalitions.js?v=world-kings-trade-1';
import {sendCoalitionAdmission,advanceCoalitionAdmissions,answerCoalitionAdmission,proposeCoalitionAdmissionsAI} from '../coalition-admissions.js';
import {syncCoalitionAdmissionLetters,receivedMail,replyToLetter} from '../epistulae.js?v=world-kings-trade-1';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-trade-1';

const roll=()=>.5;
function playerCoalition(){
 const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 const result=formCoalition(s,'caesar',['egypt','numidia'],'senate',estimatedStrength);assert.ok(result.ok,JSON.stringify(result));return {s,c:result.coalition};
}
function aiCoalition(){
 const s=newGame('caesar');s.relations['egypt:numidia']=40;s.relations['armenia:egypt']=40;s.relations['caesar:egypt']=40;
 for(const id of ['egypt','numidia','armenia'])s.wars.push([id,'senate']);
 const result=formCoalition(s,'egypt',['numidia','armenia'],'senate',estimatedStrength);assert.ok(result.ok,JSON.stringify(result));
 s.world.diplomaticKnowledge.egypt||={};s.world.diplomaticKnowledge.egypt.contact={id:'contact',kind:'agreement',status:'active',parties:['egypt','caesar'],year:s.year,month:s.month};
 return {s,c:result.coalition};
}

test('a delivered invitation adds an AI member, charges real dues and preserves sovereignty',()=>{
 let {s,c}=playerCoalition();s.relations['armenia:caesar']=40;s.wars.push(['armenia','senate']);
 s.world.diplomaticKnowledge.caesar||={};s.world.diplomaticKnowledge.caesar.contact={id:'contact',kind:'agreement',status:'active',parties:['caesar','armenia'],year:s.year,month:s.month};
 const owners=s.regions.map(r=>r.owner),cash=s.factions.armenia.treasury;
 const send=sendCoalitionAdmission(s,c.id,'caesar','armenia');assert.ok(send.ok,JSON.stringify(send));assert.equal(s.factions.armenia.treasury,cash);
 advanceCoalitionAdmissions(s,estimatedStrength,roll);assert.equal(c.parties.length,3);
 advanceCoalitionAdmissions(s,estimatedStrength,roll);assert.equal(s.world.coalitionAdmissions[0].phase,'return');assert.equal(c.parties.length,3);
 s=upgradeSave(structuredClone(s));
 advanceCoalitionAdmissions(s,estimatedStrength,roll);assert.equal(s.coalitions[0].parties.length,3);
 advanceCoalitionAdmissions(s,estimatedStrength,roll);
 assert.equal(s.world.coalitionAdmissions[0].status,'accepted');assert.equal(s.coalitions[0].parties.length,4);
 assert.equal(s.factions.armenia.treasury,cash-5);
 assert.deepEqual(s.coalitions[0].foundingMembers,['caesar','egypt','numidia']);
 assert.deepEqual(s.coalitions[0].admissions.map(x=>x.member),['armenia']);
 assert.deepEqual(s.regions.map(r=>r.owner),owners);
});

test('a human invitation waits for an explicit letter answer and delayed confirmation',()=>{
 let {s,c}=aiCoalition();const cash=s.factions.caesar.treasury;
 assert.ok(sendCoalitionAdmission(s,c.id,'egypt','caesar').ok);
 advanceCoalitionAdmissions(s,estimatedStrength,roll);advanceCoalitionAdmissions(s,estimatedStrength,roll);
 assert.equal(s.world.coalitionAdmissions[0].phase,'awaiting_player');assert.equal(c.parties.includes('caesar'),false);
 syncCoalitionAdmissionLetters(s);const letter=receivedMail(s).find(x=>x.context?.kind==='coalition_admission');assert.ok(letter);assert.ok(letter.options.includes('accept_admission'));
 assert.ok(replyToLetter(s,letter.id,'accept_admission',{answerCoalitionAdmission}).ok);
 assert.equal(c.parties.includes('caesar'),false);assert.equal(s.factions.caesar.treasury,cash);
 s=upgradeSave(structuredClone(s));
 for(let i=0;i<3;i++)advanceCoalitionAdmissions(s,estimatedStrength,roll);
 assert.equal(s.coalitions[0].parties.includes('caesar'),false);
 advanceCoalitionAdmissions(s,estimatedStrength,roll);
 assert.equal(s.coalitions[0].parties.includes('caesar'),true,JSON.stringify(s.world.coalitionAdmissions[0]));
 assert.equal(s.factions.caesar.treasury,cash-5);
 syncCoalitionAdmissionLetters(s);assert.ok(receivedMail(s).some(x=>x.context?.kind==='coalition_admission_result'));
});

test('no reply or a changed coalition never enrolls a new member',()=>{
 const {s,c}=aiCoalition();assert.ok(sendCoalitionAdmission(s,c.id,'egypt','caesar').ok);
 advanceCoalitionAdmissions(s,estimatedStrength,roll);advanceCoalitionAdmissions(s,estimatedStrength,roll);
 for(let i=0;i<8;i++)advanceCoalitionAdmissions(s,estimatedStrength,roll);
 assert.equal(s.world.coalitionAdmissions[0].status,'no_reply');assert.equal(c.parties.includes('caesar'),false);
 const second=sendCoalitionAdmission(s,c.id,'egypt','caesar');assert.equal(second.reason,'cooldown');
});

test('AI proposes membership only when its charter is old enough and contact exists',()=>{
 const {s,c}=aiCoalition();s.month=6;proposeCoalitionAdmissionsAI(s);assert.equal(s.world.coalitionAdmissions.length,0);
 s.month=12;proposeCoalitionAdmissionsAI(s);assert.equal(s.world.coalitionAdmissions.length,1);
 assert.equal(s.world.coalitionAdmissions[0].target,'caesar');assert.equal(c.parties.includes('caesar'),false);
});

test('automated player simulation may accept an AI court invitation without a human inbox',()=>{
 const {s,c}=aiCoalition();assert.ok(sendCoalitionAdmission(s,c.id,'egypt','caesar').ok);
 for(let i=0;i<4;i++)advanceCoalitionAdmissions(s,estimatedStrength,roll,{autoplayPlayer:true});
 assert.equal(c.parties.includes('caesar'),true);
});

test('real monthly settlement delivers a membership invitation into the campaign mailbox',()=>{
 const {s,c}=aiCoalition();assert.ok(sendCoalitionAdmission(s,c.id,'egypt','caesar').ok);
 tick(s);tick(s);
 assert.equal(s.world.coalitionAdmissions[0].phase,'awaiting_player');
 assert.ok(receivedMail(s).some(x=>x.context?.kind==='coalition_admission'));
 assert.equal(c.parties.includes('caesar'),false);
});

test('Inspector rejects a phantom membership invitation without modifying the save',()=>{
 const {s,c}=aiCoalition();assert.ok(sendCoalitionAdmission(s,c.id,'egypt','caesar').ok);
 assert.equal(inspectState(s).some(x=>x.code==='invalid-coalition-admission'),false);
 s.world.coalitionAdmissions[0].coalitionId='missing';const before=structuredClone(s.world.coalitionAdmissions);
 assert.ok(inspectState(s).some(x=>x.code==='invalid-coalition-admission'&&x.path==='world.coalitionAdmissions[0]'));
 assert.deepEqual(s.world.coalitionAdmissions,before);
});
