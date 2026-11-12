import assert from 'node:assert/strict';
import {newGrandGame,region,tick,isWar} from '../engine.js';

// Compare deterministic campaigns without declaring any one outcome correct.
// The player observes as Egypt so both Roman commands use the AI.
// --long checks twelve seeds across six years; the default is a fast 36-month check.
// --months=N extends the twelve-seed check to expose late campaign stalemates.
const requested=process.argv.find(arg=>arg.startsWith('--months='));
const duration=requested?Number(requested.slice('--months='.length)):null;
if(requested&&(!Number.isInteger(duration)||duration<1||duration>240))throw new Error('Use --months=1..240');
const long=process.argv.includes('--long')||requested!=null,months=duration??(long?72:36),seeds=long?12:5;
const outcomes={};
for(let seed=1;seed<=seeds;seed++){
 const state=newGrandGame('egypt');state.seed=seed;
 for(let month=0;month<months&&!state.civilWarOutcome;month++){
  tick(state);
  assert.ok(isWar(state,'caesar','senate')||state.civilWarOutcome?.winner,'the civil war cannot disappear without a formal result');
  if(state.civilWarOutcome)assert.equal(isWar(state,'caesar','senate'),false,'a concluded civil war must no longer be an active war');
  assert.equal(state.regions.length,120);
  assert.ok(state.armies.every(army=>Number.isFinite(army.men)&&army.men>=0));
  assert.ok(Object.values(state.factions).every(faction=>Number.isFinite(faction.treasury)));
 }
 const caesar=state.regions.filter(r=>r.owner==='caesar').length;
 const senate=state.regions.filter(r=>r.owner==='senate').length;
 const winner=state.civilWarOutcome?.winner||'ongoing';outcomes[winner]=(outcomes[winner]||0)+1;
 console.log(`seed ${seed}: Caesar ${caesar}, Senate ${senate}, Rome ${region(state,'roma').owner}, Caesar field ${state.armies.filter(a=>a.owner==='caesar').reduce((men,a)=>men+a.men,0)}, civil war ${state.civilWarOutcome?`${state.civilWarOutcome.kind}:${state.civilWarOutcome.winner}`:'ongoing'}`);
}
console.log(`${months}-month outcomes: ${JSON.stringify(outcomes)}`);
