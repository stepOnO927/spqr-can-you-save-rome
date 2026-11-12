import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,upgradeSave,tick,aiTurn,setTax,recruit,diplomacy,royalCourtCredit,researchInnovation,adoptIdea,removeIdea,expandIdeaSlot,startConstruction,constructionCheck,knowledgeTrade,sellKnowledge,proposeKnowledgeSale,proposeKnowledgePurchase,acceptKnowledgePurchase,declineKnowledgePurchase,acceptKnowledgeOffer,declineKnowledgeOffer,exchangeKnowledge,proposeKnowledgeExchange,acceptKnowledgeExchange,declineKnowledgeExchange,knowledgeAgreementCheck,proposeKnowledgeAgreement,negotiateKnowledgeAgreement,acceptKnowledgeAgreement,declineKnowledgeAgreement,cancelKnowledgeAgreement,inviteForeignScholars,purchaseMaterials} from '../engine.js';
import {IDEA_CATEGORIES,IDEAS,MATERIALS,BUILDINGS,development,activeEffects,ideaCompatibility,ideaAdoptionPlan} from '../development.js';
import {developmentPanel,ideasPanel} from '../development-ui.js';
import {edgeMonths} from '../grand-operations.js';
import {techIllustration} from '../tech-art.js';
import {faithSatisfaction,advanceDemography} from '../local-society.js';
import {nationalBudget} from '../national-budget.js';
import {budgetHtml} from '../budget-ui.js';
import {expensesThisMonth} from '../expense-ledger.js';
const months=(s,n)=>{for(let i=0;i<n;i++)tick(s)};

test('monthly budget records paid construction and research orders without double counting',()=>{
 const s=newGrandGame('senate');s.factions.senate.treasury=500;
 const projected=nationalBudget(s,'senate').projectedNet;
 assert.deepEqual(expensesThisMonth(s,'senate'),{construction:0,research:0});
 const researchBefore=s.factions.senate.treasury;
 assert.equal(researchInnovation(s,'senate','material','water-control').ok,true);
 const researchCost=researchBefore-s.factions.senate.treasury;
 const constructionCost=constructionCheck(s,'senate','roma','road').cost;
 assert.equal(startConstruction(s,'senate','roma','road').ok,true);
 const secondCost=constructionCheck(s,'senate','italiaS','road').cost;
 assert.equal(startConstruction(s,'senate','italiaS','road').ok,true);
 const constructionTotal=constructionCost+secondCost;
 assert.deepEqual(expensesThisMonth(s,'senate'),{construction:constructionTotal,research:researchCost});
 assert.equal(researchInnovation(s,'senate','material','water-control').ok,false);
 assert.equal(startConstruction(s,'senate','roma','road').ok,false);
 assert.deepEqual(expensesThisMonth(s,'senate'),{construction:constructionTotal,research:researchCost});
 assert.equal(nationalBudget(s,'senate').projectedNet,projected,'one-time orders must remain separate from the monthly projection');
 for(const [lang,construction,research] of [['en','Construction paid this month','Research paid this month'],['zh','本月已付建造费','本月已付研究费']]){
  const html=budgetHtml(s,lang);
  assert.match(html,new RegExp(`${construction}</td><td>-${constructionTotal}`));
  assert.match(html,new RegExp(`${research}</td><td>-${researchCost}`));
 }
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(expensesThisMonth(restored,'senate'),{construction:constructionTotal,research:researchCost});
 tick(restored);
 assert.deepEqual(expensesThisMonth(restored,'senate'),{construction:0,research:0});
});

test('every development node has its own interpretive illustration',()=>{
 const art=[...MATERIALS,...IDEAS].map(item=>techIllustration(item));
 assert.equal(art.length,69);assert.equal(new Set(art).size,69);
 assert.ok(art.every(svg=>svg.includes('<svg')&&svg.includes('tech-art-mark')));
});

test('Republican-era source corrections retain save IDs and avoid later public-library claims',()=>{
 const fort=MATERIALS.find(x=>x.id==='stone-fortification'),library=MATERIALS.find(x=>x.id==='library-organization');
 assert.match(fort.name[0],/Fortification Planning/);
 assert.match(fort.source.url,/musee-archeologienationale/);
 assert.match(library.name[0],/Private Collection/);
 assert.deepEqual(library.prerequisites,['craft-workshops']);
 assert.match(BUILDINGS.find(x=>x.id==='library').name[0],/Private Book Collection/);
 assert.match(library.source.url,/persee\.fr/);
 for(const id of ['roadmaking','road-milestones','bridge-engineering','barracks-design','stone-fortification','quarrying','metal-extraction','siege-machinery','library-organization','grain-storage','supply-organization','grain-processing']){
  const item=MATERIALS.find(x=>x.id===id);assert.ok(item?.source.url.startsWith('https://'),id);assert.notEqual(item.source.title,'World History Encyclopedia',id);
 }
 const ideaEvidence={
  'tax-farming':['In Verrem','verres23.html'],
  'estate-organization':['Cato, On Agriculture','De_Agricultura/A%2A.html'],
  'rhetorical-education':['De Oratore','deoratore1B.html']
 };
 for(const [id,[title,url]] of Object.entries(ideaEvidence)){
  const item=IDEAS.find(x=>x.id===id);
  assert.ok(item?.context.every(Boolean),id);
  assert.match(item.source.title,new RegExp(title));
  assert.ok(item.source.url.endsWith(url),id);
 }
});

test('both research branches render every node, including naval capabilities without buildings',()=>{
  const s=newGame('senate');for(const lang of ['en','zh'])for(const branch of ['material','idea']){
    const html=developmentPanel(s,lang,branch);assert.equal((html.match(/class="dev-card dev-card-/g)||[]).length,branch==='material'?MATERIALS.length:IDEAS.length)
  }
});

test('idea tradeoffs show their negative sign in both languages',()=>{
 const s=newGame('senate');
 assert.match(developmentPanel(s,'en','idea'),/Treasury \/ month −2/);
 assert.match(developmentPanel(s,'zh','idea'),/国库 \/ 月 −2/);
 assert.match(developmentPanel(s,'en','idea'),/Attack −2%/);
 assert.match(developmentPanel(s,'zh','idea'),/进攻 −2%/);
});

test('public law and allied registration are sourced, bilingual policies with paid active effects',()=>{
 const law=IDEAS.find(x=>x.id==='public-legal-reference'),registry=IDEAS.find(x=>x.id==='citizen-registration');
 assert.match(law.source.url,/Diodorus_Siculus/);assert.match(registry.source.url,/phi016/);
 assert.match(developmentPanel(newGame('senate'),'en','idea'),/Public Legal Reference/);
 assert.match(developmentPanel(newGame('senate'),'zh','idea'),/盟邦公民登记/);
 const s=newGame('senate');s.wars=[];s.factions.senate.treasury=500;
 const d=development(s,'senate');d.knownIdeas.push(law.id,registry.id);
 assert.equal(adoptIdea(s,'senate',law.id,0).ok,true);months(s,2);
 assert.equal(activeEffects(s,'senate').loyalty,2);
 assert.equal(activeEffects(s,'senate').upkeep,2);
 assert.equal(adoptIdea(s,'senate',registry.id,0).ok,true);months(s,3);
 assert.equal(d.slots.government[0],registry.id);
 assert.equal(activeEffects(s,'senate').manpower,80);
 assert.equal(activeEffects(s,'senate').loyalty,1);
 assert.equal(activeEffects(s,'senate').upkeep,2);
});

test('provincial tax review costs upkeep and only softens high-tax pressure where administration reaches',()=>{
 const idea=IDEAS.find(x=>x.id==='provincial-tax-review');
 assert.match(idea.source.url,/verres23\.html/);
 assert.match(developmentPanel(newGrandGame('senate'),'en','idea'),/Provincial Tax Review/);
 assert.match(developmentPanel(newGrandGame('senate'),'zh','idea'),/行省税务复核/);
 const s=newGrandGame('senate');s.wars=[];s.factions.senate.treasury=500;
 development(s,'senate').knownIdeas.push(idea.id);
 assert.equal(adoptIdea(s,'senate',idea.id,0).ok,true);
 months(s,2);
 assert.equal(development(s,'senate').slots.government[0],idea.id);
 const active=upgradeSave(JSON.parse(JSON.stringify(s))),control=upgradeSave(JSON.parse(JSON.stringify(s)));
 development(control,'senate').slots.government[0]=null;
 for(const state of [active,control]){
  assert.equal(setTax(state,'senate','high'),true);
  for(const [id,integration] of [['roma',70],['t016',50]]){
   const province=state.regions.find(r=>r.id===id);
   assert.equal(province.owner,'senate');province.integration=integration;province.loyalty=50;province.civicSatisfaction=50;
  }
 }
 assert.equal(nationalBudget(active,'senate').ideaUpkeep,nationalBudget(control,'senate').ideaUpkeep+2);
 assert.equal(nationalBudget(active,'senate').reviewExpense,6);
 assert.equal(nationalBudget(control,'senate').reviewExpense,0);
 assert.match(budgetHtml(active,'en'),/Provincial tax review<\/td><td>-6/);
 assert.match(budgetHtml(active,'zh'),/行省税务复核<\/td><td>-6/);
 const cashDifference=active.factions.senate.treasury-control.factions.senate.treasury;
 tick(active);tick(control);
 assert.equal(active.factions.senate.treasury-control.factions.senate.treasury,cashDifference-8);
 for(const field of ['loyalty','civicSatisfaction']){
  assert.equal(active.regions.find(r=>r.id==='roma')[field],control.regions.find(r=>r.id==='roma')[field]+1);
  assert.equal(active.regions.find(r=>r.id==='t016')[field],control.regions.find(r=>r.id==='t016')[field]);
 }
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(active))).development.senate.slots.government[0],idea.id);
});

