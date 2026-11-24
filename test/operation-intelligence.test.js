import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,estimatedStrength} from '../engine.js?v=dossier-archive-1';
import {createPlan,assignRole,approvePlan,aiBattlePlans,planById} from '../battle-plans.js?v=dossier-archive-1';
import {shareOperation,shareAiOperation,reportedOperationObjectives,operationNoticeRoute} from '../operation-intelligence.js?v=operation-notices-1';
import {sendLetter,advanceMail,receivedMail} from '../epistulae.js?v=dossier-archive-1';
import {observeControl} from '../control-intelligence.js?v=dossier-archive-1';

function setup(seed=49049){
 const s=newGame('senate');s.seed=seed;s.difficulty='expert';
 s.regions.find(r=>r.id==='africa').owner='caesar';s.wars.push(['caesar','numidia']);s.alliances.push(['numidia','senate']);observeControl(s);
 for(const a of s.armies.filter(a=>a.owner==='numidia'))a.men=15000;
 const p=createPlan(s,'senate',{mode:'automatic',objective:'africa',ai:true}).plan;
 assert.ok(assignRole(s,'senate',p.id,{armyId:'pompey',role:'offensive',path:['italiaS','sicilia','africa']}).ok);approvePlan(s,'senate',p.id);
 return {s,p};
}
function advance(s,n){for(let i=0;i<n;i++){if(++s.month>12){s.month=1;s.year++}advanceMail(s)}}
test('a hidden foreign relocation cannot change the sender’s postal route or its price and travel estimate',()=>{
 const {s,p}=setup(),copy=structuredClone(s);
 for(const r of copy.regions)if(r.owner==='numidia')r.owner='mauretania';
 copy.regions.find(r=>r.id==='egypt').owner='numidia';
 assert.deepEqual(operationNoticeRoute(copy,'senate','numidia'),operationNoticeRoute(s,'senate','numidia'));
 const a=shareOperation(s,'senate',p.id,'numidia',{sendLetter}),b=shareOperation(copy,'senate',p.id,'numidia',{sendLetter});
 assert.ok(a.ok&&b.ok);assert.equal(a.duration,b.duration);assert.equal(s.factions.senate.treasury,copy.factions.senate.treasury);
});
test('an undisclosed allied order cannot affect another court’s choice or claim coordination',()=>{
 const {s,p}=setup(),copy=structuredClone(s);copy.world.battlePlans.find(x=>x.id===p.id).roles[0].target='mauretania';
 const a=planById(s,aiBattlePlans(s,'numidia',{estimatedStrength})),b=planById(copy,aiBattlePlans(copy,'numidia',{estimatedStrength}));
 assert.deepEqual(a,b);assert.ok(!a.events.some(e=>e.kind==='coordinated'));
});
test('a notice costs real funds, stays private while traveling, and survives an old-save round trip',()=>{
 let {s,p}=setup();const before=s.factions.senate.treasury,result=shareOperation(s,'senate',p.id,'numidia',{sendLetter});assert.ok(result.ok);assert.ok(result.duration>=1);
 assert.equal(s.factions.senate.treasury,before-1);assert.deepEqual(reportedOperationObjectives(s,'numidia'),[]);assert.ok(!receivedMail(s).some(m=>m.context?.kind==='operation_notice'));
 assert.equal(shareOperation(s,'senate',p.id,'numidia',{sendLetter}).reason,'cooldown');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(s.factions.senate.treasury,before-1);assert.equal(s.mail.messages.find(m=>m.id===result.id).delivery,'traveling');
});
test('couriers may arrive or be lost without revealing another court’s later orders',()=>{
 const outcomes=new Set();
 for(let seed=1;seed<=160;seed++){
  const {s,p}=setup(seed*100003),r=shareOperation(s,'senate',p.id,'numidia',{sendLetter});assert.ok(r.ok);
  advance(s,r.duration-1);assert.deepEqual(reportedOperationObjectives(s,'numidia'),[]);advance(s,1);
  const m=s.mail.messages.find(m=>m.id===r.id);outcomes.add(m.delivery);
  if(m.delivery==='lost')assert.deepEqual(reportedOperationObjectives(s,'numidia'),[]);
  if(outcomes.size===2)break;
 }
 assert.ok(outcomes.has('received'));assert.ok(outcomes.has('lost'));
});
test('a delivered statement remains dated after hidden cancellation, but expires or loses eligibility',()=>{
 const {s,p}=setup(),r=shareOperation(s,'senate',p.id,'numidia',{sendLetter}),m=s.mail.messages.find(m=>m.id===r.id);m.delivery='received';m.arrival=s.year*12+s.month;
 const known=reportedOperationObjectives(s,'numidia');assert.equal(known[0].region,'africa');
 p.status='cancelled';p.roles[0].target='mauretania';assert.deepEqual(reportedOperationObjectives(s,'numidia'),known);
 assert.deepEqual(reportedOperationObjectives(s,'caesar'),[]);
 const old=structuredClone(s);old.month+=7;assert.deepEqual(reportedOperationObjectives(old,'numidia'),[]);
 const future=structuredClone(s);future.mail.messages.find(x=>x.id===m.id).context.observedYear++;assert.deepEqual(reportedOperationObjectives(future,'numidia'),[]);
 const broken=structuredClone(s);broken.alliances=[];assert.deepEqual(reportedOperationObjectives(broken,'numidia'),[]);
 const peace=structuredClone(s);peace.wars=peace.wars.filter(w=>!w.includes('numidia'));assert.deepEqual(reportedOperationObjectives(peace,'numidia'),[]);
});
test('AI dispatch is bounded, can act without a player, and never writes for a human court',()=>{
 const {s}=setup(),cash=s.factions.senate.treasury;
 shareAiOperation(s,'senate',{sendLetter});assert.equal(s.factions.senate.treasury,cash);
 assert.ok(shareAiOperation(s,'senate',{sendLetter,autoplayPlayer:true}).ok);assert.equal(s.factions.senate.treasury,cash-1);
 assert.equal(shareAiOperation(s,'senate',{sendLetter,autoplayPlayer:true}).reason,'cooldown');
 const {s:ai}=setup();ai.player='caesar';assert.ok(shareAiOperation(ai,'senate',{sendLetter}).ok);
});
test('one partner’s cooldown does not permanently prevent notifying a different ally',()=>{
 const {s}=setup();s.player='caesar';s.alliances.push(['senate','egypt']);
 assert.ok(shareAiOperation(s,'senate',{sendLetter}).ok);
 const first=s.mail.messages.find(m=>m.context?.kind==='operation_notice').recipient;
 assert.equal(shareAiOperation(s,'senate',{sendLetter}).ok,false);
 s.month++;assert.ok(shareAiOperation(s,'senate',{sendLetter}).ok);
 const sent=s.mail.messages.filter(m=>m.context?.kind==='operation_notice');
 assert.equal(sent.length,2);assert.notEqual(sent[1].recipient,first);
});
