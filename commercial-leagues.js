import {ROUTES} from './data.js?v=roman-vacancy-1';
import {reportedControl} from './control-intelligence.js?v=roman-vacancy-1';
import {reportedDiplomacy} from './diplomatic-knowledge.js?v=roman-vacancy-1';
import {normalizeCoalitionName} from './coalitions.js?v=roman-vacancy-1';

const now=s=>s.year*12+s.month;
const relation=(s,a,b)=>s.relations[[a,b].sort().join(':')]??0;
const atWar=(s,a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
const alive=(s,id)=>id!=='rebels'&&!!s.factions[id]&&s.regions.some(r=>r.owner===id);

export function initializeCommercialLeagues(s){
 s.world||={};s.world.commercialLeagues||=[];s.world.commercialLeagueOffers||=[];
 s.world.nextCommercialLeagueId||=1;s.world.nextCommercialLeagueOfferId||=1;
 for(const c of s.world.commercialLeagues){
  c.admissions||=[];c.departures||=[];c.motions||=[];c.disagreements||=[];c.transfers||=[];
  c.financialCommitments||=Object.fromEntries(c.parties.map(id=>[id,3]));
  if(c.charter?.admission==='founders_unanimous')c.charter.admission='unanimous_member_vote_and_invitee_consent';
  if(c.charter){c.charter.expulsion||='two_thirds_member_vote';c.charter.leadership||='member_majority';c.charter.dissolution||='two_thirds_member_vote_or_term'}
 }
 return s;
}

export function commercialContact(s,actor,target){
 if(!alive(s,actor)||!alive(s,target)||actor===target)return false;
 if(reportedDiplomacy(s,actor).some(d=>d.status==='active'&&d.parties.includes(actor)&&d.parties.includes(target)))return true;
 return s.regions.filter(r=>r.owner===actor).some(r=>ROUTES.some(([a,b])=>{
  const next=a===r.id?b:b===r.id?a:null;
  return next&&reportedControl(s,actor,next)?.owner===target;
 }));
}

export function proposeCommercialLeague(s,leader,members,{name=null,autoplayPlayer=false}={}){
 initializeCommercialLeagues(s);
 const parties=[leader,...members];
 if(parties.length!==3||new Set(parties).size!==3||parties.some(id=>!alive(s,id))||members.some(id=>!commercialContact(s,leader,id)))return {ok:false,reason:'contact'};
 if(parties.some((a,i)=>parties.slice(i+1).some(b=>atWar(s,a,b)))||s.factions[leader].treasury<6)return {ok:false,reason:'resources'};
 if(s.world.commercialLeagueOffers.some(o=>o.status==='pending'&&o.leader===leader))return {ok:false,reason:'pending'};
 if(s.world.commercialLeagues.some(c=>c.status==='active'&&c.parties.includes(leader)))return {ok:false,reason:'membership'};
 if(name!==null&&typeof name!=='string')return {ok:false,reason:'name'};
 const id=s.world.nextCommercialLeagueOfferId,chosen=name?.trim()?normalizeCoalitionName(name):`League of the Open Roads ${id}`;
 if(!chosen)return {ok:false,reason:'name'};
 s.world.nextCommercialLeagueOfferId++;s.factions[leader].treasury-=3;
 const offer={id,leader,members:[...members],name:chosen,status:'pending',phase:'outbound',remaining:2,sent:{year:s.year,month:s.month},humanRecipient:!autoplayPlayer&&leader!==s.player&&members.includes(s.player)?s.player:null};
 s.world.commercialLeagueOffers.push(offer);
 if(s.world.commercialLeagueOffers.length>100){const old=s.world.commercialLeagueOffers.findIndex(x=>x.status!=='pending');if(old>=0)s.world.commercialLeagueOffers.splice(old,1)}
 return {ok:true,offer};
}

export function answerCommercialLeagueOffer(s,id,decision){
 const o=s.world?.commercialLeagueOffers?.find(x=>x.id===id&&x.status==='pending'&&x.phase==='awaiting_player'&&x.humanRecipient===s.player);
 if(!o||!['accept_commercial_league','refuse','ignore'].includes(decision))return {ok:false,reason:'unavailable'};
 if(decision==='accept_commercial_league'&&s.factions[s.player].treasury<3)return {ok:false,reason:'resources'};
 o.sealed.replies[o.members.indexOf(s.player)]=decision==='accept_commercial_league'?'accepted':decision==='refuse'?'refused':'no_reply';
 o.playerDecision=o.sealed.replies[o.members.indexOf(s.player)];o.phase='return';o.remaining=2;return {ok:true};
}

function formLeague(s,o){
 const parties=[o.leader,...o.members];
 if(parties.some(id=>!alive(s,id)||s.factions[id].treasury<3)||parties.some((a,i)=>parties.slice(i+1).some(b=>atWar(s,a,b))))return null;
 if(s.world.commercialLeagues.some(c=>c.status==='active'&&c.parties.some(id=>parties.includes(id))))return null;
 for(const id of parties)s.factions[id].treasury-=3;
 const id=`commercial:${s.world.nextCommercialLeagueId++}`;
 const league={id,kind:'organization',type:'commercial',name:o.name,leader:o.leader,parties,foundingMembers:[...parties],start:{year:s.year,month:s.month},expiresAt:now(s)+36,status:'active',cohesion:70,reserve:9,
  charter:{purpose:'mutual_food_trade',admission:'unanimous_member_vote_and_invitee_consent',decision:'sovereign_members',militaryObligations:'none',diplomaticObligations:'none',dues:3,trade:'quarterly_surplus_transfer',withdrawal:'any_member',expulsion:'two_thirds_member_vote',leadership:'member_majority',dissolution:'two_thirds_member_vote_or_term'},
  requirements:{contact:true,peace:true,treasury:3},goals:['balance_member_food_supply'],financialCommitments:Object.fromEntries(parties.map(id=>[id,3])),admissions:[],departures:[],motions:[],disagreements:[],transfers:[]};
 s.world.commercialLeagues.push(league);return league;
}

export function advanceCommercialLeagueOffers(s,roll,{autoplayPlayer=false}={}){
 initializeCommercialLeagues(s);
 for(const o of s.world.commercialLeagueOffers){
  if(o.status!=='pending')continue;
  if(o.phase==='awaiting_player'){
   if(--o.remaining<=0){o.sealed.replies[o.members.indexOf(o.humanRecipient)]='no_reply';o.playerDecision='no_reply';o.phase='return';o.remaining=2}
   continue;
  }
  if(--o.remaining>0)continue;
  if(o.phase==='outbound'){
   const replies=o.members.map((id,i)=>{
    if(roll(s,o.leader,o.id*17+i)<.08)return 'no_reply';
    if(!autoplayPlayer&&id===o.humanRecipient)return 'awaiting_player';
    const f=s.factions[id];
    if(!alive(s,id)||f.treasury<3||atWar(s,id,o.leader)||relation(s,id,o.leader)<10)return 'refused';
    return roll(s,id,o.id*17+i+50)<Math.min(.88,.55+Math.max(0,relation(s,id,o.leader))*.004)?'accepted':'refused';
   });
   o.sealed={replies};o.phase=replies.includes('awaiting_player')?'awaiting_player':'return';o.remaining=o.phase==='awaiting_player'?6:2;continue;
  }
  if(o.phase==='confirmation'){
   o.status=roll(s,o.leader,o.id+120)<.08?'no_reply':o.provisional;
   if(o.status==='accepted'){const c=formLeague(s,o);if(c)o.leagueId=c.id;else o.status='lapsed'}
   o.phase='delivered';o.delivered={year:s.year,month:s.month};delete o.provisional;continue;
  }
  const replies=o.sealed?.replies||[];
  const result=roll(s,o.leader,o.id+90)<.08||replies.includes('no_reply')?'no_reply':replies.includes('refused')?'refused':'accepted';
  delete o.sealed;
  if(o.humanRecipient&&o.playerDecision==='accepted'){o.provisional=result;o.phase='confirmation';o.remaining=2;continue}
  o.status=result;
  if(result==='accepted'){const c=formLeague(s,o);if(c)o.leagueId=c.id;else o.status='lapsed'}
  o.phase='delivered';o.delivered={year:s.year,month:s.month};
 }
}

function dissolve(s,c){
 c.status='dissolved';c.ended={year:s.year,month:s.month};
 const share=Math.floor(c.reserve/c.parties.length);
 for(const id of c.parties)if(s.factions[id])s.factions[id].treasury+=share;
 c.reserve-=share*c.parties.length;
 if(c.reserve&&s.factions[c.parties[0]]){s.factions[c.parties[0]].treasury+=c.reserve;c.reserve=0}
}

export function dissolveCommercialLeague(s,id,reason='council_vote'){
 const c=s.world?.commercialLeagues?.find(x=>x.id===id&&x.status==='active');
 if(!c)return {ok:false,reason:'unavailable'};
 dissolve(s,c);c.dissolution={year:s.year,month:s.month,reason};return {ok:true,league:c};
}

export function renameCommercialLeague(s,id,actor,name){
 const c=s.world?.commercialLeagues?.find(x=>x.id===id&&x.status==='active');
 if(!c||c.leader!==actor)return {ok:false,reason:'authority'};
 const clean=normalizeCoalitionName(name);
 if(!clean)return {ok:false,reason:'name'};
 c.name=clean;return {ok:true,name:clean};
}

export function admitCommercialLeagueMember(s,id,target,{consentingPlayer=false,introducedBy=null}={}){
 const c=s.world?.commercialLeagues?.find(x=>x.id===id&&x.status==='active'&&now(s)<x.expiresAt);
 if(!c||c.parties.length>=5||c.parties.includes(target)||!alive(s,target)||s.factions[target].treasury<3)return {ok:false,reason:'membership'};
 if(target===s.player&&!consentingPlayer)return {ok:false,reason:'player_decision'};
 if(c.parties.some(id=>atWar(s,id,target))||relation(s,c.leader,target)<10&&!consentingPlayer)return {ok:false,reason:'relations'};
 s.factions[target].treasury-=3;c.reserve+=3;c.parties.push(target);
 c.financialCommitments||={};c.financialCommitments[target]=3;
 c.admissions||=[];c.admissions.push({member:target,introducedBy:introducedBy||c.leader,year:s.year,month:s.month});
 c.cohesion=Math.max(0,c.cohesion-2);return {ok:true,league:c};
}

export function expelCommercialLeagueMember(s,id,target,motionId){
 const c=s.world?.commercialLeagues?.find(x=>x.id===id&&x.status==='active');
 if(!c||c.parties.length<4||target===c.leader||!c.parties.includes(target))return {ok:false,reason:'membership'};
 const refund=Math.floor(c.reserve/c.parties.length);
 c.parties=c.parties.filter(x=>x!==target);s.factions[target].treasury+=refund;c.reserve-=refund;
 c.departures||=[];c.departures.push({actor:target,year:s.year,month:s.month,reason:'expelled',motionId});
 c.disagreements||=[];c.disagreements.push({year:s.year,month:s.month,kind:'expulsion',member:target});
 c.cohesion=Math.max(0,c.cohesion-12);return {ok:true,league:c};
}

export function leaveCommercialLeague(s,id,member){
 const c=s.world?.commercialLeagues?.find(x=>x.id===id&&x.status==='active'&&x.parties.includes(member));
 if(!c)return {ok:false,reason:'membership'};
 c.parties=c.parties.filter(x=>x!==member);
 const refund=Math.floor(c.reserve/(c.parties.length+1));s.factions[member].treasury+=refund;c.reserve-=refund;
 c.departures||=[];c.departures.push({actor:member,year:s.year,month:s.month,reason:'withdrawn'});
 c.disagreements.push({year:s.year,month:s.month,kind:'withdrawal',member});c.cohesion=Math.max(0,c.cohesion-15);
 if(c.parties.length<3)dissolve(s,c);
 return {ok:true};
}

export function advanceCommercialLeagues(s){
 initializeCommercialLeagues(s);
 for(const c of s.world.commercialLeagues){
  if(c.status!=='active')continue;
  if(now(s)>=c.expiresAt||c.parties.some(id=>!alive(s,id))||c.parties.some((a,i)=>c.parties.slice(i+1).some(b=>atWar(s,a,b)))){dissolve(s,c);continue}
  if(now(s)%3!==0||c.lastTradeAt===now(s))continue;
  const suppliers=c.parties.filter(id=>s.factions[id].food>=35).sort((a,b)=>s.factions[b].food-s.factions[a].food||a.localeCompare(b));
  const buyers=c.parties.filter(id=>s.factions[id].food<=24&&s.factions[id].treasury>=2).sort((a,b)=>s.factions[a].food-s.factions[b].food||a.localeCompare(b));
  const from=suppliers[0],to=buyers.find(id=>id!==from);
  if(!from||!to||c.reserve<1)return;
  s.factions[from].food-=3;s.factions[to].food+=3;
  s.factions[to].treasury-=2;s.factions[from].treasury+=2;c.reserve--;
  c.transfers.push({year:s.year,month:s.month,from,to,food:3,price:2,transport:1});
  c.lastTradeAt=now(s);
  if(c.transfers.length>24)c.transfers.shift();
  c.cohesion=Math.min(100,c.cohesion+1);
 }
}

export function proposeCommercialLeaguesAI(s,roll,{autoplayPlayer=false}={}){
 if(s.month!==7||!['standard','hard','expert'].includes(s.difficulty))return;
 for(const leader of Object.keys(s.factions).filter(id=>id!=='rebels'&&(autoplayPlayer||id!==s.player))){
  if(s.factions[leader].treasury<30||roll(s,leader,701)>.3)continue;
  const members=Object.keys(s.factions).filter(id=>id!==leader&&id!=='rebels'&&commercialContact(s,leader,id)&&!atWar(s,leader,id)&&relation(s,leader,id)>=10).sort((a,b)=>relation(s,leader,b)-relation(s,leader,a)||a.localeCompare(b)).slice(0,2);
  if(members.length===2)proposeCommercialLeague(s,leader,members,{autoplayPlayer});
 }
}
