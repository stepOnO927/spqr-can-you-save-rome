import {knownAgreement as activeAgreement,knownAlliance,knownRelation,receiveSignedTreatyCopy,announceTreatyChange} from './treaty-observation.js?v=treaty-observation-1';
import {coalitionInterest,ratifyCoalitionCharter} from './coalitions.js?v=faces-name-disagreement-1';
import {reportedDiplomacy} from './diplomatic-knowledge.js?v=control-delivery-1';
import {reportedControl} from './control-intelligence.js?v=control-delivery-1';
import {ROUTES,FACTIONS} from './data.js?v=phase-x-1';
import {agreementCredentials,neutralityBlocksWar} from './agreements.js?v=focus-agreement-consent-1';
import {rememberPoliticalEvent} from './political-memory.js?v=grand-chessboard-2';

const relation=(s,a,b)=>knownRelation(s,a,b);
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
 if(members.some(id=>s.wars.some(w=>w.includes(leader)&&w.includes(id)))||knownAlliance(s,leader,target)||activeAgreement(s,leader,target,'non_aggression')||neutralityBlocksWar(s,leader,target))return {reason:'conflict'};
 return null;
}
export function coalitionOwnConflict(s,actor,parties,target){
 return parties.some(other=>other!==actor&&s.wars.some(w=>w.includes(actor)&&w.includes(other)))||knownAlliance(s,actor,target)||!!activeAgreement(s,actor,target,'non_aggression')||neutralityBlocksWar(s,actor,target);
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
 const response=decision==='accept_coalition'?'accepted':decision==='refuse'?'refused':'no_reply';x.sealed.replies[index]=response;if(response==='accepted'){x.sealed.pledges||={};x.sealed.pledges[s.player]=pledge(s,s.player,[x.leader,...x.members],true)}x.playerDecision=response;x.phase='return';x.remaining=2;return {ok:true};
}

// A policy pledge is made by its own court, and travels inside the answer.
// The initiating court cannot reconstruct it later from a foreign treasury.
function pledge(s,actor,parties,human=false){
 const f=s.factions[actor],policy=human||f.food<10?'diplomacy':f.treasury>55?'funding':f.food>40?'supplies':'military';
 return {policy,year:s.year,month:s.month,trust:Object.fromEntries(parties.filter(p=>p!==actor).map(p=>[p,relation(s,actor,p)]))};
}
function concludeAtLeader(s,x,estimateStrength,pledges,{autoplayPlayer=false}={}){
 const parties=[x.leader,...x.members],f=s.factions[x.leader];
 if(!f||f.treasury<5||!s.regions.some(r=>r.owner===x.leader)||coalitionOwnConflict(s,x.leader,parties,x.target)||(!(x.leader===s.player&&!autoplayPlayer)&&!coalitionInterest(s,x.leader,x.target,estimateStrength).interested))return false;
 const result=ratifyCoalitionCharter(s,x.leader,x.members,x.target,pledges,'coalition-letter:'+x.id);if(!result.ok)return false;
 x.coalition=result.coalition.id;x.ratified={year:s.year,month:s.month};
 x.signedCopies=Object.fromEntries(x.members.map(member=>[member,{document:structuredClone(result.coalition),remaining:2,status:'traveling',warGeneration:s.world.warGenerations?.[[x.leader,member].sort().join(':')]||0}]));
 for(const member of x.members)rememberPoliticalEvent(s,x.leader,member,'cooperation_accepted',2);
 return true;
}
function advanceCopies(s,x,roll){
 for(const [member,c] of Object.entries(x.signedCopies||{})){
  if(c.status!=='traveling'||--c.remaining>0)continue;
  if(roll(s,x.leader,x.id+120+x.members.indexOf(member))<.1){c.status='lost';continue}
  c.status='received';c.received={year:s.year,month:s.month};
  const f=s.factions[member],ownLegal=f&&f.treasury>=5&&s.regions.some(r=>r.owner===member)&&!coalitionOwnConflict(s,member,[x.leader,...x.members],x.target);
  if(ownLegal&&(s.world.warGenerations?.[[x.leader,member].sort().join(':')]||0)===c.warGeneration&&receiveSignedTreatyCopy(s,c.document,member,{sender:x.leader,warGeneration:c.warGeneration})){
   f.treasury-=5;c.duesPaid=5;c.outcome='signed';
   rememberPoliticalEvent(s,member,x.leader,'cooperation_accepted',2);
  }else{
   c.outcome='not_signed';
   const actual=(s.coalitions||[]).find(t=>t.id===x.coalition&&t.reference===c.document.reference);
   if(actual){actual.parties=actual.parties.filter(p=>p!==member);if(actual.parties.length<3)actual.status='dissolved'}
   // This court knows it could not sign; everyone else needs its fallible
   // notice. The failure never becomes a remote leader-side lapsed status.
   announceTreatyChange(s,{...c.document,status:'withdrawn',ended:{year:s.year,month:s.month,actor:member}},member,{relationPenalty:0,memoryKind:'coalition_departure',memoryWeight:0,viewers:c.document.parties});
  }
 }
}

