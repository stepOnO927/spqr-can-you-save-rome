import {eligibleCoalitionAdmissionTargets,sendCoalitionAdmission} from './coalition-admissions.js?v=office-intel-privacy-1';

const date=s=>s.year*12+s.month;
const relation=(s,a,b)=>s.relations[[a,b].sort().join(':')]??0;
const active=(s,id)=>s.coalitions?.find(c=>c.id===id&&c.status==='active'&&date(s)<c.expiresAt);

export function initializeCoalitionMotions(s){
 s.world.coalitionMotions||=[];
 s.world.nextCoalitionMotion||=1;
 for(const c of s.coalitions||[])c.motions||=[];
 return s;
}

// The sponsor's own proposal is a recorded yes vote. Other courts still decide.
export function proposeCoalitionMotion(s,id,sponsor,kind,target,{policy}={}){
 initializeCoalitionMotions(s);
 const c=active(s,id);
 if(!c||!c.parties.includes(sponsor)||!['leadership','expulsion','admission','contribution','dissolution'].includes(kind))return {ok:false,reason:'membership'};
 if(s.world.coalitionMotions.some(m=>m.coalitionId===id&&m.status==='voting'))return {ok:false,reason:'pending'};
 if(kind==='leadership'&&(sponsor===c.leader||target!==sponsor))return {ok:false,reason:'candidate'};
 if(kind==='expulsion'&&(c.parties.length<4||target===sponsor||target===c.leader||!c.parties.includes(target)))return {ok:false,reason:'target'};
 if(kind==='admission'&&(!eligibleCoalitionAdmissionTargets(s,c,sponsor).includes(target)||s.world.coalitionAdmissions?.some(x=>x.coalitionId===id&&x.target===target&&x.status==='pending')))return {ok:false,reason:'contact'};
 if(kind==='contribution'&&(target!==sponsor||!['military','funding','supplies','diplomacy'].includes(policy)||c.contributions?.[sponsor]?.policy===policy||policy==='funding'&&s.factions[sponsor].treasury<=35||policy==='supplies'&&s.factions[sponsor].food<=25))return {ok:false,reason:'policy'};
 if(kind==='dissolution'&&target!==sponsor)return {ok:false,reason:'target'};
 const cost=kind==='admission'?5:2;
 if((s.factions[sponsor]?.treasury??0)<cost)return {ok:false,reason:'treasury'};
 s.factions[sponsor].treasury-=cost;
 const motion={id:s.world.nextCoalitionMotion++,coalitionId:id,kind,sponsor,target,...(kind==='contribution'?{policy}:{}),...(kind==='admission'?{courierEscrow:3}:{}),leaderAtProposal:c.leader,status:'voting',opened:{year:s.year,month:s.month},noticeAt:date(s)+1,closesAt:date(s)+4,electorate:[...c.parties],votes:{[sponsor]:'yes'}};
 s.world.coalitionMotions.push(motion);
 if(s.world.coalitionMotions.length>80){const old=s.world.coalitionMotions.findIndex(m=>m.status!=='voting');if(old>=0)s.world.coalitionMotions.splice(old,1)}
 return {ok:true,motion,cost};
}

export function voteCoalitionMotion(s,id,voter,choice){
 const m=s.world?.coalitionMotions?.find(x=>x.id===Number(id)&&x.status==='voting');
 const c=m&&active(s,m.coalitionId);
 if(!c||date(s)<m.noticeAt||date(s)>=m.closesAt||!c.parties.includes(voter)||!m.electorate.includes(voter)||m.votes[voter]||!['yes','no','abstain'].includes(choice))return {ok:false,reason:'unavailable'};
 m.votes[voter]=choice;return {ok:true};
}

function aiVote(s,c,m,voter){
 const towardTarget=relation(s,voter,m.target),towardLeader=relation(s,voter,c.leader),towardSponsor=relation(s,voter,m.sponsor);
 const own=s.factions[voter],sponsor=s.factions[m.sponsor];
 if(m.kind==='leadership'){
  const advantage=towardTarget-towardLeader+(c.cohesion<45?12:0)+(own?.legitimacy??50)-(sponsor?.legitimacy??50);
  return advantage>=12?'yes':'no';
 }
 if(m.kind==='admission')return towardTarget>=15&&towardSponsor>=-15?'yes':'no';
 if(m.kind==='contribution'){
  const current=c.contributions?.[m.sponsor]?.policy;
  const easing=['funding','supplies','military'].includes(current)&&m.policy==='diplomacy';
  const support=towardSponsor+(c.cohesion<45?8:0)+(easing?-20:10);
  return support>=10?'yes':'no';
 }
 if(m.kind==='dissolution')return c.cohesion<30||!s.factions[c.target]?'yes':'no';
 const targetDues=c.contributions?.[m.target];
 const neglect=targetDues?.policy==='funding'&&!(targetDues.paid||0)&&date(s)-(c.start.year*12+c.start.month)>=9?12:0;
 return towardSponsor-towardTarget+neglect+(c.cohesion<35?8:0)>=25?'yes':'no';
}

