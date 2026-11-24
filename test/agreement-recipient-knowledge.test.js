import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave} from '../engine.js?v=dossier-archive-1';
import {AGREEMENT_TYPES} from '../agreements.js?v=dossier-archive-1';
import {sendAgreementProposal,advanceAgreementProposals} from '../agreement-negotiations.js?v=dossier-archive-1';
import {syncAgreementLetters,receivedMail} from '../epistulae.js?v=dossier-archive-1';

function start(seed=1000003,type='trade',relation=60,{bonus=false}={}){
 const s=newGame('caesar');s.seed=seed;s.relations['caesar:egypt']=relation;s.factions.caesar.treasury=100;
 if(bonus)s.inventions.caesar.active.government.push('gc_diplomacy');
 assert.ok(sendAgreementProposal(s,'caesar','egypt',type).ok);return s;
}
function step(s){if(++s.month>12){s.month=1;s.year++}advanceAgreementProposals(s);syncAgreementLetters(s)}
function receive(s){step(s);step(s);return s.world.agreementLetters[0]}
function replied(s){return s.world.agreementLetters[0].sealed?.outcome==='accepted'}

test('all nine received treaty types ignore the sender’s hidden current funding, territory and policy',()=>{
 const delivered=new Set();
 for(const type of Object.keys(AGREEMENT_TYPES))for(let seed=1;seed<=12;seed++){
  const a=start(seed*1000003,type),b=structuredClone(a),paper=structuredClone(b.world.agreementLetters[0]);
  b.factions.caesar.treasury=0;b.diplomaticCredibility.caesar=0;b.inventions.caesar.active.government.push('gc_diplomacy');
  for(const r of b.regions)if(r.owner==='caesar')r.owner='senate';
  const left=receive(a),right=receive(b);
  assert.deepEqual(right.credentials,paper.credentials);assert.deepEqual(right.sealed,left.sealed,type);
  assert.equal(right.phase,left.phase);assert.equal(right.status,'pending');
  assert.equal(b.agreements.length,0);assert.equal(receivedMail(b).filter(m=>m.context?.kind==='agreement_result').length,0);
  if(left.sealed.outcome!=='no_reply')delivered.add(type);
 }
 assert.deepEqual([...delivered].sort(),Object.keys(AGREEMENT_TYPES).sort(),'exercise actual received offers of every type, not just lost outbound couriers');
});

test('an accepted offer waits for the return courier and the sender still must pay the real treaty fee',()=>{
 const rich=start(),poor=structuredClone(rich);poor.factions.caesar.treasury=0;
 receive(rich);receive(poor);assert.ok(replied(rich));assert.ok(replied(poor));
 assert.equal(poor.world.agreementLetters[0].status,'pending');step(rich);step(poor);
 assert.equal(poor.world.agreementLetters[0].status,'pending');assert.equal(poor.agreements.length,0);
 step(rich);step(poor);assert.equal(rich.world.agreementLetters[0].status,'accepted');
 assert.equal(rich.factions.caesar.treasury,92);assert.equal(poor.world.agreementLetters[0].status,'lapsed');
 assert.equal(poor.factions.caesar.treasury,0);assert.equal(poor.agreements.length,0);
});

test('recovering sender funds before the answer arrives can conclude the original sealed acceptance',()=>{
 const s=start();s.factions.caesar.treasury=0;receive(s);assert.ok(replied(s));
 s.factions.caesar.treasury=100;step(s);step(s);
 assert.equal(s.world.agreementLetters[0].status,'accepted');assert.equal(s.factions.caesar.treasury,94);
});

test('diplomatic quality and stated reliability are snapshots carried by the proposal, not live foreign attributes',()=>{
 const quality=start(1000003,'trade',8,{bonus:true}),plain=start(1000003,'trade',8);
 quality.inventions.caesar.active.government=[];quality.diplomaticCredibility.caesar=0;
 plain.inventions.caesar.active.government.push('gc_diplomacy');
 assert.equal(receive(quality).sealed.outcome,'accepted');assert.equal(receive(plain).sealed.outcome,'refused');
 const reliable=start(1000003,'intelligence',26),bad=start(1000003,'intelligence',26);
 bad.world.agreementLetters[0].credentials.credibility=0;
 reliable.diplomaticCredibility.caesar=0;
 assert.equal(receive(reliable).sealed.outcome,'accepted');assert.equal(receive(bad).sealed.outcome,'refused');
});

test('own changed relations or an own war can still cause a recipient to refuse',()=>{
 const normal=start(),hostile=structuredClone(normal),war=structuredClone(normal);
 hostile.relations['caesar:egypt']=-50;war.wars.push(['caesar','egypt']);
 assert.equal(receive(normal).sealed.outcome,'accepted');
 assert.equal(receive(hostile).sealed.outcome,'refused');
 assert.equal(receive(war).sealed.outcome,'unavailable');
});

test('saved proposal credentials survive loading and legacy letters do not reconstruct hidden credentials',()=>{
 const s=start(1000003,'trade',8,{bonus:true}),restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(restored.world.agreementLetters[0].credentials,s.world.agreementLetters[0].credentials);
 restored.inventions.caesar.active.government=[];assert.equal(receive(restored).sealed.outcome,'accepted');
 const legacy=start(1000003,'trade',8,{bonus:true});delete legacy.world.agreementLetters[0].credentials;
 const old=upgradeSave(JSON.parse(JSON.stringify(legacy)));assert.equal(receive(old).sealed.outcome,'refused');
 assert.equal(old.world.agreementLetters[0].credentials,undefined);
});
