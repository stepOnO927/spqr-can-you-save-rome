import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,army,armySupply,moveArmy,previewMarch,region,tick,upgradeSave,aiTurn,resolveBattle,adoptIdea,researchInnovation} from '../engine.js';
import {assessment,firstHostileOnRoute,sendScouts,probePositions,latestRecon,reconReports,delayAttack,markReconRegion,advanceRecon} from '../reconnaissance.js';
import {development,activeEffects,IDEAS,ideaAdoptionPlan} from '../development.js';
import {developmentPanel} from '../development-ui.js';
import {intelligenceHtml,afterActionHtml,fortificationText,reconSummaryHtml} from '../recon-ui.js';
import {eventText} from '../campaign-reports.js';
import {briefingHtml,chronicleHtml} from '../reports-ui.js';

test('a march to friendly territory assesses the first hostile theater along its actual route',()=>{
 const s=newGrandGame('caesar');
 region(s,'t010').owner='caesar';
 let plan=previewMarch(s,'xiii','t010');
 assert.deepEqual(plan.path.map(step=>step.id),['italiaN','t011','t010']);
 let threat=firstHostileOnRoute(s,'xiii','t010',plan);
 assert.deepEqual(threat,{regionId:'italiaN',adjacent:true,travelMonths:1});
 assert.equal(assessment(s,'xiii',threat.regionId,plan).owner,'senate');
 region(s,'italiaN').owner='caesar';
 plan=previewMarch(s,'xiii','t010');
 threat=firstHostileOnRoute(s,'xiii','t010',plan);
 assert.deepEqual(threat,{regionId:'t011',adjacent:false,travelMonths:2});
 assert.equal(sendScouts(s,'xiii',threat.regionId).ok,false,'distant enemy territory cannot be scouted from the origin');
 region(s,'t011').owner='caesar';
 plan=previewMarch(s,'xiii','t010');
 assert.equal(firstHostileOnRoute(s,'xiii','t010',plan),null);
});

test('prebattle supply follows current territory control rather than the previous monthly cache',()=>{
 const s=newGrandGame('caesar'),unit=army(s,'xiii');
 for(const site of s.regions)if(site.owner==='caesar')site.owner='senate';
 region(s,'t012').owner='caesar';region(s,'t012').food=0;
 unit.region='t012';unit.operationalSupply=1;s.factions.caesar.food=80;
 assert.equal(armySupply(s,unit),.18);
 assert.equal(assessment(s,'xiii','t014').supply,18);
 assert.match(intelligenceHtml(assessment(s,'xiii','t014'),region(s,'t014'),'en'),/Commander \/ supply[\s\S]*\/ 18%/);
 region(s,'roma').owner='caesar';unit.region='roma';unit.operationalSupply=.18;
 assert.equal(armySupply(s,unit),1);
 assert.equal(assessment(s,'xiii','t017').supply,100);
 assert.equal(assessment(upgradeSave(JSON.parse(JSON.stringify(s))),'xiii','t017').supply,100);
});