export function advanceCoalitionMotions(s,{autoplayPlayer=false}={}){
 for(const m of s.world?.coalitionMotions||[]){
  if(m.status!=='voting')continue;
  const c=active(s,m.coalitionId);
  if(!c||c.leader!==m.leaderAtProposal||!m.electorate.every(id=>c.parties.includes(id))){m.status='lapsed';m.closed={year:s.year,month:s.month};if(m.courierEscrow&&s.factions[m.sponsor]){s.factions[m.sponsor].treasury+=m.courierEscrow;m.courierEscrow=0}continue}
  if(date(s)>=m.noticeAt)for(const voter of m.electorate){
   if(m.votes[voter]||voter===s.player&&!autoplayPlayer)continue;
   m.votes[voter]=aiVote(s,c,m,voter);
  }
  if(date(s)<m.closesAt)continue;
  const yes=Object.values(m.votes).filter(v=>v==='yes').length;
  const threshold=m.kind==='dissolution'?Math.ceil(m.electorate.length*2/3):Math.floor(m.electorate.length/2)+1;
  m.status=yes>=threshold?'passed':'rejected';m.closed={year:s.year,month:s.month};
  if(m.status==='passed'){
   if(m.kind==='leadership'){c.leader=m.target;c.cohesion=Math.max(0,c.cohesion-8)}
   else if(m.kind==='expulsion'){
    c.parties=c.parties.filter(id=>id!==m.target);
    c.departures||=[];c.departures.push({actor:m.target,year:s.year,month:s.month,reason:'expelled',motionId:m.id});
    c.cohesion=Math.max(0,c.cohesion-10);
    for(const id of m.electorate.filter(id=>m.votes[id]==='yes'&&id!==m.target)){const key=[id,m.target].sort().join(':');s.relations[key]=Math.max(-100,relation(s,id,m.target)-10)}
   }
   else if(m.kind==='admission'){
    const sent=sendCoalitionAdmission(s,c.id,c.leader,m.target,{introducedBy:m.sponsor,prepaid:true});
    if(sent.ok){m.invitationId=sent.id;m.courierEscrow=0;c.cohesion=Math.min(100,c.cohesion+1)}
    else{m.status='lapsed';m.reason=sent.reason}
   }
   else if(m.kind==='contribution'){c.contributions[m.sponsor].policy=m.policy;c.cohesion=Math.max(0,c.cohesion-2)}
   else if(m.kind==='dissolution'){c.status='dissolved';c.dissolution={year:s.year,month:s.month,motionId:m.id,reason:'council_vote'}}
  }
  if(m.courierEscrow&&s.factions[m.sponsor]){s.factions[m.sponsor].treasury+=m.courierEscrow;m.courierEscrow=0}
  c.motions||=[];c.motions.push({id:m.id,kind:m.kind,sponsor:m.sponsor,target:m.target,...(m.policy?{policy:m.policy}:{}),...(m.invitationId?{invitationId:m.invitationId}:{}),status:m.status,yes,eligible:m.electorate.length,year:s.year,month:s.month});
  if(c.motions.length>30)c.motions.shift();
  if(m.electorate.includes(s.player)){
   const kind={leadership:'盟主改选',expulsion:'除名',admission:'增员提议',contribution:'责任调整',dissolution:'解散'}[m.kind];
   s.log.unshift({year:s.year,month:s.month,en:`Coalition ${m.kind} motion ${m.status}: ${yes} of ${m.electorate.length} members supported it.`,zh:`联盟${kind}议案${m.status==='passed'?'通过':m.status==='lapsed'?'失效':'未通过'}：${m.electorate.length}名成员中${yes}名赞成。`});s.log=s.log.slice(0,80);
  }
 }
}

export function proposeCoalitionMotionsAI(s,{autoplayPlayer=false}={}){
 if(s.month%6!==0)return;
 for(const c of s.coalitions||[]){
  if(c.status!=='active'||date(s)-(c.start.year*12+c.start.month)<6||s.world?.coalitionMotions?.some(m=>m.coalitionId===c.id&&m.status==='voting'))continue;
  const candidates=c.parties.filter(id=>autoplayPlayer||id!==s.player).filter(id=>id!==c.leader&&(s.factions[id]?.treasury??0)>=2);
  const challenger=candidates.find(id=>relation(s,id,c.leader)<-15&&c.cohesion<55);
  if(challenger){proposeCoalitionMotion(s,c.id,challenger,'leadership',challenger);continue}
  if(c.parties.length>=4){
   const sponsor=candidates.find(id=>c.parties.some(target=>target!==id&&target!==c.leader&&relation(s,id,target)<-45));
   const target=sponsor&&c.parties.find(id=>id!==sponsor&&id!==c.leader&&relation(s,sponsor,id)<-45);
   if(target){proposeCoalitionMotion(s,c.id,sponsor,'expulsion',target);continue}
  }
  if(c.cohesion<50||c.parties.length>=5)continue;
  const nominator=candidates.find(id=>eligibleCoalitionAdmissionTargets(s,c,id).some(other=>relation(s,id,other)>=35)&&s.factions[id].treasury>=5);
  const nominee=nominator&&eligibleCoalitionAdmissionTargets(s,c,nominator).find(id=>relation(s,nominator,id)>=35&&!s.world.coalitionAdmissions?.some(x=>x.coalitionId===c.id&&x.target===id&&x.status==='pending'));
  if(nominee)proposeCoalitionMotion(s,c.id,nominator,'admission',nominee);
 }
}
