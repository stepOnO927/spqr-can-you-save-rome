import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,army,region,resolveBattle,moveArmy,diplomacy,isWar,tick,recruit,previewMarch,upgradeSave,aiTurn,nationalBudget,armySupply,seizeAerarium} from '../engine.js';
import {recordMovement,eventText,recordEvent} from '../campaign-reports.js';
import {chronicleHtml,battleReportHtml,eventDate} from '../reports-ui.js';
import {requestReinforcements,probePositions,latestRecon,advanceRecon,assessment} from '../reconnaissance.js';
import {militaryResult,settlementEligible} from '../campaign-outcome.js';
import {campaignVictoryHtml} from '../achievement-ui.js';
import {budgetHtml} from '../budget-ui.js';
import {afterActionHtml,intelligenceHtml} from '../recon-ui.js';
import {battleSideForPlayer} from '../visibility.js';

test('co-located armies defend together and preserve their separate losses',()=>{
 const setup=reinforce=>{
  const s=newGrandGame('caesar');s.seed=17;
  region(s,'roma').owner='caesar';region(s,'t014').owner='senate';
  const attacker=army(s,'pompey'),defender=army(s,'xiii');
  attacker.region='t014';attacker.men=12000;defender.region='roma';defender.men=6000;
  if(reinforce)assert.equal(recruit(s,'roma','caesar'),true);
  s.factions.caesar.food=100;s.factions.senate.food=100;
  const won=resolveBattle(s,attacker,defender,region(s,'roma'));
  return {s,won,battle:s.battles[0]};
 };
 const alone=setup(false),combined=setup(true),{s,battle}=combined;
 assert.equal(alone.won,true,'the unreinforced city falls in this fixed battle');
 assert.equal(combined.won,false,'the same attack is repulsed by both defenders');
 assert.equal(region(s,'roma').owner,'caesar');
 assert.equal(battle.defender.men,9000);
 assert.equal(battle.defender.formations.length,2);
 assert.equal(battle.defender.formations.reduce((sum,unit)=>sum+unit.casualties,0),battle.lossD);
 for(const formation of battle.defender.formations)assert.equal(army(s,formation.id).men,formation.remaining);
 assert.match(afterActionHtml(battle,'caesar','en'),/Formations engaged together 2/);
 assert.match(afterActionHtml(battle,'caesar','zh'),/共同参战部队 2/);
 assert.match(battleReportHtml(s,battle,'en'),/Friendly participating formations/);
 assert.match(battleReportHtml(s,battle,'zh'),/己方参战部队/);
 assert.deepEqual(battleSideForPlayer(battle,'senate','defender'),{owner:'caesar',unknown:true});
 s.player='senate';assert.doesNotMatch(battleReportHtml(s,battle,'en'),/Friendly participating formations/);
 s.player='caesar';
 const restored=upgradeSave(structuredClone(s));
 assert.deepEqual(restored.battles[0].defender.formations,battle.defender.formations);
});

test('a besieger in enemy land cannot use the city fort as defensive cover',()=>{
 const s=newGrandGame('senate'),site=region(s,'roma'),attacker=army(s,'pompey'),besieger=army(s,'xiii');
 site.fort=3;attacker.region='t014';besieger.region='roma';besieger.siege={region:'roma',remaining:2};
 resolveBattle(s,attacker,besieger,site);
 assert.equal(s.battles[0].fort,0);
});

test('armies ordered into the same attack this month fight together',()=>{
 const setup=combined=>{
  const s=newGrandGame('caesar');s.seed=17;
  const first=army(s,'xiii'),second=army(s,'viii'),defender=army(s,'italy');
  first.region='cisalpine';first.men=5200;first.move={to:'italiaN',remaining:1};
  second.region='cisalpine';second.men=4000;if(combined)second.move={to:'italiaN',remaining:1};
  defender.region='italiaN';defender.men=6000;
  s.factions.caesar.food=s.factions.senate.food=100;
  const won=resolveBattle(s,first,defender,region(s,'italiaN'));
  return {s,won,battle:s.battles[0],second};
 };
 const alone=setup(false),joint=setup(true);
 assert.equal(alone.won,false);
 assert.equal(joint.won,true);
 assert.equal(joint.battle.attacker.men,9200);
 assert.equal(joint.battle.attacker.formations.length,2);
 assert.equal(joint.battle.attacker.formations.reduce((sum,unit)=>sum+unit.casualties,0),joint.battle.lossA);
 assert.equal(joint.second.men,joint.battle.attacker.formations[1].remaining);
 assert.equal(joint.second.move,null);
 assert.equal(joint.second.region,'italiaN');
 assert.match(battleReportHtml(joint.s,joint.battle,'en'),/Friendly participating formations/);
 assert.match(battleReportHtml(joint.s,joint.battle,'zh'),/己方参战部队/);
 assert.deepEqual(upgradeSave(structuredClone(joint.s)).battles[0].attacker.formations,joint.battle.attacker.formations);
 joint.s.player='senate';assert.doesNotMatch(battleReportHtml(joint.s,joint.battle,'en'),/Friendly participating formations/);
});

