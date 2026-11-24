import {ROUTES} from './data.js?v=phase-x-1';
import {reportedControl} from './control-intelligence.js?v=control-delivery-1';

const atWar=(s,a,b)=>a!==b&&s.wars.some(w=>w.includes(a)&&w.includes(b));

// A court plots civilian travel using its own reported control. A change on
// the road is checked against actual control when the traveler reaches it.
export function personTravelRoute(s,person,owner,destination){
 if(!person?.location||person.location===destination||!s.regions.some(r=>r.id===destination))return null;
 const distances={[person.location]:0},paths={[person.location]:[]},unvisited=new Set(s.regions.map(r=>r.id));
 while(unvisited.size){
  const current=[...unvisited].filter(id=>distances[id]!==undefined).sort((a,b)=>distances[a]-distances[b])[0];
  if(!current)break;unvisited.delete(current);if(current===destination)break;
  for(const edge of ROUTES.filter(x=>x[0]===current||x[1]===current)){
   const next=edge[0]===current?edge[1]:edge[0],region=s.regions.find(r=>r.id===next);
   if(!region||!unvisited.has(next)||atWar(s,owner,reportedControl(s,owner,next)?.owner))continue;
   const months=(edge[2]==='sea'?3:1)+(['hills','desert'].includes(region.terrain)?1:0)+(['frail','wounded'].includes(person.health)?1:0),distance=distances[current]+months;
   if(distances[next]===undefined||distance<distances[next]){distances[next]=distance;paths[next]=[...paths[current],{to:next,months,sea:edge[2]==='sea'}]}
  }
 }
 return paths[destination]?{legs:paths[destination],months:distances[destination],cost:3+paths[destination].filter(leg=>leg.sea).length*8}:null;
}
