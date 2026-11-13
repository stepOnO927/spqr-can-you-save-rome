import {GRAND_ROUTES} from './grand-map-data.js';
import {accessibleFleet,portZone} from './naval.js?v=30';
import {activeEffects} from './development.js?v=31';

const byId=s=>Object.fromEntries(s.regions.map(r=>[r.id,r]));
const OPENING_LIFT={caesar:1,senate:2,egypt:2,numidia:1,mauretania:1,armenia:0,parthia:0,galatia:0,bosporus:1,rebels:0};
export function navalCapacity(s,owner){const faction=s.factions[owner];if(!faction)return 0;return Math.max(0,faction.navalLift??OPENING_LIFT[owner]??0)+s.regions.filter(r=>r.owner===owner&&r.port&&(r.buildings||[]).includes('shipyard')).length}
export function availableNavalLift(s,owner,unitId){return navalCapacity(s,owner)-s.armies.filter(a=>a.owner===owner&&a.id!==unitId&&a.move?.sea).length}
export function canEmbark(s,unit,from,to){return !!(from?.port&&to?.port&&s.factions[unit.owner]?.treasury>=8&&(s.naval?accessibleFleet(s,unit.owner,from.id,unit.men):availableNavalLift(s,unit.owner,unit.id)>0))}
export function grandAdjacent(id){return GRAND_ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>({to:r[0]===id?r[1]:r[0],sea:r[2]==='sea',...r[3]}))}
export function edgeMonths(edge,destination,origin=null,fieldMarch=0){const base=edge.sea?2:1,travel=Math.max(0,Math.floor((edge.distance||0)/(edge.sea?270:180))),terrain=destination.terrain==='hills'||destination.terrain==='forest'?1:0,road=edge.road||!edge.sea&&(origin?.buildings?.includes('road')||destination.buildings?.includes('road'))?1:0,bridge=edge.river&&(origin?.buildings?.includes('bridge')||destination.buildings?.includes('bridge')),river=edge.river&&!bridge?1:0;return Math.max(1,base+travel+terrain+river-road-(edge.sea?0:Math.min(1,fieldMarch)))}
export function grandRoute(s,unit,destination,isWar){
 const regions=byId(s),start=unit.region;if(!regions[start]||!regions[destination])return null;
 const fieldMarch=activeEffects(s,unit.owner).march||0;
 const distances=new Map([[start,0]]),previous=new Map(),queue=new Set([start]);
 while(queue.size){const current=[...queue].sort((a,b)=>distances.get(a)-distances.get(b))[0];queue.delete(current);if(current===destination)break;
  for(const edge of grandAdjacent(current)){const next=regions[edge.to];if(!next||next.owner!==unit.owner&&!isWar(s,unit.owner,next.owner))continue;if(edge.sea&&!canEmbark(s,unit,regions[current],next))continue;
   const cost=distances.get(current)+edgeMonths(edge,next,regions[current],fieldMarch)+(next.owner!==unit.owner?1:0)+(edge.sea?1:0),old=distances.get(next.id);if(old==null||cost<old){distances.set(next.id,cost);previous.set(next.id,{from:current,edge});queue.add(next.id)}
  }
 }
 if(!previous.has(destination))return null;
 const path=[];let node=destination;while(node!==start){const entry=previous.get(node);path.unshift({id:node,sea:entry.edge.sea,months:edgeMonths(entry.edge,regions[node],regions[entry.from],fieldMarch),distance:entry.edge.distance,road:entry.edge.road,river:entry.edge.river,mountain:entry.edge.mountain});node=entry.from}
 return {path,months:path.reduce((n,x)=>n+x.months,0),sea:path.some(x=>x.sea),supplyConcern:path.some(x=>regions[x.id].supply<7),hostile:path.some(x=>regions[x.id].owner!==unit.owner)};
}
function supplySources(s,owner,established=false){return s.regions.filter(r=>r.owner===owner&&(
 r.terrain==='urban'||(r.buildings||[]).some(x=>['granary','supply-depot'].includes(x))||
 r.port&&(!established||r.food>=.6)||
 // Smaller inland commands recruit and provision at their home theater.
 // They still need local production and national reserves for an established line.
 r.id===owner&&(!established||r.food>=.6&&s.factions[owner]?.food>=0)
))}
export function supplyNetwork(s,owner,established=false){
 const regions=byId(s),sources=supplySources(s,owner,established);
 const distance=new Map(sources.map(r=>[r.id,0])),queue=new Set(sources.map(r=>r.id));
 while(queue.size){const id=[...queue].sort((a,b)=>distance.get(a)-distance.get(b))[0];queue.delete(id);for(const edge of grandAdjacent(id)){const next=regions[edge.to];if(!next||next.owner!==owner||edge.sea)continue;const cost=distance.get(id)+(edge.road?.8:1)+(edge.mountain?.8:0);if(cost<(distance.get(next.id)??Infinity)){distance.set(next.id,cost);queue.add(next.id)}}}
 if(established)for(const [port,store] of Object.entries(s.naval?.provisions||{})){
  if(store.owner!==owner||store.food<=0||regions[port]?.owner!==owner)continue;
  const steps=new Map([[port,0]]),frontier=[port];
  while(frontier.length){const id=frontier.shift(),depth=steps.get(id);distance.set(id,Math.min(distance.get(id)??Infinity,depth));if(depth>=3)continue;
   for(const edge of grandAdjacent(id)){const next=regions[edge.to];if(edge.sea||next?.owner!==owner||steps.has(next.id))continue;steps.set(next.id,depth+1);frontier.push(next.id)}
  }
 }
 return distance;
}
export function supplyBottlenecks(s,owner){
 const owned=s.regions.filter(r=>r.owner===owner),sources=supplySources(s,owner),positions=new Set(s.armies.filter(a=>a.owner===owner&&a.men>0).map(a=>a.region));
 const vital=new Set();if(!sources.length||!positions.size)return vital;
 for(const candidate of owned){if(sources.some(r=>r.id===candidate.id))continue;const seen=new Set(sources.map(r=>r.id).filter(id=>id!==candidate.id)),queue=[...seen];while(queue.length){const id=queue.shift();for(const edge of grandAdjacent(id)){const next=s.regions.find(r=>r.id===edge.to);if(next?.owner!==owner||next.id===candidate.id||seen.has(next.id)||edge.sea)continue;seen.add(next.id);queue.push(next.id)}}if([...positions].some(id=>id!==candidate.id&&!seen.has(id)))vital.add(candidate.id)}
 return vital;
}
export function armySupply(s,unit){if(!s.grandMap)return 1;const site=s.regions.find(r=>r.id===unit.region);if(!site)return 0;const network=supplyNetwork(s,unit.owner);let distance=network.get(site.id);if(distance==null&&unit.siege)distance=Math.min(...grandAdjacent(site.id).map(e=>network.get(e.to)).filter(Number.isFinite).map(x=>x+1),Infinity);
 let base=!Number.isFinite(distance)?site.food>=1?.36:.18:Math.max(.38,Math.min(1,1-distance*.075+(site.food>=1?.08:0)+((site.buildings||[]).includes('supply-depot')?.2:0)));
 const established=supplyNetwork(s,unit.owner,true);
 if(!established.has(site.id)&&!(unit.siege&&grandAdjacent(site.id).some(e=>established.has(e.to))))base=Math.min(base,.68);
 const blockaded=site.port&&s.naval?.fleets?.some(f=>f.order?.kind==='blockade'&&f.order.targetPort===site.id&&f.zone===portZone(site.id)&&s.wars.some(w=>w.includes(f.owner)&&w.includes(unit.owner)));
 return blockaded?Math.max(.18,Math.round(base*.7*100)/100):base;
}
export function encircled(s,unit){if(!s.grandMap)return false;const network=supplyNetwork(s,unit.owner);if(network.has(unit.region))return false;return !grandAdjacent(unit.region).some(e=>{const r=s.regions.find(x=>x.id===e.to);return r?.owner===unit.owner&&network.has(r.id)})}
export function advanceOperationalState(s){if(!s.grandMap)return;for(const unit of s.armies){if(unit.men<=0)continue;if(unit.stance==='hold'&&!unit.move)unit.prepared=Math.min(3,(unit.prepared||0)+1);else if(unit.move)unit.prepared=0;
  unit.encircled=encircled(s,unit);const supply=armySupply(s,unit);unit.operationalSupply=supply;
  if(supply<.5){unit.men=Math.max(0,unit.men-Math.max(1,Math.round(unit.men*(unit.encircled?.06:.02))));unit.morale=Math.max(15,unit.morale-(unit.encircled?5:2))}
 }}
