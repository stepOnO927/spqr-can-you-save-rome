import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,upgradeSave,issueMilitaryOrder,estimatedStrength,tick} from '../engine.js?v=dossier-archive-1';
import {createPlan,assignRole,approvePlan,advanceBattlePlans,planControlled} from '../battle-plans.js?v=dossier-archive-1';
import {sendLetter,courierMonths,advanceMail} from '../epistulae.js?v=dossier-archive-1';
import {observeControl} from '../control-intelligence.js?v=dossier-archive-1';
import {observeDiplomacy} from '../diplomatic-knowledge.js?v=dossier-archive-1';
import {jointPartners,proposeJointOperation,answerJointOperation,advanceJointOperations,releaseJointOperation,jointInvitations,proposeAiJointOperation} from '../joint-operations.js?v=joint-operations-1';

const date=s=>s.year*12+s.month,opts={sendLetter,courierMonths,estimatedStrength};
function setup(){
 const s=newGame('senate');s.difficulty='expert';s.player='numidia';
 s.regions.find(r=>r.id==='africa').owner='caesar';s.regions.find(r=>r.id==='mauretania').owner='caesar';s.wars.push(['numidia','caesar']);s.alliances.push(['numidia','senate']);s.relations['numidia:senate']=60;
 for(const f of ['senate','numidia'])Object.assign(s.factions[f],{treasury:300,food:300,stability:80});
 const a=s.armies.find(a=>a.id==='pompey'),b=s.armies.find(a=>a.owner==='numidia');for(const u of [a,b])Object.assign(u,{men:12000,morale:80,move:null,siege:null});
 observeControl(s);observeDiplomacy(s);
 const p=createPlan(s,'senate',{name:'African front',mode:'automatic',objective:'africa'}).plan,q=createPlan(s,'numidia',{name:'Western front',mode:'automatic',objective:'mauretania'}).plan;
 assert.ok(assignRole(s,'senate',p.id,{armyId:a.id,role:'offensive',path:['italiaS','sicilia','africa']}).ok);
 assert.ok(assignRole(s,'numidia',q.id,{armyId:b.id,role:'offensive',path:['mauretania']}).ok);
 approvePlan(s,'senate',p.id);approvePlan(s,'numidia',q.id);return {s,p,q,a,b};
}
function frame(s,{orders=false,calls=[]}={}){
 if(++s.month>12){s.month=1;s.year++}
 if(orders)advanceBattlePlans(s,{autoplayPlayer:true,estimatedStrength,issueOrder:(...args)=>{calls.push({date:date(s),army:args[1]});return issueMilitaryOrder(...args)}});
 advanceMail(s);advanceJointOperations(s,opts);return calls;
}
function invite(f){const r=proposeJointOperation(f.s,'senate',f.p.id,'numidia',opts);assert.ok(r.ok,r.reason);const m=f.s.mail.messages.find(m=>m.id===r.id);m.courierRisk=0;return m}
function deliverOffer(f){const m=invite(f);while(date(f.s)<m.arrival)frame(f.s);assert.equal(m.delivery,'received');return m}
function accepted(f){const m=deliverOffer(f),r=answerJointOperation(f.s,'numidia',m.id,'accept',f.q.id,opts);assert.ok(r.ok,r.reason);f.s.mail.messages.find(m=>m.id===r.id).courierRisk=0;return m}
function agreed(f){const offer=accepted(f);while(f.q.coordination.state!=='agreed'&&date(f.s)<offer.context.launchAt){frame(f.s);for(const m of f.s.mail.messages.filter(m=>m.context?.kind==='joint_confirmation'))m.courierRisk=0}assert.equal(f.p.coordination.state,'agreed');assert.equal(f.q.coordination.state,'agreed');return offer}

