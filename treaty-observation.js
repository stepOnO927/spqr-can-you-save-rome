import {campaignDate} from './campaign-date.js?v=calendar-1';
import {FACTIONS} from './data.js?v=phase-x-1';
import {reportedControl} from './control-intelligence.js?v=dossier-archive-1';
import {rememberPoliticalEvent} from './political-memory.js?v=grand-chessboard-2';

const now=s=>s.year*12+s.month;
const pair=(a,b)=>[a,b].sort().join(':');
const copy=x=>structuredClone(x);
const kinds=new Set(['agreement','alliance','coalition']);
const treatyNames={non_aggression:['non-aggression agreement','互不侵犯条约'],neutrality:['named-war neutrality','特定战争中立承诺'],military_access:['military access','军事通行协议'],trade:['trade agreement','贸易条约'],intelligence:['intelligence agreement','情报共享协议'],defensive:['defensive agreement','防御条约'],offensive:['offensive agreement','进攻合作条约'],military_support:['military support','军事援助协议'],political:['political cooperation','政治合作协议'],guarantee:['guarantee','保障协议']};
function records(s,viewer){s.world.diplomaticKnowledge||={};return s.world.diplomaticKnowledge[viewer]||={}}
export function treatyDocument(t,kind='agreement'){
 if(kind==='alliance')return {id:'alliance:'+t.slice(0,2).sort().join('|'),kind,type:'full',parties:t.slice(0,2),terms:copy(t[2]||{}),reference:t[2]?.reference||null,status:'active'};
 return {...copy(t),kind,type:kind==='coalition'?'defensive':t.type};
}
export function rememberTreatyCopy(s,document,viewers=document.parties,{source='signed_copy'}={}){
 const d=copy(document);
 if(d.kind==='alliance'&&!d.reference){const pact=(s.alliances||[]).find(p=>p.slice(0,2).every(id=>d.parties.includes(id)));d.reference=pact?.[2]?.reference||'alliance-record:'+(s.world.nextAllianceRecord||1);s.world.nextAllianceRecord=(s.world.nextAllianceRecord||1)+1;d.terms||={};d.terms.reference=d.reference;if(pact?.[2])pact[2].reference=d.reference}
 for(const viewer of viewers||[]){
  if(!viewer||!d.id)continue;
  records(s,viewer)[d.id]={...copy(d),year:s.year,month:s.month,source,participantCopy:true,receivedYear:s.year,receivedMonth:s.month};
 }
}
export function initializeTreatyObservations(s){
 if(s.world.treatyObservationVersion===1)return s;
 s.world.diplomaticKnowledge||={};
 // These are copies the previous version already exposed. Pending offers do
 // not create a signed document. Migration runs once, never during rendering.
 for(const t of s.agreements||[])if(t.status==='active')rememberTreatyCopy(s,treatyDocument(t),t.parties,{source:'legacy_copy'});
 for(const a of s.alliances||[])rememberTreatyCopy(s,treatyDocument(a,'alliance'),a.slice(0,2),{source:'legacy_copy'});
 for(const c of s.coalitions||[])if(c.status==='active')rememberTreatyCopy(s,treatyDocument(c,'coalition'),c.parties,{source:'legacy_copy'});
 s.world.treatyObservationVersion=1;return s;
}
export function knownTreatyDocuments(s,viewer,kind=null){
 return Object.values(s.world?.diplomaticKnowledge?.[viewer]||{}).filter(d=>d.participantCopy&&kinds.has(d.kind)&&(!kind||d.kind===kind)&&d.parties?.includes(viewer)&&d.status==='active'&&(!Number.isFinite(d.expiresAt)||now(s)<d.expiresAt)&&!(d.parties.length===2&&(s.wars||[]).some(w=>w.includes(viewer)&&d.parties.every(p=>w.includes(p))))).map(copy);
}
export function knownAgreement(s,viewer,partner,type){return knownTreatyDocuments(s,viewer,'agreement').find(t=>t.type===type&&t.parties.includes(partner))}
export function knownAlliance(s,viewer,partner){return knownTreatyDocuments(s,viewer,'alliance').some(t=>t.parties.includes(partner))}
export function knownRelation(s,viewer,other){
 const held=s.world?.diplomaticKnowledge?.[viewer]?.['standing:'+other]?.held||{};
 return Math.max(-100,Math.min(100,(s.relations[pair(viewer,other)]??0)+Object.values(held).reduce((n,x)=>n+(Number.isFinite(x)?x:0),0)));
}
function changeStanding(s,actor,other,delta,id){
 const key=pair(actor,other),before=s.relations[key]??0,after=Math.max(-100,Math.min(100,before+delta));s.relations[key]=after;
 const r=records(s,other)['standing:'+actor]||={kind:'private_standing',held:{}};r.held||={};r.held[id]=(r.held[id]||0)+before-after;
}
function dateText(d,lang='en'){return campaignDate(d.month,d.year,lang)}
export function announceTreatyChange(s,document,actor,{relationPenalty=0,memoryKind='broken_treaty',memoryWeight=-12,viewers=null}={}){
 const prior=records(s,actor)[document.id],signatories=[...new Set(viewers||prior?.parties||document.parties||[])],id='treaty-notice:'+(s.world.nextTreatyNotice||1);
 s.world.nextTreatyNotice=(s.world.nextTreatyNotice||1)+1;
 const d={...copy(document),ended:copy(document.ended||{year:s.year,month:s.month,actor})};
 rememberTreatyCopy(s,d,[actor],{source:'own_decision'});
 s.mail||={};s.mail.events||=[];
 const ownHome=s.regions.find(r=>r.owner===actor)?.id||null;
 for(const recipient of signatories.filter(p=>p!==actor)){
  const noticeId=id+':'+recipient;
  if(relationPenalty)changeStanding(s,actor,recipient,-Math.abs(relationPenalty),noticeId);
  const destination=s.regions.find(r=>reportedControl(s,actor,r.id)?.owner===recipient)?.id||null,names=(document.parties||[]).map(p=>FACTIONS[p]?.short||[p,p]);
  const actorName=FACTIONS[actor]?.short||[actor,actor],label=document.kind==='alliance'?['full alliance','全面同盟']:document.kind==='coalition'?['defensive coalition','防御联盟']:(treatyNames[document.type]||['agreement','条约']);
  s.mail.events.push({type:'treaty_notice',status:'scheduled',date:now(s),noticeId,spec:{senderInstitution:actor,senderFaction:actor,recipient,category:'diplomatic',priority:'important',source:ownHome,destination,destinationKnown:!!destination,subject:['Diplomatic commitment notice','外交承诺变更通知'],body:[actorName[0]+(document.kind==='coalition'?' withdraws from the ':' renounces the ')+label[0]+' involving '+names.map(n=>n[0]).join(', ')+'. This is the dated notice '+dateText(d.ended)+'; later events may differ.',actorName[1]+(document.kind==='coalition'?'宣布退出':'宣布放弃')+'涉及'+names.map(n=>n[1]).join('、')+'的'+label[1]+'。这是'+dateText(d.ended,'zh')+'发出的书面通知，后续情况可能不同。'],options:[],confidentiality:document.secret?'secret':'ordinary',context:{kind:'treaty_notice',noticeId,document:copy(d),signatories:[...signatories],memoryKind,memoryWeight}}});
 }
 return {ok:true,noticeId:id};
}
export function receiveTreatyNotice(s,m){
 const x=m.context,d=x?.document;if(x?.kind!=='treaty_notice'||m.delivery!=='received'||!d?.id||!x.signatories?.includes(m.recipient)||!x.signatories.includes(m.senderFaction))return false;
 const r=records(s,m.recipient),old=r[d.id];if(!old?.participantCopy||!old.parties?.includes(m.senderFaction))return false;
 // A late notice cannot revive an observer's own withdrawal or overwrite a
 // newer received document. Its original date and receipt date stay separate.
 const stamp=d.ended?.year*12+d.ended?.month,previous=old.ended?.year*12+old.ended?.month;
 if((!old.reference||!d.reference||old.reference===d.reference)&&old.source!=='own_decision'&&old.source!=='own_hostilities'&&(!Number.isFinite(previous)||!Number.isFinite(stamp)||stamp>=previous)){
  const next=copy(d);if(d.kind==='coalition'&&x.memoryKind==='coalition_departure'){next.parties=old.parties.filter(p=>p!==m.senderFaction);next.status=next.parties.length<3?'dissolved':'active';next.leader=old.leader===m.senderFaction?next.parties[0]:old.leader}
  rememberTreatyCopy(s,next,[m.recipient],{source:'received_notice'});
 }
 const standing=r['standing:'+m.senderFaction];if(standing?.held)delete standing.held[x.noticeId];
 if(!m.treatyNoticeApplied){rememberPoliticalEvent(s,m.recipient,m.senderFaction,x.memoryKind||'broken_treaty',x.memoryWeight??-12);m.treatyNoticeApplied=true;
  if(m.recipient===s.player){const names=FACTIONS[m.senderFaction]?.short||[m.senderFaction,m.senderFaction];s.log.unshift({year:s.year,month:s.month,en:'A dated notice from '+names[0]+' reports a change to our diplomatic commitment; its recorded terms may be outdated.',zh:'收到'+names[1]+'发来的外交承诺变更通知；这是有日期的记录，条款可能过时。'});s.log=s.log.slice(0,80)}
 }
 return true;
}
export function knownAgreementToRenounce(s,id,actor){return knownTreatyDocuments(s,actor,'agreement').find(t=>t.id===id)}

