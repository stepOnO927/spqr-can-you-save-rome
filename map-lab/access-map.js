import {militaryAccessStatus,nonMilitaryAccessStatus} from '../border-access.js?v=world-kings-sea-1';
import {reportedControl} from '../control-intelligence.js?v=world-kings-sea-1';

export const ACCESS_MAP_COLORS=Object.freeze({
 own:'#a74737',military:'#78a88b',limited:'#c5a45c',war:'#668ca4',commercial:'#a87c61',closed:'#59666b',unknown:'#777b76',mixed:'#b39757'
});

// The atlas supplies only a reported controller. Do not fall back to the
// theater's actual foreign owner: the report can be absent or out of date.
export function accessMapStatus(state,viewer,theaterId,reportedOwner){
 if(!reportedOwner||reportedOwner==='shared')return {kind:'unknown',owner:null,color:ACCESS_MAP_COLORS.unknown};
 if(reportedOwner===viewer)return {kind:'own',owner:viewer,color:ACCESS_MAP_COLORS.own};
 const military=militaryAccessStatus(state,viewer,theaterId,reportedOwner);
 if(military.basis==='war')return {kind:'war',owner:reportedOwner,basis:'war',color:ACCESS_MAP_COLORS.war};
 if(military.allowed){const kind=military.basis==='limited_treaty'?'limited':'military';return {kind,owner:reportedOwner,basis:military.basis,color:ACCESS_MAP_COLORS[kind]}}
 const commercial=nonMilitaryAccessStatus(state,viewer,theaterId,reportedOwner,'commercial');
 if(commercial.allowed)return {kind:'commercial',owner:reportedOwner,basis:commercial.basis,color:ACCESS_MAP_COLORS.commercial};
 return {kind:'closed',owner:reportedOwner,basis:'closed',color:ACCESS_MAP_COLORS.closed};
}

export function accessMapEntries(state,viewer){
 return state.regions.map(theater=>{
  const report=reportedControl(state,viewer,theater.id),status=accessMapStatus(state,viewer,theater.id,report?.owner);
  return {theaterId:theater.id,name:theater.name,report:report?{year:report.year,month:report.month}:null,...status};
 });
}

// A historical polygon can cover several game theaters. Mixed or missing
// reports cannot be painted as a single known access grant.
export function accessMapColor(state,viewer,theaterIds){
 if(!theaterIds.length)return ACCESS_MAP_COLORS.unknown;
 const statuses=theaterIds.map(id=>accessMapStatus(state,viewer,id,reportedControl(state,viewer,id)?.owner));
 const kinds=new Set(statuses.map(status=>status.kind));
 return kinds.size===1?statuses[0].color:ACCESS_MAP_COLORS.mixed;
}