test('two legal march orders arrive as one battle during a real month',()=>{
 const s=newGrandGame('caesar'),support=army(s,'viii');
 support.region='cisalpine';support.men=4000;
 assert.equal(moveArmy(s,'xiii','italiaN').ok,true);
 assert.equal(moveArmy(s,'viii','italiaN').ok,true);
 tick(s);
 const battles=s.battles.filter(b=>b.region==='italiaN'&&b.month===2);
 assert.equal(battles.length,1);
 assert.equal(battles[0].attacker.men,11200);
 assert.equal(battles[0].attacker.formations.length,2);
 assert.equal(support.move,null);
});

test('prebattle review identifies a vulnerable single land corridor without enemy counts',()=>{
 const s=newGrandGame('caesar'),unit=army(s,'xiii'),enemy=army(s,'pompey');
 for(const id of ['italiaN','t013','t012'])region(s,id).owner='caesar';
 unit.region='t012';enemy.region='t014';enemy.men=9000;
 const plan=previewMarch(s,unit.id,'t014');assert.equal(plan.ok,true);
 const intel=assessment(s,unit.id,'t014',plan);
 assert.equal(intel.supplyExposure.approachId,'t012');
 assert.equal(intel.supplyExposure.hostileFlanks>=1,true);
 assert.match(intelligenceHtml(intel,region(s,'t014'),'en'),/Single supply corridor.*Perusia/s);
 assert.match(intelligenceHtml(intel,region(s,'t014'),'zh'),/单线补给风险.*佩鲁西亚/s);
 assert.doesNotMatch(intelligenceHtml(intel,region(s,'t014'),'en'),/9,000/);
 assert.equal(assessment(s,unit.id,'t011',previewMarch(s,unit.id,'t011')).supplyExposure,null,'a second friendly approach removes this warning');
 assert.equal(moveArmy(s,unit.id,'t014').ok,true);
 assert.equal(unit.attackIntel.supplyExposure.approachId,'t012');
 region(s,'t012').owner='senate';
 resolveBattle(s,unit,enemy,region(s,'t014'));
 const battle=s.battles[0];
 assert.match(afterActionHtml(battle,'caesar','en'),/only friendly land approach through Perusia could be cut/);
 assert.match(afterActionHtml(battle,'caesar','zh'),/经过佩鲁西亚的唯一己方陆路存在被切断的风险/);
 assert.equal(upgradeSave(structuredClone(s)).battles[0].preBattleIntel.supplyExposure.approachId,'t012');
});

test('a surrounded defender has its rout losses recorded instead of vanishing after battle',()=>{
 const s=newGame('caesar'),attacker=army(s,'xiii'),defender=army(s,'italy'),support=army(s,'pompey');
 for(const site of s.regions)if(site.owner==='senate'&&site.id!=='italiaN')site.owner='caesar';
 support.region='italiaN';attacker.men=30000;defender.men=1000;
 const initial=defender.men+support.men;
 assert.equal(resolveBattle(s,attacker,defender,region(s,'italiaN')),true);
 const battle=s.battles[0];
 assert.equal(battle.lossD,initial);
 assert.equal(battle.defender.remaining,0);
 assert.equal(battle.defender.formations.reduce((sum,unit)=>sum+unit.casualties,0),initial);
 assert.ok(s.armies.every(unit=>unit.id!=='italy'&&unit.id!=='pompey'));
});

test('food shortage penalties scale with the actual national deficit',()=>{
 const run=target=>{
  const s=newGrandGame('caesar');s.wars=[];
  for(const r of s.regions.filter(r=>r.owner==='caesar')){r.buildings=[];r.grainReserve=0}
  const f=s.factions.caesar,province=region(s,'cisalpine'),unit=army(s,'xiii');
  f.food=target-nationalBudget(s,'caesar').foodNet;
  const before={stability:f.stability,civic:province.civicSatisfaction,loyalty:province.loyalty,men:unit.men};
  tick(s);
  return {food:f.food,stability:before.stability-f.stability,civic:before.civic-province.civicSatisfaction,loyalty:before.loyalty-province.loyalty,loss:before.men-unit.men,population:province.population};
 };
 const none=run(0),mild=run(-5),moderate=run(-12),severe=run(-25);
 assert.equal(none.food,0);assert.equal(mild.food,-5);assert.equal(moderate.food,-12);assert.equal(severe.food,-25);
 assert.equal(mild.stability-none.stability,1);
 assert.equal(moderate.stability-none.stability,2);
 assert.equal(severe.stability-none.stability,3);
 assert.equal(mild.civic-none.civic,1);
 assert.equal(moderate.civic-none.civic,2);
 assert.equal(severe.civic-none.civic,4);
 assert.equal(mild.loyalty-none.loyalty,0);
 assert.equal(moderate.loyalty-none.loyalty,1);
 assert.equal(severe.loyalty-none.loyalty,2);
 assert.ok(mild.loss>none.loss&&moderate.loss>mild.loss&&severe.loss>moderate.loss);
 assert.ok(none.population>mild.population&&mild.population>moderate.population&&moderate.population>severe.population);
 const s=newGrandGame('caesar');
 assert.match(budgetHtml(s,'en'),/deficit reaches 8 or 20/);
 assert.match(budgetHtml(s,'zh'),/缺口达到8或20/);
});

