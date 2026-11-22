import {ROUTES} from './data.js?v=world-kings-stops-1';

const now=state=>state.year*12+state.month;
const hostile=(state,a,b)=>a!==b&&(state.wars||[]).some(pair=>pair.includes(a)&&pair.includes(b));
const landNeighbors=(a,b)=>ROUTES.some(([from,to,kind])=>kind!=='sea'&&(from===a&&to===b||from===b&&to===a));

// Camps move between approximate seasonal points. This never transfers the
// theater, creates a sovereign claim, or grants access to a faction's army.
export function advanceNomadicCommunities(state){
 if(state.dlc||![4,10].includes(state.month))return [];
 const moves=[];
 const communities=state.regions.flatMap(region=>region.localEntities||[]).filter(entity=>entity.type==='nomadic'&&entity.proceduralNomad);
 for(const entity of communities){
  if(entity.lastMigration?.year===state.year&&entity.lastMigration?.month===state.month)continue;
  const current=state.regions.find(region=>region.id===entity.theater),range=entity.seasonalRange||[],nextIndex=(entity.rangeIndex+1)%range.length,destination=range[nextIndex],next=state.regions.find(region=>region.id===destination?.theater);
  if(!current||!next||range.length<2||!landNeighbors(current.id,next.id))continue;
  entity.lastMigration={year:state.year,month:state.month};
  const invited=entity.pastureRights?.[next.owner]>now(state);
  if((hostile(state,current.owner,next.owner)||next.terrain==='desert'&&entity.waterSecurity<35)&&!invited){
   entity.lastMigration.blocked=true;entity.herds=Math.max(0,entity.herds-1);entity.waterSecurity=Math.max(0,entity.waterSecurity-3);continue;
  }
  const index=current.localEntities.indexOf(entity);if(index<0)continue;
  current.localEntities.splice(index,1);
  next.localEntities||=[];next.localEntities.push(entity);
  entity.theater=next.id;entity.coordinates=[...destination.coordinates];entity.rangeIndex=nextIndex;entity.legalSovereign=next.owner;
  entity.herds=Math.min(Math.ceil(entity.population/200),entity.herds+1);
  entity.waterSecurity=Math.min(100,entity.waterSecurity+(next.terrain==='desert'?2:5));
  moves.push({id:entity.id,from:current.id,to:next.id});
 }
 return moves;
}
