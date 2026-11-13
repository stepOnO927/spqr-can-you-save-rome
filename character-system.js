import {CHARACTER_CATALOG,OPENING_LEADERS,initializeWorld,assignSuccession,ageRange} from './characters.js?v=separate-crowns-1';
import {settleInheritance,dynastyRoll} from './dynasties.js?v=regional-court-1';
import {FACTIONS,ROUTES} from './data.js?v=phase-x-1';
import {deriveGovernment,validSuccessionPlan} from './governance.js?v=regional-court-1';
import {potentialConspirators} from './conspiracies.js?v=separate-crowns-1';
import {knownDynasticFactions,startDynasticWar} from './civil-war.js?v=separate-crowns-1';
import {reportedControl} from './control-intelligence.js?v=fort-intel-1';
import {canHoldOffice,localGovernor} from './office-system.js?v=regional-court-1';
import {activeAgreement} from './agreements.js?v=grand-chessboard-2';
import {activeModifiers} from './inventions.js?v=mission-discount-1';
const names=(ids,lang)=>ids.map(id=>CHARACTER_CATALOG[id]?.name[lang]).filter(Boolean).join(lang?'、':', ');
// A visual impression is less precise than the historical birth estimate.
// Unknown birth dates remain unknown, rather than becoming invented ages.
export function apparentAgeRange(id,year){const age=ageRange(id,year);return age?[Math.max(0,Math.floor((age[0]-5)/5)*5),Math.ceil((age[1]+5)/5)*5]:null}
const claimantAvailable=c=>!!c?.alive&&!c.missing&&!c.travel&&!c.asylumHost&&!['seriously_ill','dying','deceased'].includes(c.health);
const rand=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const notify=(s,en,zh,metadata={})=>{s.log.unshift({year:s.year,month:s.month,en,zh,...metadata});s.log=s.log.slice(0,80)};
const healthNames={healthy:['healthy','健康'],recovering:['recovering','康复中'],wounded:['wounded','受伤'],frail:['frail','衰弱'],ill:['ill','患病'],seriously_ill:['seriously ill','重病'],dying:['dying','垂危'],deceased:['deceased','已故']};
const configs={spy:{cost:12,months:4},counter:{cost:8,months:3},envoy:{cost:8,months:3},travelers:{cost:4,months:2},audience:{cost:10,months:4},exchange:{cost:6,months:3}};
export const MISSION_RULES=configs;
// The active intelligence network reduces each investigation expense by one; never below one.
export function missionCost(s,actor,type){const cfg=configs[type];return cfg?Math.max(1,cfg.cost-(activeModifiers(s,actor).intelligence||0)):null}
// This is a theater-graph estimate, not a reconstruction of an actual ancient route.
export function missionDuration(s,actor,target,type){
 const cfg=configs[type];if(!cfg)return null;
 if(type!=='envoy'&&type!=='audience')return cfg.months;
 const starts=s.regions.filter(r=>r.owner===actor).map(r=>r.id),goals=new Set(s.regions.filter(r=>reportedControl(s,actor,r.id)?.owner===target).map(r=>r.id));
 if(!starts.length)return null;if(!goals.size)return cfg.months+2;
 const queue=starts.map(id=>[id,0]),seen=new Set(starts);let distance=null;
 for(let i=0;i<queue.length;i++){const [id,steps]=queue[i];if(goals.has(id)){distance=steps;break}for(const edge of ROUTES){const next=edge[0]===id?edge[1]:edge[1]===id?edge[0]:null;if(next&&!seen.has(next)){seen.add(next);queue.push([next,steps+1])}}}
 return cfg.months+(distance===null?2:distance>=5?2:distance>=3?1:0);
}
// A watch begins next month, so concurrent missions resolve independently of array order.
export function counterWatchRemaining(s,actor){
 const watch=s.world?.securityWatches?.[actor],now=s.year*12+s.month;if(!watch||!Number.isFinite(watch.start)||!Number.isFinite(watch.end)||now>watch.end)return 0;return Math.max(0,watch.end-Math.max(now,watch.start)+1);
}
function counterWatchActive(s,actor){const watch=s.world?.securityWatches?.[actor],now=s.year*12+s.month;return !!watch&&now>=watch.start&&now<=watch.end}
export function availableAgents(s,actor){initializeWorld(s);const held=s.world.captives.filter(c=>c.owner===actor&&c.state==='held').length,pending=s.operations.filter(o=>o.actor===actor&&['spy','counter'].includes(o.type)&&o.status==='pending').length;return Math.max(0,3-held-pending)}
export function requestAgentRelease(s,actor,captiveId){
 initializeWorld(s);const c=s.world.captives.find(x=>x.id===captiveId&&x.owner===actor&&x.state==='held');if(!c||!s.factions[actor]||!s.factions[c.holder])return {ok:false,reason:'unavailable'};
 if(s.releaseRequests.some(x=>x.captiveId===captiveId&&['pending','awaiting_decision','returning'].includes(x.status)))return {ok:false,reason:'pending'};if(s.factions[actor].treasury<8)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=8;
 if(actor===s.player||c.holder!==s.player){s.releaseRequests.unshift({actor,holder:c.holder,captiveId,remaining:4,status:'pending',year:s.year,month:s.month});if(actor===s.player)notify(s,'A release request was sent; a reply may take four months.','已寄出释放请求；回信可能需要四个月。')}
 else s.releaseRequests.unshift({actor,holder:c.holder,captiveId,remaining:2,status:'pending',phase:'outbound',year:s.year,month:s.month});
 return {ok:true};
}
// Only a letter that reached the player may be answered. The decision is not
// delivered, and an approved handover is not completed, until the return trip.
export function answerAgentRelease(s,captiveId,decision){
 initializeWorld(s);if(!['release','refuse'].includes(decision))return {ok:false,reason:'decision'};
 const r=s.releaseRequests.find(x=>x.captiveId===captiveId&&x.holder===s.player&&x.status==='awaiting_decision'),c=s.world.captives.find(x=>x.id===captiveId&&x.holder===s.player&&x.state==='held');if(!r||!c)return {ok:false,reason:'unavailable'};
 r.decision=decision;r.status='returning';r.phase='return';r.remaining=2;r.answeredYear=s.year;r.answeredMonth=s.month;
 notify(s,'Your answer has been sent; delivery and any handover may take two months.','答复已寄出；送达及可能的交接约需两个月。');return {ok:true};
}
export function advanceAgentRequests(s,{autoplayPlayer=false}={}){initializeWorld(s);for(const request of s.releaseRequests){
 if(request.status==='awaiting_decision'){
  if(autoplayPlayer&&request.holder===s.player){const war=s.wars.some(w=>w.includes(request.actor)&&w.includes(request.holder));answerAgentRelease(s,request.captiveId,war?'refuse':'release');continue}
  if(--request.remaining<=0){request.status='no_reply';request.phase='expired'}continue
 }
 if(!['pending','returning'].includes(request.status)||--request.remaining>0)continue;
 const c=s.world.captives.find(x=>x.id===request.captiveId),q=rand(s);
 if(request.phase==='outbound'){
  if(!c||c.state!=='held'||c.holder!==request.holder||q<.2){request.status='no_reply';request.phase='lost';continue}
  if(autoplayPlayer&&request.holder===s.player){const war=s.wars.some(w=>w.includes(request.actor)&&w.includes(request.holder));request.decision=q<(war?.65:.45)?'refuse':'release';request.status='returning';request.phase='return';request.remaining=2;request.answeredYear=s.year;request.answeredMonth=s.month;continue}
  request.status='awaiting_decision';request.phase='at_court';request.remaining=6;
  if(request.holder===s.player)notify(s,'A letter from '+(FACTIONS[request.actor]?.short[0]||'another faction')+' requests release of a detained agent.',(FACTIONS[request.actor]?.short[1]||'另一势力')+'来信请求释放被扣押的情报人员。');continue;
 }
 if(request.phase==='return'){
  if(!c||c.state!=='held'||c.holder!==request.holder||q<.2){request.status='no_reply';request.phase='lost';continue}
  request.status=request.decision==='release'?'released':'refused';request.phase='delivered';
  if(request.status==='released'){c.state='released';c.releasedYear=s.year;c.releasedMonth=s.month}continue;
 }
 const war=s.wars.some(w=>w.includes(request.actor)&&w.includes(request.holder));if(!c||c.state!=='held'||!s.regions.some(r=>r.owner===request.holder)||q<.2)request.status='no_reply';else if(q<(war?.65:.45))request.status='refused';else{request.status='released';c.state='released';c.releasedYear=s.year;c.releasedMonth=s.month}if(request.actor===s.player)notify(s,request.status==='released'?'The unnamed agent was released and is available again.':request.status==='refused'?'The court refused to release the agent.':'No response arrived; the correspondence may have been lost.',request.status==='released'?'未具名人员获释，情报人手恢复。':request.status==='refused'?'对方拒绝释放人员。':'未收到回信；书信可能遗失。');
}}
const sourceFamily=r=>{const source=r.originSource||r.source;return ({official:'court',envoy:'court',audience:'court',exchange:'unknown'}[source]||source||'unknown')};
const reportAge=(s,r)=>(s.year-(r.observationYear??r.year))*12+s.month-(r.observationMonth??r.month);
const knownReport=x=>['leaders','claimants'].includes(x.kind)?Array.isArray(x.leaders)&&x.leaders.length>0:x.value!=='unknown'&&x.value!=null;
const validStrengthRange=r=>r.kind==='strength'&&Array.isArray(r.range)&&r.range.length===2&&r.range.every(Number.isFinite)&&r.range[0]>=0&&r.range[0]<=r.range[1];
const strengthRange=r=>validStrengthRange(r)?r.range:Number.isFinite(r.value)?[r.value,r.value]:null;
const reportValue=x=>JSON.stringify((x.kind==='leaders'||x.kind==='claimants')?[...new Set(x.leaders||[])].sort():x.kind==='strength'&&validStrengthRange(x)?x.range:x.kind==='authority'&&x.value&&typeof x.value==='object'?{kind:x.value.kind,actors:[...new Set(x.value.actors||[])].sort()}:x.value);
// Partially overlapping age estimates are compatible, but do not independently verify the same range.
const evidenceRelation=(a,b)=>{if((a.observationYear??a.year)!==(b.observationYear??b.year)||(a.observationMonth??a.month)!==(b.observationMonth??b.month))return 'different_time';if(['leaders','claimants'].includes(a.kind)){const aa=new Set(a.leaders||[]),bb=new Set(b.leaders||[]),same=reportValue(a)===reportValue(b);if((a.exhaustive&&[...bb].some(id=>!aa.has(id)))||(b.exhaustive&&[...aa].some(id=>!bb.has(id))))return 'conflict';if(same&&(!a.exhaustive||b.exhaustive))return 'support';return 'compatible'}if(reportValue(a)===reportValue(b))return 'support';if(a.kind==='strength'){const aa=strengthRange(a),bb=strengthRange(b);if(aa&&bb&&Math.max(aa[0],bb[0])<=Math.min(aa[1],bb[1]))return 'compatible'}if(a.kind==='age'&&Array.isArray(a.value)&&Array.isArray(b.value)&&a.value.length===2&&b.value.length===2&&a.value.every(Number.isFinite)&&b.value.every(Number.isFinite)&&Math.max(a.value[0],b.value[0])<=Math.min(a.value[1],b.value[1]))return 'compatible';return 'conflict'};
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
 const leads=reports.flatMap(r=>['leaders','claimants'].includes(r.kind)?r.leaders||[]:['health','age','location','conspiracy'].includes(r.kind)?[r.character]:r.kind.startsWith('office_')?[r.value]:r.kind==='authority'&&r.value&&typeof r.value==='object'?r.value.actors||[]:[]);
 return [...new Set([...(knowledge?.reportedLeaders||[]),...reportedClaimants(s,actor,target),...Object.values(knowledge?.sightings||{}).map(x=>x.commanderId),...(knowledge?.commanderReports||[]).map(x=>x.commanderId),...leads].filter(id=>CHARACTER_CATALOG[id]))];
}
export function claimantRepresentatives(s,actor,claimant){
 initializeWorld(s);return Object.values(s.world.characters).filter(c=>c.faction===actor&&c.alive&&!c.missing&&!['seriously_ill','dying','deceased'].includes(c.health)&&CHARACTER_CATALOG[c.id]&&(s.world.personalRelations[[c.id,claimant].sort().join(':')]?.trust||0)>0).map(c=>c.id);
}
// A public policy records the player's choice, not the target court's true ruler.
export function recognizeClaimant(s,target,claimant){
 initializeWorld(s);const actor=s.player;if(!['caesar','senate'].includes(actor)||!['egypt','parthia'].includes(target)||!s.factions[actor]||!s.factions[target]||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unavailable'};
 const existing=s.world.recognitions[actor]?.[target];
 if(claimant==null){if(!existing)return {ok:false,reason:'unavailable'};delete s.world.recognitions[actor][target];notify(s,'Recognition of a reported claimant was withdrawn.','已撤回对报告中竞争者的承认。');return {ok:true,cost:0}}
 if(!reportedClaimants(s,actor,target).includes(claimant))return {ok:false,reason:'unavailable'};
 if(existing?.claimant===claimant)return {ok:false,reason:'already'};if(s.factions[actor].treasury<5)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=5;(s.world.recognitions[actor]||={})[target]={claimant,year:s.year,month:s.month};const key=[actor,target].sort().join(':');s.relations[key]=Math.max(-100,(s.relations[key]||0)-5);
 notify(s,'A reported claimant was recognized; relations with the court fell by up to 5.','已承认一位报告中的竞争者；与宫廷的关系最多降低5。');return {ok:true,cost:5};
}
export function supportClaimant(s,actor,target,claimant,representative=null,aid='political'){
 initializeWorld(s);if(!s.factions[actor]||actor==='rebels'||actor===target||!['egypt','parthia'].includes(target)||!reportedClaimants(s,actor,target).includes(claimant)||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unavailable'};
 if(!['political','military'].includes(aid))return {ok:false,reason:'aid'};
 if(representative&&!claimantRepresentatives(s,actor,claimant).includes(representative))return {ok:false,reason:'representative'};
 const cost=aid==='military'?{treasury:14,manpower:1000,food:5}:{treasury:10,manpower:0,food:0},f=s.factions[actor];
 if(s.operations.some(o=>o.actor===actor&&o.target===target&&o.type==='support'&&o.status==='pending'))return {ok:false,reason:'pending'};
 if(f.treasury<cost.treasury)return {ok:false,reason:'treasury'};if(f.manpower<cost.manpower)return {ok:false,reason:'manpower'};if(f.food<cost.food)return {ok:false,reason:'food'};
 f.treasury-=cost.treasury;f.manpower-=cost.manpower;f.food-=cost.food;s.operations.unshift({actor,target,type:'support',claimant,representative:representative||null,aid,remaining:4,status:'pending',sentYear:s.year,sentMonth:s.month});if(actor===s.player)notify(s,'An offer of support was sent; a response may take four months.','已寄出支持提议；回信可能需要四个月。');return {ok:true};
}
// The target list is based on the observer's reports, not current control.
export function reportedOfficeTheaters(s,actor,target){
 initializeWorld(s);const reports=s.knowledge[actor]?.[target]?.reports||[];return s.regions.filter(r=>reportedControl(s,actor,r.id)?.owner===target||reports.some(x=>x.kind==='office_theater:'+r.id)).map(r=>r.id);
}
// These are the actor's own alliances and agreements, not foreign secrets.
export function intelligencePartnerAccess(s,actor,partner){
 if((s.alliances||[]).some(p=>p.includes(actor)&&p.includes(partner)))return 'alliance';
 if(activeAgreement(s,actor,partner,'intelligence'))return 'intelligence';
 if(activeAgreement(s,actor,partner,'trade'))return 'trade';
 return null;
}
// The exchange screen and mission validation must offer the same partners.
export function intelligencePartners(s,actor,target){
 const alliances=(s.alliances||[]).filter(p=>p.includes(actor)).map(p=>p.find(id=>id!==actor));
 const partners=type=>(s.agreements||[]).filter(t=>t.type===type&&t.parties.includes(actor)).map(t=>t.parties.find(id=>id!==actor));
 return [...new Set([...alliances,...partners('intelligence'),...partners('trade')])].filter(id=>id&&id!==actor&&id!==target&&s.factions[id]&&FACTIONS[id]&&intelligencePartnerAccess(s,actor,id));
}
export function previewMission(s,actor,target,type,subject='health',partnerId=null,characterId=null){
 initializeWorld(s);const cfg=configs[type];if(!cfg||!s.factions[actor]||!FACTIONS[target]||(actor===target)!==(type==='counter')||target==='rebels'||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unavailable'};
 if(target.endsWith('_claimant')&&!knownDynasticFactions(s,actor).includes(target))return {ok:false,reason:'unavailable'};
 const theater=subject.startsWith('office_theater:')?subject.slice('office_theater:'.length):null;
 if(!theater&&!['health','age','location','leaders','authority','strength','claimants','stability','succession','conspiracy','contacts','relations','stance','clashes','office_finance','office_supply','office_administration','availability','counter_spies'].includes(subject))return {ok:false,reason:'subject'};
 if(theater&&!reportedOfficeTheaters(s,actor,target).includes(theater))return {ok:false,reason:'subject'};
 if(subject.startsWith('office_')&&(!['spy','exchange'].includes(type)||!['caesar','senate'].includes(target)))return {ok:false,reason:'subject'};
 if(subject==='location'&&!['spy','travelers','exchange'].includes(type))return {ok:false,reason:'subject'};
 if(subject==='clashes'&&(!['spy','travelers','exchange'].includes(type)||!['egypt','parthia'].includes(target)))return {ok:false,reason:'subject'};
 if(subject==='age'&&type!=='exchange')return {ok:false,reason:'subject'};
 if(subject==='availability'&&type!=='exchange')return {ok:false,reason:'subject'};
 if(subject==='relations'&&type!=='envoy')return {ok:false,reason:'subject'};
 if(subject==='stance'&&!['envoy','exchange'].includes(type))return {ok:false,reason:'subject'};
 if(subject==='contacts'&&(!['spy','exchange'].includes(type)||!['egypt','parthia'].includes(target)))return {ok:false,reason:'subject'};
 if(type==='counter'&&!['conspiracy','counter_spies'].includes(subject)||subject==='counter_spies'&&type!=='counter'||subject==='conspiracy'&&!['spy','counter','exchange'].includes(type))return {ok:false,reason:'subject'};
 if(type==='audience'&&subject!=='leaders')return {ok:false,reason:'subject'};
 if(['health','age','location'].includes(subject)&&characterId&&!reportedHealthSubjects(s,actor,target).includes(characterId))return {ok:false,reason:'identity'};
 const partners=intelligencePartners(s,actor,target);
 if(type==='exchange'&&(!partners.length||(partnerId&&!partners.includes(partnerId))))return {ok:false,reason:'alliance'};
 if(['spy','counter'].includes(type)&&!availableAgents(s,actor))return {ok:false,reason:'agents'};
 const cost=missionCost(s,actor,type);if(s.factions[actor].treasury<cost)return {ok:false,reason:'treasury'};
 if(s.operations.some(x=>x.actor===actor&&x.target===target&&x.status==='pending'&&x.type===type))return {ok:false,reason:'pending'};
 return {ok:true,cost,duration:missionDuration(s,actor,target,type),partner:type==='exchange'?(partnerId||partners[0]):undefined};
}
export function queueMission(s,actor,target,type,subject='health',partnerId=null,characterId=null){
 const plan=previewMission(s,actor,target,type,subject,partnerId,characterId);if(!plan.ok)return plan;
 const {duration,partner,cost}=plan,subjectCharacter=['health','age','location'].includes(subject)?(characterId===''?null:(characterId||(['health','location'].includes(subject)&&type!=='exchange'?reportedHealthSubjects(s,actor,target)[0]:null)||null)):null;
 s.factions[actor].treasury-=cost;s.operations.unshift({actor,target,type,subject,...(partner?{partner}:{}),...(target.endsWith('_claimant')&&type!=='exchange'?{targetGeneration:s.world.dynasticGenerations?.[target]||0}:{}),subjectCharacter,remaining:duration,duration,status:'pending',sentYear:s.year,sentMonth:s.month});
 if(actor===s.player)notify(s,`${type} mission dispatched; estimated ${duration} months.`,`已派出${({spy:'间谍',counter:'内部调查',envoy:'使者',travelers:'商旅',audience:'会面请求',exchange:'情报交换'})[type]}，预计${duration}个月。`);return {ok:true,duration};
}
// The ally selects its own record when the request reaches it. The sealed
// response stays out of the recipient's knowledge until the return journey.
function prepareExchange(s,op){
 const partner=op.partner,access=intelligencePartnerAccess(s,op.actor,partner);
 const prior=s.knowledge[partner]?.[op.target]?.reports.find(r=>r.kind===op.subject&&(!op.subjectCharacter||r.character===op.subjectCharacter));
 if(!access)return {available:false};
 // Trade is contact, not an obligation to share secrets. The recipient's own
 // relations influence its independent response; the sender learns only the
 // reply if it survives the return journey, never the reason or hidden report.
 if(access==='trade'){
  const relation=s.relations[[partner,op.actor].sort().join(':')]||0;
  const refusal=Math.max(.2,Math.min(.65,.5-relation*.003));
  if(rand(s)<refusal)return {available:false,declined:true};
 }
 if(!prior)return {available:false};
 return {available:true,report:{kind:prior.kind,character:prior.character,value:Array.isArray(prior.value)?[...prior.value]:prior.kind==='authority'&&prior.value&&typeof prior.value==='object'?{...prior.value,actors:[...(prior.value.actors||[])]}:prior.value,leaders:prior.leaders?[...prior.leaders]:undefined,range:validStrengthRange(prior)?[...prior.range]:undefined,exhaustive:prior.exhaustive===true,source:'exchange',originSource:sourceFamily(prior),fromFaction:partner,observationYear:prior.observationYear??prior.year,observationMonth:prior.observationMonth??prior.month,confidence:prior.confidence==='disputed'?'disputed':prior.confidence==='rumor'?'rumor':'unverified',reliability:prior.reliability||'unknown'}};
}
export function advanceOperations(s){initializeWorld(s);for(const op of s.operations){if(op.status!=='pending')continue;op.remaining--;
 if(op.type==='exchange'&&!op.exchangeSealed&&op.remaining<=Math.floor((op.duration||configs.exchange.months)/2))op.exchangeSealed=prepareExchange(s,op);
 if(op.remaining>0)continue;const q=rand(s),id=(s.world.leadership[op.target]||[])[0],person=s.world.characters[id];
 // The resolution date is visible to the sender, but not the hidden cause of a failed mission.
 op.resolvedYear=s.year;op.resolvedMonth=s.month;
 if(op.type==='support'){
  const claimant=s.world.characters[op.claimant],rival=s.world.disputes[op.target]?.war?.rival,valid=(s.regions.some(r=>r.owner===op.target||r.owner===rival)||s.armies.some(a=>a.owner===rival&&a.men>0))&&claimantAvailable(claimant)&&(s.world.claimants[op.target]||[]).includes(op.claimant);
  const representative=op.representative&&claimantRepresentatives(s,op.actor,op.claimant).includes(op.representative)?op.representative:null,trust=representative?(s.world.personalRelations[[representative,op.claimant].sort().join(':')]?.trust||0):0,recognized=s.world.recognitions?.[op.actor]?.[op.target]?.claimant===op.claimant,declineLimit=Math.max(.25,.45-Math.min(100,trust)*.002-(recognized ? 0.05 : 0));
  if(!valid||q<.2)op.status='no_reply';else if(q<declineLimit)op.status='declined';else{op.status='complete';const dispute=s.world.disputes[op.target]||={months:0};dispute.support||={};dispute.support[op.claimant]=Math.min(30,(dispute.support[op.claimant]||0)+(op.aid==='military'?25:15));if(op.aid==='military'){const war=dispute.war,atWar=war?.claimant===op.claimant&&s.factions[war.rival];if(atWar){const unit=s.armies.find(a=>a.owner===war.rival&&a.characterId===op.claimant&&a.men>0)||s.armies.find(a=>a.owner===war.rival&&a.men>0);if(unit)unit.men+=1000;else s.factions[war.rival].manpower+=1000}else{dispute.militaryAid||={};dispute.militaryAid[op.claimant]=(dispute.militaryAid[op.claimant]||0)+1000}}const key=[op.actor,op.target].sort().join(':');s.relations[key]=Math.max(-100,(s.relations[key]||0)-(op.aid==='military'?15:10))}
  op.resolvedYear=s.year;op.resolvedMonth=s.month;
  if(op.actor===s.player)notify(s,op.status==='complete'?'The claimant accepted support; relations with the court worsened.':op.status==='declined'?'The claimant declined the offer.':'No reply arrived; the offer or response may have been lost.',op.status==='complete'?'竞争者接受支持；与宫廷的关系恶化。':op.status==='declined'?'竞争者拒绝了提议。':'未收到回信；提议或回信可能遗失。');continue
 }
 // An exchange asks an ally for its own existing records; it does not visit
 // the target court, whose hidden territorial status cannot decide success.
 const replacedCourt=op.target.endsWith('_claimant')&&(op.targetGeneration??0)!==(s.world.dynasticGenerations?.[op.target]||0);
 if((op.type!=='exchange'&&(!s.regions.some(r=>r.owner===op.target)||replacedCourt))||q<.18){op.status='failed';delete op.exchangeSealed;if(op.actor===s.player)notify(s,'The intelligence mission ended without a report; the reason is unknown.','情报行动结束，未收到报告；原因不明。');continue}
 if(op.type==='counter'&&op.subject==='counter_spies'){const now=s.year*12+s.month;(s.world.securityWatches||={})[op.actor]={start:now+1,end:now+6};op.status='complete';if(op.actor===s.player)notify(s,'A counterintelligence watch will operate for the next six months.','反间谍警戒将在接下来的六个月运行。');continue}
 const watch=op.type==='spy'&&counterWatchActive(s,op.target),captureLimit=watch?.36:.24,discoveryLimit=watch?.52:.33;
 if(op.type==='spy'&&q<discoveryLimit){op.status=q<captureLimit?'captured':'detected';if(op.status==='captured'){op.captiveId='captive'+s.world.nextCaptive++;s.world.captives.push({id:op.captiveId,owner:op.actor,holder:op.target,state:'held',year:s.year,month:s.month})}const k=[op.actor,op.target].sort().join(':');s.relations[k]=(s.relations[k]||0)-10;if(op.actor===s.player||op.target===s.player)notify(s,op.status==='captured'?`A spy from ${FACTIONS[op.actor].short[0]} was captured by ${FACTIONS[op.target].short[0]}.`:`A spy from ${FACTIONS[op.actor].short[0]} was detected by ${FACTIONS[op.target].short[0]}.`,op.status==='captured'?`${FACTIONS[op.actor].short[1]}的间谍被${FACTIONS[op.target].short[1]}抓获，双方关系恶化。`:`${FACTIONS[op.actor].short[1]}的间谍被${FACTIONS[op.target].short[1]}发现，双方关系恶化。`);continue}
 const relation=s.relations[[op.actor,op.target].sort().join(':')]||0,atWar=s.wars.some(w=>w.includes(op.actor)&&w.includes(op.target));
 const refusal=Math.max(.23,Math.min(.70,.38-relation*.0015+(atWar?.18:0)+(s.factions[op.target]?.stability<35?.08:0)));
 if((op.type==='audience'||op.type==='envoy')&&q<refusal){op.status='declined';if(op.actor===s.player)notify(s,'The court declined the envoy or audience request.','宫廷拒绝了使者或会面请求。');continue}
 if(op.type==='envoy'&&op.subject==='relations'){
  // A diplomatic reception changes relations at arrival; it produces no secret intelligence.
  const key=[op.actor,op.target].sort().join(':');s.relations[key]=Math.min(100,relation+8);op.status='complete';
  if(op.actor===s.player)notify(s,'The envoy was received and relations improved by up to 8.','使者获接待，双方关系最多提高8。');continue
 }
 if(op.type==='exchange'){
  const sealed=op.exchangeSealed;delete op.exchangeSealed;
  if(sealed?.declined){op.status='declined';if(op.actor===s.player)notify(s,'The trading partner declined the request for information.','贸易伙伴拒绝了情报请求。');continue}
  if(!sealed?.available){op.status='failed';if(op.actor===s.player)notify(s,'The intelligence exchange ended without a report; the reason is unknown.','情报交换结束，未收到报告；原因不明。');continue}
  addReport(s,op.actor,op.target,sealed.report);op.status='complete';if(op.actor===s.player)notify(s,'A partner forwarded an existing report; its original date and source still matter.','伙伴转交了一份既有报告；仍需留意原始日期与来源。');continue
 }
 let healthId=Object.hasOwn(op,'subjectCharacter')?op.subjectCharacter:(reportedHealthSubjects(s,op.actor,op.target)[0]||null);
 // A general health or location investigation can encounter a public figure
 // even when the sender had no name to address. Discover the name only during
 // resolution, through a successful local observation; absence is not proof of
 // a vacancy or of anyone's health. A named request never changes its target.
 if(!healthId&&['health','location'].includes(op.subject)&&q>=(op.type==='travelers'?.85:.7)){
  const known=new Set(reportedHealthSubjects(s,op.actor,op.target));
  const candidates=(s.world.leadership[op.target]||[]).filter(candidate=>{const c=s.world.characters[candidate];return CHARACTER_CATALOG[candidate]&&c?.alive&&!c.missing&&!c.travel&&!['seriously_ill','dying','deceased'].includes(c.health)&&s.regions.some(r=>r.id===c.location&&r.owner===op.target)&&!s.armies.some(a=>a.characterId===candidate&&a.move)});
  healthId=candidates.find(candidate=>!known.has(candidate))||candidates[0]||null;
 }
 const healthCandidate=s.world.characters[healthId];
 // A lead can be stale or wrong. Investigating a court must not read the live
 // health of someone who has left it, or whose whereabouts are unknown.
 // Return the same uninformative report instead of disclosing the hidden reason.
 const healthPerson=healthCandidate?.faction===op.target&&!healthCandidate.missing?healthCandidate:null;
 const localDeath=healthPerson&&!healthPerson.alive&&healthPerson.health==='deceased'&&!healthPerson.travel&&s.regions.some(r=>r.id===healthPerson.location&&r.owner===op.target)&&!s.armies.some(a=>a.characterId===healthId&&a.move);
 const locallyObservable=!!(healthPerson?.alive&&!healthPerson.travel&&s.regions.some(r=>r.id===healthPerson.location&&r.owner===op.target)&&!s.armies.some(a=>a.characterId===healthId&&a.move));
 op.status='complete';const source=op.type,low=op.type==='travelers',hostile=s.wars.some(w=>w.includes(op.actor)&&w.includes(op.target)),contested=(s.world.claimants[op.target]||[]).length>0,investigated=op.subject==='health'?healthPerson:person,concealment=hostile||contested||investigated?.health==='seriously_ill'||investigated?.health==='dying',falsehood=q<.45&&concealment;let report;
 if(op.subject.startsWith('office_')){
  // Only successful spies can inspect an assignment. No name is a lack of
  // evidence, not proof of a vacancy. Wartime deception may reuse an old lead.
  const office=op.subject.slice('office_'.length),theater=office.startsWith('theater:')?office.slice('theater:'.length):null,post=theater?s.world.localGovernors?.[theater]:null,personId=theater?(post?.faction===op.target?localGovernor(s,theater):null):s.world.offices?.[op.target]?.[office],prior=(s.knowledge[op.actor]?.[op.target]?.reports||[]).find(r=>r.kind===op.subject&&CHARACTER_CATALOG[r.value]);
  const value=falsehood?(prior?.value||'unknown'):q>=.55&&CHARACTER_CATALOG[personId]&&canHoldOffice(s,op.target,personId)?personId:'unknown';
  report={kind:op.subject,value,source,confidence:'unverified',reliability:'moderate'};
 }
 else if(op.subject==='clashes'){
  // No report is not evidence of peace. Rumors may be false in a contested court.
  const recent=!!s.world.disputes[op.target]?.war||s.world.disputeHistory.some(event=>event.faction===op.target&&['clashes','civil_war'].includes(event.outcome)&&(s.year-event.year)*12+s.month-event.month>=0&&(s.year-event.year)*12+s.month-event.month<=12);
  const reported=recent&&q>=.55||contested&&!recent&&q<.45;
  report={kind:'clashes',value:reported?'reported':'unknown',source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};
 }
 else if(op.subject==='contacts'){
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
 else if(op.subject==='stance'){
  // This is a reported public statement, not access to another faction's plans.
  const value=hostile?'guarded':relation>=30?'receptive':relation<0?'guarded':'noncommittal';
  report={kind:'stance',value,source,confidence:'unverified',reliability:'moderate'};
 }
 else if(op.subject==='location'){
  // Never follow an unseen person after the observation. An agent may find an
  // available person in this court's territory; travelers may only hear a rumor.
  const p=healthPerson,local=p?.alive&&!p.travel&&!s.armies.some(a=>a.characterId===healthId&&a.move)&&s.regions.some(r=>r.id===p.location&&r.owner===op.target);
  const old=(s.knowledge[op.actor]?.[op.target]?.reports||[]).find(r=>r.kind==='location'&&r.character===healthId&&s.regions.some(region=>region.id===r.value));
  const value=falsehood&&old?old.value:local&&q>=(low?.8:.55)?p.location:'unknown';
  report={kind:'location',character:healthId||null,value,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};
 }
 else if(op.subject==='health'){
  let value='unknown';
  // A rival in a succession dispute can spread a death rumor about a known
  // person. It does not depend on their actual health, faction, or location.
  const rumoredDeath=!!(contested&&healthId&&(low||op.type==='spy')&&q>=.34&&q<.40);
  if(rumoredDeath)value='deceased';
  else if(healthPerson&&low){
   // Travelers hear rumors or glimpse a person in a court-controlled theater;
   // they do not get a precise diagnosis or private health state for free.
   const visible=locallyObservable;
   if((hostile||contested)&&q<.45)value='healthy'; // propaganda does not depend on hidden health
   else if(contested&&q<.55)value='ill';
   else if(visible&&falsehood)value='healthy'; // politically motivated rumor
   else if(visible&&q>=.65&&['wounded','frail'].includes(healthPerson.health))value=healthPerson.health;
   else if(visible&&q>=.85&&['ill','seriously_ill','dying'].includes(healthPerson.health))value='ill';
   else if(localDeath&&q>=.85)value='deceased';
  }else if(locallyObservable)value=falsehood?'healthy':healthPerson.health;
  else if(localDeath&&q>=.6)value='deceased';
  // Retellings of the same circulating rumor are not independent evidence.
  report={kind:'health',character:healthId||null,value,source,originSource:rumoredDeath?'travelers':undefined,confidence:low||rumoredDeath?'rumor':'unverified',reliability:low||rumoredDeath?'low':'moderate'};
 }
 else if(op.subject==='claimants'){const candidates=falsehood?[]:[...(s.world.claimants[op.target]||[])];report={kind:'claimants',leaders:candidates,exhaustive:op.type==='spy'&&q>=.7,source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};}
 else if(op.subject==='strength'){
  // A rounded estimate is not exact reconnaissance: each source has a different
  // error, and even its stated interval is not a guarantee of the actual total.
  const actual=s.armies.filter(a=>a.owner===op.target).reduce((x,a)=>x+a.men,0),error=low ? 0.5 : op.type==='spy' ? 0.18 : 0.3,baseline=(falsehood?actual*.65:actual),sample=Math.max(1000,baseline)*(1+(rand(s)*2-1)*error),estimate=Math.max(0,Math.round(sample/1000)*1000),margin=Math.max(1000,Math.ceil(estimate*error/1000)*1000);
  report={kind:'strength',value:estimate,range:[Math.max(0,estimate-margin),estimate+margin],source,confidence:low?'rumor':'unverified',reliability:low?'low':'moderate'};
 }
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
  const planned=validSuccessionPlan(s,op.target);
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
  const met=(report.leaders||[]).find(candidate=>{const p=s.world.characters[candidate];return (s.world.leadership[op.target]||[]).includes(candidate)&&p?.alive&&p.faction===op.target&&!p.travel&&!p.missing&&s.regions.some(r=>r.id===p.location&&r.owner===op.target)&&!s.armies.some(a=>a.characterId===candidate&&a.move)&&!['seriously_ill','dying','deceased'].includes(p.health)});
  if(met){const p=s.world.characters[met],visible=['wounded','frail'].includes(p.health)?p.health:'unknown',age=apparentAgeRange(met,s.year);
   addReport(s,op.actor,op.target,{kind:'location',character:met,value:p.location,source:'audience',confidence:'unverified',reliability:'moderate'});
   addReport(s,op.actor,op.target,{kind:'health',character:met,value:visible,source:'audience',confidence:'unverified',reliability:'low'});
   if(age)addReport(s,op.actor,op.target,{kind:'age',character:met,value:age,source:'audience',confidence:'unverified',reliability:'low'});
  }
 }
 addReport(s,op.actor,op.target,report);if(op.actor===s.player)notify(s,`An intelligence report from ${FACTIONS[op.target].short[0]} has arrived.`,`一份来自${FACTIONS[op.target].short[1]}的情报报告已送达。`);
}}
export function contestLeadership(s,faction,claimant){
 initializeWorld(s);const leaders=s.world.leadership[faction]||[],person=s.world.characters[claimant],existing=s.world.claimants[faction]||[];
 const coRuler=faction==='egypt'&&leaders.length>1&&leaders.includes(claimant),egyptianRival=faction==='egypt'&&claimant==='arsinoe'&&leaders.length>0&&!leaders.includes(claimant)&&s.factions.egypt?.stability<45&&(person?.loyalty<55||existing.length>0),parthia=faction==='parthia'&&claimant==='pacorus'&&leaders.includes('orodes')&&!leaders.includes(claimant)&&person?.loyalty<40;
 if((!coRuler&&!egyptianRival&&!parthia)||!s.regions.some(r=>r.owner===faction)||!claimantAvailable(person)||person.faction!==faction||existing.includes(claimant))return false;
 if(coRuler)s.world.leadership[faction]=leaders.filter(id=>id!==claimant);(s.world.claimants[faction]||=[]).push(claimant);s.world.disputes[faction]||={months:0};if(s.factions[faction])s.factions[faction].stability=Math.max(0,s.factions[faction].stability-5);if(faction===s.player)notify(s,'A leadership dispute has created a rival claimant.','执政权争议产生了一位竞争者。');return true;
}

// Alternate-history court outcomes use existing characters and never update a foreign observer's reports directly.
export function advanceDisputes(s){initializeWorld(s);for(const faction of ['egypt','parthia',...['caesar','senate'].filter(id=>['roman_principate','later_empire'].includes(s.world.romanRegimes?.[id]))])advanceFactionDispute(s,faction)}
// Accepted military backing remains part of the simulated force pool if a
// claimant reaches a settlement or office without forming a field army.
function settleClaimantBacking(s,faction,dispute,claimant){
 const reserve=Math.max(0,Number.isFinite(dispute.militaryAid?.[claimant])?dispute.militaryAid[claimant]:0);if(reserve)s.factions[faction].manpower+=reserve;
 if(dispute.militaryAid)delete dispute.militaryAid[claimant];if(dispute.support)delete dispute.support[claimant];
}
function advanceFactionDispute(s,faction){
 if(s.world.disputes[faction]?.war)return;
 const leaders=s.world.leadership[faction]||[],previousClaimants=s.world.claimants[faction]||[],claimants=previousClaimants.filter(id=>s.world.characters[id]?.alive&&s.world.characters[id].faction===faction&&!leaders.includes(id));s.world.claimants[faction]=claimants;
 const controlsLand=s.regions.some(r=>r.owner===faction),previousDispute=s.world.disputes[faction];
 // A deceased claimant's accepted reserve returns to the surviving court;
 // do not discard another living claimant's backing while pruning the list.
 if(controlsLand&&s.factions[faction]&&previousDispute)for(const id of previousClaimants)if(s.world.characters[id]&&!s.world.characters[id].alive)settleClaimantBacking(s,faction,previousDispute,id);
 if(!claimants.length||!controlsLand){delete s.world.disputes[faction];if(previousDispute&&!claimants.length&&controlsLand&&!leaders.length)assignSuccession(s,faction);return}
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
  if(candidate&&rand(s)<Math.min(.8,.5+(dispute.support?.[candidate]||0)/100)){s.world.leadership[faction]=[candidate];s.world.claimants[faction]=claimants.filter(id=>id!==candidate);s.factions[faction].stability=Math.max(0,s.factions[faction].stability-2);s.world.disputeHistory.unshift({faction,claimant:candidate,outcome:'succession',year:s.year,month:s.month});s.world.disputeHistory=s.world.disputeHistory.slice(0,30);settleClaimantBacking(s,faction,dispute,candidate);if(!s.world.claimants[faction].length)delete s.world.disputes[faction];else delete dispute.vacancySince;if(faction===s.player)notify(s,'A claimant established authority after the simulated succession dispute.','一位竞争者在游戏继承争议后确立了执政权。')}
  return
 }
 const eligible=claimants.filter(id=>claimantAvailable(s.world.characters[id]));if(!eligible.length)return;const index=(Number.isInteger(dispute.nextClaimant)?dispute.nextClaimant:0)%eligible.length,claimant=eligible[index];dispute.nextClaimant=(index+1)%eligible.length;const person=s.world.characters[claimant];const stability=s.factions[faction].stability,support=dispute.support?.[claimant]||0,q=rand(s);let outcome;
 if(stability>=45&&person.loyalty>=55&&support===0&&q<.12){s.world.leadership[faction]=faction==='egypt'&&['cleopatra','ptolemy'].includes(claimant)?[...leaders,claimant]:leaders;s.world.claimants[faction]=claimants.filter(id=>id!==claimant);s.factions[faction].stability=Math.min(100,stability+2);outcome='reconciliation';settleClaimantBacking(s,faction,dispute,claimant);if(!s.world.claimants[faction].length)delete s.world.disputes[faction]}
 else if(q<(stability<45?.22:.08)+support/100){s.world.leadership[faction]=[claimant];s.world.claimants[faction]=[...new Set([...claimants.filter(id=>id!==claimant),...leaders.filter(id=>s.world.characters[id]?.alive)])];s.factions[faction].stability=Math.max(0,stability-4);outcome='takeover';settleClaimantBacking(s,faction,dispute,claimant)}
 else if(dispute.duration>=6&&stability<45&&q>=.6){
  // Local clashes are an abstract consequence, not a fabricated separate army
  // or a claim about historical events. Losses apply only to forces at home.
  const army=s.armies.find(a=>a.owner===faction&&a.men>0&&!a.move&&s.regions.some(r=>r.id===a.region&&r.owner===faction));
  if(army)army.men=Math.max(0,army.men-Math.min(300,Math.ceil(army.men*.05)));
  s.factions[faction].manpower=Math.max(0,s.factions[faction].manpower-300);s.factions[faction].food=Math.max(-100,s.factions[faction].food-3);s.factions[faction].stability=Math.max(0,stability-2);outcome='clashes';
  if(dispute.duration>=12)startDynasticWar(s,faction,claimant);
 }
 if(outcome){s.world.disputeHistory.unshift({faction,claimant,outcome,year:s.year,month:s.month});s.world.disputeHistory=s.world.disputeHistory.slice(0,30);if(faction===s.player)notify(s,outcome==='reconciliation'?(faction==='egypt'?'A simulated court settlement restored joint rule.':'A simulated settlement ended the dynastic challenge.'):'A simulated court struggle changed the ruling authority.',outcome==='reconciliation'?(faction==='egypt'?'游戏中的宫廷和解恢复了共同统治。':'游戏中的宫廷和解结束了王朝挑战。'):'游戏中的宫廷斗争改变了执政者。')}
}
// Select from both existing co-rulers; lower loyalty adds weight without
// guaranteeing an outcome. A minor represents a faction at court.
export function egyptianClaimantCandidate(s,roll){
 const leaders=s.world.leadership?.egypt||[],candidates=['cleopatra','ptolemy'].filter(id=>leaders.includes(id)&&claimantAvailable(s.world.characters[id]));
 if(leaders.length<2||!candidates.length)return null;const weights=candidates.map(id=>Math.max(1,101-(s.world.characters[id].loyalty??75))),total=weights.reduce((a,b)=>a+b,0);let value=Math.max(0,Math.min(.999999,roll))*total;for(let i=0;i<candidates.length;i++){value-=weights[i];if(value<0)return candidates[i]}return candidates.at(-1);
}
// Simulation probabilities only; these do not assert historical diagnoses.
export function illnessRisk(s,id){initializeWorld(s);const c=s.world.characters[id];if(!c)return 0;const age=ageRange(id,s.year)?.[0],military=s.armies.some(a=>a.characterId===id),shortage=(s.factions[c.faction]?.food??0)<0;return Math.min(.18,(age>=65?.04:.018)+(military?.01:0)+(shortage?.025:0)+(c.travel?.01:0)+Math.min(.02,c.wounds*.01))}
// Alternate-history defection is restricted to unattached Roman officers, never fabricated identities.
export function considerDefection(s,id){
 initializeWorld(s);const c=s.world.characters[id],from=c?.faction,to=from==='caesar'?'senate':from==='senate'?'caesar':null;
 if(!to||!c.alive||c.missing||c.loyalty>20||['seriously_ill','dying','deceased'].includes(c.health)||(s.world.leadership[from]||[]).includes(id)||s.armies.some(a=>a.characterId===id)||!s.regions.some(r=>r.owner===to)||!s.wars.some(w=>w.includes(from)&&w.includes(to)))return false;
 if((CHARACTER_CATALOG[id]?.fictional?dynastyRoll(s):rand(s))>=.18)return false;c.faction=to;c.loyalty=45;delete c.travel;s.factions[from].stability=Math.max(0,s.factions[from].stability-2);s.factions[to].stability=Math.min(100,s.factions[to].stability+1);
 s.world.defections.unshift({id,from,to,year:s.year,month:s.month});s.world.defections=s.world.defections.slice(0,30);if(s.player===from||s.player===to)notify(s,`${CHARACTER_CATALOG[id].name[0]} changed allegiance in the simulation.`,`${CHARACTER_CATALOG[id].name[1]}在游戏中改变了政治立场。`);return true;
}
// Convert competing annual probabilities into a monthly chance while preserving their relative likelihood.
function monthlyOutcome(r,choices){const annual=choices.reduce((sum,choice)=>sum+choice[1],0);if(!annual)return null;const monthly=1-Math.pow(1-annual,1/12);if(r>=monthly)return null;let threshold=0;for(const [outcome,probability] of choices){threshold+=monthly*probability/annual;if(r<threshold)return outcome}return choices.at(-1)[0]}
export function advanceCharacters(s){initializeWorld(s);for(const [id,c] of Object.entries(s.world.characters)){if(!c.alive||!c.faction||c.missing)continue;const previous=c.health,age=ageRange(id,s.year)?.[0],illChance=illnessRisk(s,id),frailChance=age>=65?.025:0,choices={dying:[['deceased',.45]],seriously_ill:[['dying',.22],['recovering',.35]],healthy:[['frail',frailChance],['ill',illChance]],frail:[['seriously_ill',.08]],ill:[['seriously_ill',.22],['recovering',.55]],wounded:[['recovering',.55]],recovering:[['healthy',.75]]}[previous]||[];c.health=monthlyOutcome(CHARACTER_CATALOG[id]?.fictional?dynastyRoll(s):rand(s),choices)||previous;
 if(s.month===1)c.loyalty=Math.max(0,Math.min(100,c.loyalty+(s.factions[c.faction]?.stability<35?-4:1)));
 if((previous==='healthy'&&c.health==='ill')||(previous==='frail'&&c.health==='seriously_ill'))c.illnessEpisodes++;
 if(c.health==='deceased'){c.alive=false;c.deathYear=s.year;c.deathMonth=s.month;settleInheritance(s,id);if(s.factions[c.faction])s.factions[c.faction].stability=Math.max(0,s.factions[c.faction].stability-3);const lead=s.world.leadership[c.faction]||[];if(lead.includes(id))assignSuccession(s,c.faction);for(const a of s.armies.filter(a=>a.characterId===id)){a.characterId=null;a.commander=['Unnamed officer','未具名军官']}if(c.faction===s.player)notify(s,`${CHARACTER_CATALOG[id].name[0]} died in the simulation; the succession situation was updated.`,`${CHARACTER_CATALOG[id].name[1]}在模拟中去世，继任局势已更新。`)}
 else {if(previous!==c.health&&c.faction===s.player){const from=healthNames[previous]||['unknown','未知'],to=healthNames[c.health]||['unknown','未知'];notify(s,`${CHARACTER_CATALOG[id].name[0]}: simulated health changed from ${from[0]} to ${to[0]}.`,`${CHARACTER_CATALOG[id].name[1]}的游戏健康状态发生变化：${from[1]} → ${to[1]}。`,{characterId:id})}if(s.month===1)considerDefection(s,id)}
 }if(s.month===1&&(s.world.leadership.egypt||[]).length>1){const candidate=egyptianClaimantCandidate(s,rand(s));if(candidate&&rand(s)<(s.world.characters[candidate].loyalty<40?.18:.08))contestLeadership(s,'egypt',candidate)}if(s.month===1&&s.factions.egypt?.stability<45&&((s.world.characters.arsinoe?.loyalty??100)<55||(s.world.claimants.egypt||[]).length>0)&&rand(s)<.12)contestLeadership(s,'egypt','arsinoe');if(s.month===1&&s.world.characters.pacorus?.loyalty<40&&(s.factions.parthia?.stability<45||['seriously_ill','dying'].includes(s.world.characters.orodes?.health))&&!(s.world.claimants.parthia||[]).length&&rand(s)<.15)contestLeadership(s,'parthia','pacorus');}
export function battlefieldWound(s,a){initializeWorld(s);const c=s.world.characters[a.characterId];if(!c?.alive||!['healthy','recovering','frail','wounded'].includes(c.health))return;const risk=Math.min(.14,.07+((s.factions[a.owner]?.food??0)<0?.03:0)+Math.min(.04,c.wounds*.01));if((CHARACTER_CATALOG[c.id]?.fictional?dynastyRoll(s):rand(s))<risk){c.health='wounded';c.wounds++;if(c.faction===s.player)notify(s,`${CHARACTER_CATALOG[c.id].name[0]} was wounded in battle (simulated).`,`${CHARACTER_CATALOG[c.id].name[1]}在游戏战斗中受伤。`,{characterId:c.id})}}
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
  const missing=person.missing;if(!missing)continue;if(!person.alive){delete person.missing;continue}
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
  for(const [a,b] of ROUTES){if(controlled.has(a))observed.add(b);if(controlled.has(b))observed.add(a)}
  const visible=place=>observed.has(place);
  // A visible former position can be checked without learning where the army
  // went or whether it survived. Preserve the dated report as historical evidence.
  for(const [owner,k] of Object.entries(s.knowledge[viewer]))for(const [id,old] of Object.entries(k.sightings||{})){
   if(!visible(old.region))continue;const unit=s.armies.find(a=>a.id===id);
   if(unit&&unit.region===old.region&&(unit.owner===owner||unit.move))continue;
   (k.sightingHistory||=[]).unshift({...old,checkedYear:s.year,checkedMonth:s.month});k.sightingHistory=k.sightingHistory.slice(0,30);delete k.sightings[id];
  }
  for(const unit of s.armies){if(unit.owner===viewer||unit.move||!s.knowledge[viewer]?.[unit.owner]||!visible(unit.region))continue;
   const k=s.knowledge[viewer][unit.owner],commanderId=CHARACTER_CATALOG[unit.characterId]?unit.characterId:null;k.sightings[unit.id]={id:unit.id,name:[...unit.name],owner:unit.owner,region:unit.region,year:s.year,month:s.month,commanderId,strengthBand:[Math.max(0,Math.floor(unit.men*.7/1000)*1000),Math.max(1000,Math.ceil(unit.men*1.3/1000)*1000)],...(unit.formation?.profile?{profile:unit.formation.profile}:{})};
   if(commanderId){k.commanderReports=(k.commanderReports||[]).filter(r=>r.commanderId!==commanderId||r.armyId!==unit.id);k.commanderReports.unshift({commanderId,armyId:unit.id,armyName:[...unit.name],region:unit.region,year:s.year,month:s.month});k.commanderReports=k.commanderReports.slice(0,30)}
  }
 }
}
export function reportedArmies(s,viewer){initializeWorld(s);const result=[];for(const [owner,k] of Object.entries(s.knowledge[viewer]||{})){if(owner===viewer)continue;for(const x of Object.values(k.sightings||{}))result.push({...x,reported:true})}return result}
