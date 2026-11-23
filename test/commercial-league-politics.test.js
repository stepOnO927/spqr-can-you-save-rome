import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=office-intel-privacy-1';
import {proposeCommercialLeague,advanceCommercialLeagueOffers} from '../commercial-leagues.js?v=office-intel-privacy-1';
import {proposeCommercialLeagueMotion,voteCommercialLeagueMotion,advanceCommercialLeagueMotions,advanceCommercialLeagueAdmissions,eligibleCommercialLeagueTargets} from '../commercial-league-politics.js?v=office-intel-privacy-1';
import {syncCommercialLeagueMotionLetters,syncCommercialLeagueAdmissionLetters,receivedMail,replyToLetter} from '../epistulae.js?v=office-intel-privacy-1';

const roll=()=>.5;
const month=s=>{s.month++;if(s.month>12){s.month=1;s.year++}};
function council(){
 const s=newGame('caesar');
 for(const [a,b] of [['caesar','egypt'],['caesar','numidia'],['egypt','numidia'],['caesar','armenia'],['egypt','armenia'],['numidia','armenia']])s.relations[[a,b].sort().join(':')]=50;
 s.world.diplomaticKnowledge.caesar={egypt:{kind:'agreement',status:'active',parties:['caesar','egypt']},numidia:{kind:'agreement',status:'active',parties:['caesar','numidia']},armenia:{kind:'agreement',status:'active',parties:['caesar','armenia']}};
 const proposed=proposeCommercialLeague(s,'caesar',['egypt','numidia']);assert.ok(proposed.ok,JSON.stringify(proposed));
 for(let i=0;i<4;i++){month(s);advanceCommercialLeagueOffers(s,roll)}
 const c=s.world.commercialLeagues[0];assert.ok(c);return {s,c};
}

test('unanimous nomination sends a separate invitation and charges dues only on acceptance',()=>{
 let {s,c}=council();const owners=s.regions.map(r=>r.owner),memberCash=s.factions.armenia.treasury,sponsorCash=s.factions.caesar.treasury;
 assert.ok(eligibleCommercialLeagueTargets(s,c,'caesar').includes('armenia'));
 const p=proposeCommercialLeagueMotion(s,c.id,'caesar','admission','armenia');assert.ok(p.ok,JSON.stringify(p));
 assert.equal(s.factions.caesar.treasury,sponsorCash-5);assert.equal(c.parties.length,3);
 s=upgradeSave(structuredClone(s));c=s.world.commercialLeagues[0];
 for(let i=0;i<4;i++){month(s);advanceCommercialLeagueMotions(s)}
 assert.equal(s.world.commercialLeagueMotions[0].status,'passed');assert.equal(s.world.commercialLeagueAdmissions.length,1);assert.equal(c.parties.length,3);
 for(let i=0;i<4;i++){month(s);advanceCommercialLeagueAdmissions(s,roll)}
 assert.equal(c.parties.includes('armenia'),true);assert.equal(s.factions.armenia.treasury,memberCash-3);assert.equal(c.reserve,12);
 assert.deepEqual(s.regions.map(r=>r.owner),owners);
});

test('human member receives a ballot and a no vote blocks unanimous admission',()=>{
 const {s,c}=council(),cash=s.factions.egypt.treasury;
 const p=proposeCommercialLeagueMotion(s,c.id,'egypt','admission','armenia');assert.equal(p.ok,false); // Contact belongs to the sponsor.
 s.world.diplomaticKnowledge.egypt={armenia:{kind:'agreement',status:'active',parties:['egypt','armenia']}};
 const motion=proposeCommercialLeagueMotion(s,c.id,'egypt','admission','armenia');assert.ok(motion.ok,JSON.stringify(motion));
 month(s);advanceCommercialLeagueMotions(s);syncCommercialLeagueMotionLetters(s);
 const letter=receivedMail(s).find(m=>m.context?.kind==='commercial_league_motion');assert.ok(letter);
 assert.equal(motion.motion.votes.caesar,undefined);
 assert.equal(replyToLetter(s,letter.id,'no',{}).ok,true);
 for(let i=0;i<3;i++){month(s);advanceCommercialLeagueMotions(s)}
 assert.equal(motion.motion.status,'rejected');assert.equal(s.world.commercialLeagueAdmissions.length,0);
 assert.equal(s.factions.egypt.treasury,cash-2);syncCommercialLeagueMotionLetters(s);
 assert.ok(receivedMail(s).some(m=>m.context?.kind==='commercial_league_motion_result'));
});