test('opposing marches meet without swapping theaters or taking a fort bonus',()=>{
 const s=newGame('senate'),caesar=army(s,'xiii'),levies=army(s,'italy');
 assert.equal(moveArmy(s,caesar.id,'italiaN').ok,true);
 assert.equal(moveArmy(s,levies.id,'cisalpine').ok,true);
 tick(s);
 const battle=s.battles?.[0];assert.ok(battle?.meeting);assert.equal(battle.fort,0);
 assert.ok(battle.lossA>0&&battle.lossD>0);
 assert.equal(caesar.region,'cisalpine');assert.equal(levies.region,'italiaN');
 assert.equal(region(s,'cisalpine').owner,'caesar');assert.equal(region(s,'italiaN').owner,'senate');
 assert.equal(latestRecon(s,'caesar','italiaN').source,'battle');
 assert.equal(latestRecon(s,'senate','cisalpine').source,'battle');
 assert.match(battleReportHtml(s,battle,'en'),/opposing marches/);
 assert.match(battleReportHtml(s,battle,'zh'),/反向行军/);
 assert.match(battleReportHtml(s,battle,'en'),/Meeting engagement/);
 assert.match(battleReportHtml(s,battle,'zh'),/行军遭遇战/);
 assert.ok(s.log.some(entry=>/Senate .*opposing marches/.test(entry.en)));
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).battles[0].meeting,true);
});

test('AI uses fresh opening-battle intelligence before repeating an attack',()=>{
 const s=newGame('egypt');
 assert.equal(moveArmy(s,'xiii','italiaN').ok,true);
 assert.equal(moveArmy(s,'italy','cisalpine').ok,true);
 tick(s);
 assert.ok(s.battles[0]?.meeting);
 assert.equal(army(s,'italy').move,null);
 assert.equal(latestRecon(s,'senate','cisalpine').source,'battle');
});
test('outnumbered AI seeks provisions while preserving levy reserves before optional probes',()=>{
 const lean=newGrandGame('egypt');lean.year=-48;lean.month=3;lean.factions.caesar.treasury=4;lean.factions.caesar.food=10;
 aiTurn(lean,'caesar');
 assert.ok(lean.factions.caesar.food>10);
 assert.equal(lean.lastEmergencyProvisions.caesar,lean.year*12+lean.month);
 assert.ok(!lean.armies.some(unit=>unit.owner==='caesar'&&unit.reconPending?.kind==='probe'));
 const stocked=newGrandGame('egypt');stocked.year=-48;stocked.month=3;stocked.factions.caesar.treasury=4;stocked.factions.caesar.food=50;
 aiTurn(stocked,'caesar');
 assert.ok(stocked.armies.some(unit=>unit.owner==='caesar'&&unit.reconPending?.kind==='probe'));
 assert.ok(stocked.factions.caesar.food<50);
});

test('outnumbered wartime AI does not spend its deficit runway on optional construction',()=>{
 const lean=newGrandGame('egypt');
 tick(lean);
 assert.equal(lean.regions.some(r=>r.owner==='caesar'&&r.construction),false);
 assert.equal(lean.development.caesar.materials.metal,3,'scarce metal should not trigger an optional purchase');
 assert.ok(lean.factions.caesar.treasury>=160,'the opening war chest should remain available for field operations');
 const rich=newGrandGame('egypt');rich.factions.caesar.treasury=500;
 aiTurn(rich,'caesar');
 assert.ok(rich.regions.some(r=>r.owner==='caesar'&&r.construction),'a funded command can still invest');
});

test('AI invests in a real food project when shortage is approaching and the war chest covers it',()=>{
 const funded=newGrandGame('egypt'),f=funded.factions.caesar;
 f.food=35;f.treasury=160;
 const before=nationalBudget(funded,'caesar').foodNet;
 assert.ok(before<0);
 aiTurn(funded,'caesar');
 const project=funded.regions.find(r=>r.owner==='caesar'&&r.construction?.buildingId==='granary');
 assert.ok(project,'known grain-storage technology should produce a physical project');
 assert.equal(f.treasury,142);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(funded)));
 assert.equal(region(loaded,project.id).construction.buildingId,'granary');
 for(let i=0;i<3;i++)tick(loaded);
 assert.ok(region(loaded,project.id).buildings.includes('granary'));
 assert.ok(nationalBudget(loaded,'caesar').foodNet>=before+1);
 const lean=newGrandGame('egypt');lean.factions.caesar.food=35;lean.factions.caesar.treasury=80;
 aiTurn(lean,'caesar');
 assert.equal(lean.regions.some(r=>r.owner==='caesar'&&r.construction),false,'a projected deficit must preserve army cash');
 const overextended=newGrandGame('egypt');overextended.factions.caesar.food=35;overextended.factions.caesar.treasury=200;army(overextended,'xiii').men=50000;
 assert.ok(nationalBudget(overextended,'caesar').projectedNet<-30);
 aiTurn(overextended,'caesar');
 assert.equal(overextended.regions.some(r=>r.owner==='caesar'&&r.construction),false,'an unaffordable food project must not be replaced by optional construction');
});

