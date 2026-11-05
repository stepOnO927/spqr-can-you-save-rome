// Locations are theater-level simulation data, not confirmed city residences.
export function friendlyPersonnelInTheater(state, theater){
 return Object.values(state.world?.characters||{}).filter(person=>{
  if(person.faction!==state.player||!person.alive||person.location!==theater||person.travel)return false;
  // A commander in transit is not known to be stationary at either end of the route.
  return !state.armies.some(army=>army.characterId===person.id&&army.move);
 }).map(person=>person.id);
}
