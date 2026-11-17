import {ROUTES} from '../data.js?v=world-kings-audience-1';
import {reportedControl} from '../control-intelligence.js?v=world-kings-audience-1';

const COLORS={interior:'#668a78',own_frontier:'#a74737',hostile:'#bd7054',foreign:'#c5a45c',unknown:'#777b76',distant:'#59666b',mixed:'#b39757'};

// Frontier is a mapped land-route relationship. Sea lanes remain in the
// military-access mode and do not imply a land border.
export function frontierEntries(state,viewer){
 const own=new Set(state.regions.filter(r=>r.owner===viewer).map(r=>r.id));
 const neighbors=new Set(),frontier=new Set();
 for(const [a,b,mode] of ROUTES){
  if(mode==='sea')continue;
  if(own.has(a)&&!own.has(b)){neighbors.add(b);frontier.add(a)}
  if(own.has(b)&&!own.has(a)){neighbors.add(a);frontier.add(b)}
 }
 return state.regions.map(region=>{
  const report=reportedControl(state,viewer,region.id);
  let kind='distant';
  if(own.has(region.id))kind=frontier.has(region.id)?'own_frontier':'interior';
  else if(neighbors.has(region.id))kind=!report||!report.owner||report.owner==='shared'?'unknown':state.wars?.some(w=>w.includes(viewer)&&w.includes(report.owner))?'hostile':'foreign';
  return {theaterId:region.id,name:region.name,kind,color:COLORS[kind],report:kind==='distant'?null:report};
 });
}

export function frontierOutlineColor(entries){
 const kinds=[...new Set(entries.map(x=>x.kind))];
 return kinds.length===1?COLORS[kinds[0]]:COLORS.mixed;
}
