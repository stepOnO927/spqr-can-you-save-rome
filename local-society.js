import {grandAdjacent} from './grand-operations.js';

const traditionFor=owner=>({caesar:'roman-cults',senate:'roman-cults',egypt:'egyptian-cults',galatia:'local-cults',bosporus:'hellenic-cults',parthia:'local-cults',armenia:'local-cults',numidia:'local-cults',mauretania:'local-cults'})[owner]||'local-cults';
export function provinceFaith(region){
 const dominant=({egypt:'egyptian-cults',achaia:'hellenic-cults',epirus:'hellenic-cults',anatolia:'hellenic-cults',bosporus:'hellenic-cults'})[region.macro]||(['parthia','armenia','galatia','africa','numidia','mauretania'].includes(region.macro)?'local-cults':'roman-cults');
 const minority=dominant==='roman-cults'?'local-cults':dominant==='egyptian-cults'?'hellenic-cults':'roman-cults';
 return [{id:dominant,share:70},{id:minority,share:30}];
}
export function initializeLocalSociety(state){if(!state.grandMap)return state;for(const r of state.regions){r.faiths ||= provinceFaith(r);r.initialPopulation ||= r.population;r.civicSatisfaction ??= r.loyalty;r.integration ??= 55}return state}
export function faithSatisfaction(state,region){if(!state.grandMap||state.month%3!==0)return 0;const accommodation=state.development?.[region.owner]?.slots?.culture?.includes('cultural-accommodation');if(accommodation)return region.integration<85?1:0;return region.integration<65&&region.faiths?.[0]?.id!==traditionFor(region.owner)?-1:0}
export function advanceDemography(state){
 if(!state.grandMap)return;
 const changes=[];
 for(const r of state.regions){const faction=state.factions[r.owner];if(!faction||r.owner==='rebels')continue;const population=r.population||0;if(faction.food<0){r.population=Math.max(1000,Math.round(population*.998));r.civicSatisfaction=Math.max(0,r.civicSatisfaction-1)}else if(r.civicSatisfaction>65)r.population=Math.round(population*1.0003);
  if(r.civicSatisfaction>=35)continue;
  const destination=grandAdjacent(r.id).map(e=>state.regions.find(x=>x.id===e.to)).filter(x=>x?.owner===r.owner&&x.civicSatisfaction>r.civicSatisfaction+20).sort((a,b)=>b.civicSatisfaction-a.civicSatisfaction)[0];
  if(destination)changes.push({from:r,to:destination,people:Math.min(150,Math.floor(population*.002))});
 }
 for(const {from,to,people} of changes){if(from.population-people<1000)continue;from.population-=people;to.population+=people}
}