test('an AI command with no field army raises an emergency force when resources allow',()=>{
 const s=newGame('egypt');s.armies=s.armies.filter(unit=>unit.owner!=='caesar');
 s.factions.caesar.treasury=50;s.factions.caesar.food=20;s.factions.caesar.manpower=4000;
 tick(s);
 const replacement=s.armies.filter(unit=>unit.owner==='caesar');
 assert.equal(replacement.length,1);assert.equal(replacement[0].men,3000);
 assert.equal(s.factions.caesar.manpower<4000,true);
});

test('an AI army consolidates a captured theater before advancing again',()=>{
 const s=newGrandGame('egypt'),unit=army(s,'xiii'),defender=army(s,'italy');
 unit.men=10000;defender.men=1000;
 resolveBattle(s,unit,defender,region(s,'italiaN'));
 assert.equal(region(s,'italiaN').owner,'caesar');
 aiTurn(s,'caesar');
 assert.equal(unit.region,'italiaN');assert.equal(unit.move,null);assert.equal(unit.stance,'hold');
});

test('AI consolidates a captured city after a siege even when the player is elsewhere',()=>{
 const s=newGrandGame('egypt'),unit=army(s,'xiii');
 s.armies=s.armies.filter(a=>a.id!=='pompey');
 unit.region='roma';unit.move=null;unit.siege={region:'roma',remaining:1};
 tick(s);
 assert.equal(region(s,'roma').owner,'caesar');
 assert.equal(unit.move,null);
 assert.equal(unit.stance,'hold');
 assert.deepEqual(unit.lastSiegeCapture,{regionId:'roma',year:s.year,month:s.month});
 assert.equal(s.campaignEvents.some(e=>e.type==='siege'&&e.regionId==='roma'),false,'foreign AI sieges must stay out of the player chronicle');
 assert.deepEqual(upgradeSave(JSON.parse(JSON.stringify(s))).armies.find(a=>a.id==='xiii').lastSiegeCapture,unit.lastSiegeCapture);
});

test('outnumbered AI pays for a city garrison and keeps it in the captured theater',()=>{
 const s=newGrandGame('egypt'),unit=army(s,'xiii'),f=s.factions.caesar;
 s.armies=s.armies.filter(a=>a.id!=='pompey');
 unit.region='roma';unit.move=null;unit.siege={region:'roma',remaining:1};f.treasury=50;
 const cash=f.treasury,food=f.food,manpower=f.manpower,budget=nationalBudget(s,'caesar');
 tick(s);
 const garrison=s.armies.find(a=>a.owner==='caesar'&&a.aiGarrisonRegion==='roma');
 assert.ok(garrison);assert.equal(garrison.men,3000);assert.equal(garrison.move,null);
 assert.equal(f.treasury,cash+budget.projectedNet-24);
 assert.equal(f.food,food+budget.foodNet-6);
 assert.equal(f.manpower,manpower+budget.manpowerNet-3000);
 for(let i=0;i<3;i++)tick(s);
 assert.equal(garrison.region,'roma');assert.equal(garrison.move,null);
 assert.equal(s.armies.filter(a=>a.owner==='caesar'&&a.aiGarrisonRegion==='roma').length,1);
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).armies.find(a=>a.id===garrison.id).aiGarrisonRegion,'roma');
});

test('a Roman AI still protects its strategic city after gaining territorial parity',()=>{
 const s=newGrandGame('egypt'),main=army(s,'xiii'),f=s.factions.caesar;
 for(const site of s.regions.filter(r=>r.owner==='senate'&&r.id!=='roma').slice(0,26))site.owner='caesar';
 region(s,'roma').owner='caesar';main.region='roma';main.move=null;
 f.treasury=100;f.food=100;
 assert.ok(s.regions.filter(r=>r.owner==='caesar').length>s.regions.filter(r=>r.owner==='senate').length);
 aiTurn(s,'caesar');
 const guard=s.armies.find(a=>a.owner==='caesar'&&a.aiGarrisonRegion==='roma');
 assert.ok(guard,'capturing enough territory must not turn off the Rome garrison');
 assert.equal(guard.region,'roma');assert.equal(guard.move,null);
});

test('Caesar AI may claim Rome public reserves before a cash shortfall blocks normal recruitment',()=>{
 const s=newGrandGame('egypt');region(s,'roma').owner='caesar';s.factions.caesar.treasury=20;
 assert.ok(nationalBudget(s,'caesar').projectedNet<0);
 aiTurn(s,'caesar');
 assert.equal(s.aerariumSeizure?.income,85);
 assert.equal(s.aerariumSeizure.owner,'caesar');
 const restored=upgradeSave(structuredClone(s)),claim=structuredClone(restored.aerariumSeizure);
 aiTurn(restored,'caesar');
 assert.deepEqual(restored.aerariumSeizure,claim,'the public reserve is claimed exactly once after reload');
 const funded=newGrandGame('egypt');region(funded,'roma').owner='caesar';funded.factions.caesar.treasury=100;
 aiTurn(funded,'caesar');assert.equal(funded.aerariumSeizure,undefined,'a solvent command keeps the option available');
 const elsewhere=newGrandGame('egypt');elsewhere.factions.caesar.treasury=20;
 aiTurn(elsewhere,'caesar');assert.equal(elsewhere.aerariumSeizure,undefined,'the AI cannot raid Rome without controlling it');
});

