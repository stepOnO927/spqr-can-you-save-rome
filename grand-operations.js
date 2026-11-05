import {GRAND_ROUTES} from './grand-map-data.js';

const byId=s=>Object.fromEntries(s.regions.map(r=>[r.id,r]));
export function grandAdjacent(id){return GRAND_ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>({to:r[0]===id?r[1]:r[0],sea:r[2]==='sea',...r[3]}))}
export function edgeMonths(edge,destination){const base=edge.sea?2:1,travel=Math.max(0,Math.floor((edge.distance||0)/(edge.sea?270:180))),terrain=destination.terrain==='hills'||destination.terrain==='forest'?1:0,road=edge.road?1:0,river=edge.river?1:0;return Math.max(1,base+travel+terrain+river-road)}
export function grandRoute(s,unit,destination,isWar){
 const regions=byId(s),start=unit.region;if(!regions[start]||!regions[destination])return null;
 const distances=new Map([[start,0]]),previous=new Map(),queue=new Set([start]);
 while(queue.size){const current=[...queue].sort((a,b)=>distances.get(a)-distances.get(b))[0];queue.delete(current);if(current===destination)break;
  for(const edge of grandAdjacent(current)){const next=regions[edge.to];if(!next||next.owner!==unit.owner&&!isWar(s,unit.owner,next.owner))continue;if(edge.sea&&(!regions[current].port||!next.port||s.factions[unit.owner].treasury<8))continue;
   const cost=distances.get(current)+edgeMonths(edge,next)+(next.owner!==unit.owner?1:0)+(edge.sea?1:0),old=distances.get(next.id);if(old==null||cost<old){distances.set(next.id,cost);previous.set(next.id,{from:current,edge});queue.add(next.id)}
  }
 }
 if(!previous.has(destination))return null;
 const path=[];let node=destination;while(node!==start){const entry=previous.get(node);path.unshift({id:node,sea:entry.edge.sea,months:edgeMonths(entry.edge,regions[node]),distance:entry.edge.distance,road:entry.edge.road,river:entry.edge.river,mountain:entry.edge.mountain});node=entry.from}
 return {path,months:path.reduce((n,x)=>n+x.months,0),sea:path.some(x=>x.sea),supplyConcern:path.some(x=>regions[x.id].supply<7),hostile:path.some(x=>regions[x.id].owner!==unit.owner)};
}
export function supplyNetwork(s,owner){
 const regions=byId(s),owned=s.regions.filter(r=>r.owner===owner),sources=owned.filter(r=>r.port||r.terrain==='urban'||(r.buildings||[]).some(x=>['granary','supply-depot'].includes(x)));
 const distance=new Map(sources.map(r=>[r.id,0])),queue=new Set(sources.map(r=>r.id));
 while(queue.size){const id=[...queue].sort((a,b)=>distance.get(a)-distance.get(b))[0];queue.delete(id);for(const edge of grandAdjacent(id)){const next=regions[edge.to];if(!next||next.owner!==owner||edge.sea&&(!regions[id].port||!next.port))continue;const cost=distance.get(id)+(edge.road?.8:1)+(edge.mountain?.8:0)+(edge.sea?1.3:0);if(cost<(distance.get(next.id)??Infinity)){distance.set(next.id,cost);queue.add(next.id)}}}
 return distance;
}
export function armySupply(s,unit){if(!s.grandMap)return 1;const site=s.regions.find(r=>r.id===unit.region);if(!site)return 0;const network=supplyNetwork(s,unit.owner);let distance=network.get(site.id);if(distance==null&&unit.siege)distance=Math.min(...grandAdjacent(site.id).map(e=>network.get(e.to)).filter(Number.isFinite).map(x=>x+1),Infinity);
 if(!Number.isFinite(distance))return site.food>=1?.36:.18;return Math.max(.38,Math.min(1,1-distance*.075+(site.food>=1?.08:0)+((site.buildings||[]).includes('supply-depot')?.2:0)))}
export function encircled(s,unit){if(!s.grandMap)return false;const network=supplyNetwork(s,unit.owner);if(network.has(unit.region))return false;return !grandAdjacent(unit.region).some(e=>{const r=s.regions.find(x=>x.id===e.to);return r?.owner===unit.owner&&network.has(r.id)})}
export function advanceOperationalState(s){if(!s.grandMap)return;for(const unit of s.armies){if(unit.men<=0)continue;if(unit.stance==='hold'&&!unit.move)unit.prepared=Math.min(3,(unit.prepared||0)+1);else if(unit.move)unit.prepared=0;
  unit.encircled=encircled(s,unit);const supply=armySupply(s,unit);unit.operationalSupply=supply;
  if(supply<.5){unit.men=Math.max(1,Math.round(unit.men*(unit.encircled?.94:.98)));unit.morale=Math.max(15,unit.morale-(unit.encircled?5:2))}
 }}
export function holdPosition(s,armyId){const unit=s.armies.find(a=>a.id===armyId);if(!s.grandMap||!unit||unit.owner!==s.player||unit.move||unit.siege)return {ok:false,reason:'unavailable'};unit.stance='hold';unit.prepared=0;return {ok:true}}
export function strategicRetreat(s,armyId,to){const unit=s.armies.find(a=>a.id===armyId),target=s.regions.find(r=>r.id===to);if(!s.grandMap||!unit||unit.owner!==s.player||!target||target.owner!==unit.owner||!grandAdjacent(unit.region).some(e=>e.to===to&&!e.sea)||encircled(s,unit))return {ok:false,reason:'route'};unit.region=to;unit.move=null;unit.siege=null;unit.stance=null;unit.prepared=0;unit.morale=Math.max(15,unit.morale-4);return {ok:true}}
export function flankFactor(s,attacker,target){if(!s.grandMap||!attacker.coordinated)return 1;const directions=new Set(s.armies.filter(a=>a.owner===attacker.owner&&a.id!==attacker.id&&a.men>=1000&&!a.move&&grandAdjacent(a.region).some(e=>e.to===target.id)).map(a=>a.region));return 1+Math.min(.12,directions.size*.06)}