export function knownNeutralityBlocksWar(s,actor,target){return knownTreatyDocuments(s,actor,'agreement').filter(t=>t.type==='neutrality').some(t=>t.parties.includes(target)||t.terms?.neutral===actor&&t.terms?.warParties?.includes(target))}
export function knownNeutralityBlocksAid(s,actor,target){return knownTreatyDocuments(s,actor,'agreement').some(t=>t.type==='neutrality'&&t.terms?.neutral===actor&&t.terms?.warParties?.includes(target))}
export function knownNeutralityConflict(s,owner,partner,type,{provider=owner}={}){
 if(type==='military_support')return provider===owner&&knownNeutralityBlocksAid(s,owner,partner);
 if(!['full_alliance','defensive','offensive','guarantee','military_access'].includes(type)||type==='guarantee'&&provider!==owner)return false;
 return knownTreatyDocuments(s,owner,'agreement').some(t=>t.type==='neutrality'&&t.terms?.neutral===owner&&t.terms?.warParties?.includes(partner));
}

export function observeOwnBilateralWar(s,a,b){
 for(const viewer of [a,b]){
  const r=s.world?.diplomaticKnowledge?.[viewer];if(!r)continue;
  const other=viewer===a?b:a;
  if(r['standing:'+other])r['standing:'+other].held={};
  for(const d of Object.values(r))if(d.participantCopy&&d.status==='active'&&['agreement','alliance'].includes(d.kind)&&d.parties.includes(a)&&d.parties.includes(b)){d.status='ended_by_war';d.ended={year:s.year,month:s.month};d.source='own_hostilities';d.receivedYear=s.year;d.receivedMonth=s.month}
 }
}