test('a joint invitation reserves only the sender and charges its real fee',()=>{
 const f=setup(),before=f.s.factions.senate.treasury,other=structuredClone(f.q);assert.ok(jointPartners(f.s,'senate',f.p.id).includes('numidia'));
 const m=invite(f);assert.equal(f.s.factions.senate.treasury,before-5);assert.equal(m.delivery,'traveling');assert.deepEqual(f.q,other);assert.equal(f.p.coordination.state,'waiting_reply');assert.equal(f.a.move,null);assert.ok(planControlled(f.s,f.a.id));
 assert.equal(proposeJointOperation(f.s,'senate',f.p.id,'numidia',opts).ok,false);
});
test('the sender cannot use hidden allied wars or relocation to select a partner or postal estimate',()=>{
 const a=setup(),b=setup();b.s.wars=b.s.wars.filter(w=>!w.includes('numidia'));for(const r of b.s.regions)if(r.owner==='numidia')r.owner='egypt';b.s.regions.find(r=>r.id==='egypt').owner='numidia';
 assert.deepEqual(jointPartners(a.s,'senate',a.p.id),jointPartners(b.s,'senate',b.p.id));const x=invite(a),y=invite(b);assert.equal(x.arrival,y.arrival);assert.equal(x.context.launchAt,y.context.launchAt);
});
test('acceptance, confirmation and the agreed month cause real orders for both independent fronts',()=>{
 const f=setup();agreed(f);assert.equal(f.s.factions.numidia.treasury,298);assert.equal(f.a.move,null);assert.equal(f.b.move,null);
 const calls=[];while(date(f.s)<f.p.coordination.launchAt)frame(f.s,{orders:true,calls});
 assert.deepEqual(new Set(calls.map(x=>x.date)),new Set([f.p.coordination.launchAt]));assert.ok(f.a.move);assert.ok(f.b.move);assert.equal(f.p.coordination.state,'launched');assert.equal(f.q.coordination.state,'launched');assert.notEqual(f.a.owner,f.b.owner);
});
test('a lost final confirmation leaves the sender able to act alone without a magical receipt',()=>{
 const f=setup();accepted(f);while(f.p.coordination.state!=='agreed')frame(f.s);
 const confirmation=f.s.mail.messages.find(m=>m.context?.kind==='joint_confirmation');confirmation.courierRisk=1;
 const before=structuredClone(f.p.coordination);while(date(f.s)<f.p.coordination.launchAt)frame(f.s,{orders:true});
 assert.equal(confirmation.delivery,'lost');assert.ok(f.a.move);assert.equal(f.b.move,null);assert.equal(f.q.coordination.state,'missed');assert.equal(before.partnerObjective,'mauretania');
 assert.ok(!('recipientReceived' in f.p.coordination));assert.ok(!f.s.log.some(l=>l.en?.includes('confirmation was lost')));
});
test('a confirmation arriving in the launch month is too late for the receiver',()=>{
 const f=setup();accepted(f);while(f.p.coordination.state!=='agreed')frame(f.s);const m=f.s.mail.messages.find(m=>m.context?.kind==='joint_confirmation');m.courierRisk=0;m.arrival=f.p.coordination.launchAt;
 while(date(f.s)<f.p.coordination.launchAt)frame(f.s,{orders:true});assert.ok(f.a.move);assert.equal(f.b.move,null);assert.equal(f.q.coordination.state,'missed');
});
test('a decline, silence, lost invitation or lost reply never silently authorizes departure',()=>{
 for(const kind of ['decline','ignore','lost_invite','lost_reply']){
  const f=setup();let m;
  if(kind==='lost_invite'){m=invite(f);m.courierRisk=1}else{m=deliverOffer(f);const r=answerJointOperation(f.s,'numidia',m.id,kind==='lost_reply'?'accept':kind,f.q.id,opts);assert.ok(r.ok);if(r.id)f.s.mail.messages.find(m=>m.id===r.id).courierRisk=kind==='lost_reply'?1:0}
  while(date(f.s)<m.context.launchAt)frame(f.s,{orders:true});assert.equal(f.a.move,null,kind);if(kind==='lost_reply')assert.equal(f.b.move,null,kind);assert.notEqual(f.p.coordination.state,'launched');
 }
});
test('private partner edits have no immediate effect on the sender’s agreement knowledge',()=>{
 const f=setup();agreed(f);const copy=structuredClone(f.s),p=copy.world.battlePlans.find(p=>p.id===f.p.id),q=copy.world.battlePlans.find(p=>p.id===f.q.id);q.roles[0].target='africa';
 frame(f.s);frame(copy);assert.deepEqual(p.coordination,f.p.coordination);assert.equal(q.coordination.state,'changed');assert.ok(copy.mail.messages.some(m=>m.context?.kind==='joint_withdrawal'&&m.delivery==='traveling'));
});
test('a new war, government, edited objective or a newly reported controller invalidates only the court that knows it',()=>{
 for(const kind of ['war','court','objective','control']){const f=setup();agreed(f);
  if(kind==='war'){f.s.wars=f.s.wars.filter(w=>!w.includes('numidia'));f.s.wars.push(['numidia','caesar']);(f.s.world.warGenerations||={})['caesar:numidia']=1}
  if(kind==='court')(f.s.world.dynasticGenerations||={}).numidia=1;
  if(kind==='objective')f.q.roles[0].target='africa';
  if(kind==='control')f.s.controlKnowledge.numidia.mauretania={owner:'egypt',year:f.s.year,month:f.s.month};
  advanceJointOperations(f.s,opts);assert.equal(f.q.coordination.state,'changed',kind);assert.equal(f.p.coordination.state,'agreed',kind);
 }
});
test('the player can explicitly withdraw and resume an independent plan without commanding the partner',()=>{
 const f=setup();agreed(f);const other=structuredClone(f.q.coordination);f.p.status='paused';assert.ok(releaseJointOperation(f.s,'senate',f.p.id,{...opts,resume:true}).ok);assert.equal(f.p.status,'active');assert.equal(f.p.coordination.state,'independent');assert.deepEqual(f.q.coordination,other);
 frame(f.s,{orders:true});assert.ok(f.a.move);assert.equal(f.b.move,null);
});
test('a reserved assisted plan keeps its armies and still requires the owner’s order after release',()=>{
 const f=setup();f.p.mode='assisted';agreed(f);assert.equal(planControlled(f.s,f.a.id),true);
 while(date(f.s)<f.p.coordination.launchAt)frame(f.s,{orders:true});assert.equal(f.a.move,null);assert.ok(f.p.recommendations.length>0);
});
test('pending, confirmed and expired correspondence survive save/load, while ordinary old plans keep working',()=>{
 const f=setup();accepted(f);const s=upgradeSave(JSON.parse(JSON.stringify(f.s))),p=s.world.battlePlans.find(p=>p.id===f.p.id);assert.deepEqual(p.coordination,f.p.coordination);assert.equal(s.mail.messages.find(m=>m.context?.kind==='joint_reply').delivery,'traveling');
 const ordinary=setup();assert.equal(ordinary.p.coordination,undefined);frame(ordinary.s,{orders:true});assert.ok(ordinary.a.move);
});
test('at least four autonomous courts can send and independently answer cooperation proposals across seeds',()=>{
 const reports=[];
 for(let n=1;n<=24;n++){
  const s=newGame('caesar');s.difficulty='expert';s.seed=(Math.imul(n,2654435761)^10949)>>>0;
  s.alliances.push(['caesar','egypt'],['parthia','armenia']);s.relations['caesar:egypt']=60;s.relations['armenia:parthia']=60;
  for(const actor of ['caesar','egypt','parthia','armenia']){Object.assign(s.factions[actor],{treasury:220,food:220,stability:80});if(actor!=='caesar')s.wars.push([actor,'senate'])}
  observeControl(s);observeDiplomacy(s);
  for(let i=0;i<24;i++)tick(s,{autoplayPlayer:true});
  const letters=s.mail.messages.filter(m=>m.context?.kind?.startsWith('joint_'));reports.push(letters.map(m=>`${m.senderFaction}>${m.recipient}:${m.context.kind}:${m.context.decision||'-'}:${m.delivery}`));
  assert.ok(['caesar','egypt','parthia','armenia'].every(id=>s.world.multipolarPlans[id]),'four courts reviewed the world independently');
 }
 assert.ok(reports.flat().some(x=>x.includes('joint_invite')),'AI initiates without human action');
 assert.ok(reports.flat().some(x=>x.includes('joint_reply:accept')),'AI sometimes accepts independently');
 assert.ok(reports.flat().some(x=>x.includes('joint_reply:decline')),'AI cooperation is not guaranteed');
 assert.ok(new Set(reports.map(x=>JSON.stringify(x))).size>1,'seeds produce different correspondence');
});
