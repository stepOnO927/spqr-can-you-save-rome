import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,army,moveArmy,tick,upgradeSave,aiTurn,resolveBattle} from '../engine.js';
import {assessment,sendScouts,probePositions,latestRecon,reconReports,delayAttack,markReconRegion,advanceRecon} from '../reconnaissance.js';
import {development,activeEffects,IDEAS} from '../development.js';
import {developmentPanel} from '../development-ui.js';
import {intelligenceHtml,afterActionHtml} from '../recon-ui.js';

test('field scout coordination improves reports without revealing exact troops',()=>{
 const base=newGame('senate');
 const idea=IDEAS.find(x=>x.id==='field-reconnaissance');
 assert.match(idea.source.url,/Gallic_War\/2%2A/);
 for(const [lang,label] of [['en','Field Scout Coordination'],['zh','战场斥候编组']])assert.match(developmentPanel(base,lang,'idea'),new RegExp(label));
 const outcomes={plain:0,trained:0,narrower:0,trainedMisses:0};
 for(let i=1;i<=128;i++){
  const reports={};
  for(const kind of ['plain','trained']){
   const s=structuredClone(base);s.reconSeed=Math.imul(i,0x9e3779b9)>>>0;
   if(kind==='trained')development(s,'senate').slots.military[0]=idea.id;
   assert.equal(activeEffects(s,'senate').scoutReliability||0,kind==='trained' ? .12 : 0);
   assert.equal(sendScouts(s,'italy','cisalpine').ok,true);
   assert.equal(s.armies.find(a=>a.id==='italy').reconPending.scoutBonus,kind==='trained' ? .12 : 0);
   advanceRecon(s);reports[kind]=latestRecon(s,'senate','cisalpine');
   if(reports[kind].min!=null)outcomes[kind]++;
   else if(kind==='trained')outcomes.trainedMisses++;
   if(reports[kind].min!=null)assert.ok(reports[kind].max>reports[kind].min);
  }
  if(reports.plain.min!=null&&reports.trained.min!=null&&reports.trained.max-reports.trained.min<reports.plain.max-reports.plain.min)outcomes.narrower++;
 }
 assert.ok(outcomes.trained>outcomes.plain,'coordination should increase detection over seeded encounters');
 assert.ok(outcomes.narrower>0,'some estimates should become narrower');
 assert.ok(outcomes.trainedMisses>0,'training must not make detection certain');
});
test('Senate can assess, scout, then attack without a scripted outcome or exact intelligence',()=>{
 const s=newGame('senate'),unit=army(s,'italy'),actual=army(s,'xiii').men;
 const initial=assessment(s,'italy','cisalpine');
 assert.equal(initial.friendly,5200);assert.equal(initial.report,null);
 assert.doesNotMatch(JSON.stringify(initial),new RegExp(`"men":${actual}`));
 assert.match(intelligenceHtml(initial,s.regions.find(r=>r.id==='cisalpine'),'en'),/Unknown/);
 assert.match(intelligenceHtml(initial,s.regions.find(r=>r.id==='cisalpine'),'zh'),/未知/);
 const treasury=s.factions.senate.treasury,food=s.factions.senate.food;
 assert.equal(sendScouts(s,'italy','cisalpine').ok,true);
 assert.equal(s.factions.senate.treasury,treasury-4);assert.equal(s.factions.senate.food,food-2);
 assert.equal(moveArmy(s,'italy','cisalpine').ok,false);
 tick(s);
 const report=latestRecon(s,'senate','cisalpine');assert.equal(report.source,'scouts');assert.equal(report.month,s.month);
 assert.ok(report.min===null||report.max>report.min);
 assert.equal(report.misinformationRisk,'high');
 assert.deepEqual(reconReports(upgradeSave(JSON.parse(JSON.stringify(s))),'senate','cisalpine')[0],report);
 const order=moveArmy(s,'italy','cisalpine');assert.equal(order.ok,true);
 assert.ok(unit.attackIntel);assert.equal(unit.attackIntel.report?.source,'scouts');
 for(let i=0;i<3&&!s.battles?.length;i++)tick(s);
 assert.ok(s.battles?.length);
 const battle=s.battles[0];assert.equal(typeof battle.attackerWins,'boolean');
 const battleContact=latestRecon(s,'senate','cisalpine');assert.equal(battleContact.source,'battle');assert.equal(battleContact.confidence,'confirmed');assert.ok(battleContact.max>battleContact.min);
 for(const language of ['en','zh'])assert.match(afterActionHtml(battle,'senate',language),language==='zh'?/战后复盘/:/AFTER-ACTION REVIEW/);
});
test('AI scouts in later campaigns but sometimes attacks on incomplete intelligence',()=>{
 const scout=newGame('senate');scout.year=-48;scout.month=3;scout.seed=1;scout.factions.caesar.treasury=200;scout.factions.caesar.food=100;
 aiTurn(scout,'caesar');assert.equal(scout.armies.find(a=>a.id==='xiii').reconPending?.kind,'scouts');
 tick(scout);assert.ok(reconReports(scout,'caesar','italiaN').some(r=>r.source==='scouts'));
 const rash=newGame('senate');rash.year=-48;rash.month=3;rash.seed=2;rash.factions.caesar.treasury=200;rash.factions.caesar.food=100;
 aiTurn(rash,'caesar');assert.equal(rash.armies.find(a=>a.id==='xiii').move?.to,'italiaN');
});
test('reports preserve observation and arrival, age without leaking fortifications, and compare sources',()=>{
 const s=newGame('senate'),target=s.regions.find(r=>r.id==='cisalpine');target.fort=3;
 assert.equal(assessment(s,'italy','cisalpine').fort,null);
 assert.equal(markReconRegion(s,'italy','cisalpine').marked,true);
 assert.equal(markReconRegion(s,'italy','cisalpine').marked,false);
 assert.equal(delayAttack(s,'italy','cisalpine').ok,true);
 assert.equal(s.armies.find(a=>a.id==='italy').delayedTarget.regionId,'cisalpine');
 assert.equal(sendScouts(s,'italy','cisalpine').ok,true);tick(s);
 const scout=latestRecon(s,'senate','cisalpine');
 assert.equal(scout.observationMonth,1);assert.equal(scout.arrivalMonth,2);assert.equal(scout.age,1);
 assert.equal(scout.reliability,'low');assert.equal(assessment(s,'italy','cisalpine').fort,null);
 s.armies.find(a=>a.id==='italy').reconPending=null;
 assert.equal(probePositions(s,'italy','cisalpine').ok,true);
 const reports=reconReports(s,'senate','cisalpine');assert.equal(reports.length,2);
 assert.ok(['highly credible','disputed','unverified','rumor'].includes(reports[0].confidence));
 const html=intelligenceHtml(assessment(s,'italy','cisalpine'),target,'en');
 assert.match(html,/Observed \/ arrived/);assert.match(html,/Compare intelligence reports/);
 assert.match(intelligenceHtml(assessment(s,'italy','cisalpine'),target,'zh'),/比较情报报告/);
});
test('probe has a real resource and readiness cost; delay lets AI advance',()=>{
 const s=newGame('senate'),food=s.factions.senate.food;
 const out=probePositions(s,'italy','cisalpine');assert.equal(out.ok,true);
 assert.equal(s.factions.senate.food,food-3);assert.ok(out.loss>=0);
 assert.equal(s.armies.find(a=>a.id==='italy').reconPending.kind,'probe');
 assert.equal(moveArmy(s,'italy','cisalpine').ok,false);
 const before=s.month;tick(s);assert.notEqual(s.month,before);
 assert.equal(s.armies.find(a=>a.id==='italy')?.reconPending,null);
 assert.equal(latestRecon(s,'senate','cisalpine').source,'probe');
});
test('amphibious attacks pay a combat readiness cost disclosed in the review',()=>{
 const land=newGame('caesar'),sea=structuredClone(land);
 const fight=(s,isSea)=>{const attacker=army(s,'xiii'),defender=army(s,'italy'),target=s.regions.find(r=>r.id==='italiaN');attacker.move={sea:isSea};resolveBattle(s,attacker,defender,target);return s.battles[0]};
 const ground=fight(land,false),landing=fight(sea,true);
 assert.ok(landing.attacker.power<ground.attacker.power);assert.ok(landing.landingFactor<1);
 assert.match(afterActionHtml(landing,'caesar','en'),/landing factor/);
 assert.match(afterActionHtml(landing,'caesar','zh'),/登陆战力系数/);
});
