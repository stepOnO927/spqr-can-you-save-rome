import {reportedControl} from '../control-intelligence.js?v=archived-leads-1';
import {deriveGovernment} from '../governance.js?v=archived-leads-1';
import {CHARACTER_CATALOG} from '../characters.js?v=archived-leads-1';

// Project government authority from the viewer's own state or dated reports.
// The theater-level political authority is not a claim of presence in a city.
export function authorityForTheater(state,theater){
 const viewer=state.player,control=reportedControl(state,viewer,theater),owner=control?.owner;
 if(!owner||owner==='shared'||owner==='rebels')return {kind:'unknown',actors:[],owner:owner||null};
 if(control.own){const government=deriveGovernment(state,viewer);return {owner,kind:government.kind,actors:[...government.acting],own:true};}
 const now=state.year*12+state.month;
 const reports=(state.knowledge?.[viewer]?.[owner]?.reports||[]).filter(r=>r.kind==='authority').map((r,index)=>({report:r,index,date:(r.observationYear??r.year)*12+(r.observationMonth??r.month),received:r.year*12+r.month})).filter(x=>Number.isFinite(x.date)&&Number.isFinite(x.received)&&x.date<=now&&x.received<=now).sort((a,b)=>b.date-a.date||a.index-b.index);
 const entry=reports[0];if(!entry)return {owner,kind:'unknown',actors:[]};
 const project=r=>{const v=r.value,year=r.observationYear??r.year,month=r.observationMonth??r.month,actors=v&&typeof v==='object'&&Array.isArray(v.actors)?[...v.actors]:[],peopleNames={};for(const id of actors){const name=r.peopleNames?.[id];peopleNames[id]=Array.isArray(name)&&name.length===2&&name.every(x=>typeof x==='string'&&x.length>0)?[...name]:CHARACTER_CATALOG[id]&&!CHARACTER_CATALOG[id].fictional?[...CHARACTER_CATALOG[id].name]:['Unrecorded name','姓名未记录']}return {kind:v&&typeof v==='object'&&typeof v.kind==='string'?v.kind:'unknown',actors,peopleNames,year,month,source:r.source,originSource:r.originSource||null,fromFaction:r.fromFaction||null,confidence:r.confidence||'unverified',outdated:now-(year*12+month)>24}};
 const claims=reports.filter(x=>x.date===entry.date).map(x=>project(x.report));return {owner,...claims[0],alternatives:claims.slice(1)};
}
