import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,canFormAlliance,diplomacy} from '../engine.js?v=faces-name-disagreement-1';
import {sendAgreementProposal,advanceAgreementProposals,answerAgreementProposal} from '../agreement-negotiations.js?v=focus-agreement-consent-1';
import {knownAgreement,knownAlliance,receiveSignedTreatyCopy} from '../treaty-observation.js?v=treaty-observation-1';
import {syncAgreementLetters,receivedMail} from '../epistulae.js?v=faces-name-disagreement-1';
const step=s=>{if(++s.month>12){s.month=1;s.year++}advanceAgreementProposals(s,{checkAlliance:canFormAlliance});syncAgreementLetters(s)};
function start(seed=1000003,type='trade',human=false){const s=newGame('caesar');s.seed=seed;s.relations['caesar:egypt']=60;s.factions.caesar.treasury=100;if(human)s.player='egypt';assert.ok(sendAgreementProposal(s,'caesar','egypt',type).ok);return s}
function accepted(type='trade',human=false){for(let n=1;n<100;n++){const s=start(n*1000003,type,human);step(s);step(s);if(human){if(s.world.agreementLetters[0].phase!=='awaiting_player')continue;assert.ok(answerAgreementProposal(s,1,'accept_agreement').ok)}step(s);step(s);if(s.world.agreementLetters[0].status==='accepted')return s}throw Error('No ratified fixture')}

test('all courts ratify a returned acceptance locally; only the signed-copy recipient waits for the third leg',()=>{
 for(const human of [false,true]){
  let s=accepted('trade',human),x=s.world.agreementLetters[0];
  assert.ok(knownAgreement(s,'caesar','egypt','trade'));assert.equal(knownAgreement(s,'egypt','caesar','trade'),undefined);
  assert.equal(s.factions.caesar.treasury,92);assert.equal(x.signedCopy.status,'traveling');
  assert.equal(receivedMail(s).filter(m=>m.context?.kind==='agreement_confirmation').length,0);
  s=upgradeSave(structuredClone(s));step(s);assert.equal(knownAgreement(s,'egypt','caesar','trade'),undefined);step(s);x=s.world.agreementLetters[0];
  assert.equal(x.status,'accepted','sender cannot know whether its signed copy arrived');
  assert.equal(!!knownAgreement(s,'egypt','caesar','trade'),x.signedCopy.status==='received');
  if(human)assert.equal(receivedMail(s).filter(m=>m.context?.kind==='agreement_confirmation').length,x.signedCopy.status==='received'?1:0);
 }
});

test('hidden recipient commitments cannot turn a dated accepted reply into a sender-side refusal',()=>{
 const base=start();step(base);step(base);assert.equal(base.world.agreementLetters[0].sealed.outcome,'accepted');
 const altered=structuredClone(base);for(const r of altered.regions)if(r.owner==='egypt')r.owner='parthia';
 for(const s of [base,altered]){step(s);step(s)}
 assert.equal(base.world.agreementLetters[0].status,'accepted');assert.equal(altered.world.agreementLetters[0].status,'accepted');
 assert.deepEqual(knownAgreement(altered,'caesar','egypt','trade'),knownAgreement(base,'caesar','egypt','trade'));
 assert.equal(altered.agreements.length,0,'actual foreign legal impossibility does not create valid privileges');
 assert.equal(base.agreements.length,1);assert.equal(altered.factions.caesar.treasury,92);
});

test('a genuinely lost signed copy leaves the recipient uncertain without rewinding the sender or refunding its local expense',()=>{
 let lost=false,delivered=false;
 for(let n=1;n<150&&(!lost||!delivered);n++){
  const s=start(n*1000003);for(let i=0;i<6;i++)step(s);const x=s.world.agreementLetters[0];if(x.status!=='accepted')continue;
  assert.ok(knownAgreement(s,'caesar','egypt','trade'));assert.equal(s.factions.caesar.treasury,92);
  if(x.signedCopy.status==='lost'){lost=true;assert.equal(knownAgreement(s,'egypt','caesar','trade'),undefined);for(let i=0;i<6;i++)step(s);assert.equal(knownAgreement(s,'egypt','caesar','trade'),undefined)}
  if(x.signedCopy.status==='received')delivered=true;
 }
 assert.ok(lost&&delivered,'exercise actual seeded courier outcomes');
});

test('full-alliance signatures have stable references and never create a recipient copy before receipt',()=>{
 const s=accepted('full_alliance');assert.ok(knownAlliance(s,'caesar','egypt'));assert.equal(knownAlliance(s,'egypt','caesar'),false);
 const x=s.world.agreementLetters[0],paper=structuredClone(x.signedCopy.document);
 assert.equal(paper.reference,'agreement-letter:1');
 assert.ok(diplomacy(s,'caesar','egypt','break'));assert.equal(knownAlliance(s,'caesar','egypt'),false);
 // A delayed duplicate cannot revive the signer's own withdrawal.
 assert.equal(receiveSignedTreatyCopy(s,paper,'caesar',{sender:'egypt'}),false);
});

test('legacy confirmations retain explicit consent and remaining travel without fabricating an earlier payment',()=>{
 let s=accepted('trade',true);const x=s.world.agreementLetters[0];
 s.agreements=[];delete s.world.diplomaticKnowledge.caesar[x.agreement];s.factions.caesar.treasury+=6;
 delete x.signedCopy;delete x.ratified;delete x.agreement;x.status='pending';x.phase='confirmation';x.remaining=2;
 s=upgradeSave(structuredClone(s));assert.equal(s.factions.caesar.treasury,98);step(s);
 assert.equal(s.factions.caesar.treasury,92);assert.ok(knownAgreement(s,'caesar','egypt','trade'));assert.equal(knownAgreement(s,'egypt','caesar','trade'),undefined);
 assert.equal(s.world.agreementLetters[0].signedCopy.remaining,2);
});
