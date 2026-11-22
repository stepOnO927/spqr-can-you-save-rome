import assert from 'node:assert/strict';
import {newGrandGame,region,tick,isWar} from '../engine.js';

// Compare deterministic campaigns without declaring any one outcome correct.
// The player observes as Egypt so both Roman commands use the AI.
// --long checks twelve widely separated seeds across six years; the default is
// a fast 36-month check. Adjacent LCG seeds 1..12 produced near-identical
// openings and the same settlement window, so --legacy-seeds exists only to
// reproduce older reports.
// --months=N extends the twelve-seed check to expose late campaign stalemates.
const requested=process.argv.find(arg=>arg.startsWith('--months='));
const duration=requested?Number(requested.slice('--months='.length)):null;
if(requested&&(!Number.isInteger(duration)||duration<1||duration>240))throw new Error('Use --months=1..240');
const long=process.argv.includes('--long')||requested!=null,months=duration??(long?72:36),seeds=long?12:5,legacySeeds=process.argv.includes('--legacy-seeds');
const outcomes={};
// Count the battle outcome, not how or why the AI issued the march orders.
const groupedAssaults={caesar:0,senate:0};
for(let seed=1;seed<=seeds;seed++){
 const state=newGrandGame('egypt'),variantSeed=legacySeeds?seed:Math.imul(seed,0x9e3779b1)>>>0;state.seed=variantSeed;
 const foodProjects=new Set();
 for(let month=0;month<months&&!state.civilWarOutcome;month++){
  tick(state);
  for(const site of state.regions)if(['caesar','senate'].includes(site.owner)&&['irrigation','grain-mill'].includes(site.construction?.buildingId))foodProjects.add(`${site.owner}:${site.id}:${site.construction.buildingId}`);
  assert.ok(isWar(state,'caesar','senate')||state.civilWarOutcome?.winner,'the civil war cannot disappear without a formal result');
  if(state.civilWarOutcome)assert.equal(isWar(state,'caesar','senate'),false,'a concluded civil war must no longer be an active war');
  assert.equal(state.regions.length,121);
  assert.ok(state.armies.every(army=>Number.isFinite(army.men)&&army.men>=0));
  assert.ok(Object.values(state.factions).every(faction=>Number.isFinite(faction.treasury)));
 }
 const caesar=state.regions.filter(r=>r.owner==='caesar').length;
 const senate=state.regions.filter(r=>r.owner==='senate').length;
 const winner=state.civilWarOutcome?.winner||'ongoing';outcomes[winner]=(outcomes[winner]||0)+1;
 const grouped={caesar:0,senate:0};for(const battle of state.battles||[])if(grouped[battle.attacker.owner]!=null&&battle.attacker.formations?.length>1)grouped[battle.attacker.owner]++;
 for(const id of ['caesar','senate'])groupedAssaults[id]+=grouped[id];
 console.log(`seed ${seed} (${variantSeed}): Caesar ${caesar}, Senate ${senate}, Rome ${region(state,'roma').owner}, Caesar field ${state.armies.filter(a=>a.owner==='caesar').reduce((men,a)=>men+a.men,0)}, food projects Caesar ${[...foodProjects].filter(x=>x.startsWith('caesar:')).length}/Senate ${[...foodProjects].filter(x=>x.startsWith('senate:')).length}, grouped assault battles Caesar ${grouped.caesar}/Senate ${grouped.senate}, civil war ${state.civilWarOutcome?`${state.civilWarOutcome.kind}:${state.civilWarOutcome.winner}`:'ongoing'}`);
}
console.log(`${months}-month ${legacySeeds?'legacy adjacent':'spaced'}-seed outcomes: ${JSON.stringify(outcomes)}`);
console.log(`Grouped Roman assault battles in this cohort: ${JSON.stringify(groupedAssaults)}`);
