import {commercialContact,initializeCommercialLeagues,admitCommercialLeagueMember,expelCommercialLeagueMember,dissolveCommercialLeague} from './commercial-leagues.js?v=archived-leads-1';

const now=s=>s.year*12+s.month;
const relation=(s,a,b)=>s.relations[[a,b].sort().join(':')]??0;
const atWar=(s,a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
const league=(s,id)=>s.world?.commercialLeagues?.find(c=>c.id===id&&c.status==='active'&&now(s)<c.expiresAt);

export function initializeCommercialLeaguePolitics(s){
 initializeCommercialLeagues(s);
 s.world.commercialLeagueMotions||=[];s.world.commercialLeagueAdmissions||=[];
 s.world.nextCommercialLeagueMotion||=1;s.world.nextCommercialLeagueAdmission||=1;
 return s;
}

export function eligibleCommercialLeagueTargets(s,c,actor){
 if(!c||c.status!=='active'||!c.parties.includes(actor)||c.parties.length>=5)return [];
 return Object.keys(s.factions).filter(id=>id!=='rebels'&&!c.parties.includes(id)&&s.factions[id].treasury>=3&&commercialContact(s,actor,id)&&!c.parties.some(member=>atWar(s,member,id))).sort((a,b)=>relation(s,actor,b)-relation(s,actor,a)||a.localeCompare(b));
}

export function proposeCommercialLeagueMotion(s,id,sponsor,kind,target){
 initializeCommercialLeaguePolitics(s);
 const c=league(s,id);
 if(!c||!c.parties.includes(sponsor)||!['admission','leadership','expulsion','dissolution'].includes(kind))return {ok:false,reason:'membership'};
 if(s.world.commercialLeagueMotions.some(m=>m.leagueId===id&&m.status==='voting'))return {ok:false,reason:'pending'};
 if(kind==='admission'&&(!eligibleCommercialLeagueTargets(s,c,sponsor).includes(target)||s.world.commercialLeagueAdmissions.some(x=>x.leagueId===id&&x.target===target&&x.status==='pending')))return {ok:false,reason:'target'};
 if(kind==='leadership'&&(sponsor===c.leader||target!==sponsor))return {ok:false,reason:'candidate'};
 if(kind==='expulsion'&&(c.parties.length<4||target===sponsor||target===c.leader||!c.parties.includes(target)))return {ok:false,reason:'target'};
 if(kind==='dissolution'&&target!==sponsor)return {ok:false,reason:'target'};
 const cost=kind==='admission'?5:2;
 if(s.factions[sponsor].treasury<cost)return {ok:false,reason:'treasury'};
 s.factions[sponsor].treasury-=cost;
 const m={id:s.world.nextCommercialLeagueMotion++,leagueId:id,kind,sponsor,target,status:'voting',leaderAtProposal:c.leader,electorate:[...c.parties],votes:{[sponsor]:'yes'},noticeAt:now(s)+1,closesAt:now(s)+4,opened:{year:s.year,month:s.month},...(kind==='admission'?{courierEscrow:3}:{})};
 s.world.commercialLeagueMotions.push(m);
 if(s.world.commercialLeagueMotions.length>80){const i=s.world.commercialLeagueMotions.findIndex(x=>x.status!=='voting');if(i>=0)s.world.commercialLeagueMotions.splice(i,1)}
 return {ok:true,motion:m,cost};
}

export function voteCommercialLeagueMotion(s,id,voter,choice){
 const m=s.world?.commercialLeagueMotions?.find(x=>x.id===Number(id)&&x.status==='voting'),c=m&&league(s,m.leagueId);
 if(!c||now(s)<m.noticeAt||now(s)>=m.closesAt||!c.parties.includes(voter)||!m.electorate.includes(voter)||m.votes[voter]||!['yes','no','abstain'].includes(choice))return {ok:false,reason:'unavailable'};
 m.votes[voter]=choice;return {ok:true};
}

function aiVote(s,c,m,voter){
 if(m.kind==='expulsion'&&voter===m.target)return 'no';
 if(m.kind==='admission')return relation(s,voter,m.target)>=15&&relation(s,voter,m.sponsor)>=-15?'yes':'no';
 if(m.kind==='leadership')return relation(s,voter,m.sponsor)-relation(s,voter,c.leader)+(c.cohesion<45?12:0)>=12?'yes':'no';
 if(m.kind==='expulsion')return relation(s,voter,m.sponsor)-relation(s,voter,m.target)+(c.cohesion<35?8:0)>=25?'yes':'no';
 return c.cohesion<30?'yes':'no';
}

function closeMotion(s,m,c){
 const yes=Object.values(m.votes).filter(v=>v==='yes').length;
 const threshold=m.kind==='admission'?m.electorate.length:m.kind==='leadership'?Math.floor(m.electorate.length/2)+1:Math.ceil(m.electorate.length*2/3);
 m.status=yes>=threshold?'passed':'rejected';m.closed={year:s.year,month:s.month};
 if(m.status==='passed'){
  if(m.kind==='leadership'){c.leader=m.target;c.cohesion=Math.max(0,c.cohesion-8)}
  if(m.kind==='expulsion'){const result=expelCommercialLeagueMember(s,c.id,m.target,m.id);if(!result.ok)m.status='lapsed'}
  if(m.kind==='dissolution'){const result=dissolveCommercialLeague(s,c.id,'council_vote');if(result.ok)c.dissolution.motionId=m.id;else m.status='lapsed'}
  if(m.kind==='admission'){
   const sent=sendCommercialLeagueAdmission(s,c.id,c.leader,m.target,{introducedBy:m.sponsor,prepaid:true});
   if(sent.ok){m.invitationId=sent.id;m.courierEscrow=0;c.cohesion=Math.min(100,c.cohesion+1)}else{m.status='lapsed';m.reason=sent.reason}
  }
 }
 if(m.courierEscrow&&s.factions[m.sponsor]){s.factions[m.sponsor].treasury+=m.courierEscrow;m.courierEscrow=0}
 c.motions.push({id:m.id,kind:m.kind,sponsor:m.sponsor,target:m.target,status:m.status,yes,eligible:m.electorate.length,year:s.year,month:s.month,...(m.invitationId?{invitationId:m.invitationId}:{})});
 if(c.motions.length>30)c.motions.shift();
 if(m.electorate.includes(s.player)){s.log.unshift({year:s.year,month:s.month,en:`Commercial league ${m.kind} motion ${m.status}: ${yes} of ${m.electorate.length} supported it.`,zh:`商业同盟${{admission:'增员',leadership:'改选',expulsion:'除名',dissolution:'解散'}[m.kind]}议案${m.status==='passed'?'通过':m.status==='lapsed'?'失效':'未通过'}：${m.electorate.length}名成员中${yes}名赞成。`});s.log=s.log.slice(0,80)}
}

export function advanceCommercialLeagueMotions(s,{autoplayPlayer=false}={}){
 for(const m of s.world?.commercialLeagueMotions||[]){
  if(m.status!=='voting')continue;
  const c=league(s,m.leagueId);
  if(!c||c.leader!==m.leaderAtProposal||!m.electorate.every(id=>c.parties.includes(id))){m.status='lapsed';m.closed={year:s.year,month:s.month};if(m.courierEscrow&&s.factions[m.sponsor]){s.factions[m.sponsor].treasury+=m.courierEscrow;m.courierEscrow=0}continue}
  if(now(s)>=m.noticeAt)for(const voter of m.electorate)if(!m.votes[voter]&&(autoplayPlayer||voter!==s.player))m.votes[voter]=aiVote(s,c,m,voter);
  if(now(s)>=m.closesAt)closeMotion(s,m,c);
 }
}

export function sendCommercialLeagueAdmission(s,leagueId,leader,target,{introducedBy=leader,prepaid=false}={}){
 initializeCommercialLeaguePolitics(s);
 const c=league(s,leagueId);
 if(!c||c.leader!==leader||!eligibleCommercialLeagueTargets(s,c,introducedBy).includes(target))return {ok:false,reason:'contact'};
 if(!prepaid&&s.factions[leader].treasury<3)return {ok:false,reason:'treasury'};
 if(s.world.commercialLeagueAdmissions.some(x=>x.leagueId===leagueId&&x.target===target&&(x.status==='pending'||now(s)-now(x.sent)<12)))return {ok:false,reason:'cooldown'};
 const id=s.world.nextCommercialLeagueAdmission++;
 if(!prepaid)s.factions[leader].treasury-=3;
 const x={id,leagueId,leader,target,introducedBy,status:'pending',phase:'outbound',remaining:2,sent:{year:s.year,month:s.month},...(target===s.player?{humanRecipient:s.player}:{})};
 s.world.commercialLeagueAdmissions.push(x);
 if(s.world.commercialLeagueAdmissions.length>100){const i=s.world.commercialLeagueAdmissions.findIndex(y=>y.status!=='pending');if(i>=0)s.world.commercialLeagueAdmissions.splice(i,1)}
 return {ok:true,id,cost:3};
}

export function answerCommercialLeagueAdmission(s,id,decision){
 const x=s.world?.commercialLeagueAdmissions?.find(y=>y.id===Number(id)&&y.status==='pending'&&y.phase==='awaiting_player'&&y.humanRecipient===s.player);
 if(!x||!['accept_commercial_admission','refuse','ignore'].includes(decision))return {ok:false,reason:'unavailable'};
 if(decision==='accept_commercial_admission'&&s.factions[s.player].treasury<3)return {ok:false,reason:'treasury'};
 x.playerDecision=decision==='accept_commercial_admission'?'accepted':decision==='refuse'?'refused':'no_reply';x.phase='return';x.remaining=2;return {ok:true};
}

function concludeAdmission(s,x,autoplayPlayer){
 if(x.status==='accepted'){
  const result=admitCommercialLeagueMember(s,x.leagueId,x.target,{introducedBy:x.introducedBy,consentingPlayer:autoplayPlayer||x.playerDecision==='accepted'});
  if(!result.ok)x.status='lapsed';
 }
 x.delivered={year:s.year,month:s.month};x.phase='delivered';delete x.sealed;
 if(x.leader===s.player){s.log.unshift({year:s.year,month:s.month,en:x.status==='accepted'?'New member joined the commercial league.':'The commercial league invitation did not form a membership.',zh:x.status==='accepted'?'新成员加入商业同盟。':'商业同盟增员邀请未达成协议。'});s.log=s.log.slice(0,80)}
}

export function advanceCommercialLeagueAdmissions(s,roll,{autoplayPlayer=false}={}){
 for(const x of s.world?.commercialLeagueAdmissions||[]){
  if(x.status!=='pending')continue;
  if(x.phase==='awaiting_player'){if(--x.remaining<=0){x.playerDecision='no_reply';x.phase='return';x.remaining=2}continue}
  if(--x.remaining>0)continue;
  const c=league(s,x.leagueId);
  if(x.phase==='outbound'){
   if(!c||c.leader!==x.leader||c.parties.length>=5||c.parties.includes(x.target)){x.status='lapsed';concludeAdmission(s,x,autoplayPlayer);continue}
   if(roll(s,x.leader,x.id*29)<.08){x.status='no_reply';concludeAdmission(s,x,autoplayPlayer);continue}
   if(x.humanRecipient&&!autoplayPlayer){x.phase='awaiting_player';x.remaining=6;continue}
   const possible=s.factions[x.target]?.treasury>=3&&relation(s,x.target,x.leader)>=10&&!c.parties.some(id=>atWar(s,id,x.target));
   x.sealed=possible&&roll(s,x.target,x.id*29+1)<Math.min(.9,.55+Math.max(0,relation(s,x.target,x.leader))*.004)?'accepted':'refused';x.phase='return';x.remaining=2;continue;
  }
  if(x.phase==='confirmation'){x.status=roll(s,x.leader,x.id*29+3)<.08?'no_reply':x.provisional;delete x.provisional;concludeAdmission(s,x,autoplayPlayer);continue}
  const outcome=roll(s,x.leader,x.id*29+2)<.08?'no_reply':x.playerDecision??x.sealed;
  if(x.humanRecipient&&x.playerDecision==='accepted'){x.provisional=outcome;x.phase='confirmation';x.remaining=2;delete x.sealed;continue}
  x.status=outcome;concludeAdmission(s,x,autoplayPlayer);
 }
}

export function proposeCommercialLeagueMotionsAI(s,{autoplayPlayer=false}={}){
 if(s.month%6!==0)return;
 for(const c of s.world?.commercialLeagues||[]){
  if(c.status!=='active'||now(s)-(c.start.year*12+c.start.month)<6||s.world.commercialLeagueMotions.some(m=>m.leagueId===c.id&&m.status==='voting'))continue;
  const candidates=c.parties.filter(id=>(autoplayPlayer||id!==s.player)&&id!==c.leader&&s.factions[id]?.treasury>=2);
  const challenger=candidates.find(id=>relation(s,id,c.leader)<-15&&c.cohesion<55);
  if(challenger){proposeCommercialLeagueMotion(s,c.id,challenger,'leadership',challenger);continue}
  if(c.parties.length>=4){const sponsor=candidates.find(id=>c.parties.some(other=>other!==id&&other!==c.leader&&relation(s,id,other)<-45));const target=sponsor&&c.parties.find(id=>id!==sponsor&&id!==c.leader&&relation(s,sponsor,id)<-45);if(target){proposeCommercialLeagueMotion(s,c.id,sponsor,'expulsion',target);continue}}
  if(c.cohesion<50||c.parties.length>=5)continue;
  const sponsor=c.parties.find(id=>(autoplayPlayer||id!==s.player)&&s.factions[id]?.treasury>=5&&eligibleCommercialLeagueTargets(s,c,id).some(other=>relation(s,id,other)>=35));
  const target=sponsor&&eligibleCommercialLeagueTargets(s,c,sponsor).find(id=>relation(s,sponsor,id)>=35);
  if(target)proposeCommercialLeagueMotion(s,c.id,sponsor,'admission',target);
 }
}