test('AI actually orders its adjacent support into the same battle month',()=>{
 const s=newGrandGame('egypt');
 for(const id of ['italiaN','t010','t011','t012','t013'])region(s,id).owner='caesar';
 const lead=army(s,'xiii'),support=army(s,'viii'),defender=army(s,'italy');
 lead.region='t012';support.region='t011';defender.region='t014';s.month=1;
 aiTurn(s,'caesar');
 assert.equal(lead.move?.to,'t014');assert.equal(support.move?.to,'t014');
 assert.equal(lead.move.remaining,support.move.remaining);
 const restored=upgradeSave(structuredClone(s));
 assert.equal(army(restored,'viii').move?.to,'t014');
 tick(restored);
 const battle=restored.battles.find(b=>b.region==='t014'&&b.attacker.owner==='caesar');
 assert.ok(battle,'both orders must resolve through real combat');
 assert.deepEqual(battle.attacker.formations.map(f=>f.id).sort(),['viii','xiii']);
 assert.equal(battle.attacker.men,12600);
 assert.equal(army(restored,'xiii').coordinated,false);
 assert.equal(army(restored,'viii').coordinated,false);
});

test('AI keeps a designated rear garrison out of an otherwise possible joint assault',()=>{
 const s=newGrandGame('egypt');
 for(const id of ['italiaN','t010','t011','t012','t013'])region(s,id).owner='caesar';
 const lead=army(s,'xiii'),guard=army(s,'viii');
 lead.region='t012';guard.region='t011';guard.aiGarrisonRegion='t011';s.month=1;
 aiTurn(s,'caesar');
 assert.equal(lead.move?.to,'t014');
 assert.equal(guard.move,null);
});

test('AI co-located field armies leave together when their march times match',()=>{
 const s=newGrandGame('egypt');
 for(const id of ['italiaN','t010','t011','t012','t013'])region(s,id).owner='caesar';
 const lead=army(s,'xiii'),support=army(s,'viii');
 lead.region='t012';support.region='t012';s.month=1;
 aiTurn(s,'caesar');
 assert.equal(lead.move?.to,'t014');
 assert.equal(support.move?.to,'t014');
 assert.equal(lead.move.remaining,support.move.remaining);
});

test('AI counts a supporting formation only when it can actually join the attack',()=>{
 const make=()=>{
  const s=newGrandGame('egypt');
  for(const id of ['italiaN','t010','t011','t012','t013'])region(s,id).owner='caesar';
  const lead=army(s,'xiii'),support=army(s,'viii');
  lead.region='t012';lead.men=4000;support.region='t011';support.men=3500;s.month=1;
  s.militaryRecon=[{owner:'caesar',regionId:'t014',source:'scouts',min:5800,max:6200,year:s.year,month:s.month}];
  return {s,lead,support};
 };
 const joined=make();aiTurn(joined.s,'caesar');
 assert.equal(joined.lead.move?.to,'t014');assert.equal(joined.support.move?.to,'t014');
 const unavailable=make();unavailable.support.trainingRemaining=2;aiTurn(unavailable.s,'caesar');
 assert.notEqual(unavailable.lead.move?.to,'t014');
 assert.equal(unavailable.support.move,null);
});

test('outnumbered AI reinforces the exposed front instead of the first map cell',()=>{
 const s=newGrandGame('egypt'),caesar=s.factions.caesar;
 s.month=4;caesar.treasury=80;caesar.food=100;
 army(s,'xiii').men=5000;army(s,'viii').men=1000;
 aiTurn(s,'caesar');
 assert.deepEqual(army(s,'viii').reconPending,{kind:'reinforce',remaining:1,regionId:'narbo'});
 assert.equal(army(s,'xiii').reconPending,undefined);
 assert.equal(caesar.treasury,56,'the usual reinforcement cost must be paid');
 assert.equal(upgradeSave(structuredClone(s)).armies.find(a=>a.id==='viii').reconPending?.kind,'reinforce');
});

test('AI does not count an army besieging enemy land as a friendly frontier defender',()=>{
 const s=newGrandGame('egypt'),caesar=s.factions.caesar;
 s.month=4;caesar.treasury=80;caesar.food=100;
 army(s,'xiii').men=1500;army(s,'viii').men=3000;
 region(s,'narbo').owner='senate';army(s,'viii').siege={region:'narbo',remaining:2};
 const manpower=caesar.manpower,cash=caesar.treasury;
 aiTurn(s,'caesar');
 const relief=s.armies.find(a=>a.owner==='caesar'&&a.id.startsWith('levy'));
 assert.equal(relief?.region,'t048');
 assert.equal(relief.men,3000);
 assert.equal(caesar.manpower,manpower-3000);
 assert.ok(caesar.treasury<=cash-24);
 assert.equal(upgradeSave(structuredClone(s)).armies.find(a=>a.id===relief.id).region,'t048');
});

