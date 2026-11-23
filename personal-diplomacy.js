import {reportedControl,observeArrival} from './control-intelligence.js?v=multipolar-review-1';
import {initializeWorld, CHARACTER_CATALOG} from './characters.js?v=multipolar-review-1';
import {ROUTES} from './data.js?v=multipolar-review-1';
import {addReport,reportedHealthSubjects,reportedPersonName,apparentAgeRange} from './character-system.js?v=multipolar-review-1';
import {officeOf} from './office-system.js?v=multipolar-review-1';
import {fictionalPortraitKey} from './portrait-registry.js?v=multipolar-review-1';
import {nonMilitaryAccessStatus} from './border-access.js?v=multipolar-review-1';
import {isCompletedMeeting,isDeliveredReport,storedCorrespondentName} from './person-knowledge.js?v=multipolar-review-1';

const atWar=(s,a,b)=>a!==b&&s.wars.some(w=>w.includes(a)&&w.includes(b));
// A commander in transit has not arrived in a theater where an audience can occur.
const commandingMarch=(s,id)=>s.armies.some(a=>a.characterId===id&&a.move);
const random=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
// Silence cannot reveal whether the intended recipient was reachable.
export const audiencePublicStatus=status=>status==='no_contact'?'no_reply':status;
// A resolved future outcome cannot be shown before its report has arrived.
export function audiencePublicRecord(s,m){
 const delivered=isDeliveredReport(s,{year:m.resolvedYear??m.year,month:m.resolvedMonth??m.month});
 const status=m.status==='pending'||!delivered||m.status==='met'&&!isCompletedMeeting(s,m)?'pending':audiencePublicStatus(m.status);
 const requestName=storedCorrespondentName(m.target,m.reportedName),observed=status==='met'&&Array.isArray(m.observedName)&&m.observedName.length===2&&m.observedName.every(x=>typeof x==='string'&&x.length>0)?storedCorrespondentName(m.target,m.observedName):null;
 return {status,requestName,observedName:observed,remaining:status==='pending'&&m.status==='pending'&&Number.isFinite(m.remaining)?m.remaining:null};
}
const log=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};

// Credit reflects the sender's own recent contacts, not the foreign person's
// hidden current allegiance, health, location, or negotiating authority.
export function personalDiplomaticCredit(s,actor,target){
 initializeWorld(s);const now=s.year*12+s.month,latest=new Map();
 for(const meeting of s.meetings){
  const sender=meeting.actor===actor&&meeting.targetFaction===target,recipient=meeting.targetFaction===actor&&meeting.actor===target;
  if((!sender&&!recipient)||!isCompletedMeeting(s,meeting))continue;
  const ownId=sender?meeting.person:meeting.target,otherId=sender?meeting.target:meeting.person;
  const year=meeting.resolvedYear??meeting.year,month=meeting.resolvedMonth??meeting.month,age=now-(year*12+month),own=s.world.characters[ownId];
  if(!Number.isFinite(age)||age<0||age>36||!own?.alive||own.missing||own.faction!==actor)continue;
  // Record what the envoy gained at that meeting, not the target's later trust.
  const key=JSON.stringify([ownId,otherId]),credit=Number.isFinite(meeting.contactCredit)?Math.max(0,Math.min(10,Math.floor(meeting.contactCredit))):1,date=year*12+month,previous=latest.get(key);
  if(!previous||date>previous.date)latest.set(key,{date,credit});
 }
 return Math.max(0,...[...latest.values()].map(x=>x.credit));
}

