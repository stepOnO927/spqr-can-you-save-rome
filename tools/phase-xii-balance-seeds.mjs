import assert from 'node:assert/strict';
import {newGrandGame,region,tick,isWar} from '../engine.js';

// Compare several deterministic campaigns without declaring any one outcome
// correct. The player observes as Egypt so both Roman commands use the AI.
for(const seed of [1,2,3,4,5]){
 const state=newGrandGame('egypt');state.seed=seed;
 for(let month=0;month<36&&!state.achievementState.finalized;month++){
  tick(state);
  assert.ok(isWar(state,'caesar','senate')||state.civilWarOutcome?.winner,'the civil war cannot disappear without a formal result');
  assert.equal(state.regions.length,120);
  assert.ok(state.armies.every(army=>Number.isFinite(army.men)&&army.men>=0));
  assert.ok(Object.values(state.factions).every(faction=>Number.isFinite(faction.treasury)));
 }
 const caesar=state.regions.filter(r=>r.owner==='caesar').length;
 const senate=state.regions.filter(r=>r.owner==='senate').length;
 console.log(`seed ${seed}: Caesar ${caesar}, Senate ${senate}, Rome ${region(state,'roma').owner}, Caesar field ${state.armies.filter(a=>a.owner==='caesar').reduce((men,a)=>men+a.men,0)}, civil war ${isWar(state,'caesar','senate')?'ongoing':`${state.civilWarOutcome?.kind}:${state.civilWarOutcome?.winner}`}`);
}