test('cash-poor AI sends a nearby relief column after Rome public reserves are spent',()=>{
 const s=newGrandGame('egypt'),main=army(s,'xiii'),relief=army(s,'viii');
 region(s,'roma').owner='caesar';region(s,'t014').owner='caesar';
 main.region='roma';main.move=null;relief.region='t014';relief.move=null;
 assert.equal(seizeAerarium(s,'caesar').ok,true);
 s.factions.caesar.treasury=0;
 s.lastWarContribution={caesar:s.year*12+s.month};
 aiTurn(s,'caesar');
 assert.equal(relief.move?.to,'roma');
 assert.equal(relief.aiGarrisonRegion,'roma');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(army(restored,'viii').aiGarrisonRegion,'roma');
});

test('a depleted AI army withdraws toward a safer friendly theater',()=>{
 const s=newGrandGame('egypt'),unit=army(s,'viii');
 unit.region='t048';unit.men=800;region(s,'narbo').owner='senate';
 aiTurn(s,'caesar');
 assert.equal(unit.move?.to,'t041');
 assert.equal(region(s,unit.move.to).owner,'caesar');
});

test('a defeated besieger cannot take a theater remotely',()=>{
 const s=newGame('caesar'),besieger=army(s,'xiii'),defender=army(s,'pompey'),rome=region(s,'roma');
 besieger.region='roma';besieger.siege={region:'roma',remaining:1};besieger.men=1000;defender.region='roma';defender.men=20000;
 resolveBattle(s,defender,besieger,rome);
 assert.equal(besieger.siege,null);tick(s);assert.equal(rome.owner,'senate');
});
test('a token force cannot occupy an undefended enemy theater',()=>{
 const s=newGame('caesar'),unit=army(s,'xiii');unit.men=1;s.armies=s.armies.filter(a=>a.id!=='italy');
 assert.equal(moveArmy(s,'xiii','italiaN').ok,true);tick(s);
 assert.equal(region(s,'italiaN').owner,'senate');assert.equal(unit.region,'cisalpine');
});
test('peace withdraws besieging units from the former enemy theater',()=>{
 const s=newGame('egypt'),unit=army(s,'egyptguard');
 assert.equal(diplomacy(s,'egypt','senate','war'),true);
 unit.region='roma';unit.siege={region:'roma',remaining:1};s.factions.senate.stability=20;
 assert.equal(diplomacy(s,'egypt','senate','peace'),true);
 assert.equal(region(s,unit.region).owner,'egypt');assert.equal(unit.siege,null);
 assert.equal(isWar(s,'egypt','senate'),false);
});
test('a formal military victory ends the civil war for an observing command',()=>{
  const s=newGrandGame('egypt');
 for(const theater of s.regions)if(theater.owner==='senate')theater.owner='caesar';
 s.armies=s.armies.filter(unit=>unit.owner!=='senate');
 s.factions.senate.treasury=0;s.factions.senate.manpower=0;
 tick(s);
 assert.equal(s.civilWarOutcome?.kind,'military');
 assert.equal(s.civilWarOutcome?.winner,'caesar');
 assert.equal(isWar(s,'caesar','senate'),false);
 assert.equal(upgradeSave(structuredClone(s)).wars.some(w=>w.includes('caesar')&&w.includes('senate')),false);
});
test('Roman AI does not pay for a settlement proposal while only a nearby cell is held',()=>{
 const s=newGrandGame('egypt'),caesar=s.factions.caesar;
 s.month=12;caesar.treasury=200;army(s,'xiii').men=100000;
 region(s,'t016').owner='caesar';
 assert.equal(region(s,'roma').owner,'senate');
 aiTurn(s,'caesar');
 assert.equal(s.lastSettlementOffer,undefined);
 region(s,'roma').owner='caesar';
 aiTurn(s,'caesar');
 assert.equal(s.lastSettlementOffer['caesar:senate'],s.year*12+s.month);
});

