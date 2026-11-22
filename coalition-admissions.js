import {ROUTES} from './data.js?v=world-kings-sea-1';
import {reportedControl} from './control-intelligence.js?v=world-kings-sea-1';
import {reportedDiplomacy} from './diplomatic-knowledge.js?v=world-kings-sea-1';
import {admitCoalitionMember,coalitionInterest} from './coalitions.js?v=world-kings-sea-1';
import {rememberPoliticalEvent} from './political-memory.js?v=world-kings-sea-1';

const now=s=>s.year*12+s.month;
const relation=(s,a,b)=>s.relations[[a,b].sort().join(':')]??0;
export function initializeCoalitionAdmissions(s){s.world.coalitionAdmissions||=[];s.world.nextCoalitionAdmission||=1;return s}
function knownContact(s,actor,target){
 if(reportedDiplomacy(s,actor).some(doc=>doc.status==='active'&&doc.parties.includes(actor)&&doc.parties.includes(target)))return true;
 const owned=new Set(s.regions.filter(r=>r.owner===actor).map(r=>r.id));
 return ROUTES.some(([a,b])=>owned.has(a)&&reportedControl(s,actor,b)?.owner===target||owned.has(b)&&reportedControl(s,actor,a)?.owner===target);
}
export function eligibleCoalitionAdmissionTargets(s,coalition,actor){
 if(!coalition||coalition.status!=='active'||!coalition.parties.includes(actor)||coalition.parties.length>=5)return [];
 return Object.keys(s.factions).filter(id=>id!=='rebels'&&id!==coalition.target&&!coalition.parties.includes(id)&&knownContact(s,actor,id)).sort((a,b)=>relation(s,actor,b)-relation(s,actor,a)||a.localeCompare(b));
}
export function sendCoalitionAdmission(s,coalitionId,leader,target,{introducedBy=leader,prepaid=false}={}){
 initializeCoalitionAdmissions(s);
 const c=(s.coalitions||[]).find(x=>x.id===coalitionId&&x.status==='active'&&now(s)<x.expiresAt);
 if(!c||c.leader!==leader||!c.parties.includes(introducedBy)||!eligibleCoalitionAdmissionTargets(s,c,introducedBy).includes(target))return {ok:false,reason:'contact'};
 if(!prepaid&&s.factions[leader].treasury<3)return {ok:false,reason:'treasury'};
 s.world.coalitionAdmissions||=[];
 if(s.world.coalitionAdmissions.some(x=>x.coalitionId===coalitionId&&x.target===target&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(s.world.coalitionAdmissions.some(x=>x.coalitionId===coalitionId&&x.target===target&&now(s)-(x.sent.year*12+x.sent.month)<12))return {ok:false,reason:'cooldown'};
 const id=s.world.nextCoalitionAdmission||1;s.world.nextCoalitionAdmission=id+1;if(!prepaid)s.factions[leader].treasury-=3;
 s.world.coalitionAdmissions.push({id,coalitionId,leader,target,introducedBy,courierPayer:prepaid?introducedBy:leader,status:'pending',phase:'outbound',remaining:2,sent:{year:s.year,month:s.month},...(target===s.player?{humanRecipient:s.player}:{})});
 if(s.world.coalitionAdmissions.length>100){const old=s.world.coalitionAdmissions.findIndex(x=>x.status!=='pending');if(old>=0)s.world.coalitionAdmissions.splice(old,1)}
 return {ok:true,id,cost:3,months:4};
}
export function answerCoalitionAdmission(s,id,decision){
 const x=(s.world?.coalitionAdmissions||[]).find(y=>y.id===id&&y.status==='pending'&&y.phase==='awaiting_player'&&y.humanRecipient===s.player);
 if(!x||!['accept_admission','refuse','ignore'].includes(decision))return {ok:false,reason:'unavailable'};
 if(decision==='accept_admission'&&(s.factions[s.player]?.treasury??0)<5)return {ok:false,reason:'treasury'};
 x.playerDecision=decision==='accept_admission'?'accepted':decision==='refuse'?'refused':'no_reply';x.phase='return';x.remaining=2;return {ok:true};
}
function canStillConclude(s,x){const c=(s.coalitions||[]).find(y=>y.id===x.coalitionId);return c?.status==='active'&&c.leader===x.leader&&now(s)<c.expiresAt&&c.parties.length<5&&!c.parties.includes(x.target)}
function finish(s,x,estimateStrength,autoplayPlayer){
 if(x.status==='accepted'){
  const result=canStillConclude(s,x)&&admitCoalitionMember(s,x.coalitionId,x.leader,x.target,estimateStrength,{consentingPlayer:x.target===s.player&&(autoplayPlayer||x.playerDecision==='accepted')});
  if(result?.ok){const record=result.coalition.admissions.at(-1);if(record?.member===x.target)record.introducedBy=x.introducedBy||x.leader;rememberPoliticalEvent(s,x.leader,x.target,'cooperation_accepted',2);rememberPoliticalEvent(s,x.target,x.leader,'cooperation_accepted',2)}else x.status='lapsed';
 }
 x.delivered={year:s.year,month:s.month};x.phase='delivered';delete x.sealed;
 if(x.leader===s.player){s.log.unshift({year:s.year,month:s.month,en:x.status==='accepted'?'A new court joined our defensive coalition.':x.status==='refused'?'The court declined coalition membership.':'The membership invitation did not result in an agreement.',zh:x.status==='accepted'?'新成员加入了本方防御联盟。':x.status==='refused'?'对方拒绝加入联盟。':'成员邀请未能达成协议。'});s.log=s.log.slice(0,80)}
}
export function advanceCoalitionAdmissions(s,estimateStrength,roll,{autoplayPlayer=false}={}){
 for(const x of s.world?.coalitionAdmissions||[]){
  if(x.status!=='pending')continue;
  if(x.phase==='awaiting_player'){
   if(--x.remaining<=0){x.playerDecision='no_reply';x.phase='return';x.remaining=2}
   continue;
  }
  if(--x.remaining>0)continue;
  if(x.phase==='outbound'){
   if(!canStillConclude(s,x)){x.status='lapsed';finish(s,x,estimateStrength,autoplayPlayer);continue}
   if(roll(s,x.leader,x.id*20)<.1){x.status='no_reply';finish(s,x,estimateStrength,autoplayPlayer);continue}
   if(x.humanRecipient&&!autoplayPlayer){x.phase='awaiting_player';x.remaining=6;continue}
   const c=s.coalitions.find(y=>y.id===x.coalitionId),f=s.factions[x.target],credibility=s.diplomaticCredibility?.[x.leader]??100;
   const possible=f&&f.treasury>=5&&relation(s,x.target,x.leader)-(100-credibility)*.4>=15&&!c.parties.some(id=>s.wars.some(w=>w.includes(id)&&w.includes(x.target)))&&coalitionInterest(s,x.target,c.target,estimateStrength).interested;
   x.sealed=possible&&roll(s,x.target,x.id*20+1)<.8?'accepted':'refused';x.phase='return';x.remaining=2;continue;
  }
  if(x.phase==='confirmation'){
   x.status=roll(s,x.leader,x.id*20+3)<.1?'no_reply':x.provisional;delete x.provisional;finish(s,x,estimateStrength,autoplayPlayer);continue;
  }
  const outcome=roll(s,x.leader,x.id*20+2)<.1?'no_reply':x.playerDecision??x.sealed;
  if(x.humanRecipient&&x.playerDecision==='accepted'){x.provisional=outcome;x.phase='confirmation';x.remaining=2;delete x.sealed;continue}
  x.status=outcome;
  finish(s,x,estimateStrength,autoplayPlayer);
 }
}
export function proposeCoalitionAdmissionsAI(s,{autoplayPlayer=false}={}){
 if(s.month%6!==0)return;
 for(const c of s.coalitions||[]){
  if(c.status!=='active'||c.parties.length>=5||now(s)-(c.start.year*12+c.start.month)<6||c.leader===s.player&&!autoplayPlayer)continue;
  const target=eligibleCoalitionAdmissionTargets(s,c,c.leader).find(id=>relation(s,c.leader,id)>=15);
  if(target)sendCoalitionAdmission(s,c.id,c.leader,target);
 }
}
