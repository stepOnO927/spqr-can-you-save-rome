// Run a counterfactual Adriatic front to exercise actual AI sea transport.
import assert from 'node:assert/strict';
import {newGrandGame,aiTurn,tick,upgradeSave} from '../engine.js';
import {orderFleet} from '../naval.js';

const seeds=Number(process.argv.find(arg=>arg.startsWith('--seeds='))?.slice(8)??3);
const months=Number(process.argv.find(arg=>arg.startsWith('--months='))?.slice(9)??36);
const hostileSea=process.argv.includes('--hostile-sea');
const strongHostileSea=process.argv.includes('--strong-hostile-sea');
assert.ok(Number.isInteger(seeds)&&seeds>=1&&seeds<=12);
assert.ok(Number.isInteger(months)&&months>=12&&months<=120);
const campaigns=[];
for(let sample=1;sample<=seeds;sample++){
 let state=newGrandGame('egypt');state.seed=(Math.imul(sample,2654435761)>>>0)||1;
 // The enemy-held Adriatic shore creates a real naval front in an otherwise
 // standard campaign. This setup is a balance test, not a historical claim.
 for(const r of state.regions)if(r.macro==='illyricum')r.owner='caesar';
 const army=state.armies.find(a=>a.id==='italy'),fleet=state.naval.fleets.find(f=>f.id==='senate-adriatic');
 army.region='italiaS';army.men=5200;fleet.port='italiaS';fleet.zone='adriatic';fleet.reserve=false;fleet.order=null;
 aiTurn(state,'senate');
 assert.equal(army.move?.sea,true,'Senate AI should order a real crossing toward the hostile coast');
 assert.equal(army.move?.transportFleetId,fleet.id);
 assert.equal(fleet.order?.kind,'transport');
 if(hostileSea||strongHostileSea){
  const enemy=state.naval.fleets.find(f=>f.id==='caesar-adriatic');
  assert.equal(orderFleet(state,'caesar',enemy.id,'intercept','adriatic').ok,true);
  if(strongHostileSea){enemy.ships={quinquereme:4,trireme:2};enemy.sailors=1500;enemy.hull=100;enemy.morale=80;enemy.supply=100}
 }
 const events=[],broken=[];let reloads=0;
 for(let turn=0;turn<months;turn++){
  const before=state.armies.find(a=>a.id==='italy');
  const oldRegion=before?.region,oldMove=before?.move&&{...before.move};
  tick(state);
  const unit=state.armies.find(a=>a.id==='italy'),ship=state.naval.fleets.find(f=>f.id==='senate-adriatic');
  if(turn<6||oldRegion!==unit?.region||oldMove?.sea&&!unit?.move?.sea)events.push({turn:turn+1,armyRegion:unit?.region,armyMove:unit?.move?.to,sea:unit?.move?.sea,transportReady:unit?.move?.transportReady,fleetPort:ship?.port,fleetZone:ship?.zone,fleetOrder:ship?.order?.kind,fleetHull:ship?.hull,fleetShips:ship?.ships,battles:(state.battles||[]).length});
  for(const a of state.armies.filter(a=>a.move?.sea&&!a.move.transportReady)){
   const carrying=state.naval.fleets.find(f=>f.id===a.move.transportFleetId);
   if(!carrying||carrying.owner!==a.owner||carrying.order?.armyId!==a.id)broken.push({turn:turn+1,army:a.id,fleet:a.move.transportFleetId});
  }
  if(turn===0||(turn+1)%6===0){state=upgradeSave(JSON.parse(JSON.stringify(state)));reloads++}
 }
 assert.deepEqual(broken,[],'A sea move lost its assigned ships');
 assert.ok(events.some(x=>x.fleetPort===null&&x.fleetOrder==='transport')||(hostileSea||strongHostileSea)&&state.naval.reports.some(r=>r.kind==='battle'&&r.zone==='adriatic'),'Transport must sail offshore or be intercepted there');
 if(hostileSea||strongHostileSea)assert.ok(state.naval.reports.some(r=>r.kind==='battle'&&r.zone==='adriatic'),'An offshore enemy should be able to intercept the transport');
 assert.ok((state.battles||[]).length>0,'The long campaign should resolve genuine battles');
 campaigns.push({sample,months,hostileSea,strongHostileSea,reloads,events,navalBattles:state.naval.reports.filter(r=>r.kind==='battle').length,navalReports:state.naval.reports.filter(r=>r.kind==='battle').slice(0,2).map(r=>({year:r.year,month:r.month,winner:r.winner,transportDisruptions:r.transportDisruptions})),finalArmyRegion:state.armies.find(a=>a.id==='italy')?.region,finalFleetPort:state.naval.fleets.find(f=>f.id==='senate-adriatic')?.port,battles:(state.battles||[]).length,civilWarOutcome:state.civilWarOutcome?.winner||'ongoing'});
}
console.log(JSON.stringify(campaigns,null,2));
