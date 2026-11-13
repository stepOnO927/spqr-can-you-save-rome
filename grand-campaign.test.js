import test from 'node:test';
import assert from 'node:assert/strict';
import {GRAND_SITES,GRAND_ROUTES,GRAND_GROUPS} from './grand-map-data.js';
import {newGame,newGrandGame,convertToGrandMap,upgradeSave,previewMarch,moveArmy,tick,aiTurn,recruitFigure,setReligiousPolicy,portZone,nationalBudget} from './engine.js';
import {budgetHtml} from './budget-ui.js';
import {grandAdjacent,armySupply,encircled,holdPosition,strategicRetreat,flankFactor,navalCapacity,availableNavalLift,canEmbark,supplyBottlenecks} from './grand-operations.js';
import {advanceFigures,figureActive} from './great-figures.js';
import {faithSatisfaction,advanceDemography,advanceReligion,religionPanel} from './local-society.js';
import {advanceRecon} from './reconnaissance.js';
import grandPolygons from './grand-territory-polygons.js';
import {addReport,advanceOperations} from './character-system.js';

test('120 actual territories, 30 in Italy and Sicily, each with a bounded map polygon and graph entry',()=>{
 const s=newGrandGame('senate'),italian=['cisalpine','italiaN','roma','italiaS','sicilia'];assert.equal(s.regions.length,120);assert.equal(italian.reduce((n,id)=>n+GRAND_GROUPS[id].length,0),30);assert.equal(grandPolygons.features.length,120);const ids=new Set(s.regions.map(r=>r.id));
 for(const r of s.regions){assert.ok(Number.isFinite(r.lon)&&Number.isFinite(r.lat));assert.ok(ids.has(r.macro));assert.ok(r.population>0);assert.ok(grandAdjacent(r.id).length>0);assert.ok(grandPolygons.features.some(f=>f.properties.id===r.id&&f.geometry.coordinates.length))}
 for(const [a,b,kind] of GRAND_ROUTES){assert.ok(ids.has(a)&&ids.has(b));if(kind==='sea'){assert.equal(s.regions.find(r=>r.id===a).port,true);assert.equal(s.regions.find(r=>r.id===b).port,true)}}
 const seen=new Set([s.regions[0].id]),queue=[s.regions[0].id];while(queue.length)for(const e of grandAdjacent(queue.shift()))if(!seen.has(e.to)){seen.add(e.to);queue.push(e.to)}assert.equal(seen.size,120);
});
test('small inland kingdoms can feed their home army and lose home-domain income if conquered',()=>{
 const s=newGrandGame('egypt');
 for(const id of ['numidia','mauretania','armenia','parthia','galatia','bosporus']){
  const unit=s.armies.find(a=>a.owner===id),budget=nationalBudget(s,id);
  assert.ok(armySupply(s,unit)>=.95,`${id} home army should have an established supply line`);
  assert.equal(budget.homeIncome,2);assert.equal(budget.homeFood,2);
  assert.ok(budget.projectedNet>=0&&budget.foodNet>=0,`${id} opening force should be sustainable`);
 }
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(armySupply(restored,restored.armies.find(a=>a.owner==='galatia')),1);
 const galatia=s.regions.find(r=>r.id==='galatia'),before=nationalBudget(s,'galatia');
 galatia.owner='senate';const after=nationalBudget(s,'galatia');
 assert.equal(after.homeIncome,0);assert.equal(after.homeFood,0);
 assert.ok(after.projectedNet<=before.projectedNet-2);assert.ok(after.foodNet<=before.foodNet-2);
 assert.ok(armySupply(s,s.armies.find(a=>a.owner==='galatia'))<.5);
 const player=newGrandGame('galatia');
 assert.match(budgetHtml(player,'en'),/Home domain dues · game estimate/);
 assert.match(budgetHtml(player,'zh'),/本土领地储粮 · 游戏估算/);
});
test('grand campaign war chest funds a costly opening without rewriting older saves',()=>{
 const grand=newGrandGame('senate'),opening=nationalBudget(grand,'caesar');
 assert.ok(opening.projectedNet<0);
 assert.ok(grand.factions.caesar.treasury>=6*-opening.projectedNet+48,'opening reserve should cover six deficit months and two ordinary levies');
 const saved=upgradeSave(JSON.parse(JSON.stringify(grand)));assert.equal(saved.factions.caesar.treasury,grand.factions.caesar.treasury);
 const legacy=newGame('caesar');assert.ok(legacy.factions.caesar.treasury<grand.factions.caesar.treasury);
});
test('outnumbered wartime AI preserves a field levy reserve before optional research',()=>{
 const fighting=newGrandGame('egypt');fighting.month=12;fighting.factions.caesar.treasury=100;
 aiTurn(fighting,'caesar');assert.equal(fighting.development.caesar.research,null);assert.equal(fighting.factions.caesar.treasury,100);
 const peaceful=newGrandGame('egypt');peaceful.month=12;peaceful.wars=[];peaceful.factions.caesar.treasury=100;
 aiTurn(peaceful,'caesar');assert.ok(peaceful.development.caesar.research);assert.ok(peaceful.factions.caesar.treasury<100);
});
test('independent diplomacy builds a reachable border alliance without committing the player',()=>{
 const s=newGrandGame('egypt');s.month=12;s.factions.numidia.treasury=70;
 aiTurn(s,'numidia');assert.equal(s.relations['numidia:senate'],40);
 s.year=-48;s.factions.numidia.treasury=70;aiTurn(s,'numidia');
 assert.ok(s.alliances.some(pair=>pair.includes('numidia')&&pair.includes('senate')));
 assert.ok(!s.alliances.some(pair=>pair.includes('egypt')));
 assert.ok(s.log.some(entry=>/allied with/.test(entry.en)&&/结盟/.test(entry.zh)));
});
test('independent command commissions dated border intelligence before considering war',()=>{
 const s=newGrandGame('egypt');s.month=6;s.relations['armenia:parthia']=-35;s.factions.armenia.treasury=100;
 aiTurn(s,'armenia');const mission=s.operations.find(op=>op.actor==='armenia'&&op.target==='parthia'&&op.type==='envoy'&&op.subject==='strength');
 assert.ok(mission);assert.equal(mission.sentYear,-49);assert.equal(mission.sentMonth,6);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));assert.ok(restored.operations.some(op=>op.actor==='armenia'&&op.status==='pending'));
 restored.world.intelSeed=1000;for(let month=0;month<mission.duration;month++)advanceOperations(restored);
 const report=restored.knowledge.armenia.parthia.reports.find(item=>item.kind==='strength');
 assert.ok(report);assert.equal(report.year,-49);assert.equal(report.month,6);assert.equal(report.source,'envoy');assert.ok(Number.isFinite(report.value));
});
test('independent war needs fresh uncertain evidence, a viable force, and a cooldown',()=>{
 const baseline=newGrandGame('egypt');baseline.month=12;baseline.seed=10000;baseline.relations['armenia:parthia']=-35;baseline.factions.armenia.treasury=115;
 const noReport=upgradeSave(JSON.parse(JSON.stringify(baseline)));aiTurn(noReport,'armenia');assert.ok(!noReport.wars.some(pair=>pair.includes('armenia')&&pair.includes('parthia')));
 const rumor=upgradeSave(JSON.parse(JSON.stringify(baseline)));addReport(rumor,'armenia','parthia',{kind:'strength',value:2000,source:'envoy',confidence:'rumor'});aiTurn(rumor,'armenia');assert.ok(!rumor.wars.some(pair=>pair.includes('armenia')&&pair.includes('parthia')));
 const informed=upgradeSave(JSON.parse(JSON.stringify(baseline)));addReport(informed,'armenia','parthia',{kind:'strength',value:2000,source:'envoy',confidence:'unverified'});aiTurn(informed,'armenia');
 assert.ok(informed.wars.some(pair=>pair.includes('armenia')&&pair.includes('parthia')));assert.equal(informed.aiWarCooldowns.armenia,-576);
 assert.ok(informed.log.some(entry=>/declared war/.test(entry.en)&&/宣战/.test(entry.zh)));
 const resumed=upgradeSave(JSON.parse(JSON.stringify(informed)));assert.equal(resumed.aiWarCooldowns.armenia,-576);
 resumed.wars=resumed.wars.filter(pair=>!pair.includes('armenia')||!pair.includes('parthia'));resumed.year=-48;resumed.month=12;resumed.factions.armenia.treasury=115;resumed.seed=10000;
 aiTurn(resumed,'armenia');assert.ok(!resumed.wars.some(pair=>pair.includes('armenia')&&pair.includes('parthia')));
});
test('multi territory march travels leg by leg and plans realistic time',()=>{
 const s=newGrandGame('caesar'),plan=previewMarch(s,'xiii','roma');assert.equal(plan.ok,true);assert.ok(plan.path.length>=3);const start=s.armies.find(a=>a.id==='xiii');assert.equal(start.region,'cisalpine');const out=moveArmy(s,'xiii','roma');assert.equal(out.ok,true);assert.equal(start.move.to,plan.path[0].id);tick(s);assert.notEqual(start.region,'roma');assert.ok(start.move||start.region===plan.path[0].id);
});
test('cut supply creates encirclement and real attrition; hold and retreat obey map',()=>{
 const s=newGrandGame('caesar'),a=s.armies.find(x=>x.id==='xiii');a.region='t005';a.move=null;a.siege=null;assert.equal(holdPosition(s,a.id).ok,true);tick(s);assert.ok(a.prepared>=1);const exit=grandAdjacent(a.region).find(e=>!e.sea&&s.regions.find(r=>r.id===e.to).owner===a.owner);assert.ok(exit);assert.equal(strategicRetreat(s,a.id,exit.to).ok,true);
 const isolated=s.armies.find(x=>x.id==='xiii');isolated.region='t005';for(const r of s.regions)if(r.id!==isolated.region&&r.owner==='caesar')r.owner='senate';assert.equal(encircled(s,isolated),true);assert.ok(armySupply(s,isolated)<.5);const men=isolated.men;tick(s);assert.ok(isolated.men<men);assert.equal(strategicRetreat(s,isolated.id,exit.to).ok,false);
});
test('flanking requires distinct friendly attack directions and explicit coordination',()=>{
 const s=newGrandGame('caesar'),target=s.regions.find(r=>r.id==='italiaN'),attack=s.armies.find(a=>a.id==='xiii'),approach=grandAdjacent(target.id).find(e=>e.to==='t005');assert.ok(approach);s.armies.push({id:'support-test',owner:'caesar',region:approach.to,men:2500,move:null});assert.equal(flankFactor(s,attack,target),1);attack.coordinated=true;assert.equal(flankFactor(s,attack,target),1.06);
});
test('actual idle transports, not a numeric lift allowance or shipyard, enable sea crossings',()=>{
 const s=newGrandGame('senate'),from='italiaS',to=GRAND_ROUTES.find(([a,b,kind])=>kind==='sea'&&(a===from||b===from))?.slice(0,2).find(id=>id!==from),unit=s.armies.find(a=>a.id==='italy');assert.ok(to);unit.region=from;const departure=s.regions.find(r=>r.id===from),arrival=s.regions.find(r=>r.id===to);s.factions.senate.navalLift=0;assert.equal(canEmbark(s,unit,departure,arrival),true);const fleet=s.naval.fleets.find(f=>f.port===from&&f.owner==='senate');fleet.ships.transport=0;assert.equal(canEmbark(s,unit,departure,arrival),false);assert.ok(departure.buildings.includes('shipyard'));
});
test('AI coordinates a real neighboring attack and protects actual supply cut points',()=>{
 const s=newGrandGame('caesar');for(const r of s.regions)if(r.owner==='senate'&&r.id!=='italiaN')r.owner='caesar';const attack=s.armies.find(a=>a.id==='xiii');attack.men=10000;const support=s.armies.find(a=>a.id==='viii');support.region='t005';support.men=3500;s.regions.find(r=>r.id==='t005').owner='caesar';s.factions.caesar.food=100;aiTurn(s,'caesar');assert.equal(attack.coordinated,true);assert.equal(attack.move?.to,'italiaN');assert.equal(support.move,null);assert.ok(supplyBottlenecks(s,'caesar') instanceof Set)
});
test('AI reinforces an exposed, depleted winning army using the player resource and time costs',()=>{
 const s=newGrandGame('egypt'),front=s.regions.find(r=>r.id==='italiaN'),legion=s.armies.find(a=>a.id==='xiii');
 front.owner='caesar';legion.region=front.id;legion.men=5900;s.month=3;s.factions.caesar.treasury=50;
 s.battles=[{year:s.year,month:s.month,region:front.id,attacker:{owner:'caesar'},attackerWins:true}];
 const cash=s.factions.caesar.treasury,food=s.factions.caesar.food,manpower=s.factions.caesar.manpower;
 aiTurn(s,'caesar');
 assert.equal(legion.reconPending?.kind,'reinforce');
 assert.equal(legion.reconPending.remaining,1);
 assert.equal(s.factions.caesar.treasury,cash-24);
 assert.equal(s.factions.caesar.food,food-6);
 assert.equal(s.factions.caesar.manpower,manpower-3000);
 const dominant=newGrandGame('egypt'),levies=dominant.armies.find(a=>a.id==='italy');
 dominant.month=3;dominant.factions.senate.treasury=50;levies.men=5900;
 dominant.battles=[{year:dominant.year,month:dominant.month,region:'italiaN',attacker:{owner:'senate'},attackerWins:true}];
 aiTurn(dominant,'senate');assert.notEqual(levies.reconPending?.kind,'reinforce');
});
test('an outnumbered AI replaces field losses at the ordinary cost despite a low cash reserve',()=>{
 const s=newGrandGame('egypt'),front=s.armies.find(a=>a.id==='xiii'),rear=s.armies.find(a=>a.id==='viii'),f=s.factions.caesar;
 s.month=4;f.treasury=30;rear.men=0;front.men=3000;
 const food=f.food,manpower=f.manpower,armies=s.armies.length;
 aiTurn(s,'caesar');
 assert.equal(s.armies.length,armies+1);
 assert.equal(front.region,'cisalpine');
 assert.ok(front.men>0);
 assert.notEqual(front.reconPending?.kind,'reinforce');
 const relief=s.armies.find(a=>a.owner==='caesar'&&a.id.startsWith('levy'));
 assert.equal(relief?.region,'narbo');
 assert.equal(relief.men,3000);
 assert.equal(f.treasury,6);
 assert.ok(f.food<=food-6,'the new levy pays six food; later AI probes may spend more');
 assert.equal(f.manpower,manpower-3000);
 const frontAfterOrders=front.men;
 advanceRecon(s);
 assert.equal(front.men,frontAfterOrders);
 assert.equal(relief.men,3000);
 const stronger=newGrandGame('egypt'),senate=stronger.factions.senate;
 stronger.month=4;senate.treasury=30;stronger.armies.find(a=>a.id==='italy').men=3000;
 aiTurn(stronger,'senate');
 assert.notEqual(stronger.armies.find(a=>a.id==='italy').reconPending?.kind,'reinforce');
});
test('AI low-supply withdrawal obeys the same retreat limits and preparation loss as the player',()=>{
 const s=newGrandGame('egypt'),a=s.armies.find(x=>x.id==='xiii');
 for(const r of s.regions)if(r.owner==='caesar'&&!['cisalpine','t005'].includes(r.id))r.owner='senate';
 s.regions.find(r=>r.id==='t005').owner='caesar';
 for(const id of ['cisalpine','t005'])s.regions.find(r=>r.id===id).food=0;
 const blocker=s.naval.fleets.find(f=>f.owner==='senate');blocker.zone=portZone('cisalpine');blocker.order={kind:'blockade',targetPort:'cisalpine',path:[]};
 a.stance='hold';a.prepared=3;s.factions.caesar.treasury=0;
 assert.ok(armySupply(s,a)<.55);
 assert.ok(armySupply(s,{...a,region:'t005'})>armySupply(s,a)+.15);
 const morale=a.morale;aiTurn(s,'caesar');
 assert.equal(a.region,'t005');assert.equal(a.move,null);assert.equal(a.stance,null);assert.equal(a.prepared,0);assert.equal(a.morale,morale-4);
});
test('AI probes a contested border using only local reports before a cash-starved risky advance',()=>{
 const setup=cash=>{const s=newGrandGame('egypt');s.armies=s.armies.filter(a=>a.id!=='viii');const legion=s.armies.find(a=>a.id==='xiii');legion.region='t016';legion.men=6154;for(const id of ['t016','roma'])s.regions.find(r=>r.id===id).owner='caesar';s.month=3;s.factions.caesar.treasury=cash;s.knowledge.caesar.senate.reports.push({kind:'strength',value:10000,year:s.year,month:s.month});return {s,legion}};
 const {s,legion}=setup(50),food=s.factions.caesar.food;
 aiTurn(s,'caesar');assert.equal(legion.reconPending?.kind,'scouts');assert.equal(legion.reconPending.regionId,'t017');assert.equal(s.factions.caesar.treasury,46);assert.equal(s.factions.caesar.food,food-2);
 legion.reconPending=null;s.factions.caesar.treasury=20;
 s.lastWarContribution={caesar:s.year*12+s.month};
 s.militaryRecon=[{owner:'caesar',regionId:'t017',year:s.year,month:s.month,observationYear:s.year,observationMonth:s.month,source:'scouts',min:null,max:null}];
 aiTurn(s,'caesar');assert.equal(legion.move?.to,'t017');assert.equal(s.factions.caesar.treasury,20);
 const poor=setup(3),beforeFood=poor.s.factions.caesar.food;
 poor.s.lastWarContribution={caesar:poor.s.year*12+poor.s.month};
 aiTurn(poor.s,'caesar');assert.equal(poor.legion.reconPending?.kind,'probe');assert.equal(poor.legion.reconPending.regionId,'t017');assert.equal(poor.s.factions.caesar.treasury,3);assert.equal(poor.s.factions.caesar.food,beforeFood-3);
 assert.equal(poor.s.militaryRecon[0].source,'probe');
});
test('historical engineer travels before construction bonus and faith affects local society',()=>{
 const s=newGrandGame('caesar'),offer=recruitFigure(s,'caesar','mamurra');assert.equal(offer.ok,true);assert.equal(figureActive(s,'caesar','engineer'),false);for(let i=0;i<offer.months;i++)advanceFigures(s);assert.equal(figureActive(s,'caesar','engineer'),true);const region=s.regions.find(r=>r.id==='egypt');region.owner='caesar';region.integration=30;s.month=3;assert.equal(faithSatisfaction(s,region),-1);s.development.caesar.slots.culture[0]='cultural-accommodation';assert.equal(faithSatisfaction(s,region),-1);const origin=s.regions.find(r=>r.id==='cisalpine'),neighbor=s.regions.find(r=>r.id==='t005');neighbor.owner='caesar';origin.civicSatisfaction=20;neighbor.civicSatisfaction=80;const before=origin.population;advanceDemography(s);assert.ok(origin.population<before)
});
test('regional rites change satisfaction after a political transition and migration carries traditions',()=>{
 const s=newGrandGame('caesar'),egypt=s.regions.find(r=>r.id==='egypt');egypt.owner='caesar';egypt.integration=30;s.month=3;
 assert.equal(faithSatisfaction(s,egypt),-1);
 const treasury=s.factions.caesar.treasury;assert.equal(setReligiousPolicy(s,'caesar','local-rites').ok,true);
 assert.equal(s.factions.caesar.treasury,treasury-18);assert.equal(faithSatisfaction(s,egypt),-1);
 for(let i=0;i<3;i++)advanceReligion(s);assert.equal(s.religion.caesar.policy,'local-rites');assert.equal(faithSatisfaction(s,egypt),1);
 assert.equal(setReligiousPolicy(s,'caesar','civic-patronage').ok,true);for(let i=0;i<3;i++)advanceReligion(s);
 assert.equal(faithSatisfaction(s,egypt),-2);assert.match(religionPanel(s,'zh'),/地方宗教与祭司团/);assert.match(religionPanel(s,'en'),/PRIESTHOODS/);
 const origin=s.regions.find(r=>r.id==='cisalpine'),neighbor=s.regions.find(r=>r.id==='t005');for(const edge of grandAdjacent(origin.id)){const candidate=s.regions.find(r=>r.id===edge.to);candidate.civicSatisfaction=10}neighbor.owner=origin.owner;origin.faiths=[{id:'egyptian-cults',share:100}];neighbor.faiths=[{id:'roman-cults',share:100}];origin.civicSatisfaction=20;neighbor.civicSatisfaction=80;origin.population=100000;neighbor.population=1000;
 advanceDemography(s);assert.ok(neighbor.faiths.some(x=>x.id==='egyptian-cults'&&x.share>0));
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).religion.caesar.policy,'civic-patronage');
});
test('legacy save migration preserves political state, characters, intelligence and armies',()=>{
 const old=newGame('senate');old.regions.find(r=>r.id==='roma').loyalty=31;old.factions.senate.treasury=77;old.log.push({year:-49,month:1,en:'test',zh:'测试'});const name=old.world.characters.cicero.name;old.armies.find(a=>a.id==='xiii').move={to:'roma',remaining:1,sea:false};const converted=convertToGrandMap(structuredClone(old));assert.equal(converted.regions.length,120);assert.equal(converted.regions.find(r=>r.id==='roma').loyalty,31);assert.equal(converted.factions.senate.treasury,77);assert.equal(converted.world.characters.cicero.name,name);assert.equal(converted.log.at(-1).en,'test');assert.notEqual(converted.armies.find(a=>a.id==='xiii').move.to,'roma');assert.equal(upgradeSave(structuredClone(converted)).regions.length,120);assert.equal(old.regions.length,22);
});
test('both Roman commands resolve 36 months or a terminal defeat with combat and AI movement',()=>{
 for(const faction of ['caesar','senate']){const s=newGrandGame(faction);for(let i=0;i<36;i++)tick(s);assert.ok(s.year===-46&&s.month===1||s.terminalResult==='defeat');assert.equal(s.regions.length,120);assert.ok(s.battles.length>0);assert.ok(s.log.length>10)}
});
