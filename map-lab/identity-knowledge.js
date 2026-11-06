// Project identity presentation only from the viewer's own records. Historical
// artwork is interpretive even when several reports agree on a name.
export function identityKnowledge(s,id){
 if(s.world?.characters?.[id]?.faction===s.player)return {kind:'own'};
 const targets=Object.values(s.knowledge?.[s.player]||{}),reports=targets.flatMap(k=>k.reports||[]),now=s.year*12+s.month;
 const names=(r)=>r.kind==='leaders'||r.kind==='claimants'?r.leaders||[]:r.kind?.startsWith('office_')&&r.value!=='unknown'?[r.value]:r.kind==='authority'&&r.value&&typeof r.value==='object'?r.value.actors||[]:[];
 const verified=reports.some(r=>{const date=(r.observationYear??r.year)*12+(r.observationMonth??r.month),age=now-date;return r.verified===true&&r.confidence==='confirmed'&&age>=0&&age<=24&&names(r).includes(id)});
 if(verified)return {kind:'corroborated'};
 const meetings=(s.meetings||[]).filter(m=>m.actor===s.player&&m.target===id&&m.status==='met').map(m=>({year:m.resolvedYear??m.year,month:m.resolvedMonth??m.month})).filter(m=>Number.isFinite(m.year)&&Number.isFinite(m.month)&&m.year*12+m.month<=now).sort((a,b)=>(b.year*12+b.month)-(a.year*12+a.month));
 if(meetings.length)return {kind:'met',...meetings[0]};
 const reported=targets.some(k=>(k.reportedLeaders||[]).includes(id)||(k.commanderReports||[]).some(r=>r.commanderId===id)||Object.values(k.sightings||{}).some(r=>r.commanderId===id)||(k.reports||[]).some(r=>names(r).includes(id)||(['health','age','location','conspiracy'].includes(r.kind)&&r.character===id)));
 return {kind:reported?'reported':'unknown'};
}
