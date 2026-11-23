// Observe actual AI embarkation, sea travel and landing over long campaigns.
import assert from 'node:assert/strict';
import {newGrandGame,tick} from '../engine.js';

const months=Number(process.argv.find(arg=>arg.startsWith('--months='))?.slice(9)??120);
const seeds=Number(process.argv.find(arg=>arg.startsWith('--seeds='))?.slice(8)??3);
const selectedSample=Number(process.argv.find(arg=>arg.startsWith('--sample='))?.slice(9)??0);
assert.ok(Number.isInteger(months)&&months>=12&&months<=240);
assert.ok(Number.isInteger(seeds)&&seeds>=1&&seeds<=12);
assert.ok(Number.isInteger(selectedSample)&&selectedSample>=0&&selectedSample<=12);
const results=[];
for(let sample=selectedSample||1;sample<=(selectedSample||seeds);sample++){
 const state=newGrandGame('egypt');state.seed=(Math.imul(sample,2654435761)>>>0)||1;
 const moves=[],landings=[],returnVoyages=[],returnArrivals=[],broken=[];
 for(let turn=0;turn<months;turn++){
  const priorArmies=new Map(state.armies.map(a=>[a.id,{region:a.region,move:a.move&&{...a.move}}]));
  const priorOwners=new Map(state.regions.map(r=>[r.id,r.owner]));
  tick(state);
  for(const a of state.armies){
   if(!['caesar','senate'].includes(a.owner))continue;
   const before=priorArmies.get(a.id);
   if(a.move?.sea&&!a.move.returning&&(!before?.move?.sea||before.move.returning||before.move.to!==a.move.to))moves.push({turn:turn+1,owner:a.owner,army:a.id,from:a.region,to:a.move.to,targetOwner:priorOwners.get(a.move.to),fleet:a.move.transportFleetId});
   if(a.move?.returning&&!before?.move?.returning)returnVoyages.push({turn:turn+1,owner:a.owner,army:a.id,to:a.move.to,fleet:a.move.transportFleetId});
   if(before?.move?.sea&&before.region!==a.region){
    if(before.move.returning)returnArrivals.push({turn:turn+1,owner:a.owner,army:a.id,arrived:a.region});
    else if(a.region===before.move.to)landings.push({turn:turn+1,owner:a.owner,army:a.id,from:before.region,to:a.region,targetOwnerBefore:priorOwners.get(a.region),targetOwnerAfter:state.regions.find(r=>r.id===a.region)?.owner,battle:state.battles.find(b=>b.year===state.year&&b.month===state.month&&b.region===a.region&&b.attacker.owner===a.owner)?.attackerWins??null});
   }
   if(a.move?.sea&&!a.move.transportReady){
    const fleet=state.naval.fleets.find(f=>f.id===a.move.transportFleetId);
    if(!fleet||fleet.owner!==a.owner||fleet.order?.armyId!==a.id)broken.push({turn:turn+1,owner:a.owner,army:a.id,fleet:a.move.transportFleetId,order:fleet?.order?.kind});
   }
  }
 }
 assert.deepEqual(broken,[],'An embarking AI army lost its assigned transport fleet');
 results.push({sample,months,outboundVoyages:moves.length,completedLandings:landings.length,returnVoyages:returnVoyages.length,returnArrivals:returnArrivals.length,moves,landings,returnVoyagesDetails:returnVoyages,returnArrivalsDetails:returnArrivals,warOutcome:state.civilWarOutcome?.winner||'ongoing'});
}
console.log(JSON.stringify(results,null,2));
