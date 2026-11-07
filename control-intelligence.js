import {REGIONS,ROUTES} from './data.js?v=xxii-final-3';

// Opening control is common campaign knowledge, not a reconstruction of the
// current world in an old save. Later observations belong to each faction.
export function initializeControlKnowledge(s){
 s.controlKnowledge||={};
 for(const viewer of Object.keys(s.factions)){
  if(!s.controlKnowledge[viewer])s.controlKnowledge[viewer]=Object.fromEntries(REGIONS.map(r=>[r.id,{owner:r.owner,year:-49,month:1}]));
 }
 return s;
}

export function observeControl(s){
 initializeControlKnowledge(s);
 for(const [viewer,reports] of Object.entries(s.controlKnowledge)){
  if(!s.factions[viewer])continue;
  const owned=new Set(s.regions.filter(r=>r.owner===viewer).map(r=>r.id)),observed=new Set(owned);
  for(const [a,b] of ROUTES){if(owned.has(a))observed.add(b);if(owned.has(b))observed.add(a)}
  // A lost friendly theater is known to have changed hands even when the last
  // neighboring friendly theater is lost in the same monthly resolution.
  for(const r of s.regions)if(observed.has(r.id)||reports[r.id]?.owner===viewer)reports[r.id]={owner:r.owner,year:s.year,month:s.month};
 }
}

export function reportedControl(s,viewer,id){
 initializeControlKnowledge(s);
 const r=s.regions.find(x=>x.id===id);if(!r)return null;
 if(r.owner===viewer)return {owner:viewer,year:s.year,month:s.month,own:true};
 return s.controlKnowledge[viewer]?.[id]||null;
}

// The force arriving at a theater can observe its controller, even when the
// location is outside the observer's normal monthly frontier observation.
export function observeArrival(s,viewer,id){
 initializeControlKnowledge(s);const r=s.regions.find(x=>x.id===id);
 if(r&&s.controlKnowledge[viewer])s.controlKnowledge[viewer][id]={owner:r.owner,year:s.year,month:s.month,source:'arrival'};
}

const random=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const log=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};

// An unnamed traveler observes a specified theater halfway through a round trip.
// Its sealed observation stays private until the return journey succeeds.
export function requestControlReport(s,id){
 initializeControlKnowledge(s);s.controlScouts||=[];
 const actor=s.player,r=s.regions.find(x=>x.id===id),f=s.factions[actor];
 if(!r||!f||!s.regions.some(x=>x.owner===actor)||r.owner===actor)return {ok:false,reason:'unavailable'};
 if(s.controlScouts.some(x=>x.actor===actor&&x.region===id&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(f.treasury<5)return {ok:false,reason:'treasury'};
 f.treasury-=5;s.controlScouts.unshift({actor,region:id,status:'pending',remaining:4,year:s.year,month:s.month});
 log(s,'Travelers set out to investigate a theater; a report may take four months.','商旅已出发调查战区；报告可能需要四个月。');return {ok:true};
}

export function advanceControlScouts(s){
 initializeControlKnowledge(s);s.controlScouts||=[];
 for(const op of s.controlScouts){
  if(op.status!=='pending')continue;
  op.remaining--;
  if(op.remaining===2&&!op.sealed){
   const r=s.regions.find(x=>x.id===op.region),q=random(s),old=s.controlKnowledge[op.actor]?.[op.region];
   op.sealed=!r||q<.18?{lost:true}:{owner:q<.4&&old?old.owner:r.owner,year:s.year,month:s.month,source:'travelers'};
  }
  if(op.remaining>0)continue;
  const sealed=op.sealed,report=s.controlKnowledge[op.actor]?.[op.region],r=s.regions.find(x=>x.id===op.region);
  const lost=!sealed||sealed.lost||random(s)<.15;
  if(lost){op.status='no_reply';if(op.actor===s.player)log(s,'No traveler report arrived; the journey or return message may have been lost.','没有收到商旅报告；行程或回信可能遗失。')}
  else{
   op.status='complete';
   // Do not overwrite more recent frontier intelligence or current own control.
   if(r?.owner!==op.actor&&(!report||sealed.year*12+sealed.month>=report.year*12+report.month))s.controlKnowledge[op.actor][op.region]=sealed;
   if(op.actor===s.player)log(s,'A traveler control report arrived; it is unverified and may be outdated.','收到一份商旅控制报告；未经核实，且可能过时。');
  }
  delete op.sealed;op.resolvedYear=s.year;op.resolvedMonth=s.month;
 }
}
