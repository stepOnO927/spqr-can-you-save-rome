// A player-command route from the untouched 49 BCE Senate opening. Decisions
// use own resources, public ownership and dated scouting; no enemy army truth.
import assert from 'node:assert/strict';
import {newGrandGame,tick,moveArmy,previewMarch,queueShip,startConstruction,constructionCheck,purchaseMaterials,upgradeSave,region,respondCivilSettlement} from '../engine.js';
import {sendScouts,probePositions,requestReinforcements,assessment} from '../reconnaissance.js';
import {afterActionHtml} from '../recon-ui.js';
import {revealedAchievements} from '../achievement-system.js';

let state=newGrandGame('senate');state.seed=2654435761;
const events=[],seenBattles=new Set();
const act=(name,result)=>{events.push({date:`${state.year}/${state.month}`,name,ok:!!result?.ok,reason:result?.reason||null});return !!result?.ok};
assert.ok(act('Scout Cisalpine before choosing an offensive',sendScouts(state,'italy','cisalpine')));
assert.ok(act('Commission a third transport at Brundisium',queueShip(state,'senate','italiaS','transport')));
assert.ok(act('Withdraw Pompey along the Appian route',moveArmy(state,'pompey','italiaS')));
let firstCrossing=false,reinforced=false,returnCrossing=false,capacityBlocked=false,shipyardStarted=false,secondShipQueued=false,romeScout=false,romeAttack=false;
const frontScouts=new Map(),frontProbes=new Set();
for(let turn=0;turn<72&&!state.achievementState.finalized;turn++){
 if(state.pendingCivilSettlement)act('Decline settlement and continue',respondCivilSettlement(state,false));
 const pompey=state.armies.find(a=>a.id==='pompey'),fleet=state.naval.fleets.find(f=>f.id==='senate-adriatic');
 if(!firstCrossing&&pompey?.region==='italiaS'&&!pompey.move){firstCrossing=act('Embark 8,800 for Dyrrhachium',moveArmy(state,'pompey','epirus'))}
 if(firstCrossing&&!reinforced&&pompey?.region==='epirus'&&!pompey.move){reinforced=act('Reinforce abroad with 3,000 men',requestReinforcements(state,'pompey'))}
 if(reinforced&&!returnCrossing&&pompey?.region==='epirus'&&!pompey.move&&!pompey.reconPending){
  const plan=previewMarch(state,'pompey','italiaS');
  if(plan.reason==='transport-capacity'){
   capacityBlocked=true;
   assert.equal(plan.required,pompey.men);
   assert.equal(plan.available,9000);
   const harbor=region(state,'epirus');
   if(!harbor.buildings.includes('port')&&!harbor.construction)act('Develop the Dyrrhachium harbor',startConstruction(state,'senate','epirus','port'));
   else if(harbor.buildings.includes('port')&&!harbor.buildings.includes('shipyard')&&!harbor.construction){
    const check=constructionCheck(state,'senate','epirus','shipyard');
    if(check.reason==='materials')act('Buy timber for the shipyard',purchaseMaterials(state,'senate','timber'));
    else shipyardStarted=act('Build a Dyrrhachium shipyard',startConstruction(state,'senate','epirus','shipyard'));
   }else if(harbor.buildings.includes('shipyard')&&!secondShipQueued&&!state.naval.queues.some(q=>q.port==='epirus')){
    const queued=queueShip(state,'senate','epirus','transport');
    if(queued.reason==='materials')act('Buy timber for a fourth transport',purchaseMaterials(state,'senate','timber'));
    else secondShipQueued=act('Build a fourth transport in the same fleet',queued);
   }
  }else if(plan.ok)returnCrossing=act('Return the reinforced army to Brundisium',moveArmy(state,'pompey','italiaS'));
 }
 if(returnCrossing&&pompey&&!pompey.move&&!pompey.reconPending&&!pompey.siege&&pompey.region!=='t017'&&pompey.region!=='roma'&&region(state,pompey.region)?.owner==='senate'){
  const advance=previewMarch(state,'pompey','t017');
  if(advance.ok){
   const firstHostile=advance.path.findIndex(step=>region(state,step.id).owner!=='senate');
   if(firstHostile>0){
    const waypoint=advance.path[firstHostile-1].id;
    act('Approach the front through friendly territory',moveArmy(state,'pompey',waypoint));
   }else if(firstHostile===0){
    const target=advance.path[0].id,intel=assessment(state,'pompey',target),tries=frontScouts.get(target)||0;
    if((!intel?.report||intel.report.age>3)&&tries<2){
     if(act(`Scout ${target} before advancing`,sendScouts(state,'pompey',target)))frontScouts.set(target,tries+1);
    }else if(intel?.report?.max==null&&!frontProbes.has(target)){
     if(act(`Probe ${target} after inconclusive scouts`,probePositions(state,'pompey',target)))frontProbes.add(target);
    }else{
     events.push({date:`${state.year}/${state.month}`,name:`Front assessment: ${target}`,risk:intel?.risk,confidence:intel?.report?.confidence||null,reportedRange:intel?.report?[intel.report.min,intel.report.max]:null,friendly:pompey.men,morale:pompey.morale});
     if(pompey.morale>=55&&pompey.men>=6000&&(intel?.report?.max==null||intel.report.max<=pompey.men*1.15))act(`Advance into assessed ${target} with remaining risk`,moveArmy(state,'pompey',target));
    }
   }else act('Advance toward the Roman front through friendly territory',moveArmy(state,'pompey','t017'));
  }
 }
 if(returnCrossing&&pompey?.region==='t017'&&!pompey.move&&!pompey.reconPending&&region(state,'roma').owner==='caesar'&&!romeScout){
  romeScout=act('Scout Caesar-held Rome before battle',sendScouts(state,'pompey','roma'));
 }else if(romeScout&&!romeAttack&&pompey?.region==='t017'&&!pompey.move&&!pompey.reconPending&&region(state,'roma').owner==='caesar'){
  const intel=assessment(state,'pompey','roma');
  events.push({date:`${state.year}/${state.month}`,name:'Pre-battle assessment',risk:intel?.risk,confidence:intel?.report?.confidence||null,reportedRange:intel?.report?[intel.report.min,intel.report.max]:null});
  if(intel?.report&&intel.report.age<=3)romeAttack=act('Attack Rome after dated reconnaissance',moveArmy(state,'pompey','roma'));
 }
 tick(state);
 for(const battle of state.battles||[])if(!seenBattles.has(battle.id)){
  seenBattles.add(battle.id);
  if([battle.attacker.owner,battle.defender.owner].includes('senate'))for(const [lang,phrase] of [['en','AFTER-ACTION REVIEW'],['zh','战后复盘']])assert.match(afterActionHtml(battle,'senate',lang),new RegExp(phrase));
 }
 for(const army of state.armies.filter(a=>a.move?.sea&&!a.move.transportReady)){
  const ship=state.naval.fleets.find(f=>f.id===army.move.transportFleetId);
  assert.equal(ship?.order?.armyId,army.id,'an embarked army keeps its assigned convoy');
 }
 assert.ok(state.armies.every(a=>Number.isFinite(a.men)&&a.men>=0));
 assert.deepEqual(revealedAchievements(state),[], 'active campaigns keep achievements private');
 if([7,13,23,35,47,59].includes(turn)&&!state.achievementState.finalized){
  const before={date:`${state.year}/${state.month}`,pompey:state.armies.find(a=>a.id==='pompey')?.move,fleet:state.naval.fleets.find(f=>f.id===fleet?.id)?.order,battles:state.battles.map(b=>b.id)};
  state=upgradeSave(structuredClone(state));
  assert.deepEqual({date:`${state.year}/${state.month}`,pompey:state.armies.find(a=>a.id==='pompey')?.move,fleet:state.naval.fleets.find(f=>f.id===fleet?.id)?.order,battles:state.battles.map(b=>b.id)},before);
  events.push({date:before.date,name:'Save reload',ok:true});
 }
}
assert.ok(firstCrossing&&reinforced&&capacityBlocked&&shipyardStarted&&secondShipQueued&&returnCrossing,'the chosen campaign must solve the real lift shortage, not alter army numbers');
console.log(JSON.stringify({date:`${state.year}/${state.month}`,phase:{firstCrossing,reinforced,capacityBlocked,shipyardStarted,secondShipQueued,returnCrossing,romeScout,romeAttack},pompey:state.armies.find(a=>a.id==='pompey')&&{region:state.armies.find(a=>a.id==='pompey').region,men:state.armies.find(a=>a.id==='pompey').men},fleet:state.naval.fleets.find(f=>f.id==='senate-adriatic')&&{port:state.naval.fleets.find(f=>f.id==='senate-adriatic').port,ships:state.naval.fleets.find(f=>f.id==='senate-adriatic').ships},rome:region(state,'roma').owner,battles:state.battles.length,navalBattles:state.naval.reports.filter(r=>r.kind==='battle').length,outcome:state.achievementState.result||state.campaignOutcome?.winner||'ongoing',events},null,2));