test('royal court liaison helps paid alliances with kingdoms only after adoption and survives reload',()=>{
 const idea=IDEAS.find(x=>x.id==='royal-court-liaison');
 assert.match(idea.source.url,/adfam15\.html/);
 assert.match(developmentPanel(newGame('senate'),'en','idea'),/Royal Court Liaison/);
 assert.match(developmentPanel(newGame('senate'),'zh','idea'),/王廷联络/);
 assert.match(developmentPanel(newGame('senate'),'en','idea'),/Alliance credit with independent kingdoms \+8/);
 const s=newGame('senate');s.wars=[];s.alliances=[];s.factions.senate.treasury=500;
 s.relations['galatia:senate']=22;s.relations['caesar:senate']=22;
 const d=development(s,'senate');d.knownIdeas.push(idea.id);
 assert.equal(royalCourtCredit(s,'senate','galatia'),0,'research alone gives no diplomatic credit');
 assert.equal(diplomacy(s,'senate','galatia','alliance'),false);
 assert.equal(adoptIdea(s,'senate',idea.id,0).ok,true);
 assert.equal(royalCourtCredit(s,'senate','galatia'),0,'the transition must finish first');
 months(s,2);
 assert.equal(d.slots.diplomacy[0],idea.id);
 assert.equal(royalCourtCredit(s,'senate','galatia'),8);
 assert.equal(royalCourtCredit(s,'senate','caesar'),0);
 assert.equal(nationalBudget(s,'senate').ideaUpkeep>=3,true);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(royalCourtCredit(restored,'senate','galatia'),8);
 restored.wars=[];restored.alliances=[];restored.relations['galatia:senate']=22;restored.relations['caesar:senate']=22;
 assert.equal(diplomacy(restored,'senate','caesar','alliance'),false,'Roman factions do not receive royal-court credit');
 assert.equal(diplomacy(restored,'senate','galatia','alliance'),true);
 const atWar=upgradeSave(JSON.parse(JSON.stringify(s)));atWar.wars.push(['senate','galatia']);
 assert.equal(diplomacy(atWar,'senate','galatia','alliance'),false,'the idea cannot override war');
});

test('five categories begin with one independent inactive slot and research alone has no effect',()=>{
  const s=newGame();s.wars=[];s.alliances.push(['caesar','senate']);const d=development(s,'caesar');
  assert.equal(IDEA_CATEGORIES.length,5);assert.equal(IDEAS.length,35);assert.equal(MATERIALS.length,34);assert.equal(BUILDINGS.length,33);
  assert.deepEqual(Object.values(d.slots).map(x=>x.length),[1,1,1,1,1]);
  assert.equal(researchInnovation(s,'caesar','idea','legion-training').ok,true);
  assert.equal(activeEffects(s,'caesar').recruitMorale,undefined);
  months(s,3);assert.ok(d.knownIdeas.includes('legion-training'));
  assert.equal(activeEffects(s,'caesar').recruitMorale,undefined);
  assert.equal(adoptIdea(s,'caesar','legion-training',0).ok,true);
  months(s,2);assert.equal(d.slots.military[0],'legion-training');
  assert.equal(activeEffects(s,'caesar').recruitMorale,6);
  assert.equal(removeIdea(s,'caesar','military',0).ok,true);
  months(s,2);assert.equal(activeEffects(s,'caesar').recruitMorale,undefined);
  assert.ok(d.knownIdeas.includes('legion-training'));
});

test('ideas remain in their category, conflicting policies are rejected, expansion is category specific',()=>{
  const s=newGame();s.wars=[];s.alliances.push(['caesar','senate']);const d=development(s,'caesar');s.factions.caesar.treasury=500;
  d.knownIdeas.push('senatorial-consultation','central-administration','provincial-autonomy','legion-training');
  assert.equal(adoptIdea(s,'caesar','legion-training',1).ok,false);
  assert.equal(adoptIdea(s,'caesar','senatorial-consultation',0).ok,true);months(s,2);
  assert.equal(ideaCompatibility(s,'caesar','central-administration',0).ok,true);
  assert.equal(expandIdeaSlot(s,'caesar','government').ok,true);months(s,6);
  assert.equal(d.slots.government.length,2);assert.equal(d.slots.military.length,1);
  assert.equal(adoptIdea(s,'caesar','provincial-autonomy',1).ok,true);months(s,3);
  assert.equal(d.slots.government[1],'provincial-autonomy');
});

test('a conflicting idea may replace its own slot but cannot coexist or be equipped twice',()=>{
  const s=newGame('caesar');s.factions.caesar.treasury=500;
  const d=development(s,'caesar');d.knownIdeas.push('hardline-diplomacy','diplomatic-accommodation');
  assert.equal(adoptIdea(s,'caesar','hardline-diplomacy',0).ok,true);months(s,2);
  assert.equal(d.slots.diplomacy[0],'hardline-diplomacy');
  assert.equal(ideaCompatibility(s,'caesar','diplomatic-accommodation',0).ok,true);
  for(const lang of ['en','zh']){
    const button=ideasPanel(s,lang).match(/<button[^>]*data-adopt-idea="diplomatic-accommodation" data-slot="0"[^>]*>/)?.[0];
    assert.ok(button,lang);assert.doesNotMatch(button,/\bdisabled\b/,lang);
  }
  d.slots.diplomacy.push(null);
  assert.equal(ideaCompatibility(s,'caesar','diplomatic-accommodation',1).reason,'conflict');
  const replacement=ideaAdoptionPlan(s,'caesar','diplomatic-accommodation',0),blocked=ideaAdoptionPlan(s,'caesar','diplomatic-accommodation',1);
  assert.equal(replacement.ok,true);assert.equal(replacement.cost,10);assert.equal(replacement.months,3);assert.equal(replacement.stabilityLoss,2);
  assert.equal(blocked.reason,'conflict');assert.equal(blocked.stabilityLoss,0);
  for(const [language,expected] of [['en',/Compare with slot 1: Hardline Diplomacy/],['zh',/与栏位 1: 强硬外交/]]){
    const html=ideasPanel(s,language),card=html.match(/<article id="tech-diplomatic-accommodation"[\s\S]*?<\/article>/)?.[0];
    assert.ok(card);assert.match(card,expected);assert.match(card,language==='zh'?/更换 1 · 10¤ \/ 3月 · 稳定度 −2/:/Replace 1 · 10¤ \/ 3m · stability −2/);
    assert.doesNotMatch(card.match(/<button[^>]*data-adopt-idea="diplomatic-accommodation" data-slot="0"[^>]*>/)?.[0]||'',/\bdisabled\b/);
    assert.match(card.match(/<button[^>]*data-adopt-idea="diplomatic-accommodation" data-slot="1"[^>]*>/)?.[0]||'',/\bdisabled\b/);
  }
  assert.equal(adoptIdea(s,'caesar','diplomatic-accommodation',1).reason,'conflict');
  assert.equal(ideaCompatibility(s,'caesar','hardline-diplomacy',1).reason,'duplicate');
  assert.equal(adoptIdea(s,'caesar','hardline-diplomacy',1).reason,'duplicate');
  const stability=s.factions.caesar.stability;assert.equal(adoptIdea(s,'caesar','diplomatic-accommodation',0).ok,true);
  assert.equal(d.adoption.remaining,replacement.months);assert.equal(s.factions.caesar.stability,stability-replacement.stabilityLoss);
  months(s,3);
  assert.equal(d.slots.diplomacy[0],'diplomatic-accommodation');
  assert.equal(activeEffects(s,'caesar').diplomacy,5);
  assert.equal(activeEffects(s,'caesar').diplomacyPressure,undefined);
});

