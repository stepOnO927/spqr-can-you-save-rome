import assert from 'node:assert/strict';
import {newGrandGame,upgradeSave,tick,nationalBudget,armySupply} from '../engine.js';

// No-order 36-month paths for every playable independent command. The audit
// checks survival and save continuity, not a predetermined diplomatic result.
for(const id of ['egypt','numidia','mauretania','armenia','parthia','galatia','bosporus']){
 let state=newGrandGame(id);
 const ownArmy=state.armies.find(army=>army.owner===id);
 assert.ok(ownArmy&&armySupply(state,ownArmy)>=.95,`${id} must begin with an established home supply line`);
 if(id!=='egypt'){
  const budget=nationalBudget(state,id);
  assert.ok(budget.projectedNet>=0&&budget.foodNet>=0,`${id} opening force must be maintainable`);
 }
 for(let month=0;month<36;month++){
  if(month===18)state=upgradeSave(JSON.parse(JSON.stringify(state)));
  tick(state);
  assert.equal(state.regions.length,120);
  assert.ok(state.armies.every(army=>Number.isFinite(army.men)&&army.men>=0));
  assert.ok(Object.values(state.factions).every(faction=>Number.isFinite(faction.treasury)&&Number.isFinite(faction.food)));
 }
 const treasury=state.factions[id].treasury,food=state.factions[id].food,stability=state.factions[id].stability;
 const field=state.armies.filter(army=>army.owner===id).reduce((men,army)=>men+army.men,0);
 const holdings=state.regions.filter(region=>region.owner===id).length;
 const wars=state.wars.filter(war=>war.includes(id));
 if(!wars.length&&state.regions.find(region=>region.id===id)?.owner===id){
  assert.ok(field>=2000,`${id} should not silently starve its home army in peace`);
  assert.ok(food>=0&&stability>=35,`${id} should not collapse economically while idle at home`);
 }
 console.log(`${id}: ${holdings} theaters, ${field} field troops, treasury ${treasury}, food ${food}, stability ${stability}, wars ${wars.length}`);
}
