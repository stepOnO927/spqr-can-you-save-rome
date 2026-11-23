import {ROUTES} from './data.js?v=archived-exchange-1';

export const LOCAL_DISCOVERY_LEVELS=Object.freeze({unknown:0,geographic:1,contacted:2,identified:3,surveyed:4,documented:5});

export function localDiscoveryLevel(state,viewer,id){
 return state.localDiscovery?.[viewer]?.[id]?.level??LOCAL_DISCOVERY_LEVELS.unknown;
}

export function recordLocalDiscovery(state,viewer,id,level,source){
 if(!state.factions?.[viewer]||!Number.isInteger(level)||level<1||level>5)return false;
 const entity=state.regions.flatMap(region=>region.localEntities||[]).find(item=>item.id===id);
 if(!entity)return false;
 state.localDiscovery||={};state.localDiscovery[viewer]||={};
 if(entity.type==='nomadic'){
  const prior=state.localDiscovery[viewer][id];
  if(prior?.seenTheater===entity.theater&&prior.level>=level)return false;
  state.localDiscovery[viewer][id]={level:Math.max(level,prior?.level||0),year:state.year,month:state.month,source,seenTheater:entity.theater};
  return true;
 }
 if(localDiscoveryLevel(state,viewer,id)>=level)return false;
 state.localDiscovery[viewer][id]={level,year:state.year,month:state.month,source};
 return true;
}

export function discoverLocalEntitiesInTheater(state,viewer,theaterId,level,source){
 const theater=state.regions.find(region=>region.id===theaterId);
 if(!theater)return 0;
 return (theater.localEntities||[]).filter(entity=>recordLocalDiscovery(state,viewer,entity.id,level,source)).length;
}

// Only the viewer's own or directly adjacent theater establishes opening
// local knowledge. A distant theater control assumption is not local contact.
export function discoverFrontierLocalities(state,viewer){
 const owned=new Set(state.regions.filter(region=>region.owner===viewer).map(region=>region.id));
 const adjacent=new Set(),adjacentLand=new Set();
 for(const [a,b,kind] of ROUTES){if(owned.has(a)){adjacent.add(b);if(kind!=='sea')adjacentLand.add(b)}if(owned.has(b)){adjacent.add(a);if(kind!=='sea')adjacentLand.add(a)}}
 for(const theater of state.regions)for(const entity of theater.localEntities||[]){
  if(entity.type==='nomadic'){
   if(owned.has(theater.id))recordLocalDiscovery(state,viewer,entity.id,5,'own_control');
   else if(state.armies.some(army=>army.owner===viewer&&army.region===theater.id&&army.men>0))recordLocalDiscovery(state,viewer,entity.id,4,'army_sighting');
   else if(adjacentLand.has(theater.id))recordLocalDiscovery(state,viewer,entity.id,3,'frontier');
   continue;
  }
  if(entity.type==='wilderness'){
   if(owned.has(theater.id))recordLocalDiscovery(state,viewer,entity.id,3,'own_geography');
   else if(state.armies.some(army=>army.owner===viewer&&army.region===theater.id&&army.men>0))recordLocalDiscovery(state,viewer,entity.id,3,'army_geography');
   else if(adjacentLand.has(theater.id))recordLocalDiscovery(state,viewer,entity.id,1,'frontier_geography');
   continue;
  }
  const involved=entity.controller===viewer||entity.overlord===viewer||entity.pending?.actor===viewer||entity.siege?.actor===viewer||entity.lastOutcome?.actor===viewer||entity.access?.[viewer]>state.year*12+state.month;
  if(owned.has(theater.id)||entity.controller===viewer)recordLocalDiscovery(state,viewer,entity.id,5,'own_control');
  else if(involved)recordLocalDiscovery(state,viewer,entity.id,4,'own_contact');
  else if((entity.type==='nomadic'?adjacentLand:adjacent).has(theater.id))recordLocalDiscovery(state,viewer,entity.id,entity.type==='village'?1:3,'frontier');
 }
}

export function initializeLocalDiscovery(state){
 state.localDiscovery||={};
 for(const viewer of Object.keys(state.factions||{})){
  state.localDiscovery[viewer]||={};
  discoverFrontierLocalities(state,viewer);
  if(['caesar','senate'].includes(viewer))for(const theater of state.regions)for(const entity of theater.localEntities||[]){
   if(entity.type==='roman_town'||entity.id==='massilia')recordLocalDiscovery(state,viewer,entity.id,3,'roman_public');
  }
 }
 return state;
}
