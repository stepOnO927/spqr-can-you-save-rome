// Observe actual AI embarkation, sea travel and landing over long campaigns.
import assert from 'node:assert/strict';
import {newGrandGame,tick} from '../engine.js';

const months=Number(process.argv.find(arg=>arg.startsWith('--months='))?.slice(9)??120);
const seeds=Number(process.argv.find(arg=>arg.startsWith('--seeds='))?.slice(8)??3);
assert.ok(Number.isInteger(months)&&months>=12&&months<=240);
assert.ok(Number.isInteger(seeds)&&seeds>=1&&seeds<=12);
const results=[];
for(let sample=1;sample<=seeds;sample++){
 const state=newGrandGame('egypt');state.seed=(Math.imul(sample,2654435761)>>>0)||1;
 const moves=[],landings=[],broken=[];
 for(let turn=0;turn<months;turn++){
  const priorArmies=new Map(state.armies.map(a=>[a.id,{region:a.region,move:a.move&&{...a.move}}]));
  tick(state);
  for(const a of state.armies){
   if(!['caesar','senate'].includes(a.owner))continue;
   const before=priorArmies.get(a.id);
   if(a.move?.sea&&(!before?.move?.sea||before.move.to!==a.move.to))moves.push({turn:turn+1,owner:a.owner,army:a.id,from:a.region,to:a.move.to,fleet:a.move.transportFleetId});
   if(before?.move?.sea&&before.region!==a.region)landings.push({turn:turn+1,owner:a.owner,army:a.id,from:before.region,to:a.region});
   if(a.move?.sea&&!a.move.transportReady){
    const fleet=state.naval.fleets.find(f=>f.id===a.move.transportFleetId);
    if(!fleet||fleet.owner!==a.owner||fleet.order?.armyId!==a.id)broken.push({turn:turn+1,owner:a.owner,army:a.id,fleet:a.move.transportFleetId,order:fleet?.order?.kind});
   }
  }
 }
 assert.deepEqual(broken,[],'An embarking AI army lost its assigned transport fleet');
 results.push({sample,months,seaMoves:moves.length,landings:landings.length,moves,landings,warOutcome:state.civilWarOutcome?.winner||'ongoing'});
}
console.log(JSON.stringify(results,null,2));
