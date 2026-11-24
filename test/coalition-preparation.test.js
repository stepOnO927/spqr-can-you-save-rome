import {startingTreaties} from './helpers/starting-treaties.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,estimatedStrength,upgradeSave} from '../engine.js?v=dossier-archive-1';
import {sendCoalitionInvitation,advanceCoalitionInvitations,canAddressCoalitionPartner,coalitionDispatchProblem,answerCoalitionInvitation} from '../coalition-negotiations.js?v=dossier-archive-1';
import {neutralityTerms} from '../agreements.js?v=dossier-archive-1';
import {receivedMail,replyToLetter,syncCoalitionLetters} from '../epistulae.js?v=dossier-archive-1';

function setup(){
 const s=newGame('caesar');s.relations['caesar:egypt']=40;s.relations['caesar:numidia']=40;s.relations['egypt:senate']=-30;s.relations['numidia:senate']=-30;
 s.world.diplomaticKnowledge.caesar={egypt:{id:'egypt',kind:'agreement',status:'active',parties:['caesar','egypt'],year:s.year,month:s.month},numidia:{id:'numidia',kind:'agreement',status:'active',parties:['caesar','numidia'],year:s.year,month:s.month}};return s;
}
function step(s,roll=()=>.5){if(++s.month>12){s.month=1;s.year++}advanceCoalitionInvitations(s,estimatedStrength,roll);syncCoalitionLetters(s)}
test('preparation explains own conflicts and never spends or reveals foreign private resources',()=>{
 const a=setup(),b=structuredClone(a);b.factions.egypt.treasury=0;b.factions.egypt.stability=0;b.diplomaticCredibility.egypt=0;b.relations['egypt:numidia']=-100;delete b.factions.numidia;
 const before=JSON.stringify(a);assert.equal(coalitionDispatchProblem(a,'caesar',['egypt','numidia'],'senate'),null);assert.equal(JSON.stringify(a),before);
 assert.deepEqual(coalitionDispatchProblem(a,'caesar',['egypt','numidia'],'senate'),coalitionDispatchProblem(b,'caesar',['egypt','numidia'],'senate'));
 assert.equal(coalitionDispatchProblem(a,'caesar',['egypt','egypt'],'senate').reason,'members');
 a.factions.caesar.treasury=7;assert.equal(coalitionDispatchProblem(a,'caesar',['egypt','numidia'],'senate').reason,'treasury');
 a.factions.caesar.treasury=8;a.wars.push(['caesar','egypt']);assert.equal(coalitionDispatchProblem(a,'caesar',['egypt','numidia'],'senate').reason,'conflict');
});
test('contact comes from own received evidence and ignores future and unseen foreign pacts',()=>{
 const s=setup();s.world.diplomaticKnowledge.caesar.egypt.year=s.year+1;
 assert.equal(canAddressCoalitionPartner(s,'caesar','egypt'),false);
 s.alliances.push(['caesar','egypt']);assert.equal(canAddressCoalitionPartner(s,'caesar','egypt'),false);
 s.world.diplomaticKnowledge.caesar.egypt.year=s.year;assert.equal(canAddressCoalitionPartner(s,'caesar','egypt'),true);
});
test('pending and repeat invitation explanations come from own dispatch history',()=>{
 const s=setup();assert.ok(sendCoalitionInvitation(s,'caesar',['egypt','numidia'],'senate').ok);
 assert.equal(coalitionDispatchProblem(s,'caesar',['egypt','numidia'],'senate').reason,'pending');
 for(let i=0;i<4;i++)step(s,()=>0);
 assert.equal(coalitionDispatchProblem(s,'caesar',['egypt','numidia'],'senate').reason,'cooldown');
 s.year++;assert.equal(coalitionDispatchProblem(s,'caesar',['egypt','numidia'],'senate'),null);
});
test('recipients judge posted credibility and consent is not rewritten at settlement',()=>{
 const a=setup();assert.ok(sendCoalitionInvitation(a,'caesar',['egypt','numidia'],'senate').ok);const b=structuredClone(a);
 b.diplomaticCredibility.caesar=0;b.factions.caesar.treasury=0;step(a);step(a);step(b);step(b);
 assert.deepEqual(b.world.coalitionInvitations[0].sealed,a.world.coalitionInvitations[0].sealed);assert.deepEqual(a.world.coalitionInvitations[0].sealed.replies,['accepted','accepted']);
 // Restore actual payment ability, then change opinions after the sealed answer.
 b.factions.caesar.treasury=a.factions.caesar.treasury;b.relations['caesar:egypt']=-100;b.relations['caesar:numidia']=-100;
 step(b);step(b);assert.equal(b.world.coalitionInvitations[0].status,'accepted');assert.equal(b.coalitions.length,1);
});
test('old pending letters retain a neutral baseline rather than reconstructing private credentials',()=>{
 let s=setup();assert.ok(sendCoalitionInvitation(s,'caesar',['egypt','numidia'],'senate').ok);delete s.world.coalitionInvitations[0].credentials;s.diplomaticCredibility.caesar=0;
 s=upgradeSave(structuredClone(s));step(s);step(s);assert.deepEqual(s.world.coalitionInvitations[0].sealed.replies,['accepted','accepted']);
});
test('actual resources and legal war obligations still prevent invalid conclusion',()=>{
 let s=setup();sendCoalitionInvitation(s,'caesar',['egypt','numidia'],'senate');step(s);step(s);s.factions.egypt.treasury=0;step(s);step(s);assert.equal(s.world.coalitionInvitations[0].status,'lapsed');assert.equal((s.coalitions||[]).length,0);
 s=setup();sendCoalitionInvitation(s,'caesar',['egypt','numidia'],'senate');step(s);step(s);s.wars.push(['egypt','numidia']);step(s);step(s);assert.equal(s.world.coalitionInvitations[0].status,'lapsed');
});
function incoming(){
 const s=setup();s.relations['egypt:numidia']=40;s.world.diplomaticKnowledge.egypt={caesar:{id:'caesar',status:'active',parties:['egypt','caesar']},numidia:{id:'numidia',status:'active',parties:['egypt','numidia']}};
 assert.ok(sendCoalitionInvitation(s,'egypt',['caesar','numidia'],'senate').ok);step(s);step(s);return s;
}
test('player can decline a conflicting coalition but cannot accept against own binding obligations',()=>{
 const s=incoming();s.wars.push(['caesar','numidia']);const before=s.factions.caesar.treasury;
 const m=receivedMail(s).find(m=>m.context?.kind==='coalition_offer');assert.ok(m);
 assert.equal(replyToLetter(s,m.id,'accept_coalition',{answerCoalitionInvitation}).reason,'coalition_conflict');assert.equal(m.responses.length,0);assert.equal(s.factions.caesar.treasury,before);
 assert.ok(replyToLetter(s,m.id,'refuse',{answerCoalitionInvitation}).ok);
});
test('new non-aggression and neutrality promises are respected before accepting and on conclusion',()=>{
 const s=incoming();s.wars=[];s.agreements.push({id:'neutral',type:'neutrality',status:'active',parties:['parthia','caesar'],expiresAt:s.year*12+s.month+12,terms:neutralityTerms('parthia','caesar','senate')});startingTreaties(s);
 assert.equal(answerCoalitionInvitation(s,s.world.coalitionInvitations[0].id,'accept_coalition').reason,'coalition_conflict');
});

test('an autonomous initiator still reassesses its own threat rather than inheriting human intent',()=>{
 const s=setup();s.relations['egypt:numidia']=40;s.world.diplomaticKnowledge.egypt={caesar:{id:'caesar',status:'active',parties:['egypt','caesar']},numidia:{id:'numidia',status:'active',parties:['egypt','numidia']}};
 assert.ok(sendCoalitionInvitation(s,'egypt',['caesar','numidia'],'senate',{autoplayPlayer:true}).ok);
 const advance=()=>{s.month++;advanceCoalitionInvitations(s,estimatedStrength,()=>.5,{autoplayPlayer:true})};advance();advance();assert.deepEqual(s.world.coalitionInvitations[0].sealed.replies,['accepted','accepted']);
 s.relations['egypt:senate']=100;for(const unit of s.armies.filter(a=>a.owner==='egypt'))unit.men=900000;advance();advance();assert.equal(s.world.coalitionInvitations[0].status,'lapsed');assert.equal((s.coalitions||[]).length,0);
});
