// Only losses of the player's own theaters enter the Chronicle as confirmed
// control changes. Foreign control reports can be delayed or mistaken.
export function recentPlayerTerritoryLosses(state,months=3){
 const now=state.year*12+state.month,regions=new Map(state.regions.map(r=>[r.id,r]));
 const seen=new Set();
 return (state.chronicle?.entries||[]).filter(entry=>{
  if(entry.kind!=='territory'||entry.previous!==state.player||!regions.has(entry.region)||seen.has(entry.region))return false;
  const age=now-(entry.year*12+entry.month),region=regions.get(entry.region);
  if(age<0||age>months||region.owner===state.player)return false;
  seen.add(entry.region);
  return true;
 });
}
