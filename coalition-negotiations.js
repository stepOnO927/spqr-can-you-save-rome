import {coalitionInterest,formCoalition} from './coalitions.js?v=dossier-archive-1';
import {reportedDiplomacy} from './diplomatic-knowledge.js?v=dossier-archive-1';
import {reportedControl} from './control-intelligence.js?v=dossier-archive-1';
import {ROUTES,FACTIONS} from './data.js?v=phase-x-1';
import {agreementCredentials,activeAgreement,neutralityBlocksWar} from './agreements.js?v=dossier-archive-1';
import {rememberPoliticalEvent} from './political-memory.js?v=grand-chessboard-2';

const relation=(s,a,b)=>s.relations[[a,b].sort().join(':')]??0;
export function canAddressCoalitionPartner(s,actor,target){
 return reportedDiplomacy(s,actor).some(d=>d.status==='active'&&(!Number.isFinite(d.year)||!Number.isFinite(d.month)||d.year*12+d.month<=s.year*12+s.month)&&d.parties.includes(actor)&&d.parties.includes(target))||s.regions.filter(r=>r.owner===actor).some(r=>ROUTES.some(([a,b])=>{const next=a===r.id?b:b===r.id?a:null;return next&&reportedControl(s,actor,next)?.owner===target}));
}

// Preparation reads only the initiating court's funds, contact reports, own
// commitments and dispatch history. Foreign willingness is never previewed.
export function coalitionDispatchProblem(s,leader,members,target){
 const parties=[leader,...members];
 if(parties.length!==3||new Set([...parties,target]).size!==4||parties.some(x=>!FACTIONS[x]||x==='rebels')||!FACTIONS[target]||target==='rebels')return {reason:'members'};
 if(members.some(id=>!canAddressCoalitionPartner(s,leader,id)))return {reason:'contact'};
 if(!s.factions[leader]||s.factions[leader].treasury<8)return {reason:'treasury'};
 if((s.world.coalitionInvitations||[]).some(x=>x.leader===leader&&x.target===target&&x.status==='pending'))return {reason:'pending'};
 if((s.world.coalitionInvitations||[]).some(x=>x.leader===leader&&x.target===target&&s.year*12+s.month-(x.sent.year*12+x.sent.month)<12))return {reason:'cooldown'};
 if(members.some(id=>s.wars.some(w=>w.includes(leader)&&w.includes(id)))||s.alliances.some(a=>a.includes(leader)&&a.includes(target))||activeAgreement(s,leader,target,'non_aggression')||neutralityBlocksWar(s,leader,target))return {reason:'conflict'};
 return null;
}
export function coalitionOwnConflict(s,actor,parties,target){
 return parties.some(other=>other!==actor&&s.wars.some(w=>w.includes(actor)&&w.includes(other)))||s.alliances.some(a=>a.includes(actor)&&a.includes(target))||!!activeAgreement(s,actor,target,'non_aggression')||neutralityBlocksWar(s,actor,target);
}

// A sender can address known courts without learning their private views.
// The invitation expense is separate from the five-treasury membership cost.
export function sendCoalitionInvitation(s,leader,members,target,{autoplayPlayer=false}={}){
 const problem=coalitionDispatchProblem(s,leader,members,target);if(problem)return {ok:false,...problem};
 s.world.coalitionInvitations||=[];
 const id=s.world.nextCoalitionInvitation||1;s.world.nextCoalitionInvitation=id+1;s.factions[leader].treasury-=3;
 s.world.coalitionInvitations.push({id,leader,members:[...members],target,credentials:agreementCredentials(s,leader),status:'pending',phase:'outbound',remaining:2,sent:{year:s.year,month:s.month},...(!autoplayPlayer&&leader!==s.player&&members.includes(s.player)?{humanRecipient:s.player}:{})});
 if(s.world.coalitionInvitations.length>100){const oldest=s.world.coalitionInvitations.findIndex(x=>x.status!=='pending');if(oldest>=0)s.world.coalitionInvitations.splice(oldest,1)}
 return {ok:true,id,cost:3,months:4};
}

// Consent authorizes only the stated five-treasury membership cost when the
// coalition is actually concluded. No money or war is changed by this reply.
export function answerCoalitionInvitation(s,id,decision){
 const x=(s.world?.coalitionInvitations||[]).find(y=>y.id===id&&y.status==='pending'&&y.phase==='awaiting_player'&&y.humanRecipient===s.player);
 if(!x||!['accept_coalition','refuse','ignore'].includes(decision))return {ok:false,reason:'unavailable'};
 if(decision==='accept_coalition'&&(s.factions[s.player]?.treasury??0)<5)return {ok:false,reason:'treasury'};
 if(decision==='accept_coalition'&&coalitionOwnConflict(s,s.player,[x.leader,...x.members],x.target))return {ok:false,reason:'coalition_conflict'};
 const index=x.members.indexOf(s.player);if(index<0||!Array.isArray(x.sealed?.replies))return {ok:false,reason:'unavailable'};
 const response=decision==='accept_coalition'?'accepted':decision==='refuse'?'refused':'no_reply';x.sealed.replies[index]=response;x.playerDecision=response;x.phase='return';x.remaining=2;return {ok:true};
}

