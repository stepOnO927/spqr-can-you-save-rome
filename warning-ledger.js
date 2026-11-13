// The recipient learns of a warning only upon delivery. There is no return
// courier, so the sender knows neither transport outcomes nor the decision.
export function warningLedger(s,viewer){
 return (s.warningLetters||[]).filter(l=>l.from===viewer||(l.to===viewer&&Number.isFinite(l.deliveredYear)&&Number.isFinite(l.deliveredMonth))).map(l=>{
  const own=l.from===viewer;
  const initial={status:'sent',year:l.sentYear,month:l.sentMonth};
  return {id:l.id,from:l.from,to:l.to,threat:l.threat,near:l.near,status:own?'sent':l.status,sentYear:l.sentYear,sentMonth:l.sentMonth,sighting:{...l.sighting,strengthBand:[...l.sighting.strengthBand]},history:own?[initial]:(l.history||[]).filter(h=>['responded','unresponded'].includes(h.status)&&h.year*12+h.month>=l.deliveredYear*12+l.deliveredMonth).map(h=>({...h})),...(!own?{decision:l.decision?.kind||null}:{})};
 });
}
