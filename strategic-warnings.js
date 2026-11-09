import {ROUTES,FACTIONS,REGIONS} from './data.js?v=phase-x-1';
import {reportedControl} from './control-intelligence.js?v=phase-x-1';
import {reportedDiplomacy} from './diplomatic-knowledge.js?v=multipolar-2';
import {activeAgreement} from './agreements.js?v=grand-chessboard-2';
import {rememberPoliticalEvent,politicalMemoryAdjustment} from './political-memory.js?v=grand-chessboard-2';

// Scout-based strategic warnings between friendly courts.
// A sender may only forward a dated sighting from its own knowledge. The letter
// travels with the existing one-way courier time, can be delayed or lost, and is
// judged by the recipient from its own position. A warning never declares war,
// never creates an agreement and never forces the recipient to act. No warning
// (or no sighting) is not evidence that a frontier is undefended.
export const WARNING_STATUSES=['sent','delayed','expired','lost','responded','unresponded'];
const PARTNER_TYPES=['defensive','guarantee','intelligence','military_support','offensive'];
const date=s=>s.year*12+s.month,pair=(a,b)=>[a,b].sort().join(':');
const isWar=(s,a,b)=>a!==b&&s.wars.some(w=>w.includes(a)&&w.includes(b));
const holds=(s,id)=>s.regions.some(r=>r.owner===id);
const roll=(s,key,salt)=>{let h=(s.seed^(date(s)*131)^salt)>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;return (h>>>0)/4294967296};
const regionName=id=>REGIONS.find(r=>r.id===id)?.name||[id,id];
const short=id=>FACTIONS[id]?.short||[id,id];
const neighbours=id=>ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>r[0]===id?r[1]:r[0]);
export const MAX_WARNING_AGE=6,FRESH_SIGHTING=1,REPEAT_WINDOW=6;

// Partners are judged only from the sender's own treaties, alliances and relation.
export function warningPartners(s,actor){
 return Object.keys(s.factions).filter(p=>p!==actor&&p!=='rebels'&&holds(s,p)&&!isWar(s,actor,p)).filter(p=>
  (s.alliances||[]).some(a=>a.includes(actor)&&a.includes(p))||PARTNER_TYPES.some(t=>activeAgreement(s,actor,p,t))||(s.relations[pair(actor,p)]??0)>=35);
}
// Candidates come from the sender's fresh sightings only. A threat counts when
// the sender itself is at war with the sighted owner, or the sender has a dated
// report of a war between that owner and the partner.
export function warningCandidates(s,actor){
 const k=s.knowledge?.[actor];if(!k||!s.factions[actor])return [];
 const wars=reportedDiplomacy(s,actor).filter(d=>d.kind==='war'&&d.status==='active');
 const out=[];
 for(const partner of warningPartners(s,actor)){
  const partnerRegions=new Set(s.regions.map(r=>r.id).filter(id=>reportedControl(s,actor,id)?.owner===partner));
  if(!partnerRegions.size)continue;
  for(const [threat,knowledge] of Object.entries(k)){
   if(threat===actor||threat===partner||threat==='rebels'||!s.factions[threat])continue;
   const hostile=isWar(s,actor,threat)||wars.some(d=>d.parties.includes(threat)&&d.parties.includes(partner));
   if(!hostile)continue;
   for(const x of Object.values(knowledge.sightings||{})){
    const age=date(s)-(x.year*12+x.month);
    if(x.source==='ally_warning'||age<0||age>FRESH_SIGHTING||!Array.isArray(x.strengthBand)||x.strengthBand[1]<3000)continue;
    const near=partnerRegions.has(x.region)?x.region:neighbours(x.region).find(id=>partnerRegions.has(id));
    if(!near)continue;
    out.push({partner,threat,near,sighting:{armyId:x.id,name:x.name?[...x.name]:null,region:x.region,strengthBand:[...x.strengthBand],year:x.year,month:x.month}});
   }
  }
 }
 return out.sort((a,b)=>b.sighting.strengthBand[1]-a.sighting.strengthBand[1]||a.partner.localeCompare(b.partner)||a.sighting.armyId.localeCompare(b.sighting.armyId));
}
const record=(letter,status,s,extra={})=>{letter.status=status;(letter.history||=[]).push({status,year:s.year,month:s.month,...extra})};

