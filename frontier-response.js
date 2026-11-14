import {ROUTES} from './data.js?v=phase-x-1';

const now=s=>s.year*12+s.month;
const pair=(a,b)=>[a,b].sort().join(':');
const adjacent=(a,b)=>a===b||ROUTES.some(([x,y])=>x===a&&y===b||x===b&&y===a);

// Only dated sightings the observer already possesses can create pressure.
// Missing sightings and unseen movements are never evidence of an empty area.
export function reportedFrontierThreats(s,actor){
 const owned=s.regions.filter(r=>r.owner===actor),out=[];
 for(const [target,k] of Object.entries(s.knowledge?.[actor]||{})){
  if(target===actor||target==='rebels'||!s.factions[target]||(s.alliances||[]).some(a=>a.includes(actor)&&a.includes(target)))continue;
  const hostile=s.wars.some(w=>w.includes(actor)&&w.includes(target))||(s.relations[pair(actor,target)]??0)<=-20;
  if(!hostile)continue;
  for(const sighting of Object.values(k?.sightings||{})){
   const age=now(s)-(sighting.year*12+sighting.month);
   if(!Number.isFinite(age)||age<0||age>2||!Array.isArray(sighting.strengthBand)||!Number.isFinite(sighting.strengthBand[1])||sighting.strengthBand[1]<3000)continue;
   for(const region of owned)if(adjacent(region.id,sighting.region))out.push({target,region:region.id,sighting:sighting.id,observed:{year:sighting.year,month:sighting.month},upper:sighting.strengthBand[1]});
  }
 }
 return out.sort((a,b)=>b.upper-a.upper||a.target.localeCompare(b.target)||a.region.localeCompare(b.region)).slice(0,8);
}

// Armies already on the threatened frontier may take up a defensive stance.
// Existing orders and operational plans remain autonomous; a stance we made
// is withdrawn when the evidence expires or is visibly corrected.
export function respondToFrontierReports(s,actor,{issueOrder,canCommand=()=>true}={}){
 // Active wars use the existing combat planner; don't pin a force that needs
 // to advance, reinforce an ally or resolve a civil war.
 const reports=s.wars.some(w=>w.includes(actor))?[]:reportedFrontierThreats(s,actor),regions=new Set(reports.map(x=>x.region));
 for(const army of s.armies.filter(a=>a.owner===actor&&a.order?.source==='frontier_ai'))if(!regions.has(army.region)||now(s)>=(army.order.until??0)){if(army.order.kind==='defend')army.order=null}
 let ordered=0;
 for(const report of reports){
  if(s.armies.some(a=>a.owner===actor&&a.region===report.region&&a.order?.source==='frontier_ai'))continue;
  const army=s.armies.find(a=>a.owner===actor&&a.region===report.region&&a.men>0&&!a.move&&!a.siege&&!a.reorg&&!a.order&&(a.frontierResponseCooldown??-Infinity)<=now(s)&&canCommand(a));
  if(army&&issueOrder?.(s,army.id,'defend',null,actor)?.ok){army.order.source='frontier_ai';army.order.until=now(s)+2;army.frontierResponseCooldown=now(s)+6;ordered++;break}
 }
 return {reports,ordered};
}
