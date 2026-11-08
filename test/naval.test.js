import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,tick,moveArmy,previewMarch,upgradeSave,aiTurn} from '../engine.js';
import {SEA_ZONES,seaRoute,portZone,queueShip,orderFleet,reserveFleet,mobilizeFleet,setFleetTactic,ransomFleetCommander,appointFleet,dismissFleetCommander,appointNavalJob,dismissNavalJob,navalJobEffect,advanceNaval,reportedHostileFleets,reportedNonHostileFleets,accessibleFleet,supportPirates,fleetSpeed,fleetCargoCapacity,fleetUpkeep,fleetUpkeepDue} from '../naval.js';
import {tradeCard} from '../map-lab/naval-ui.js';
import {armySupply,supplyNetwork} from '../grand-operations.js';
import {nationalBudget} from '../national-budget.js';
import {advanceMissingCommanders} from '../character-system.js';

test('chosen tactics survive saves and change actual naval losses',()=>{
 const run=tactic=>{const s=newGrandGame('senate'),own=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');own.port=null;enemy.port=null;enemy.zone=own.zone;s.seed=83;if(tactic!=='formation')assert.equal(setFleetTactic(s,'senate',own.id,tactic).ok,true);assert.equal(setFleetTactic(s,'senate',own.id,'formation').ok,false);const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(loaded.naval.fleets.find(f=>f.id===own.id).tactic,tactic);advanceNaval(loaded);return loaded.naval.reports.find(r=>r.kind==='battle')};
 const boarding=run('boarding'),missile=run('missile'),ramming=run('ramming');const id='senate-adriatic',enemy='caesar-adriatic';
 assert.equal(boarding.snapshots[id].tactic,'boarding');assert.ok(boarding.losses[id].sailors>missile.losses[id].sailors);assert.ok(ramming.damage[enemy]>missile.damage[enemy]);
});
test('boarding can capture a named commander who stays captive through save reload until ransom returns him',()=>{
 let s=newGrandGame('senate');const own=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');own.port=null;enemy.port=null;enemy.zone=own.zone;enemy.hull=25;enemy.commanderId='antony';s.factions.caesar.treasury=0;s.seed=8;
 assert.equal(setFleetTactic(s,'senate',own.id,'boarding').ok,true);advanceNaval(s);const capture=s.naval.captives.find(c=>c.characterId==='antony');assert.ok(capture);assert.equal(capture.status,'held');assert.equal(s.world.characters.antony.missing.capturedBy,'senate');assert.equal(enemy.commanderId,null);assert.equal(s.naval.reports.find(r=>r.kind==='battle').capturedCommander.characterId,'antony');
 advanceMissingCommanders(s);assert.equal(s.world.characters.antony.missing.capturedBy,'senate');s=upgradeSave(JSON.parse(JSON.stringify(s)));s.wars=[];s.factions.caesar.treasury=50;assert.equal(ransomFleetCommander(s,'caesar','antony').ok,true);assert.equal(ransomFleetCommander(s,'caesar','antony').ok,false);assert.equal(s.naval.captives.find(c=>c.characterId==='antony').status,'returning');advanceNaval(s);assert.ok(s.world.characters.antony.missing);advanceNaval(s);assert.equal(s.naval.captives.find(c=>c.characterId==='antony').status,'released');assert.equal(s.world.characters.antony.missing,undefined);
});
test('AI reserves an unaffordable docked fleet and recommissions it after a dated hostile sighting',()=>{
 let s=newGrandGame('senate');const id='caesar-adriatic',full=fleetUpkeepDue(s.naval.fleets.find(f=>f.id===id));advanceNaval(s);let f=s.naval.fleets.find(x=>x.id===id);assert.equal(f.reserve,true);assert.equal(f.order,null);assert.ok(fleetUpkeepDue(f)<full);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));f=s.naval.fleets.find(x=>x.id===id);s.factions.caesar.treasury=45;s.naval.intel.caesar={'senate-adriatic':{owner:'senate',zone:f.zone,year:s.year,month:s.month,source:'sighting',range:[1,5],confidence:'low'}};advanceNaval(s);assert.equal(f.reserve,true);assert.ok(!f.mobilizing);
 s.factions.caesar.treasury=90;advanceNaval(s);assert.equal(f.reserve,true);assert.equal(f.mobilizing,1);advanceNaval(s);assert.equal(f.reserve,false);assert.equal(f.mobilizing,0);
});
test('AI withdraws an unaffordable patrol to port before laying it up',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='caesar');s.naval.fleets.find(x=>x.owner==='senate').zone='tyrrhenian';f.port=null;f.order={kind:'patrol',target:f.zone,path:[]};s.factions.caesar.treasury=20;advanceNaval(s);assert.equal(f.order?.kind,'return');advanceNaval(s);assert.equal(f.port,'cisalpine');assert.equal(f.reserve,true);
});