test('sanctuary protection helps only attended local rites and carries a monthly cost',()=>{
  const s=newGrandGame('caesar'),d=development(s,'caesar'),province=s.regions.find(r=>r.id==='egypt');
  province.owner='caesar';province.integration=30;s.month=3;
  assert.equal(faithSatisfaction(s,province),-1);
  const before=nationalBudget(s,'caesar').ideaUpkeep;
  d.slots.culture[0]='sanctuary-protection';
  assert.equal(faithSatisfaction(s,province),0);
  assert.equal(nationalBudget(s,'caesar').ideaUpkeep,before+2);
  province.priesthood.influence=20;assert.equal(faithSatisfaction(s,province),-1);
  province.priesthood.influence=40;s.religion.caesar.policy='local-rites';assert.equal(faithSatisfaction(s,province),2);
  const aligned=s.regions.find(r=>r.id==='roma');aligned.owner='caesar';assert.equal(faithSatisfaction(s,aligned),0);
  const idea=IDEAS.find(x=>x.id==='sanctuary-protection');assert.match(idea.source.url,/verres24_3/);
  for(const [lang,label] of [['en','Provincial rites support'],['zh','地方祭仪支持']])assert.match(developmentPanel(s,lang,'idea'),new RegExp(label));
});

test('ancestral rites patronage has a real provincial tradeoff, upkeep, and a preserved save',()=>{
 const idea=IDEAS.find(x=>x.id==='ancestral-rites');
 assert.match(idea.source.url,/univ-grenoble-alpes/);
 assert.match(idea.context[0],/proposes/);
 const s=newGrandGame('caesar'),d=development(s,'caesar');s.wars=[];
 const home=s.regions.find(r=>r.id==='roma'),foreign=s.regions.find(r=>r.id==='egypt');
 home.owner='caesar';foreign.owner='caesar';foreign.integration=30;s.month=3;
 assert.equal(faithSatisfaction(s,home),0);
 assert.equal(faithSatisfaction(s,foreign),-1);
 const before=nationalBudget(s,'caesar').ideaUpkeep;
 d.slots.culture[0]=idea.id;
 assert.equal(faithSatisfaction(s,home),1);
 assert.equal(faithSatisfaction(s,foreign),-2);
 assert.equal(nationalBudget(s,'caesar').ideaUpkeep,before+3);
 foreign.priesthood.influence=20;
 assert.equal(faithSatisfaction(s,foreign),-1);
 foreign.priesthood.influence=40;
 assert.equal(ideaCompatibility(s,'caesar','cultural-accommodation',0).ok,true);
 d.slots.culture.push(null);
 assert.equal(ideaCompatibility(s,'caesar','cultural-accommodation',1).reason,'conflict');
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(faithSatisfaction(loaded,loaded.regions.find(r=>r.id==='roma')),1);
 assert.equal(faithSatisfaction(loaded,loaded.regions.find(r=>r.id==='egypt')),-2);
 const egypt=newGrandGame('egypt');egypt.month=3;
 const egyptHome=egypt.regions.find(r=>r.id==='egypt');
 assert.equal(faithSatisfaction(egypt,egyptHome),0);
 development(egypt,'egypt').slots.culture[0]=idea.id;
 assert.equal(faithSatisfaction(egypt,egyptHome),1);
 const control=newGrandGame('caesar');control.wars=[];control.month=2;
 for(const id of ['roma','egypt']){const r=control.regions.find(x=>x.id===id);r.owner='caesar';r.civicSatisfaction=50;r.loyalty=50}
 const adopted=upgradeSave(JSON.parse(JSON.stringify(control)));
 development(adopted,'caesar').slots.culture[0]=idea.id;
 tick(control);tick(adopted);
 for(const [id,delta] of [['roma',1],['egypt',-1]])assert.equal(adopted.regions.find(r=>r.id===id).civicSatisfaction-control.regions.find(r=>r.id===id).civicSatisfaction,delta,id);
 for(const [lang,label] of [['en','Other rites satisfaction / quarter −1'],['zh','异地祭仪满意度 / 季 −1']])assert.match(developmentPanel(s,lang,'idea'),new RegExp(label));
});
test('civic exercise trains recruits only in integrated towns and charges upkeep',()=>{
 const idea=IDEAS.find(x=>x.id==='civic-exercise');
 assert.match(idea.source.url,/gutenberg.org/);assert.match(idea.context[0],/criticizes excessive Spartan severity/);
 const base=newGrandGame('egypt'),inactive=upgradeSave(JSON.parse(JSON.stringify(base))),active=upgradeSave(JSON.parse(JSON.stringify(base)));
 const local=active.regions.find(r=>r.id==='egypt');
 development(active,'egypt').slots.culture[0]=idea.id;
 assert.equal(nationalBudget(active,'egypt').ideaUpkeep,nationalBudget(inactive,'egypt').ideaUpkeep+3);
 assert.equal(recruit(inactive,'egypt'),true);assert.equal(recruit(active,'egypt'),true);
 assert.equal(active.armies.at(-1).morale,inactive.armies.at(-1).morale,'low integration should not grant the morale bonus');
 const integrated=upgradeSave(JSON.parse(JSON.stringify(base)));
 development(integrated,'egypt').slots.culture[0]=idea.id;
 integrated.regions.find(r=>r.id==='egypt').integration=65;
 assert.equal(recruit(integrated,'egypt'),true);
 assert.equal(integrated.armies.at(-1).morale,inactive.armies.at(-1).morale+4);
  const rural=upgradeSave(JSON.parse(JSON.stringify(base)));
  development(rural,'egypt').slots.culture[0]=idea.id;
  rural.regions.find(r=>r.id==='t112').integration=80;
  assert.equal(recruit(rural,'t112'),true);
  assert.equal(rural.armies.at(-1).morale,58,'a highly integrated rural territory is not a civic training town');
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(integrated))).armies.at(-1).morale,integrated.armies.at(-1).morale);
 for(const [lang,label] of [['en','Recruit morale in urban territory with integration ≥65'],['zh','融合度≥65的城市新兵士气']])assert.ok(developmentPanel(active,lang,'idea').includes(label));
});

test('restrictive estate labor trades rural food for unrest and slower distressed migration',()=>{
 const idea=IDEAS.find(x=>x.id==='estate-labor-control');
 assert.deepEqual(idea.prerequisites,['estate-organization']);
 assert.match(idea.source.url,/De_Agricultura\/A%2A.html/);
 assert.match(idea.context[0],/not the late Roman bound colonate/);
 for(const [lang,label] of [['en','Restrictive Estate Labor'],['zh','庄园劳役约束']]){
  const html=developmentPanel(newGrandGame('egypt'),lang,'idea');
  assert.ok(html.includes(label));
  assert.ok(html.includes(lang==='en'?'distressed outmigration halved':'不满人口迁出减半'));
 }
 const researching=newGrandGame('egypt');researching.wars=[];researching.factions.egypt.treasury=500;
 assert.equal(researchInnovation(researching,'egypt','idea',idea.id).reason,'prerequisite');
 development(researching,'egypt').knownIdeas.push('estate-organization');
 assert.equal(researchInnovation(researching,'egypt','idea',idea.id).ok,true);
 assert.equal(activeEffects(researching,'egypt').estateLabor,undefined);
 months(researching,4);
 assert.ok(development(researching,'egypt').knownIdeas.includes(idea.id));
 assert.equal(adoptIdea(researching,'egypt',idea.id,0).ok,true);
 assert.equal(activeEffects(researching,'egypt').estateLabor,undefined);
 months(researching,2);
 assert.equal(activeEffects(researching,'egypt').estateLabor,1);
 const base=newGrandGame('egypt');base.wars=[];base.month=2;
 const control=upgradeSave(JSON.parse(JSON.stringify(base))),active=upgradeSave(JSON.parse(JSON.stringify(base)));
 development(active,'egypt').slots.economy[0]=idea.id;
 const budget0=nationalBudget(control,'egypt'),budget1=nationalBudget(active,'egypt');
 assert.equal(budget1.estateFood,2);
 assert.equal(budget1.foodNet,budget0.foodNet+2);
 assert.equal(budget1.ideaUpkeep,budget0.ideaUpkeep+1);
 tick(control);tick(active);
 for(const id of ['t111','t112']){
  const a=active.regions.find(r=>r.id===id),b=control.regions.find(r=>r.id===id);
  assert.equal(a.civicSatisfaction,b.civicSatisfaction-1,id);
  assert.equal(a.loyalty,b.loyalty-1,id);
 }
 assert.equal(active.regions.find(r=>r.id==='egypt').civicSatisfaction,control.regions.find(r=>r.id==='egypt').civicSatisfaction);
 const fleeing=upgradeSave(JSON.parse(JSON.stringify(base))),free=upgradeSave(JSON.parse(JSON.stringify(base)));
 development(fleeing,'egypt').slots.economy[0]=idea.id;
 for(const state of [fleeing,free]){
  const from=state.regions.find(r=>r.id==='t111'),to=state.regions.find(r=>r.id==='t112');
  from.population=100000;from.civicSatisfaction=20;to.civicSatisfaction=80;
 }
 advanceDemography(fleeing);advanceDemography(free);
 assert.equal(fleeing.regions.find(r=>r.id==='t111').population,99925);
 assert.equal(free.regions.find(r=>r.id==='t111').population,99850);
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(fleeing))).development.egypt.slots.economy[0],idea.id);
});

