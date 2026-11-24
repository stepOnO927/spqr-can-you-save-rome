import {startingTreaties} from './helpers/starting-treaties.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,canFormAlliance} from '../engine.js?v=dossier-archive-1';
import {sendAgreementProposal,advanceAgreementProposals} from '../agreement-negotiations.js?v=dossier-archive-1';

function start(seed=1000003){
 const s=newGame('caesar');s.seed=seed;s.factions.caesar.treasury=100;s.relations['caesar:egypt']=60;
 s.alliances.push(['egypt','parthia']);startingTreaties(s);assert.ok(sendAgreementProposal(s,'caesar','egypt','full_alliance').ok);return s;
}
function receive(s){for(let i=0;i<2;i++){if(++s.month>12){s.month=1;s.year++}advanceAgreementProposals(s,{checkAlliance:canFormAlliance})}return s.world.agreementLetters[0].sealed.outcome}
function report(s,id,kind,parties,{future=false}={}){
 s.world.diplomaticKnowledge||={};s.world.diplomaticKnowledge.egypt||={};
 s.world.diplomaticKnowledge.egypt[id]={id,kind,parties,status:'active',year:s.year+(future?1:0),month:s.month,source:'trade'};
}

test('full-alliance recipients do not inspect unreported sender wars or territorial collapse',()=>{
 let accepted=0;
 for(let i=1;i<=16;i++){const normal=start(i*1000003),hidden=structuredClone(normal);
  hidden.wars.push(['caesar','parthia']);for(const r of hidden.regions)if(r.owner==='caesar')r.owner='senate';
  const a=receive(normal),b=receive(hidden);assert.equal(b,a);if(a==='accepted')accepted++;
 }
 assert.ok(accepted>0,'exercise actual acceptance, not just refusal or lost couriers');
});

test('a recipient does not inspect an unreported sender alliance with its own enemy',()=>{
 for(let i=1;i<=12;i++){const known=start(i*1000003);known.wars.push(['egypt','armenia']);const hidden=structuredClone(known);hidden.alliances.push(['caesar','armenia']);assert.equal(receive(hidden),receive(known))}
});

test('dated reported conflicts with own obligations can cause refusal even when the world differs',()=>{
 const known=start(),unreported=structuredClone(known),future=structuredClone(known);
 report(known,'actor-war','war',['caesar','parthia']);report(future,'future-war','war',['caesar','parthia'],{future:true});
 assert.equal(receive(unreported),'accepted');assert.equal(receive(known),'refused');assert.equal(receive(future),'accepted');
 const ownWar=start();ownWar.wars.push(['egypt','armenia']);report(ownWar,'actor-alliance','alliance',['caesar','armenia']);assert.equal(receive(ownWar),'refused');
});

test('alliance contact credit is evaluated from the recipient’s surviving own participants',()=>{
 const s=newGame('senate');s.wars=[];s.alliances=[];s.relations['egypt:senate']=29;
 s.meetings.push({actor:'senate',targetFaction:'egypt',person:'cicero',target:'cleopatra',status:'met',year:s.year,month:s.month,contactCredit:1});
 assert.equal(canFormAlliance(s,'senate','egypt',{recipientReview:true}),true);
 s.world.characters.cicero.alive=false;
 assert.equal(canFormAlliance(s,'senate','egypt',{recipientReview:true}),true,'a hidden foreign death does not erase own contact history');
 s.world.characters.cleopatra.alive=false;
 assert.equal(canFormAlliance(s,'senate','egypt',{recipientReview:true}),false,'own participant incapacity can remove own credit');
});
