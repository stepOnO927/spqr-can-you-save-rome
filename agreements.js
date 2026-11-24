import {rememberTreatyCopy,treatyDocument,knownAgreement,knownRelation,knownNeutralityBlocksWar,knownNeutralityBlocksAid,knownNeutralityConflict,knownAlliance,knownAgreementToRenounce,announceTreatyChange} from './treaty-observation.js?v=treaty-observation-1';
import {rememberPoliticalEvent,politicalMemoryAdjustment} from './political-memory.js?v=grand-chessboard-2';
import {hasNationalIdea} from './national-ideas.js?v=grand-chessboard-2';
// Agreements supplement the existing full-alliance pairs; they do not copy them.
// All effects are derived from the active agreement itself, so expiration or a
// breach immediately removes its privileges.
export const AGREEMENT_TYPES = {
 non_aggression:{threshold:0,cost:4,duration:36,obligations:['no_war'],benefits:['security']},
 neutrality:{threshold:10,cost:6,duration:12,obligations:['neutral_in_named_conflict','no_direct_military_aid','no_new_military_access','respect_neutral_party'],benefits:['temporary_non_intervention']},
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
export function initializeAgreements(s){s.agreements||=[];s.diplomaticCredibility||={};for(const pair of s.alliances||[])if(pair.length===2){pair.push(fullAllianceTerms(s,{legacy:true}));rememberTreatyCopy(s,treatyDocument(pair,'alliance'),pair.slice(0,2),{source:'legacy_copy'})}for(const t of s.agreements){const def=AGREEMENT_TYPES[t.type];if(!t.terms&&def)t.terms=['military_support','guarantee'].includes(t.type)?{provider:t.parties[0],recipient:t.parties[1]}:{kind:t.type,obligations:[...def.obligations],benefits:[...def.benefits]};if(t.type==='trade'){t.terms.marketAccess=true;t.terms.benefits=['market_access'];t.benefits=['market_access']}}return s}

export function activeAgreement(s,a,b,type){
 return (s.agreements||[]).find(t=>t.status==='active'&&t.type===type&&t.parties.includes(a)&&t.parties.includes(b)&&date(s)<t.expiresAt&&!atWar(s,a,b));
}

export function neutralityTerms(actor,target,enemy){return {requester:actor,neutral:target,warParties:[actor,enemy],selfDefense:true}}
export function activeNeutralities(s){
 return (s.agreements||[]).filter(t=>t.type==='neutrality'&&t.status==='active'&&date(s)<t.expiresAt&&Array.isArray(t.parties)&&!atWar(s,...t.parties)&&t.terms?.neutral&&Array.isArray(t.terms.warParties)&&t.terms.warParties.length===2);
}
export function neutralityBlocksWar(s,actor,target){
 return knownNeutralityBlocksWar(s,actor,target);
}
export function neutralityBlocksAid(s,provider,recipient){
 return knownNeutralityBlocksAid(s,provider,recipient);
}
export function neutralityConflicts(s,owner,partner,type,options={}){return knownNeutralityConflict(s,owner,partner,type,options)}
export function neutralityOfferProblem(s,actor,target,enemy,{recipientReview=false}={}){
 if(!s.factions[enemy]||new Set([actor,target,enemy]).size!==3||enemy==='rebels')return 'invalid';
 // The requester knows its own war. A recipient judges the dated proposal
 // as a claim, without inspecting a remote war that may already have ended.
 if(!recipientReview&&!atWar(s,actor,enemy))return 'war';
 if(recipientReview){
  if(atWar(s,target,enemy)||atWar(s,actor,target))return 'belligerent';
  for(const other of [actor,enemy]){
   if(knownAlliance(s,target,other))return 'obligations';
   if(['defensive','offensive','military_access'].some(type=>knownAgreement(s,target,other,type)))return 'obligations';
   if(['guarantee','military_support'].some(type=>{const t=activeAgreement(s,target,other,type);return t&&(t.terms?.provider||t.parties[0])===target}))return 'obligations';
  }
 }
 return null;
}

export function visibleAgreements(s,viewer){return (s.agreements||[]).filter(t=>!t.secret||t.parties.includes(viewer))}
export function agreementCredentials(s,actor){return {diplomacy:hasNationalIdea(s,actor,'diplomacy')?4:0,credibility:Math.max(0,Math.min(100,s.diplomaticCredibility?.[actor]??100))}}
export function checkAgreement(s,actor,target,type,{evaluateRecipient=true,recipientReview=false,credentials=null,enemy=null}={}){
 initializeAgreements(s);const def=AGREEMENT_TYPES[type];
 if(!def||actor===target||actor==='rebels'||target==='rebels'||!s.factions[actor]||!s.factions[target])return {ok:false,reason:'invalid'};
 if((!recipientReview&&!s.regions.some(r=>r.owner===actor))||!s.regions.some(r=>r.owner===target)||atWar(s,actor,target))return {ok:false,reason:'unavailable'};
 if((evaluateRecipient?knownAgreement(s,recipientReview?target:actor,recipientReview?actor:target,type):activeAgreement(s,actor,target,type)))return {ok:false,reason:'existing'};
 if(type==='neutrality'){const reason=neutralityOfferProblem(s,actor,target,enemy,{recipientReview})||(!recipientReview?neutralityOfferProblem(s,actor,target,enemy,{recipientReview:true}):null);if(reason)return {ok:false,reason}}
 if(neutralityConflicts(s,target,actor,type,{provider:actor})||!recipientReview&&neutralityConflicts(s,actor,target,type,{provider:actor}))return {ok:false,reason:'neutrality'};
 if(!recipientReview&&s.factions[actor].treasury<def.cost)return {ok:false,reason:'treasury'};
 const relation=knownRelation(s,recipientReview?target:actor,recipientReview?actor:target),offer=recipientReview?(credentials||{}):agreementCredentials(s,actor);
 const credibility=Number.isFinite(offer.credibility)?Math.max(0,Math.min(100,offer.credibility)):100,credit=offer.diplomacy===4?4:0;
 // A received offer carries dated credentials. Missing legacy credentials
 // give no diplomacy bonus; never reconstruct them from foreign live policy.
 // Sender funding and existence are checked when its own court concludes,
 // not used as remote intelligence while the recipient decides.
 if(evaluateRecipient&&relation-(100-credibility)*.4+politicalMemoryAdjustment(s,target,actor)+credit<def.threshold)return {ok:false,reason:'declined'};
 return {ok:true};
}
export function proposeAgreement(s,actor,target,type,{secret=false,priorConsent=false,enemy=null}={}){
 const check=checkAgreement(s,actor,target,type,{evaluateRecipient:!priorConsent,enemy});if(!check.ok)return check;const def=AGREEMENT_TYPES[type];
 s.factions[actor].treasury-=def.cost;
 const t={id:`agreement:${s.nextAgreementId||1}`,type,parties:[actor,target],start:{year:s.year,month:s.month},duration:def.duration,expiresAt:date(s)+def.duration,obligations:[...def.obligations],benefits:[...def.benefits],terms:type==='neutrality'?neutralityTerms(actor,target,enemy):['military_support','guarantee'].includes(type)?{provider:actor,recipient:target}:{kind:type,obligations:[...def.obligations],benefits:[...def.benefits],...(type==='trade'?{marketAccess:true}:{})},termination:'expiry, mutual consent, or breach',diplomaticCost:def.cost,breachPenalty:20,secret:!!secret,status:'active'};
 s.nextAgreementId=(s.nextAgreementId||1)+1;s.agreements.push(t);rememberTreatyCopy(s,treatyDocument(t));rememberPoliticalEvent(s,target,actor,'negotiated_agreement',2);return {ok:true,agreement:t};

}
export function terminateAgreement(s,id,actor,{mutual=false}={}){
 initializeAgreements(s);const known=knownAgreementToRenounce(s,id,actor),t=s.agreements.find(x=>x.id===id);
 if(!known)return {ok:false,reason:'unavailable'};
 const ended={year:s.year,month:s.month,actor},status=mutual?'terminated':'breached';
 if(t?.status==='active'&&t.parties.includes(actor)){t.status=status;t.ended=ended}
 const document={...known,status,ended};
 if(!mutual)s.diplomaticCredibility[actor]=Math.max(0,(s.diplomaticCredibility[actor]??100)-(known.breachPenalty??20));
 announceTreatyChange(s,document,actor,{relationPenalty:mutual?0:20,memoryWeight:mutual?0:-12});
 return {ok:true};
}
export function advanceAgreements(s){
 initializeAgreements(s);
 for(const t of s.agreements){
  if(t.status!=='active')continue;
  if(date(s)>=t.expiresAt||t.parties.some(p=>!s.factions[p])){t.status='expired';t.ended={year:s.year,month:s.month};continue}
  if(atWar(s,t.parties[0],t.parties[1])){t.status='ended_by_war';t.ended={year:s.year,month:s.month};continue}
  // Trade proceeds come from actual goods, buyers and deliveries in the market ledger.
  if(t.type==='military_support'&&s.month%3===0){const source=t.terms?.provider||t.parties[0],destination=t.terms?.recipient||t.parties[1],provider=s.factions[source],recipient=s.factions[destination];if(provider&&recipient&&!neutralityBlocksAid(s,source,destination)&&s.wars.some(w=>w.includes(destination))&&provider.treasury>=12&&provider.food>=12){provider.treasury-=2;provider.food-=2;recipient.treasury+=2;recipient.food+=2;rememberPoliticalEvent(s,destination,source,'military_aid',1)}}
  if(t.type==='political'&&s.month%6===0&&t.parties.every(p=>s.factions[p].treasury>=10)){for(const p of t.parties){s.factions[p].treasury--;s.factions[p].stability=Math.min(100,s.factions[p].stability+1)}}
 }
 // Reputation fades slowly; a record of the actual breach remains in the treaty.
 if(s.month===1)for(const actor of Object.keys(s.diplomaticCredibility))s.diplomaticCredibility[actor]=Math.min(100,s.diplomaticCredibility[actor]+1);
}