test('negotiated crop shares trade state grain for rural consent and greater mobility',()=>{
 const idea=IDEAS.find(x=>x.id==='negotiated-crop-shares');
 assert.deepEqual(idea.prerequisites,['estate-organization']);
 assert.match(idea.source.url,/De_Agricultura\/I%2A.html/);
 assert.match(idea.context[0],/not proof of universal tenant freedom/);
 assert.ok(idea.conflicts.includes('estate-labor-control'));
 for(const [lang,name,food] of [['en','Share Tenancy Arrangements','State-available food'],['zh','分成佃作安排','国库可用粮食']]){
  const html=developmentPanel(newGrandGame('egypt'),lang,'idea');
  assert.ok(html.includes(name)&&html.includes(food));
 }
 const researching=newGrandGame('egypt');researching.wars=[];researching.factions.egypt.treasury=500;
 assert.equal(researchInnovation(researching,'egypt','idea',idea.id).reason,'prerequisite');
 const d=development(researching,'egypt');d.knownIdeas.push('estate-organization');
 assert.equal(researchInnovation(researching,'egypt','idea',idea.id).ok,true);
 assert.equal(activeEffects(researching,'egypt').tenantShares,undefined);
 months(researching,3);
 assert.ok(d.knownIdeas.includes(idea.id));
 d.knownIdeas.push('estate-labor-control');d.slots.economy[0]='estate-labor-control';
 assert.equal(ideaCompatibility(researching,'egypt',idea.id,0).ok,true,'replacing the conflict in its own slot is legal');
 d.slots.economy.push('estate-labor-control');
 assert.equal(ideaCompatibility(researching,'egypt',idea.id,0).reason,'conflict','another active slot still blocks the conflict');
 d.slots.economy.pop();
 assert.equal(adoptIdea(researching,'egypt',idea.id,0).ok,true);
 assert.equal(activeEffects(researching,'egypt').tenantShares,undefined);
 months(researching,3);
 assert.equal(activeEffects(researching,'egypt').tenantShares,1);
 const base=newGrandGame('egypt');base.wars=[];base.month=2;
 const control=upgradeSave(JSON.parse(JSON.stringify(base))),active=upgradeSave(JSON.parse(JSON.stringify(base)));
 development(active,'egypt').slots.economy[0]=idea.id;
 const b0=nationalBudget(control,'egypt'),b1=nationalBudget(active,'egypt');
 assert.equal(b1.tenantFood,2);
 assert.equal(b1.foodProduction,b0.foodProduction,'tenant shares reduce public stores, not gross harvest');
 assert.equal(b1.foodNet,b0.foodNet-2);
 assert.equal(b1.ideaUpkeep,b0.ideaUpkeep+1);
 assert.match(budgetHtml(active,'en'),/Tenant crop shares/);
 assert.match(budgetHtml(active,'zh'),/佃作分成粮食/);
 tick(control);tick(active);
 for(const id of ['t111','t112']){
  const a=active.regions.find(r=>r.id===id),b=control.regions.find(r=>r.id===id);
  assert.equal(a.civicSatisfaction,b.civicSatisfaction+1,id);
  assert.equal(a.loyalty,b.loyalty+1,id);
 }
 const moving=upgradeSave(JSON.parse(JSON.stringify(base))),ordinary=upgradeSave(JSON.parse(JSON.stringify(base)));
 development(moving,'egypt').slots.economy[0]=idea.id;
 for(const state of [moving,ordinary]){const from=state.regions.find(r=>r.id==='t111'),to=state.regions.find(r=>r.id==='t112');from.population=100000;from.civicSatisfaction=20;to.civicSatisfaction=80}
 advanceDemography(moving);advanceDemography(ordinary);
 assert.equal(moving.regions.find(r=>r.id==='t111').population,99800);
 assert.equal(ordinary.regions.find(r=>r.id==='t111').population,99850);
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(moving))).development.egypt.slots.economy[0],idea.id);
});

test('material knowledge permits delayed construction with terrain, deposits, materials and upkeep',()=>{
  const s=newGame('egypt');const d=development(s,'egypt');s.factions.egypt.treasury=500;d.knownMaterial.push('roadmaking');
  assert.equal(constructionCheck(s,'egypt','egypt','road').ok,true);
  assert.equal(startConstruction(s,'egypt','egypt','road').ok,true);
  assert.ok(!s.regions.find(r=>r.id==='egypt').buildings.includes('road'));
  months(s,3);assert.ok(s.regions.find(r=>r.id==='egypt').buildings.includes('road'));
  assert.equal(constructionCheck(s,'egypt','egypt','barracks').reason,'technology');
  const s2=newGame();development(s2,'caesar').knownMaterial.push('metal-extraction');
  assert.equal(constructionCheck(s2,'caesar','narbo','mine').reason,'deposit');
  assert.equal(constructionCheck(s2,'caesar','gaul','mine').reason,'terrain');
  const old=s.factions.egypt.treasury;assert.equal(researchInnovation(s,'egypt','material','barracks-design').ok,true);assert.ok(s.factions.egypt.treasury<old);
  months(s,3);assert.ok(d.knownMaterial.includes('barracks-design'));
});

test('knowledge trade transfers knowledge after travel, never constructs or adopts it',()=>{
  const s=newGame('caesar');s.wars=[];s.relations['caesar:senate']=50;s.factions.caesar.treasury=200;s.relations['caesar:egypt']=20;
  const d=development(s,'caesar');assert.ok(!d.knownMaterial.includes('water-control'));
  const result=knowledgeTrade(s,'caesar','egypt','material','water-control');assert.equal(result.ok,true);
  assert.ok(!d.knownMaterial.includes('water-control'));
  months(s,2);assert.ok(d.knownMaterial.includes('water-control'));
  assert.equal(s.regions.find(r=>r.id==='cisalpine').buildings.length,0);
  development(s,'egypt').knownIdeas.push('cultural-accommodation');
  assert.equal(knowledgeTrade(s,'caesar','egypt','idea','cultural-accommodation').ok,true);
  months(s,2);assert.ok(d.knownIdeas.includes('cultural-accommodation'));
  assert.equal(activeEffects(s,'caesar').loyalty,undefined);
  assert.equal(adoptIdea(s,'caesar','cultural-accommodation',0).ok,true);
  months(s,2);assert.equal(activeEffects(s,'caesar').loyalty,undefined);
  months(s,2);assert.equal(activeEffects(s,'caesar').loyalty,2);
  s.relations['caesar:egypt']=-20;
  assert.equal(knowledgeTrade(s,'caesar','egypt','material','water-control').ok,false);
});

test('old saves gain development without losing territory, and AI participates through 36 months',()=>{
  const s=newGame('numidia');const owner=s.regions.find(r=>r.id==='roma').owner;delete s.development;
  const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
  assert.equal(loaded.regions.find(r=>r.id==='roma').owner,owner);
  assert.equal(development(loaded,'egypt').slots.culture.length,1);
  for(const id of Object.keys(loaded.factions))loaded.factions[id].treasury+=300;
  months(loaded,36);
  assert.ok(loaded.development.senate.knownMaterial.length>2||loaded.development.senate.knownIdeas.length>0);
  assert.ok(loaded.development.egypt.knownMaterial.length>2||loaded.development.egypt.knownIdeas.length>0);
  assert.doesNotThrow(()=>JSON.stringify(loaded));
});