function composeWarnings(s,actor,letterMonths){
 const f=s.factions[actor];if(!f||f.treasury<2)return;
 const sent=s.warningLetters.filter(l=>l.from===actor);
 if(sent.some(l=>l.sentYear*12+l.sentMonth===date(s)))return;
 const candidate=warningCandidates(s,actor).find(c=>!sent.some(l=>l.to===c.partner&&l.sighting.armyId===c.sighting.armyId&&date(s)-(l.sentYear*12+l.sentMonth)<REPEAT_WINDOW));
 if(!candidate)return;
 const allied=(s.alliances||[]).some(a=>a.includes(actor)&&a.includes(candidate.partner)),personality=s.world?.strategicPersonalities?.[actor]?.personality;
 const chance=Math.min(.9,.45+(allied?.25:0)+(PARTNER_TYPES.some(t=>activeAgreement(s,actor,candidate.partner,t))?.15:0)-(personality==='schemer'?.2:0));
 if(roll(s,actor+candidate.partner,0x5a17)>=chance)return;
 f.treasury-=1;
 const duration=Math.max(1,Math.ceil((letterMonths?.[candidate.partner]||4)/2)),id=`warning:${s.nextWarningId||1}`;s.nextWarningId=(s.nextWarningId||1)+1;
 const letter={id,from:actor,to:candidate.partner,threat:candidate.threat,near:candidate.near,sighting:candidate.sighting,sentYear:s.year,sentMonth:s.month,duration,remaining:duration,status:'sent',history:[]};
 record(letter,'sent',s);s.warningLetters.unshift(letter);s.warningLetters=s.warningLetters.slice(0,120);
}

// The recipient decides from its own forces, its own relation with the sender
// and the sender's public credibility. It reads nothing about the threat beyond
// the forwarded sighting and its own knowledge.
export function judgeWarning(s,letter){
 const p=letter.to,local=new Set([letter.near,...neighbours(letter.near)]);
 const ownNearby=s.armies.filter(a=>a.owner===p&&a.men>0&&local.has(a.region)).reduce((n,a)=>n+a.men,0);
 const reported=(letter.sighting.strengthBand[0]+letter.sighting.strengthBand[1])/2;
 const trust=(s.relations[pair(p,letter.from)]??0)-(100-(s.diplomaticCredibility?.[letter.from]??100))*.4+politicalMemoryAdjustment(s,p,letter.from);
 if(trust<-10)return {kind:'dismissed',reason:'distrust',trust:Math.round(trust)};
 const pressure=reported/Math.max(1000,ownNearby),hostile=isWar(s,p,letter.threat)||(s.relations[pair(p,letter.threat)]??0)<=-20;
 const chance=Math.min(.95,.25+(hostile?.3:0)+Math.min(.3,pressure*.15)+Math.max(0,trust)/200);
 if(roll(s,p+letter.id,0x7c31)<chance)return {kind:'heeded',reason:hostile?'known_hostility':'reported_pressure',trust:Math.round(trust)};
 return {kind:'noted',reason:'judged_low_threat',trust:Math.round(trust)};
}

