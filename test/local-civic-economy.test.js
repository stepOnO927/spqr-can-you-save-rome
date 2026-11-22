import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave} from '../engine.js?v=world-kings-meeting-1';
import {configureStartingDifficulty} from '../difficulty.js';
import {advanceLocalCivicEconomy,localEntity} from '../local-polities.js';
import {inspectState} from '../inspector-diagnostics.js?v=world-kings-meeting-1';

test('an independent city pays its own civilians and guard without taking theater revenue',()=>{
 const state=newGame('caesar'),city=localEntity(state,'massilia');
 const host={treasury:state.factions.caesar.treasury,food:state.factions.caesar.food};
 state.month=2;advanceLocalCivicEconomy(state);
 assert.deepEqual(city.lastCivicBudget,{year:-49,month:2,production:2,harvest:0,civilianNeed:1,guardNeed:1,tax:1,upkeep:1,storageCap:20,spoilage:0,foodShortfall:0,payShortfall:0});
 assert.equal(city.food,12);assert.equal(city.treasury,20);
 assert.deepEqual({treasury:state.factions.caesar.treasury,food:state.factions.caesar.food},host);
 assert.equal(state.regions.find(region=>region.id==='narbo').owner,'caesar');
 advanceLocalCivicEconomy(state);assert.equal(city.food,12);
 state.month=9;advanceLocalCivicEconomy(state);assert.equal(city.food,14);assert.equal(city.lastCivicBudget.harvest,2);
 const loaded=upgradeSave(structuredClone(state));assert.deepEqual(localEntity(loaded,'massilia').lastCivicBudget,city.lastCivicBudget);
 assert.equal(inspectState(loaded).some(f=>f.code==='invalid-local-civic-budget'),false);
});

test('a local food or pay shortfall has bounded real population and militia consequences',()=>{
 const state=newGame('caesar'),city=localEntity(state,'massilia');
 city.population=6000;city.militia=5000;city.food=0;city.treasury=0;state.month=2;
 advanceLocalCivicEconomy(state);
 assert.equal(city.lastCivicBudget.foodShortfall,2);assert.equal(city.lastCivicBudget.payShortfall,2);
 assert.equal(city.food,0);assert.equal(city.treasury,0);assert.equal(city.population,5940);assert.equal(city.militia,4840);
});

test('occupation suspends the autonomous budget, while an ordinary turn settles it once',()=>{
 const state=newGame('caesar'),city=localEntity(state,'massilia');state.month=8;
 tick(state);assert.equal(state.month,9);assert.equal(city.food,14);assert.equal(city.lastCivicBudget.month,9);
 const occupied=newGame('caesar'),subject=localEntity(occupied,'massilia');subject.controller='caesar';occupied.month=2;
 advanceLocalCivicEconomy(occupied);assert.equal(subject.lastCivicBudget,undefined);assert.equal(subject.food,12);
});

test('Inspector reports a forged local budget',()=>{
 const state=newGame('caesar'),city=localEntity(state,'massilia');city.lastCivicBudget={year:-49,month:2,production:-1};
 assert.equal(inspectState(state).some(f=>f.code==='invalid-local-civic-budget'),true);
});

test('generated civic officers have stable names and pay for their real fiscal benefits',()=>{
 const state=configureStartingDifficulty(newGame('caesar'),'expert',false,{localSeed:11});
 const city=localEntity(state,'generated:sicilia'),officers=city.civicOfficers;
 assert.ok(officers?.steward&&officers?.captain);
 assert.notEqual(officers.steward.name[0],officers.captain.name[0]);
 assert.equal(city.ruler.name[0].endsWith(` ${officers.steward.name[0]}`),false);
 assert.equal(city.ruler.name[0].endsWith(` ${officers.captain.name[0]}`),false);
 assert.deepEqual(officers,localEntity(configureStartingDifficulty(newGame('caesar'),'expert',false,{localSeed:11}),'generated:sicilia').civicOfficers);
 const withoutOfficers=structuredClone(state);delete localEntity(withoutOfficers,city.id).civicOfficers;
 state.month=2;withoutOfficers.month=2;
 advanceLocalCivicEconomy(state);advanceLocalCivicEconomy(withoutOfficers);
 const baseline=localEntity(withoutOfficers,city.id);
 assert.equal(city.lastCivicBudget.tax-baseline.lastCivicBudget.tax,city.lastCivicBudget.stewardBenefit);
 assert.equal(baseline.lastCivicBudget.upkeep-city.lastCivicBudget.upkeep,city.lastCivicBudget.captainBenefit);
 assert.equal(city.treasury-baseline.treasury,city.lastCivicBudget.stewardBenefit+city.lastCivicBudget.captainBenefit);
 assert.deepEqual(localEntity(upgradeSave(structuredClone(state)),city.id).civicOfficers,officers);
 assert.equal(inspectState(state).some(f=>f.code==='invalid-local-civic-officers'),false);
 officers.steward.skill=99;
 assert.equal(inspectState(state).some(f=>f.code==='invalid-local-civic-officers'),true);
});

test('historical and seeded generated cities start stronger and maintain valid budgets over two years',()=>{
 for(const id of ['massilia','generated:sicilia']){
  let priorOpening=null,priorAfter=null;
  for(const mode of ['travel','beginner','standard','hard','expert']){
   const state=configureStartingDifficulty(newGame('caesar'),mode,false,{localSeed:11}),city=localEntity(state,id);
   assert.ok(city);
   const opening={population:city.population,militia:city.militia,treasury:city.treasury,food:city.food};
   if(priorOpening)for(const key of Object.keys(opening))assert.ok(opening[key]>=priorOpening[key],`${id} ${mode} opening ${key}`);
   priorOpening=opening;
   for(let month=0;month<24;month++){state.month++;if(state.month>12){state.month=1;state.year++}advanceLocalCivicEconomy(state)}
   const current={population:city.population,militia:city.militia,treasury:city.treasury,food:city.food};
   assert.ok(current.food>=0&&current.treasury>=0&&city.lastCivicBudget);
   if(priorAfter)for(const key of ['population','militia','treasury'])assert.ok(current[key]>=priorAfter[key],`${id} ${mode} ${key}: ${current[key]} < ${priorAfter[key]}`);
   priorAfter=current;
  }
 }
});