test('distinct starting civilizations advance until 36 months or a terminal defeat',()=>{
  for(const player of ['caesar','senate','egypt','numidia']){
    const s=newGame(player);months(s,36);
    assert.ok(Number.isFinite(s.factions[player].treasury),player);
    assert.ok(s.year===-46&&s.month===1||s.terminalResult==='defeat',player);
    assert.ok(s.development[player].knownMaterial.length>=2,player);
    assert.equal(Object.keys(s.development[player].slots).length,5,player);
    assert.doesNotThrow(()=>upgradeSave(JSON.parse(JSON.stringify(s))),player);
  }
});

test('expanded material catalog enforces source geography and real engineering prerequisites',()=>{
  const s=newGame('egypt'),d=development(s,'egypt');s.factions.egypt.treasury=500;
  assert.equal(researchInnovation(s,'egypt','material','shipyard-craft').reason,'prerequisite');
  d.knownMaterial.push('port-facilities','shipyard-craft');
  assert.equal(constructionCheck(s,'egypt','egypt','shipyard').reason,'port');
  assert.equal(constructionCheck(s,'egypt','egypt','port').ok,true);
  assert.equal(startConstruction(s,'egypt','egypt','port').ok,true);months(s,5);
  assert.ok(s.regions.find(r=>r.id==='egypt').buildings.includes('port'));
  assert.equal(purchaseMaterials(s,'egypt','stone').ok,true);
  assert.equal(constructionCheck(s,'egypt','egypt','shipyard').ok,true);
  assert.equal(constructionCheck(s,'egypt','egypt','dam').reason,'technology');
});