test('reserve cuts real upkeep but suspends orders and troop transports until mobilization completes',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),full=fleetUpkeepDue(f),before=nationalBudget(s,'senate');
 assert.equal(reserveFleet(s,'senate',f.id).ok,true);assert.equal(reserveFleet(s,'senate',f.id).ok,false);
 assert.equal(fleetUpkeepDue(f),Math.ceil(fleetUpkeep(f)*.35));assert.equal(nationalBudget(s,'senate').navyUpkeep,before.navyUpkeep-full+fleetUpkeepDue(f));
 assert.equal(orderFleet(s,'senate',f.id,'patrol','adriatic').ok,false);assert.equal(accessibleFleet(s,'senate',f.port,2000),undefined);
 const money=s.factions.senate.treasury,food=s.factions.senate.food;assert.equal(mobilizeFleet(s,'senate',f.id).ok,true);assert.equal(s.factions.senate.treasury,money-6);assert.equal(s.factions.senate.food,food-2);assert.equal(orderFleet(s,'senate',f.id,'patrol','adriatic').ok,false);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s))),saved=restored.naval.fleets.find(x=>x.id===f.id);assert.equal(saved.reserve,true);assert.equal(saved.mobilizing,1);
 restored.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';advanceNaval(restored);assert.equal(saved.reserve,false);assert.equal(saved.mobilizing,0);assert.equal(fleetUpkeepDue(saved),full);assert.equal(orderFleet(restored,'senate',saved.id,'patrol','adriatic').ok,true);
});
test('reserve ships cannot carry merchant cargo, and loss of their harbor ends reserve',()=>{
 const s=newGrandGame('senate'),egypt=s.naval.fleets.find(x=>x.owner==='egypt'),senate=s.naval.fleets.find(x=>x.owner==='senate');
 assert.equal(reserveFleet(s,'egypt',egypt.id).ok,true);advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');
 assert.equal(mobilizeFleet(s,'egypt',egypt.id).ok,true);advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');assert.equal(egypt.reserve,false);advanceNaval(s);assert.notEqual(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');
 assert.equal(reserveFleet(s,'senate',senate.id).ok,true);s.regions.find(r=>r.id===senate.port).owner='caesar';s.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';advanceNaval(s);assert.equal(senate.reserve,false);assert.equal(senate.port,null);assert.ok(senate.hull<100);
});
test('a fleet attacked during mobilization fights at reserve readiness and the battle records it',()=>{
 const s=newGrandGame('senate'),own=s.naval.fleets.find(x=>x.owner==='senate'),enemy=s.naval.fleets.find(x=>x.owner==='caesar');
 assert.equal(reserveFleet(s,'senate',own.id).ok,true);assert.equal(mobilizeFleet(s,'senate',own.id).ok,true);enemy.zone=own.zone;enemy.port=null;advanceNaval(s);
 const battle=s.naval.reports.find(r=>r.kind==='battle'&&r.participants.includes(own.id));assert.ok(battle);assert.equal(battle.snapshots[own.id].reserve,true);assert.equal(own.reserve,false);
});

