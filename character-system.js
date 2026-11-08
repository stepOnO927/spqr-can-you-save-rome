import {CHARACTER_CATALOG,OPENING_LEADERS,initializeWorld,assignSuccession,ageRange} from './characters.js?v=15';
import {FACTIONS,ROUTES} from './data.js?v=9';
import {GRAND_ROUTES} from './grand-map-data.js';
import {deriveGovernment} from './governance.js?v=16';
import {potentialConspirators} from './conspiracies.js?v=7';
import {localBuildingEffects} from './development.js?v=19';
const names=(ids,lang)=>ids.map(id=>CHARACTER_CATALOG[id]?.name[lang]).filter(Boolean).join(lang?'、':', ');
const claimantAvailable=c=>!!c?.alive&&!c.missing&&!c.travel&&!['seriously_ill','dying','deceased'].includes(c.health);
const rand=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const notify=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};
const configs={spy:{cost:12,months:4},counter:{cost:8,months:3},envoy:{cost:8,months:3},travelers:{cost:4,months:2},audience:{cost:10,months:4},exchange:{cost:6,months:3}};
export const MISSION_RULES=configs;
// This is a theater-graph estimate, not a reconstruction of an actual ancient route.
export function missionDuration(s,actor,target,type){
 const cfg=configs[type];if(!cfg)return null;
 if(type!=='envoy'&&type!=='audience')return cfg.months;
 const starts=s.regions.filter(r=>r.owner===actor).map(r=>r.id),goals=new Set(s.regions.filter(r=>r.owner===target).map(r=>r.id));
 if(!starts.length||!goals.size)return null;
 const queue=starts.map(id=>[id,0]),seen=new Set(starts);let distance=null;
 for(let i=0;i<queue.length;i++){const [id,steps]=queue[i];if(goals.has(id)){distance=steps;break}for(const edge of ROUTES){const next=edge[0]===id?edge[1]:edge[1]===id?edge[0]:null;if(next&&!seen.has(next)){seen.add(next);queue.push([next,steps+1])}}}
 return cfg.months+(distance===null?2:distance>=5?2:distance>=3?1:0);
}
export function availableAgents(s,actor){initializeWorld(s);const held=s.world.captives.filter(c=>c.owner===actor&&c.state==='held').length,pending=s.operations.filter(o=>o.actor===actor&&['spy','counter'].includes(o.type)&&o.status==='pending').length;return Math.max(0,3-held-pending)}
export function requestAgentRelease(s,actor,captiveId){
 initializeWorld(s);const c=s.world.captives.find(x=>x.id===captiveId&&x.owner===actor&&x.state==='held');if(actor!==s.player||!c)return {ok:false,reason:'unavailable'};
 if(s.releaseRequests.some(x=>x.captiveId===captiveId&&x.status==='pending'))return {ok:false,reason:'pending'};if(s.factions[actor].treasury<8)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=8;s.releaseRequests.unshift({actor,holder:c.holder,captiveId,remaining:4,status:'pending',year:s.year,month:s.month});notify(s,'A release request was sent; a reply may take four months.','已寄出释放请求；回信可能需要四个月。');return {ok:true};
}
export function advanceAgentRequests(s){initializeWorld(s);for(const request of s.releaseRequests){if(request.status!=='pending'||--request.remaining>0)continue;const c=s.world.captives.find(x=>x.id===request.captiveId),q=rand(s),war=s.wars.some(w=>w.includes(request.actor)&&w.includes(request.holder));if(!c||c.state!=='held'||!s.regions.some(r=>r.owner===request.holder)||q<.2)request.status='no_reply';else if(q<(war?.65:.45))request.status='refused';else{request.status='released';c.state='released';c.releasedYear=s.year;c.releasedMonth=s.month}if(request.actor===s.player)notify(s,request.status==='released'?'The unnamed agent was released and is available again.':request.status==='refused'?'The court refused to release the agent.':'No response arrived; the correspondence may have been lost.',request.status==='released'?'未具名人员获释，情报人手恢复。':request.status==='refused'?'对方拒绝释放人员。':'未收到回信；书信可能遗失。')}}
const sourceFamily=r=>{const source=r.originSource||r.source;return ({official:'court',envoy:'court',audience:'court',exchange:'unknown'}[source]||source||'unknown')};
const reportAge=(s,r)=>(s.year-(r.observationYear??r.year))*12+s.month-(r.observationMonth??r.month);
const knownReport=x=>['leaders','claimants'].includes(x.kind)?Array.isArray(x.leaders)&&x.leaders.length>0:x.value!=='unknown'&&x.value!=null;
const reportValue=x=>JSON.stringify((x.kind==='leaders'||x.kind==='claimants')?[...new Set(x.leaders||[])].sort():x.kind==='authority'&&x.value&&typeof x.value==='object'?{kind:x.value.kind,actors:[...new Set(x.value.actors||[])].sort()}:x.value);
// Partially overlapping age estimates are compatible, but do not independently verify the same range.
const evidenceRelation=(a,b)=>{if((a.observationYear??a.year)!==(b.observationYear??b.year)||(a.observationMonth??a.month)!==(b.observationMonth??b.month))return 'different_time';if(['leaders','claimants'].includes(a.kind)){const aa=new Set(a.leaders||[]),bb=new Set(b.leaders||[]),same=reportValue(a)===reportValue(b);if((a.exhaustive&&[...bb].some(id=>!aa.has(id)))||(b.exhaustive&&[...aa].some(id=>!bb.has(id))))return 'conflict';if(same&&(!a.exhaustive||b.exhaustive))return 'support';return 'compatible'}if(reportValue(a)===reportValue(b))return 'support';if(a.kind==='age'&&Array.isArray(a.value)&&Array.isArray(b.value)&&a.value.length===2&&b.value.length===2&&a.value.every(Number.isFinite)&&b.value.every(Number.isFinite)&&Math.max(a.value[0],b.value[0])<=Math.min(a.value[1],b.value[1]))return 'compatible';return 'conflict'};
const sameSubject=(a,b)=>a.kind===b.kind&&a.character===b.character;
function refreshKnowledge(s,k){
 const reports=k.reports||[];for(const item of reports){if(!knownReport(item)){item.verified=false;item.confidence=(item.baseConfidence||item.confidence)==='rumor'?'rumor':'unverified';continue}if(reportAge(s,item)>24)continue;const group=reports.filter(x=>knownReport(x)&&sameSubject(item,x)&&reportAge(s,x)<=24),disputed=group.some(x=>evidenceRelation(item,x)==='conflict')||group.some(x=>evidenceRelation(item,x)!=='different_time'&&x.baseConfidence==='disputed'),families=new Set(group.filter(x=>evidenceRelation(item,x)==='support').map(sourceFamily).filter(f=>f!=='unknown')).size,base=(item.baseConfidence||item.confidence)==='rumor'?'rumor':'unverified';item.confidence=disputed?'disputed':families>=3?'confirmed':families>=2?'credible':base;item.verified=!disputed&&families>=3}
}
// Expired reports remain historical records; only fresh reports are recalculated.
export function refreshReportConfidence(s){initializeWorld(s);for(const targets of Object.values(s.knowledge||{}))for(const k of Object.values(targets)){refreshKnowledge(s,k);if(Array.isArray(k.reportedLeaders)&&!k.reportedLeaders.length){const previous=(k.reports||[]).filter(r=>r.kind==='leaders'&&knownReport(r)).sort((a,b)=>reportAge(s,a)-reportAge(s,b))[0];if(previous)k.reportedLeaders=[...previous.leaders]}}return s}

