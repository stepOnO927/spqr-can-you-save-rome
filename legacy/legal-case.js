import {claimReward} from './legacy-core.js?v=15';

// A fictional civic exercise. Both documents can disagree without proving fraud.
export const BOUNDARY_CASE_ID='tiber-boundary';
export const BOUNDARY_COSTS={registry:12,survey:18,corroboration:10};
const EFFECTS={
 provisional:{checked:{people:3,senate:1,aristocrats:-1,corruption:-1,reputation:2},unchecked:{people:1,senate:1,aristocrats:-1,reputation:0}},
 public:{checked:{people:2,aristocrats:-2,reputation:-1},unchecked:{people:1,aristocrats:-3,corruption:2,reputation:-4}},
 private:{checked:{people:1,aristocrats:2,senate:-2,reputation:1},unchecked:{people:-2,aristocrats:2,senate:-2,reputation:-3}}
};
const stamp=()=>new Date().toISOString();
export function boundaryCase(profile){return (Array.isArray(profile.legalCases)?profile.legalCases:[]).find(item=>item?.id===BOUNDARY_CASE_ID)||null}
export function beginBoundaryCase(profile,source){
 const cost=BOUNDARY_COSTS[source];
 if(!profile.buildings?.includes('court')||!['registry','survey'].includes(source)||boundaryCase(profile))return {ok:false,reason:'unavailable'};
 if(profile.coins<cost)return {ok:false,reason:'coins'};
 profile.coins-=cost;
 const record={id:BOUNDARY_CASE_ID,status:'open',source,openedAt:stamp(),evidence:[source],corroborated:false,cost};
 if(!Array.isArray(profile.legalCases))profile.legalCases=[];
 profile.legalCases.push(record);
 return {ok:true,cost,record};
}
export function corroborateBoundaryCase(profile){
 const record=boundaryCase(profile);
 if(!profile.buildings?.includes('court')||record?.status!=='open'||record.corroborated)return {ok:false,reason:'unavailable'};
 if(profile.coins<BOUNDARY_COSTS.corroboration)return {ok:false,reason:'coins'};
 profile.coins-=BOUNDARY_COSTS.corroboration;
 record.corroborated=true;record.corroboratedAt=stamp();
 if(!Array.isArray(record.evidence))record.evidence=[record.source];
 record.evidence.push(record.source==='registry'?'survey':'registry');
 return {ok:true,cost:BOUNDARY_COSTS.corroboration,record};
}
export function closeBoundaryCase(profile,verdict){
 const record=boundaryCase(profile),effects=EFFECTS[verdict]?.[record?.corroborated?'checked':'unchecked'];
 if(!profile.buildings?.includes('court')||record?.status!=='open'||!effects)return {ok:false,reason:'unavailable'};
 for(const [key,change] of Object.entries(effects))profile.politics[key]=Math.max(0,Math.min(100,(profile.politics[key]||0)+change));
 record.status='closed';record.verdict=verdict;record.closedAt=stamp();record.effects={...effects};
 const awarded=claimReward(profile,`legal:${BOUNDARY_CASE_ID}`,45);
 record.coinsClaimed=awarded?45:0;
 profile.collectibles||=[];
 if(!profile.collectibles.includes('boundary-ruling-tablet'))profile.collectibles.push('boundary-ruling-tablet');
 return {ok:true,coins:record.coinsClaimed,record};
}