// The response is sealed until the return journey ends. A court evaluates its
// own evidence and resources; failure is never explained through hidden facts.
export function advanceCoalitionInvitations(s,estimateStrength,roll,{autoplayPlayer=false}={}){
 for(const x of s.world.coalitionInvitations||[]){
  if(x.status==='pending'&&x.phase==='awaiting_player'){
   if(--x.remaining<=0){const index=x.members.indexOf(x.humanRecipient);if(index>=0&&x.sealed?.replies)x.sealed.replies[index]='no_reply';x.playerDecision='no_reply';x.phase='return';x.remaining=2}
   continue;
  }
  if(x.status!=='pending'||--x.remaining>0)continue;
  if(x.phase==='outbound'){
   const replies=x.members.map((member,i)=>{
    if(roll(s,x.leader,x.id*10+i)<.1)return 'no_reply';
    if(!autoplayPlayer&&x.humanRecipient===member)return 'awaiting_player';
    const f=s.factions[member],trust=relation(s,member,x.leader),credibility=Number.isFinite(x.credentials?.credibility)?Math.max(0,Math.min(100,x.credentials.credibility)):100;
    if(!f||f.treasury<5||coalitionOwnConflict(s,member,[x.leader,...x.members],x.target)||trust-(100-credibility)*.4<15||!coalitionInterest(s,member,x.target,estimateStrength).interested)return 'refused';
    return roll(s,member,x.id*10+i+50)<.8?'accepted':'refused';
   });
   x.sealed={replies,observed:{year:s.year,month:s.month}};x.phase=replies.includes('awaiting_player')?'awaiting_player':'return';x.remaining=x.phase==='awaiting_player'?6:2;continue;
  }
  if(x.phase==='confirmation'){
   if(roll(s,x.leader,x.id+120)<.1){x.status='no_reply';x.phase='lost';delete x.provisional;continue}
   x.status=x.provisional==='accepted'?'accepted':'lapsed';delete x.provisional;
   if(x.status==='accepted'){
    const result=formCoalition(s,x.leader,x.members,x.target,estimateStrength,{allowPlayer:true,consentingPlayer:true,priorConsent:true});
    if(result.ok){x.coalition=result.coalition.id;for(const member of x.members){rememberPoliticalEvent(s,x.leader,member,'cooperation_accepted',2);rememberPoliticalEvent(s,member,x.leader,'cooperation_accepted',2)}}else x.status='lapsed';
   }
   x.delivered={year:s.year,month:s.month};x.phase='delivered';continue;
  }
  const lost=roll(s,x.leader,x.id+90)<.1,replies=x.sealed?.replies||[];
  const outcome=lost||replies.includes('no_reply')?'no_reply':replies.includes('refused')?'refused':'accepted';
  // The player learns the final agreement only if a separate confirmation
  // reaches them; no membership cost is collected before that delivery.
  if(x.humanRecipient&&x.playerDecision==='accepted'){x.provisional=outcome;x.phase='confirmation';x.remaining=2;delete x.sealed;continue}
  x.status=outcome;
  if(x.status==='accepted'){
   const result=formCoalition(s,x.leader,x.members,x.target,estimateStrength,{allowPlayer:autoplayPlayer||x.leader===s.player,priorConsent:true});
   if(result.ok){x.coalition=result.coalition.id;for(const member of x.members){rememberPoliticalEvent(s,x.leader,member,'cooperation_accepted',2);rememberPoliticalEvent(s,member,x.leader,'cooperation_accepted',2)}}else x.status='lapsed';
  }
  x.delivered={year:s.year,month:s.month};delete x.sealed;x.phase='delivered';
  if(x.leader===s.player){s.log.unshift({year:s.year,month:s.month,en:x.status==='accepted'?'The defensive alliance was agreed.':x.status==='refused'?'A court declined the coalition invitation.':x.status==='lapsed'?'The proposed coalition could not be concluded.':'No coalition reply arrived; a letter may have been lost.',zh:x.status==='accepted'?'各方同意结盟。':x.status==='refused'?'一国拒绝了联盟邀请。':x.status==='lapsed'?'拟议中的联盟未能最终成立。':'未收到联盟回信；书信可能遗失。'});s.log=s.log.slice(0,80)}
 }
}