test('Ostia does not count as Roma for Caesarian victory or settlement',()=>{
 const s=newGrandGame('caesar');
 for(const r of s.regions.filter(r=>r.owner==='senate'&&r.id!=='roma').slice(0,12))r.owner='caesar';
 s.armies=s.armies.filter(a=>a.owner!=='senate'||a.id==='pompey');
 army(s,'pompey').men=400;
 s.battles=[{attacker:{owner:'caesar'},defender:{owner:'senate'},attackerWins:true}];
 assert.equal(region(s,'roma').owner,'senate');
 assert.equal(region(s,'t016').owner,'caesar');
 assert.equal(militaryResult(s,'caesar'),null);
 assert.equal(settlementEligible(s,'caesar','senate'),false);
 region(s,'roma').owner='caesar';
 assert.equal(militaryResult(s,'caesar'),null,'a funded Senate can replace a broken field force');
 s.factions.senate.treasury=0;s.factions.senate.manpower=0;
 assert.equal(militaryResult(s,'caesar')?.basis,'field-collapse');
 assert.equal(settlementEligible(s,'caesar','senate'),true);
 tick(s);
 assert.equal(s.campaignOutcome?.winner,'caesar');
 assert.equal(s.campaignOutcome?.basis,'field-collapse');
 assert.equal(isWar(s,'caesar','senate'),false);
 assert.equal(s.achievementState.finalized,false,'victory can continue without revealing achievements');
 assert.equal(upgradeSave(structuredClone(s)).campaignOutcome?.basis,'field-collapse');
 assert.match(campaignVictoryHtml(s,'en'),/enemy core army and remaining field force were broken/);
 assert.match(campaignVictoryHtml(s,'zh'),/敌方核心军团被击溃/);
 assert.doesNotMatch(campaignVictoryHtml(s,'en'),/ending-achievements/);
});
test('a broken core field army ends either Roman war only when the rival cannot immediately replace it',()=>{
 const caesar=newGrandGame('caesar');
 region(caesar,'roma').owner='caesar';
 caesar.armies=caesar.armies.filter(a=>a.owner!=='senate'||a.id==='pompey');army(caesar,'pompey').men=400;
 caesar.battles=[{attacker:{owner:'caesar'},defender:{owner:'senate'},attackerWins:true}];
 assert.equal(caesar.regions.filter(r=>r.owner==='senate').length,72);
 assert.equal(militaryResult(caesar,'caesar'),null,'territory and funded reserves can sustain the coalition');
 caesar.factions.senate.treasury=23;
 assert.equal(militaryResult(caesar,'caesar')?.basis,'field-collapse');
 const s=newGrandGame('egypt');
 region(s,'t006').owner='senate';
 army(s,'xiii').men=400;army(s,'viii').men=1000;
 s.battles=[{attacker:{owner:'senate'},defender:{owner:'caesar'},attackerWins:true}];
 assert.equal(militaryResult(s,'senate'),null,'a neighboring city does not replace Cisalpine');
 region(s,'cisalpine').owner='senate';
 assert.equal(militaryResult(s,'senate'),null,'Caesar can still raise a new field force');
 s.factions.caesar.food=5;
 assert.equal(militaryResult(s,'senate')?.basis,'field-collapse');
 army(s,'viii').men=5000;
 assert.equal(militaryResult(s,'senate'),null,'the coalition still has a fighting field force');
});
test('older military-victory saves close their stale civil-war flag on load',()=>{
 const s=newGrandGame('egypt');
 s.civilWarOutcome={kind:'military',winner:'senate',loser:'caesar',year:s.year,month:s.month};
 assert.equal(isWar(s,'caesar','senate'),true);
 const restored=upgradeSave(structuredClone(s));
 assert.equal(restored.civilWarOutcome.winner,'senate');
 assert.equal(isWar(restored,'caesar','senate'),false);
});
test('a landless starving command loses its last soldier and reaches a terminal defeat',()=>{
 const s=newGrandGame('egypt');
 for(const site of s.regions)if(site.owner==='egypt')site.owner='senate';
 s.armies=s.armies.filter(a=>a.owner!=='egypt'||a.id==='egyptguard');
 army(s,'egyptguard').men=1;s.factions.egypt.food=-100;
 tick(s);
 assert.equal(s.armies.some(a=>a.owner==='egypt'),false);
 assert.equal(s.terminalResult,'defeat');
 assert.equal(s.achievementState.finalized,true);
 assert.equal(s.campaignEvents.some(e=>e.type==='armyDestroyed'&&e.armyId==='egyptguard'&&e.cause==='food'),true);
 assert.equal(upgradeSave(structuredClone(s)).achievementState.result,'defeat');
});
test('food attrition records a lost command and the commander goes missing',()=>{
 const s=newGrandGame('caesar');army(s,'xiii').men=1;s.factions.caesar.food=-100;
 tick(s);
 assert.equal(army(s,'xiii'),undefined);
 assert.equal(s.world.characters.caesar.location,null);
 assert.equal(s.world.characters.caesar.missing?.origin,'cisalpine');
 assert.equal(s.campaignEvents.some(e=>e.type==='armyDestroyed'&&e.armyId==='xiii'&&e.cause==='food'),true);
 assert.ok(s.log.some(entry=>/dissolved after prolonged food shortages/.test(entry.en)&&/长期缺粮/.test(entry.zh)));
 const loaded=upgradeSave(structuredClone(s));
 assert.equal(loaded.world.characters.caesar.missing?.origin,'cisalpine');
});
test('a supplied country still loses its last isolated soldier to local supply failure',()=>{
 const s=newGrandGame('egypt');
 for(const site of s.regions)if(site.owner==='egypt')site.owner='senate';
 s.armies=s.armies.filter(a=>a.owner!=='egypt'||a.id==='egyptguard');
 const guard=army(s,'egyptguard');guard.men=1;guard.region='roma';s.factions.egypt.food=100;
 assert.ok(armySupply(s,guard)<.5);
 tick(s);
 assert.ok(s.factions.egypt.food>=0);
 assert.equal(s.armies.some(a=>a.owner==='egypt'),false);
 assert.equal(s.terminalResult,'defeat');
 assert.equal(s.campaignEvents.some(e=>e.type==='armyDestroyed'&&e.armyId==='egyptguard'&&e.cause==='supply'),true);
 assert.ok(s.log.some(entry=>/dissolved after prolonged supply failure/.test(entry.en)&&/长期补给中断/.test(entry.zh)));
 assert.equal(upgradeSave(structuredClone(s)).achievementState.result,'defeat');
});
test('alliance war reaching player is recorded and notified',()=>{
 const s=newGame('caesar');s.alliances.push(['caesar','numidia']);const before=s.notifications.length;
 assert.equal(diplomacy(s,'parthia','numidia','war'),true);
 assert.ok(s.notifications.length>before);assert.ok(s.campaignEvents.some(e=>e.type==='diplomacy'&&e.affectedFactionIds?.includes('caesar')&&e.affectedFactionIds?.includes('parthia')));
});
test('Senate victory and calendar crossing have valid outcomes',()=>{
 const s=newGame('senate');for(const r of s.regions)if(r.owner==='caesar')r.owner='senate';s.armies=s.armies.filter(a=>a.owner!=='caesar');tick(s);assert.equal(s.victory,true);
 s.year=-1;s.month=12;tick(s);assert.equal(s.year,1);assert.match(eventDate({year:s.year,month:s.month},'en'),/CE/);
});
test('objectives and monthly briefing include recruitment before the tick',()=>{
 const s=newGame('caesar');s.armies=s.armies.filter(a=>a.owner!=='caesar');s.objectiveProgress.field.status='lost';
 const before=s.factions.caesar.treasury;assert.equal(recruit(s,'cisalpine'),true);assert.equal(s.objectiveProgress.field.status,'completed');
 tick(s);assert.equal(s.briefings[0].delta.treasury,s.factions.caesar.treasury-before);assert.ok(s.briefings[0].eventIds.some(id=>s.campaignEvents.find(e=>e.id===id)?.type==='recruitment'));
});
test('chronicle includes intelligence target and snapshots historical army and battle labels',()=>{
 const s=newGame('caesar'),unit=army(s,'xiii');recordEvent(s,{type:'intelligence',category:'intelligence',factionId:'caesar',targetFactionId:'egypt'});
 assert.match(chronicleHtml(s,'en',{faction:'egypt'}),/Egypt/);
 unit.region='italiaN';const movement=recordMovement(s,unit,'cisalpine');const name=unit.name[0];s.armies=s.armies.filter(a=>a.id!=='xiii');assert.match(eventText(s,movement,'en').title,new RegExp(name));
 const t=newGame('caesar'),a=army(t,'xiii'),d=army(t,'italy');resolveBattle(t,a,d,region(t,'italiaN'));const battle=t.battles[0];delete battle.ownerAfter;region(t,'italiaN').owner='egypt';
 assert.match(battleReportHtml(t,battle,'en'),/Controller after battle: —/);
});
test('reinforcements join the selected army after a month and a detected probe changes AI posture',()=>{
 const s=newGame('senate'),unit=army(s,'italy'),men=unit.men;
 assert.equal(requestReinforcements(s,unit.id).ok,true);assert.equal(unit.men,men);assert.equal(moveArmy(s,unit.id,'cisalpine').ok,false);tick(s);assert.equal(unit.men,men+3000);
 const p=newGame('senate');let result;for(let seed=1;seed<100;seed++){p.seed=seed;result=probePositions(p,'italy','cisalpine');if(result.enemyDetected)break;p.armies.find(a=>a.id==='italy').reconPending=null}
 assert.equal(result.enemyDetected,true);assert.ok(result.report);const before=p.armies.filter(a=>a.owner==='caesar'&&a.region==='cisalpine').length;tick(p);
 assert.ok(p.armies.filter(a=>a.owner==='caesar'&&a.region==='cisalpine').length>before);
});

