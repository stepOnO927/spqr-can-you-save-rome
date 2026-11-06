import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,tick,moveArmy,previewMarch,upgradeSave} from '../engine.js';
import {SEA_ZONES,seaRoute,portZone,queueShip,orderFleet,appointFleet,dismissFleetCommander,advanceNaval,reportedHostileFleets,accessibleFleet,supportPirates} from '../naval.js';

test('fleets are separate from armies and move only through connected sea zones',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');assert.ok(f);assert.equal(s.armies.some(a=>a.id===f.id),false);assert.equal(SEA_ZONES.length,11);assert.deepEqual(seaRoute('adriatic','aegean'),['ionian','aegean']);assert.equal(seaRoute('adriatic','nonesuch'),null);assert.equal(portZone('italiaS'),'adriatic');assert.equal(orderFleet(s,'senate',f.id,'intercept','aegean').ok,true);advanceNaval(s);assert.equal(f.zone,'ionian');advanceNaval(s);assert.equal(f.zone,'aegean')
});
test('shipbuilding spends treasury, materials, crew and time at a real shipyard',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),before={treasury:s.factions.senate.treasury,timber:s.development.senate.materials.timber,crew:s.factions.senate.manpower};const result=queueShip(s,'senate','italiaS','merchant');assert.equal(result.ok,true);assert.equal(s.factions.senate.treasury,before.treasury-17);assert.equal(s.development.senate.materials.timber,before.timber-2);assert.equal(s.factions.senate.manpower,before.crew-45);assert.equal(queueShip(s,'senate','italiaS','trireme').ok,false);for(let i=0;i<result.months-1;i++)advanceNaval(s);assert.equal(f.ships.merchant||0,0);advanceNaval(s);assert.equal(f.ships.merchant,1)
});
test('fleet commander appointments cost pay, take travel time, and can be dismissed',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&!p.missing&&p.loyalty>=35&&!s.armies.some(a=>a.characterId===id));assert.ok(person);s.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';const treasury=s.factions.senate.treasury,out=appointFleet(s,'senate',f.id,person[0]);assert.equal(out.ok,true);assert.equal(s.factions.senate.treasury,treasury-5);assert.equal(f.commanderId,null);for(let i=0;i<out.months;i++)advanceNaval(s);assert.equal(f.commanderId,person[0]);const loyalty=person[1].loyalty;assert.equal(dismissFleetCommander(s,'senate',f.id).ok,true);assert.equal(f.commanderId,null);assert.equal(person[1].loyalty,loyalty-2)
});
test('sea transport needs an idle fleet and arrives with its vessels',()=>{
 const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy');army.region='italiaS';const target='t075',fleet=s.naval.fleets.find(f=>f.owner==='senate');s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';assert.equal(previewMarch(s,army.id,target).ok,true);assert.equal(moveArmy(s,army.id,target).ok,true);assert.equal(fleet.order.kind,'transport');assert.equal(accessibleFleet(s,'senate','italiaS',army.men),undefined);for(let i=0;i<4&&army.region!==target;i++)tick(s);assert.equal(army.region,target);assert.equal(fleet.port,target)
});
test('naval contact produces uncertain dated enemy intelligence and a battle report',()=>{
 const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate');assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(orderFleet(s,'senate',fleet.id,'intercept','adriatic').ok,true);advanceNaval(s);assert.ok(s.naval.reports.some(r=>r.kind==='battle'));const sighting=reportedHostileFleets(s,'senate').find(r=>r.owner==='caesar');assert.ok(sighting);assert.equal(sighting.month,s.month);assert.ok(sighting.range[0]<sighting.range[1])
});
test('Egyptian grain requires merchant shipping and transfers bounded food and payment',()=>{
 const s=newGrandGame('senate'),route=s.naval.routes.find(r=>r.id==='egypt-italy');s.factions.senate.food=0;s.factions.egypt.food=60;const before=s.factions.senate.treasury;advanceNaval(s);assert.equal(route.last.amount,4);assert.equal(s.factions.senate.food,4);assert.equal(s.factions.egypt.food,56);assert.equal(route.last.reason,'delivered');s.naval.fleets.find(f=>f.owner==='egypt').ships.merchant=0;s.factions.senate.food=0;advanceNaval(s);assert.equal(route.last.amount,0);assert.equal(route.last.reason,'merchant');assert.ok(s.factions.senate.treasury<=before)
});
test('merchant hulls limit simultaneous routes and hostile raids interrupt real cargo',()=>{
 const s=newGrandGame('senate'),egypt=s.naval.fleets.find(f=>f.owner==='egypt'),caesar=s.naval.fleets.find(f=>f.owner==='caesar');egypt.ships.merchant=1;s.factions.senate.food=0;s.factions.egypt.food=60;advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.amount,4);assert.equal(s.naval.routes.find(r=>r.id==='egypt-papyrus').last.reason,'merchant');
 caesar.zone='alexandrian';caesar.port=null;assert.equal(orderFleet(s,'caesar',caesar.id,'raid','egypt-italy').ok,true);const before={food:s.factions.senate.food,raider:s.factions.caesar.treasury};advanceNaval(s);const route=s.naval.routes.find(r=>r.id==='egypt-italy');assert.equal(route.last.reason,'raid');assert.equal(route.last.amount,0);assert.equal(s.factions.senate.food,before.food);assert.ok(s.naval.reports.some(r=>r.kind==='trade-raid'));assert.ok(s.factions.caesar.treasury<=before.raider);
});
test('pirate suppression and covert sponsorship alter pressure and resources',()=>{
 const s=newGrandGame('senate'),p=s.naval.pirates.find(x=>x.id==='illyrian-raiders'),before=p.pressure,treasury=s.factions.senate.treasury;assert.equal(supportPirates(s,'senate',p.id).ok,true);assert.equal(s.factions.senate.treasury,treasury-12);assert.equal(p.pressure,before+8);assert.equal(orderFleet(s,'senate','senate-adriatic','patrol','adriatic').ok,true);advanceNaval(s);assert.ok(p.pressure<before+8)
});
test('naval state survives save migration and 36 campaign months',()=>{
 const s=newGrandGame('senate');for(let i=0;i<36;i++)tick(s);const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.naval.fleets.length,s.naval.fleets.length);assert.equal(restored.naval.routes.length,12);assert.ok(restored.naval.routes.every(r=>Number.isFinite(r.last?.security)));assert.ok(restored.naval.fleets.every(f=>Number.isFinite(f.hull)&&Number.isFinite(f.supply)))
});
