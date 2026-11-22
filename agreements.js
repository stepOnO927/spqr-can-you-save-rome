import {rememberPoliticalEvent,politicalMemoryAdjustment} from './political-memory.js?v=world-kings-village-foothold-1';
import {hasNationalIdea} from './national-ideas.js?v=world-kings-village-foothold-1';
import {ROUTES} from './data.js?v=world-kings-village-foothold-1';
import {nonMilitaryAccessStatus} from './border-access.js?v=world-kings-village-foothold-1';
import {SUBJECT_TYPES,subjectRelation,mayBecomeSubject,subjectTerms,advanceSubjectTreaty,advanceSubjectAidShipments} from './suzerainty.js?v=world-kings-village-foothold-1';
// Agreements supplement the existing full-alliance pairs; they do not copy them.
// All effects are derived from the active agreement itself, so expiration or a
// breach immediately removes its privileges.
export const AGREEMENT_TYPES = {
 non_aggression:{threshold:0,cost:4,duration:36,obligations:['no_war'],benefits:['security']},
 military_access:{threshold:20,cost:5,duration:36,obligations:['mutual_access'],benefits:['movement']},
 trade:{threshold:10,cost:6,duration:36,obligations:['open_trade'],benefits:['revenue']},
 intelligence:{threshold:25,cost:6,duration:36,obligations:['share_reports'],benefits:['reports']},
 defensive:{threshold:30,cost:8,duration:36,obligations:['defend'],benefits:['security']},
 offensive:{threshold:40,cost:8,duration:24,obligations:['offensive_support'],benefits:['support']},
 military_support:{threshold:25,cost:6,duration:24,obligations:['quarterly_wartime_aid'],benefits:['food_and_funds']},
 political:{threshold:30,cost:7,duration:36,obligations:['joint_civic_effort'],benefits:['stability']},
 guarantee:{threshold:25,cost:6,duration:36,obligations:['defend_recipient'],benefits:['security']},
 protectorate:{threshold:25,cost:6,duration:48,obligations:['protect_subject'],benefits:['external_security']},
 client_kingdom:{threshold:40,cost:8,duration:48,obligations:['protect_subject','quarterly_tribute','requested_aid'],benefits:['suzerainty_access','commercial_privilege']}
};
const date=s=>s.year*12+s.month;
const key=(a,b)=>[a,b].sort().join(':');
const atWar=(s,a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
export function fullAllianceTerms(s,{legacy=false}={}){return {type:'full',start:legacy?null:{year:s.year,month:s.month},duration:null,obligations:['mutual_defense','mutual_offense','intelligence_exchange'],benefits:['military_support','reports'],termination:'until broken or a party ceases to exist',diplomaticCost:0,breachPenalty:20}}
export function initializeAgreements(s){s.agreements||=[];s.tradeCargo||=[];s.nextTradeCargoId||=1;s.subjectAidShipments||=[];s.nextSubjectAidId||=1;s.diplomaticCredibility||={};for(const pair of s.alliances||[])if(pair.length===2)pair.push(fullAllianceTerms(s,{legacy:true}));for(const t of s.agreements){const def=AGREEMENT_TYPES[t.type];if(!t.terms&&def)t.terms=SUBJECT_TYPES.includes(t.type)?{subject:subjectTerms(t.type,t.parties[0],t.parties[1],t.start||{year:s.year,month:s.month})}:['military_support','guarantee'].includes(t.type)?{provider:t.parties[0],recipient:t.parties[1]}:{kind:t.type,obligations:[...def.obligations],benefits:[...def.benefits]}}return s}
export function activeAgreement(s,a,b,type){
 return (s.agreements||[]).find(t=>t.status==='active'&&t.type===type&&t.parties.includes(a)&&t.parties.includes(b)&&date(s)<t.expiresAt&&!atWar(s,a,b));
}
export function visibleAgreements(s,viewer){return (s.agreements||[]).filter(t=>!t.secret||t.parties.includes(viewer))}
// Monthly treaty revenue requires a real connected corridor. This is an
// internal settlement check over actual control, not a player intelligence view.
export function commercialCorridor(s,actor,target){
 const owned=s.regions.filter(r=>r.owner===actor).map(r=>r.id),destinations=new Set(s.regions.filter(r=>r.owner===target).map(r=>r.id));
 if(!owned.length||!destinations.size)return {ok:false,reason:'no_territory'};
 const regions=new Map(s.regions.map(r=>[r.id,r])),queue=owned.map(id=>({id,path:[id],seaLegs:0})),seen=new Set(owned);
 for(let i=0;i<queue.length;i++){
  const current=queue[i];if(destinations.has(current.id))return {ok:true,path:current.path,seaLegs:current.seaLegs};
  for(const edge of ROUTES){const next=edge[0]===current.id?edge[1]:edge[1]===current.id?edge[0]:null;if(!next||seen.has(next)||!regions.has(next))continue;
   if(!nonMilitaryAccessStatus(s,actor,next,regions.get(next).owner,'commercial').allowed)continue;
   seen.add(next);queue.push({id:next,path:[...current.path,next],seaLegs:current.seaLegs+(edge[2]==='sea'?1:0)});
  }
 }
 return {ok:false,reason:'blocked'};
}
function tradeLegMonths(s,from,to){
 const edge=ROUTES.find(route=>route[0]===from&&route[1]===to||route[1]===from&&route[0]===to);
 const terrain=s.regions.find(region=>region.id===to)?.terrain;
 // Winter storms and difficult overland terrain add travel time.
 return 1+(edge?.[2]==='sea'?1:0)+(['hills','desert'].includes(terrain)?1:0)+([12,1,2].includes(s.month)&&(edge?.[2]==='sea'||terrain==='hills')?1:0);
}
function winterTradeHazard(s,cargo,from,to){
 if(![12,1,2].includes(cargo.legStarted.month))return false;
 const edge=ROUTES.find(route=>route[0]===from&&route[1]===to||route[1]===from&&route[0]===to);
 const divisor=edge?.[2]==='sea'?16:s.regions.find(region=>region.id===to)?.terrain==='hills'?32:0;
 if(!divisor)return false;
 let hash=2166136261;
 for(const char of `${cargo.id}:${cargo.leg}:${cargo.legStarted.year}:${cargo.legStarted.month}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);
 return (hash>>>0)%divisor===0;
}
function advanceTradeCargo(s){
 for(const cargo of s.tradeCargo){
  if(cargo.status!=='transit')continue;
  const treaty=s.agreements.find(item=>item.id===cargo.agreementId);
  if(!treaty||!s.factions[cargo.from]||!s.factions[cargo.to]||!activeAgreement(s,cargo.from,cargo.to,'trade')||treaty.status!=='active'){
   cargo.status='lost';cargo.reason='treaty_ended';cargo.ended={year:s.year,month:s.month};continue;
  }
  if(cargo.remaining>0){cargo.remaining--;if(cargo.remaining>0)continue}
  const next=cargo.path[cargo.leg+1];
  if(!next){cargo.status='delivered';cargo.delivered={year:s.year,month:s.month};s.factions[cargo.to].treasury+=cargo.value;continue}
  if(winterTradeHazard(s,cargo,cargo.path[cargo.leg],next)){cargo.status='lost';cargo.reason='winter_hazard';cargo.ended={year:s.year,month:s.month};continue}
  const owner=s.regions.find(region=>region.id===next)?.owner;
  if(next===cargo.path.at(-1)&&owner!==cargo.to||!nonMilitaryAccessStatus(s,cargo.from,next,owner,'commercial').allowed){
   cargo.blockedMonths++;if(cargo.blockedMonths>=3){cargo.status='lost';cargo.reason='blocked';cargo.ended={year:s.year,month:s.month}}continue;
  }
  cargo.blockedMonths=0;cargo.leg++;
  if(cargo.leg===cargo.path.length-1){cargo.status='delivered';cargo.delivered={year:s.year,month:s.month};s.factions[cargo.to].treasury+=cargo.value}
  else{cargo.remaining=tradeLegMonths(s,next,cargo.path[cargo.leg+1]);cargo.legStarted={year:s.year,month:s.month}}
 }
 // Retain a short audit trail without growing saves forever.
 const settled=s.tradeCargo.filter(cargo=>cargo.status!=='transit');
 if(settled.length>80){const keep=new Set(settled.slice(-80));s.tradeCargo=s.tradeCargo.filter(cargo=>cargo.status==='transit'||keep.has(cargo))}
}
function dispatchTradeCargo(s,t,from,to){
 const route=commercialCorridor(s,from,to);if(!route.ok||route.path.length<2)return;
 s.tradeCargo.push({id:`trade:${s.nextTradeCargoId++}`,agreementId:t.id,from,to,value:1,path:route.path,leg:0,remaining:tradeLegMonths(s,route.path[0],route.path[1]),blockedMonths:0,dispatched:{year:s.year,month:s.month},legStarted:{year:s.year,month:s.month},status:'transit'});
}
export function checkAgreement(s,actor,target,type,{evaluateRecipient=true,access=null}={}){
 initializeAgreements(s);const def=AGREEMENT_TYPES[type];
 if(!def||actor===target||actor==='rebels'||target==='rebels'||!s.factions[actor]||!s.factions[target])return {ok:false,reason:'invalid'};
 if(!s.regions.some(r=>r.owner===actor)||!s.regions.some(r=>r.owner===target)||atWar(s,actor,target))return {ok:false,reason:'unavailable'};
 if(activeAgreement(s,actor,target,type))return {ok:false,reason:'existing'};
 if(SUBJECT_TYPES.includes(type)&&!mayBecomeSubject(s,actor,target))return {ok:false,reason:'existing'};
 const actorSubject=subjectRelation(s,actor)?.terms.subject;
 if(actorSubject?.diplomaticAutonomy==='limited'&&actorSubject.suzerain!==target&&['defensive','offensive','guarantee','military_support',...SUBJECT_TYPES].includes(type))return {ok:false,reason:'autonomy'};
 if(type==='military_access'&&access){
  if(access.permittedParty&&!['both',actor,target].includes(access.permittedParty))return {ok:false,reason:'invalid'};
  if(access.permittedTerritories&&(!Array.isArray(access.permittedTerritories)||!access.permittedTerritories.length||access.permittedTerritories.some(id=>!s.regions.some(r=>r.id===id&&[actor,target].includes(r.owner)))))return {ok:false,reason:'invalid'};
 }
 if(s.factions[actor].treasury<def.cost)return {ok:false,reason:'treasury'};
 const relation=s.relations[key(actor,target)]??0,credibility=s.diplomaticCredibility[actor]??100;
 // The recipient weighs the proposer's public reliability. No foreign hidden
 // attributes are read and declining an offer reveals no private information.
 if(evaluateRecipient&&relation-(100-credibility)*.4+politicalMemoryAdjustment(s,target,actor)+(hasNationalIdea(s,actor,'diplomacy')?4:0)<def.threshold)return {ok:false,reason:'declined'};
 if(evaluateRecipient&&SUBJECT_TYPES.includes(type)){
  const protectorStrength=s.armies.filter(a=>a.owner===actor).reduce((sum,a)=>sum+Math.max(0,a.men),0);
  const subjectStrength=s.armies.filter(a=>a.owner===target).reduce((sum,a)=>sum+Math.max(0,a.men),0);
  if(protectorStrength<subjectStrength*.75||s.factions[actor].stability<35)return {ok:false,reason:'declined'};
 }
 return {ok:true};
}
export function proposeAgreement(s,actor,target,type,{secret=false,priorConsent=false,access=null}={}){
 if(secret&&SUBJECT_TYPES.includes(type))return {ok:false,reason:'public_required'};
 const check=checkAgreement(s,actor,target,type,{evaluateRecipient:!priorConsent,access});if(!check.ok)return check;const def=AGREEMENT_TYPES[type];
 s.factions[actor].treasury-=def.cost;
 const t={id:`agreement:${s.nextAgreementId||1}`,type,parties:[actor,target],start:{year:s.year,month:s.month},duration:def.duration,expiresAt:date(s)+def.duration,obligations:[...def.obligations],benefits:[...def.benefits],terms:['military_support','guarantee'].includes(type)?{provider:actor,recipient:target}:{kind:type,obligations:[...def.obligations],benefits:[...def.benefits]},termination:'expiry, mutual consent, or breach',diplomaticCost:def.cost,breachPenalty:20,secret:!!secret,status:'active'};
 if(type==='military_access'&&access)t.terms.access={permittedParty:access.permittedParty||'both',permittedTerritories:access.permittedTerritories?[...new Set(access.permittedTerritories)]:null,restrictions:Array.isArray(access.restrictions)?[...access.restrictions]:[]};
 if(SUBJECT_TYPES.includes(type))t.terms={subject:subjectTerms(type,actor,target,t.start)};
 s.nextAgreementId=(s.nextAgreementId||1)+1;s.agreements.push(t);rememberPoliticalEvent(s,target,actor,'negotiated_agreement',2);return {ok:true,agreement:t};
}
export function terminateAgreement(s,id,actor,{mutual=false}={}){
 initializeAgreements(s);const t=s.agreements.find(x=>x.id===id);
 if(!t||t.status!=='active'||!t.parties.includes(actor))return {ok:false,reason:'unavailable'};
 t.status=mutual?'terminated':'breached';t.ended={year:s.year,month:s.month,actor};
 if(!mutual){s.diplomaticCredibility[actor]=Math.max(0,(s.diplomaticCredibility[actor]??100)-t.breachPenalty);for(const other of t.parties.filter(p=>p!==actor)){const k=key(actor,other);s.relations[k]=Math.max(-100,(s.relations[k]??0)-20);rememberPoliticalEvent(s,other,actor,'broken_treaty',-12)}}
 return {ok:true};
}
export function advanceAgreements(s){
 initializeAgreements(s);
 // This function is also used by previews and tests. A month settles once.
 if(s.tradeCargoLastAdvancedAt===date(s))return;
 s.tradeCargoLastAdvancedAt=date(s);
 advanceTradeCargo(s);
 advanceSubjectAidShipments(s);
 for(const t of s.agreements){
  if(t.status!=='active')continue;
  if(date(s)>=t.expiresAt||t.parties.some(p=>!s.factions[p])){t.status='expired';t.ended={year:s.year,month:s.month};continue}
  if(atWar(s,t.parties[0],t.parties[1])){t.status='ended_by_war';t.ended={year:s.year,month:s.month};continue}
  if(t.type==='trade')for(const [from,to] of [[t.parties[0],t.parties[1]],[t.parties[1],t.parties[0]]])dispatchTradeCargo(s,t,from,to);
  if(t.type==='military_support'&&s.month%3===0){const source=t.terms?.provider||t.parties[0],destination=t.terms?.recipient||t.parties[1],provider=s.factions[source],recipient=s.factions[destination];if(provider&&recipient&&s.wars.some(w=>w.includes(destination))&&provider.treasury>=12&&provider.food>=12){provider.treasury-=2;provider.food-=2;recipient.treasury+=2;recipient.food+=2;rememberPoliticalEvent(s,destination,source,'military_aid',1)}}
  if(t.type==='political'&&s.month%6===0&&t.parties.every(p=>s.factions[p].treasury>=10)){for(const p of t.parties){s.factions[p].treasury--;s.factions[p].stability=Math.min(100,s.factions[p].stability+1)}}
  if(SUBJECT_TYPES.includes(t.type))advanceSubjectTreaty(s,t);
 }
 // Reputation fades slowly; a record of the actual breach remains in the treaty.
 if(s.month===1)for(const actor of Object.keys(s.diplomaticCredibility))s.diplomaticCredibility[actor]=Math.min(100,s.diplomaticCredibility[actor]+1);
}