function deliver(s,letter,{autoplayPlayer,issueOrder,log}){
 const age=date(s)-(letter.sighting.year*12+letter.sighting.month);
 if(age>MAX_WARNING_AGE){record(letter,'expired',s,{reason:'stale'});return}
 const k=s.knowledge?.[letter.to]?.[letter.threat];
 if(k){const old=k.sightings?.[letter.sighting.armyId];
  // A forwarded report never replaces a newer first-hand sighting, and it is
  // kept as dated, second-hand evidence only.
  if(!old||old.year*12+old.month<letter.sighting.year*12+letter.sighting.month)(k.sightings||={})[letter.sighting.armyId]={id:letter.sighting.armyId,name:letter.sighting.name,owner:letter.threat,region:letter.sighting.region,year:letter.sighting.year,month:letter.sighting.month,strengthBand:[...letter.sighting.strengthBand],commanderId:null,source:'ally_warning',via:letter.from,receivedYear:s.year,receivedMonth:s.month}}
 letter.deliveredYear=s.year;letter.deliveredMonth=s.month;
 const band=`${letter.sighting.strengthBand[0]}–${letter.sighting.strengthBand[1]}`,y=letter.sighting.year,m=letter.sighting.month,whenEn=y<0?`month ${m}, ${-y} BCE`:`month ${m}, ${y} CE`,whenZh=y<0?`公元前${-y}年${m}月`:`公元${y}年${m}月`;
 if(letter.to===s.player&&!autoplayPlayer){
  record(letter,'unresponded',s,{reason:'player_discretion'});letter.decision={kind:'player_discretion'};
  log(s,`Warning from ${short(letter.from)[0]}: scouts sighted a force of ${short(letter.threat)[0]} near ${regionName(letter.near)[0]} (about ${band} men, observed ${whenEn}). This is a forwarded report; it says nothing about other frontiers.`,`${short(letter.from)[1]}来信预警：其斥候在${regionName(letter.near)[1]}附近发现${short(letter.threat)[1]}军队（约${band}人，观察于${whenZh}）。这是转交的侦察报告，不说明其他边境的情况。`,{kind:'ally_warning',warning:letter.id});
  return;
 }
 const decision=judgeWarning(s,letter);letter.decision=decision;
 if(decision.kind==='heeded'){
  let ordered=0;for(const a of s.armies.filter(x=>x.owner===letter.to&&x.region===letter.near&&!x.move&&!x.siege&&!x.order&&x.men>0))if(issueOrder?.(s,a.id,'defend',null,letter.to)?.ok)ordered++;
  decision.ordered=ordered;rememberPoliticalEvent(s,letter.to,letter.from,'shared_warning',2);
  const k=pair(letter.to,letter.from);s.relations[k]=Math.min(100,(s.relations[k]??0)+2);
  record(letter,'responded',s,{decision:'heeded'});
 }else record(letter,'unresponded',s,{decision:decision.kind,reason:decision.reason});
 if(letter.from===s.player)log(s,`Your warning reached ${short(letter.to)[0]}.`,`你的预警已送达${short(letter.to)[1]}。`,{kind:'ally_warning',warning:letter.id});
}

export function advanceStrategicWarnings(s,{autoplayPlayer=false,letterMonths={},issueOrder=null,log=()=>{}}={}){
 s.warningLetters||=[];
 for(const letter of s.warningLetters){
  if(!['sent','delayed'].includes(letter.status))continue;
  if(!s.factions[letter.from]||!s.factions[letter.to]||!holds(s,letter.to)){record(letter,'expired',s,{reason:'party_gone'});continue}
  if(isWar(s,letter.from,letter.to)){record(letter,'expired',s,{reason:'war_between'});continue}
  if(roll(s,letter.id,0x1057)<.06){record(letter,'lost',s,{reason:'courier_lost'});continue}
  if(!letter.wasDelayed&&roll(s,letter.id,0xde1a)<.15){letter.wasDelayed=true;letter.remaining+=1;record(letter,'delayed',s,{reason:'road_conditions'})}
  if(--letter.remaining<=0)deliver(s,letter,{autoplayPlayer,issueOrder,log});
 }
 for(const actor of Object.keys(s.factions).filter(id=>id!=='rebels'&&(autoplayPlayer||id!==s.player)&&holds(s,id)))composeWarnings(s,actor,letterMonths);
 return s;
}

// Only the sender and the recipient know a letter exists. The sighted faction
// never learns that it was reported.
export function warningLedger(s,viewer){
 return (s.warningLetters||[]).filter(l=>l.from===viewer||l.to===viewer).map(l=>({id:l.id,from:l.from,to:l.to,threat:l.threat,near:l.near,status:l.status,sentYear:l.sentYear,sentMonth:l.sentMonth,sighting:{...l.sighting,strengthBand:[...l.sighting.strengthBand]},history:l.history.map(h=>({...h})),...(l.to===viewer?{decision:l.decision?.kind||null}:{})}));
}