// Replies and signed copies are separate legs for every controller. The
// sender-visible result is never rewritten by a remote signature or loss.
export function advanceCoalitionInvitations(s,estimateStrength,roll,{autoplayPlayer=false}={}){
 for(const x of s.world.coalitionInvitations||[]){
  if(x.status==='pending'&&x.phase==='confirmation'){
   const remaining=Math.max(1,x.remaining||1),pledges=Object.fromEntries(x.members.map(member=>[member,{policy:'diplomacy',trust:{}}]));
   x.status=x.provisional==='accepted'&&concludeAtLeader(s,x,estimateStrength,pledges,{autoplayPlayer})?'accepted':x.provisional==='accepted'?'lapsed':x.provisional||'no_reply';
   delete x.provisional;x.phase='delivered';x.delivered={year:s.year,month:s.month};for(const c of Object.values(x.signedCopies||{}))c.remaining=remaining;continue;
  }
  if(x.status!=='pending'){advanceCopies(s,x,roll);continue}
  if(x.phase==='awaiting_player'){
   if(--x.remaining<=0){const index=x.members.indexOf(x.humanRecipient);if(index>=0&&x.sealed?.replies)x.sealed.replies[index]='no_reply';x.playerDecision='no_reply';x.phase='return';x.remaining=2}continue;
  }
  if(--x.remaining>0)continue;
  if(x.phase==='outbound'){
   const pledges={},replies=x.members.map((member,i)=>{
    if(roll(s,x.leader,x.id*10+i)<.1)return 'no_reply';
    if(!autoplayPlayer&&x.humanRecipient===member)return 'awaiting_player';
    const f=s.factions[member],trust=relation(s,member,x.leader),credibility=Number.isFinite(x.credentials?.credibility)?Math.max(0,Math.min(100,x.credentials.credibility)):100;
    if(!f||f.treasury<5||coalitionOwnConflict(s,member,[x.leader,...x.members],x.target)||trust-(100-credibility)*.4<15||!coalitionInterest(s,member,x.target,estimateStrength).interested)return 'refused';
    if(roll(s,member,x.id*10+i+50)>=.8)return 'refused';
    pledges[member]=pledge(s,member,[x.leader,...x.members]);return 'accepted';
   });
   x.sealed={replies,pledges,observed:{year:s.year,month:s.month}};x.phase=replies.includes('awaiting_player')?'awaiting_player':'return';x.remaining=x.phase==='awaiting_player'?6:2;continue;
  }
  const lost=roll(s,x.leader,x.id+90)<.1,replies=x.sealed?.replies||[];
  const outcome=lost||replies.includes('no_reply')?'no_reply':replies.includes('refused')?'refused':'accepted';
  x.status=outcome==='accepted'?(concludeAtLeader(s,x,estimateStrength,x.sealed?.pledges||Object.fromEntries(x.members.map(member=>[member,{policy:'diplomacy',trust:{}}])),{autoplayPlayer})?'accepted':'lapsed'):outcome;
  x.delivered={year:s.year,month:s.month};delete x.sealed;x.phase='delivered';
  if(x.leader===s.player){s.log.unshift({year:s.year,month:s.month,en:x.status==='accepted'?'Our court signed the coalition charter and posted copies; foreign receipt is unconfirmed.':x.status==='refused'?'A court declined the coalition invitation.':x.status==='lapsed'?'Our court could not ratify the proposed coalition.':'No coalition reply arrived; a letter may have been lost.',zh:x.status==='accepted'?'本方已签署联盟章程并寄出副本，尚未独立确认各国收件。':x.status==='refused'?'一国拒绝了联盟邀请。':x.status==='lapsed'?'本方未能签署拟议联盟。':'未收到联盟回信；书信可能遗失。'});s.log=s.log.slice(0,80)}
 }
}
