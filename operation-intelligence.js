import {activeAgreement} from './agreements.js?v=dossier-archive-1';
import {reportedControl} from './control-intelligence.js?v=dossier-archive-1';

const now=s=>s.year*12+s.month;
const live=['preparing','active'];
const atWar=(s,a,b)=>(s.wars||[]).some(w=>w.includes(a)&&w.includes(b));
export function operationNoticeRoute(s,owner,recipient){
 const source=s.regions.find(r=>r.owner===owner)?.id||null;
 const destination=s.regions.find(r=>reportedControl(s,owner,r.id)?.owner===recipient)?.id||null;
 return {source,destination,destinationKnown:!!destination};
}
export function operationPartners(s,owner){
 return Object.keys(s.factions).filter(id=>id!==owner&&id!=='rebels'&&!atWar(s,owner,id)&&(
  (s.alliances||[]).some(pair=>pair.slice(0,2).includes(owner)&&pair.slice(0,2).includes(id))||
  ['defensive','offensive'].some(type=>activeAgreement(s,owner,id,type))));
}
export function shareOperation(s,owner,planId,recipient,{sendLetter}={}){
 const plan=(s.world.battlePlans||[]).find(p=>p.id===planId&&p.owner===owner);
 if(!plan||!live.includes(plan.status))return {ok:false,reason:'plan'};
 if(!operationPartners(s,owner).includes(recipient))return {ok:false,reason:'partner'};
 if(s.factions[owner].treasury<1)return {ok:false,reason:'treasury'};
 const objectives=[...new Set(plan.roles.filter(r=>['offensive','siege'].includes(r.role)&&!r.state?.done).map(r=>r.target))].slice(0,3).flatMap(id=>{
  const enemy=reportedControl(s,owner,id)?.owner;
  return enemy&&atWar(s,owner,enemy)?[{region:id,enemy}]:[];
 });
 if(!objectives.length)return {ok:false,reason:'objective'};
 const prior=(s.mail?.messages||[]).filter(m=>m.senderFaction===owner&&m.context?.kind==='operation_notice');
 if(prior.some(m=>{const age=now(s)-(m.created.year*12+m.created.month);return age>=0&&(age===0||m.recipient===recipient&&age<6)}))return {ok:false,reason:'cooldown'};
 const names=i=>objectives.map(o=>s.regions.find(r=>r.id===o.region)?.name?.[i]||o.region).join(i?'、':', ');
 const result=sendLetter(s,{senderInstitution:owner,senderFaction:owner,recipient,category:'military',priority:'important',...operationNoticeRoute(s,owner,recipient),
  subject:['Allied operational notice','盟军作战通报'],
  body:[`Our current operation proposes objectives at ${names(0)}. This is an intention as of dispatch, not proof that troops have moved. Plans may change before delivery. Decide independently using your own reports, forces and supplies; no march or declaration is required.`,
   `本方当前计划以${names(1)}为作战目标。这是发信时的意向，不证明军队已出发；送达前计划可能改变。请根据己方报告、兵力和补给独立决定，不要求行军或宣战。`],
  options:[],expires:now(s)+6,confidentiality:'confidential',confidence:'unverified',
  context:{kind:'operation_notice',planId,objectives,observedYear:s.year,observedMonth:s.month}});
 if(!result.ok)return result;
 s.factions[owner].treasury-=1;
 return {ok:true,id:result.letter.id,duration:result.letter.arrival-now(s)};
}
// Read delivered statements addressed to this court. Never dereference a foreign
// plan ID: changes or cancellation after dispatch are not known to the recipient.
export function reportedOperationObjectives(s,owner){
 const partners=new Set(operationPartners(s,owner));
 return (s.mail?.messages||[]).filter(m=>m.recipient===owner&&m.delivery==='received'&&m.context?.kind==='operation_notice'&&partners.has(m.senderFaction))
  .slice(-40).flatMap(m=>{
   const c=m.context,date=c.observedYear*12+c.observedMonth,age=now(s)-date;
   if(!Number.isFinite(age)||age<0||age>6||!Number.isFinite(m.arrival)||m.arrival>now(s)||m.expires<=now(s))return [];
   return (c.objectives||[]).slice(0,3).filter(o=>atWar(s,owner,o.enemy)&&reportedControl(s,owner,o.region)?.owner===o.enemy)
    .map(o=>({...o,from:m.senderFaction,year:c.observedYear,month:c.observedMonth,mailId:m.id}));
  });
}
export function shareAiOperation(s,owner,{sendLetter,autoplayPlayer=false}={}){
 if(owner===s.player&&!autoplayPlayer||!s.factions[owner]||s.factions[owner].treasury<10)return;
 const plans=(s.world.battlePlans||[]).filter(p=>p.owner===owner&&live.includes(p.status));
 let last;
 for(const plan of plans)for(const recipient of operationPartners(s,owner)){
  const result=shareOperation(s,owner,plan.id,recipient,{sendLetter});
  if(result.ok)return result;
  last=result;
 }
 return last;
}
