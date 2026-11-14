import {ROUTES} from './data.js?v=phase-x-1';
import {reportedControl} from './control-intelligence.js?v=fort-intel-1';
import {reportedDiplomacy} from './diplomatic-knowledge.js?v=diplomatic-chronicle-1';
import {activeAgreement} from './agreements.js?v=grand-chessboard-2';
import {politicalMemoryAdjustment} from './political-memory.js?v=grand-chessboard-2';

const pair=(a,b)=>[a,b].sort().join(':'),now=s=>s.year*12+s.month;
// Only an actor's own condition and delivered intelligence can trigger an
// early review. A hidden foreign change must not wake its strategic planner.
export function opportunityEvidenceSignature(s,actor){
 const f=s.factions[actor];if(!f)return '';
 const evidence=Object.entries(s.knowledge?.[actor]||{}).sort(([a],[b])=>a.localeCompare(b)).map(([target,k])=>{
  const reports=(k.reports||[]).filter(r=>r.kind==='stability').slice(-32).map(r=>[r.value,r.confidence,r.observationYear??r.year,r.observationMonth??r.month]).sort();
  const sightings=Object.values(k.sightings||{}).sort((a,b)=>(b.year*12+b.month)-(a.year*12+a.month)).slice(0,32).map(x=>[x.id,x.region,x.year,x.month]).sort();
  return [target,reports,sightings];
 });
 const wars=reportedDiplomacy(s,actor).filter(x=>x.kind==='war'&&x.status==='active').map(x=>x.id).sort();
 const agreements=(s.agreements||[]).filter(x=>x.parties.includes(actor)&&x.status==='active').map(x=>[x.id,x.type]).sort();
 const ownArmies=s.armies.filter(a=>a.owner===actor&&a.men>0).map(a=>[a.id,a.region,Math.floor(a.men/5000)]).sort();
 return JSON.stringify([evidence,wars,agreements,ownArmies,Math.floor(f.treasury/25),Math.floor(f.food/25),Math.floor(f.stability/10)]);
}
// These are estimates from the actor's own evidence, not foreign hidden state.
// No sighting does not mean that a frontier is undefended.
export function assessOpportunities(s,actor,estimateStrength){
 const f=s.factions[actor];if(!f)return [];const owned=s.regions.filter(r=>r.owner===actor),frontier=new Map();
 for(const r of owned)for(const [a,b] of ROUTES){const next=a===r.id?b:b===r.id?a:null;if(!next)continue;const owner=reportedControl(s,actor,next)?.owner;if(owner&&owner!==actor&&owner!=='rebels'){const places=frontier.get(owner)||new Set();places.add(next);frontier.set(owner,places)}}
 const documents=reportedDiplomacy(s,actor).filter(d=>d.status==='active'&&now(s)-(d.year*12+d.month)>=0&&now(s)-(d.year*12+d.month)<=24);
 for(const document of documents.filter(d=>d.parties.includes(actor)))for(const target of document.parties)if(target!==actor&&target!=='rebels'&&!frontier.has(target))frontier.set(target,new Set());
 const ownStrength=s.armies.filter(a=>a.owner===actor&&a.men>0).reduce((n,a)=>n+a.men,0),personality=s.world.strategicPersonalities?.[actor]?.personality||'survivor';
 return [...frontier].filter(([target])=>s.factions[target]).map(([target,places])=>{
  const reports=(s.knowledge?.[actor]?.[target]?.reports||[]).filter(r=>r.kind==='stability'&&['stable','strained','fragile'].includes(r.value)&&now(s)-((r.observationYear??r.year)*12+(r.observationMonth??r.month))>=0&&now(s)-((r.observationYear??r.year)*12+(r.observationMonth??r.month))<=24).sort((a,b)=>((b.observationYear??b.year)*12+(b.observationMonth??b.month))-((a.observationYear??a.year)*12+(a.observationMonth??a.month)));
  const sightings=Object.values(s.knowledge?.[actor]?.[target]?.sightings||{}).filter(x=>Number.isFinite(x.year)&&Number.isFinite(x.month)&&now(s)-(x.year*12+x.month)>=0&&now(s)-(x.year*12+x.month)<=12);
  const border=places.size>0,distant=border?sightings.filter(x=>x.region&&!places.has(x.region)).length:0,frontierSightings=sightings.filter(x=>places.has(x.region)).length;
  const knownWars=documents.filter(d=>d.kind==='war'&&d.parties.includes(target)).length,relation=s.relations[pair(actor,target)]??0,estimate=estimateStrength(s,actor,target),memory=politicalMemoryAdjustment(s,actor,target),allied=s.alliances.some(a=>a.includes(actor)&&a.includes(target)),treaty=!!activeAgreement(s,actor,target,'non_aggression');
  const commitments=(s.agreements||[]).filter(t=>t.parties.includes(actor)&&t.parties.includes(target)&&activeAgreement(s,actor,target,t.type)===t).map(t=>t.type),reportedSupport=documents.filter(d=>d.parties.includes(target)&&(d.kind==='alliance'||d.kind==='coalition'||d.type==='defensive'||d.type==='guarantee')).length;
  const ratio=ownStrength/Math.max(1000,estimate),readiness=f.food>=25&&f.treasury>=35&&f.stability>=40,preference=({conqueror:5,schemer:2,diplomat:-4,reformer:-3,survivor:-3}[personality]||0),instability=reports[0]?.value||'unknown';
  // Rumours and conflicting claims are useful leads, not established facts.
  // Legacy reports without a confidence grade are treated as unverified.
  const confidence=reports[0]?.confidence||'unverified',weight=({confirmed:1,credible:.75,unverified:.5,rumor:.25,disputed:0}[confidence]??.5),instabilityScore=Math.round((instability==='fragile'?4:instability==='strained'?2:0)*weight);
  const score=Math.round(Math.min(12,ratio*4)+Math.min(6,knownWars*3)+Math.min(4,distant*2)-Math.min(4,frontierSightings*2)+instabilityScore+Math.max(-8,Math.min(8,-relation/10))-Math.max(-5,Math.min(5,memory))+preference-(allied?18:0)-(treaty?12:0)-Math.min(9,commitments.filter(x=>x!=='non_aggression').length*3)-Math.min(8,reportedSupport*2));
  return {target,border,score,readiness,estimate,ownStrength,relation,allied,treaty,commitments,reportedSupport,knownWars,distantSightings:distant,frontierSightings,instability,instabilityConfidence:reports.length?confidence:'unknown',personality,observedYear:s.year,observedMonth:s.month};
 }).sort((a,b)=>b.score-a.score||a.target.localeCompare(b.target)).slice(0,8);
}
