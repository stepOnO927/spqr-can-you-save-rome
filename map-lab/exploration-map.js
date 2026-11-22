import {LOCAL_DISCOVERY_LEVELS} from '../local-discovery.js?v=portrait-fourteen-1';

const COLORS=['#59666b','#b8a66f','#c7b46c','#7299a6','#78a88b','#a5bf88'];

// Iterate delivered discovery records, then resolve their theater. Looking at
// all hidden local entities to choose a color would disclose their existence.
export function explorationEntries(state,viewer){
 const records=state.localDiscovery?.[viewer]||{},byId=new Map(state.regions.flatMap(r=>(r.localEntities||[]).map(entity=>[entity.id,{entity,theater:r}])));
 return Object.entries(records).flatMap(([id,record])=>{
  const found=byId.get(id),level=record?.level;
  if(!found||!Number.isInteger(level)||level<1||level>5)return [];
  const theater=found.entity.type==='nomadic'&&record.seenTheater?state.regions.find(region=>region.id===record.seenTheater):found.theater;
  if(!theater)return [];
  return [{id,theaterId:theater.id,theaterName:theater.name,level,source:record.source,year:record.year,month:record.month,name:level>=LOCAL_DISCOVERY_LEVELS.identified?found.entity.name:null}];
 });
}

export function explorationOutlineColor(entries,theaterIds){
 const levels=theaterIds.map(id=>Math.max(0,...entries.filter(x=>x.theaterId===id).map(x=>x.level)));
 return levels.every(level=>level===levels[0])?COLORS[levels[0]]:'#b39757';
}
