import {isDeliveredReport} from '../person-knowledge.js?v=dossier-archive-1';
// A presentation projection of one observer's reports, never the simulated court.
const key=ids=>JSON.stringify([...new Set(ids||[])].sort());
const observed=r=>{const year=r.observationYear??r.year,month=r.observationMonth??r.month;return Number.isFinite(year)&&Number.isInteger(month)?year*12+month:-Infinity};
export function leadershipIntelligence(state,viewer,target){
 const knowledge=state.knowledge?.[viewer]?.[target];
 if(!knowledge)return {confidence:'unknown',observed:null,lastVerified:null};
 const archived=new Set(knowledge.reportArchive||[]),reports=[...(knowledge.reports||[]),...archived].filter(r=>isDeliveredReport(state,r)&&r.kind==='leaders'&&Array.isArray(r.leaders)&&r.leaders.length>0);
 const matches=reports.filter(r=>key(r.leaders)===key(knowledge.reportedLeaders)).sort((a,b)=>observed(b)-observed(a));
 const selected=matches[0],age=selected?(state.year*12+state.month-observed(selected)):null;
 const verified=reports.filter(r=>r.verified&&Number.isFinite(observed(r))).sort((a,b)=>observed(b)-observed(a))[0];
 return {
  confidence:selected?(Number.isFinite(age)?age>24?'outdated':archived.has(selected)?selected.baseConfidence==='rumor'?'rumor':'unverified':selected.confidence||'unverified':'unverified'):(knowledge.reportedLeaders?.length?'unverified':'unknown'),
  observed:selected&&Number.isFinite(observed(selected))?{year:selected.observationYear??selected.year,month:selected.observationMonth??selected.month}:null,
  lastVerified:verified?{year:verified.observationYear??verified.year,month:verified.observationMonth??verified.month}:null
 };
}
