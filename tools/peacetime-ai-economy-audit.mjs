import assert from 'node:assert/strict';
import {newGrandGame,tick,nationalBudget} from '../engine.js';

const months=Number(process.argv.find(arg=>arg.startsWith('--months='))?.slice(9)??120);
const seeds=Number(process.argv.find(arg=>arg.startsWith('--seeds='))?.slice(8)??12);
assert.ok(Number.isInteger(months)&&months>=36&&months<=120);
assert.ok(Number.isInteger(seeds)&&seeds>=1&&seeds<=24);

const courts=['numidia','mauretania','armenia','parthia','galatia','bosporus'];
const failures=[],histories=[];
for(let sample=1;sample<=seeds;sample++){
 const state=newGrandGame('egypt');
 state.seed=(Math.imul(sample,2654435761)>>>0)||1;
 const everAtWar=new Set();
 for(let turn=0;turn<months;turn++){
  tick(state);
  for(const court of courts)if(state.wars.some(war=>war.includes(court)))everAtWar.add(court);
 }
 for(const court of courts){
  if(everAtWar.has(court))continue;
  const faction=state.factions[court],development=state.development[court];
  const record={sample,court,treasury:faction.treasury,stability:faction.stability,monthlyNet:nationalBudget(state,court).projectedNet,activeIdeas:Object.values(development.slots).flat().filter(Boolean).length};
  histories.push(record);
  if(record.treasury<0||record.stability<35)failures.push(record);
 }
}
assert.ok(histories.length>0,'the sample must contain at least one peaceful court');
console.log(JSON.stringify({months,seeds,peacefulCourts:histories.length,withActiveIdeas:histories.filter(x=>x.activeIdeas>0).length,failures},null,2));
assert.deepEqual(failures,[],'a court that remains at peace must not bankrupt itself on optional idea upkeep');
