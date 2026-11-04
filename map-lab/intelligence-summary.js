// A presentation projection of one observer's reports, never the simulated court.
const key=ids=>JSON.stringify([...new Set(ids||[])].sort());
const observed=r=>(r.observationYear??r.year)*12+(r.observationMonth??r.month);
export function leadershipIntelligence(state,viewer,target){
 const knowledge=state.knowledge?.[viewer]?.[target];
 if(!knowledge)return {confidence:'unknown',observed:null,lastVerified:null};
 const reports=(knowledge.reports||[]).filter(r=>r.kind==='leaders'&&Array.isArray(r.leaders));
 const matches=reports.filter(r=>key(r.leaders)===key(knowledge.reportedLeaders)).sort((a,b)=>observed(b)-observed(a));
 const selected=matches[0],age=selected?(state.year*12+state.month-observed(selected)):null;
 const verified=reports.filter(r=>r.verified).sort((a,b)=>observed(b)-observed(a))[0];
 return {
  confidence:selected?(age>24?'outdated':selected.confidence||'unverified'):(knowledge.reportedLeaders?.length?'unverified':'unknown'),
  observed:selected?{year:selected.observationYear??selected.year,month:selected.observationMonth??selected.month}:null,
  lastVerified:verified?{year:verified.observationYear??verified.year,month:verified.observationMonth??verified.month}:null
 };
}
