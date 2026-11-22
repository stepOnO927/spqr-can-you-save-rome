import test from 'node:test';import assert from 'node:assert/strict';
import {newGame,upgradeSave,tick,canFormAlliance,diplomacy} from '../engine.js?v=economic-project-1';
import {sendAgreementProposal,advanceAgreementProposals} from '../agreement-negotiations.js?v=agreement-courier-1';
import {syncAgreementLetters,receivedMail} from '../epistulae.js?v=missing-fate-privacy-1';
const step=s=>{s.month++;if(s.month>12){s.month=1;s.year++}advanceAgreementProposals(s,{checkAlliance:canFormAlliance,concludeAlliance:(state,a,b)=>diplomacy(state,a,b,'alliance',{priorConsent:true})});syncAgreementLetters(s)};
function fixture(seed,relation=60){const s=newGame('caesar');s.seed=seed;s.relations['caesar:egypt']=relation;s.factions.caesar.treasury=100;return s}
function outcomes(relation=60){const values=new Map();for(let seed=1;seed<500&&values.size<3;seed++){const s=fixture((seed*1000003)>>>0,relation),start=sendAgreementProposal(s,'caesar','egypt','trade');assert.ok(start.ok);for(let i=0;i<4;i++)step(s);const x=s.world.agreementLetters[0];if(!values.has(x.status))values.set(x.status,{s,seed:(seed*1000003)>>>0})}return values}

test('proposals cost only the courier at dispatch, travel twice and survive save/load',()=>{
 const accepted=outcomes().get('accepted');assert.ok(accepted);let s=fixture(accepted.seed),cash=s.factions.caesar.treasury;const r=sendAgreementProposal(s,'caesar','egypt','trade');assert.deepEqual({ok:r.ok,cost:r.cost,months:r.months},{ok:true,cost:2,months:4});assert.equal(s.factions.caesar.treasury,cash-2);assert.equal(s.agreements.length,0);assert.equal(sendAgreementProposal(s,'caesar','egypt','trade').reason,'pending');assert.equal(sendAgreementProposal(s,'caesar','egypt','intelligence').reason,'pending');step(s);assert.equal(s.world.agreementLetters[0].status,'pending');step(s);assert.equal(s.world.agreementLetters[0].status,'pending');assert.equal(s.agreements.length,0);assert.equal(receivedMail(s).filter(x=>x.context?.kind==='agreement_result').length,0);s=upgradeSave(structuredClone(s));step(s);assert.equal(s.agreements.length,0);step(s);assert.equal(s.world.agreementLetters[0].status,'accepted');assert.equal(s.factions.caesar.treasury,cash-2-6);assert.ok(s.agreements.some(x=>x.type==='trade'&&x.status==='active'));assert.equal(receivedMail(s).filter(x=>x.context?.kind==='agreement_result').length,1);syncAgreementLetters(s);assert.equal(receivedMail(s).filter(x=>x.context?.kind==='agreement_result').length,1);
});
test('lost and refused proposals never create treaties or charge treaty fees',()=>{
 const values=outcomes();for(const status of ['refused','no_reply']){const result=values.get(status);assert.ok(result,`expected ${status}`);assert.equal(result.s.factions.caesar.treasury,98);assert.equal(result.s.agreements.length,0);assert.equal(receivedMail(result.s).filter(x=>x.context?.kind==='agreement_result').length,status==='refused'?1:0)}
 const declined=outcomes(-50).get('refused');assert.ok(declined);assert.equal(declined.s.factions.caesar.treasury,98);
});
test('a changed situation can prevent a proposal from being concluded without leaking private causes',()=>{
 const accepted=outcomes().get('accepted');const s=fixture(accepted.seed);sendAgreementProposal(s,'caesar','egypt','trade');step(s);step(s);step(s);s.factions.caesar.treasury=0;step(s);assert.equal(s.world.agreementLetters[0].status,'lapsed');assert.equal(s.agreements.length,0);assert.equal(receivedMail(s).filter(x=>x.context?.kind==='agreement_result').length,0);
});
test('old saves without proposal queues remain playable and the real monthly tick advances letters',()=>{
 let s=fixture(42);delete s.world.agreementLetters;s=upgradeSave(structuredClone(s));assert.ok(sendAgreementProposal(s,'caesar','egypt','trade').ok);const before=s.world.agreementLetters[0].remaining;tick(s);assert.equal(s.world.agreementLetters[0].remaining,before-1);
});

test('every agreement type can be concluded by a delivered proposal with its original terms',async()=>{
 const {AGREEMENT_TYPES,visibleAgreements}=await import('../agreements.js?v=agreement-courier-1');const seed=outcomes().get('accepted').seed;
 for(const [type,def] of Object.entries(AGREEMENT_TYPES)){const s=fixture(seed),cash=s.factions.caesar.treasury;assert.ok(sendAgreementProposal(s,'caesar','egypt',type,{secret:true}).ok,type);for(let i=0;i<4;i++)step(s);const letter=s.world.agreementLetters[0];assert.equal(letter.status,'accepted',type);const agreement=s.agreements.find(x=>x.id===letter.agreement);assert.equal(agreement.type,type);assert.equal(agreement.diplomaticCost,def.cost);assert.equal(agreement.duration,def.duration);assert.equal(s.factions.caesar.treasury,cash-2-def.cost);assert.equal(visibleAgreements(s,'parthia').some(x=>x.id===agreement.id),false);assert.equal(receivedMail(s).find(x=>x.context?.kind==='agreement_result')?.confidentiality,'secret')}
});

test('a sealed acceptance does not re-evaluate the recipient’s private opinion during its return journey',()=>{
 const seed=outcomes().get('accepted').seed,s=fixture(seed);sendAgreementProposal(s,'caesar','egypt','trade');step(s);step(s);assert.equal(s.world.agreementLetters[0].sealed.outcome,'accepted');s.relations['caesar:egypt']=-100;step(s);step(s);assert.equal(s.world.agreementLetters[0].status,'accepted');assert.ok(s.agreements.some(x=>x.type==='trade'&&x.status==='active'));
});

test('full alliances require a delivered response and preserve sealed consent',()=>{
 const seed=outcomes().get('accepted').seed,s=fixture(seed),cash=s.factions.caesar.treasury;
 assert.ok(sendAgreementProposal(s,'caesar','egypt','full_alliance').ok);
 step(s);step(s);assert.equal(s.world.agreementLetters[0].sealed.outcome,'accepted');
 assert.ok(!s.alliances.some(a=>a.includes('caesar')&&a.includes('egypt')));
 s.relations['caesar:egypt']=-100;step(s);step(s);
 assert.equal(s.world.agreementLetters[0].status,'accepted');
 assert.ok(s.alliances.some(a=>a.includes('caesar')&&a.includes('egypt')));
 assert.equal(s.factions.caesar.treasury,cash-2);
 assert.equal(receivedMail(s).filter(x=>x.context?.kind==='agreement_result').length,1);
});