export function holdPosition(s,armyId){const unit=s.armies.find(a=>a.id===armyId);if(!s.grandMap||!unit||unit.owner!==s.player||unit.move||unit.siege)return {ok:false,reason:'unavailable'};unit.stance='hold';unit.prepared=0;return {ok:true}}
export function strategicRetreat(s,armyId,to,actor=s.player){const unit=s.armies.find(a=>a.id===armyId),target=s.regions.find(r=>r.id===to);if(!s.grandMap||!unit||unit.owner!==actor||!target||target.owner!==unit.owner||!grandAdjacent(unit.region).some(e=>e.to===to&&!e.sea)||encircled(s,unit))return {ok:false,reason:'route'};unit.region=to;unit.move=null;unit.siege=null;unit.stance=null;unit.prepared=0;unit.morale=Math.max(15,unit.morale-4);return {ok:true}}
export function flankFactor(s,attacker,target){if(!s.grandMap||!attacker.coordinated||!grandAdjacent(attacker.region).some(e=>e.to===target.id))return 1;const directions=new Set(s.armies.filter(a=>a.owner===attacker.owner&&a.id!==attacker.id&&a.region!==attacker.region&&a.men>=1000&&!a.move&&armySupply(s,a)>=.5&&grandAdjacent(a.region).some(e=>e.to===target.id)).map(a=>a.region));return 1+Math.min(.12,directions.size*.06)}