test('grand-campaign AI reinforces an existing border army before marching or raising another levy',()=>{
 const s=newGrandGame('caesar'),levies=army(s,'italy'),f=s.factions.senate;
 s.month=4;f.treasury=200;f.food=100;f.manpower=10000;
 s.militaryAlerts=[{owner:'senate',regionId:'italiaN',year:s.year,month:s.month}];
 const count=s.armies.length,men=levies.men,loyalty=region(s,'italiaN').loyalty;
 aiTurn(s,'senate');
 assert.equal(s.armies.length,count);
 assert.deepEqual(levies.reconPending,{kind:'reinforce',remaining:1,regionId:'italiaN'});
 assert.equal(levies.move,null);
 assert.equal(f.manpower,7000);
 assert.equal(f.food,94);
 assert.equal(region(s,'italiaN').loyalty,loyalty-3);
 advanceRecon(s);
 assert.equal(levies.men,men+3000);
 assert.equal(levies.reconPending?.kind,undefined);
});

test('AI does not stack another levy on an already assembled border force',()=>{
 const s=newGrandGame('caesar'),levies=army(s,'italy'),f=s.factions.senate;
 s.month=4;levies.men=8200;f.treasury=200;f.food=100;f.manpower=10000;
 s.militaryAlerts=[{owner:'senate',regionId:'italiaN',year:s.year,month:s.month}];
 const count=s.armies.length;
 aiTurn(s,'senate');
 assert.equal(s.armies.length,count);
 assert.equal(levies.reconPending?.kind,undefined);
 assert.equal(f.manpower,10000);
});