test('enemy fortification remains hidden until a dated military report is available',()=>{
 const s=newGame('senate'),target=s.regions.find(r=>r.id==='cisalpine');target.fort=3;
 assert.equal(fortificationText(s,'senate',target.id,'en'),'Unknown');
 assert.equal(fortificationText(s,'senate',target.id,'zh'),'未知');
 assert.equal(fortificationText(s,'caesar',target.id,'en'),'3');
 s.militaryRecon=[];
 s.militaryRecon.unshift({owner:'senate',armyId:'italy',regionId:target.id,year:-49,month:1,observationYear:-49,observationMonth:1,arrivalYear:-49,arrivalMonth:1,source:'probe',min:3000,max:7000,defensive:{fort:2}});
 s.militaryRecon.unshift({owner:'senate',armyId:'italy',regionId:target.id,year:-49,month:2,observationYear:-49,observationMonth:1,arrivalYear:-49,arrivalMonth:2,source:'scouts',min:null,max:null,defensive:null});
 s.month=2;
 assert.equal(assessment(s,'italy',target.id).fort,2,'a newer strength report must not erase an older fort observation');
 assert.match(intelligenceHtml(assessment(s,'italy',target.id),target,'en'),/≈2 \(1\/49 BCE\)/);
 assert.equal(fortificationText(s,'senate',target.id,'en'),'≈2 · 1/49 BCE');
 assert.equal(fortificationText(s,'senate',target.id,'zh'),'≈2 · 公元前49年1月');
 target.fort=7;
 assert.equal(fortificationText(upgradeSave(JSON.parse(JSON.stringify(s))),'senate',target.id,'en'),'≈2 · 1/49 BCE','the interface must show the observed estimate, never the new hidden value');
 s.month=5;
 assert.match(fortificationText(s,'senate',target.id,'en'),/may be outdated/);
});

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
test('Numidian mounted scouts require a supportive local base and improve uncertain field reports only after adoption',()=>{
 const s=newGrandGame('numidia'),idea=IDEAS.find(x=>x.id==='numidian-mounted-scouts');
 assert.match(idea.source.url,/Civil_Wars\/2B%2A/);
 for(const [lang,label] of [['en','Numidian Mounted Scouts'],['zh','努米底亚骑马斥候']])assert.match(developmentPanel(s,lang,'idea'),new RegExp(label));
 const original=s.factions.numidia.treasury;
 assert.equal(researchInnovation(s,'numidia','idea',idea.id).ok,true);
 assert.equal(activeEffects(s,'numidia').scoutReliability||0,0,'research alone has no effect');
 for(let i=0;i<5&&s.development.numidia.research;i++)tick(s);
 assert.equal(ideaAdoptionPlan(s,'numidia',idea.id).ok,true);
 assert.equal(adoptIdea(s,'numidia',idea.id).ok,true);
 assert.equal(activeEffects(s,'numidia').scoutReliability||0,0,'transition alone has no effect');
 for(let i=0;i<5&&s.development.numidia.adoption;i++)tick(s);
 assert.equal(activeEffects(s,'numidia').scoutReliability,.08);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(activeEffects(loaded,'numidia').scoutReliability,.08);
 assert.ok(loaded.factions.numidia.treasury<original,'research, adoption and upkeep cost treasury');
 const encounter=newGame('senate');development(encounter,'senate').slots.military[0]=idea.id;
 assert.equal(sendScouts(encounter,'italy','cisalpine').ok,true);
 assert.equal(army(encounter,'italy').reconPending.scoutBonus,.08);
 advanceRecon(encounter);
 const fieldReport=latestRecon(encounter,'senate','cisalpine');
 assert.equal(fieldReport.source,'scouts');
 assert.ok(fieldReport.min==null||fieldReport.max>fieldReport.min,'mounted scouts still produce uncertain ranges');

 const outsider=newGrandGame('caesar');outsider.development.caesar.knownIdeas.push(idea.id);outsider.factions.caesar.treasury=200;
 assert.equal(ideaAdoptionPlan(outsider,'caesar',idea.id).reason,'cultural-base');
 const local=outsider.regions.find(r=>r.owner==='numidia'&&r.culture==='north-african');local.owner='caesar';local.civicSatisfaction=44;
 assert.equal(ideaAdoptionPlan(outsider,'caesar',idea.id).reason,'local-support');
 local.civicSatisfaction=45;
 assert.equal(ideaAdoptionPlan(outsider,'caesar',idea.id).ok,true);
 assert.ok(ideaAdoptionPlan(outsider,'caesar',idea.id).months>ideaAdoptionPlan(s,'numidia',idea.id).months,'foreign court needs adaptation time');
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
 const scoutEvent=s.campaignEvents.find(e=>e.type==='scoutReturn'&&e.regionId==='cisalpine');
 assert.equal(scoutEvent.observationMonth,1);assert.equal(scoutEvent.month,2);
 assert.equal(scoutEvent.reportConfidence,report.confidence);
 for(const [language,title] of [['en','Scouts returned'],['zh','斥候回报']]){
  assert.match(eventText(s,scoutEvent,language).title,new RegExp(title));
  assert.match(briefingHtml(s,language),new RegExp(title));
  assert.match(chronicleHtml(s,language),new RegExp(title));
 }
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).campaignEvents.filter(e=>e.type==='scoutReturn').length,1);
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
 const chineseSummary=reconSummaryHtml(scout,'zh');
 assert.match(chineseSummary,/观察 公元前49年1月/);assert.match(chineseSummary,/送达 公元前49年2月/);
 assert.match(chineseSummary,/斥候/);assert.match(chineseSummary,/误报风险 高/);
 assert.doesNotMatch(chineseSummary,/\b(?:scouts|rumor|unverified|confirmed)\b/);
 const englishSummary=reconSummaryHtml(scout,'en');
 assert.match(englishSummary,/Observed 1\/49 BCE/);assert.match(englishSummary,/Arrived 2\/49 BCE/);
 assert.match(englishSummary,/Misinformation risk High/);
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