test('human invitee can refuse or accept, and acceptance waits for confirmation',()=>{
 const {s,c}=council();s.player='armenia';const cash=s.factions.armenia.treasury;
 const motion=proposeCommercialLeagueMotion(s,c.id,'caesar','admission','armenia');assert.ok(motion.ok);
 for(let i=0;i<4;i++){month(s);advanceCommercialLeagueMotions(s)}
 for(let i=0;i<2;i++){month(s);advanceCommercialLeagueAdmissions(s,roll)}
 syncCommercialLeagueAdmissionLetters(s);
 const letter=receivedMail(s).find(m=>m.context?.kind==='commercial_league_admission');assert.ok(letter);
 assert.equal(replyToLetter(s,letter.id,'accept_commercial_admission',{}).ok,true);
 assert.equal(c.parties.includes('armenia'),false);assert.equal(s.factions.armenia.treasury,cash);
 for(let i=0;i<2;i++){month(s);advanceCommercialLeagueAdmissions(s,roll)}
 assert.equal(c.parties.includes('armenia'),false);
 for(let i=0;i<2;i++){month(s);advanceCommercialLeagueAdmissions(s,roll)}
 assert.equal(c.parties.includes('armenia'),true);assert.equal(s.factions.armenia.treasury,cash-3);
 syncCommercialLeagueAdmissionLetters(s);assert.ok(receivedMail(s).some(m=>m.context?.kind==='commercial_league_admission_result'));
});

test('leadership, expulsion and dissolution change only organization membership and reserve',()=>{
 const {s,c}=council(),owners=s.regions.map(r=>r.owner);
 s.relations['caesar:egypt']=-30;s.relations['caesar:numidia']=-20;s.relations['egypt:numidia']=60;
 const leadership=proposeCommercialLeagueMotion(s,c.id,'egypt','leadership','egypt');assert.ok(leadership.ok);
 for(let i=0;i<4;i++){month(s);advanceCommercialLeagueMotions(s)}
 assert.equal(leadership.motion.status,'passed');assert.equal(c.leader,'egypt');
 c.parties.push('armenia');c.financialCommitments.armenia=3;c.reserve+=3;
 s.relations['caesar:numidia']=-70;s.relations['egypt:numidia']=-70;s.relations['armenia:numidia']=-70;
 const expelled=proposeCommercialLeagueMotion(s,c.id,'egypt','expulsion','numidia');assert.ok(expelled.ok);
 month(s);advanceCommercialLeagueMotions(s);assert.ok(voteCommercialLeagueMotion(s,expelled.motion.id,'caesar','yes').ok);
 for(let i=0;i<3;i++){month(s);advanceCommercialLeagueMotions(s)}
 assert.equal(expelled.motion.status,'passed');assert.equal(c.parties.includes('numidia'),false);
 c.cohesion=20;const dissolve=proposeCommercialLeagueMotion(s,c.id,'egypt','dissolution','egypt');assert.ok(dissolve.ok);
 for(let i=0;i<4;i++){month(s);advanceCommercialLeagueMotions(s)}
 assert.equal(dissolve.motion.status,'passed');assert.equal(c.status,'dissolved');assert.equal(c.reserve,0);
 assert.deepEqual(s.regions.map(r=>r.owner),owners);
});

test('old commercial league saves gain council records without changing member sovereignty',()=>{
 const {s,c}=council();delete c.motions;delete c.admissions;delete c.departures;c.charter.admission='founders_unanimous';
 const restored=upgradeSave(structuredClone(s)),copy=restored.world.commercialLeagues[0];
 assert.deepEqual(copy.motions,[]);assert.deepEqual(copy.admissions,[]);assert.deepEqual(copy.departures,[]);
 assert.equal(copy.charter.admission,'unanimous_member_vote_and_invitee_consent');
 assert.deepEqual(copy.parties,c.parties);
});