test('fleets are separate from armies and move only through connected sea zones',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');assert.ok(f);assert.equal(s.armies.some(a=>a.id===f.id),false);assert.equal(SEA_ZONES.length,11);assert.deepEqual(seaRoute('adriatic','aegean'),['ionian','aegean']);assert.equal(seaRoute('adriatic','nonesuch'),null);assert.equal(portZone('italiaS'),'adriatic');assert.equal(orderFleet(s,'senate',f.id,'intercept','aegean').ok,true);advanceNaval(s);assert.equal(f.zone,'ionian');advanceNaval(s);assert.equal(f.zone,'aegean')
});
test('light-only fleets use ship speed and merchant hulls set cargo capacity',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');f.ships={light:2};f.sailors=130;f.zone='western';f.port=null;assert.equal(fleetSpeed(f),3);assert.equal(fleetCargoCapacity(f),0);assert.equal(orderFleet(s,'senate',f.id,'intercept','tyrrhenian').ok,true);advanceNaval(s);assert.equal(f.zone,'tyrrhenian');f.ships.merchant=2;assert.equal(fleetCargoCapacity(f),8)
});
test('shipbuilding spends treasury, materials, crew and time at a real shipyard',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),before={treasury:s.factions.senate.treasury,timber:s.development.senate.materials.timber,crew:s.factions.senate.manpower};const result=queueShip(s,'senate','italiaS','merchant');assert.equal(result.ok,true);assert.equal(s.factions.senate.treasury,before.treasury-17);assert.equal(s.development.senate.materials.timber,before.timber-2);assert.equal(s.factions.senate.manpower,before.crew-45);assert.equal(queueShip(s,'senate','italiaS','trireme').ok,false);for(let i=0;i<result.months-1;i++)advanceNaval(s);assert.equal(f.ships.merchant||0,0);advanceNaval(s);assert.equal(f.ships.merchant,1)
});
test('fleet commander appointments cost pay, take travel time, and can be dismissed',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&!p.missing&&p.loyalty>=35&&!s.armies.some(a=>a.characterId===id));assert.ok(person);s.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';const treasury=s.factions.senate.treasury,out=appointFleet(s,'senate',f.id,person[0]);assert.equal(out.ok,true);assert.equal(s.factions.senate.treasury,treasury-5);assert.equal(f.commanderId,null);for(let i=0;i<out.months;i++)advanceNaval(s);assert.equal(f.commanderId,person[0]);const loyalty=person[1].loyalty;assert.equal(dismissFleetCommander(s,'senate',f.id).ok,true);assert.equal(f.commanderId,null);assert.equal(person[1].loyalty,loyalty-2)
});
test('appointing a fleet commander twice does not charge twice or overwrite the traveler',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&!p.missing&&!s.armies.some(a=>a.characterId===id));
 assert.ok(person);assert.equal(appointFleet(s,'senate',f.id,person[0]).ok,true);const treasury=s.factions.senate.treasury;
 assert.equal(appointFleet(s,'senate',f.id,person[0]).ok,false);assert.equal(s.factions.senate.treasury,treasury);
});
test('naval officers travel, draw salary, improve real operations and survive saves',()=>{
 const s=newGrandGame('senate'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&p.loyalty>=35&&!s.armies.some(a=>a.characterId===id));assert.ok(person);const before=s.factions.senate.treasury,appointment=appointNavalJob(s,'senate','supervisor','italiaS',person[0]);assert.equal(appointment.ok,true);assert.equal(s.factions.senate.treasury,before-5);assert.equal(navalJobEffect(s,'senate','supervisor','italiaS'),0);assert.equal(appointFleet(s,'senate','senate-adriatic',person[0]).ok,false);for(let i=0;i<appointment.months;i++)advanceNaval(s);assert.ok(navalJobEffect(s,'senate','supervisor','italiaS')>0);const build=queueShip(s,'senate','italiaS','merchant');assert.equal(build.ok,true);assert.ok(build.months<3);const saved=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(saved.naval.jobs[0].characterId,person[0]);const loyalty=person[1].loyalty;assert.equal(dismissNavalJob(s,'senate','supervisor','italiaS').ok,true);assert.equal(person[1].loyalty,loyalty-2);assert.equal(navalJobEffect(s,'senate','supervisor','italiaS'),0)
});
test('historical naval aptitude and service experience influence officers',()=>{
 const s=newGrandGame('caesar'),mamurra=s.world.characters.mamurra;assert.equal(appointNavalJob(s,'caesar','engineer','cisalpine','mamurra').ok,true);assert.equal(mamurra.navalSkills.engineer,55);const job=s.naval.jobs[0],months=job.remaining;for(let i=0;i<months;i++)advanceNaval(s);job.experience=11;advanceNaval(s);assert.equal(mamurra.navalSkills.engineer,57);assert.ok(navalJobEffect(s,'caesar','engineer','cisalpine')>=3)
});
test('a fleet commander gains naval skill from real combat',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),enemy=s.naval.fleets.find(x=>x.owner==='caesar'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&p.loyalty>=35&&!s.armies.some(a=>a.characterId===id));enemy.zone='ligurian';const out=appointFleet(s,'senate',f.id,person[0]);assert.equal(out.ok,true);for(let i=0;i<out.months;i++)advanceNaval(s);const skill=person[1].navalSkills.commander;enemy.zone=f.zone;enemy.port=null;enemy.order=null;advanceNaval(s);assert.ok(s.naval.reports.some(r=>r.kind==='battle'));assert.equal(person[1].navalSkills.commander,skill+2)
});
test('shipyard repairs and sailor replacement consume treasury, timber and manpower',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');s.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';s.naval.fleets.find(x=>x.owner==='egypt').ships.merchant=0;f.hull=60;f.sailors-=30;const before={treasury:s.factions.senate.treasury,timber:s.development.senate.materials.timber,manpower:s.factions.senate.manpower};advanceNaval(s);assert.ok(f.hull>60);assert.equal(f.sailors,500);assert.equal(s.development.senate.materials.timber,before.timber-1);assert.equal(s.factions.senate.manpower,before.manpower-30);assert.equal(s.factions.senate.treasury,before.treasury-fleetUpkeep(f)-5)
});
test('later-campaign storms damage real fleets and AI can order a blockade without hidden sightings',()=>{
 const s=newGrandGame('senate'),own=s.naval.fleets.find(x=>x.owner==='senate'),enemy=s.naval.fleets.find(x=>x.owner==='caesar');s.year=-48;s.seed=1972;s.factions.caesar.treasury=200;own.port=null;own.zone='tyrrhenian';s.naval.pirates.find(p=>p.zone==='adriatic').pressure=0;advanceNaval(s);assert.ok(s.naval.reports.some(r=>r.kind==='storm'&&r.owner==='senate'));assert.ok(own.hull<100);assert.equal(enemy.order?.kind,'blockade')
});
test('sea transport needs an idle fleet and arrives with its vessels',()=>{
 const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy');army.region='italiaS';const target='t075',fleet=s.naval.fleets.find(f=>f.owner==='senate');s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';assert.equal(previewMarch(s,army.id,target).ok,true);assert.equal(moveArmy(s,army.id,target).ok,true);assert.equal(fleet.order.kind,'transport');assert.equal(accessibleFleet(s,'senate','italiaS',army.men),undefined);for(let i=0;i<4&&army.region!==target;i++)tick(s);assert.equal(army.region,target);assert.equal(fleet.port,target)
});
test('naval contact produces uncertain dated enemy intelligence and a battle report',()=>{
 const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate');assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(orderFleet(s,'senate',fleet.id,'intercept','adriatic').ok,true);advanceNaval(s);assert.ok(s.naval.reports.some(r=>r.kind==='battle'));const sighting=reportedHostileFleets(s,'senate').find(r=>r.owner==='caesar');assert.ok(sighting);assert.equal(sighting.month,s.month);assert.ok(sighting.range[0]<sighting.range[1])
});
test('naval battle preserves bounded enemy-loss observations across saves',()=>{
 const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate');assert.equal(orderFleet(s,'senate',fleet.id,'intercept','adriatic').ok,true);advanceNaval(s);
 const battle=s.naval.reports.find(r=>r.kind==='battle'&&r.participants.includes(fleet.id)),enemyId=battle.participants.find(id=>id!==fleet.id),loss=battle.losses[enemyId],observed=battle.observedLosses.senate;
 assert.ok(observed.ships[0]<=loss.sunk&&loss.sunk<=observed.ships[1]);assert.ok(observed.ships[1]>observed.ships[0]);
 assert.ok(observed.sailors[0]<=loss.sailors&&loss.sailors<=observed.sailors[1]);assert.ok(observed.sailors[1]>observed.sailors[0]);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.naval.reports.find(r=>r.id===battle.id).observedLosses.senate,observed);
});
test('naval reconnaissance can miss, observe approximately or evade a real encounter',()=>{
 const run=seed=>{const s=newGrandGame('senate'),scout=s.naval.fleets.find(f=>f.id==='senate-adriatic'),messages=[];scout.ships={light:3};scout.sailors=240;s.seed=seed;
  assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(orderFleet(s,'senate',scout.id,'recon','adriatic').ok,true);advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
  return {s,scout,messages,sighting:reportedHostileFleets(s,'senate').find(r=>r.owner==='caesar'),battle:s.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(scout.id))}};
 const missed=run(1400);assert.equal(missed.sighting,undefined);assert.equal(missed.battle,false);assert.equal(missed.scout.order,null);assert.ok(missed.scout.supply<100);
 assert.ok(missed.messages.some(m=>/enemies may still be present/.test(m.en)&&/敌人仍可能在附近/.test(m.zh)));
 const observed=run(1);assert.ok(observed.sighting);assert.equal(observed.battle,false);assert.equal(observed.sighting.source,'recon');assert.equal(observed.sighting.month,observed.s.month);assert.ok(observed.sighting.range[0]<observed.sighting.range[1]);
 assert.ok(observed.messages.some(m=>/fleet remains at sea/i.test(m.en)&&/舰队仍在海上/.test(m.zh)));
 assert.deepEqual(upgradeSave(JSON.parse(JSON.stringify(observed.s))).naval.intel.senate['caesar-adriatic'],observed.s.naval.intel.senate['caesar-adriatic']);
 const engaged=run(3);assert.equal(engaged.battle,true);
});
test('neutral fleet sightings stay private to intelligence until a current war makes them hostile',()=>{
 const s=newGrandGame('senate');s.naval.intel.senate={'egypt-grain':{owner:'egypt',zone:'alexandrian',year:s.year,month:s.month,source:'recon',range:[2,5],confidence:'medium'}};
 assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(reportedNonHostileFleets(s,'senate')[0].id,'egypt-grain');
 s.wars.push(['senate','egypt']);assert.equal(reportedHostileFleets(s,'senate')[0].id,'egypt-grain');assert.deepEqual(reportedNonHostileFleets(s,'senate'),[]);
 s.month+=5;assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.deepEqual(reportedNonHostileFleets(s,'senate'),[]);
 s.naval.intel.senate['egypt-grain'].month=s.month+1;assert.deepEqual(reportedHostileFleets(s,'senate'),[]);
});
test('reconnaissance of a neutral fleet produces a dated non-hostile report in both languages',()=>{
 const s=newGrandGame('senate'),scout=s.naval.fleets.find(f=>f.id==='senate-adriatic'),egypt=s.naval.fleets.find(f=>f.id==='egypt-grain'),messages=[];
 scout.ships={light:3};scout.sailors=240;s.naval.fleets.find(f=>f.id==='caesar-adriatic').zone='ligurian';egypt.zone='adriatic';egypt.port=null;s.seed=1;
 assert.equal(orderFleet(s,'senate',scout.id,'recon','adriatic').ok,true);advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
 assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(reportedNonHostileFleets(s,'senate')[0].id,'egypt-grain');
 assert.ok(messages.some(m=>/non-hostile fleet/.test(m.en)&&/非交战舰队/.test(m.zh)));
});
test('Egyptian grain requires merchant shipping and transfers bounded food and payment',()=>{
 const s=newGrandGame('senate'),route=s.naval.routes.find(r=>r.id==='egypt-italy');s.factions.senate.food=0;s.factions.egypt.food=60;const before=s.factions.senate.treasury;advanceNaval(s);assert.equal(route.last.amount,4);assert.equal(s.factions.senate.food,4);assert.equal(s.factions.egypt.food,56);assert.equal(route.last.reason,'delivered');s.naval.fleets.find(f=>f.owner==='egypt').ships.merchant=0;s.factions.senate.food=0;advanceNaval(s);assert.equal(route.last.amount,0);assert.equal(route.last.reason,'merchant');assert.ok(s.factions.senate.treasury<=before)
});
test('trade prices respond to scarcity and charge for the quantity delivered',()=>{
 const run=food=>{const s=newGrandGame('senate');s.factions.senate.food=food;s.factions.egypt.food=80;advanceNaval(s);return s.naval.routes.find(r=>r.id==='egypt-italy').last};
 const scarce=run(10),ample=run(80);assert.equal(scarce.reason,'delivered');assert.equal(scarce.amount,4);assert.ok(scarce.unitPrice>ample.unitPrice);assert.equal(scarce.paid,scarce.amount*scarce.unitPrice);
 const short=newGrandGame('senate');short.regions.find(r=>r.id==='africa').owner='egypt';const egyptian=short.naval.fleets.find(f=>f.owner==='egypt');egyptian.zone='african';egyptian.port=null;advanceNaval(short);assert.ok(ample.unitPrice>short.naval.routes.find(r=>r.id==='africa-sicily').last.unitPrice);
 const cashPoor=newGrandGame('senate');cashPoor.factions.senate.food=10;cashPoor.factions.senate.treasury=12;advanceNaval(cashPoor);const partial=cashPoor.naval.routes.find(r=>r.id==='egypt-italy').last;assert.ok(partial.amount>0&&partial.amount<4);assert.equal(partial.paid,partial.amount*partial.unitPrice);
});
test('foreign trade routes keep shipment and security figures private',()=>{
 const s=newGrandGame('senate'),foreign={from:'egypt',to:'mauretania',good:'grain',volume:9,last:{amount:7,security:99,reason:'delivered',unitPrice:4,paid:28}};
 for(const zh of [false,true]){const html=tradeCard(s,foreign,zh);assert.match(html,zh?/外国商路/:/Foreign route/);assert.doesNotMatch(html,/99|28|计划货量|Planned volume/)}
 const own={from:'egypt',to:'t016',good:'grain',volume:'<img src=x>',last:{amount:'<svg onload=alert(1)>',security:99,reason:'delivered'}};
 assert.doesNotMatch(tradeCard(s,own,false),/<img|<svg/);
});
test('a hostile trade raid physically transfers captured cargo to its fleet owner',()=>{
 const s=newGrandGame('senate'),raider=s.naval.fleets.find(f=>f.owner==='caesar');raider.zone='alexandrian';raider.port=null;
 assert.equal(orderFleet(s,'caesar',raider.id,'raid','egypt-italy').ok,true);
 const before={egypt:s.factions.egypt.food,caesar:s.factions.caesar.food,senate:s.factions.senate.food};advanceNaval(s);
 const result=s.naval.routes.find(r=>r.id==='egypt-italy').last;
 assert.equal(result.reason,'raid');assert.ok(result.captured>0);assert.equal(result.amount,0);assert.equal(result.paid,0);
 assert.equal(s.factions.egypt.food,before.egypt-result.captured);assert.equal(s.factions.caesar.food,before.caesar+result.captured);assert.equal(s.factions.senate.food,before.senate);
 assert.ok(s.naval.reports.some(r=>r.kind==='trade-raid'&&r.captured===result.captured));
});
test('AI can order a real army transport when a hostile coast is reachable by sea',()=>{
 const s=newGrandGame('caesar');for(const r of s.regions)r.owner='egypt';s.regions.find(r=>r.id==='italiaS').owner='senate';s.regions.find(r=>r.id==='t075').owner='caesar';s.armies=s.armies.filter(a=>a.id==='italy');s.armies[0].region='italiaS';
 aiTurn(s,'senate');assert.equal(s.armies[0].move?.sea,true);assert.equal(s.armies[0].move?.to,'t075');assert.equal(s.naval.fleets.find(f=>f.owner==='senate').order?.armyId,'italy');
});
test('a hostile naval blockade cuts port army supply until the blockade ends',()=>{
 const s=newGrandGame('senate'),unit=s.armies.find(a=>a.id==='italy'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');unit.region='italiaS';enemy.zone=portZone('italiaS');enemy.port=null;
 const normal=armySupply(s,unit);assert.equal(orderFleet(s,'caesar',enemy.id,'blockade','italiaS').ok,true);assert.ok(armySupply(s,unit)<normal);
 assert.equal(orderFleet(s,'caesar',enemy.id,'intercept','aegean').ok,true);assert.equal(armySupply(s,unit),normal);
});
test('a fleet moves finite food from a home port to an isolated land front through save reload',()=>{
 const s=newGrandGame('senate');
 for(const r of s.regions)if(r.owner==='senate'&&!['italiaS','t016','t017'].includes(r.id))r.owner='caesar';
 s.regions.find(r=>r.id==='t016').food=.4;
 s.regions.find(r=>r.id==='italiaS').food=.4;
 s.naval.fleets=s.naval.fleets.filter(f=>f.owner==='senate');
 const unit=s.armies.find(a=>a.id==='italy');unit.region='t017';
 const baseline=armySupply(s,unit),food=s.factions.senate.food;
 assert.equal(supplyNetwork(s,'senate',true).has('t017'),false);
 const order=orderFleet(s,'senate','senate-adriatic','supply','t016');
 assert.equal(order.ok,true);assert.equal(order.cargo,6);assert.equal(s.factions.senate.food,food-6);
 advanceNaval(s);assert.equal(s.naval.provisions.t016,undefined);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s))),army=loaded.armies.find(a=>a.id==='italy');
 advanceNaval(loaded);assert.equal(loaded.naval.provisions.t016,undefined);
 advanceNaval(loaded);assert.equal(loaded.naval.provisions.t016.food,6);
 assert.ok(armySupply(loaded,army)>baseline);
 assert.equal(supplyNetwork(loaded,'senate',true).has('t017'),true);
 assert.ok(loaded.naval.reports.some(r=>r.kind==='supply-delivery'&&r.cargo===6));
 for(let i=0;i<3;i++)advanceNaval(loaded);
 assert.equal(loaded.naval.provisions.t016,undefined);assert.equal(armySupply(loaded,army),baseline);
});
test('a blockade holds loaded supply ships outside port, and returning cargo refunds food once',()=>{
 const s=newGrandGame('senate'),own=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
 s.naval.fleets=s.naval.fleets.filter(f=>f.owner!=='egypt');enemy.zone=portZone('t016');enemy.port=null;
 assert.equal(orderFleet(s,'caesar',enemy.id,'blockade','t016').ok,true);
 const supply=orderFleet(s,'senate',own.id,'supply','t016');assert.equal(supply.ok,true);
 for(let i=0;i<3;i++)advanceNaval(s);
 assert.equal(own.order?.kind,'supply');assert.equal(own.order.blocked,true);assert.equal(s.naval.provisions.t016,undefined);
 assert.ok(s.naval.reports.some(r=>r.kind==='supply-blocked'));
 const before=s.factions.senate.food;
 assert.equal(orderFleet(s,'senate',own.id,'return','italiaS').ok,true);
 for(let i=0;i<5&&own.order;i++)advanceNaval(s);
 assert.equal(own.port,'italiaS');assert.equal(s.factions.senate.food,before+supply.cargo);
 assert.equal(s.naval.reports.filter(r=>r.kind==='supply-return').length,1);
});
test('merchant hulls assigned to army supplies cannot also carry trade cargo',()=>{
 const s=newGrandGame('egypt');s.regions.find(r=>r.id==='t016').owner='egypt';
 assert.equal(orderFleet(s,'egypt','egypt-grain','supply','t016').ok,true);
 advanceNaval(s);
 assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');
});
test('AI dispatches a paid supply convoy only for its own under-supplied port front',()=>{
 const s=newGrandGame('egypt'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic'),army=s.armies.find(a=>a.id==='italy');
 s.factions.senate.treasury=200;s.factions.senate.food=50;
 s.naval.routes=[];
 s.regions.find(r=>r.id==='t016').food=.4;army.region='t016';army.operationalSupply=.4;
 const before=s.factions.senate.food;
 advanceNaval(s);
 assert.equal(fleet.order?.kind,'supply');assert.equal(fleet.order.targetPort,'t016');
 assert.equal(s.factions.senate.food,before-fleet.order.cargo);
 for(let i=0;i<3;i++)advanceNaval(s);
 assert.ok(s.naval.provisions.t016?.food>0);
 const healthy=newGrandGame('egypt'),healthyArmy=healthy.armies.find(a=>a.id==='italy');
 healthy.factions.senate.treasury=200;healthyArmy.region='t016';healthyArmy.operationalSupply=.95;
 healthy.regions.find(r=>r.id==='t016').food=.4;
 advanceNaval(healthy);
 assert.notEqual(healthy.naval.fleets.find(f=>f.id==='senate-adriatic').order?.kind,'supply');
});
test('AI convoy favors a similarly needy safe port using dated reports, not hidden enemy positions',()=>{
 const setup=()=>{const s=newGrandGame('egypt'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic');s.naval.routes=[];fleet.port='t026';fleet.zone='sicilian';s.factions.senate.treasury=200;s.factions.senate.food=60;
  for(const [id,armyId] of [['t016','italy'],['t078','pompey']]){s.regions.find(r=>r.id===id).food=.3;const unit=s.armies.find(a=>a.id===armyId);unit.region=id;unit.operationalSupply=.35}
  return s};
 const unseen=setup();unseen.naval.fleets.find(f=>f.id==='caesar-adriatic').zone='tyrrhenian';advanceNaval(unseen);
 assert.equal(unseen.naval.fleets.find(f=>f.id==='senate-adriatic').order?.targetPort,'t016');
 const informed=setup();informed.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:'tyrrhenian',year:informed.year,month:informed.month,source:'sighting',range:[2,5],confidence:'medium'}};
 const loaded=upgradeSave(JSON.parse(JSON.stringify(informed)));advanceNaval(loaded);
 assert.equal(loaded.naval.fleets.find(f=>f.id==='senate-adriatic').order?.targetPort,'t078');
 const stale=setup();stale.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:'tyrrhenian',year:stale.year-1,month:stale.month+7,source:'sighting',range:[2,5],confidence:'medium'}};advanceNaval(stale);
 assert.equal(stale.naval.fleets.find(f=>f.id==='senate-adriatic').order?.targetPort,'t016');
});
test('merchant hulls limit simultaneous routes and hostile raids interrupt real cargo',()=>{
 const s=newGrandGame('senate'),egypt=s.naval.fleets.find(f=>f.owner==='egypt'),caesar=s.naval.fleets.find(f=>f.owner==='caesar');egypt.ships.merchant=1;s.factions.caesar.treasury=200;s.factions.senate.food=0;s.factions.egypt.food=60;advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.amount,4);assert.equal(s.naval.routes.find(r=>r.id==='egypt-papyrus').last.reason,'merchant');
 caesar.zone='alexandrian';caesar.port=null;assert.equal(orderFleet(s,'caesar',caesar.id,'raid','egypt-italy').ok,true);const before={food:s.factions.senate.food,raider:s.factions.caesar.treasury};advanceNaval(s);const route=s.naval.routes.find(r=>r.id==='egypt-italy');assert.equal(route.last.reason,'raid');assert.equal(route.last.amount,0);assert.equal(s.factions.senate.food,before.food);assert.ok(s.naval.reports.some(r=>r.kind==='trade-raid'));assert.ok(s.factions.caesar.treasury<=before.raider);
});
test('pirate suppression and covert sponsorship alter pressure and resources',()=>{
 const s=newGrandGame('senate'),p=s.naval.pirates.find(x=>x.id==='illyrian-raiders'),before=p.pressure,treasury=s.factions.senate.treasury;assert.equal(supportPirates(s,'senate',p.id).ok,true);assert.equal(s.factions.senate.treasury,treasury-12);assert.equal(p.pressure,before+8);assert.equal(orderFleet(s,'senate','senate-adriatic','patrol','adriatic').ok,true);advanceNaval(s);assert.ok(p.pressure<before+8)
});
test('pirate raids move cargo into persistent inventory and patrols can recover it',()=>{
 const s=newGrandGame('senate');s.seed=100004;s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';
 const pirate=s.naval.pirates.find(p=>p.id==='cilician-raiders');pirate.zone='alexandrian';pirate.pressure=70;
 const egyptianFood=s.factions.egypt.food;advanceNaval(s);const route=s.naval.routes.find(r=>r.id==='egypt-italy');
 assert.equal(route.last.reason,'piracy');assert.equal(route.last.captured,4);assert.equal(pirate.cargo.grain,4);assert.equal(s.factions.egypt.food,egyptianFood-4);
 assert.match(tradeCard(s,route,false),/Cargo seized 4/);assert.match(tradeCard(s,route,true),/被夺货物 4/);
 const restored=upgradeSave(structuredClone(s));assert.equal(restored.naval.pirates.find(p=>p.id===pirate.id).cargo.grain,4);
 const old=structuredClone(s);delete old.naval.pirates[1].cargo;assert.deepEqual(upgradeSave(old).naval.pirates[1].cargo,{});
 s.naval.routes=s.naval.routes.filter(r=>r.id!=='egypt-italy');s.factions.senate.food=10;const fleet=s.naval.fleets.find(f=>f.owner==='senate');fleet.zone='alexandrian';fleet.port=null;
 assert.equal(orderFleet(s,'senate',fleet.id,'patrol','alexandrian').ok,true);advanceNaval(s);
 assert.equal(s.factions.senate.food,11);assert.equal(pirate.cargo.grain,3);
 assert.deepEqual(s.naval.reports.find(r=>r.kind==='pirate-clash').recovered,{good:'grain',amount:1});
});
test('patrols can fight pirate vessels with real sailor losses and finite pirate strength',()=>{
 const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate'),pirates=s.naval.pirates.find(p=>p.zone==='adriatic');s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';
 pirates.pressure=30;const crew=fleet.sailors,ships=pirates.ships;
 assert.equal(orderFleet(s,'senate',fleet.id,'patrol','adriatic').ok,true);advanceNaval(s);
 assert.ok(s.naval.reports.some(r=>r.kind==='pirate-clash'&&r.owner==='senate'));
 assert.ok(fleet.sailors<crew);assert.equal(pirates.ships,ships-1);
 assert.ok(pirates.pressure<30);
});
test('naval AI assigns orders to each available fleet instead of only its first',()=>{
 const s=newGrandGame('caesar'),first=s.naval.fleets.find(f=>f.owner==='senate'),second=structuredClone(first);second.id='senate-east';second.zone='eastern';second.port=null;s.naval.fleets.push(second);
 advanceNaval(s);assert.equal(first.order?.kind,'patrol');assert.equal(second.order?.kind,'patrol');
});
test('naval state survives save migration and 36 campaign months',()=>{
 const s=newGrandGame('senate');for(let i=0;i<36;i++)tick(s);const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.naval.fleets.length,s.naval.fleets.length);assert.equal(restored.naval.routes.length,12);assert.ok(restored.naval.routes.every(r=>Number.isFinite(r.last?.security)));assert.ok(restored.naval.fleets.every(f=>Number.isFinite(f.hull)&&Number.isFinite(f.supply)))
});

test('older naval saves acquire an empty maritime supply inventory',()=>{
 const old=JSON.parse(JSON.stringify(newGrandGame('senate')));delete old.naval.provisions;
 assert.deepEqual(upgradeSave(old).naval.provisions,{});
});
