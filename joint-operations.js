import {REGIONS} from './data.js?v=phase-x-1';
import {campaignDate} from './campaign-date.js?v=calendar-1';
import {courierMonths as mailTravelMonths} from './epistulae.js?v=faces-name-disagreement-1';
import {isDeliveredReport} from './person-knowledge.js?v=faces-name-disagreement-1';
import {reportedControl} from './control-intelligence.js?v=control-delivery-1';
import {reportedDiplomacy} from './diplomatic-knowledge.js?v=control-delivery-1';
import {politicalMemoryAdjustment,rememberPoliticalEvent} from './political-memory.js?v=grand-chessboard-2';
import {operationPartners,operationNoticeRoute} from './operation-intelligence.js?v=operation-notices-1';
import {createPlan,assignRole,approvePlan,cancelPlan,findRoute,operationFingerprint,coordinationProblem} from './battle-plans.js?v=faces-name-disagreement-1';

// The existing mailbox is the correspondence ledger. Each court reserves only
// its OWN plan; a foreign plan is never dereferenced to discover its intentions.
const now=s=>s.year*12+s.month,pair=(a,b)=>[a,b].sort().join(':');
const war=(s,a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
const plans=(s,owner)=>(s.world.battlePlans||[]).filter(p=>p.owner===owner);
const messages=s=>s.mail?.messages||[];
const waiting=c=>c&&['waiting_reply','waiting_confirmation','agreed'].includes(c.state);
export const hasJointCommitment=(s,owner)=>plans(s,owner).some(p=>waiting(p.coordination));
export const jointReservedArmies=(s,owner)=>new Set(plans(s,owner).filter(p=>waiting(p.coordination)).flatMap(p=>p.roles.map(r=>r.armyId)));
export const jointReservedObjectives=(s,owner)=>new Set(plans(s,owner).filter(p=>waiting(p.coordination)).flatMap(p=>p.roles.filter(r=>['offensive','siege'].includes(r.role)&&!r.state.done&&!r.state.suspended).map(r=>r.target)));
const ownPlan=(s,owner,id)=>plans(s,owner).find(p=>p.id===id);
const generation=(s,owner)=>s.world.dynasticGenerations?.[owner]||0;
const warGeneration=(s,owner,enemy)=>s.world.warGenerations?.[pair(owner,enemy)]||0;
const note=(s,owner,en,zh)=>{if(owner===s.player){(s.log||=[]).unshift({year:s.year,month:s.month,en,zh,kind:'joint_operation'});s.log=s.log.slice(0,80)}};
const roll=(s,key)=>{let h=(s.seed^0x6f2875a1)>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;return (h>>>0)/4294967296};
const regionName=(id,i)=>REGIONS.find(r=>r.id===id)?.name?.[i]||id;
export const JOINT_COST=5,JOINT_ACCEPT_COST=2;
export function jointCampaignDate(index,lang){const year=Math.floor((index-1)/12),month=index-year*12;return campaignDate(month,year,lang)}

export function jointPlanEnemy(s,owner,plan){
 if(!plan||plan.owner!==owner||!['active','preparing'].includes(plan.status)||waiting(plan.coordination))return null;
 const roles=plan.roles.filter(r=>['offensive','siege'].includes(r.role)&&!r.state.done&&!r.state.suspended);
 if(!roles.length||plan.roles.some(r=>{const a=s.armies.find(a=>a.id===r.armyId);return !a||a.owner!==owner||a.men<=0||a.move||a.siege||a.reorg}))return null;
 const enemies=new Set(roles.map(r=>reportedControl(s,owner,r.target)?.owner));
 const enemy=[...enemies][0];return enemies.size===1&&enemy&&war(s,owner,enemy)?enemy:null;
}
export function jointPartners(s,owner,planId){
 const enemy=jointPlanEnemy(s,owner,ownPlan(s,owner,planId));if(!enemy)return [];
 const reports=reportedDiplomacy(s,owner).filter(d=>d.kind==='war'&&d.status==='active'&&now(s)-(d.year*12+d.month)>=0&&now(s)-(d.year*12+d.month)<=24);
 return operationPartners(s,owner).filter(id=>reports.some(d=>d.parties.includes(id)&&d.parties.includes(enemy)));
}
function reserve(s,plan,partner,enemy,invitationId,launchAt,state){
 plan.coordination={version:1,invitationId,partner,enemy,launchAt,state,signature:operationFingerprint(plan),ownGeneration:generation(s,plan.owner),warGeneration:warGeneration(s,plan.owner,enemy),wars:s.wars.filter(w=>w.includes(plan.owner)).map(w=>w.find(p=>p!==plan.owner))};
 plan.recommendations=[];return plan.coordination;
}
function validReservation(s,plan){
 return !coordinationProblem(s,plan);
}
function post(s,owner,recipient,subject,body,context,{sendLetter,source,destination,destinationKnown,threadId,expires}={}){
 return sendLetter(s,{senderInstitution:owner,senderFaction:owner,recipient,category:'military',priority:'important',confidentiality:'confidential',confidence:'unverified',subject,body,options:[],context,source,destination,destinationKnown,threadId,expires});
}
export function proposeJointOperation(s,owner,planId,recipient,{sendLetter,courierMonths}={}){
 const plan=ownPlan(s,owner,planId),enemy=jointPlanEnemy(s,owner,plan);
 if(!enemy||!jointPartners(s,owner,planId).includes(recipient))return {ok:false,reason:'plan_or_partner'};
 if(plans(s,owner).some(p=>waiting(p.coordination)))return {ok:false,reason:'commitment'};
 if(s.factions[owner].treasury<JOINT_COST)return {ok:false,reason:'treasury'};
 const previous=messages(s).filter(m=>m.senderFaction===owner&&m.context?.kind==='joint_invite');
 if(previous.some(m=>now(s)-(m.created.year*12+m.created.month)<12))return {ok:false,reason:'cooldown'};
 const route=operationNoticeRoute(s,owner,recipient),duration=courierMonths(s,route.source,route.destination),launchAt=now(s)+3*duration+4,deadline=now(s)+duration+3;
 const objective=plan.roles.find(r=>['offensive','siege'].includes(r.role)&&!r.state.done).target;
 const result=post(s,owner,recipient,['Joint operation proposal','共同作战邀请'],[
  `Our approved plan targets ${regionName(objective,0)}. We propose independent offensives against the same enemy, with orders released in ${jointCampaignDate(launchAt,'en')}. Review your own forces and approve your own plan in Operations. Acceptance costs 2 treasury. Reply within three months of expected arrival. A reply and final confirmation must both travel; loss or delay can leave one side acting alone. Assisted plans still require their owner's orders.`,
  `本方已批准以${regionName(objective,1)}为目标的计划，邀请双方各自进攻共同敌人，约定于${jointCampaignDate(launchAt,'zh')}解除出兵等待。请在“作战计划”中按己方情报、兵力和补给批准自己的计划；接受花费2国库。请在预计收信后三个月内答复。回信和最终确认都需送达；遗失或迟到可能使一方单独行动。辅助计划仍需本方批准命令。`],
  {kind:'joint_invite',enemy,objective,launchAt,deadline},{sendLetter,...route,expires:deadline});
 if(!result.ok)return result;
 s.factions[owner].treasury-=JOINT_COST;reserve(s,plan,recipient,enemy,result.letter.id,launchAt,'waiting_reply');
 note(s,owner,`Joint invitation dispatched for “${plan.name}”; your plan waits for correspondence.`,`“${plan.name}”协同邀请已寄出；本方计划等待往返信件。`);
 return {ok:true,id:result.letter.id,launchAt,duration,deadline};
}
export function jointInvitations(s,owner){
 return messages(s).filter(m=>m.recipient===owner&&m.delivery==='received'&&m.arrival<=now(s)&&m.context?.kind==='joint_invite'&&!m.context.jointAnswered&&Number.isInteger(m.context.launchAt)&&m.context.deadline>=now(s)&&m.context.launchAt>now(s)).slice(-20).reverse();
}
export function jointAcceptancePlans(s,owner,offer){
 if(!offer||!jointInvitations(s,owner).includes(offer)||!operationPartners(s,owner).includes(offer.senderFaction)||!war(s,owner,offer.context.enemy)||plans(s,owner).some(p=>waiting(p.coordination)))return [];
 const route=operationNoticeRoute(s,owner,offer.senderFaction);if(now(s)+2*mailTravelMonths(s,route.source,offer.source)>=offer.context.launchAt)return [];
 return plans(s,owner).filter(p=>jointPlanEnemy(s,owner,p)===offer.context.enemy);
}
export function answerJointOperation(s,owner,offerId,decision,planId,{sendLetter}={}){
 const offer=jointInvitations(s,owner).find(m=>m.id===offerId);if(!offer||!['accept','decline','ignore'].includes(decision))return {ok:false,reason:'unavailable'};
 if(decision==='ignore'){offer.context.jointAnswered='ignored';offer.context.jointProcessed=true;offer.read=true;return {ok:true}}
 const plan=decision==='accept'?jointAcceptancePlans(s,owner,offer).find(p=>p.id===planId):null;
 if(decision==='accept'&&(!plan||s.factions[owner].treasury<JOINT_ACCEPT_COST))return {ok:false,reason:'plan_or_funds'};
 const objective=plan?.roles.find(r=>['offensive','siege'].includes(r.role)&&!r.state.done)?.target;
 const result=post(s,owner,offer.senderFaction,decision==='accept'?['Joint operation acceptance','共同作战答复：接受']:['Joint operation declined','共同作战答复：拒绝'],decision==='accept'?[
  `Our own approved plan targets ${regionName(objective,0)}. We reserve it for the proposed month, subject to a final confirmation reaching us before then. Changed wars, government or readiness may prevent execution.`,
  `本方已批准以${regionName(objective,1)}为目标的独立计划，保留至约定月份；须在此前收到最终确认。战争、政府或准备情况改变时，仍可能无法执行。`]:['Our court declines this operation. No troops or treaty are committed.','本朝拒绝此次协同行动；未承诺部队或条约。'],
  {kind:'joint_reply',invitationId:offer.id,enemy:offer.context.enemy,launchAt:offer.context.launchAt,decision,objective},
  {sendLetter,...operationNoticeRoute(s,owner,offer.senderFaction),destination:offer.source,destinationKnown:!!offer.source,threadId:offer.threadId,expires:offer.context.launchAt-1});
 if(!result.ok)return result;
 offer.context.jointAnswered=decision;offer.context.jointProcessed=true;offer.read=true;
 if(plan){s.factions[owner].treasury-=JOINT_ACCEPT_COST;const c=reserve(s,plan,offer.senderFaction,offer.context.enemy,offer.id,offer.context.launchAt,'waiting_confirmation');c.replyId=result.letter.id}
 return {ok:true,id:result.letter.id};
}
export function releaseJointOperation(s,owner,planId,{sendLetter,resume=false}={}){
 const plan=ownPlan(s,owner,planId),c=plan?.coordination;if(!c||c.state==='independent')return {ok:false,reason:'plan'};
 c.state='independent';plan.recommendations=[];
 const route=operationNoticeRoute(s,owner,c.partner);
 post(s,owner,c.partner,['Joint operation withdrawal','协同计划撤回'],['Our court withdraws its reserved operation. This notice may arrive after your orders; decide independently.','本朝撤回保留的作战计划。此信可能晚于贵方出兵；请独立决定。'],{kind:'joint_withdrawal',invitationId:c.invitationId,enemy:c.enemy,launchAt:c.launchAt},{sendLetter,...route,threadId:c.invitationId});
 if(resume&&['paused','needs_attention'].includes(plan.status))approvePlan(s,owner,plan.id);
 return {ok:true};
}
function stop(s,plan,state,reason=state){plan.coordination.state=state;plan.coordination.stopReason=reason;plan.coordination.stoppedYear=s.year;plan.coordination.stoppedMonth=s.month;if(['active','preparing'].includes(plan.status))plan.status='paused';plan.recommendations=[];note(s,plan.owner,`“${plan.name}”: joint operation waits ended without authorization to depart. Review or resume independently.`,`“${plan.name}”：协同等待结束，未获出兵授权。请复核，或明确选择独立执行。`)}

function aiPlanReady(s,owner,plan,enemy,{estimatedStrength}){
 const roles=plan.roles.filter(r=>['offensive','siege'].includes(r.role)&&!r.state.done),force=roles.reduce((n,r)=>n+(s.armies.find(a=>a.id===r.armyId&&a.owner===owner)?.men||0),0);
 if(force<3000||roles.some(r=>(s.armies.find(a=>a.id===r.armyId&&a.owner===owner)?.morale||0)<50))return false;
 const targets=new Set(roles.map(r=>r.target)),sightings=Object.values(s.knowledge?.[owner]?.[enemy]?.sightings||{}).filter(x=>isDeliveredReport(s,x)&&targets.has(x.region)&&now(s)-((x.observationYear??x.year)*12+(x.observationMonth??x.month))>=0&&now(s)-((x.observationYear??x.year)*12+(x.observationMonth??x.month))<=2);
 const estimate=sightings.length?sightings.reduce((n,x)=>n+(x.strengthBand?.[1]||0),0):Math.max(3000,(estimatedStrength?.(s,owner,enemy)||8000)/Math.max(1,REGIONS.filter(r=>reportedControl(s,owner,r.id)?.owner===enemy).length));
 return force>estimate*1.25;
}
function createAiPlan(s,owner,enemy,{estimatedStrength}){
 const used=new Set(plans(s,owner).filter(p=>['draft','active','preparing','paused','needs_attention'].includes(p.status)).flatMap(p=>p.roles.map(r=>r.armyId)));
 const armies=s.armies.filter(a=>a.owner===owner&&a.men>2000&&a.morale>=60&&!a.move&&!a.siege&&!a.reorg&&!used.has(a.id)&&s.regions.find(r=>r.id===a.region)?.owner===owner).sort((a,b)=>b.men-a.men);
 const targets=REGIONS.filter(r=>reportedControl(s,owner,r.id)?.owner===enemy).sort((a,b)=>(b.tax+b.food)-(a.tax+a.food));
 const count=Math.max(1,targets.length),estimate=Math.max(3000,(estimatedStrength?.(s,owner,enemy)||8000)/count);
 for(const a of armies){if(a.men<estimate*1.4)continue;
  // A fresh sighting at the departure base takes precedence over a distant invitation.
  const threatened=Object.values(s.knowledge?.[owner]||{}).some(k=>Object.values(k.sightings||{}).some(x=>isDeliveredReport(s,x)&&x.region===a.region&&now(s)-((x.observationYear??x.year)*12+(x.observationMonth??x.month))>=0&&now(s)-((x.observationYear??x.year)*12+(x.observationMonth??x.month))<=2&&(x.strengthBand?.[1]||0)>a.men));if(threatened)continue;
  for(const target of targets){const path=findRoute(s,owner,a.region,target.id);if(!path?.length)continue;
   const r=createPlan(s,owner,{name:`${target.name[0]} coalition front`,mode:'automatic',objective:target.id,condition:{kind:'prepared'},fallback:a.region,ai:true});
   if(!assignRole(s,owner,r.plan.id,{armyId:a.id,role:'offensive',path}).ok){cancelPlan(s,owner,r.plan.id);continue}
   if(!aiPlanReady(s,owner,r.plan,enemy,{estimatedStrength})){cancelPlan(s,owner,r.plan.id);continue}
   approvePlan(s,owner,r.plan.id);return r.plan;
  }
 }
 return null;
}
export function advanceJointOperations(s,{sendLetter,estimatedStrength,autoplayPlayer=false}={}){
 // Process only statements actually received by their addressee, never a foreign plan's state.
 for(const m of [...messages(s)]){
  const x=m.context;if(m.delivery!=='received'||m.arrival>now(s)||!x?.kind?.startsWith('joint_')||x.jointProcessed)continue;
  const owner=m.recipient;
  if(x.kind==='joint_invite'){
   if(owner===s.player&&!autoplayPlayer)continue;
   if(!jointInvitations(s,owner).includes(m))continue;
   const f=s.factions[owner],trust=(s.relations[pair(owner,m.senderFaction)]||0)+politicalMemoryAdjustment(s,owner,m.senderFaction);
   let plan=null;
   const eligible=f&&f.treasury>=40&&f.food>=35&&f.stability>=45&&trust>=10&&s.wars.filter(w=>w.includes(owner)).length<3&&operationPartners(s,owner).includes(m.senderFaction)&&war(s,owner,x.enemy)&&!plans(s,owner).some(p=>waiting(p.coordination));
   if(eligible&&roll(s,`${m.id}:${owner}:reply`)<Math.max(.15,Math.min(.8,.3+trust*.005))){plan=jointAcceptancePlans(s,owner,m).find(p=>p.mode==='automatic'&&aiPlanReady(s,owner,p,x.enemy,{estimatedStrength}))||createAiPlan(s,owner,x.enemy,{estimatedStrength})}
   const result=answerJointOperation(s,owner,m.id,plan?'accept':'decline',plan?.id,{sendLetter});if(result.ok)x.jointProcessed=true;
   continue;
  }
  const plan=plans(s,owner).find(p=>p.coordination?.invitationId===x.invitationId&&p.coordination.partner===m.senderFaction),c=plan?.coordination;
  x.jointProcessed=true;if(!plan||x.enemy!==c.enemy||x.launchAt!==c.launchAt)continue;
  if(x.kind==='joint_reply'&&c.state==='waiting_reply'){
   if(x.decision!=='accept'){rememberPoliticalEvent(s,owner,c.partner,'joint_decline',-1);stop(s,plan,'declined');continue}
   rememberPoliticalEvent(s,owner,c.partner,'joint_acceptance',1);
   if(!validReservation(s,plan)||now(s)>=c.launchAt){stop(s,plan,'missed');continue}
   const route=operationNoticeRoute(s,owner,c.partner);if(now(s)+mailTravelMonths(s,route.source,m.source)>=c.launchAt){releaseJointOperation(s,owner,plan.id,{sendLetter});stop(s,plan,'missed');continue}
   const result=post(s,owner,c.partner,['Joint operation final confirmation','共同作战最终确认'],['Your acceptance reached us. We confirm our reserved plan for the stated month. This confirmation must reach your court before that month; loss or delay may leave one side acting alone.','贵方接受答复已送达。本方确认在约定月份执行保留计划。此确认须在该月前送达贵方；遗失或延迟可能使一方单独行动。'],{kind:'joint_confirmation',invitationId:c.invitationId,replyId:m.id,enemy:c.enemy,launchAt:c.launchAt},{sendLetter,...operationNoticeRoute(s,owner,c.partner),destination:m.source,destinationKnown:!!m.source,threadId:c.invitationId,expires:c.launchAt-1});
   if(result.ok){c.state='agreed';c.partnerObjective=x.objective;c.confirmationId=result.letter.id;note(s,owner,`“${plan.name}”: acceptance received; final confirmation dispatched. Partner receipt remains unknown.`,`“${plan.name}”：已收到接受答复，最终确认已寄出；对方是否收到仍未知。`)}
  }else if(x.kind==='joint_confirmation'&&c.state==='waiting_confirmation'&&x.replyId===c.replyId){
   if(validReservation(s,plan)&&now(s)<c.launchAt){c.state='agreed';rememberPoliticalEvent(s,owner,c.partner,'joint_confirmation',1);note(s,owner,`“${plan.name}”: final confirmation received.`,`“${plan.name}”：最终确认已送达。`)}else stop(s,plan,'missed');
  }else if(x.kind==='joint_withdrawal'){
   c.partnerWithdrawalReceived={year:s.year,month:s.month};rememberPoliticalEvent(s,owner,c.partner,'joint_withdrawal',-1);
   if(waiting(c))stop(s,plan,'partner_withdrew');else note(s,owner,`“${plan.name}”: a partner withdrawal arrived after the waiting period; your existing orders remain yours to review.`,`“${plan.name}”：对方撤回信在等待结束后送达；已有军令仍由本方复核。`);
  }
 }
 for(const owner of Object.keys(s.factions))for(const plan of plans(s,owner)){
  const c=plan.coordination;
  if(c?.needsWithdrawal){const state=c.state,reason=c.stopReason;delete c.needsWithdrawal;releaseJointOperation(s,owner,plan.id,{sendLetter});stop(s,plan,state,reason);continue}
  if(!waiting(c))continue;
  const problem=coordinationProblem(s,plan)||((owner!==s.player||autoplayPlayer)&&!aiPlanReady(s,owner,plan,c.enemy,{estimatedStrength})?'readiness':null);
  if(problem){
   releaseJointOperation(s,owner,plan.id,{sendLetter});stop(s,plan,'changed',problem);
  }else if(now(s)>=c.launchAt)stop(s,plan,'missed');
 }
}
export function proposeAiJointOperation(s,owner,{sendLetter,courierMonths,autoplayPlayer=false}={}){
 if(owner===s.player&&!autoplayPlayer||s.difficulty==='beginner'||!s.factions[owner]||s.factions[owner].treasury<55||s.factions[owner].food<40||s.factions[owner].stability<50)return;
 if(plans(s,owner).some(p=>waiting(p.coordination)))return;
 for(const plan of plans(s,owner)){
  if(plan.mode!=='automatic'||!jointPlanEnemy(s,owner,plan))continue;
  for(const partner of jointPartners(s,owner,plan.id)){
   const trust=(s.relations[pair(owner,partner)]||0)+politicalMemoryAdjustment(s,owner,partner);if(trust<20||roll(s,`${owner}:${partner}:${plan.id}:invite`)>.45)continue;
   const route=operationNoticeRoute(s,owner,partner);if(courierMonths(s,route.source,route.destination)>6)continue;
   const result=proposeJointOperation(s,owner,plan.id,partner,{sendLetter,courierMonths});if(result.ok)return result;
  }
 }
}