// Explain confidence only from the observer's own recent evidence. A forwarded
// report keeps the original family; an unknown is neither support nor rebuttal.
export function reportEvidence(s,actor,target,report){
 const reports=s.knowledge?.[actor]?.[target]?.reports||[];
 if(!reports.includes(report)||!knownReport(report)||reportAge(s,report)>24)return {support:[],conflict:[],unattributed:0,inheritedDispute:false,unavailable:true};
 const comparable=reports.filter(r=>knownReport(r)&&sameSubject(report,r)&&reportAge(s,r)<=24),summarize=list=>{
  const byFamily=new Map();for(const r of list){const family=sourceFamily(r);if(family==='unknown')continue;const current=byFamily.get(family);if(!current||reportAge(s,r)<reportAge(s,current))byFamily.set(family,r)}
  return [...byFamily].map(([family,r])=>({family,year:r.observationYear??r.year,month:r.observationMonth??r.month}));
 };
 return {support:summarize(comparable.filter(r=>evidenceRelation(report,r)==='support')),conflict:summarize(comparable.filter(r=>evidenceRelation(report,r)==='conflict')),compatible:summarize(comparable.filter(r=>evidenceRelation(report,r)==='compatible')),differentTime:summarize(comparable.filter(r=>evidenceRelation(report,r)==='different_time')),unattributed:comparable.filter(r=>sourceFamily(r)==='unknown').length,inheritedDispute:comparable.some(r=>evidenceRelation(report,r)!=='different_time'&&r.baseConfidence==='disputed'),unavailable:false};
}
export function addReport(s,actor,target,report){
 initializeWorld(s);const k=s.knowledge[actor]?.[target];if(!k)return;
 const r={...report,year:s.year,month:s.month,baseConfidence:report.baseConfidence||report.confidence||'unverified',verified:false};
 // An older forwarded message may be useful evidence but must not replace a newer report.
 const newerLeader=r.kind==='leaders'&&k.reports.some(x=>x.kind==='leaders'&&knownReport(x)&&reportAge(s,x)<reportAge(s,r));
 k.reports.unshift(r);k.reports=k.reports.slice(0,30);
 // Recalculate after trimming so a source that is no longer retained cannot
 // silently keep a current report marked as independently corroborated.
 refreshKnowledge(s,k);
 if(r.kind==='leaders'&&knownReport(r)&&reportAge(s,r)<=24&&!newerLeader)k.reportedLeaders=[...r.leaders];return r
}
export function publicLeaderClaim(s,target){initializeWorld(s);const ids=s.world.leadership[target]||[];return [ids.length?names(ids,0):'Authority uncertain',ids.length?names(ids,1):'执政者不明']}
export function reportedClaimants(s,actor,target){initializeWorld(s);return [...new Set((s.knowledge[actor]?.[target]?.reports||[]).filter(r=>r.kind==='claimants').flatMap(r=>r.leaders||[]).filter(id=>CHARACTER_CATALOG[id]?.faction===target))]}
export function reportedHealthSubjects(s,actor,target){
 initializeWorld(s);const knowledge=s.knowledge[actor]?.[target],reports=knowledge?.reports||[];
 // A later partial roster is not evidence that names in earlier reports vanished.
 // Preserve these as investigable leads only, not as current rulers or verified identities.
 const leads=reports.flatMap(r=>['leaders','claimants'].includes(r.kind)?r.leaders||[]:['health','age','conspiracy'].includes(r.kind)?[r.character]:r.kind==='authority'&&r.value&&typeof r.value==='object'?r.value.actors||[]:[]);
 return [...new Set([...(knowledge?.reportedLeaders||[]),...reportedClaimants(s,actor,target),...Object.values(knowledge?.sightings||{}).map(x=>x.commanderId),...(knowledge?.commanderReports||[]).map(x=>x.commanderId),...leads].filter(id=>CHARACTER_CATALOG[id]))];
}
export function claimantRepresentatives(s,actor,claimant){
 initializeWorld(s);return Object.values(s.world.characters).filter(c=>c.faction===actor&&c.alive&&!c.missing&&!['seriously_ill','dying','deceased'].includes(c.health)&&CHARACTER_CATALOG[c.id]&&(s.world.personalRelations[[c.id,claimant].sort().join(':')]?.trust||0)>0).map(c=>c.id);
}
export function supportClaimant(s,actor,target,claimant,representative=null){
 initializeWorld(s);if(!['caesar','senate'].includes(actor)||actor===target||!['egypt','parthia'].includes(target)||!reportedClaimants(s,actor,target).includes(claimant)||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unavailable'};
 if(representative&&!claimantRepresentatives(s,actor,claimant).includes(representative))return {ok:false,reason:'representative'};
 if(s.operations.some(o=>o.actor===actor&&o.target===target&&o.type==='support'&&o.status==='pending'))return {ok:false,reason:'pending'};if(s.factions[actor].treasury<10)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=10;s.operations.unshift({actor,target,type:'support',claimant,representative:representative||null,remaining:4,status:'pending',sentYear:s.year,sentMonth:s.month});if(actor===s.player)notify(s,'An offer of support was sent; a response may take four months.','已寄出支持提议；回信可能需要四个月。');return {ok:true};
}
export function previewMission(s,actor,target,type,subject='health',partnerId=null,characterId=null){
 initializeWorld(s);const cfg=configs[type];if(!cfg||!s.factions[actor]||!s.factions[target]||(actor===target)!==(type==='counter')||target==='rebels'||!s.regions.some(r=>r.owner===actor)||!s.regions.some(r=>r.owner===target))return {ok:false,reason:'unavailable'};
 if(!['health','age','leaders','authority','strength','claimants','stability','succession','conspiracy','contacts'].includes(subject))return {ok:false,reason:'subject'};
 if(subject==='age'&&type!=='exchange')return {ok:false,reason:'subject'};
 if(subject==='contacts'&&(!['spy','exchange'].includes(type)||!['egypt','parthia'].includes(target)))return {ok:false,reason:'subject'};
 if(type==='counter'&&subject!=='conspiracy'||subject==='conspiracy'&&(!['spy','counter','exchange'].includes(type)||!['caesar','senate'].includes(target)))return {ok:false,reason:'subject'};
 if(type==='audience'&&subject!=='leaders')return {ok:false,reason:'subject'};
 if(['health','age'].includes(subject)&&characterId&&!reportedHealthSubjects(s,actor,target).includes(characterId))return {ok:false,reason:'identity'};
 const partners=s.alliances.filter(x=>x.includes(actor)).map(x=>x.find(id=>id!==actor)).filter(id=>id!==target&&s.factions[id]);
 if(type==='exchange'&&(!partners.length||(partnerId&&!partners.includes(partnerId))))return {ok:false,reason:'alliance'};
 if(['spy','counter'].includes(type)&&!availableAgents(s,actor))return {ok:false,reason:'agents'};
 if(s.factions[actor].treasury<cfg.cost)return {ok:false,reason:'treasury'};
 if(s.operations.some(x=>x.actor===actor&&x.target===target&&x.status==='pending'&&x.type===type))return {ok:false,reason:'pending'};
 return {ok:true,cost:cfg.cost,duration:missionDuration(s,actor,target,type),partner:type==='exchange'?(partnerId||partners[0]):undefined};
}
export function queueMission(s,actor,target,type,subject='health',partnerId=null,characterId=null){
 const plan=previewMission(s,actor,target,type,subject,partnerId,characterId);if(!plan.ok)return plan;
 const {duration,partner,cost}=plan,subjectCharacter=['health','age'].includes(subject)?(characterId||(subject==='health'&&type!=='exchange'?reportedHealthSubjects(s,actor,target)[0]:null)||null):null;
 s.factions[actor].treasury-=cost;s.operations.unshift({actor,target,type,subject,partner,subjectCharacter,remaining:duration,duration,status:'pending',sentYear:s.year,sentMonth:s.month});
 if(actor===s.player)notify(s,`${type} mission dispatched; estimated ${duration} months.`,`已派出${({spy:'间谍',counter:'内部调查',envoy:'使者',travelers:'商旅',audience:'会面请求',exchange:'情报交换'})[type]}，预计${duration}个月。`);return {ok:true,duration};
}
export function advanceOperations(s){initializeWorld(s);for(const op of s.operations){if(op.status!=='pending'||--op.remaining>0)continue;const q=rand(s),id=(s.world.leadership[op.target]||[])[0],person=s.world.characters[id];
 if(op.type==='support'){
  const claimant=s.world.characters[op.claimant],valid=s.regions.some(r=>r.owner===op.target)&&claimantAvailable(claimant)&&(s.world.claimants[op.target]||[]).includes(op.claimant);
  const representative=op.representative&&claimantRepresentatives(s,op.actor,op.claimant).includes(op.representative)?op.representative:null,trust=representative?(s.world.personalRelations[[representative,op.claimant].sort().join(':')]?.trust||0):0,declineLimit=Math.max(.25,.45-Math.min(100,trust)*.002);
  if(!valid||q<.2)op.status='no_reply';else if(q<declineLimit)op.status='declined';else{op.status='complete';const dispute=s.world.disputes[op.target]||={months:0};dispute.support||={};dispute.support[op.claimant]=Math.min(30,(dispute.support[op.claimant]||0)+15);const key=[op.actor,op.target].sort().join(':');s.relations[key]=Math.max(-100,(s.relations[key]||0)-10)}
  op.resolvedYear=s.year;op.resolvedMonth=s.month;
  if(op.actor===s.player)notify(s,op.status==='complete'?'The claimant accepted support; relations with the court worsened.':op.status==='declined'?'The claimant declined the offer.':'No reply arrived; the offer or response may have been lost.',op.status==='complete'?'竞争者接受支持；与宫廷的关系恶化。':op.status==='declined'?'竞争者拒绝了提议。':'未收到回信；提议或回信可能遗失。');continue
 }
 if(!s.regions.some(r=>r.owner===op.target)||q<.18){op.status='failed';continue}
 if(op.type==='spy'&&q<.33){op.status=q<.24?'captured':'detected';if(op.status==='captured'){op.captiveId='captive'+s.world.nextCaptive++;s.world.captives.push({id:op.captiveId,owner:op.actor,holder:op.target,state:'held',year:s.year,month:s.month})}const k=[op.actor,op.target].sort().join(':');s.relations[k]=(s.relations[k]||0)-10;if(op.actor===s.player||op.target===s.player)notify(s,`A spy from ${FACTIONS[op.actor].short[0]} was discovered by ${FACTIONS[op.target].short[0]}.`,`${FACTIONS[op.actor].short[1]}的间谍被${FACTIONS[op.target].short[1]}发现，双方关系恶化。`);continue}
 const relation=s.relations[[op.actor,op.target].sort().join(':')]||0,atWar=s.wars.some(w=>w.includes(op.actor)&&w.includes(op.target));
 const refusal=Math.max(.23,Math.min(.70,.38-relation*.0015+(atWar?.18:0)+(s.factions[op.target].stability<35?.08:0)));
 if((op.type==='audience'||op.type==='envoy')&&q<refusal){op.status='declined';continue}
 if(op.type==='exchange'){
  const partner=op.partner,stillAllied=s.alliances.some(x=>x.includes(op.actor)&&x.includes(partner)),prior=s.knowledge[partner]?.[op.target]?.reports.find(r=>r.kind===op.subject&&(!op.subjectCharacter||r.character===op.subjectCharacter));
  if(!stillAllied||!prior){op.status='failed';continue}
  const copy={kind:prior.kind,character:prior.character,value:Array.isArray(prior.value)?[...prior.value]:prior.kind==='authority'&&prior.value&&typeof prior.value==='object'?{...prior.value,actors:[...(prior.value.actors||[])]}:prior.value,leaders:prior.leaders?[...prior.leaders]:undefined,exhaustive:prior.exhaustive===true,source:'exchange',originSource:sourceFamily(prior),fromFaction:partner,observationYear:prior.observationYear??prior.year,observationMonth:prior.observationMonth??prior.month,confidence:prior.confidence==='disputed'?'disputed':prior.confidence==='rumor'?'rumor':'unverified',reliability:prior.reliability||'unknown'};
  addReport(s,op.actor,op.target,copy);op.status='complete';if(op.actor===s.player)notify(s,'An ally forwarded an existing report; its original date and source still matter.','盟友转交了一份既有报告；仍需留意原始日期与来源。');continue
 }
 const healthId=Object.hasOwn(op,'subjectCharacter')?op.subjectCharacter:(reportedHealthSubjects(s,op.actor,op.target)[0]||null),healthCandidate=s.world.characters[healthId];
 // A lead can be stale or wrong. Investigating a court must not read the live
 // health of someone who has left it, or whose whereabouts are unknown.
 // Return the same uninformative report instead of disclosing the hidden reason.
 const healthPerson=healthCandidate?.faction===op.target&&!healthCandidate.missing?healthCandidate:null;
 op.status='complete';const source=op.type,low=op.type==='travelers',hostile=s.wars.some(w=>w.includes(op.actor)&&w.includes(op.target)),contested=(s.world.claimants[op.target]||[]).length>0,investigated=op.subject==='health'?healthPerson:person,concealment=hostile||contested||investigated?.health==='seriously_ill'||investigated?.health==='dying',falsehood=q<.45&&concealment;let report;
 if(op.subject==='contacts'){
  // Only accepted support offers are simulated contacts. A lack of evidence is
  // never a claim that no contact exists; the observer cannot see its own offer.
  const contact=s.operations.find(x=>{const year=x.resolvedYear??x.sentYear,month=x.resolvedMonth??x.sentMonth,age=(s.year-year)*12+s.month-month;return x.type==='support'&&x.status==='complete'&&x.target===op.target&&x.actor!==op.actor&&Number.isFinite(age)&&age>=0&&age<=(x.resolvedYear==null?28:24)});
  const alternative=['caesar','senate'].find(id=>id!==op.actor&&id!==contact?.actor);
  const sponsor=q>=.6?contact?.actor:((contested||hostile)&&q<.45?alternative:null);
  report={kind:'contacts',value:sponsor||'unknown',source,confidence:'unverified',reliability:'moderate'};
 }
 else if(op.subject==='conspiracy'){
  const actual=s.world.conspiracies?.[op.target]?.person||null,alternative=potentialConspirators(s,op.target).find(candidate=>candidate!==actual)||null;
  // Discontent can produce a false accusation; silence is not proof of safety.
  const suspect=q>=.6?actual:(q>=.34&&s.factions[op.target].stability<45?alternative:null);
  report={kind:'conspiracy',character:suspect,value:suspect?'suspected':'unknown',source,confidence:'unverified',reliability:'moderate'};
 }
 else if(op.subject==='health'){const value=healthPerson?(falsehood?'healthy':healthPerson.health):'unknown';report={kind:'health',character:healthId||null,value,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};}
 else if(op.subject==='claimants'){const candidates=falsehood?[]:[...(s.world.claimants[op.target]||[])];report={kind:'claimants',leaders:candidates,exhaustive:op.type==='spy'&&q>=.7,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};}
 else if(op.subject==='strength'){let count=s.armies.filter(a=>a.owner===op.target).reduce((x,a)=>x+a.men,0);if(falsehood)count=Math.round(count*.65/1000)*1000;else count=Math.round(count/1000)*1000;report={kind:'strength',value:count,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};}
 else if(op.subject==='stability'){
  const stability=s.factions[op.target].stability,actual=stability<35?'fragile':stability<60?'strained':'stable';
  // In a threatened court, reassuring propaganda can mask instability. Casual
  // travelers may also misread conditions, without learning the underlying score.
  const value=(hostile||contested)&&q<.45?'stable':low&&q<.6?(actual==='strained'?'stable':'strained'):actual;
  report={kind:'stability',value,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};
 }
 else if(op.subject==='authority'){
  // The observer receives a claim about the arrangement at the time, never a live view.
  // A threatened court can conceal incapacity behind its opening public rulers.
  const government=deriveGovernment(s,op.target),concealed=(hostile||contested)&&q<.45,unknown=low&&q<.6;
  const value=unknown?'unknown':concealed?{kind:'normal',actors:[...(OPENING_LEADERS[op.target]||[])]}:{kind:government.kind,actors:[...government.acting]};
  report={kind:'authority',value,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};
 }
 else if(op.subject==='succession'){
  // Silence means no information, not proof that a succession plan does not exist.
  const concealed=(hostile||contested)&&q<.45||(op.type==='envoy'&&q<.7)||(low&&q<.8);
  const planned=s.world.successionPlans?.[op.target];
  report={kind:'succession',value:!concealed&&CHARACTER_CATALOG[planned]?planned:'unknown',source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};
 }
 else {
  const current=s.world.leadership[op.target]||[],opening=OPENING_LEADERS[op.target]||[];
  // A threatened or contested court may circulate an outdated public arrangement.
  // A covert agent or traveler can pick up that cover story too; the recipient
  // sees an ordinary report, not the hidden reason why it is inaccurate.
  const oldArrangement=(hostile||contested)&&q<.45&&opening.length&&opening.some(id=>!current.includes(id));
  const leaders=[...(oldArrangement?opening:current)];if(low&&q<.7&&leaders.length>1)leaders.splice(1);
  report={kind:'leaders',leaders,exhaustive:op.type==='envoy'||op.type==='audience'||op.type==='spy'&&q>=.7,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};
 }
 if(op.type==='audience'){
  op.meeting='envoy';const k=[op.actor,op.target].sort().join(':');s.relations[k]=Math.min(100,(s.relations[k]||0)+3);
  // An audience may be with a representative. Only record a personal observation
  // when someone actually in office and named in the report could attend.
  const met=(report.leaders||[]).find(candidate=>(s.world.leadership[op.target]||[]).includes(candidate)&&s.world.characters[candidate]?.alive&&!s.world.characters[candidate].travel&&!s.world.characters[candidate].missing&&!['seriously_ill','dying','deceased'].includes(s.world.characters[candidate].health));
  if(met){const p=s.world.characters[met],visible=['wounded','frail'].includes(p.health)?p.health:'unknown',age=ageRange(met,s.year);
   addReport(s,op.actor,op.target,{kind:'health',character:met,value:visible,source:'audience',confidence:'unverified',reliability:'low'});
   if(age)addReport(s,op.actor,op.target,{kind:'age',character:met,value:age,source:'audience',confidence:'unverified',reliability:'low'});
  }
 }
 addReport(s,op.actor,op.target,report);if(op.actor===s.player)notify(s,`An intelligence report from ${FACTIONS[op.target].short[0]} has arrived.`,`一份来自${FACTIONS[op.target].short[1]}的情报报告已送达。`);
}}
export function contestLeadership(s,faction,claimant){initializeWorld(s);const leaders=s.world.leadership[faction]||[],person=s.world.characters[claimant],egypt=faction==='egypt'&&leaders.length>1&&leaders.includes(claimant),parthia=faction==='parthia'&&claimant==='pacorus'&&leaders.includes('orodes')&&!leaders.includes(claimant)&&person?.loyalty<40;if((!egypt&&!parthia)||!s.regions.some(r=>r.owner===faction)||!claimantAvailable(person)||(s.world.claimants[faction]||[]).includes(claimant))return false;if(egypt)s.world.leadership[faction]=leaders.filter(id=>id!==claimant);const claimants=s.world.claimants[faction]||=[];claimants.push(claimant);s.world.disputes[faction]={months:0};if(s.factions[faction])s.factions[faction].stability=Math.max(0,s.factions[faction].stability-5);if(faction===s.player)notify(s,'A leadership dispute has created a rival claimant.','执政权争议产生了一位竞争者。');return true}

// Alternate-history court outcomes use existing characters and never update a foreign observer's reports directly.
export function advanceDisputes(s){initializeWorld(s);for(const faction of ['egypt','parthia'])advanceFactionDispute(s,faction)}
function advanceFactionDispute(s,faction){
 const leaders=s.world.leadership[faction]||[],claimants=(s.world.claimants[faction]||[]).filter(id=>s.world.characters[id]?.alive&&s.world.characters[id].faction===faction&&!leaders.includes(id));s.world.claimants[faction]=claimants;
 if(!claimants.length||!s.regions.some(r=>r.owner===faction)){delete s.world.disputes[faction];return}
 const dispute=s.world.disputes[faction]||={months:0};if(!leaders.length&&dispute.vacancySince?.year===s.year&&dispute.vacancySince?.month===s.month)return;
 // An unresolved court struggle strains administration over time. This is
 // internal simulation state; observers learn about it only through reports.
 // Old saves start the new pressure clock when they are resumed.
 dispute.duration=(Number.isFinite(dispute.duration)?Math.max(0,dispute.duration):0)+1;
 if(dispute.duration%3===0){s.factions[faction].stability=Math.max(0,s.factions[faction].stability-1);s.factions[faction].treasury=Math.max(-100,s.factions[faction].treasury-3)}
 if(++dispute.months<6)return;dispute.months=0;
 if(!leaders.length){
  // A rival's claim is not automatically recognized when the incumbent dies.
  // An unnamed authority governs during the vacancy; existing claimants may
  // eventually establish control, influenced by already accepted support.
  const eligible=claimants.filter(id=>claimantAvailable(s.world.characters[id])).sort((a,b)=>(s.world.characters[b].influence+(dispute.support?.[b]||0))-(s.world.characters[a].influence+(dispute.support?.[a]||0))),candidate=eligible[0];
  if(candidate&&rand(s)<Math.min(.8,.5+(dispute.support?.[candidate]||0)/100)){s.world.leadership[faction]=[candidate];s.world.claimants[faction]=claimants.filter(id=>id!==candidate);s.factions[faction].stability=Math.max(0,s.factions[faction].stability-2);s.world.disputeHistory.unshift({faction,claimant:candidate,outcome:'succession',year:s.year,month:s.month});s.world.disputeHistory=s.world.disputeHistory.slice(0,30);if(!s.world.claimants[faction].length)delete s.world.disputes[faction];else{dispute.support={};delete dispute.vacancySince}if(faction===s.player)notify(s,'A claimant established authority after the simulated succession dispute.','一位竞争者在游戏继承争议后确立了执政权。')}
  return
 }
 const claimant=claimants.find(id=>claimantAvailable(s.world.characters[id]));if(!claimant)return;const person=s.world.characters[claimant];const stability=s.factions[faction].stability,support=dispute.support?.[claimant]||0,q=rand(s);let outcome;
 if(stability>=45&&person.loyalty>=55&&support===0&&q<.12){s.world.leadership[faction]=faction==='egypt'?[...leaders,claimant]:leaders;s.world.claimants[faction]=claimants.filter(id=>id!==claimant);s.factions[faction].stability=Math.min(100,stability+2);outcome='reconciliation';delete s.world.disputes[faction]}
 else if(q<(stability<45?.22:.08)+support/100){s.world.leadership[faction]=[claimant];s.world.claimants[faction]=[...new Set([...claimants.filter(id=>id!==claimant),...leaders.filter(id=>s.world.characters[id]?.alive)])];s.factions[faction].stability=Math.max(0,stability-4);outcome='takeover';dispute.support={}}
 if(outcome){s.world.disputeHistory.unshift({faction,claimant,outcome,year:s.year,month:s.month});s.world.disputeHistory=s.world.disputeHistory.slice(0,30);if(faction===s.player)notify(s,outcome==='reconciliation'?(faction==='egypt'?'A simulated court settlement restored joint rule.':'A simulated settlement ended the dynastic challenge.'):'A simulated court struggle changed the ruling authority.',outcome==='reconciliation'?(faction==='egypt'?'游戏中的宫廷和解恢复了共同统治。':'游戏中的宫廷和解结束了王朝挑战。'):'游戏中的宫廷斗争改变了执政者。')}
}
// Simulation probabilities only; these do not assert historical diagnoses.
export function illnessRisk(s,id){initializeWorld(s);const c=s.world.characters[id];if(!c)return 0;const age=ageRange(id,s.year)?.[0],military=s.armies.some(a=>a.characterId===id),shortage=(s.factions[c.faction]?.food??0)<0,site=s.regions.find(r=>r.id===c.location),risk=site?localBuildingEffects(site).healthRisk||0:0;return Math.max(0,Math.min(.18,(age>=65?.04:.018)+(military?.01:0)+(shortage?.025:0)+(c.travel?.01:0)+Math.min(.02,c.wounds*.01)+risk))}
// Alternate-history defection is restricted to unattached Roman officers, never fabricated identities.
export function considerDefection(s,id){
 initializeWorld(s);const c=s.world.characters[id],from=c?.faction,to=from==='caesar'?'senate':from==='senate'?'caesar':null;
 if(!to||!c.alive||c.missing||c.loyalty>20||['seriously_ill','dying','deceased'].includes(c.health)||(s.world.leadership[from]||[]).includes(id)||s.armies.some(a=>a.characterId===id)||!s.regions.some(r=>r.owner===to)||!s.wars.some(w=>w.includes(from)&&w.includes(to)))return false;
 if(rand(s)>=.18)return false;c.faction=to;c.loyalty=45;delete c.travel;s.factions[from].stability=Math.max(0,s.factions[from].stability-2);s.factions[to].stability=Math.min(100,s.factions[to].stability+1);
 s.world.defections.unshift({id,from,to,year:s.year,month:s.month});s.world.defections=s.world.defections.slice(0,30);if(s.player===from||s.player===to)notify(s,`${CHARACTER_CATALOG[id].name[0]} changed allegiance in the simulation.`,`${CHARACTER_CATALOG[id].name[1]}在游戏中改变了政治立场。`);return true;
}
// Convert competing annual probabilities into a monthly chance while preserving their relative likelihood.
function monthlyOutcome(r,choices){const annual=choices.reduce((sum,choice)=>sum+choice[1],0);if(!annual)return null;const monthly=1-Math.pow(1-annual,1/12);if(r>=monthly)return null;let threshold=0;for(const [outcome,probability] of choices){threshold+=monthly*probability/annual;if(r<threshold)return outcome}return choices.at(-1)[0]}
export function advanceCharacters(s){initializeWorld(s);for(const [id,c] of Object.entries(s.world.characters)){if(!c.alive||!c.faction||c.missing)continue;const previous=c.health,age=ageRange(id,s.year)?.[0],illChance=illnessRisk(s,id),frailChance=age>=65?.025:0,choices={dying:[['deceased',.45]],seriously_ill:[['dying',.22],['recovering',.35]],healthy:[['frail',frailChance],['ill',illChance]],frail:[['seriously_ill',.08]],ill:[['seriously_ill',.22],['recovering',.55]],wounded:[['recovering',.55]],recovering:[['healthy',.75]]}[previous]||[];c.health=monthlyOutcome(rand(s),choices)||previous;
 if(s.month===1)c.loyalty=Math.max(0,Math.min(100,c.loyalty+(s.factions[c.faction]?.stability<35?-4:1)));
 if((previous==='healthy'&&c.health==='ill')||(previous==='frail'&&c.health==='seriously_ill'))c.illnessEpisodes++;
 if(c.health==='deceased'){c.alive=false;if(s.factions[c.faction])s.factions[c.faction].stability=Math.max(0,s.factions[c.faction].stability-3);const lead=s.world.leadership[c.faction]||[];if(lead.includes(id))assignSuccession(s,c.faction);for(const a of s.armies.filter(a=>a.characterId===id)){a.characterId=null;a.commander=['Unnamed officer','未具名军官']}if(c.faction===s.player)notify(s,`${CHARACTER_CATALOG[id].name[0]} died in the simulation; the succession situation was updated.`,`${CHARACTER_CATALOG[id].name[1]}在模拟中去世，继任局势已更新。`)}
 else {if(previous!==c.health&&c.faction===s.player)notify(s,`${CHARACTER_CATALOG[id].name[0]}: simulated health changed to ${c.health}.`,`${CHARACTER_CATALOG[id].name[1]}的游戏健康状态发生变化。`);if(s.month===1)considerDefection(s,id)}
 }if(s.month===1&&(s.world.leadership.egypt||[]).length>1&&rand(s)<(s.world.characters.cleopatra.loyalty<40?.18:.08))contestLeadership(s,'egypt','cleopatra');if(s.month===1&&s.world.characters.pacorus?.loyalty<40&&(s.factions.parthia?.stability<45||['seriously_ill','dying'].includes(s.world.characters.orodes?.health))&&!(s.world.claimants.parthia||[]).length&&rand(s)<.15)contestLeadership(s,'parthia','pacorus');}
export function battlefieldWound(s,a){initializeWorld(s);const c=s.world.characters[a.characterId];if(!c?.alive||!['healthy','recovering','frail','wounded'].includes(c.health))return;const risk=Math.min(.14,.07+((s.factions[a.owner]?.food??0)<0?.03:0)+Math.min(.04,c.wounds*.01));if(rand(s)<risk){c.health='wounded';c.wounds++;if(c.faction===s.player)notify(s,`${CHARACTER_CATALOG[c.id].name[0]} was wounded in battle (simulated).`,`${CHARACTER_CATALOG[c.id].name[1]}在游戏战斗中受伤。`)}}
export function commandFactor(s,a){const c=s.world?.characters?.[a.characterId];if(!c)return 1;const health=({healthy:1,recovering:.96,wounded:.9,ill:.9,frail:.88,seriously_ill:.8,dying:.7,deceased:.7}[c.health]||1),battles=Number.isFinite(c.battlesCommanded)?Math.max(0,c.battlesCommanded):0;return health*(1+Math.min(5,battles)*.02)}
export function linkCommanders(s){initializeWorld(s);for(const a of s.armies){if(a.characterId===undefined){a.characterId=a.id==='xiii'?'caesar':a.id==='pompey'?'pompey':null}const person=s.world.characters[a.characterId];if(person?.alive&&!person.missing)person.location=a.region}}

// A seriously ill person remains in their last theater, while an unnamed officer
// takes command. Do not announce an unseen foreign command change to the player.
export function relieveIncapacitatedCommanders(s){
 initializeWorld(s);for(const unit of s.armies){const person=s.world.characters[unit.characterId];if(!person)continue;const lost=!person.alive||person.health==='deceased'||!!person.missing,ill=['seriously_ill','dying'].includes(person.health);if(!lost&&!ill)continue;if(!lost)person.location=unit.region;unit.characterId=null;unit.commander=['Unnamed officer','未具名军官'];if(!lost&&unit.owner===s.player)notify(s,`${CHARACTER_CATALOG[person.id].name[0]} cannot command because of simulated illness; an unnamed officer takes over.`,`${CHARACTER_CATALOG[person.id].name[1]}因游戏中的重病无法指挥，暂由未具名军官接替。`)}
}

// A missing commander may re-establish contact after three months in the nearest
// controlled theater. This is a coarse game abstraction, not a precise escape route.
export function advanceMissingCommanders(s){
 initializeWorld(s);for(const person of Object.values(s.world.characters)){
  const missing=person.missing;if(!missing)continue;if(!person.alive){delete person.missing;continue}if(missing.capturedBy)continue;
  if(s.year===missing.year&&s.month===missing.month)continue;
  missing.remaining=Math.max(0,missing.remaining-1);if(missing.remaining)continue;
  const queue=[missing.origin],seen=new Set(queue);let destination=null;
  for(let i=0;i<queue.length;i++){const id=queue[i],r=s.regions.find(x=>x.id===id);if(r?.owner===person.faction){destination=r;break}for(const edge of ROUTES){const next=edge[0]===id?edge[1]:edge[1]===id?edge[0]:null;if(next&&!seen.has(next)){seen.add(next);queue.push(next)}}}
  if(!destination)continue;person.location=destination.id;delete person.missing;
  if(person.faction===s.player)notify(s,`${CHARACTER_CATALOG[person.id].name[0]} re-established contact in ${destination.name[0]}.`,`${CHARACTER_CATALOG[person.id].name[1]}在${destination.name[1]}重新取得联系。`);
 }
}

// Local reports update only at a controlled frontier; unseen reports remain stale.
export function observeArmies(s){
 initializeWorld(s);
 for(const viewer of Object.keys(s.knowledge)){
  const controlled=new Set(s.regions.filter(r=>r.owner===viewer).map(r=>r.id)),observed=new Set(controlled);
  for(const [a,b] of s.grandMap?GRAND_ROUTES:ROUTES){if(controlled.has(a))observed.add(b);if(controlled.has(b))observed.add(a)}
  const visible=place=>observed.has(place);
  // A visible former position can be checked without learning where the army
  // went or whether it survived. Preserve the dated report as historical evidence.
  for(const [owner,k] of Object.entries(s.knowledge[viewer]))for(const [id,old] of Object.entries(k.sightings||{})){
   if(!visible(old.region))continue;const unit=s.armies.find(a=>a.id===id);
   if(unit&&unit.region===old.region&&(unit.owner===owner||unit.move))continue;
   (k.sightingHistory||=[]).unshift({...old,checkedYear:s.year,checkedMonth:s.month});k.sightingHistory=k.sightingHistory.slice(0,30);delete k.sightings[id];
  }
  for(const unit of s.armies){if(unit.owner===viewer||unit.move||!s.knowledge[viewer]?.[unit.owner]||!visible(unit.region))continue;
   const k=s.knowledge[viewer][unit.owner],commanderId=CHARACTER_CATALOG[unit.characterId]?unit.characterId:null;k.sightings[unit.id]={id:unit.id,name:[...unit.name],owner:unit.owner,region:unit.region,year:s.year,month:s.month,commanderId};
   if(commanderId){k.commanderReports=(k.commanderReports||[]).filter(r=>r.commanderId!==commanderId||r.armyId!==unit.id);k.commanderReports.unshift({commanderId,armyId:unit.id,armyName:[...unit.name],year:s.year,month:s.month});k.commanderReports=k.commanderReports.slice(0,30)}
  }
 }
}
export function reportedArmies(s,viewer){initializeWorld(s);const result=[];for(const [owner,k] of Object.entries(s.knowledge[viewer]||{})){if(owner===viewer)continue;for(const x of Object.values(k.sightings||{}))result.push({...x,reported:true})}return result}
