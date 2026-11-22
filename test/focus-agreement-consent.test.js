import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=world-kings-observed-1';
import {advanceFocuses,focusState} from '../national-focus.js?v=world-kings-observed-1';
import {advanceAgreementProposals,answerAgreementProposal,sendAgreementProposal} from '../agreement-negotiations.js?v=world-kings-observed-1';
import {syncAgreementLetters,receivedMail,replyToLetter} from '../epistulae.js?v=world-kings-observed-1';

function start(seed){const s=newGame('caesar');s.seed=seed;s.wars=[];s.factions.egypt.treasury=100;s.relations['caesar:egypt']=60;const f=focusState(s,'egypt');f.active={id:'egy_back_caesar',progress:4,months:5,paid:{}};advanceFocuses(s);return s}
function step(s,options={}){s.month++;if(s.month>12){s.month=1;s.year++}advanceAgreementProposals(s,options);syncAgreementLetters(s)}
function hasTreaty(s){return s.agreements.some(x=>x.type==='defensive'&&x.parties.includes('egypt')&&x.parties.includes('caesar')&&x.status==='active')}
function reach(seed){const s=start(seed),x=s.world.agreementLetters.find(l=>l.actor==='egypt'&&l.target==='caesar');assert.ok(x);assert.equal(x.status,'pending');assert.equal(hasTreaty(s),false);step(s);step(s);return {s,x}}

test('a foreign focus sends a letter instead of binding the player, and consent needs a delivered confirmation',()=>{
 let found=null;for(let seed=1;seed<300&&!found;seed++){const {s,x}=reach(seed*1000003);if(x.phase!=='awaiting_player')continue;assert.equal(receivedMail(s).filter(m=>m.context?.kind==='agreement_offer').length,1);assert.equal(hasTreaty(s),false);
  const m=receivedMail(s).find(m=>m.context?.kind==='agreement_offer');assert.ok(replyToLetter(s,m.id,'accept_agreement',{answerAgreementProposal}).ok);assert.equal(hasTreaty(s),false);
  let saved=upgradeSave(structuredClone(s));for(let i=0;i<4;i++)step(saved);const result=saved.world.agreementLetters.find(l=>l.id===x.id);if(result.status==='accepted')found={saved,result};
 }
 assert.ok(found,'a successful round trip and confirmation should be possible');assert.ok(hasTreaty(found.saved));assert.equal(receivedMail(found.saved).filter(m=>m.context?.kind==='agreement_confirmation').length,1);syncAgreementLetters(found.saved);assert.equal(receivedMail(found.saved).filter(m=>m.context?.kind==='agreement_confirmation').length,1);
});
test('refusal, silence and lost letters never impose a treaty',()=>{
 const outcomes=new Set();for(let seed=1;seed<500;seed++){const {s,x}=reach(seed*1000003);if(x.phase==='awaiting_player'){
   if(!outcomes.has('refused')){assert.ok(answerAgreementProposal(s,x.id,'refuse').ok);step(s);step(s);if(x.status==='refused')outcomes.add('refused')}
   else if(!outcomes.has('ignored')){for(let i=0;i<8;i++)step(s);assert.equal(x.status,'no_reply');outcomes.add('ignored')}
   else {assert.ok(answerAgreementProposal(s,x.id,'accept_agreement').ok);for(let i=0;i<4;i++)step(s);if(x.status==='no_reply')outcomes.add('lost_after_accept')}
  }else {for(let i=0;i<2;i++)step(s);assert.equal(x.status,'no_reply');outcomes.add('lost_outbound')}
  if(x.status!=='accepted')assert.equal(hasTreaty(s),false);if(outcomes.size===4)break;
 }
 for(const outcome of ['refused','ignored','lost_outbound','lost_after_accept'])assert.ok(outcomes.has(outcome),outcome);
});
test('AI-only mode still evaluates a proposal to the normally human faction',()=>{
 let finished=false;for(let seed=1;seed<100&&!finished;seed++){const s=start(seed*1000003),x=s.world.agreementLetters[0];for(let i=0;i<4;i++)step(s,{autoplayPlayer:true});assert.notEqual(x.phase,'awaiting_player');if(x.status==='accepted')finished=true}assert.ok(finished);
});

test('a player-approved limited passage treaty keeps its exact territories through confirmation',()=>{
 let agreement=null;
 for(let seed=1;seed<200&&!agreement;seed++){
  const s=newGame('caesar');s.seed=seed*1000003;s.wars=[];s.relations['caesar:egypt']=60;s.factions.egypt.treasury=100;
  const access={permittedParty:'caesar',permittedTerritories:['egypt'],restrictions:[]};
  assert.equal(sendAgreementProposal(s,'egypt','caesar','military_access',{access}).ok,true);
  step(s);step(s);const offer=s.world.agreementLetters[0];if(offer.phase!=='awaiting_player')continue;
  assert.equal(answerAgreementProposal(s,offer.id,'accept_agreement').ok,true);
  for(let i=0;i<4;i++)step(s);
  agreement=s.agreements.find(item=>item.type==='military_access'&&item.status==='active')||null;
 }
 assert.ok(agreement,'a delivered approval and confirmation should be possible');
 assert.deepEqual(agreement.terms.access,{permittedParty:'caesar',permittedTerritories:['egypt'],restrictions:[]});
});