test('waterworks and libraries change real food losses and research spending',()=>{
  const base=newGame('senate');base.year=-47;base.month=6;base.factions.senate.food=200;
  const dry=structuredClone(base),protectedState=structuredClone(base);
  protectedState.regions.find(r=>r.id==='italiaN').buildings.push('dam');
  tick(dry);tick(protectedState);
  assert.ok(protectedState.factions.senate.food>dry.factions.senate.food);
  const plain=newGame('egypt'),learned=newGame('egypt');
  learned.regions.find(r=>r.id==='egypt').buildings.push('library');
  const beforePlain=plain.factions.egypt.treasury,beforeLearned=learned.factions.egypt.treasury;
  assert.equal(researchInnovation(plain,'egypt','idea','rhetorical-education').ok,true);
  assert.equal(researchInnovation(learned,'egypt','idea','rhetorical-education').ok,true);
  assert.equal(beforeLearned-learned.factions.egypt.treasury,(beforePlain-plain.factions.egypt.treasury)-3);
});
test('road and bridge construction shortens relevant grand-campaign travel',()=>{
 const edge={sea:false,distance:350,river:true},destination={terrain:'plain',buildings:[]},origin={buildings:[]};
 const baseline=edgeMonths(edge,destination,origin);origin.buildings.push('road');assert.equal(edgeMonths(edge,destination,origin),baseline-1);
 origin.buildings.push('bridge');assert.equal(edgeMonths(edge,destination,origin),baseline-2);
});
test('opposed five-idea development paths survive 36 months in the grand campaign',()=>{
 const plans={
  senate:['legion-training','senatorial-consultation','diplomatic-accommodation','public-works','rhetorical-education'],
  egypt:['frontier-defense','central-administration','hardline-diplomacy','tax-farming','cultural-accommodation']
 };
 for(const [player,plan] of Object.entries(plans)){
  const s=newGrandGame(player),d=development(s,player);
  if(player==='senate')assert.equal(startConstruction(s,player,'roma','road').ok,true);
  for(let month=0;month<36;month++){
   if(player==='senate'&&s.factions[player].treasury<55)setTax(s,player,'high');
   else if(player==='senate'&&s.factions[player].treasury>130)setTax(s,player,'normal');
   const next=plan.find(id=>!d.knownIdeas.includes(id));
   if(next&&!d.research){const result=researchInnovation(s,player,'idea',next);assert.ok(result.ok||result.reason==='treasury',`${player}: research ${next}: ${result.reason}`)}
   const adopt=plan.find(id=>d.knownIdeas.includes(id)&&!Object.values(d.slots).flat().includes(id));
   if(adopt&&!d.adoption){const result=adoptIdea(s,player,adopt,0);assert.ok(result.ok||result.reason==='treasury',`${player}: adopt ${adopt}: ${result.reason}`)}
   tick(s);
   assert.equal(s.achievementState?.finalized,false,`${player}: month ${month+1}`);
  }
  assert.equal(s.year,-46);assert.equal(s.month,1);
  assert.deepEqual(Object.values(d.slots).flat(),plan);
  assert.ok(Number.isFinite(s.factions[player].treasury));
  assert.doesNotThrow(()=>upgradeSave(JSON.parse(JSON.stringify(s))));
  if(player==='senate'){
   assert.ok(s.regions.find(r=>r.id==='roma').buildings.includes('road'));
   assert.equal(activeEffects(s,player).researchDiscount,4);
   assert.equal(activeEffects(s,player).combatAttack,.06);
   assert.ok(activeEffects(s,player).upkeep>0);
  }else{
   assert.equal(activeEffects(s,player).diplomacyPressure,12);
   assert.equal(activeEffects(s,player).combatAttack,-.02);
   assert.equal(activeEffects(s,player).relations,-2);
  }
 }
});
test('wealthy AI states research and adopt all five idea categories over a long campaign',()=>{
 for(const owner of ['senate','egypt']){
  const s=newGrandGame(owner==='senate'?'egypt':'senate');
  s.factions[owner].treasury=10000;
  for(let month=0;month<36;month++)tick(s);
  const d=development(s,owner);
  assert.deepEqual(Object.keys(d.slots).filter(category=>d.slots[category].some(Boolean)),IDEA_CATEGORIES.map(category=>category.id),owner);
  assert.ok(d.knownIdeas.every(id=>IDEAS.find(idea=>idea.id===id)?.prerequisites.every(pre=>d.knownIdeas.includes(pre))),owner);
  assert.ok(!d.knownIdeas.includes('senatorial-consultation')||owner==='senate',owner);
  assert.doesNotThrow(()=>upgradeSave(JSON.parse(JSON.stringify(s))));
 }
});
test('AI skips a blocked material prerequisite and researches a feasible alternative',()=>{
 const s=newGame('senate'),d=development(s,'egypt');
 s.month=8;s.factions.egypt.treasury=500;
 d.knownMaterial=MATERIALS.map(item=>item.id).filter(id=>!['quarrying','metal-extraction','craft-workshops'].includes(id));
 aiTurn(s,'egypt');
 assert.deepEqual([d.research?.branch,d.research?.id],['material','quarrying']);
 d.research=null;d.knownMaterial.push('quarrying');s.month=9;
 aiTurn(s,'egypt');
 assert.equal(d.research,null);
});
test('AI adopts a compatible known policy when an earlier one conflicts',()=>{
 const s=newGame('senate'),d=development(s,'egypt');
 s.factions.egypt.treasury=500;
 d.knownIdeas.push('hardline-diplomacy','diplomatic-accommodation','public-works');
 d.slots.diplomacy=['diplomatic-accommodation',null];
 aiTurn(s,'egypt');
 assert.equal(d.adoption?.ideaId,'public-works');
 assert.equal(d.adoption?.category,'economy');
});
test('AI researches a second idea, pays for institutional capacity, then adopts it after a save',()=>{
 const s=newGrandGame('egypt'),d=development(s,'senate');
 s.factions.senate.treasury=1000;s.month=4;
 for(const [category,id] of Object.entries({military:'legion-training',government:'senatorial-consultation',diplomacy:'diplomatic-accommodation',economy:'public-works',culture:'rhetorical-education'})){
  d.knownIdeas.push(id);d.slots[category][0]=id;
 }
 aiTurn(s,'senate');
 assert.deepEqual([d.research?.branch,d.research?.id],['idea','public-legal-reference']);
 months(s,3);
 assert.ok(d.knownIdeas.includes('public-legal-reference'));
 assert.equal(d.expansion?.category,'government');
 assert.equal(d.slots.government.length,1);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s))),reloaded=development(saved,'senate');
 assert.equal(reloaded.expansion?.category,'government');
 months(saved,11);
 assert.deepEqual(reloaded.slots.government,['senatorial-consultation','public-legal-reference']);
 assert.ok(saved.factions.senate.treasury<1000-23-35);
});
test('AI will not study a second policy before its administration or education exists',()=>{
 const s=newGame('senate'),d=development(s,'egypt');
 s.month=4;s.factions.egypt.treasury=500;
 for(const [category,id] of Object.entries({military:'frontier-defense',government:'public-legal-reference',diplomacy:'diplomatic-accommodation',economy:'tax-farming',culture:'cultural-accommodation'})){
  d.knownIdeas.push(id);d.slots[category][0]=id;
 }
 aiTurn(s,'egypt');
 assert.notEqual(d.research?.branch,'idea');
 assert.equal(d.expansion,null);
});
test('AI reserves expansion money before researching another policy for a full category',()=>{
 const s=newGame('egypt'),d=development(s,'senate');
 s.month=4;s.factions.senate.treasury=130;
 for(const [category,id] of Object.entries({military:'legion-training',government:'senatorial-consultation',diplomacy:'diplomatic-accommodation',economy:'public-works',culture:'rhetorical-education'})){
  d.knownIdeas.push(id);d.slots[category][0]=id;
 }
 aiTurn(s,'senate');
 assert.notEqual(d.research?.branch,'idea');
});
test('idea capacity requires institutions as well as researched ideas and treasury',()=>{
 const s=newGame('senate'),d=development(s,'senate');s.factions.senate.treasury=500;
 d.knownIdeas.push('legion-training','frontier-defense','reserve-mobilization');
 assert.equal(expandIdeaSlot(s,'senate','military').reason,'institution');
 s.regions.find(r=>r.owner==='senate').buildings.push('administration');
 assert.equal(expandIdeaSlot(s,'senate','military').ok,true);months(s,6);
 assert.equal(expandIdeaSlot(s,'senate','military').reason,'institution');
 s.regions.find(r=>r.owner==='senate').buildings.push('library');s.factions.senate.stability=75;
 assert.equal(expandIdeaSlot(s,'senate','military').ok,true);
});
test('states can exchange, sell and host scholars through priced delayed knowledge diplomacy',()=>{
 const s=newGame('caesar');s.relations['caesar:egypt']=25;s.factions.caesar.treasury=300;s.factions.egypt.treasury=300;
 const caesar=development(s,'caesar'),egypt=development(s,'egypt');
 assert.equal(exchangeKnowledge(s,'caesar','egypt','material','roadmaking','material','water-control').ok,true);
 assert.ok(!caesar.knownMaterial.includes('water-control'));assert.ok(!egypt.knownMaterial.includes('roadmaking'));
 months(s,3);assert.ok(caesar.knownMaterial.includes('water-control'));assert.ok(egypt.knownMaterial.includes('roadmaking'));
 caesar.knownIdeas.push('legion-training');s.relations['caesar:egypt']=30;const treasury=s.factions.caesar.treasury;
 assert.equal(sellKnowledge(s,'caesar','egypt','idea','legion-training').ok,true);assert.ok(s.factions.caesar.treasury>treasury);
 months(s,2);assert.ok(egypt.knownIdeas.includes('legion-training'));
 const visit=newGame('caesar');visit.wars=[];visit.relations['caesar:egypt']=25;visit.factions.caesar.treasury=300;
 const invited=inviteForeignScholars(visit,'caesar','egypt');assert.equal(invited.ok,true);assert.equal(invited.id,'water-control');assert.ok(invited.travel>=2);
 const pending=upgradeSave(JSON.parse(JSON.stringify(visit))),base=newGame('caesar');base.factions.caesar.treasury=300;
 const baseBefore=base.factions.caesar.treasury;assert.equal(researchInnovation(base,'caesar','material','water-control').ok,true);
 const pendingBefore=pending.factions.caesar.treasury;assert.equal(researchInnovation(pending,'caesar','material','water-control').ok,true);
 assert.equal(pendingBefore-pending.factions.caesar.treasury,baseBefore-base.factions.caesar.treasury,'traveling scholars cannot lower costs');
 assert.equal(pending.development.caesar.research.remaining,base.development.caesar.research.remaining);
 const arrived=upgradeSave(JSON.parse(JSON.stringify(visit)));months(arrived,invited.travel);
 assert.equal(arrived.development.caesar.visitingScholars[0].travelRemaining,0);
 const before=arrived.factions.caesar.treasury;assert.equal(researchInnovation(arrived,'caesar','material','water-control').ok,true);
 assert.equal(before-arrived.factions.caesar.treasury,baseBefore-base.factions.caesar.treasury-3);
 assert.equal(arrived.development.caesar.research.remaining,Math.max(1,base.development.caesar.research.remaining-1));
 const other=upgradeSave(JSON.parse(JSON.stringify(arrived)));other.development.caesar.research=null;
 const unrelatedBefore=other.factions.caesar.treasury;assert.equal(researchInnovation(other,'caesar','material','quarrying').ok,true);
 assert.equal(unrelatedBefore-other.factions.caesar.treasury,20,'Egyptian water-control visitors cannot discount quarrying');
 arrived.wars.push(['caesar','egypt']);months(arrived,1);assert.equal(arrived.development.caesar.visitingScholars.length,0);
 const old=upgradeSave(JSON.parse(JSON.stringify(visit)));old.development.caesar.visitingScholars=[{partner:'egypt',remaining:2}];
 const oldBefore=old.factions.caesar.treasury;assert.equal(researchInnovation(old,'caesar','material','quarrying').ok,true);
 assert.equal(oldBefore-old.factions.caesar.treasury,17,'legacy visiting scholars retain their old broad bonus until expiry');
});
test('AI knowledge buyers keep a levy reserve while human buyers may choose to spend it',()=>{
 const ai=newGame('caesar');ai.relations['caesar:egypt']=30;
 ai.development.caesar.knownIdeas.push('legion-training');
 ai.factions.egypt.treasury=45;
 assert.equal(sellKnowledge(ai,'caesar','egypt','idea','legion-training').reason,'buyer treasury');
 assert.equal(ai.factions.egypt.treasury,45);
 ai.factions.egypt.treasury=46;
 assert.equal(sellKnowledge(ai,'caesar','egypt','idea','legion-training').ok,true);
 assert.equal(ai.factions.egypt.treasury,24);
 const human=newGame('egypt');human.relations['caesar:egypt']=30;
 human.development.caesar.knownIdeas.push('legion-training');human.factions.egypt.treasury=22;
 assert.equal(sellKnowledge(human,'caesar','egypt','idea','legion-training').ok,true);
 assert.equal(human.factions.egypt.treasury,0);
 const request=newGame('egypt');request.relations['caesar:egypt']=30;
 request.factions.caesar.treasury=45;
 assert.equal(proposeKnowledgePurchase(request,'caesar','egypt','material','water-control').reason,'buyer treasury');
 request.factions.caesar.treasury=46;
 assert.equal(proposeKnowledgePurchase(request,'caesar','egypt','material','water-control').ok,true);
});
test('a foreign idea studied with visiting expertise still needs cultural adaptation',()=>{
 const s=newGame('caesar');s.wars=[];s.relations['caesar:egypt']=30;s.factions.caesar.treasury=500;
 s.development.caesar.knownMaterial.push('water-control');s.development.egypt.knownIdeas.push('cultural-accommodation');
 const offer=inviteForeignScholars(s,'caesar','egypt');assert.equal(offer.ok,true);assert.equal(offer.branch,'idea');assert.equal(offer.id,'cultural-accommodation');
 months(s,offer.travel);assert.equal(researchInnovation(s,'caesar','idea',offer.id).ok,true);
 const researched=upgradeSave(JSON.parse(JSON.stringify(s))),duration=researched.development.caesar.research.remaining;
 months(researched,duration);assert.equal(researched.development.caesar.foreignOrigins[offer.id],'egypt');
 assert.equal(adoptIdea(researched,'caesar',offer.id).ok,true);assert.equal(researched.development.caesar.adoption.remaining,4);
});
test('AI can sell knowledge to another AI without charging the player or disclosing guarded military methods',()=>{
 const s=newGame('senate');s.month=9;s.relations['caesar:egypt']=25;
 const seller=development(s,'caesar'),buyer=development(s,'egypt');
 seller.knownMaterial.push('stone-fortification');
 assert.equal(sellKnowledge(s,'caesar','egypt','material','stone-fortification').reason,'strategic');
 assert.equal(exchangeKnowledge(s,'caesar','egypt','material','stone-fortification','material','water-control').reason,'strategic');
 const egyptTreasury=s.factions.egypt.treasury,playerTreasury=s.factions.senate.treasury;
 aiTurn(s,'caesar');
 assert.ok(buyer.trade.some(t=>t.method==='sale'&&t.seller==='caesar'&&t.id==='roadmaking'));
 assert.ok(s.factions.egypt.treasury<egyptTreasury);
 assert.equal(s.factions.senate.treasury,playerTreasury);
 assert.ok(!development(s,'senate').trade.some(t=>t.method==='sale'));
});
test('foreign AI offers wait for player consent, survive saves and expire without a charge',()=>{
 const s=newGame('senate');s.month=9;s.relations['egypt:senate']=20;
 const initial=s.factions.senate.treasury;
 aiTurn(s,'egypt');
 const offer=development(s,'senate').offers.find(o=>o.seller==='egypt'&&o.id==='water-control');
 assert.ok(offer);assert.equal(s.factions.senate.treasury,initial);
 assert.match(developmentPanel(s,'en','material'),/Accept/);
 assert.match(developmentPanel(s,'zh','material'),/接受/);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(development(loaded,'senate').offers.length,1);
  const older=structuredClone(s);delete older.development.senate.offers;
  assert.deepEqual(development(upgradeSave(older),'senate').offers,[]);
 assert.equal(declineKnowledgeOffer(loaded,'senate','egypt','material','water-control').ok,true);
 assert.equal(loaded.factions.senate.treasury,initial);
 assert.equal(proposeKnowledgeSale(loaded,'egypt','senate','material','water-control').ok,true);
 const accepted=acceptKnowledgeOffer(loaded,'senate','egypt','material','water-control');
 assert.equal(accepted.ok,true);assert.equal(loaded.factions.senate.treasury,initial-accepted.price);
 assert.equal(acceptKnowledgeOffer(loaded,'senate','egypt','material','water-control').ok,false);
 assert.equal(development(loaded,'senate').offers.length,0);
 months(loaded,2);assert.ok(development(loaded,'senate').knownMaterial.includes('water-control'));
 const expiring=newGame('senate');expiring.relations['egypt:senate']=20;const control=structuredClone(expiring);
 assert.equal(proposeKnowledgeSale(expiring,'egypt','senate','material','water-control').ok,true);
 months(expiring,4);months(control,4);
 assert.equal(development(expiring,'senate').offers.length,0);
 assert.equal(acceptKnowledgeOffer(expiring,'senate','egypt','material','water-control').reason,'offer');
 assert.equal(expiring.factions.senate.treasury,control.factions.senate.treasury);
});
test('AI must request player technology instead of silently buying or exchanging it',()=>{
 const s=newGrandGame('egypt');s.month=12;s.factions.caesar.treasury=200;s.relations['caesar:egypt']=40;
 for(const [id,d] of Object.entries(s.development))if(id!=='egypt'&&id!=='caesar')d.knownMaterial=['roadmaking','grain-storage'];
 const playerCash=s.factions.egypt.treasury;
 aiTurn(s,'caesar');
 const request=development(s,'egypt').purchaseRequests.find(x=>x.buyer==='caesar'&&x.id==='water-control');
 assert.ok(request);assert.equal(s.factions.egypt.treasury,playerCash);assert.equal(development(s,'caesar').trade.length,0);
 assert.equal(knowledgeTrade(s,'caesar','egypt','material','water-control').reason,'consent');
 assert.equal(exchangeKnowledge(s,'caesar','egypt','idea','legion-training','idea','civic-education').reason,'consent');
 assert.equal(s.factions.egypt.treasury,playerCash);
 assert.match(developmentPanel(s,'en','material'),/requests your knowledge/);
 assert.match(developmentPanel(s,'zh','material'),/请求购买己方知识/);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(development(loaded,'egypt').purchaseRequests.length,1);
 assert.equal(declineKnowledgePurchase(loaded,'egypt','caesar','material','water-control').ok,true);
 assert.equal(loaded.factions.egypt.treasury,playerCash);
 assert.equal(proposeKnowledgePurchase(loaded,'caesar','egypt','material','water-control').ok,true);
 const beforeSale=loaded.factions.egypt.treasury, beforeBuyer=loaded.factions.caesar.treasury;
 const accepted=acceptKnowledgePurchase(loaded,'egypt','caesar','material','water-control');
 assert.equal(accepted.ok,true);assert.equal(loaded.factions.egypt.treasury,beforeSale+accepted.price);assert.equal(loaded.factions.caesar.treasury,beforeBuyer-accepted.price);
 assert.equal(acceptKnowledgePurchase(loaded,'egypt','caesar','material','water-control').reason,'request');
 months(loaded,2);assert.ok(development(loaded,'caesar').knownMaterial.includes('water-control'));
 const old=structuredClone(s);delete old.development.egypt.purchaseRequests;
 assert.deepEqual(development(upgradeSave(old),'egypt').purchaseRequests,[]);
 const expiring=newGrandGame('egypt');expiring.relations['caesar:egypt']=40;const control=structuredClone(expiring);
 assert.equal(proposeKnowledgePurchase(expiring,'caesar','egypt','material','water-control').ok,true);
 months(expiring,4);months(control,4);assert.equal(development(expiring,'egypt').purchaseRequests.length,0);
 assert.equal(expiring.factions.egypt.treasury,control.factions.egypt.treasury);
});
test('AI idea exchange proposal needs consent, survives saves and transfers both ideas once',()=>{
 const s=newGrandGame('egypt');s.year=-48;s.month=6;s.relations['caesar:egypt']=40;
 s.factions.caesar.treasury=50;s.factions.egypt.treasury=200;
 development(s,'caesar').knownIdeas.push('legion-training');development(s,'egypt').knownIdeas.push('civic-education');
 const beforePlayer=s.factions.egypt.treasury;
 aiTurn(s,'caesar');
 const proposal=development(s,'egypt').exchangeRequests.find(x=>x.partner==='caesar'&&x.offerId==='legion-training'&&x.wantId==='civic-education');
 assert.ok(proposal);assert.equal(s.factions.egypt.treasury,beforePlayer);
 assert.equal(development(s,'egypt').trade.length,0);
 assert.match(developmentPanel(s,'en','idea'),/Knowledge exchange proposals/);
 assert.match(developmentPanel(s,'zh','idea'),/知识交换提议/);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(development(loaded,'egypt').exchangeRequests.length,1);
 const args=['egypt','caesar','idea','legion-training','idea','civic-education'];
 assert.equal(declineKnowledgeExchange(loaded,...args).ok,true);
 assert.equal(loaded.factions.egypt.treasury,beforePlayer);
 assert.equal(proposeKnowledgeExchange(loaded,'caesar','egypt','idea','legion-training','idea','civic-education').ok,true);
 const beforeAcceptAI=loaded.factions.caesar.treasury,accepted=acceptKnowledgeExchange(loaded,...args);
 assert.equal(accepted.ok,true);assert.equal(loaded.factions.egypt.treasury,beforePlayer-8);assert.equal(loaded.factions.caesar.treasury,beforeAcceptAI-8);
 assert.equal(acceptKnowledgeExchange(loaded,...args).reason,'request');
 assert.ok(!development(loaded,'egypt').knownIdeas.includes('legion-training'));
 months(loaded,3);assert.ok(development(loaded,'egypt').knownIdeas.includes('legion-training'));assert.ok(development(loaded,'caesar').knownIdeas.includes('civic-education'));
 assert.ok(!development(loaded,'egypt').slots.military.includes('legion-training'));
 const old=structuredClone(s);delete old.development.egypt.exchangeRequests;
 assert.deepEqual(development(upgradeSave(old),'egypt').exchangeRequests,[]);
 const expiring=newGrandGame('egypt');expiring.relations['caesar:egypt']=40;expiring.factions.caesar.treasury=200;expiring.development.caesar.knownIdeas.push('legion-training');expiring.development.egypt.knownIdeas.push('civic-education');
 assert.equal(proposeKnowledgeExchange(expiring,'caesar','egypt','idea','legion-training','idea','civic-education').ok,true);
 months(expiring,4);assert.equal(development(expiring,'egypt').exchangeRequests.length,0);
 assert.equal(acceptKnowledgeExchange(expiring,...args).reason,'request');
 const hostile=newGrandGame('egypt');hostile.relations['caesar:egypt']=40;hostile.factions.caesar.treasury=100;hostile.development.caesar.knownIdeas.push('legion-training');hostile.development.egypt.knownIdeas.push('civic-education');
 assert.equal(proposeKnowledgeExchange(hostile,'caesar','egypt','idea','legion-training','idea','civic-education').ok,true);
 hostile.wars.push(['caesar','egypt']);assert.equal(acceptKnowledgeExchange(hostile,...args).reason,'war');
 assert.equal(hostile.development.egypt.trade.length,0);assert.equal(hostile.development.caesar.trade.length,0);
 months(hostile,1);assert.equal(development(hostile,'egypt').exchangeRequests.length,0);
});
test('knowledge-sharing agreement pays once, transfers both ways over time and ends on war',()=>{
 const s=newGrandGame('egypt');s.relations['caesar:egypt']=50;
 s.factions.egypt.treasury=300;s.factions.caesar.treasury=300;
 development(s,'caesar').knownMaterial.push('bridge-engineering');
 development(s,'caesar').knownIdeas.push('frontier-defense');development(s,'egypt').knownIdeas.push('civic-education');
 assert.equal(knowledgeAgreementCheck(s,'egypt','caesar').ok,true);
 assert.equal(negotiateKnowledgeAgreement(s,'egypt','caesar').ok,true);
 assert.equal(s.factions.egypt.treasury,280);assert.equal(s.factions.caesar.treasury,280);
 assert.equal(negotiateKnowledgeAgreement(s,'egypt','caesar').reason,'existing');
 assert.equal(s.knowledgeAgreements.length,1);
 assert.match(developmentPanel(s,'en','material'),/Agreement active/);
 assert.match(developmentPanel(s,'zh','material'),/协定生效中/);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 months(loaded,3);
 assert.ok(loaded.development.egypt.trade.some(t=>t.method==='agreement'&&t.id==='roadmaking'));
 assert.ok(loaded.development.caesar.trade.some(t=>t.method==='agreement'&&t.id==='water-control'));
 assert.ok(!loaded.development.egypt.knownMaterial.includes('roadmaking'));
 months(loaded,2);
 assert.ok(loaded.development.egypt.knownMaterial.includes('roadmaking'));
 assert.ok(loaded.development.caesar.knownMaterial.includes('water-control'));
 months(loaded,1);
 assert.ok(loaded.development.egypt.trade.some(t=>t.method==='agreement'&&t.id==='frontier-defense'));
 assert.ok(loaded.development.caesar.trade.some(t=>t.method==='agreement'&&t.id==='civic-education'));
 months(loaded,2);
 assert.ok(loaded.development.egypt.knownIdeas.includes('frontier-defense'));
 assert.ok(!loaded.development.egypt.slots.military.includes('frontier-defense'));
 const old=structuredClone(s);delete old.knowledgeAgreements;
 assert.deepEqual(upgradeSave(old).knowledgeAgreements,[]);
 const hostile=structuredClone(s);hostile.wars.push(['caesar','egypt']);months(hostile,1);
 assert.equal(hostile.knowledgeAgreements.length,0);
 const canceled=structuredClone(s);assert.equal(cancelKnowledgeAgreement(canceled,'egypt','caesar').ok,true);
 assert.equal(cancelKnowledgeAgreement(canceled,'egypt','caesar').reason,'agreement');
 assert.equal(canceled.factions.egypt.treasury,280);
});

