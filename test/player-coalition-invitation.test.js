import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength,upgradeSave} from '../engine.js?v=dossier-archive-1';
import {sendCoalitionInvitation,advanceCoalitionInvitations,answerCoalitionInvitation} from '../coalition-negotiations.js?v=dossier-archive-1';
import {receivedMail,replyToLetter,syncCoalitionLetters} from '../epistulae.js?v=dossier-archive-1';

function setup(){
 const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['egypt:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 s.world.diplomaticKnowledge.egypt={caesar:{id:'caesar',status:'active',parties:['egypt','caesar']},numidia:{id:'numidia',status:'active',parties:['egypt','numidia']}};
 assert.ok(sendCoalitionInvitation(s,'egypt',['caesar','numidia'],'senate').ok);return s;
}
function step(s,roll=()=>.5){s.month++;advanceCoalitionInvitations(s,estimatedStrength,roll);syncCoalitionLetters(s)}
function reply(s,choice){const letter=receivedMail(s).find(m=>m.context?.kind==='coalition_offer');assert.ok(letter);return replyToLetter(s,letter.id,choice,{answerCoalitionInvitation})}

test('invitation and confirmation travel before a consenting player pays or joins',()=>{
 let s=setup();const treasury=s.factions.caesar.treasury,wars=structuredClone(s.wars);step(s);assert.equal(receivedMail(s).filter(m=>m.context?.kind==='coalition_offer').length,0);step(s);
 assert.equal(receivedMail(s).filter(m=>m.context?.kind==='coalition_offer').length,1);assert.ok(reply(s,'accept_coalition').ok);assert.equal(s.factions.caesar.treasury,treasury);assert.deepEqual(s.wars,wars);
 s=upgradeSave(structuredClone(s));step(s);step(s);assert.equal(s.factions.caesar.treasury,treasury);assert.equal(s.coalitions?.length||0,0);step(s);step(s);
 assert.equal(s.world.coalitionInvitations[0].status,'accepted');assert.equal(s.factions.caesar.treasury,treasury-5);assert.equal(s.coalitions[0].contributions.caesar.policy,'diplomacy');assert.deepEqual(s.wars,wars);
 assert.equal(receivedMail(s).filter(m=>m.context?.kind==='coalition_result').length,1);syncCoalitionLetters(s);assert.equal(receivedMail(s).filter(m=>m.context?.kind==='coalition_result').length,1);
});
test('lost invitations, refusals and insufficient resources never enroll the player',()=>{
 let s=setup();step(s,()=>0);step(s,()=>0);step(s);step(s);assert.equal(receivedMail(s).filter(m=>m.context?.kind==='coalition_offer').length,0);assert.equal(s.coalitions?.length||0,0);
 s=setup();step(s);step(s);s.factions.caesar.treasury=4;assert.equal(reply(s,'accept_coalition').ok,false);assert.ok(reply(s,'refuse').ok);step(s);step(s);assert.equal(s.coalitions?.length||0,0);
});
test('a lost final confirmation never collects membership funds',()=>{
 const s=setup(),treasury=s.factions.caesar.treasury;step(s);step(s);assert.ok(reply(s,'accept_coalition').ok);step(s);step(s);step(s);step(s,()=>0);
 assert.equal(s.world.coalitionInvitations[0].status,'no_reply');assert.equal(s.factions.caesar.treasury,treasury);assert.equal(s.coalitions?.length||0,0);assert.equal(receivedMail(s).filter(m=>m.context?.kind==='coalition_result').length,0);
});
