import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,tick,moveArmy,previewMarch,upgradeSave,aiTurn} from '../engine.js';
import {SEA_ZONES,seaRoute,portZone,queueShip,orderFleet,reserveFleet,mobilizeFleet,setFleetTactic,ransomFleetCommander,appointFleet,dismissFleetCommander,appointNavalJob,dismissNavalJob,navalJobEffect,advanceNaval,reportedHostileFleets,reportedNonHostileFleets,accessibleFleet,supportPirates,toggleTradeRoute,fleetSpeed,fleetCargoCapacity,fleetUpkeep,fleetUpkeepDue,wagonSupplyPlan,dispatchWagonSupply} from '../naval.js';
import {tradeCard} from '../map-lab/naval-ui.js';
import {armySupply,supplyNetwork} from '../grand-operations.js';
import {nationalBudget} from '../national-budget.js';
import {budgetHtml} from '../budget-ui.js';
import {advanceMissingCommanders} from '../character-system.js';

function tradeArrival(s,id,maxMonths=8){
 const route=s.naval.routes.find(r=>r.id===id);
 for(let i=0;i<maxMonths;i++){
  if(i){s.month++;if(s.month>12){s.month=1;s.year++}}
  advanceNaval(s);
  if(route.last?.reason==='delivered'&&route.last.year===s.year&&route.last.month===s.month)return route.last;
 }
 assert.fail(`No delivered voyage for ${id} within ${maxMonths} months`);
}

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
 let s=newGrandGame('senate');s.factions.caesar.treasury=90;const id='caesar-adriatic',full=fleetUpkeepDue(s.naval.fleets.find(f=>f.id===id));advanceNaval(s);let f=s.naval.fleets.find(x=>x.id===id);assert.equal(f.reserve,true);assert.equal(f.order,null);assert.ok(fleetUpkeepDue(f)<full);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));f=s.naval.fleets.find(x=>x.id===id);s.factions.caesar.treasury=45;s.naval.intel.caesar={'senate-adriatic':{owner:'senate',zone:f.zone,year:s.year,month:s.month,source:'sighting',range:[1,5],confidence:'low'}};advanceNaval(s);assert.equal(f.reserve,true);assert.ok(!f.mobilizing);
 s.factions.caesar.treasury=120;advanceNaval(s);assert.equal(f.reserve,true);assert.equal(f.mobilizing,1);advanceNaval(s);assert.equal(f.reserve,false);assert.equal(f.mobilizing,0);
});
test('an offshore patrol cannot fight a fleet sheltered in port until it sorties',()=>{
 const s=newGrandGame('senate'),patrol=s.naval.fleets.find(f=>f.id==='senate-adriatic'),sheltered=s.naval.fleets.find(f=>f.id==='caesar-adriatic');
 assert.equal(reserveFleet(s,'caesar',sheltered.id).ok,true);
 assert.equal(orderFleet(s,'senate',patrol.id,'patrol','adriatic').ok,true);
 const hull=sheltered.hull;
 advanceNaval(s);
 assert.equal(s.naval.reports.filter(r=>r.kind==='battle').length,0);
 assert.equal(sheltered.hull,hull);
 assert.equal(sheltered.reserve,true);
 sheltered.port=null;sheltered.reserve=false;
 advanceNaval(s);
 assert.ok(s.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(sheltered.id)));
});
test('outnumbered AI preserves its land-war budget before optional patrols, but responds to a reported sea threat',()=>{
 const s=newGrandGame('egypt'),fleet=s.naval.fleets.find(f=>f.id==='caesar-adriatic'),full=fleetUpkeepDue(fleet);
 assert.equal(s.factions.caesar.treasury,180);
 assert.ok(nationalBudget(s,'caesar').projectedNet< -6);
 advanceNaval(s);
 assert.equal(fleet.reserve,true);
 assert.ok(fleetUpkeepDue(fleet)<full);
 const threatened=newGrandGame('egypt'),warned=threatened.naval.fleets.find(f=>f.id==='caesar-adriatic');
 threatened.naval.intel.caesar={'senate-adriatic':{owner:'senate',zone:warned.zone,year:threatened.year,month:threatened.month,source:'sighting',range:[1,5],confidence:'low'}};
 advanceNaval(threatened);
 assert.ok(!warned.reserve,'a current nearby hostile report keeps the fleet ready while the reserve can sustain it');
});
test('a captured harbor cannot resupply, repair or train its former active fleet',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),port=s.regions.find(r=>r.id===f.port),messages=[];
 port.buildings.push('naval-training');f.supply=30;f.hull=60;f.experience=20;f.sailors-=20;
 for(const other of s.naval.fleets.filter(x=>x!==f))other.zone='western';
 for(const pirate of s.naval.pirates)pirate.ships=0;
 const manpower=s.factions.senate.manpower;port.owner='caesar';
 advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
 assert.equal(f.port,null);assert.equal(f.supply,22);assert.equal(f.hull,60);assert.equal(f.experience,20);
 assert.equal(s.factions.senate.manpower,manpower,'lost harbor must not recruit sailors');
 assert.ok(messages.some(m=>m.en.includes('lost its harbor')&&m.zh.includes('失去港口')));
});
test('AI withdraws an unaffordable patrol to port before laying it up',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='caesar');s.naval.fleets.find(x=>x.owner==='senate').zone='tyrrhenian';f.port=null;f.order={kind:'patrol',target:f.zone,path:[]};s.factions.caesar.treasury=20;advanceNaval(s);assert.equal(f.order?.kind,'return');advanceNaval(s);assert.equal(f.port,'cisalpine');assert.equal(f.reserve,true);
});
test('an outnumbered cash-losing AI recalls an optional patrol while it can still fund a levy',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='caesar');
 s.naval.fleets.find(x=>x.owner==='senate').zone='tyrrhenian';
 f.port=null;f.order={kind:'patrol',target:f.zone,path:[]};s.factions.caesar.treasury=65;
 advanceNaval(s);
 assert.ok(s.factions.caesar.treasury>=35,'the previous recall threshold has not yet been reached');
 assert.equal(f.order?.kind,'return');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s))),saved=restored.naval.fleets.find(x=>x.id===f.id);
 advanceNaval(restored);assert.equal(saved.port,'cisalpine');assert.equal(saved.reserve,true);
});
test('a cash-poor AI returns an idle offshore fleet to a friendly port for reserve',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='caesar');
 s.naval.fleets.find(x=>x.owner==='senate').zone='tyrrhenian';
 f.port=null;f.zone='ligurian';f.order=null;s.factions.caesar.treasury=20;
 advanceNaval(s);
 assert.equal(f.order?.kind,'return');
 const safePort=f.order.targetPort;
 assert.equal(s.regions.find(r=>r.id===safePort)?.owner,'caesar');
 const loaded=upgradeSave(structuredClone(s)),saved=loaded.naval.fleets.find(x=>x.id===f.id);
 advanceNaval(loaded);
 assert.equal(saved.port,safePort);
 assert.equal(saved.reserve,true);
 assert.ok(fleetUpkeepDue(saved)<fleetUpkeepDue({...saved,reserve:false}));
});
test('critically damaged and unsupplied fleets can retreat but cannot start a new mission',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');
 s.naval.fleets.find(x=>x.owner==='caesar').zone='western';
 f.port=null;f.zone='ionian';f.hull=20;f.supply=5;
 assert.equal(orderFleet(s,'senate',f.id,'intercept','aegean').reason,'condition');
 assert.equal(orderFleet(s,'senate',f.id,'return','italiaS').ok,true);
 advanceNaval(s);advanceNaval(s);
 assert.equal(f.port,'italiaS');assert.equal(f.order,null);
 advanceNaval(s);assert.ok(f.supply>5);
 const ai=newGrandGame('senate'),enemy=ai.naval.fleets.find(x=>x.owner==='caesar');
 ai.naval.fleets.find(x=>x.owner==='senate').zone='western';
 enemy.port=null;enemy.zone='ionian';enemy.hull=20;enemy.supply=5;
 advanceNaval(ai);assert.equal(enemy.order?.kind,'return');
 advanceNaval(ai);advanceNaval(ai);assert.equal(enemy.port,'cisalpine');
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
 s.factions.senate.food=0;
 assert.equal(reserveFleet(s,'egypt',egypt.id).ok,true);advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');
 assert.equal(mobilizeFleet(s,'egypt',egypt.id).ok,true);advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');assert.equal(egypt.reserve,false);advanceNaval(s);assert.notEqual(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');
 assert.equal(reserveFleet(s,'senate',senate.id).ok,true);s.regions.find(r=>r.id===senate.port).owner='caesar';s.naval.fleets.find(x=>x.owner==='caesar').zone='ligurian';advanceNaval(s);assert.equal(senate.reserve,false);assert.equal(senate.port,null);assert.ok(senate.hull<100);
});
test('a fleet mobilizing in harbor stays sheltered until it sorties',()=>{
 const s=newGrandGame('senate'),own=s.naval.fleets.find(x=>x.owner==='senate'),enemy=s.naval.fleets.find(x=>x.owner==='caesar');
 s.factions.caesar.treasury=300;
 assert.equal(reserveFleet(s,'senate',own.id).ok,true);assert.equal(mobilizeFleet(s,'senate',own.id).ok,true);enemy.zone=own.zone;enemy.port=null;advanceNaval(s);
 assert.equal(s.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(own.id)),false);assert.equal(own.reserve,false);
 assert.equal(orderFleet(s,'senate',own.id,'patrol','adriatic').ok,true);advanceNaval(s);
 assert.ok(s.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(own.id)));
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
test('a captured shipyard cancels unfinished ships before launch',()=>{
 const s=newGrandGame('senate'),messages=[];s.month=2;
 assert.equal(queueShip(s,'senate','italiaS','merchant').ok,true);
 s.naval.queues.find(q=>q.owner==='senate').remaining=1;
 s.regions.find(r=>r.id==='italiaS').owner='caesar';
 advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
 assert.equal(s.naval.queues.some(q=>q.owner==='senate'),false);
 assert.equal(s.naval.fleets.filter(f=>f.owner==='senate').reduce((n,f)=>n+(f.ships.merchant||0),0),0);
 assert.ok(messages.some(m=>m.en.includes('Shipbuilding stopped')&&m.zh.includes('造船工程中止')));
});
test('a returning convoy diverts from a captured port and unloads cargo only at a friendly harbor',()=>{
 const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),messages=[];s.month=2;
 for(const other of s.naval.fleets.filter(x=>x!==f))other.zone='western';
 for(const pirate of s.naval.pirates)pirate.ships=0;
 assert.equal(orderFleet(s,'senate',f.id,'supply','epirus').ok,true);
 const cargo=f.order.cargo;
 assert.equal(orderFleet(s,'senate',f.id,'return','italiaS').ok,true);
 assert.equal(f.order.cargo,cargo);
 s.regions.find(r=>r.id==='italiaS').owner='caesar';
 advanceNaval(s,(_state,en,zh)=>messages.push({en,zh}));
 assert.notEqual(f.port,'italiaS');assert.equal(s.regions.find(r=>r.id===f.port)?.owner,'senate');
 const returned=s.naval.reports.filter(r=>r.kind==='supply-return'&&r.owner==='senate');
 assert.equal(returned.length,1);assert.equal(returned[0].port,f.port);assert.equal(returned[0].cargo,cargo);
 assert.ok(messages.some(m=>m.en.includes('diverted')&&m.zh.includes('改驶')));
 advanceNaval(s);assert.equal(s.naval.reports.filter(r=>r.kind==='supply-return'&&r.owner==='senate').length,1);
});
test('a convoy keeps its cargo offshore until a friendly port becomes available',()=>{
 let s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate');s.month=2;
 for(const other of s.naval.fleets.filter(x=>x!==f))other.zone='western';
 for(const pirate of s.naval.pirates)pirate.ships=0;
 assert.equal(orderFleet(s,'senate',f.id,'supply','epirus').ok,true);
 assert.equal(orderFleet(s,'senate',f.id,'return','italiaS').ok,true);
 const cargo=f.order.cargo;
 for(const r of s.regions.filter(r=>r.owner==='senate'&&r.port))r.owner='caesar';
 advanceNaval(s);
 assert.equal(f.port,null);assert.equal(f.order?.kind,'return');assert.equal(f.order?.targetPort,null);assert.equal(f.order?.cargo,cargo);
 assert.equal(s.naval.reports.some(r=>r.kind==='supply-return'&&r.owner==='senate'),false);
 s=upgradeSave(JSON.parse(JSON.stringify(s)));f=s.naval.fleets.find(x=>x.owner==='senate');
 assert.equal(f.order?.cargo,cargo,'save reload must retain undelivered cargo');
 s.regions.find(r=>r.id==='epirus').owner='senate';
 advanceNaval(s);
 assert.equal(f.port,'epirus');assert.equal(s.naval.reports.filter(r=>r.kind==='supply-return'&&r.owner==='senate').length,1);
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
  const s=newGrandGame('senate'),f=s.naval.fleets.find(x=>x.owner==='senate'),enemy=s.naval.fleets.find(x=>x.owner==='caesar'),person=Object.entries(s.world.characters).find(([id,p])=>p.faction==='senate'&&p.alive&&p.loyalty>=35&&!s.armies.some(a=>a.characterId===id));enemy.zone='ligurian';const out=appointFleet(s,'senate',f.id,person[0]);assert.equal(out.ok,true);for(let i=0;i<out.months;i++)advanceNaval(s);const skill=person[1].navalSkills.commander;enemy.zone=f.zone;enemy.port=null;enemy.order=null;f.port=null;advanceNaval(s);assert.ok(s.naval.reports.some(r=>r.kind==='battle'));assert.equal(person[1].navalSkills.commander,skill+2)
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
  const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate');s.naval.fleets.find(f=>f.owner==='caesar').port=null;assert.deepEqual(reportedHostileFleets(s,'senate'),[]);assert.equal(orderFleet(s,'senate',fleet.id,'intercept','adriatic').ok,true);advanceNaval(s);assert.ok(s.naval.reports.some(r=>r.kind==='battle'));const sighting=reportedHostileFleets(s,'senate').find(r=>r.owner==='caesar');assert.ok(sighting);assert.equal(sighting.month,s.month);assert.ok(sighting.range[0]<sighting.range[1])
});
test('naval battle preserves bounded enemy-loss observations across saves',()=>{
  const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.owner==='senate');s.naval.fleets.find(f=>f.owner==='caesar').port=null;assert.equal(orderFleet(s,'senate',fleet.id,'intercept','adriatic').ok,true);advanceNaval(s);
 const battle=s.naval.reports.find(r=>r.kind==='battle'&&r.participants.includes(fleet.id)),enemyId=battle.participants.find(id=>id!==fleet.id),loss=battle.losses[enemyId],observed=battle.observedLosses.senate;
 assert.ok(observed.ships[0]<=loss.sunk&&loss.sunk<=observed.ships[1]);assert.ok(observed.ships[1]>observed.ships[0]);
 assert.ok(observed.sailors[0]<=loss.sailors&&loss.sailors<=observed.sailors[1]);assert.ok(observed.sailors[1]>observed.sailors[0]);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(restored.naval.reports.find(r=>r.id===battle.id).observedLosses.senate,observed);
});
test('naval reconnaissance can miss, observe approximately or evade a real encounter',()=>{
  const run=seed=>{const s=newGrandGame('senate'),scout=s.naval.fleets.find(f=>f.id==='senate-adriatic'),messages=[];scout.ships={light:3};scout.sailors=240;s.naval.fleets.find(f=>f.id==='caesar-adriatic').port=null;s.seed=seed;
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
 const s=newGrandGame('senate'),route=s.naval.routes.find(r=>r.id==='egypt-italy');s.factions.senate.food=0;s.factions.egypt.food=60;const before=s.factions.senate.treasury;
 advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(route.last.amount,0);assert.equal(s.factions.senate.food,0);assert.equal(s.factions.egypt.food,56);assert.equal(s.naval.voyages.find(v=>v.routeId===route.id).cargo,4);
 s.month++;advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(s.factions.senate.food,0);
 s.month++;advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(s.factions.senate.food,0);
 s.month++;advanceNaval(s);assert.equal(route.last.reason,'delivered');assert.equal(route.last.amount,4);assert.equal(s.factions.senate.food,4);assert.ok(s.factions.senate.treasury<=before);
 const shipless=newGrandGame('senate');shipless.naval.fleets.find(f=>f.owner==='egypt').ships.merchant=0;shipless.factions.senate.food=0;advanceNaval(shipless);assert.equal(shipless.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');
});
test('a staffed market ship carries finite civic goods by sea and the destination consumes them once',()=>{
 let s=newGrandGame('senate');s.naval.pirates=[];
 for(const route of s.naval.routes)if(route.id!=='african-oil')route.pausedBy=[s.regions.find(r=>r.id===route.from).owner];
 const route=s.naval.routes.find(r=>r.id==='african-oil'),city=s.regions.find(r=>r.id===route.to),starting=city.civicSatisfaction;
 assert.equal(s.naval.fleets.find(f=>f.id==='market-africa').ships.merchant,1);
 advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(s.naval.voyages.find(v=>v.routeId===route.id).cargo,2);
 s=upgradeSave(structuredClone(s));assert.equal(s.naval.fleets.filter(f=>f.id==='market-africa').length,1);
 for(let i=0;i<4&&s.naval.routes.find(r=>r.id===route.id).last.reason!=='delivered';i++){s.month++;advanceNaval(s)}
 const delivered=s.naval.routes.find(r=>r.id===route.id).last;
 assert.equal(delivered.amount,2);assert.equal(delivered.marketBenefit,2);assert.equal(delivered.paid,0);
 assert.equal(s.regions.find(r=>r.id===city.id).civicSatisfaction,starting+2);
 assert.match(tradeCard(s,s.naval.routes.find(r=>r.id===route.id),false),/Destination civic satisfaction \+2/);
 assert.match(tradeCard(s,s.naval.routes.find(r=>r.id===route.id),true),/目的港满意度 \+2/);
 s.regions.find(r=>r.id===city.id).civicSatisfaction=80;s.month++;advanceNaval(s);
 assert.equal(s.naval.routes.find(r=>r.id===route.id).last.reason,'stocked');
 assert.equal(s.naval.voyages.some(v=>v.routeId===route.id&&v.phase==='outbound'),false);
});
test('foreign market cargo transfers only paid treasury and raises the receiving city',()=>{
 const s=newGrandGame('senate');s.naval.pirates=[];
 s.naval.fleets=s.naval.fleets.filter(f=>f.id==='market-mauretania');
 for(const route of s.naval.routes)if(route.id!=='western-horses')route.pausedBy=[s.regions.find(r=>r.id===route.from).owner];
 const route=s.naval.routes.find(r=>r.id==='western-horses'),city=s.regions.find(r=>r.id===route.to),before={buyer:s.factions.senate.treasury,seller:s.factions.mauretania.treasury,civic:city.civicSatisfaction};
 for(let i=0;i<8&&route.last?.reason!=='delivered';i++){if(i)s.month++;advanceNaval(s)}
 assert.equal(route.last.reason,'delivered');assert.ok(route.last.amount>0&&route.last.paid>0);
 assert.equal(s.factions.senate.treasury,before.buyer-route.last.paid);
 assert.equal(s.factions.mauretania.treasury,before.seller+route.last.paid);
 assert.equal(city.civicSatisfaction,before.civic+route.last.marketBenefit);
});
test('a wartime command reserves levy cash instead of buying optional foreign market goods',()=>{
 const s=newGrandGame('senate');s.naval.pirates=[];
 for(const route of s.naval.routes)if(route.id!=='western-horses')route.pausedBy=[s.regions.find(r=>r.id===route.from).owner];
 const route=s.naval.routes.find(r=>r.id==='western-horses');
 s.factions.senate.treasury=25;advanceNaval(s);
 assert.equal(route.last.reason,'war-reserve');assert.equal(s.naval.voyages.some(v=>v.routeId===route.id),false);
 s.month++;s.factions.senate.treasury=100;advanceNaval(s);
 assert.equal(route.last.reason,'enroute');assert.equal(s.naval.voyages.some(v=>v.routeId===route.id),true);
});
test('a delivery remains in the monthly trade report when the city reaches its demand cap',()=>{
 const s=newGrandGame('senate');s.naval.pirates=[];
 for(const route of s.naval.routes)if(route.id!=='african-oil')route.pausedBy=[s.regions.find(r=>r.id===route.from).owner];
 const city=s.regions.find(r=>r.id==='t016'),fleet=s.naval.fleets.find(f=>f.id==='market-africa'),route=s.naval.routes.find(r=>r.id==='african-oil');
 city.civicSatisfaction=78;fleet.ships.merchant=3;fleet.sailors=135;
 for(let i=0;i<3;i++){if(i)s.month++;advanceNaval(s)}
 assert.equal(city.civicSatisfaction,80);assert.equal(route.last.reason,'delivered');assert.equal(route.last.marketBenefit,2);
});
test('older saves receive missing market vessels once without duplicating existing hulls',()=>{
 let s=newGrandGame('senate');s.naval.version=2;s.naval.fleets=s.naval.fleets.filter(f=>!f.id.startsWith('market-'));
 s=upgradeSave(structuredClone(s));const ids=s.naval.fleets.filter(f=>f.id.startsWith('market-')).map(f=>f.id);
 assert.equal(s.naval.version,3);assert.deepEqual(ids.sort(),['market-africa','market-mauretania','market-narbo','market-t114']);
 s=upgradeSave(structuredClone(s));assert.deepEqual(s.naval.fleets.filter(f=>f.id.startsWith('market-')).map(f=>f.id).sort(),ids);
});
test('an uncrewed merchant hull cannot create sailors when trade departs',()=>{
 const s=newGrandGame('senate'),fleet=s.naval.fleets.find(f=>f.id==='egypt-grain');s.factions.senate.food=0;fleet.sailors=0;
 advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'merchant');assert.equal(s.naval.voyages.some(v=>v.routeId==='egypt-italy'),false);
});
test('merchant cargo and its hull survive reload, arrive by sea, and return without duplication',()=>{
 let s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const route=s.naval.routes[0],fleet=s.naval.fleets.find(f=>f.id==='egypt-grain');fleet.ships.merchant=1;
 advanceNaval(s);assert.equal(route.last.reason,'enroute');assert.equal(fleet.ships.merchant,0);assert.equal(s.factions.egypt.food,56);assert.equal(s.factions.senate.food,0);
 assert.match(tradeCard(s,route,false),/Cargo at sea 4/);assert.match(tradeCard(s,route,true),/在途货物 4/);
 s=upgradeSave(structuredClone(s));assert.equal(s.naval.version,3);assert.equal(s.naval.voyages[0].cargo,4);assert.equal(s.naval.voyages[0].zone,'alexandrian');
 const delivered=tradeArrival(s,route.id);assert.equal(delivered.amount,4);assert.equal(delivered.paid,4*delivered.unitPrice);assert.equal(s.factions.senate.food,4);assert.equal(s.factions.egypt.food,56);
 assert.equal(toggleTradeRoute(s,'senate',route.id).paused,true);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.voyages.filter(v=>v.routeId===route.id).length,0);assert.equal(s.naval.fleets.reduce((sum,f)=>sum+(f.owner==='egypt'?f.ships.merchant||0:0),0)+s.naval.voyages.filter(v=>v.vesselOwner==='egypt').length,1);
 assert.equal(s.factions.senate.food,4);assert.equal(s.factions.egypt.food,56);
});
test('a raid in a later sea zone takes loaded cargo, not a second draw from the seller',()=>{
 const s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const caesar=s.naval.fleets.find(f=>f.owner==='caesar');caesar.zone='eastern';caesar.port=null;
 advanceNaval(s);const loaded=s.naval.voyages[0];assert.equal(loaded.zone,'alexandrian');assert.equal(s.factions.egypt.food,56);
 assert.equal(orderFleet(s,'caesar',caesar.id,'raid','egypt-italy').ok,true);s.month++;advanceNaval(s);
 const last=s.naval.routes[0].last;assert.equal(last.reason,'raid');assert.ok(last.captured>0);assert.equal(s.factions.egypt.food,56);assert.equal(s.factions.senate.food,0);assert.equal(loaded.cargo+last.captured,4);assert.equal(loaded.phase,'return');
});
test('pirates in a later sea zone seize only cargo aboard the merchant voyage',()=>{
 const s=newGrandGame('senate');s.seed=2175734977;s.factions.senate.food=0;s.factions.egypt.food=60;
 s.naval.pirates=s.naval.pirates.filter(p=>p.id==='cilician-raiders');const pirate=s.naval.pirates[0];pirate.zone='eastern';pirate.pressure=70;
 advanceNaval(s);const voyage=s.naval.voyages.find(v=>v.routeId==='egypt-italy');assert.equal(voyage.zone,'alexandrian');assert.equal(s.factions.egypt.food,56);
 s.month++;advanceNaval(s);const last=s.naval.routes.find(r=>r.id==='egypt-italy').last;
 assert.equal(last.reason,'piracy');assert.equal(last.zone,'eastern');assert.equal(last.captured,4);assert.equal(pirate.cargo.grain,4);
 assert.equal(s.factions.egypt.food,56);assert.equal(s.factions.senate.food,0);assert.equal(voyage.cargo,0);assert.equal(voyage.phase,'return');
});
test('pausing imports after departure returns undelivered cargo without charging the buyer',()=>{
 const s=newGrandGame('senate');s.naval.routes=s.naval.routes.filter(r=>r.id==='egypt-italy');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const route=s.naval.routes[0];advanceNaval(s);assert.equal(s.factions.egypt.food,56);assert.equal(toggleTradeRoute(s,'senate',route.id).paused,true);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 assert.equal(route.last.reason,'closed');assert.equal(route.last.paid,0);assert.equal(s.factions.senate.food,0);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 assert.equal(s.factions.egypt.food,60);assert.equal(s.naval.voyages.filter(v=>v.routeId===route.id).length,0);
});
test('a merchant return diverts from a captured origin harbor with its cargo intact',()=>{
 const s=newGrandGame('egypt');s.naval.pirates=[];s.factions.senate.food=0;s.factions.egypt.food=60;
 const route=s.naval.routes.find(r=>r.id==='egypt-italy');advanceNaval(s);assert.ok(s.naval.voyages.some(v=>v.routeId===route.id));
 route.pausedBy=['senate'];s.regions.find(r=>r.id==='t091').owner='egypt';s.regions.find(r=>r.id==='egypt').owner='caesar';
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 const voyage=s.naval.voyages.find(v=>v.routeId===route.id);assert.equal(voyage.phase,'return');assert.equal(voyage.returnPort,'t091');assert.equal(s.factions.senate.food,0);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.voyages.some(v=>v.routeId===route.id),false);assert.equal(s.factions.egypt.food,60);
 assert.ok(s.naval.fleets.some(f=>f.owner==='egypt'&&f.zone==='aegean'&&(f.ships.merchant||0)>0));
});
test('a buyer-owned merchant returns refused goods to the seller before sailing home',()=>{
 const s=newGrandGame('senate');s.naval.pirates=[];s.naval.fleets=s.naval.fleets.filter(f=>!f.id.startsWith('market-'));s.factions.senate.food=0;s.factions.egypt.food=60;
 const sellerFleet=s.naval.fleets.find(f=>f.id==='egypt-grain');sellerFleet.ships.merchant=0;
 const buyerFleet={...structuredClone(sellerFleet),id:'senate-trader',owner:'senate',ships:{merchant:1},sailors:45,zone:'alexandrian',port:null,order:null};s.naval.fleets.push(buyerFleet);
 const route=s.naval.routes.find(r=>r.id==='egypt-italy');advanceNaval(s);assert.equal(s.naval.voyages.find(v=>v.routeId===route.id).vesselOwner,'senate');assert.equal(s.factions.egypt.food,56);
 assert.equal(toggleTradeRoute(s,'senate',route.id).paused,true);
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 let voyage=s.naval.voyages.find(v=>v.routeId===route.id);assert.equal(voyage.phase,'return');assert.equal(voyage.returnPort,'egypt');
 for(let i=0;i<3;i++){s.month++;advanceNaval(s)}
 voyage=s.naval.voyages.find(v=>v.routeId===route.id);assert.equal(s.factions.egypt.food,60);assert.equal(voyage.cargo,0);assert.notEqual(voyage.returnPort,'egypt');
 for(let i=0;i<6&&s.naval.voyages.some(v=>v.routeId===route.id);i++){s.month++;advanceNaval(s)}
 assert.equal(s.naval.voyages.some(v=>v.routeId===route.id),false);assert.equal(s.naval.fleets.reduce((sum,f)=>sum+(f.owner==='senate'?f.ships.merchant||0:0),0)+s.naval.voyages.filter(v=>v.vesselOwner==='senate').length,1);
});
test('trade prices respond to scarcity and charge for the quantity delivered',()=>{
 const run=food=>{const s=newGrandGame('senate');s.factions.senate.food=food;s.factions.egypt.food=80;advanceNaval(s);const route=s.naval.routes.find(r=>r.id==='egypt-italy');if(route.last.reason!=='enroute')return route.last;s.month++;return tradeArrival(s,'egypt-italy')};
 const scarce=run(10),ample=run(80);assert.equal(scarce.reason,'delivered');assert.equal(scarce.amount,4);assert.ok(scarce.unitPrice>ample.unitPrice);assert.equal(scarce.paid,scarce.amount*scarce.unitPrice);
 const short=newGrandGame('senate');short.regions.find(r=>r.id==='africa').owner='egypt';const egyptian=short.naval.fleets.find(f=>f.owner==='egypt');egyptian.zone='african';egyptian.port=null;advanceNaval(short);assert.ok(ample.unitPrice>short.naval.routes.find(r=>r.id==='africa-sicily').last.unitPrice);
 const cashPoor=newGrandGame('senate');cashPoor.factions.senate.food=10;cashPoor.factions.senate.treasury=40;
 for(const route of cashPoor.naval.routes)if(route.id!=='egypt-italy')route.pausedBy=[cashPoor.regions.find(r=>r.id===route.from).owner];
 const partial=tradeArrival(cashPoor,'egypt-italy');assert.ok(partial.amount>0&&partial.amount<4);assert.equal(partial.paid,partial.amount*partial.unitPrice);
});
test('grain imports stop charging an already provisioned command and fill only a real shortfall',()=>{
 const stocked=newGrandGame('senate');stocked.factions.senate.food=25;advanceNaval(stocked);
 const route=stocked.naval.routes.find(r=>r.id==='egypt-italy');
 assert.equal(route.last.reason,'stocked');assert.equal(route.last.amount,0);assert.equal(route.last.paid,0);
 const needy=newGrandGame('senate');needy.factions.senate.food=15;const delivery=tradeArrival(needy,'egypt-italy');
 assert.equal(delivery.reason,'delivered');assert.equal(delivery.amount,3);
 assert.equal(needy.factions.senate.food,18);assert.equal(delivery.paid,3*delivery.unitPrice);
});
test('an outnumbered grain buyer preserves a levy fund unless food is critical',()=>{
 const setup=food=>{const s=newGrandGame('egypt');s.regions.find(r=>r.id==='t016').owner='caesar';s.factions.caesar.treasury=25;s.factions.caesar.food=food;
  assert.equal(reserveFleet(s,'caesar','caesar-adriatic').ok,true);advanceNaval(s);return s};
 const stable=setup(15),deferred=stable.naval.routes.find(r=>r.id==='egypt-italy').last;
 assert.equal(deferred.reason,'war-reserve');assert.equal(deferred.amount,0);assert.equal(deferred.paid,0);
 const hungry=setup(4),delivery=tradeArrival(hungry,'egypt-italy');
 assert.equal(delivery.reason,'delivered');assert.ok(delivery.amount>0);assert.ok(delivery.paid>0);
});
test('a ruler may pause and resume a real sea import without paying for paused cargo',()=>{
 const s=newGrandGame('senate'),route=s.naval.routes.find(r=>r.id==='egypt-italy');
 s.factions.senate.food=0;s.factions.egypt.food=60;s.naval.pirates=[];
 assert.equal(toggleTradeRoute(s,'caesar',route.id).ok,false);
 assert.equal(toggleTradeRoute(s,'senate','missing').ok,false);
 assert.match(tradeCard(s,route,false),/PAUSE IMPORTS/);
 assert.match(tradeCard(s,route,true),/暂停进口/);
 assert.equal(toggleTradeRoute(s,'senate',route.id).paused,true);
 assert.match(tradeCard(s,route,false),/RESUME ROUTE/);
 const stability=s.factions.senate.stability;
 advanceNaval(s);
 assert.equal(route.last.reason,'paused');assert.equal(route.last.amount,0);assert.equal(route.last.paid,0);
 assert.equal(s.factions.senate.food,0);assert.equal(s.factions.senate.stability,stability);
 assert.equal(nationalBudget(s,'senate').tradeImportPaid,s.naval.routes.filter(r=>r.id!==route.id&&r.last?.buyer==='senate'&&r.last.seller!=='senate').reduce((sum,r)=>sum+r.last.paid,0));
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(loaded.naval.routes.find(r=>r.id===route.id).pausedBy,['senate']);
 assert.equal(toggleTradeRoute(loaded,'senate',route.id).paused,false);
 const completed=tradeArrival(loaded,route.id);
 assert.equal(completed.reason,'delivered');assert.ok(completed.amount>0&&completed.paid>0);
 assert.ok(nationalBudget(loaded,'senate').tradeImportPaid>=completed.paid);
 assert.match(budgetHtml(loaded,'en'),/Maritime imports paid this month/);
 assert.match(budgetHtml(loaded,'zh'),/本月已付海运进口费/);
 const exporter=newGrandGame('egypt'),exportRoute=exporter.naval.routes.find(r=>r.id===route.id);
 assert.match(tradeCard(exporter,exportRoute,false),/PAUSE EXPORTS/);
 assert.equal(toggleTradeRoute(exporter,'egypt',route.id).paused,true);
 advanceNaval(exporter);assert.equal(exportRoute.last.reason,'paused');
});
test('taking a foreign trade port does not reveal its previous owner’s shipment',()=>{
 const s=newGrandGame('caesar'),route=s.naval.routes.find(r=>r.id==='egypt-italy');
 s.factions.senate.food=0;s.naval.pirates=[];advanceNaval(s);
 assert.equal(route.last.buyer,'senate');assert.equal(route.last.seller,'egypt');
 s.regions.find(r=>r.id==='t016').owner='caesar';
 const en=tradeCard(s,route,false),zh=tradeCard(s,route,true);
 assert.match(en,/Awaiting first voyage under your control/);assert.match(zh,/等待己方首次航行/);
 assert.doesNotMatch(en,/Unit price|Paid|Route security \d/);
 assert.doesNotMatch(zh,/单价|实际付款|航路安全 \d/);
 assert.equal(nationalBudget(s,'caesar').tradeImportPaid,0);
 delete route.last.buyer;delete route.last.seller;
 assert.doesNotMatch(tradeCard(s,route,false),/Unit price|Paid/,'old saves without shipment provenance stay private');
});
test('foreign trade routes keep shipment and security figures private',()=>{
 const s=newGrandGame('senate'),foreign={from:'egypt',to:'mauretania',good:'grain',volume:9,last:{amount:7,security:99,reason:'delivered',unitPrice:4,paid:28}};
 for(const zh of [false,true]){const html=tradeCard(s,foreign,zh);assert.match(html,zh?/外国商路/:/Foreign route/);assert.doesNotMatch(html,/99|28|计划货量|Planned volume/)}
 const own={from:'egypt',to:'t016',good:'grain',volume:'<img src=x>',last:{amount:'<svg onload=alert(1)>',security:99,reason:'delivered'}};
 assert.doesNotMatch(tradeCard(s,own,false),/<img|<svg/);
});
test('a hostile trade raid physically transfers captured cargo to its fleet owner',()=>{
 const s=newGrandGame('senate'),raider=s.naval.fleets.find(f=>f.owner==='caesar');s.factions.senate.food=0;raider.zone='alexandrian';raider.port=null;
 assert.equal(orderFleet(s,'caesar',raider.id,'raid','egypt-italy').ok,true);
 const relationKey='caesar:egypt',before={egypt:s.factions.egypt.food,caesar:s.factions.caesar.food,senate:s.factions.senate.food,relation:s.relations[relationKey]??0};advanceNaval(s);
 const result=s.naval.routes.find(r=>r.id==='egypt-italy').last;
 assert.equal(result.reason,'raid');assert.ok(result.captured>0);assert.equal(result.amount,0);assert.equal(result.paid,0);
 assert.equal(s.factions.egypt.food,before.egypt-result.captured);assert.equal(s.factions.caesar.food,before.caesar+result.captured);assert.equal(s.factions.senate.food,before.senate);
 assert.ok(s.naval.reports.some(r=>r.kind==='trade-raid'&&r.captured===result.captured));
 assert.equal(s.relations[relationKey],before.relation-6);
 assert.ok(s.naval.reports.some(r=>r.kind==='trade-incident'&&r.owner==='egypt'&&r.raider==='caesar'&&r.captured===result.captured));
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).relations[relationKey],before.relation-6);
});
test('a neutral fleet cannot raid commerce, and a saved raid stops when war ends',()=>{
 const s=newGrandGame('senate'),neutral={...s.naval.fleets.find(f=>f.owner==='senate'),id:'neutral-raider',owner:'numidia',zone:'alexandrian',port:null,order:null};
 s.naval.fleets.push(neutral);
 assert.deepEqual(orderFleet(s,'numidia',neutral.id,'raid','egypt-italy'),{ok:false,reason:'war'});
 assert.deepEqual(orderFleet(s,'senate','senate-adriatic','raid','egypt-italy'),{ok:false,reason:'war'});
 const hostile=s.naval.fleets.find(f=>f.owner==='caesar');hostile.zone='alexandrian';hostile.port=null;
 assert.equal(orderFleet(s,'caesar',hostile.id,'raid','egypt-italy').ok,true);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));loaded.wars=[];
 advanceNaval(loaded);
 assert.equal(loaded.naval.fleets.find(f=>f.id===hostile.id).order,null);
 assert.notEqual(loaded.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'raid');
 assert.equal(loaded.naval.reports.some(r=>r.kind==='trade-raid'),false);
});
test('AI can order a real army transport when a hostile coast is reachable by sea',()=>{
 const s=newGrandGame('caesar');for(const r of s.regions)r.owner='egypt';s.regions.find(r=>r.id==='italiaS').owner='senate';s.regions.find(r=>r.id==='t075').owner='caesar';s.armies=s.armies.filter(a=>a.id==='italy');s.armies[0].region='italiaS';
 aiTurn(s,'senate');assert.equal(s.armies[0].move?.sea,true);assert.equal(s.armies[0].move?.to,'t075');assert.equal(s.naval.fleets.find(f=>f.owner==='senate').order?.armyId,'italy');
});
test('same-zone Adriatic transport remains offshore for interception before docking',()=>{
 const setup=()=>{const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');army.region='italiaS';army.men=5200;s.regions.find(r=>r.id==='t075').owner='caesar';enemy.zone=portZone('italiaS');enemy.port=null;return s};
 const exposed=setup();assert.equal(moveArmy(exposed,'italy','t075').ok,true);
 assert.deepEqual(exposed.naval.fleets.find(f=>f.id==='senate-adriatic').order.path,['adriatic']);
 advanceNaval(exposed);
 assert.equal(exposed.naval.fleets.find(f=>f.id==='senate-adriatic').port,null);
 assert.ok(exposed.naval.reports.some(r=>r.kind==='battle'&&r.zone==='adriatic'&&r.participants.includes('senate-adriatic')),'an enemy fleet in the crossing zone can engage the transport');
 const safe=setup();safe.naval.fleets=safe.naval.fleets.filter(f=>f.owner==='senate');assert.equal(moveArmy(safe,'italy','t075').ok,true);
 advanceNaval(safe);const loaded=upgradeSave(JSON.parse(JSON.stringify(safe))),fleet=loaded.naval.fleets.find(f=>f.id==='senate-adriatic');
 assert.equal(fleet.port,null);assert.equal(fleet.order?.kind,'transport');assert.equal(loaded.armies.find(a=>a.id==='italy').move.transportReady,false);
 advanceNaval(loaded);assert.equal(fleet.port,'t075');assert.equal(fleet.order,null);assert.equal(loaded.armies.find(a=>a.id==='italy').move.transportReady,true);
});
test('AI stages a transport fleet at an isolated army port and waits for embarkation',()=>{
 const setup=()=>{
  const s=newGrandGame('caesar');for(const r of s.regions)r.owner='egypt';
  for(const id of ['italiaS','epirus'])s.regions.find(r=>r.id===id).owner='senate';
  s.regions.find(r=>r.id==='t075').owner='caesar';
  s.armies=s.armies.filter(a=>a.id==='italy');s.armies[0].region='italiaS';
  s.naval.fleets=s.naval.fleets.filter(f=>f.owner==='senate');
  const fleet=s.naval.fleets[0];fleet.port='epirus';fleet.zone=portZone('epirus');fleet.reserve=false;fleet.order=null;
  s.factions.senate.treasury=200;return s;
 };
 const warned=setup();warned.naval.intel.senate={'caesar-adriatic':{owner:'caesar',zone:portZone('epirus'),year:warned.year,month:warned.month,range:[8,12],confidence:'high'}};
 advanceNaval(warned);
 assert.notEqual(warned.naval.fleets[0].order?.targetPort,'italiaS','a strong reported hostile fleet blocks staging');
 const cashPoor=setup();cashPoor.factions.senate.treasury=25;advanceNaval(cashPoor);
 assert.notEqual(cashPoor.naval.fleets[0].order?.targetPort,'italiaS','a fleet without a funded voyage stays available for reserve');
 const afloat=setup();afloat.naval.fleets[0].port=null;advanceNaval(afloat);
 assert.equal(afloat.naval.fleets[0].order?.targetPort,'italiaS','an idle fleet at sea can also meet the army');
 const s=setup();advanceNaval(s);
 assert.equal(s.naval.fleets[0].order?.kind,'return');
 assert.equal(s.naval.fleets[0].order?.targetPort,'italiaS');
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s))),fleet=loaded.naval.fleets[0];
 for(let i=0;i<8&&fleet.port!=='italiaS';i++)advanceNaval(loaded);
 assert.equal(fleet.port,'italiaS');
 assert.equal(fleet.order,null,'the fleet waits for the army instead of taking a new patrol order');
 aiTurn(loaded,'senate');
 assert.equal(loaded.armies[0].move?.sea,true);
 assert.equal(fleet.order?.kind,'transport');
 assert.equal(fleet.order?.armyId,'italy');
 const live=setup();tick(live);
 assert.equal(live.armies.find(a=>a.id==='italy').region,'italiaS','staging does not teleport the army');
 assert.equal(live.naval.fleets[0].port,null);
 tick(live);assert.equal(live.armies.find(a=>a.id==='italy').move?.sea,true);
 tick(live);assert.equal(live.armies.find(a=>a.id==='italy').region,'italiaS');
 tick(live);assert.equal(live.armies.find(a=>a.id==='italy').region,'t075','the ordered fleet carries the army across the sea');
});
test('AI takes an available land route instead of stalling at a sea link without transports',()=>{
 const s=newGrandGame('caesar');
 for(const r of s.regions)if(r.id!=='t036'&&r.owner==='caesar')r.owner='senate';
 s.armies=s.armies.filter(a=>a.owner==='senate').slice(0,1);
 const unit=s.armies[0];unit.region='t026';unit.men=3500;unit.move=null;unit.siege=null;
 s.factions.senate.treasury=60;s.factions.senate.food=100;
 assert.equal(s.naval.fleets.find(f=>f.owner==='senate').port,'italiaS');
 aiTurn(s,'senate');
 assert.equal(unit.move?.to,'t022');assert.equal(unit.move?.sea,false);
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
 const s=newGrandGame('egypt');s.regions.find(r=>r.id==='anatolia').owner='egypt';s.factions.senate.food=0;
 assert.equal(orderFleet(s,'egypt','egypt-grain','supply','anatolia').ok,true);
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
test('AI can supply an inland front through friendly land routes beyond the harbor neighbor',()=>{
 const s=newGrandGame('egypt'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic'),army=s.armies.find(a=>a.id==='italy');
 s.naval.routes=[];s.factions.senate.treasury=200;s.factions.senate.food=50;
 for(const r of s.regions)if(r.owner==='senate'&&r.port&&r.id!=='t016')r.food=1.25;
 s.regions.find(r=>r.id==='t016').food=.4;army.region='t018';army.operationalSupply=.4;
 advanceNaval(s);
 assert.equal(fleet.order?.kind,'supply');assert.equal(fleet.order.targetPort,'t016');
 const cut=newGrandGame('egypt'),cutFleet=cut.naval.fleets.find(f=>f.id==='senate-adriatic'),cutArmy=cut.armies.find(a=>a.id==='italy');
 cut.naval.routes=[];cut.factions.senate.treasury=200;cut.factions.senate.food=50;
 for(const r of cut.regions)if(r.owner==='senate'&&r.port&&r.id!=='t016')r.food=1.25;
 cut.regions.find(r=>r.id==='t016').food=.4;cutArmy.region='t018';cutArmy.operationalSupply=.4;
 for(const id of ['roma','t017'])cut.regions.find(r=>r.id===id).owner='caesar';
 advanceNaval(cut);
 assert.notEqual(cutFleet.order?.kind,'supply','a hostile land corridor cannot carry port provisions to the army');
});
test('inland armies consume finite port provisions, and an occupied corridor breaks delivery',()=>{
 const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy');army.region='t018';army.men=8000;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 s.naval.provisions.t016={owner:'senate',food:10};
 advanceNaval(s);assert.equal(s.naval.provisions.t016.food,7);
 for(const id of ['roma','t017'])s.regions.find(r=>r.id===id).owner='caesar';
 advanceNaval(s);assert.equal(s.naval.provisions.t016.food,6);
});
test('a provisioned port establishes a finite three-link inland supply reach',()=>{
 const s=newGrandGame('senate'),corridor=new Set(['t016','t017','t019','t021','t023']);
 for(const r of s.regions)if(r.owner==='senate')r.owner=corridor.has(r.id)?'senate':'caesar';
 for(const id of corridor)s.regions.find(r=>r.id===id).food=.4;
 s.naval.provisions.t016={owner:'senate',food:8};
 const line=supplyNetwork(s,'senate',true);
 assert.equal(line.has('t021'),true);
 assert.equal(line.has('t023'),false,'one port stock must not provision an unlimited inland chain');
 const army=s.armies.find(a=>a.id==='italy');army.region='t021';
 const supplied=armySupply(s,army);assert.ok(supplied>.68);
 s.regions.find(r=>r.id==='t017').owner='caesar';
 assert.equal(supplyNetwork(s,'senate',true).has('t021'),false);
 assert.ok(armySupply(s,army)<supplied);
});
test('paid wagons carry finite port food beyond three links over a saved friendly route',()=>{
 const s=newGrandGame('senate'),corridor=new Set(['t016','t017','t019','t021','t023']);
 for(const r of s.regions)if(r.owner==='senate')r.owner=corridor.has(r.id)?'senate':'caesar';
 for(const id of corridor)s.regions.find(r=>r.id===id).food=.4;
 const army=s.armies.find(a=>a.id==='italy');army.region='t023';army.men=8000;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 s.naval.provisions.t016={owner:'senate',food:10};s.factions.senate.treasury=100;
 const baseline=armySupply(s,army),plan=wagonSupplyPlan(s,'senate','t016','t023');
 assert.equal(plan.ok,true);assert.equal(plan.months,2);assert.equal(plan.expectedDelivery,6);
 const cash=s.factions.senate.treasury;
 assert.equal(dispatchWagonSupply(s,'senate','t016','t023').ok,true);
 assert.equal(s.factions.senate.treasury,cash-plan.cost);
 assert.equal(s.naval.provisions.t016.food,2);
 assert.equal(dispatchWagonSupply(s,'senate','t016','t023').reason,'pending');
 advanceNaval(s);assert.equal(s.naval.wagons[0].index,2);assert.equal(s.naval.inlandProvisions.t023,undefined);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 advanceNaval(loaded);
 assert.equal(loaded.naval.wagons.length,0);
 assert.equal(loaded.naval.inlandProvisions.t023.food,3,'six units arrive, then the 8,000-man army draws three');
 assert.ok(armySupply(loaded,loaded.armies.find(a=>a.id==='italy'))>baseline);
 assert.ok(loaded.naval.reports.some(r=>r.kind==='wagon-delivery'&&r.lost===2&&r.cargo===6));
 advanceNaval(loaded);assert.equal(loaded.naval.inlandProvisions.t023,undefined);
 assert.equal(armySupply(loaded,loaded.armies.find(a=>a.id==='italy')),baseline);
});
test('occupation cuts an inland wagon route and AI uses stocked ports for distant fronts',()=>{
 const setup=player=>{const s=newGrandGame(player),corridor=new Set(['t016','t017','t019','t021','t023']);for(const r of s.regions)if(r.owner==='senate')r.owner=corridor.has(r.id)?'senate':'caesar';const army=s.armies.find(a=>a.id==='italy');army.region='t023';army.men=8000;army.operationalSupply=.3;for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;s.naval.provisions.t016={owner:'senate',food:10};s.factions.senate.treasury=150;return s};
 const cut=setup('senate');assert.equal(dispatchWagonSupply(cut,'senate','t016','t023').ok,true);
 cut.regions.find(r=>r.id==='t019').owner='caesar';advanceNaval(cut);
 assert.equal(cut.naval.wagons.length,0);assert.equal(cut.naval.inlandProvisions.t023,undefined);
 assert.ok(cut.naval.reports.some(r=>r.kind==='wagon-loss'&&r.reason==='route occupied'));
 const ai=setup('egypt');advanceNaval(ai);
 assert.equal(ai.naval.wagons[0]?.owner,'senate');assert.equal(ai.naval.wagons[0]?.to,'t023');
});
test('AI sends a real sea shipment and then a paid wagon column to a distant front',()=>{
 const s=newGrandGame('egypt'),army=s.armies.find(a=>a.id==='italy'),fleet=s.naval.fleets.find(f=>f.id==='senate-adriatic');
 s.factions.senate.treasury=300;s.factions.senate.food=80;army.region='t023';army.operationalSupply=.3;
 for(const r of s.regions)if(r.owner==='senate'&&r.port)r.food=r.id==='t016'?.3:.9;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 advanceNaval(s);assert.equal(fleet.order?.targetPort,'t016');assert.equal(s.factions.senate.food,74);
 for(let i=0;i<3;i++)advanceNaval(s);
 assert.equal(s.factions.senate.food,74,'one needy army must not trigger overlapping shipments from other ports');
 assert.equal(s.naval.wagons[0]?.from,'t016');assert.equal(s.naval.wagons[0]?.to,'t023');
 assert.ok(s.naval.reports.some(r=>r.kind==='supply-delivery'&&r.port==='t016'));
});
test('overlapping inland and port stores provision an army once, and captured depots vanish',()=>{
 const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy');army.region='t017';army.men=8000;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 s.naval.provisions.t016={owner:'senate',food:10};s.naval.inlandProvisions.t017={owner:'senate',food:7};
 advanceNaval(s);
 assert.equal(s.naval.inlandProvisions.t017.food,4);
 assert.equal(s.naval.provisions.t016.food,9,'the same army cannot draw a second port ration');
 s.regions.find(r=>r.id==='t017').owner='caesar';advanceNaval(s);
 assert.equal(s.naval.inlandProvisions.t017,undefined);
});
test('overlapping port stores charge an army to only one port when that store runs dry',()=>{
 const s=newGrandGame('senate'),army=s.armies.find(a=>a.id==='italy');army.region='t017';army.men=8000;
 for(const other of s.armies)if(other.owner==='senate'&&other.id!==army.id)other.men=0;
 s.naval.provisions.t016={owner:'senate',food:1};s.naval.provisions.t019={owner:'senate',food:10};
 advanceNaval(s);
 assert.equal(s.naval.provisions.t016,undefined);
 assert.equal(s.naval.provisions.t019.food,9);
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
 const s=newGrandGame('senate'),egypt=s.naval.fleets.find(f=>f.owner==='egypt'),caesar=s.naval.fleets.find(f=>f.owner==='caesar');egypt.ships.merchant=1;s.factions.caesar.treasury=200;s.factions.senate.food=0;s.factions.egypt.food=60;advanceNaval(s);assert.equal(s.naval.routes.find(r=>r.id==='egypt-italy').last.reason,'enroute');assert.equal(s.naval.routes.find(r=>r.id==='egypt-papyrus').last.reason,'merchant');
 caesar.zone='eastern';caesar.port=null;assert.equal(orderFleet(s,'caesar',caesar.id,'raid','egypt-italy').ok,true);const before={food:s.factions.senate.food,raider:s.factions.caesar.treasury};s.month++;advanceNaval(s);const route=s.naval.routes.find(r=>r.id==='egypt-italy');assert.equal(route.last.reason,'raid');assert.equal(route.last.amount,0);assert.equal(s.factions.senate.food,before.food);assert.ok(s.naval.reports.some(r=>r.kind==='trade-raid'));assert.ok(s.factions.caesar.treasury<=before.raider);
});
test('pirate suppression and covert sponsorship alter pressure and resources',()=>{
 const s=newGrandGame('senate'),p=s.naval.pirates.find(x=>x.id==='illyrian-raiders'),before=p.pressure,treasury=s.factions.senate.treasury;assert.equal(supportPirates(s,'senate',p.id).ok,true);assert.equal(s.factions.senate.treasury,treasury-12);assert.equal(p.pressure,before+8);assert.equal(orderFleet(s,'senate','senate-adriatic','patrol','adriatic').ok,true);advanceNaval(s);assert.ok(p.pressure<before+8)
});
test('pirate raids move cargo into persistent inventory and patrols can recover it',()=>{
 const s=newGrandGame('senate');s.seed=100004;s.factions.senate.food=0;s.naval.fleets.find(f=>f.owner==='caesar').zone='ligurian';
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
test('AI divides escorts between two raided trade routes and uses current route losses',()=>{
 const s=newGrandGame('caesar'),first=s.naval.fleets.find(f=>f.owner==='senate'),second=structuredClone(first),merchant=structuredClone(first),raider=s.naval.fleets.find(f=>f.owner==='caesar'),otherRaider=structuredClone(raider);
 s.factions.senate.treasury=500;s.factions.senate.food=100;
 s.naval.routes=s.naval.routes.filter(r=>['african-oil','levant-luxury'].includes(r.id));
 for(const pirate of s.naval.pirates)pirate.pressure=0;
 first.ships={trireme:2};first.port=null;first.zone='tyrrhenian';
 second.id='senate-east';second.ships={trireme:2};second.port=null;second.zone='ionian';
 merchant.id='senate-merchants';merchant.ships={merchant:2};merchant.port='africa';merchant.zone='african';
 raider.zone='african';raider.port=null;
 otherRaider.id='caesar-east';otherRaider.zone='eastern';otherRaider.port=null;
 const easternMerchant=structuredClone(merchant);easternMerchant.id='eastern-merchants';easternMerchant.port='t114';easternMerchant.zone='eastern';
 s.naval.fleets.push(second,merchant,easternMerchant,otherRaider);
 assert.equal(orderFleet(s,'caesar',raider.id,'raid','african-oil').ok,true);
 assert.equal(orderFleet(s,'caesar',otherRaider.id,'raid','levant-luxury').ok,true);
 advanceNaval(s);
 assert.equal(s.naval.routes.find(r=>r.id==='african-oil').last.reason,'raid');
 assert.equal(s.naval.routes.find(r=>r.id==='levant-luxury').last.reason,'raid');
 assert.equal(first.order?.kind,'escort');assert.equal(second.order?.kind,'escort');
 assert.deepEqual(new Set([first.order.target,second.order.target]),new Set(['african-oil','levant-luxury']));
 const restored=upgradeSave(structuredClone(s));
 assert.deepEqual(new Set(restored.naval.fleets.filter(f=>f.owner==='senate'&&f.order?.kind==='escort').map(f=>f.order.target)),new Set(['african-oil','levant-luxury']));
 const previousSecurity=new Map(restored.naval.routes.filter(r=>['african-oil','levant-luxury'].includes(r.id)).map(r=>[r.id,r.last.security]));
 restored.month++;advanceNaval(restored);
 for(const id of previousSecurity.keys()){const now=restored.naval.routes.find(r=>r.id===id).last;assert.ok(now.security>previousSecurity.get(id),`${id}: ${previousSecurity.get(id)} → ${now.security} (${now.reason})`)}
});
test('AI releases a quiet trade escort after three dated reviews and preserves its streak on reload',()=>{
 const s=newGrandGame('caesar'),escort=s.naval.fleets.find(f=>f.owner==='senate');
 s.factions.senate.treasury=500;
 s.wars=[];
 for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
 assert.equal(orderFleet(s,'senate',escort.id,'escort','africa-sicily').ok,true);
 advanceNaval(s);
 assert.equal(escort.order?.quietMonths,1);
 advanceNaval(s);
 assert.equal(escort.order?.quietMonths,1,'A second resolution in the same calendar month is not another review');
 const restored=upgradeSave(structuredClone(s)),reviewed=restored.naval.fleets.find(f=>f.id===escort.id);
 restored.month++;
 advanceNaval(restored);
 assert.equal(reviewed.order?.kind,'escort');
 assert.equal(reviewed.order?.quietMonths,2);
 restored.month++;
 advanceNaval(restored);
 assert.notEqual(reviewed.order?.kind,'escort');
});
test('AI can reassign a released escort to a newly raided route',()=>{
 const s=newGrandGame('caesar'),escort=s.naval.fleets.find(f=>f.owner==='senate'),merchant=structuredClone(escort),raider=s.naval.fleets.find(f=>f.owner==='caesar');
 s.factions.senate.treasury=500;s.factions.senate.food=100;
 s.naval.routes=s.naval.routes.filter(r=>['african-oil','levant-luxury'].includes(r.id));
 for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
 escort.zone='african';escort.port=null;
 merchant.id='reassignment-merchants';merchant.ships={merchant:2};merchant.zone='eastern';merchant.port='t114';s.naval.fleets.push(merchant);
 raider.zone='eastern';raider.port=null;
 assert.equal(orderFleet(s,'senate',escort.id,'escort','african-oil').ok,true);
 escort.order.quietMonths=2;escort.order.lastReviewMonth=s.year*12+s.month-1;
 assert.equal(orderFleet(s,'caesar',raider.id,'raid','levant-luxury').ok,true);
 advanceNaval(s);
 assert.equal(s.naval.routes.find(r=>r.id==='levant-luxury').last.reason,'raid');
 assert.equal(escort.order?.kind,'escort');
 assert.equal(escort.order?.target,'levant-luxury');
});
test('AI pursues a dated hostile fleet report through a real sea battle without reading hidden positions',()=>{
 const setup=()=>{
  const s=newGrandGame('caesar'),hunter=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
  s.factions.senate.treasury=500;s.factions.senate.food=100;
  hunter.ships={trireme:4};hunter.sailors=720;
  enemy.port=null;enemy.zone='aegean';
  for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
  return {s,hunter,enemy};
 };
 const unseen=setup();advanceNaval(unseen.s);assert.notEqual(unseen.hunter.order?.kind,'intercept');
 const strong=setup();strong.s.naval.intel.senate={[strong.enemy.id]:{owner:'caesar',zone:'aegean',year:strong.s.year,month:strong.s.month,source:'recon',range:[9,12],confidence:'medium'}};
 advanceNaval(strong.s);assert.notEqual(strong.hunter.order?.kind,'intercept');
 const {s,hunter,enemy}=setup();s.naval.intel.senate={[enemy.id]:{owner:'caesar',zone:'aegean',year:s.year,month:s.month,source:'recon',range:[3,5],confidence:'medium'}};
 advanceNaval(s);assert.equal(hunter.order?.kind,'intercept');assert.equal(hunter.order.target,'aegean');assert.equal(hunter.order.reportId,enemy.id);
 const restored=upgradeSave(structuredClone(s)),saved=restored.naval.fleets.find(f=>f.id===hunter.id);
 assert.equal(saved.order.reportId,enemy.id);
 advanceNaval(restored);
 assert.ok(restored.naval.reports.some(r=>r.kind==='battle'&&r.participants.includes(hunter.id)&&r.participants.includes(enemy.id)));
});
test('AI changes or ends fleet pursuit when its dated report moves or expires',()=>{
 const s=newGrandGame('caesar'),hunter=s.naval.fleets.find(f=>f.owner==='senate'),enemy=s.naval.fleets.find(f=>f.owner==='caesar');
 s.factions.senate.treasury=500;s.factions.senate.food=100;hunter.ships={trireme:4};hunter.sailors=720;enemy.port=null;enemy.zone='western';
 for(const pirate of s.naval.pirates){pirate.pressure=0;pirate.ships=0}
 s.naval.intel.senate={[enemy.id]:{owner:'caesar',zone:'aegean',year:s.year,month:s.month,source:'recon',range:[3,5],confidence:'medium'}};
 advanceNaval(s);assert.equal(hunter.order?.target,'aegean');
 s.month++;s.naval.intel.senate[enemy.id]={...s.naval.intel.senate[enemy.id],zone:'western',month:s.month};
 advanceNaval(s);assert.equal(hunter.order?.kind,'intercept');assert.equal(hunter.order.target,'western');
 s.month+=3;advanceNaval(s);assert.notEqual(hunter.order?.kind,'intercept');
});
test('naval state survives save migration and 36 campaign months',()=>{
 const s=newGrandGame('senate');for(let i=0;i<36;i++)tick(s);const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.equal(restored.naval.fleets.length,s.naval.fleets.length);assert.equal(restored.naval.routes.length,12);assert.ok(restored.naval.routes.every(r=>Number.isFinite(r.last?.security)));assert.ok(restored.naval.fleets.every(f=>Number.isFinite(f.hull)&&Number.isFinite(f.supply)))
});

test('older naval saves acquire an empty maritime supply inventory',()=>{
 const old=JSON.parse(JSON.stringify(newGrandGame('senate')));old.naval.version=1;delete old.naval.provisions;delete old.naval.inlandProvisions;delete old.naval.wagons;delete old.naval.voyages;delete old.naval.nextVoyage;
 assert.deepEqual(upgradeSave(old).naval.provisions,{});
 assert.deepEqual(upgradeSave(old).naval.inlandProvisions,{});
 assert.deepEqual(upgradeSave(old).naval.wagons,[]);
 assert.equal(upgradeSave(old).naval.version,3);assert.deepEqual(upgradeSave(old).naval.voyages,[]);assert.equal(upgradeSave(old).naval.nextVoyage,1);
});