test('AI knowledge-sharing proposals need consent, survive saves and charge only once',()=>{
 const s=newGrandGame('egypt');s.wars=[];s.relations['caesar:egypt']=50;
 s.factions.caesar.treasury=200;s.factions.egypt.treasury=200;
 const result=proposeKnowledgeAgreement(s,'caesar','egypt');
 assert.equal(result.ok,true);assert.equal(result.offerMonths,4);
 assert.equal(s.factions.caesar.treasury,200);assert.equal(s.factions.egypt.treasury,200);
 assert.equal(s.knowledgeAgreements.length,0);
 assert.deepEqual(development(s,'egypt').agreementRequests,[{partner:'caesar',sentYear:-49,sentMonth:1,remaining:4}]);
 assert.equal(proposeKnowledgeAgreement(s,'caesar','egypt').reason,'request');
 assert.equal(negotiateKnowledgeAgreement(s,'caesar','egypt').reason,'consent');
 for(const lang of ['en','zh']){
  const html=developmentPanel(s,lang,'material');
  assert.match(html,lang==='zh'?/知识共享协定提议/:/Proposed knowledge-sharing agreements/);
  assert.match(html,lang==='zh'?/前49年1月/:/1\/49 BCE/);
  assert.match(html,lang==='zh'?/双方各付20国库/:/each side pays 20 treasury/);
 }
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(loaded.development.egypt.agreementRequests.length,1);
 assert.equal(acceptKnowledgeAgreement(loaded,'egypt','caesar').ok,true);
 assert.equal(loaded.factions.egypt.treasury,180);assert.equal(loaded.factions.caesar.treasury,180);
 assert.equal(loaded.development.egypt.agreementRequests.length,0);
 assert.equal(loaded.knowledgeAgreements.length,1);
 assert.equal(acceptKnowledgeAgreement(loaded,'egypt','caesar').reason,'request');
 assert.equal(loaded.factions.egypt.treasury,180);assert.equal(loaded.factions.caesar.treasury,180);
 months(loaded,5);
 assert.ok(loaded.development.egypt.knownMaterial.includes('roadmaking'));
 assert.ok(loaded.development.caesar.knownMaterial.includes('water-control'));
 const declined=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(declineKnowledgeAgreement(declined,'egypt','caesar').ok,true);
 assert.equal(declineKnowledgeAgreement(declined,'egypt','caesar').reason,'request');
 assert.equal(declined.factions.egypt.treasury,200);assert.equal(declined.knowledgeAgreements.length,0);
 const hostile=upgradeSave(JSON.parse(JSON.stringify(s)));hostile.wars.push(['caesar','egypt']);months(hostile,1);
 assert.equal(hostile.development.egypt.agreementRequests.length,0);
 const expired=upgradeSave(JSON.parse(JSON.stringify(s))),withoutRequest=upgradeSave(JSON.parse(JSON.stringify(s)));
 withoutRequest.development.egypt.agreementRequests=[];
 months(expired,4);months(withoutRequest,4);
 assert.equal(expired.development.egypt.agreementRequests.length,0);
 assert.equal(expired.factions.egypt.treasury,withoutRequest.factions.egypt.treasury);
 const deteriorated=upgradeSave(JSON.parse(JSON.stringify(s)));deteriorated.relations['caesar:egypt']=19;
 months(deteriorated,1);assert.equal(deteriorated.development.egypt.agreementRequests.length,0);
 const old=structuredClone(s);delete old.development.egypt.agreementRequests;
 assert.deepEqual(upgradeSave(old).development.egypt.agreementRequests,[]);
});

