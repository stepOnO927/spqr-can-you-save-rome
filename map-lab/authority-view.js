import {reportedControl} from '../control-intelligence.js?v=4';
import {deriveGovernment} from '../governance.js?v=21';

// Project government authority from the viewer's own state or dated reports.
// The theater-level political authority is not a claim of presence in a city.
export function authorityForTheater(state,theater){
 const viewer=state.player,control=reportedControl(state,viewer,theater),owner=control?.owner;
 if(!owner||owner==='shared'||owner==='rebels')return {kind:'unknown',actors:[],owner:owner||null};
 if(control.own){const government=deriveGovernment(state,viewer);return {owner,kind:government.kind,actors:[...government.acting],own:true};}
 const reports=(state.knowledge?.[viewer]?.[owner]?.reports||[]).filter(r=>r.kind==='authority').map((r,index)=>({report:r,index,date:(r.observationYear??r.year)*12+(r.observationMonth??r.month)})).filter(x=>Number.isFinite(x.date)).sort((a,b)=>b.date-a.date||a.index-b.index);
 const entry=reports[0];if(!entry)return {owner,kind:'unknown',actors:[]};
 const r=entry.report,v=r.value,year=r.observationYear??r.year,month=r.observationMonth??r.month;
 return {owner,kind:v&&typeof v==='object'&&typeof v.kind==='string'?v.kind:'unknown',actors:v&&typeof v==='object'&&Array.isArray(v.actors)?[...v.actors]:[],year,month,source:r.source,confidence:r.confidence||'unverified',outdated:(state.year-year)*12+state.month-month>24};
}