// Civilian journeys use the campaign theater graph, not precise historical roads.
export function previewPersonTravel(s,id,destination,{purpose='civilian'}={}){
 initializeWorld(s);const c=s.world.characters[id],owner=s.player;
 if(!['civilian','diplomatic'].includes(purpose))return {ok:false,reason:'purpose'};
 if(!c||c.faction!==owner||!c.alive||c.missing||!c.location||c.travel||officeOf(s,owner,id)||['seriously_ill','dying','deceased'].includes(c.health)||s.armies.some(a=>a.characterId===id))return {ok:false,reason:'unavailable'};
 if(c.location===destination||!s.regions.some(r=>r.id===destination))return {ok:false,reason:'destination'};
 const distances={[c.location]:0},paths={[c.location]:[]},unvisited=new Set(s.regions.map(r=>r.id));
 while(unvisited.size){const current=[...unvisited].filter(x=>distances[x]!==undefined).sort((a,b)=>distances[a]-distances[b])[0];if(!current)break;unvisited.delete(current);if(current===destination)break;
  for(const edge of ROUTES.filter(x=>x[0]===current||x[1]===current)){const next=edge[0]===current?edge[1]:edge[0],r=s.regions.find(x=>x.id===next),reportedOwner=reportedControl(s,owner,next)?.owner??null;if(!r||!unvisited.has(next)||!nonMilitaryAccessStatus(s,owner,next,reportedOwner,purpose).allowed)continue;const months=(edge[2]==='sea'?3:1)+(r.terrain==='hills'||r.terrain==='desert'?1:0)+(['frail','wounded'].includes(c.health)?1:0),distance=distances[current]+months;if(distances[next]===undefined||distance<distances[next]){distances[next]=distance;paths[next]=[...paths[current],{to:next,months,sea:edge[2]==='sea'}]}}
 }
 if(!paths[destination])return {ok:false,reason:'route'};const legs=paths[destination],cost=3+legs.filter(x=>x.sea).length*8;if(s.factions[owner].treasury<cost)return {ok:false,reason:'treasury'};return {ok:true,legs,months:distances[destination],cost,purpose};
}
export function startPersonTravel(s,id,destination,{purpose='civilian'}={}){const p=previewPersonTravel(s,id,destination,{purpose});if(!p.ok)return p;s.factions[s.player].treasury-=p.cost;s.world.characters[id].travel={destination,legs:p.legs,remaining:p.legs[0].months,purpose};return p}
// An order cannot teleport a traveler back to the last recorded theater. They
// finish the current leg, then halt, unless its controller prevents entry.
export function setJourneyHalt(s,id,halt){
 initializeWorld(s);const c=s.world.characters[id],t=c?.travel;
 if(!c||c.faction!==s.player||!c.alive||c.missing||['seriously_ill','dying','deceased'].includes(c.health)||!t||!Array.isArray(t.legs)||t.legs.length<2||typeof halt!=='boolean')return {ok:false,reason:'unavailable'};
 if(!!t.haltAfterLeg===halt)return {ok:false,reason:'unchanged'};
 t.haltAfterLeg=halt;
 const name=CHARACTER_CATALOG[id]?.name||['A person','一位人物'];
 log(s,halt?`${name[0]} was ordered to stop after the current leg; travel costs are not refunded.`:`${name[0]}'s stop order was withdrawn; the original journey continues.`,halt?`已命${name[1]}完成当前路段后停下；旅费不予退还。`:`已撤回${name[1]}的停下命令，原行程继续。`);
 return {ok:true};
}
export function requestPersonalMeeting(s,id,target,targetFaction){
 initializeWorld(s);const c=s.world.characters[id];
 // Address reported leaders or claimants, even when those reports are stale or wrong.
 // The recipient's actual allegiance is checked only when the request resolves.
 const reported=Object.keys(s.knowledge[s.player]||{}).filter(f=>f!==s.player&&reportedHealthSubjects(s,s.player,f).includes(target));
 const court=targetFaction??(reported.length===1?reported[0]:null);
 if(!c||c.faction!==s.player||!c.alive||c.missing||!c.location||c.travel||commandingMarch(s,id)||['seriously_ill','dying','deceased'].includes(c.health)||!CHARACTER_CATALOG[target]||!court||!reported.includes(court))return {ok:false,reason:'unavailable'};
 if(s.meetings.some(m=>m.person===id&&m.status==='pending'))return {ok:false,reason:'pending'};if(s.factions[s.player].treasury<3)return {ok:false,reason:'treasury'};
 const reportedName=reportedPersonName(s,s.player,court,target)?.name,personName=CHARACTER_CATALOG[id]?.name;
 s.factions[s.player].treasury-=3;s.meetings.unshift({actor:s.player,person:id,target,targetFaction:court,reportedName,...(Array.isArray(personName)&&personName.length===2?{personName:[...personName]}:{}),location:c.location,status:'pending',remaining:2,year:s.year,month:s.month});return {ok:true};
}
function interruptJourney(s,c){
 delete c.travel;
 if(c.faction!==s.player)return;
 const name=CHARACTER_CATALOG[c.id]?.name||['A person','一位人物'];
 if(c.missing)log(s,`${name[0]}'s journey ended after contact was lost; their present location is unknown.`,`${name[1]}失联，行程已中止；目前位置不明。`);
 else if(!c.alive||c.health==='deceased')log(s,`${name[0]}'s journey ended following their death in the simulation.`,`${name[1]}在模拟中去世，行程已结束。`);
 else log(s,`${name[0]}'s journey was interrupted by serious illness; the last recorded theater does not establish their exact location.`,`${name[1]}因重病中止行程；最后记录的战区不代表其确切位置。`);
}
export function advancePersonalDiplomacy(s){
 initializeWorld(s);for(const c of Object.values(s.world.characters)){const t=c.travel;if(!t)continue;if(!c.alive||c.missing||['seriously_ill','dying','deceased'].includes(c.health)){interruptJourney(s,c);continue}const next=t.legs[0],r=s.regions.find(x=>x.id===next?.to);if(!r){delete c.travel;continue}if(--t.remaining>0)continue;observeArrival(s,c.faction,next.to);if(!nonMilitaryAccessStatus(s,c.faction,next.to,r.owner,t.purpose||'civilian').allowed){delete c.travel;if(c.faction===s.player)log(s,'A personal journey stopped on arrival: entry is no longer permitted.','人物抵达途中核实了战区控制与边境政策；因无法安全进入而中止行程。');continue}c.location=next.to;t.legs.shift();if(t.haltAfterLeg){delete c.travel;if(c.faction===s.player)log(s,`${CHARACTER_CATALOG[c.id].name[0]} stopped in ${r.name[0]} as ordered.`,`${CHARACTER_CATALOG[c.id].name[1]}按命令在${r.name[1]}停下。`)}else if(t.legs.length)t.remaining=t.legs[0].months;else{delete c.travel;if(c.faction===s.player)log(s,`${CHARACTER_CATALOG[c.id].name[0]} arrived in ${r.name[0]}.`,`${CHARACTER_CATALOG[c.id].name[1]}抵达${r.name[1]}。`)}}
 for(const m of s.meetings){
  if(m.status!=='pending'||--m.remaining>0)continue;
  const a=s.world.characters[m.person],b=s.world.characters[m.target],q=random(s),personKey=[m.person,m.target].sort().join(':'),factionKey=[m.actor,m.targetFaction].sort().join(':'),trust=s.world.personalRelations[personKey]?.trust||0,relations=s.relations[factionKey]||0,declineLimit=Math.max(.25,Math.min(.7,.45-trust*.002-relations*.001));
  // A lost or unanswered request is possible regardless of the recipient's
  // hidden condition. Silence must not prove that they were present and able.
  if(q<.2)m.status='no_reply';
  else if(!a?.alive||a.missing||a.faction!==m.actor||a.travel||commandingMarch(s,m.person)||a.location!==m.location||['seriously_ill','dying','deceased'].includes(a.health)||!b?.alive||b.missing||b.faction!==m.targetFaction||b.travel||commandingMarch(s,m.target)||b.location!==m.location||atWar(s,m.actor,m.targetFaction))m.status='no_contact';
  else if(q<declineLimit||['seriously_ill','dying','deceased'].includes(b.health))m.status='declined';
  else{m.status='met';const ownName=CHARACTER_CATALOG[m.person]?.name;if(Array.isArray(ownName)&&ownName.length===2&&ownName.every(x=>typeof x==='string'&&x.trim()))m.observedPersonName=[...ownName];const observed=CHARACTER_CATALOG[m.target]?.name;if(Array.isArray(observed)&&observed.length===2&&observed.every(x=>typeof x==='string'&&x.trim()))m.observedName=[...observed];const portrait=fictionalPortraitKey(s,m.target);if(portrait)m.portraitKey=portrait;const personPortrait=fictionalPortraitKey(s,m.person);if(personPortrait)m.personPortraitKey=personPortrait;const rel=s.world.personalRelations[personKey]||{trust:0,meetings:0};rel.trust=Math.min(100,rel.trust+5);rel.meetings++;rel.lastYear=s.year;rel.lastMonth=s.month;s.world.personalRelations[personKey]=rel;m.contactCredit=Math.max(0,Math.min(10,Math.floor(rel.trust/5)));s.relations[factionKey]=Math.min(100,relations+3);const observedIdentity=m.observedName?{peopleNames:{[m.target]:[...m.observedName]},identityObserved:true}:{};addReport(s,m.actor,m.targetFaction,{...observedIdentity,kind:'location',character:m.target,value:m.location,source:'meeting',confidence:'unverified',reliability:'moderate'});const stance=relations<0&&trust<15?'guarded':relations>=30||trust>=15?'receptive':'noncommittal';addReport(s,m.actor,m.targetFaction,{...observedIdentity,kind:'stance',character:m.target,value:stance,source:'meeting',confidence:'unverified',reliability:'low'});const age=apparentAgeRange(m.target,s.year,s);if(age)addReport(s,m.actor,m.targetFaction,{...observedIdentity,kind:'age',character:m.target,value:age,source:'meeting',confidence:'unverified',reliability:'low'});addReport(s,m.actor,m.targetFaction,{...observedIdentity,kind:'health',character:m.target,value:b.health==='wounded'?'wounded':'unknown',source:'meeting',confidence:'unverified',reliability:'low'});
   // Each participant records the encounter; neither learns later hidden changes.
   const visitorIdentity=m.observedPersonName?{peopleNames:{[m.person]:[...m.observedPersonName]},identityObserved:true}:{};addReport(s,m.targetFaction,m.actor,{...visitorIdentity,kind:'location',character:m.person,value:m.location,source:'meeting',confidence:'unverified',reliability:'moderate'});const visitorAge=apparentAgeRange(m.person,s.year,s);if(visitorAge)addReport(s,m.targetFaction,m.actor,{...visitorIdentity,kind:'age',character:m.person,value:visitorAge,source:'meeting',confidence:'unverified',reliability:'low'});addReport(s,m.targetFaction,m.actor,{...visitorIdentity,kind:'health',character:m.person,value:a.health==='wounded'?'wounded':'unknown',source:'meeting',confidence:'unverified',reliability:'low'})}
  m.resolvedYear=s.year;m.resolvedMonth=s.month;if(m.actor===s.player){const status=audiencePublicStatus(m.status);log(s,`Personal audience: ${status.replace('_',' ')}.`,({no_reply:'个人会面请求没有收到答复。',declined:'个人会面请求被拒绝。',met:'双方在同一战区举行了个人会面，关系有所改善。'})[status])}
 }
}