test('AI can initiate mutual agreements with a player or another AI',()=>{
 const seasonal=newGrandGame('egypt');seasonal.wars=[];seasonal.year=-48;seasonal.month=2;
 seasonal.relations['caesar:egypt']=55;seasonal.factions.caesar.treasury=300;seasonal.factions.egypt.treasury=300;
 tick(seasonal);
 assert.deepEqual(seasonal.development.egypt.agreementRequests.map(x=>[x.partner,x.sentYear,x.sentMonth]),[['caesar',-48,3]]);
 assert.equal(acceptKnowledgeAgreement(seasonal,'egypt','caesar').ok,true);
 months(seasonal,5);
 assert.ok(seasonal.development.egypt.knownMaterial.includes('roadmaking'));
 assert.ok(seasonal.development.caesar.knownMaterial.includes('water-control'));
 const player=newGrandGame('egypt');player.wars=[];player.year=-48;player.month=3;
 player.relations['caesar:egypt']=55;player.factions.caesar.treasury=100;player.factions.egypt.treasury=100;
 aiTurn(player,'caesar');
 assert.ok(player.development.egypt.agreementRequests.some(x=>x.partner==='caesar'));
 assert.equal(player.knowledgeAgreements.length,0);
 assert.equal(player.factions.egypt.treasury,100);
 const others=newGrandGame('egypt');others.wars=[];others.year=-48;others.month=3;
 others.relations['caesar:senate']=60;others.factions.caesar.treasury=100;others.factions.senate.treasury=100;
 others.development.caesar.knownMaterial.push('bridge-engineering');
 others.development.senate.knownMaterial.push('water-control');
 aiTurn(others,'caesar');
 assert.ok(others.knowledgeAgreements.some(a=>a.a==='caesar'&&a.b==='senate'));
 assert.equal(others.factions.senate.treasury,80);
 aiTurn(others,'caesar');
 assert.equal(others.knowledgeAgreements.length,1);
});
