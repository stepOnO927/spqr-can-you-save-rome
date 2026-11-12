import {rememberPoliticalEvent,politicalMemoryAdjustment} from './political-memory.js?v=grand-chessboard-2';
import {hasNationalIdea} from './national-ideas.js?v=grand-chessboard-2';
// Agreements supplement the existing full-alliance pairs; they do not copy them.
// All effects are derived from the active agreement itself, so expiration or a
// breach immediately removes its privileges.
export const AGREEMENT_TYPES = {
 non_aggression:{threshold:0,cost:4,duration:36,obligations:['no_war'],benefits:['security']},
 military_access:{threshold:20,cost:5,duration:36,obligations:['mutual_access'],benefits:['movement']},
 trade:{threshold:10,cost:6,duration:36,obligations:['open_trade'],benefits:['market_access']},
 intelligence:{threshold:25,cost:6,duration:36,obligations:['share_reports'],benefits:['reports']},
 defensive:{threshold:30,cost:8,duration:36,obligations:['defend'],benefits:['security']},
 offensive:{threshold:40,cost:8,duration:24,obligations:['offensive_support'],benefits:['support']},
 military_support:{threshold:25,cost:6,duration:24,obligations:['quarterly_wartime_aid'],benefits:['food_and_funds']},
 political:{threshold:30,cost:7,duration:36,obligations:['joint_civic_effort'],benefits:['stability']},
 guarantee:{threshold:25,cost:6,duration:36,obligations:['defend_recipient'],benefits:['security']}
};
const date=s=>s.year*12+s.month;
const key=(a,b)=>[a,b].sort().join(':');
const atWar=(s,a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
export function fullAllianceTerms(s,{legacy=false}={}){return {type:'full',start:legacy?null:{year:s.year,month:s.month},duration:null,obligations:['mutual_defense','mutual_offense','intelligence_exchange'],benefits:['military_support','reports'],termination:'until broken or a party ceases to exist',diplomaticCost:0,breachPenalty:20}}
export function initializeAgreements(s){s.agreements||=[];s.diplomaticCredibility||={};for(const pair of s.alliances||[])if(pair.length===2)pair.push(fullAllianceTerms(s,{legacy:true}));for(const t of s.agreements){const def=AGREEMENT_TYPES[t.type];if(!t.terms&&def)t.terms=['military_support','guarantee'].includes(t.type)?{provider:t.parties[0],recipient:t.parties[1]}:{kind:t.type,obligations:[...def.obligations],benefits:[...def.benefits]};if(t.type==='trade'){t.terms.marketAccess=true;t.terms.benefits=['market_access'];t.benefits=['market_access']}}return s}
export function activeAgreement(s,a,b,type){
 return (s.agreements||[]).find(t=>t.status==='active'&&t.type===type&&t.parties.includes(a)&&t.parties.includes(b)&&date(s)<t.expiresAt&&!atWar(s,a,b));
}
export function visibleAgreements(s,viewer){return (s.agreements||[]).filter(t=>!t.secret||t.parties.includes(viewer))}
export function proposeAgreement(s,actor,target,type,{secret=false}={}){
 initializeAgreements(s);const def=AGREEMENT_TYPES[type];
 if(!def||actor===target||actor==='rebels'||target==='rebels'||!s.factions[actor]||!s.factions[target])return {ok:false,reason:'invalid'};
 if(!s.regions.some(r=>r.owner===actor)||!s.regions.some(r=>r.owner===target)||atWar(s,actor,target))return {ok:false,reason:'unavailable'};
 if(activeAgreement(s,actor,target,type))return {ok:false,reason:'existing'};
 if(s.factions[actor].treasury<def.cost)return {ok:false,reason:'treasury'};
 const relation=s.relations[key(actor,target)]??0,credibility=s.diplomaticCredibility[actor]??100;
 // The recipient weighs the proposer's public reliability. No foreign hidden
 // attributes are read and declining an offer reveals no private information.
 if(relation-(100-credibility)*.4+politicalMemoryAdjustment(s,target,actor)+(hasNationalIdea(s,actor,'diplomacy')?4:0)<def.threshold)return {ok:false,reason:'declined'};
 s.factions[actor].treasury-=def.cost;
 const t={id:`agreement:${s.nextAgreementId||1}`,type,parties:[actor,target],start:{year:s.year,month:s.month},duration:def.duration,expiresAt:date(s)+def.duration,obligations:[...def.obligations],benefits:[...def.benefits],terms:['military_support','guarantee'].includes(type)?{provider:actor,recipient:target}:{kind:type,obligations:[...def.obligations],benefits:[...def.benefits],...(type==='trade'?{marketAccess:true}:{})},termination:'expiry, mutual consent, or breach',diplomaticCost:def.cost,breachPenalty:20,secret:!!secret,status:'active'};
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
 for(const t of s.agreements){
  if(t.status!=='active')continue;
  if(date(s)>=t.expiresAt||t.parties.some(p=>!s.factions[p])){t.status='expired';t.ended={year:s.year,month:s.month};continue}
  if(atWar(s,t.parties[0],t.parties[1])){t.status='ended_by_war';t.ended={year:s.year,month:s.month};continue}
  if(t.type==='military_support'&&s.month%3===0){const source=t.terms?.provider||t.parties[0],destination=t.terms?.recipient||t.parties[1],provider=s.factions[source],recipient=s.factions[destination];if(provider&&recipient&&s.wars.some(w=>w.includes(destination))&&provider.treasury>=12&&provider.food>=12){provider.treasury-=2;provider.food-=2;recipient.treasury+=2;recipient.food+=2;rememberPoliticalEvent(s,destination,source,'military_aid',1)}}
  if(t.type==='political'&&s.month%6===0&&t.parties.every(p=>s.factions[p].treasury>=10)){for(const p of t.parties){s.factions[p].treasury--;s.factions[p].stability=Math.min(100,s.factions[p].stability+1)}}
 }
 // Reputation fades slowly; a record of the actual breach remains in the treaty.
 if(s.month===1)for(const actor of Object.keys(s.diplomaticCredibility))s.diplomaticCredibility[actor]=Math.min(100,s.diplomaticCredibility[actor]+1);
}
