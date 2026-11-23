import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,upgradeSave,tick,aiTurn,setTax,recruit,region,moveArmy,previewMarch,diplomacy,relation,royalCourtCredit,provincialRitesCredit,setReligiousPolicy,researchInnovation,adoptIdea,removeIdea,cancelIdeaAdoption,expandIdeaSlot,startConstruction,constructionCheck,knowledgeTrade,sellKnowledge,proposeKnowledgeSale,proposeKnowledgePurchase,acceptKnowledgePurchase,declineKnowledgePurchase,acceptKnowledgeOffer,declineKnowledgeOffer,exchangeKnowledge,proposeKnowledgeExchange,acceptKnowledgeExchange,declineKnowledgeExchange,knowledgeAgreementCheck,proposeKnowledgeAgreement,negotiateKnowledgeAgreement,acceptKnowledgeAgreement,declineKnowledgeAgreement,cancelKnowledgeAgreement,inviteForeignScholars,acceptScholarVisit,declineScholarVisit,purchaseMaterials,resolveBattle} from '../engine.js';
import {IDEA_CATEGORIES,IDEAS,MATERIALS,BUILDINGS,development,activeEffects,ideaCompatibility,ideaAdoptionPlan,ideaSlotExpansionCheck,scholarVisitTopics,researchTerms,recordMerchantContact,settleGranaryReserves,advanceDevelopment,mineMetalOutput,localBuildingEffects,templeGuaranteeExpense} from '../development.js';
import {advanceNaval} from '../naval.js';
import {renderNavalPanel} from '../map-lab/naval-ui.js';
test('road milestone encyclopedia attributes its ancient account to Plutarch',()=>{
 const milestone=MATERIALS.find(item=>item.id==='road-milestones');
 assert.equal(milestone.source.title,'Plutarch, Life of Caius Gracchus 7.2');
 assert.match(milestone.source.url,/Plutarch\/Lives\/Caius_Gracchus/);
});
import {developmentPanel,ideasPanel,constructionPanel} from '../development-ui.js';
import {edgeMonths,grandRoute,armySupply} from '../grand-operations.js';
import {techIllustration,buildingIllustration} from '../tech-art.js';
import {faithSatisfaction,advanceDemography,advanceReligion} from '../local-society.js';
import {nationalBudget} from '../national-budget.js';
import {afterActionHtml} from '../recon-ui.js';
import {budgetHtml} from '../budget-ui.js';

test('construction panel shows a bilingual cash runway before paying for works',()=>{
 const s=newGrandGame('caesar'),site=s.regions.find(r=>r.owner==='caesar');
 const openingNet=nationalBudget(s,'caesar').projectedNet;
 assert.ok(openingNet<0);
 const months=Math.ceil(s.factions.caesar.treasury/-openingNet);
 assert.match(constructionPanel(s,'en',site),new RegExp(`Treasury outlook:[\\s\\S]*current monthly balance ${openingNet}¤[\\s\\S]*about ${months} months`));
 assert.match(constructionPanel(s,'zh',site),new RegExp(`国库预估：[\\s\\S]*当前每月收支 ${openingNet}¤[\\s\\S]*约 ${months} 个月后国库耗尽`));
 s.factions.caesar.treasury=0;
 assert.match(constructionPanel(s,'en',site),/Funds are already exhausted/);
 assert.match(constructionPanel(s,'zh',site),/国库已耗尽/);
});

test('every building reference has a distinct drawing and names its cited historical source',()=>{
 const drawings=BUILDINGS.map(buildingIllustration);
 assert.equal(new Set(drawings).size,BUILDINGS.length);
 for(const lang of ['en','zh']){
  const html=developmentPanel(newGrandGame('senate'),lang,'material');
  assert.equal((html.match(/data-building-reference=/g)||[]).length,BUILDINGS.length);
  assert.equal((html.match(/class="dev-reference-art"/g)||[]).length,BUILDINGS.length);
  assert.match(html,lang==='en'?/Historical source: Plutarch, Life of Caius Gracchus 7\.2/:/史料来源: Plutarch, Life of Caius Gracchus 7\.2/);
  assert.match(html,/data-building-reference="naval-depot"/);
  assert.match(html,/data-building-reference="coastal-fort"/);
  assert.match(html,/data-building-reference="naval-training"/);
 }
});
test('period engineering references name the checked source instead of only its host',()=>{
 for(const [id,title] of [
  ['roadmaking','UNESCO, Via Appia. Regina Viarum'],
  ['bridge-engineering','Caesar, Civil Wars 1.40–41, 1.48–54'],
  ['stone-fortification','Musée d’Archéologie nationale, Vercingetorix and Alesia'],
  ['supply-organization','Javier Salido Dominguez, Architecture in the Service of the Roman Army (2015)'],
  ['dam-engineering','Alyzia Dam archaeological and engineering study (ISSMGE, 2026)']
 ]){
  const item=MATERIALS.find(x=>x.id===id);
  assert.equal(item.source.title,title);
  assert.match(item.source.url,/^https:\/\//);
  assert.match(developmentPanel(newGrandGame('senate'),'en','material'),new RegExp(title.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 }
 const dam=MATERIALS.find(x=>x.id==='dam-engineering');
 const bridge=BUILDINGS.find(x=>x.id==='bridge');
 assert.match(bridge.context[0],/Sicoris.*simulation values/);
 assert.match(bridge.context[1],/西科里斯河.*模拟数值/);
 assert.match(developmentPanel(newGrandGame('senate'),'en','material'),/Caesar records bridges over the Sicoris/);
 assert.match(developmentPanel(newGrandGame('senate'),'zh','material'),/凯撒记载前49年西科里斯河上的桥梁/);
 assert.match(dam.context[0],/Alyzia.*mid-fourth to third century BCE/);
 assert.match(dam.context[1],/阿利齐亚.*前4世纪中叶至前3世纪/);
 assert.doesNotMatch(dam.context.join(' '),/Alcantarilla|阿尔坎塔里利亚/);
});

test('agreed grain-dues commutation converts only real surplus after paid adoption',()=>{
 const idea=IDEAS.find(x=>x.id==='grain-dues-commutation'),s=newGrandGame('caesar');
 assert.match(idea.source.url,/verres23_4/);assert.ok(techIllustration(idea).includes('<svg'));
 s.wars=[];s.factions.caesar.treasury=500;s.factions.caesar.food=80;
 for(const id of ['cisalpine','t002','t004','t005'])s.regions.find(r=>r.id===id).food=2;
 const baseline=nationalBudget(s,'caesar');assert.ok(baseline.foodNet>=3);
 assert.equal(researchInnovation(s,'caesar','idea',idea.id).ok,true);
 for(let i=0;i<idea.months;i++)advanceDevelopment(s);
 assert.ok(development(s,'caesar').knownIdeas.includes(idea.id));
 assert.equal(nationalBudget(s,'caesar').grainCommutation,0,'research alone cannot change revenue');
 assert.equal(adoptIdea(s,'caesar',idea.id,0).ok,true);
 assert.equal(nationalBudget(s,'caesar').grainCommutation,0,'adoption takes time');
 for(let i=0;i<2;i++)advanceDevelopment(s);
 const active=nationalBudget(s,'caesar');
 assert.equal(active.grainCommutation,3);assert.equal(active.landNet,baseline.landNet+3);assert.equal(active.foodNet,baseline.foodNet-3);
 const saved=upgradeSave(structuredClone(s));assert.equal(nationalBudget(saved,'caesar').grainCommutation,3);
 const activeTurn=upgradeSave(structuredClone(saved)),controlTurn=upgradeSave(structuredClone(saved));
 controlTurn.development.caesar.slots.economy[0]=null;
 tick(activeTurn);tick(controlTurn);
 assert.equal(activeTurn.factions.caesar.treasury,controlTurn.factions.caesar.treasury+3);
 assert.equal(activeTurn.factions.caesar.food,controlTurn.factions.caesar.food-3);
 for(const [lang,name,cash,grain] of [['en','Grain Dues Commutation','Grain dues paid in cash','Grain dues retained locally'],['zh','粮赋折现协定','粮赋折现收入','粮赋折现减少入库粮']]){
  assert.match(developmentPanel(saved,lang,'idea'),new RegExp(name));
  assert.match(budgetHtml(saved,lang),new RegExp(cash));assert.match(budgetHtml(saved,lang),new RegExp(grain));
 }
 const dry=structuredClone(saved);dry.factions.caesar.food=34;assert.equal(nationalBudget(dry,'caesar').grainCommutation,0);
 const harvest=structuredClone(saved);for(const r of harvest.regions.filter(r=>r.owner==='caesar'))r.food=0;assert.equal(nationalBudget(harvest,'caesar').grainCommutation,0);
 const unsupported=structuredClone(saved);for(const r of unsupported.regions.filter(r=>r.owner==='caesar'))r.civicSatisfaction=40;assert.equal(nationalBudget(unsupported,'caesar').grainCommutation,0);
});

test('AI funds grain commutation only when it can collect agreed cash dues',()=>{
 const opening=newGrandGame('caesar');
 for(const condition of ['ready','low-stores','no-surplus','no-support','thin-harvest']){
  const s=upgradeSave(structuredClone(opening)),owner='egypt',d=development(s,owner);
  d.knownIdeas.push('grain-dues-commutation');d.slots.economy=[null];s.factions[owner].treasury=700;s.month=1;
  if(condition==='low-stores')s.factions[owner].food=34;
  if(condition==='no-surplus')for(const r of s.regions.filter(r=>r.owner===owner))r.food=0;
  if(condition==='no-support')for(const r of s.regions.filter(r=>r.owner===owner))r.civicSatisfaction=40;
  if(condition==='thin-harvest'){
   const owned=s.regions.filter(r=>r.owner===owner);
   for(const r of owned)r.civicSatisfaction=40;
   owned[0].civicSatisfaction=80;owned[0].loyalty=80;owned[0].food=.5;
  }
  const useful=condition==='ready';assert.equal(nationalBudget(s,owner).foodNet>0,condition!=='no-surplus');
  aiTurn(s,owner);
  assert.equal(d.adoption?.ideaId,useful?'grain-dues-commutation':undefined,condition);
  if(useful){for(let i=0;i<2;i++)advanceDevelopment(s);assert.ok(nationalBudget(s,owner).grainCommutation>0)}
 }
});

test('paid field reserve command helps only supplied joint defense and survives a save',()=>{
 const s=newGrandGame('caesar'),idea=IDEAS.find(item=>item.id==='field-reserve-command');
 assert.deepEqual(idea.prerequisites,['frontier-defense']);
 assert.equal(researchInnovation(s,'caesar','idea',idea.id).reason,'prerequisite');
 assert.equal(researchInnovation(s,'caesar','idea','frontier-defense').ok,true);
 for(let i=0;i<3;i++)advanceDevelopment(s);
 assert.equal(researchInnovation(s,'caesar','idea',idea.id).ok,true);
 for(let i=0;i<idea.months;i++)advanceDevelopment(s);
 assert.ok(development(s,'caesar').knownIdeas.includes(idea.id));
 assert.equal(activeEffects(s,'caesar').combinedDefense||0,0,'research alone does not equip the doctrine');
 const known=structuredClone(s);
 const adoption=ideaAdoptionPlan(s,'caesar',idea.id);
 assert.equal(adoption.ok,true);
 assert.equal(adoptIdea(s,'caesar',idea.id).ok,true);
 assert.equal(activeEffects(s,'caesar').combinedDefense||0,0,'adoption is not instant');
 for(let i=0;i<adoption.months;i++)advanceDevelopment(s);
 assert.equal(activeEffects(s,'caesar').combinedDefense,.05);
 assert.equal(activeEffects(s,'caesar').upkeep,2);
 const restored=upgradeSave(structuredClone(s));
 assert.equal(nationalBudget(known,'caesar').projectedNet-nationalBudget(restored,'caesar').projectedNet,2);
 const fight=(state,{second=true,isolated=false,meeting=false,hostile=false}={})=>{
  const battleState=upgradeSave(structuredClone(state)),target=region(battleState,isolated?'t012':'roma');
  target.owner='caesar';target.food=isolated?0:target.food;
  if(isolated)for(const site of battleState.regions)if(site.id!==target.id&&site.owner==='caesar')site.owner='senate';
  const attacker=battleState.armies.find(unit=>unit.id==='pompey'),defender=battleState.armies.find(unit=>unit.id==='xiii');
  attacker.region='t014';attacker.men=11000;defender.region=target.id;defender.men=6000;
  battleState.factions.caesar.food=battleState.factions.senate.food=80;
  if(second){assert.equal(recruit(battleState,target.id,'caesar'),true)}
  if(hostile)target.owner='senate';
  battleState.seed=17;
  resolveBattle(battleState,attacker,defender,target,{meeting});
  return battleState.battles[0];
 };
 const before=fight(known),after=fight(restored);
 assert.equal(before.fieldReserveFactor,0);
 assert.equal(after.fieldReserveFactor,.05);
 assert.ok(Math.abs(after.defender.power/before.defender.power-1.05)<.001);
 assert.equal(fight(restored,{second:false}).fieldReserveFactor,0);
 assert.equal(fight(restored,{isolated:true}).fieldReserveFactor,0);
 assert.equal(fight(restored,{meeting:true}).fieldReserveFactor,0);
 assert.equal(fight(restored,{hostile:true}).fieldReserveFactor,0);
 assert.match(ideasPanel(restored,'en'),/Field Reserve Command/);
 assert.match(ideasPanel(restored,'en'),/Joint defense in an owned theater with supply ≥65%/);
 assert.match(ideasPanel(restored,'zh'),/野战预备队指挥/);
 assert.match(ideasPanel(restored,'zh'),/己方战区两军合防且补给≥65%的防御/);
 assert.notEqual(techIllustration(idea),techIllustration(IDEAS.find(item=>item.id==='field-march-coordination')));
 assert.match(afterActionHtml(after,'caesar','en'),/Friendly reserves strengthened the supplied joint defense \(\+5% defensive power\)/);
 assert.match(afterActionHtml(after,'caesar','zh'),/己方预备队在足够补给下加强了两军合防（防御战力 \+5%）/);
 assert.equal(upgradeSave(structuredClone(restored)).development.caesar.slots.military[0],idea.id);
});

test('peaceful AI courts do not adopt an unfunded idea and bankrupt themselves over six years',()=>{
 let state=newGrandGame('egypt');
 const courts=['numidia','mauretania','armenia','parthia','galatia','bosporus'],everAtWar=new Set();
 for(let month=0;month<72;month++){
  if(month===36)state=upgradeSave(JSON.parse(JSON.stringify(state)));
  tick(state);
  for(const id of courts)if(state.wars.some(war=>war.includes(id)))everAtWar.add(id);
 }
 const peaceful=courts.filter(id=>!everAtWar.has(id));
 assert.ok(peaceful.length>=2,'the audit needs multiple courts that stayed at peace');
 for(const id of peaceful){
  assert.ok(state.factions[id].treasury>=0,`${id} must preserve a solvent treasury`);
  assert.ok(state.factions[id].stability>=35,`${id} must not collapse from peaceful idea upkeep`);
  assert.ok(nationalBudget(state,id).projectedNet>=0,`${id} must fund its active commitments`);
 }
 assert.ok(peaceful.some(id=>Object.values(state.development[id].slots).flat().some(Boolean)),'the guard must still allow affordable ideas');
});

test('a small peaceful court can invest its thin surplus and sustain a workshop after reload',()=>{
 let state=newGrandGame('senate');state.month=4;
 assert.equal(nationalBudget(state,'bosporus').projectedNet,0);
 aiTurn(state,'bosporus');
 assert.equal(state.development.bosporus.research?.id,'craft-workshops');
 for(let month=0;month<24;month++){
  if(month===12)state=upgradeSave(JSON.parse(JSON.stringify(state)));
  tick(state);
 }
 assert.ok(state.regions.some(site=>site.owner==='bosporus'&&site.buildings.includes('workshop')));
 assert.ok(nationalBudget(state,'bosporus').projectedNet>=1);
 assert.ok(state.factions.bosporus.treasury>=24);
});

test('Mauretanian AI can learn and adopt a shared North African scout practice only with local support',()=>{
 const makeState=support=>{
  const s=newGrandGame('egypt');s.month=4;s.wars.push(['mauretania','numidia']);s.factions.mauretania.treasury=500;
  for(const r of s.regions.filter(r=>r.owner==='mauretania'))r.civicSatisfaction=support;
  return s;
 };
 const unsupported=makeState(44);aiTurn(unsupported,'mauretania');
 assert.notEqual(unsupported.development.mauretania.research?.id,'numidian-mounted-scouts');
 const s=makeState(70);aiTurn(s,'mauretania');
 assert.equal(s.development.mauretania.research?.id,'numidian-mounted-scouts');
 assert.equal(activeEffects(s,'mauretania').scoutReliability,undefined);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 for(let month=0;month<4;month++)advanceDevelopment(loaded,()=>{});
 assert.ok(loaded.development.mauretania.knownIdeas.includes('numidian-mounted-scouts'));
 assert.equal(activeEffects(loaded,'mauretania').scoutReliability,undefined);
 loaded.month=5;aiTurn(loaded,'mauretania');
 assert.equal(loaded.development.mauretania.adoption?.ideaId,'numidian-mounted-scouts');
 assert.equal(loaded.development.mauretania.adoption?.remaining,4,'foreign adoption still takes extra time');
 for(let month=0;month<4;month++)advanceDevelopment(loaded,()=>{});
 assert.equal(loaded.development.mauretania.slots.military[0],'numidian-mounted-scouts');
 assert.equal(activeEffects(loaded,'mauretania').scoutReliability,.08);
});
import {expensesThisMonth} from '../expense-ledger.js';
const months=(s,n)=>{for(let i=0;i<n;i++)tick(s)};

test('road milestones need a built road and yield their stated income after construction',()=>{
 const s=newGrandGame('senate'),r=s.regions.find(site=>site.id==='roma'),d=development(s,'senate');
 s.wars=[];s.factions.senate.treasury=500;d.materials.stone=30;d.materials.timber=30;
 const invention=MATERIALS.find(item=>item.id==='road-milestones');
 assert.match(invention.source.url,/Plutarch\/Lives\/Caius_Gracchus/);
 assert.equal(researchInnovation(s,'senate','material',invention.id).ok,true);
 months(s,invention.months);
 assert.equal(constructionCheck(s,'senate',r.id,'milestone').reason,'road');
 assert.match(constructionPanel(s,'en',r),/Unavailable: build a local road first/);
 assert.match(constructionPanel(s,'zh',r),/需要当地已建道路/);
 assert.match(developmentPanel(s,'en','material'),/existing local road/);
 assert.match(developmentPanel(s,'zh','material'),/当地已建道路/);
 assert.equal(startConstruction(s,'senate',r.id,'road').ok,true);
 assert.equal(constructionCheck(s,'senate',r.id,'milestone').reason,'road','a road in the queue is not a built road');
 months(s,BUILDINGS.find(item=>item.id==='road').months);
 assert.ok(r.buildings.includes('road'));
 assert.equal(startConstruction(s,'senate',r.id,'milestone').ok,true);
 const during=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(during.regions.find(site=>site.id===r.id).construction.buildingId,'milestone');
 months(during,BUILDINGS.find(item=>item.id==='milestone').months);
 const built=during.regions.find(site=>site.id===r.id);
 assert.ok(built.buildings.includes('milestone'));
 const without=upgradeSave(JSON.parse(JSON.stringify(during)));
 without.regions.find(site=>site.id===r.id).buildings=without.regions.find(site=>site.id===r.id).buildings.filter(id=>id!=='milestone');
 assert.equal(nationalBudget(during,'senate').projectedNet,nationalBudget(without,'senate').projectedNet+1);
 // Old saves may contain a milestone without an explicit local road. Preserve
 // that paid construction while applying the new prerequisite to future work.
 built.buildings=built.buildings.filter(id=>id!=='road');
 const oldSave=upgradeSave(JSON.parse(JSON.stringify(during)));
 assert.ok(oldSave.regions.find(site=>site.id===r.id).buildings.includes('milestone'));
});

test('cultural accommodation aids administered foreign provinces only after adoption',()=>{
 const idea=IDEAS.find(item=>item.id==='cultural-accommodation'),s=newGrandGame('senate');
 s.wars=[];s.factions.senate.treasury=500;
 assert.match(ideasPanel(s,'en'),/Different-culture territory with integration ≥45: local satisfaction \/ quarter \+1/);
 assert.match(ideasPanel(s,'zh'),/异文化领土且融合度≥45：当地满意度 \/ 季 \+1/);
 assert.equal(researchInnovation(s,'senate','idea',idea.id).ok,true);
 assert.equal(activeEffects(s,'senate').culturalAccommodation,undefined);
 months(s,idea.months);
 assert.equal(activeEffects(s,'senate').culturalAccommodation,undefined);
 assert.equal(adoptIdea(s,'senate',idea.id).ok,true);
 assert.equal(activeEffects(s,'senate').culturalAccommodation,undefined);
 months(s,2);
 assert.equal(activeEffects(s,'senate').culturalAccommodation,1);
 const eligible=s.regions.find(r=>r.culture==='egypt');
 const unsupported=s.regions.find(r=>r.culture==='hellenic');
 const home=s.regions.find(r=>r.culture==='roman-local');
 for(const region of [eligible,unsupported,home]){region.owner='senate';region.civicSatisfaction=50;region.loyalty=50}
 eligible.integration=60;unsupported.integration=30;home.integration=60;
 const control=upgradeSave(JSON.parse(JSON.stringify(s)));
 development(control,'senate').slots.culture[0]=null;
 s.month=2;control.month=2;
 tick(s);tick(control);
 const compared=region=>control.regions.find(r=>r.id===region.id).civicSatisfaction;
 assert.equal(eligible.civicSatisfaction,compared(eligible)+1);
 assert.equal(unsupported.civicSatisfaction,compared(unsupported));
 assert.equal(home.civicSatisfaction,compared(home));
 assert.equal(nationalBudget(s,'senate').ideaUpkeep,nationalBudget(control,'senate').ideaUpkeep);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(activeEffects(restored,'senate').culturalAccommodation,1);
 assert.equal(restored.regions.find(r=>r.id===eligible.id).civicSatisfaction,eligible.civicSatisfaction);
});

test('Parthian arrow trains need adoption and supplied local plains to affect real combat',()=>{
 const id='parthian-arrow-trains',idea=IDEAS.find(item=>item.id===id);
 assert.match(idea.source.url,/Crassus/);
 assert.match(techIllustration(idea),/<svg/);
 const s=newGrandGame('parthia');s.wars=[];s.factions.parthia.treasury=500;
 assert.match(ideasPanel(s,'en'),/Parthian Arrow Supply Trains/);
 assert.match(ideasPanel(s,'zh'),/帕提亚箭矢补给队/);
 assert.equal(researchInnovation(s,'parthia','idea',id).ok,true);
 assert.equal(activeEffects(s,'parthia').parthianArrowTrains,undefined);
 months(s,idea.months);
 assert.equal(adoptIdea(s,'parthia',id).ok,true);
 assert.equal(activeEffects(s,'parthia').parthianArrowTrains,undefined);
 months(s,development(s,'parthia').adoption.remaining);
 assert.equal(activeEffects(s,'parthia').parthianArrowTrains,.06);
 assert.equal(nationalBudget(s,'parthia').ideaUpkeep,3);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 const fight=(state,food=100)=>{
  state.factions.parthia.food=food;
  const defender=state.armies.find(a=>a.owner==='parthia'),attacker=state.armies.find(a=>a.owner==='caesar'),home=state.regions.find(r=>r.id==='parthia');
  defender.region=home.id;defender.men=4200;attacker.men=4200;
  resolveBattle(state,attacker,defender,home);
  return state.battles[0];
 };
 const active=fight(upgradeSave(JSON.parse(JSON.stringify(restored))));
 const inactive=upgradeSave(JSON.parse(JSON.stringify(restored)));development(inactive,'parthia').slots.military[0]=null;
 const baseline=fight(inactive);
 assert.equal(active.arrowTrainFactor,.06);
 assert.ok(active.defender.power>baseline.defender.power);
 assert.match(afterActionHtml(active,'parthia','en'),/arrow supply trains/i);
 assert.match(afterActionHtml(active,'parthia','zh'),/箭矢补给队/);
 const hills=upgradeSave(JSON.parse(JSON.stringify(restored)));hills.regions.find(r=>r.id==='parthia').terrain='hills';
 assert.equal(fight(hills).arrowTrainFactor,0);
 assert.equal(fight(upgradeSave(JSON.parse(JSON.stringify(restored))),0).arrowTrainFactor,0);
 const foreign=newGrandGame('senate');foreign.wars=[];foreign.factions.senate.treasury=500;development(foreign,'senate').knownIdeas.push(id);
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).reason,'cultural-base');
 const enclave=foreign.regions.find(r=>r.id==='parthia');enclave.owner='senate';enclave.civicSatisfaction=44;
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).reason,'local-support');
 enclave.civicSatisfaction=45;
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).months,4);
});

test('Armenian highland provisioning needs adoption and a reachable owned hill',()=>{
 const id='armenian-highland-provisioning',idea=IDEAS.find(item=>item.id===id);
 assert.match(idea.source.url,/Crassus/);
 assert.match(techIllustration(idea),/<svg/);
 const s=newGrandGame('armenia');s.wars=[];s.factions.armenia.treasury=500;
 const unit=s.armies.find(a=>a.owner==='armenia'),hill=s.regions.find(r=>r.id==='t099');
 unit.region=hill.id;
 assert.equal(hill.owner,'armenia');assert.equal(hill.terrain,'hills');
 assert.match(ideasPanel(s,'en'),/Armenian Highland Provisioning/);
 assert.match(ideasPanel(s,'zh'),/亚美尼亚高地军需筹划/);
 assert.match(ideasPanel(s,'en'),/Army supply on reachable, owned Armenian hills \+8%/);
 assert.match(ideasPanel(s,'zh'),/陆路可达的己方亚美尼亚丘陵军队补给 \+8%/);
 const baseline=armySupply(s,unit);
 assert.ok(baseline<1&&baseline>0);
 assert.equal(researchInnovation(s,'armenia','idea',id).ok,true);
 assert.equal(activeEffects(s,'armenia').armenianHighlandSupply,undefined);
 months(s,idea.months);
 assert.equal(activeEffects(s,'armenia').armenianHighlandSupply,undefined);
 assert.equal(adoptIdea(s,'armenia',id).ok,true);
 assert.equal(activeEffects(s,'armenia').armenianHighlandSupply,undefined);
 months(s,development(s,'armenia').adoption.remaining);
 assert.equal(activeEffects(s,'armenia').armenianHighlandSupply,.08);
 assert.equal(nationalBudget(s,'armenia').ideaUpkeep,2);
 const active=armySupply(s,unit),restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.ok(Math.abs(active-baseline-.08)<1e-9);
 assert.equal(armySupply(restored,restored.armies.find(a=>a.id===unit.id)),active);
 const inactive=upgradeSave(JSON.parse(JSON.stringify(s)));development(inactive,'armenia').slots.military[0]=null;
 assert.equal(armySupply(inactive,inactive.armies.find(a=>a.id===unit.id)),baseline);
 const plain=upgradeSave(JSON.parse(JSON.stringify(s)));plain.regions.find(r=>r.id===hill.id).terrain='plain';
 assert.equal(armySupply(plain,plain.armies.find(a=>a.id===unit.id)),baseline);
 const foreignHill=upgradeSave(JSON.parse(JSON.stringify(s)));foreignHill.regions.find(r=>r.id===hill.id).culture='hellenic';
 assert.equal(armySupply(foreignHill,foreignHill.armies.find(a=>a.id===unit.id)),baseline);
 const lostHill=upgradeSave(JSON.parse(JSON.stringify(s)));lostHill.regions.find(r=>r.id===hill.id).owner='parthia';
 const lostUnit=lostHill.armies.find(a=>a.id===unit.id);
 const lostControl=upgradeSave(JSON.parse(JSON.stringify(lostHill)));development(lostControl,'armenia').slots.military[0]=null;
 assert.equal(armySupply(lostHill,lostUnit),armySupply(lostControl,lostControl.armies.find(a=>a.id===unit.id)));
 const isolated=upgradeSave(JSON.parse(JSON.stringify(s)));isolated.regions.find(r=>r.id==='armenia').owner='parthia';isolated.regions.find(r=>r.id==='t100').owner='parthia';
 const isolatedControl=upgradeSave(JSON.parse(JSON.stringify(isolated)));development(isolatedControl,'armenia').slots.military[0]=null;
 assert.equal(armySupply(isolated,isolated.armies.find(a=>a.id===unit.id)),armySupply(isolatedControl,isolatedControl.armies.find(a=>a.id===unit.id)));
 const foreign=newGrandGame('senate');foreign.wars=[];foreign.factions.senate.treasury=500;development(foreign,'senate').knownIdeas.push(id);
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).reason,'cultural-base');
 const community=foreign.regions.find(r=>r.id==='armenia');community.owner='senate';community.civicSatisfaction=44;
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).reason,'local-support');
 community.civicSatisfaction=45;
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).months,4);
});

test('Galatian auxiliaries require research and adoption and affect only supported local recruits',()=>{
 const id='galatian-auxiliary-muster',idea=IDEAS.find(item=>item.id===id);
 assert.match(idea.source.url,/Civil_Wars\/3A/);
 assert.match(techIllustration(idea),/<svg/);
 const s=newGrandGame('galatia');s.wars=[];s.factions.galatia.treasury=500;
 const d=development(s,'galatia'),home=s.regions.find(r=>r.id==='galatia');
 assert.match(ideasPanel(s,'en'),/Galatian Auxiliary Muster/);
 assert.match(ideasPanel(s,'zh'),/加拉太辅助兵征募/);
 assert.equal(researchInnovation(s,'galatia','idea',id).ok,true);
 assert.equal(activeEffects(s,'galatia').galatianMuster,undefined);
 months(s,idea.months);assert.ok(d.knownIdeas.includes(id));
 assert.equal(adoptIdea(s,'galatia',id).ok,true);
 assert.equal(activeEffects(s,'galatia').galatianMuster,undefined);
 months(s,d.adoption.remaining);
 assert.equal(activeEffects(s,'galatia').galatianMuster,6);
 assert.equal(nationalBudget(s,'galatia').ideaUpkeep,2);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(nationalBudget(restored,'galatia').ideaUpkeep,2);
 const recruitMorale=state=>{const before=state.armies.length;assert.equal(recruit(state,'galatia','galatia'),true);return state.armies[before].morale};
 restored.factions.galatia.treasury=500;restored.factions.galatia.manpower=9000;restored.factions.galatia.food=100;
 assert.equal(recruitMorale(restored),64);
 const lowIntegration=upgradeSave(JSON.parse(JSON.stringify(restored)));lowIntegration.regions.find(r=>r.id==='galatia').integration=44;
 assert.equal(recruitMorale(lowIntegration),58);
 const lowSupport=upgradeSave(JSON.parse(JSON.stringify(restored)));lowSupport.regions.find(r=>r.id==='galatia').civicSatisfaction=44;
 assert.equal(recruitMorale(lowSupport),58);
 const otherCulture=upgradeSave(JSON.parse(JSON.stringify(restored)));otherCulture.regions.find(r=>r.id==='galatia').culture='anatolian';
 assert.equal(recruitMorale(otherCulture),58);
 const foreign=newGrandGame('senate');foreign.wars=[];foreign.factions.senate.treasury=500;development(foreign,'senate').knownIdeas.push(id);
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).reason,'cultural-base');
 const enclave=foreign.regions.find(r=>r.id==='galatia');enclave.owner='senate';enclave.civicSatisfaction=44;
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).reason,'local-support');
 enclave.civicSatisfaction=45;
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).months,4);
});

test('Egyptian temple revenue guarantees require local priesthood, cost the state, and act through provincial faith',()=>{
 const idea=IDEAS.find(item=>item.id==='egyptian-temple-revenues');
 assert.match(idea.source.url,/ptolemy_viii_decrees/);
 assert.match(techIllustration(idea),/<svg/);
 const s=newGrandGame('egypt'),d=development(s,'egypt'),home=s.regions.find(r=>r.id==='egypt');
 s.wars=[];s.factions.egypt.treasury=500;
 assert.equal(researchInnovation(s,'egypt','idea',idea.id).ok,true);
 assert.equal(activeEffects(s,'egypt').templeGuarantees,undefined);
 months(s,idea.months);
 assert.ok(d.knownIdeas.includes(idea.id));
 for(const region of s.regions.filter(r=>r.owner==='egypt'&&r.culture==='egypt'))region.priesthood.influence=20;
 const before=s.factions.egypt.treasury;
 assert.equal(adoptIdea(s,'egypt',idea.id).reason,'priesthood');
 assert.equal(s.factions.egypt.treasury,before);
 home.priesthood.influence=40;
 assert.equal(adoptIdea(s,'egypt',idea.id).ok,true);
 assert.equal(activeEffects(s,'egypt').templeGuarantees,undefined);
 months(s,d.adoption.remaining);
 assert.equal(activeEffects(s,'egypt').templeGuarantees,1);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(activeEffects(restored,'egypt').templeGuarantees,1);
 const control=upgradeSave(JSON.parse(JSON.stringify(restored)));
 development(control,'egypt').slots.culture[0]=null;
 for(const state of [restored,control]){
  state.month=2;state.wars=[];state.factions.egypt.treasury=300;state.factions.egypt.food=100;
  state.regions.find(r=>r.id==='egypt').civicSatisfaction=50;
  state.regions.find(r=>r.id==='egypt').priesthood.influence=40;
 }
 const expense=templeGuaranteeExpense(restored,'egypt');
 assert.ok(expense>0);
 assert.equal(templeGuaranteeExpense(control,'egypt'),0);
 assert.equal(nationalBudget(control,'egypt').projectedNet-nationalBudget(restored,'egypt').projectedNet,idea.effects.upkeep+expense);
 tick(restored);tick(control);
 const target=restored.regions.find(r=>r.id==='egypt'),plain=control.regions.find(r=>r.id==='egypt');
 assert.equal(target.priesthood.influence-plain.priesthood.influence,1);
 assert.equal(target.civicSatisfaction-plain.civicSatisfaction,1);
 assert.equal(control.factions.egypt.treasury-restored.factions.egypt.treasury,idea.effects.upkeep+expense);
 target.priesthood.influence=20;
 assert.equal(faithSatisfaction(restored,target),faithSatisfaction(control,plain));
 target.priesthood.influence=40;target.faiths=[{id:'hellenic-cults',share:70},{id:'egyptian-cults',share:30}];
 plain.faiths=target.faiths;
 assert.equal(faithSatisfaction(restored,target),faithSatisfaction(control,plain));
 assert.match(ideasPanel(restored,'en'),/Egyptian Temple Revenue Guarantees/);
 assert.match(ideasPanel(restored,'zh'),/埃及神庙收入保障/);
 assert.match(budgetHtml(restored,'en'),/Egyptian temple revenue guarantees/);
 assert.match(budgetHtml(restored,'zh'),/埃及神庙收入保障/);
});

test('paid research and incoming knowledge cannot charge twice for the same invention',()=>{
 const researching=newGrandGame('caesar');researching.relations['caesar:egypt']=60;
 researching.factions.caesar.treasury=300;
 assert.equal(researchInnovation(researching,'caesar','material','water-control').ok,true);
 const treasury=researching.factions.caesar.treasury;
 assert.equal(knowledgeTrade(researching,'caesar','egypt','material','water-control').reason,'knowledge');
 assert.equal(sellKnowledge(researching,'egypt','caesar','material','water-control').reason,'knowledge');
 assert.equal(researching.factions.caesar.treasury,treasury);
 assert.match(developmentPanel(researching,'en','material'),/data-trade-id="water-control"[^>]*disabled/);
 const bought=newGrandGame('caesar');bought.relations['caesar:egypt']=60;
 bought.factions.caesar.treasury=300;
 assert.equal(knowledgeTrade(bought,'caesar','egypt','material','water-control').ok,true);
 const remaining=bought.factions.caesar.treasury;
 assert.equal(researchInnovation(bought,'caesar','material','water-control').reason,'unavailable');
 assert.equal(bought.factions.caesar.treasury,remaining);
 assert.match(developmentPanel(bought,'en','material'),/data-research="water-control"[^>]*disabled[^>]*>In transit/);
 assert.match(developmentPanel(bought,'zh','material'),/data-research="water-control"[^>]*disabled[^>]*>传输中/);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(bought)));
 advanceDevelopment(loaded);advanceDevelopment(loaded);
 assert.equal(loaded.development.caesar.knownMaterial.filter(id=>id==='water-control').length,1);
});

test('knowledge agreements skip an invention already under research',()=>{
 const s=newGrandGame('caesar');s.relations['caesar:egypt']=60;
 s.factions.caesar.treasury=300;s.factions.egypt.treasury=300;
 assert.equal(negotiateKnowledgeAgreement(s,'caesar','egypt').ok,true);
 assert.equal(researchInnovation(s,'caesar','material','water-control').ok,true);
 for(let i=0;i<3;i++)advanceDevelopment(s);
 assert.ok(!s.development.caesar.trade.some(t=>t.id==='water-control'));
 assert.ok(s.development.egypt.trade.some(t=>t.id==='roadmaking'));
 advanceDevelopment(s);
 assert.equal(s.development.caesar.knownMaterial.filter(id=>id==='water-control').length,1);
});

test('AI seeks a different invention when its first foreign option is already in progress',()=>{
 const s=newGrandGame('senate');s.month=12;s.relations['caesar:egypt']=60;
 s.factions.caesar.treasury=500;s.factions.caesar.food=200;
 const buyer=development(s,'caesar'),seller=development(s,'egypt');
 buyer.research={branch:'material',id:'water-control',remaining:3};
 seller.knownMaterial.push('quarrying');
 aiTurn(s,'caesar');
 assert.ok(buyer.trade.some(t=>t.seller==='egypt'&&t.id==='quarrying'));
 assert.ok(!buyer.trade.some(t=>t.id==='water-control'));
});

test('old saves with overlapping research and transfer retain one earned knowledge item',()=>{
 const s=newGrandGame('caesar'),d=development(s,'caesar');
 d.knownMaterial.push('grain-storage');
 d.research={branch:'idea',id:'cultural-accommodation',remaining:1,scholarPartner:null};
 d.trade.push({seller:'egypt',branch:'idea',id:'cultural-accommodation',remaining:1});
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(loaded.development.caesar.knownMaterial.filter(id=>id==='grain-storage').length,1);
 const reports=[];advanceDevelopment(loaded,(en,zh)=>reports.push([en,zh]));
 assert.equal(loaded.development.caesar.knownIdeas.filter(id=>id==='cultural-accommodation').length,1);
 assert.equal(loaded.development.caesar.foreignOrigins['cultural-accommodation'],undefined);
 assert.equal(reports.filter(([en])=>en.includes('cultural-accommodation')||en.includes('Cultural Accommodation')).length,1);
});

test('a mine needs local labor and produces less metal when its population falls',()=>{
 const s=newGrandGame('senate'),r=s.regions.find(site=>site.id==='t057'),d=development(s,'senate');
 s.factions.senate.treasury=1000;d.knownMaterial.push('metal-extraction');d.materials.stone=20;d.materials.timber=20;
 r.population=5999;assert.equal(constructionCheck(s,'senate',r.id,'mine').reason,'labor');
 r.population=6000;assert.equal(startConstruction(s,'senate',r.id,'mine').ok,true);
 for(let month=0;month<5;month++)advanceDevelopment(s);
 assert.ok(r.buildings.includes('mine'));
 for(const [population,metal] of [[6000,2],[4500,1],[2500,0],[6200,2]]){
  r.population=population;d.materials.metal=0;advanceDevelopment(s);
  assert.equal(d.materials.metal,metal,`population ${population}`);
  assert.equal(localBuildingEffects(r).upkeep,2);
  assert.equal(mineMetalOutput(r),metal);
 }
 r.population=4500;
 assert.match(constructionPanel(s,'en',r),/current metal output 1\/month/);
 assert.match(constructionPanel(s,'zh',r),/当前金属产量 1\/月/);
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(mineMetalOutput(loaded.regions.find(site=>site.id===r.id)),1);
});

test('grain processing needs a harvest and cannot create food after crops fail or a save reloads',()=>{
 const s=newGrandGame('caesar'),r=s.regions.find(site=>site.owner==='caesar'&&['plain','hills','urban'].includes(site.terrain)&&!site.buildings.length);
 assert.ok(r);const d=development(s,'caesar');s.factions.caesar.treasury=500;
 d.knownMaterial.push('grain-processing');d.materials.stone=20;d.materials.timber=20;
 r.food=0;assert.equal(constructionCheck(s,'caesar',r.id,'grain-mill').reason,'harvest');
 assert.equal(startConstruction(s,'caesar',r.id,'grain-mill').reason,'harvest');
 assert.match(constructionPanel(s,'en',r),/Unavailable: no local grain harvest/);
 assert.match(constructionPanel(s,'zh',r),/不可建：当地没有粮食收成/);
 r.food=1;assert.equal(startConstruction(s,'caesar',r.id,'grain-mill').ok,true);
 for(let month=0;month<3;month++)advanceDevelopment(s);
 assert.ok(r.buildings.includes('grain-mill'));
 const originalBuildings=r.buildings;r.buildings=[];
 const otherBuildingFood=nationalBudget(s,'caesar').buildingFood;
 r.buildings=originalBuildings;
 for(const [harvest,output] of [[1,1],[2,2],[0,0],[3,2]]){
  r.food=harvest;
  assert.equal(localBuildingEffects(r).food,output);
  assert.equal(localBuildingEffects(r).upkeep,1);
  assert.equal(nationalBudget(s,'caesar').buildingFood-otherBuildingFood,output);
 }
 r.food=.75;assert.equal(localBuildingEffects(r).food,.75,'grand-map cells retain their fractional crop yield');
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s)));
 const savedMill=loaded.regions.find(site=>site.id===r.id);savedMill.food=0;
 assert.equal(localBuildingEffects(savedMill).food,0);
 assert.equal(localBuildingEffects(savedMill).upkeep,1);
 assert.match(constructionPanel(loaded,'en',savedMill),/Grain-Processing Facility/);
 assert.match(constructionPanel(loaded,'zh',savedMill),/谷物加工场/);
});

test('policy adoption uses the figure whose expertise matches the actual policy',()=>{
 const s=newGrandGame('senate'),d=development(s,'senate');s.factions.senate.treasury=500;
 const cases=[
  ['rhetorical-education','scholar','varro'],
  ['ancestral-rites','religious','cicero'],
  ['civic-exercise','military','antony'],
  ['cultural-accommodation','statesman','cato'],
  ['public-works','engineer','mamurra']
 ];
 for(const [ideaId,role,personId] of cases){
  d.knownIdeas.push(ideaId);
  const ordinary=ideaAdoptionPlan(s,'senate',ideaId).months;
  const person=s.world.characters[personId];person.faction='senate';person.location='roma';
  s.greatFigures.assignments.senate[role]=personId;
  assert.equal(ideaAdoptionPlan(s,'senate',ideaId).months,ordinary-1,`${role} should advise ${ideaId}`);
  delete s.greatFigures.assignments.senate[role];
 }
 s.greatFigures.assignments.senate.religious='cicero';
 assert.equal(ideaAdoptionPlan(s,'senate','rhetorical-education').months,2,'a religious officer cannot speed rhetorical education');
 delete s.greatFigures.assignments.senate.religious;
 s.greatFigures.assignments.senate.scholar='varro';
 assert.equal(ideaAdoptionPlan(s,'senate','ancestral-rites').months,2,'a scholar does not replace the rites adviser');
 assert.match(ideasPanel(s,'en'),/Adviser: Scholarship · −1 month/);
 assert.match(ideasPanel(s,'zh'),/顾问: 学者 · −1个月/);
});

test('Varro advises agriculture and language research, not unrelated engineering or cultural policies',()=>{
 const s=newGrandGame('senate'),plain=newGrandGame('senate');
 s.world.characters.varro.location='roma';
 s.greatFigures.assignments.senate.scholar='varro';
 for(const [branch,id] of [['material','grain-storage'],['material','grain-processing'],['idea','estate-organization'],['idea','seasonal-labor-contracts'],['idea','rhetorical-education']]){
  const advised=researchTerms(s,'senate',branch,id),ordinary=researchTerms(plain,'senate',branch,id);
  assert.equal(advised.scholar,true,id);
  assert.equal(advised.cost,Math.max(8,ordinary.cost-3),id);
  assert.equal(advised.months,Math.max(1,ordinary.months-1),id);
 }
 for(const [branch,id] of [['material','roadmaking'],['material','shipyard-craft'],['idea','naval-engineering-education'],['idea','ancestral-rites']]){
  const advised=researchTerms(s,'senate',branch,id),ordinary=researchTerms(plain,'senate',branch,id);
  assert.equal(advised.scholar,false,id);
  assert.equal(advised.cost,ordinary.cost,id);
  assert.equal(advised.months,ordinary.months,id);
 }
 const known=s.development.senate.knownIdeas;
 known.push('seasonal-labor-contracts','naval-engineering-education');
 assert.equal(ideaAdoptionPlan(s,'senate','seasonal-labor-contracts').adviserActive,true);
 assert.equal(ideaAdoptionPlan(s,'senate','naval-engineering-education').adviserActive,false);
 assert.match(developmentPanel(s,'en','material'),/Varro advises this subject: cost up to −3¤ \/ time up to −1m/);
 assert.match(developmentPanel(s,'zh','material'),/瓦罗在此领域提供指导：费用最多 −3¤ \/ 时间最多 −1月/);
 const restored=upgradeSave(structuredClone(s));
 assert.equal(researchTerms(restored,'senate','material','grain-processing').scholar,true);
 assert.equal(researchTerms(restored,'senate','material','roadmaking').scholar,false);
});

test('knowledge trade requires a civilian corridor and never charges for an impossible transfer',()=>{
 const s=newGrandGame('caesar');s.relations['caesar:egypt']=60;
 s.factions.caesar.treasury=150;s.factions.egypt.treasury=150;
 const funds=[s.factions.caesar.treasury,s.factions.egypt.treasury];
 for(const site of s.regions)site.owner='rebels';
 s.regions.find(r=>r.id==='cisalpine').owner='caesar';s.regions.find(r=>r.id==='egypt').owner='egypt';
 assert.equal(knowledgeTrade(s,'caesar','egypt','material','water-control').reason,'access');
 assert.equal(sellKnowledge(s,'egypt','caesar','material','water-control').reason,'access');
 assert.equal(exchangeKnowledge(s,'caesar','egypt','material','roadmaking','material','water-control').reason,'access');
 assert.equal(knowledgeAgreementCheck(s,'caesar','egypt').reason,'access');
 assert.deepEqual([s.factions.caesar.treasury,s.factions.egypt.treasury],funds);
 assert.equal(development(s,'caesar').trade.length,0);
});

test('knowledge-sharing waits for a passable route during a temporary blockade',()=>{
 const s=newGrandGame('caesar');s.relations['caesar:egypt']=60;
 s.factions.caesar.treasury=150;s.factions.egypt.treasury=150;
 assert.equal(negotiateKnowledgeAgreement(s,'caesar','egypt').ok,true);
 const owners=new Map(s.regions.map(r=>[r.id,r.owner]));
 for(const site of s.regions)site.owner='rebels';
 s.regions.find(r=>r.id==='cisalpine').owner='caesar';s.regions.find(r=>r.id==='egypt').owner='egypt';
 for(let i=0;i<3;i++)advanceDevelopment(s);
 assert.equal(s.development.caesar.trade.length,0);
 assert.equal(s.development.egypt.trade.length,0);
 assert.equal(s.knowledgeAgreements[0].next,1);
 const restored=upgradeSave(structuredClone(s));
 for(const site of restored.regions)site.owner=owners.get(site.id);
 advanceDevelopment(restored);
 assert.equal(restored.development.caesar.trade.some(t=>t.id==='water-control'),true);
 assert.equal(restored.development.egypt.trade.some(t=>t.id==='roadmaking'),true);
});

test('paid knowledge waits through a closed route and resumes after save reload',()=>{
 const s=newGrandGame('caesar');s.relations['caesar:egypt']=60;s.factions.caesar.treasury=300;
 assert.equal(knowledgeTrade(s,'caesar','egypt','material','water-control').ok,true);
 const paid=s.factions.caesar.treasury,owners=new Map(s.regions.map(r=>[r.id,r.owner]));
 for(const region of s.regions)region.owner='rebels';
 s.regions.find(r=>r.id==='cisalpine').owner='caesar';s.regions.find(r=>r.id==='egypt').owner='egypt';
 advanceDevelopment(s);advanceDevelopment(s);
 assert.equal(s.development.caesar.trade[0].remaining,2);
 assert.equal(s.development.caesar.trade[0].pausedReason,'route');
 assert.ok(!s.development.caesar.knownMaterial.includes('water-control'));
 assert.match(developmentPanel(s,'en','material'),/Paused: civilian route closed/);
 assert.match(developmentPanel(s,'zh','material'),/民间路线中断，传递暂停/);
 const restored=upgradeSave(structuredClone(s));
 for(const region of restored.regions)region.owner=owners.get(region.id);
 advanceDevelopment(restored);assert.equal(restored.development.caesar.trade[0].remaining,1);
 advanceDevelopment(restored);assert.equal(restored.development.caesar.trade.length,0);
 assert.equal(restored.development.caesar.knownMaterial.filter(id=>id==='water-control').length,1);
 assert.equal(restored.factions.caesar.treasury,paid,'resuming must not charge for the knowledge again');
});

test('both directions of a knowledge exchange pause during war',()=>{
 const s=newGrandGame('caesar');s.relations['caesar:egypt']=60;
 s.factions.caesar.treasury=300;s.factions.egypt.treasury=300;
 assert.equal(exchangeKnowledge(s,'caesar','egypt','material','roadmaking','material','water-control').ok,true);
 s.wars.push(['caesar','egypt']);
 advanceDevelopment(s);advanceDevelopment(s);
 assert.equal(s.development.caesar.trade[0].remaining,3);
 assert.equal(s.development.egypt.trade[0].remaining,3);
 assert.equal(s.development.caesar.trade[0].pausedReason,'war');
 assert.match(developmentPanel(s,'en','material'),/Paused by war/);
 assert.match(developmentPanel(s,'zh','material'),/因战争暂停/);
 s.wars=s.wars.filter(w=>!w.includes('caesar')||!w.includes('egypt'));
 advanceDevelopment(s);advanceDevelopment(s);advanceDevelopment(s);
 assert.ok(s.development.caesar.knownMaterial.includes('water-control'));
 assert.ok(s.development.egypt.knownMaterial.includes('roadmaking'));
});

test('a year-long closed route expires pending knowledge without trapping research',()=>{
 const s=newGrandGame('caesar');s.relations['caesar:egypt']=60;s.factions.caesar.treasury=300;
 assert.equal(knowledgeTrade(s,'caesar','egypt','material','water-control').ok,true);
 const paid=s.factions.caesar.treasury,owners=new Map(s.regions.map(r=>[r.id,r.owner]));
 for(const region of s.regions)region.owner='rebels';
 s.regions.find(r=>r.id==='cisalpine').owner='caesar';s.regions.find(r=>r.id==='egypt').owner='egypt';
 for(let i=0;i<6;i++)advanceDevelopment(s);
 assert.equal(s.development.caesar.trade[0].blockedMonths,6);
 assert.match(developmentPanel(s,'en','material'),/6m until expiry; payment not refunded/);
 assert.match(developmentPanel(s,'zh','material'),/6个月后失效；付款不退/);
 const restored=upgradeSave(structuredClone(s)),messages=[];
 for(let i=0;i<6;i++)advanceDevelopment(restored,(en,zh)=>messages.push([en,zh]));
 assert.equal(restored.development.caesar.trade.length,0);
 assert.ok(!restored.development.caesar.knownMaterial.includes('water-control'));
 assert.equal(restored.factions.caesar.treasury,paid);
 assert.ok(messages.some(([en])=>en.includes('expired after a year')));
 for(const region of restored.regions)region.owner=owners.get(region.id);
 assert.equal(researchInnovation(restored,'caesar','material','water-control').ok,true);
});

test('knowledge trade controls follow the real civilian route in both languages',()=>{
 const s=newGrandGame('caesar');s.wars=[];s.relations['caesar:egypt']=50;
 s.factions.caesar.treasury=500;s.factions.egypt.treasury=500;
 const owners=new Map(s.regions.map(r=>[r.id,r.owner]));
 for(const region of s.regions)region.owner='rebels';
 s.regions.find(r=>r.id==='cisalpine').owner='caesar';s.regions.find(r=>r.id==='egypt').owner='egypt';
 const closed=upgradeSave(structuredClone(s));
 assert.equal(knowledgeTrade(closed,'caesar','egypt','material','water-control').reason,'access');
 assert.equal(sellKnowledge(closed,'caesar','egypt','material','roadmaking').reason,'access');
 for(const [lang,note] of [['en','No civilian route'],['zh','民间通道中断']]){
  const html=developmentPanel(closed,lang,'material');
  assert.match(html,new RegExp(note));
  assert.match(html,/data-trade-seller="egypt"[^>]*disabled/);
  assert.match(html,/data-exchange-partner='egypt'[^>]*disabled/);
  assert.match(html,/data-sell-buyer="egypt"[^>]*disabled/);
 }
 closed.development.caesar.offers.push({seller:'egypt',branch:'material',id:'water-control',remaining:4});
 for(const lang of ['en','zh'])assert.match(developmentPanel(closed,lang,'material'),/data-accept-offer-seller="egypt"[^>]*disabled/);
 for(const region of closed.regions)region.owner=owners.get(region.id);
 const open=developmentPanel(closed,'en','material');
 assert.doesNotMatch(open,/data-trade-seller="egypt"[^>]*disabled/);
 assert.doesNotMatch(open,/data-exchange-partner='egypt'[^>]*disabled/);
 assert.doesNotMatch(open,/data-sell-buyer="egypt"[^>]*disabled/);
 assert.doesNotMatch(open,/data-accept-offer-seller="egypt"[^>]*disabled/);
 assert.equal(knowledgeTrade(closed,'caesar','egypt','material','water-control').ok,true);
});

test('grain stores move real food rather than creating a monthly harvest',()=>{
 const s=newGrandGame('egypt'),sites=s.regions.filter(r=>r.owner==='egypt'&&!r.buildings.includes('granary')).slice(0,2);
 assert.equal(sites.length,2);
 const before=nationalBudget(s,'egypt');
 sites[0].buildings.push('granary');sites[1].buildings.push('supply-depot');
 const after=nationalBudget(s,'egypt');
 assert.equal(after.foodNet,before.foodNet,'storage and dispatch capacity must not appear as production');
 assert.equal(after.foodCapacity,before.foodCapacity+46);
 s.factions.egypt.food=50;
 const total=()=>s.factions.egypt.food+sites.reduce((sum,site)=>sum+(site.grainReserve||0),0);
 const original=total();assert.equal(settleGranaryReserves(s,'egypt'),4);
 assert.equal(total(),original);assert.deepEqual(sites.map(site=>site.grainReserve),[2,2]);
 assert.match(constructionPanel(s,'en',sites[1]),/Provincial grain reserve: 2\/12/);
 assert.match(constructionPanel(s,'zh',sites[1]),/地方粮仓储备: 2\/12/);
 assert.match(constructionPanel(s,'zh',sites[1]),/地方储粮容量/);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(sites.map(site=>region(restored,site.id).grainReserve),[2,2]);
 assert.equal(nationalBudget(restored,'egypt').foodNet,before.foodNet);
 region(restored,sites[0].id).grainReserve=0;region(restored,sites[1].id).grainReserve=4;restored.factions.egypt.food=-3;
 assert.equal(settleGranaryReserves(restored,'egypt'),3);
 assert.equal(restored.factions.egypt.food,0);assert.equal(region(restored,sites[1].id).grainReserve,1);
 assert.equal(settleGranaryReserves(restored,'egypt'),0,'reloading and settling cannot release the same food twice');
 const captured=structuredClone(restored);region(captured,sites[1].id).owner='senate';captured.factions.senate.food=-1;
 assert.equal(settleGranaryReserves(captured,'egypt'),0);
 assert.equal(settleGranaryReserves(captured,'senate'),1);
 assert.equal(region(captured,sites[1].id).grainReserve,0);
});

test('a constructed warehouse stores real local grain and transfers its stock on capture',()=>{
 const s=newGrandGame('egypt'),site=region(s,'egypt'),f=s.factions.egypt;
 development(s,'egypt').knownMaterial.push('warehouse-management');
 f.treasury=500;f.food=50;
 const before=nationalBudget(s,'egypt');
 assert.equal(startConstruction(s,'egypt',site.id,'warehouse').ok,true);
 assert.ok(!site.buildings.includes('warehouse'));
 months(s,3);
 assert.ok(site.buildings.includes('warehouse'));
 const after=nationalBudget(s,'egypt');
 assert.equal(after.foodCapacity,before.foodCapacity+40);
 assert.equal(after.foodNet,before.foodNet,'the warehouse does not produce a harvest');
 assert.equal(localBuildingEffects(site).localFoodCapacity,20);
 site.grainReserve=0;f.food=50;
 const total=()=>f.food+site.grainReserve;
 const initial=total();assert.equal(settleGranaryReserves(s,'egypt'),2);
 assert.equal(total(),initial);
 assert.match(constructionPanel(s,'en',site),/Provincial grain reserve: 2\/20/);
 assert.match(constructionPanel(s,'zh',site),/地方粮仓储备: 2\/20/);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(region(saved,site.id).grainReserve,2);
 const captured=structuredClone(saved),capturedSite=region(captured,site.id);
 capturedSite.owner='senate';captured.factions.senate.food=-2;
 assert.equal(settleGranaryReserves(captured,'egypt'),0);
 assert.equal(settleGranaryReserves(captured,'senate'),2);
 assert.equal(captured.factions.senate.food,0);
 assert.equal(capturedSite.grainReserve,0);
 const old=newGrandGame('egypt'),oldSite=region(old,'egypt');
 oldSite.buildings.push('warehouse');delete oldSite.grainReserve;
 old.factions.egypt.food=50;
 const migrated=upgradeSave(JSON.parse(JSON.stringify(old)));
 assert.equal(region(migrated,oldSite.id).grainReserve||0,0);
 assert.equal(migrated.factions.egypt.food,50);
 assert.equal(settleGranaryReserves(migrated,'egypt'),2);
 assert.equal(migrated.factions.egypt.food+region(migrated,oldSite.id).grainReserve,50);
});

test('granaries hold finite provincial food, buffer shortages, and migrate old national storage without duplication',()=>{
 const built=newGrandGame('egypt');
 assert.equal(startConstruction(built,'egypt','egypt','granary').ok,true);
 assert.ok(!built.regions.find(r=>r.id==='egypt').buildings.includes('granary'));
 months(built,3);
 assert.ok(built.regions.find(r=>r.id==='egypt').buildings.includes('granary'));
 assert.ok(built.regions.find(r=>r.id==='egypt').grainReserve>0);
 const state=newGrandGame('egypt'),site=state.regions.find(r=>r.owner==='egypt');
 site.buildings.push('granary');state.factions.egypt.food=50;
 const capacity=nationalBudget(state,'egypt').foodCapacity;
 assert.equal(settleGranaryReserves(state,'egypt'),2);
 assert.equal(site.grainReserve,2);assert.equal(state.factions.egypt.food,48);
 assert.match(constructionPanel(state,'en',site),/Provincial grain reserve: 2\/24/);
 assert.match(constructionPanel(state,'zh',site),/地方粮仓储备: 2\/24/);
 site.grainReserve=8;
 const budget=nationalBudget(state,'egypt');state.factions.egypt.food=-budget.foodNet-2;
 const exposed=structuredClone(state);exposed.regions.find(r=>r.id===site.id).grainReserve=0;
 const startingMen=state.armies.filter(a=>a.owner==='egypt').reduce((n,a)=>n+a.men,0);
 tick(state);tick(exposed);
 assert.equal(state.regions.find(r=>r.id===site.id).grainReserve,6);
 assert.ok(state.factions.egypt.food>=0&&exposed.factions.egypt.food<0);
 assert.equal(state.armies.filter(a=>a.owner==='egypt').reduce((n,a)=>n+a.men,0),startingMen);
 assert.ok(exposed.armies.filter(a=>a.owner==='egypt').reduce((n,a)=>n+a.men,0)<startingMen);
 const reloaded=upgradeSave(JSON.parse(JSON.stringify(state)));
 assert.equal(reloaded.regions.find(r=>r.id===site.id).grainReserve,6);
 const captured=structuredClone(state),capturedSite=captured.regions.find(r=>r.id===site.id);
 capturedSite.owner='senate';captured.factions.senate.food=-3;
 assert.equal(settleGranaryReserves(captured,'egypt'),0);
 assert.equal(settleGranaryReserves(captured,'senate'),3);
 assert.equal(capturedSite.grainReserve,3);
 const older=newGrandGame('egypt'),oldSite=older.regions.find(r=>r.owner==='egypt');oldSite.buildings.push('granary');
 const newLimit=nationalBudget(older,'egypt').foodCapacity;
 older.factions.egypt.food=newLimit+15;delete older.granaryReservesVersion;
 const migrated=upgradeSave(JSON.parse(JSON.stringify(older)));
 assert.equal(migrated.factions.egypt.food,newLimit);
 assert.equal(migrated.regions.find(r=>r.id===oldSite.id).grainReserve,15);
 const again=upgradeSave(JSON.parse(JSON.stringify(migrated)));
 assert.equal(again.factions.egypt.food+again.regions.find(r=>r.id===oldSite.id).grainReserve,newLimit+15);
 assert.equal(capacity,newLimit);
});

test('scholarly patronage connects an owned collection to future idea research only',()=>{
 const id='philosophical-patronage',s=newGrandGame('senate'),d=development(s,'senate'),idea=IDEAS.find(x=>x.id===id);
 s.wars=[];s.factions.senate.treasury=500;s.factions.senate.food=500;
 assert.match(idea.source.url,/en\.wikisource\.org\/wiki\/Letters_to_Atticus\/4\.8a/);
 assert.match(idea.source.title,/Cicero, Letters to Atticus 4\.8a/);
 assert.match(developmentPanel(s,'en','idea'),/Philosophical and Scholarly Patronage/);
 assert.match(developmentPanel(s,'zh','idea'),/哲学与学术赞助/);
 assert.match(developmentPanel(s,'en','idea'),/National-idea research discount \+3/);
 assert.match(developmentPanel(s,'zh','idea'),/理念研究折扣 \+3/);
 assert.equal(researchInnovation(s,'senate','idea',id).ok,true);
 months(s,idea.months);
 assert.ok(d.knownIdeas.includes(id));
 const cash=s.factions.senate.treasury;
 assert.equal(adoptIdea(s,'senate',id).reason,'building');
 assert.equal(s.factions.senate.treasury,cash);
 assert.match(ideasPanel(s,'en'),/Build an owned Private Book Collection first/);
 assert.match(ideasPanel(s,'zh'),/先在领土内建成私人藏书室/);
 d.knownMaterial.push('library-organization');d.materials.stone=20;d.materials.timber=20;
 assert.equal(constructionCheck(s,'senate','roma','library').ok,true);
 assert.equal(startConstruction(s,'senate','roma','library').ok,true);
 assert.equal(ideaAdoptionPlan(s,'senate',id).reason,'building','a project is not yet an active collection');
 months(s,4);
 assert.ok(s.regions.find(r=>r.id==='roma').buildings.includes('library'));
 const ideaBefore=researchTerms(s,'senate','idea','civic-education').cost;
 const materialBefore=researchTerms(s,'senate','material','quarrying').cost;
 assert.equal(adoptIdea(s,'senate',id).ok,true);
 assert.equal(researchTerms(s,'senate','idea','civic-education').cost,ideaBefore,'adoption has a real transition');
 months(s,2);
 assert.equal(d.slots.culture[0],id);
 assert.equal(researchTerms(s,'senate','idea','civic-education').cost,ideaBefore-3);
 assert.equal(researchTerms(s,'senate','material','quarrying').cost,materialBefore);
 assert.equal(nationalBudget(s,'senate').ideaUpkeep,2);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(researchTerms(restored,'senate','idea','civic-education').cost,ideaBefore-3);
});

test('two paid foreign shipments create a dated research lead, not free knowledge',()=>{
 const s=newGrandGame('senate');s.wars=[];s.factions.senate.treasury=300;s.factions.senate.food=100;
 for(const route of s.naval.routes)if(route.id!=='egypt-papyrus')route.pausedBy=[s.regions.find(r=>r.id===route.from).owner];
 const normal=researchTerms(s,'senate','material','water-control');
 s.month=2;advanceNaval(s);
 const first=s.naval.routes.find(r=>r.id==='egypt-papyrus').last;
 assert.equal(first.reason,'enroute');assert.equal(first.amount,0);assert.equal(first.paid,0);
 assert.equal(s.development.senate.merchantLeads.length,0);
 assert.deepEqual(s.naval.routes.find(r=>r.id==='egypt-papyrus').lastDispatch,{year:s.year,month:s.month});
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 for(const month of [3,4,5]){restored.month=month;advanceNaval(restored)}
 const arrived=restored.naval.routes.find(r=>r.id==='egypt-papyrus').last;
 assert.equal(arrived.reason,'delivered');assert.ok(arrived.amount>0&&arrived.paid>0);assert.equal(restored.development.senate.merchantLeads.length,0);
 assert.equal(recordMerchantContact(restored,restored.naval.routes.find(r=>r.id==='egypt-papyrus')),null,'the same calendar month cannot count twice');
 for(const month of [6,7,8,9]){restored.month=month;advanceNaval(restored)}
 const lead=restored.development.senate.merchantLeads.find(x=>x.id==='water-control');
 assert.ok(lead);assert.equal(lead.seller,'egypt');assert.ok(lead.month>=6&&lead.month<=9,'the lead follows two paid deliveries in distinct months');
 const expedition=restored.naval.reports.filter(r=>r.kind==='merchant-expedition'&&r.owner==='senate');
 assert.equal(expedition.length,1,'only the real paid arrival that grants a lead creates the event');
 assert.equal(expedition[0].leadId,lead.id);assert.equal(expedition[0].expiresTurn,lead.expiresTurn);
 assert.ok(expedition[0].paid>0&&expedition[0].amount>0);
 const reportText=(state,lang)=>{const content={innerHTML:''},root={innerHTML:'',querySelector:()=>content,querySelectorAll:()=>[]};renderNavalPanel({state,lang,root,section:'reports',onAction:()=>{},onZone:()=>{},onPort:()=>{}});return content.innerHTML};
 assert.match(reportText(restored,'en'),/SUCCESSFUL MERCHANT EXPEDITION/);
 assert.match(reportText(restored,'zh'),/商船远航成果/);
 const sellerView=upgradeSave(JSON.parse(JSON.stringify(restored)));sellerView.player='egypt';
 assert.doesNotMatch(reportText(sellerView,'en'),/SUCCESSFUL MERCHANT EXPEDITION/,'the research lead belongs to the buyer');
 assert.ok(!restored.development.senate.knownMaterial.includes('water-control'));
 const terms=researchTerms(restored,'senate','material','water-control');
 assert.equal(terms.cost,normal.cost-3);assert.equal(terms.months,normal.months-1);
 const expiring=upgradeSave(JSON.parse(JSON.stringify(restored)));
 assert.match(developmentPanel(restored,'en','material'),/Merchant research lead/);
 assert.match(developmentPanel(restored,'zh','material'),/商贸研究线索/);
 const unrelated=researchTerms(restored,'senate','material','quarrying');
 assert.equal(unrelated.merchant,null);
 const cash=restored.factions.senate.treasury;
 assert.equal(researchInnovation(restored,'senate','material','water-control').ok,true);
 assert.equal(restored.factions.senate.treasury,cash-terms.cost);
 assert.equal(restored.development.senate.research.remaining,terms.months);
 assert.equal(restored.development.senate.merchantLeads.some(x=>x.id==='water-control'),false);
 months(restored,terms.months);
 assert.ok(restored.development.senate.knownMaterial.includes('water-control'));
 const paused=newGrandGame('senate');paused.wars=[];paused.factions.senate.treasury=300;paused.factions.senate.food=100;
 for(const route of paused.naval.routes.filter(r=>paused.regions.find(x=>x.id===r.from)?.owner==='egypt'&&paused.regions.find(x=>x.id===r.to)?.owner==='senate'))route.pausedBy=['senate'];
 for(let month=2;month<=9;month++){paused.month=month;advanceNaval(paused)}
 assert.equal(paused.development.senate.merchantLeads.length,0,'paused trade cannot create a lead');
 const observer=newGrandGame('egypt');observer.wars=[];observer.factions.senate.treasury=300;observer.factions.senate.food=100;
 for(const route of observer.naval.routes)if(route.id!=='egypt-papyrus')route.pausedBy=[observer.regions.find(r=>r.id===route.from).owner];
 for(let month=2;month<=7;month++){observer.month=month;advanceNaval(observer)}
 assert.ok(observer.development.senate.merchantLeads.some(x=>x.id==='water-control'));
 observer.month=8;observer.factions.senate.treasury=500;aiTurn(observer,'senate');
 assert.equal(observer.development.senate.research?.id,'water-control','the AI should use a valid commercial research opportunity');
 const leadMonth=lead.year*12+lead.month;
 expiring.year=Math.floor((leadMonth+4)/12);expiring.month=leadMonth+5-expiring.year*12;
 assert.ok(researchTerms(expiring,'senate','material','water-control').merchant);
 expiring.year=Math.floor((leadMonth+5)/12);expiring.month=leadMonth+6-expiring.year*12;
 assert.equal(researchTerms(expiring,'senate','material','water-control').merchant,null);
});

test('Egyptian multiscript decrees require adoption and affect only Egyptian-culture integration',()=>{
 const id='egyptian-multiscript-decrees',idea=IDEAS.find(x=>x.id===id),s=newGrandGame('egypt');
 assert.match(idea.source.url,/britishmuseum\.org/);
 assert.match(developmentPanel(s,'en','idea'),/Egyptian Multiscript Decrees/);
 assert.match(developmentPanel(s,'zh','idea'),/埃及多文字诏令/);
 assert.match(developmentPanel(s,'en','idea'),/Egyptian-culture territories \/ month \+1/);
 assert.match(developmentPanel(s,'zh','idea'),/埃及文化领土行政融合度 \/ 月 \+1/);
 s.wars=[];s.factions.egypt.treasury=500;
 const d=development(s,'egypt');
 assert.equal(researchInnovation(s,'egypt','idea',id).ok,true);
 assert.equal(activeEffects(s,'egypt').egyptianDecrees,undefined);
 months(s,idea.months);
 assert.ok(d.knownIdeas.includes(id));
 assert.equal(activeEffects(s,'egypt').egyptianDecrees,undefined);
 assert.equal(adoptIdea(s,'egypt',id).ok,true);
 assert.equal(activeEffects(s,'egypt').egyptianDecrees,undefined);
 months(s,2);
 assert.equal(d.slots.government[0],id);
 const control=upgradeSave(JSON.parse(JSON.stringify(s)));
 development(control,'egypt').slots.government[0]=null;
 const egyptian=s.regions.find(r=>r.owner==='egypt'&&r.culture==='egypt');
 const other=s.regions.find(r=>r.culture!=='egypt'&&r.owner!=='rebels');
 other.owner='egypt';control.regions.find(r=>r.id===other.id).owner='egypt';
 const beforeUpkeep=nationalBudget(control,'egypt').ideaUpkeep;
 assert.equal(nationalBudget(s,'egypt').ideaUpkeep,beforeUpkeep+2);
 tick(s);tick(control);
 assert.equal(egyptian.integration,control.regions.find(r=>r.id===egyptian.id).integration+1);
 assert.equal(other.integration,control.regions.find(r=>r.id===other.id).integration);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(activeEffects(restored,'egypt').egyptianDecrees,1);
 assert.equal(restored.regions.find(r=>r.id===egyptian.id).integration,egyptian.integration);
 const foreign=newGrandGame('senate');foreign.wars=[];foreign.factions.senate.treasury=500;
 const foreignIdea=development(foreign,'senate');foreignIdea.knownIdeas.push(id);
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).months,4,'a foreign ruler must adapt the practice even after direct research');
 assert.match(ideasPanel(foreign,'en'),/Foreign adaptation adds time/);
 assert.match(ideasPanel(foreign,'zh'),/外来理念适应增加时间/);
 const nile=foreign.regions.find(r=>r.culture==='egypt');nile.owner='senate';
 const foreignControl=upgradeSave(JSON.parse(JSON.stringify(foreign)));
 foreignIdea.slots.government[0]=id;
 tick(foreign);tick(foreignControl);
 assert.equal(nile.integration,foreignControl.regions.find(r=>r.id===nile.id).integration+1);
});

test('Bosporan grain stewardship requires adoption, a productive local port, and monthly upkeep',()=>{
 const id='bosporan-grain-stewardship',idea=IDEAS.find(x=>x.id===id),s=newGrandGame('bosporus');
 assert.match(idea.source.url,/Strabo\/7D/);
 assert.ok(techIllustration(idea).includes('<svg'));
 assert.match(developmentPanel(s,'en','idea'),/Bosporan Grain Stewardship/);
 assert.match(developmentPanel(s,'zh','idea'),/博斯普鲁斯谷物统筹/);
 assert.match(ideasPanel(s,'en'),/productive Bosporan-culture ports/);
 assert.match(ideasPanel(s,'zh'),/博斯普鲁斯文化港口/);
 s.wars=[];s.factions.bosporus.treasury=500;
 const d=development(s,'bosporus');
 assert.equal(researchInnovation(s,'bosporus','idea',id).ok,true);
 assert.equal(activeEffects(s,'bosporus').bosporanGrainStewardship,undefined);
 months(s,idea.months);
 assert.ok(d.knownIdeas.includes(id));
 assert.equal(activeEffects(s,'bosporus').bosporanGrainStewardship,undefined);
 assert.equal(adoptIdea(s,'bosporus',id).ok,true);
 assert.equal(activeEffects(s,'bosporus').bosporanGrainStewardship,undefined);
 months(s,2);
 assert.equal(d.slots.economy[0],id);
 const control=upgradeSave(JSON.parse(JSON.stringify(s)));
 development(control,'bosporus').slots.economy[0]=null;
 assert.equal(nationalBudget(s,'bosporus').ideaFood,nationalBudget(control,'bosporus').ideaFood+2);
 assert.equal(nationalBudget(s,'bosporus').ideaUpkeep,nationalBudget(control,'bosporus').ideaUpkeep+2);
 s.factions.bosporus.food=20;control.factions.bosporus.food=20;
 tick(s);tick(control);
 assert.equal(s.factions.bosporus.food,control.factions.bosporus.food+2);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(activeEffects(restored,'bosporus').bosporanGrainStewardship,1);
 const ports=restored.regions.filter(r=>r.owner==='bosporus'&&r.culture==='bosporus'&&r.port&&r.food>=2);
 ports[0].port=false;
 assert.equal(nationalBudget(restored,'bosporus').ideaFood,nationalBudget(control,'bosporus').ideaFood+1);
 ports[1].culture='hellenic';
 assert.equal(nationalBudget(restored,'bosporus').ideaFood,nationalBudget(control,'bosporus').ideaFood);
 const foreign=newGrandGame('senate');foreign.wars=[];foreign.factions.senate.treasury=500;
 development(foreign,'senate').knownIdeas.push(id);
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).reason,'cultural-base');
 const coast=foreign.regions.find(r=>r.culture==='bosporus');coast.owner='senate';coast.civicSatisfaction=44;
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).reason,'local-support');
 coast.civicSatisfaction=50;
 assert.equal(ideaAdoptionPlan(foreign,'senate',id).ok,true);
});

test('foreign multiscript policy needs an Egyptian community willing to receive it',()=>{
 const id='egyptian-multiscript-decrees',s=newGrandGame('senate');s.wars=[];s.factions.senate.treasury=500;
 const d=development(s,'senate');d.knownIdeas.push(id);
 const treasury=s.factions.senate.treasury;
 assert.equal(ideaAdoptionPlan(s,'senate',id).reason,'cultural-base');
 assert.equal(adoptIdea(s,'senate',id).reason,'cultural-base');
 assert.equal(s.factions.senate.treasury,treasury);
 assert.match(ideasPanel(s,'en'),/Requires an owned territory of the originating culture/);
 assert.match(ideasPanel(s,'zh'),/需要统治该理念起源文化的领土/);
 const nile=s.regions.find(r=>r.culture==='egypt');nile.owner='senate';nile.civicSatisfaction=44;
 assert.equal(ideaAdoptionPlan(s,'senate',id).reason,'local-support');
 assert.match(ideasPanel(s,'en'),/Local satisfaction must reach 45/);
 assert.match(ideasPanel(s,'zh'),/当地满意度须达到45/);
 nile.civicSatisfaction=80;
 const plan=ideaAdoptionPlan(s,'senate',id);assert.equal(plan.ok,true);assert.equal(plan.months,4);
 assert.equal(adoptIdea(s,'senate',id).ok,true);assert.equal(s.factions.senate.treasury,treasury-plan.cost);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(restored.development.senate.adoption.remaining,4);
 months(restored,4);
 assert.equal(restored.development.senate.slots.government[0],id);
});

test('Achaean assembly practice is local, paid, slow to adopt and culturally gated abroad',()=>{
 const id='achaean-assembly-practice',idea=IDEAS.find(x=>x.id===id),s=newGrandGame('senate');
 assert.match(idea.source.url,/Polybius\/4/);
 assert.ok(techIllustration(idea).includes('<svg'));
 assert.match(developmentPanel(s,'en','idea'),/Achaean Assembly Practice/);
 assert.match(developmentPanel(s,'zh','idea'),/亚该亚议事传统/);
 assert.match(ideasPanel(s,'en'),/Hellenic-culture territory with integration/);
 assert.match(ideasPanel(s,'zh'),/希腊文化领土且融合度/);
 s.wars=[];s.factions.senate.treasury=500;
 const d=development(s,'senate');
 assert.equal(researchInnovation(s,'senate','idea',id).ok,true);
 assert.equal(activeEffects(s,'senate').hellenicCouncil,undefined);
 months(s,idea.months);
 assert.ok(d.knownIdeas.includes(id));
 assert.equal(activeEffects(s,'senate').hellenicCouncil,undefined);
 assert.equal(adoptIdea(s,'senate',id).ok,true);
 assert.equal(activeEffects(s,'senate').hellenicCouncil,undefined);
 months(s,4);
 assert.equal(d.slots.government[0],id);
 assert.equal(activeEffects(s,'senate').decisionDelay,1);
 const eligible=s.regions.find(r=>r.owner==='senate'&&r.culture==='hellenic');
 const low=s.regions.find(r=>r.owner==='senate'&&r.culture==='hellenic'&&r.id!==eligible.id);
 const other=s.regions.find(r=>r.culture!=='hellenic'&&r.owner!=='rebels');
 other.owner='senate';eligible.integration=60;eligible.civicSatisfaction=50;
 low.integration=44;low.civicSatisfaction=50;
 other.integration=60;other.civicSatisfaction=50;
 const control=upgradeSave(JSON.parse(JSON.stringify(s)));
 development(control,'senate').slots.government[0]=null;
 assert.equal(nationalBudget(s,'senate').ideaUpkeep,nationalBudget(control,'senate').ideaUpkeep+2);
 months(s,3);months(control,3);
 const compared=id=>control.regions.find(r=>r.id===id);
 assert.equal(eligible.civicSatisfaction,compared(eligible.id).civicSatisfaction+1);
 assert.equal(low.civicSatisfaction,compared(low.id).civicSatisfaction);
 assert.equal(other.civicSatisfaction,compared(other.id).civicSatisfaction);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(activeEffects(restored,'senate').hellenicCouncil,1);

 const foreign=newGrandGame('egypt');foreign.wars=[];foreign.factions.egypt.treasury=500;
 development(foreign,'egypt').knownIdeas.push(id);
 assert.equal(ideaAdoptionPlan(foreign,'egypt',id).reason,'cultural-base');
 const polis=foreign.regions.find(r=>r.culture==='hellenic');polis.owner='egypt';polis.civicSatisfaction=44;
 assert.equal(ideaAdoptionPlan(foreign,'egypt',id).reason,'local-support');
 polis.civicSatisfaction=45;
 const plan=ideaAdoptionPlan(foreign,'egypt',id);
 assert.equal(plan.ok,true);assert.equal(plan.months,4);
 assert.equal(adoptIdea(foreign,'egypt',id).ok,true);
 assert.equal(foreign.development.egypt.adoption.remaining,4);
});

test('monthly budget records paid construction and research orders without double counting',()=>{
 const s=newGrandGame('senate');s.factions.senate.treasury=500;
 const projected=nationalBudget(s,'senate').projectedNet;
 assert.deepEqual(expensesThisMonth(s,'senate'),{construction:0,research:0,policy:0,materials:0});
 const researchBefore=s.factions.senate.treasury;
 assert.equal(researchInnovation(s,'senate','material','water-control').ok,true);
 const researchCost=researchBefore-s.factions.senate.treasury;
 const constructionCost=constructionCheck(s,'senate','roma','road').cost;
 assert.equal(startConstruction(s,'senate','roma','road').ok,true);
 const secondCost=constructionCheck(s,'senate','italiaS','road').cost;
 assert.equal(startConstruction(s,'senate','italiaS','road').ok,true);
 const constructionTotal=constructionCost+secondCost;
 assert.deepEqual(expensesThisMonth(s,'senate'),{construction:constructionTotal,research:researchCost,policy:0,materials:0});
 assert.equal(researchInnovation(s,'senate','material','water-control').ok,false);
 assert.equal(startConstruction(s,'senate','roma','road').ok,false);
 assert.deepEqual(expensesThisMonth(s,'senate'),{construction:constructionTotal,research:researchCost,policy:0,materials:0});
 assert.equal(nationalBudget(s,'senate').projectedNet,projected,'one-time orders must remain separate from the monthly projection');
 for(const [lang,construction,research] of [['en','Construction paid this month','Research paid this month'],['zh','本月已付建造费','本月已付研究费']]){
  const html=budgetHtml(s,lang);
  assert.match(html,new RegExp(`${construction}</td><td>-${constructionTotal}`));
  assert.match(html,new RegExp(`${research}</td><td>-${researchCost}`));
 }
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.deepEqual(expensesThisMonth(restored,'senate'),{construction:constructionTotal,research:researchCost,policy:0,materials:0});
 tick(restored);
 assert.deepEqual(expensesThisMonth(restored,'senate'),{construction:0,research:0,policy:0,materials:0});
});

test('construction-material purchases appear once in the monthly budget and survive reload',()=>{
 const s=newGrandGame('senate'),d=development(s,'senate');s.factions.senate.treasury=100;
 const projected=nationalBudget(s,'senate').projectedNet,startingTreasury=s.factions.senate.treasury;
 assert.deepEqual([purchaseMaterials(s,'senate','stone',5),purchaseMaterials(s,'senate','timber',5),purchaseMaterials(s,'senate','metal',2)].map(result=>result.cost),[10,10,8]);
 assert.equal(startingTreasury-s.factions.senate.treasury,28);
 assert.deepEqual(expensesThisMonth(s,'senate'),{construction:0,research:0,policy:0,materials:28});
 assert.equal(nationalBudget(s,'senate').projectedNet,projected,'one-time procurement must not change the projected monthly rate');
 for(const [lang,label] of [['en','Construction materials bought this month'],['zh','本月已付建筑材料采购费']])assert.match(budgetHtml(s,lang),new RegExp(`${label}</td><td>-28`));
 const before=JSON.stringify(d.materials);s.factions.senate.treasury=0;
 assert.equal(purchaseMaterials(s,'senate','stone').reason,'treasury');
 assert.equal(JSON.stringify(d.materials),before);
 assert.equal(expensesThisMonth(s,'senate').materials,28,'failed orders cannot record another charge');
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(expensesThisMonth(restored,'senate').materials,28);
 tick(restored);assert.equal(expensesThisMonth(restored,'senate').materials,0);
});

test('idea transitions and slot expansion appear once in the monthly budget, including old saves',()=>{
 const s=newGrandGame('senate'),d=development(s,'senate');s.factions.senate.treasury=500;
 d.knownIdeas.push('senatorial-consultation','central-administration');
 s.regions.find(r=>r.owner==='senate').buildings.push('administration');
 s.expenseLedger={year:s.year,month:s.month,owners:{senate:{construction:7,research:3}}};
 assert.equal(adoptIdea(s,'senate','senatorial-consultation').ok,true);
 assert.equal(expandIdeaSlot(s,'senate','government').ok,true);
 assert.deepEqual(expensesThisMonth(s,'senate'),{construction:7,research:3,policy:47,materials:0});
 assert.equal(adoptIdea(s,'senate','senatorial-consultation').ok,false);
 assert.equal(expandIdeaSlot(s,'senate','government').ok,false);
 assert.equal(expensesThisMonth(s,'senate').policy,47);
 for(const [lang,label] of [['en','Idea and slot changes paid this month'],['zh','本月已付理念与槽位变更费']])assert.match(budgetHtml(s,lang),new RegExp(`${label}</td><td>-47`));
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(expensesThisMonth(restored,'senate').policy,47);
 tick(restored);assert.equal(expensesThisMonth(restored,'senate').policy,0);
 const removal=newGrandGame('senate'),removalDevelopment=development(removal,'senate');
 removalDevelopment.knownIdeas.push('senatorial-consultation');removalDevelopment.slots.government[0]='senatorial-consultation';
 assert.equal(removeIdea(removal,'senate','government').ok,true);
 assert.equal(removeIdea(removal,'senate','government').ok,false);
 assert.equal(expensesThisMonth(removal,'senate').policy,5);
});

test('every development node has its own interpretive illustration',()=>{
 const art=[...MATERIALS,...IDEAS].map(item=>techIllustration(item));
 assert.equal(art.length,MATERIALS.length+IDEAS.length);assert.equal(new Set(art).size,art.length);
 assert.ok(art.every(svg=>svg.includes('<svg')&&svg.includes('tech-art-mark')));
});

test('each constructed building has its own bilingual encyclopedia entry and historical link',()=>{
 const english=new Set(),chinese=new Set();
 for(const building of BUILDINGS){
  const invention=MATERIALS.find(item=>item.id===building.tech);
  assert.ok(invention,building.id);
  assert.ok(building.context?.[0]&&building.context?.[1],building.id);
  assert.notEqual(building.context[0],invention.context[0],building.id);
  assert.ok(!english.has(building.context[0])&&!chinese.has(building.context[1]),building.id);
  assert.match((building.source||invention.source)?.url||'',/^https:\/\//,building.id);
  english.add(building.context[0]);chinese.add(building.context[1]);
 }
 const s=newGrandGame('senate'),en=developmentPanel(s,'en','material'),zh=developmentPanel(s,'zh','material');
 assert.match(en,/A game depot stores and contributes finite food/);
 assert.match(zh,/游戏军需仓储存并提供有限粮食/);
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

test('local rites affect a neighboring court only through an influential shared border cult',()=>{
 const s=newGrandGame('senate'),cash=s.factions.senate.treasury;
 assert.equal(relation(s,'senate','numidia'),25);
 assert.equal(provincialRitesCredit(s,'senate','numidia'),0);
 assert.equal(diplomacy(s,'senate','numidia','alliance'),false);
 assert.equal(setReligiousPolicy(s,'senate','local-rites').ok,true);
 assert.equal(s.factions.senate.treasury,cash-18);
 assert.equal(provincialRitesCredit(s,'senate','numidia'),0,'the policy transition has not finished');
 for(let i=0;i<3;i++)advanceReligion(s);
 assert.equal(provincialRitesCredit(s,'senate','numidia'),5);
 assert.equal(provincialRitesCredit(s,'senate','caesar'),0,'shared Roman rites are not a foreign border cult');
 assert.equal(provincialRitesCredit(s,'senate','bosporus'),0,'a distant court gets no border-rites credit');
 assert.equal(relation(s,'senate','numidia'),25,'the modifier does not silently rewrite relations');
 const saved=upgradeSave(structuredClone(s));
 assert.equal(provincialRitesCredit(saved,'senate','numidia'),5);
 assert.equal(diplomacy(saved,'senate','numidia','alliance'),true);
 const imposed=newGrandGame('senate');
 assert.equal(setReligiousPolicy(imposed,'senate','civic-patronage').ok,true);
 for(let i=0;i<3;i++)advanceReligion(imposed);
 assert.equal(provincialRitesCredit(imposed,'senate','numidia'),-5);
 for(const id of ['africa','t102'])imposed.regions.find(r=>r.id===id).priesthood.influence=20;
 assert.equal(provincialRitesCredit(imposed,'senate','numidia'),0,'a weak priesthood has no court credit');
 const calendar=newGrandGame('senate');calendar.wars=[];
 assert.equal(setReligiousPolicy(calendar,'senate','local-rites').ok,true);
 months(calendar,3);
 assert.equal(provincialRitesCredit(calendar,'senate','numidia'),5,'normal monthly turns complete the policy transition');
 const legacy=structuredClone(calendar);delete legacy.religion;
 assert.equal(provincialRitesCredit(upgradeSave(legacy),'senate','numidia'),0,'older saves begin with customary policy');
});

test('five categories begin with one independent inactive slot and research alone has no effect',()=>{
  const s=newGame();s.wars=[];s.alliances.push(['caesar','senate']);const d=development(s,'caesar');
  assert.equal(IDEA_CATEGORIES.length,5);assert.equal(IDEAS.length,50);assert.equal(MATERIALS.length,34);assert.equal(BUILDINGS.length,33);
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

test('idea slot expansion shows its real requirements, upkeep and dated progress in both languages',()=>{
  const s=newGame('caesar'),d=development(s,'caesar');s.factions.caesar.treasury=500;
  d.knownIdeas.push('legion-training');
  let plan=ideaSlotExpansionCheck(s,'caesar','military');
  assert.equal(plan.reason,'knowledge');assert.equal(plan.known,1);assert.equal(plan.requiredKnown,2);assert.equal(plan.monthlyUpkeep,1);
  assert.match(ideasPanel(s,'en'),/Known ideas 1\/2[\s\S]*Administration or education[\s\S]*Treasury 500\/35¤/);
  assert.match(ideasPanel(s,'zh'),/已知理念 1\/2[\s\S]*行政或教育制度[\s\S]*国库 500\/35¤/);
  d.knownIdeas.push('frontier-defense');
  plan=ideaSlotExpansionCheck(s,'caesar','military');assert.equal(plan.reason,'institution');
  d.slots.government[0]='senatorial-consultation';
  plan=ideaSlotExpansionCheck(s,'caesar','military');assert.equal(plan.ok,true);
  assert.match(ideasPanel(s,'en'),/After completion: \+ 1¤ administrative upkeep \/ month/);
  assert.match(ideasPanel(s,'zh'),/完工后：每月增加 1¤ 行政维护费/);
  assert.equal(expandIdeaSlot(s,'caesar','military').ok,true);
  assert.match(ideasPanel(s,'en'),/Slot expansion in progress · 6m remaining/);
  assert.match(ideasPanel(s,'zh'),/栏位扩建中 · 6个月剩余/);
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

test('provincial rites accord needs an adopted idea, local rites, and a substantial minority',()=>{
 const s=newGrandGame('caesar'),d=development(s,'caesar'),province=s.regions.find(r=>r.id==='egypt');
 province.owner='caesar';province.integration=30;s.month=3;s.wars=[];
 const idea=IDEAS.find(x=>x.id==='provincial-rites-charter');
 assert.match(idea.source.url,/verres24_3/);
 assert.match(techIllustration(idea),/<svg/);
 assert.match(developmentPanel(s,'en','idea'),/Provincial Rites Accord/);
 assert.match(developmentPanel(s,'zh','idea'),/地方祭仪协定/);
 const baseline=faithSatisfaction(s,province);
 d.slots.culture[0]='cultural-accommodation';
 assert.equal(faithSatisfaction(s,province),baseline);
 d.slots.culture[0]=null;
 s.factions.caesar.treasury=500;
 assert.equal(researchInnovation(s,'caesar','idea',idea.id).ok,true);
 assert.equal(faithSatisfaction(s,province),baseline);
 months(s,idea.months);
 assert.ok(d.knownIdeas.includes(idea.id));
 assert.equal(adoptIdea(s,'caesar',idea.id,0).ok,true);
 assert.equal(activeEffects(s,'caesar').provincialRitesCharter,undefined);
 months(s,d.adoption.remaining);
 assert.equal(d.slots.culture[0],idea.id);
 const before=nationalBudget(s,'caesar').ideaUpkeep;
 assert.ok(before>=idea.effects.upkeep);
 province.owner='caesar';province.integration=30;s.month=3;
 assert.equal(faithSatisfaction(s,province),baseline);
 s.religion.caesar.policy='local-rites';
 assert.equal(faithSatisfaction(s,province),2);
 province.faiths=[{id:'egyptian-cults',share:80},{id:'roman-cults',share:20}];
 assert.equal(faithSatisfaction(s,province),1);
 province.faiths=[{id:'egyptian-cults',share:70},{id:'roman-cults',share:30}];
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(faithSatisfaction(saved,saved.regions.find(r=>r.id==='egypt')),2);
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
 assert.equal(ideaCompatibility(s,'caesar','provincial-rites-charter',0).ok,true);
 d.slots.culture.push(null);
 assert.equal(ideaCompatibility(s,'caesar','provincial-rites-charter',1).reason,'conflict');
 assert.equal(ideaCompatibility(s,'caesar','cultural-accommodation',1).ok,true);
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
 assert.match(idea.source.url,/classics\.mit\.edu\/Aristotle\/politics\.8\.eight\.html/);
 assert.match(idea.source.title,/Aristotle, Politics VIII\.4/);
 assert.match(idea.context[0],/criticizes excessive Spartan severity/);
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

test('seasonal free labor has paid adoption, rural output, migration and an estate conflict',()=>{
 const idea=IDEAS.find(x=>x.id==='seasonal-labor-contracts');
 assert.deepEqual(idea.prerequisites,['estate-organization']);
 assert.ok(idea.conflicts.includes('estate-labor-control'));
 assert.match(idea.source.url,/Varro\/de_Re_Rustica/);
 assert.ok(techIllustration(idea).includes('<svg'));
 for(const [lang,name,migration] of [['en','Seasonal Free-Labor Contracts','distressed outmigration cap 300'],['zh','季节性自由劳工契约','不满人口迁出上限 300']]){
  const html=developmentPanel(newGrandGame('egypt'),lang,'idea');
  assert.ok(html.includes(name)&&html.includes(migration));
 }
 const researching=newGrandGame('egypt');researching.wars=[];researching.factions.egypt.treasury=500;
 assert.equal(researchInnovation(researching,'egypt','idea',idea.id).reason,'prerequisite');
 development(researching,'egypt').knownIdeas.push('estate-organization');
 assert.equal(researchInnovation(researching,'egypt','idea',idea.id).ok,true);
 assert.equal(activeEffects(researching,'egypt').seasonalLabor,undefined);
 months(researching,3);
 assert.equal(adoptIdea(researching,'egypt',idea.id,0).ok,true);
 assert.equal(activeEffects(researching,'egypt').seasonalLabor,undefined);
 months(researching,2);
 assert.equal(activeEffects(researching,'egypt').seasonalLabor,1);
 const base=newGrandGame('egypt');base.wars=[];base.month=2;
 const ordinary=upgradeSave(JSON.parse(JSON.stringify(base))),hired=upgradeSave(JSON.parse(JSON.stringify(base)));
 development(hired,'egypt').slots.economy[0]=idea.id;
 const before=nationalBudget(ordinary,'egypt'),after=nationalBudget(hired,'egypt');
 assert.equal(after.seasonalFood,2);
 assert.equal(after.foodNet,before.foodNet+2);
 assert.equal(after.ideaUpkeep,before.ideaUpkeep+3);
 assert.match(budgetHtml(hired,'en'),/seasonal labor/);
 assert.match(budgetHtml(hired,'zh'),/季节雇工/);
 for(const state of [ordinary,hired]){
  const from=state.regions.find(r=>r.id==='t111'),to=state.regions.find(r=>r.id==='t112');
  from.population=100000;from.civicSatisfaction=20;to.civicSatisfaction=80;
 }
 advanceDemography(ordinary);advanceDemography(hired);
 assert.equal(ordinary.regions.find(r=>r.id==='t111').population,99850);
 assert.equal(hired.regions.find(r=>r.id==='t111').population,99700);
 const restored=upgradeSave(JSON.parse(JSON.stringify(hired)));
 assert.equal(activeEffects(restored,'egypt').seasonalLabor,1);
 assert.equal(nationalBudget(restored,'egypt').seasonalFood,2);
 development(restored,'egypt').knownIdeas.push('estate-labor-control');
 development(restored,'egypt').slots.economy.push(null);
 assert.equal(ideaCompatibility(restored,'egypt','estate-labor-control',1).reason,'conflict');
});

test('AI waits for a productive rural province before funding estate-only labor ideas',()=>{
 const opening=newGrandGame('egypt');
 for(const productive of [false,true]){
  const state=upgradeSave(JSON.parse(JSON.stringify(opening))),d=development(state,'galatia');
  d.knownIdeas.push('estate-organization','seasonal-labor-contracts');
  d.slots.economy=['estate-organization',null];
  state.factions.galatia.treasury=700;state.month=1;
  if(productive){const site=state.regions.find(r=>r.owner==='galatia');site.terrain='plain';site.food=2}
  aiTurn(state,'galatia');
  assert.equal(d.adoption?.ideaId,productive?'seasonal-labor-contracts':undefined);
 }
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
  assert.equal(activeEffects(s,'caesar').culturalAccommodation,undefined);
  assert.equal(adoptIdea(s,'caesar','cultural-accommodation',0).ok,true);
  months(s,2);assert.equal(activeEffects(s,'caesar').culturalAccommodation,undefined);
  months(s,2);assert.equal(activeEffects(s,'caesar').culturalAccommodation,1);
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
test('a grand-campaign dry July cannot erase more than two months of each exposed theater harvest',()=>{
 const s=newGrandGame('caesar');s.year=-48;s.month=6;s.wars=[];s.factions.caesar.food=50;
 const atRisk=s.regions.filter(r=>r.owner==='caesar'&&['plain','desert'].includes(r.terrain)&&([...r.id].reduce((n,c)=>n+c.charCodeAt(0),0)+Math.abs(s.year)*7)%9===0);
 const maximum=atRisk.reduce((n,r)=>n+Math.min(8,Math.ceil(Math.max(0,r.food)*2)),0);
 assert.ok(atRisk.length>=2);
 const expectedWithoutWeather=s.factions.caesar.food+nationalBudget(s,'caesar').foodNet;
 tick(s);
 assert.ok(expectedWithoutWeather-s.factions.caesar.food<=maximum);
});
test('road and bridge construction shortens relevant grand-campaign travel',()=>{
 const edge={sea:false,distance:350,river:true},destination={terrain:'plain',buildings:[]},origin={buildings:[]};
 const baseline=edgeMonths(edge,destination,origin);origin.buildings.push('road');assert.equal(edgeMonths(edge,destination,origin),baseline-1);
 origin.buildings.push('bridge');assert.equal(edgeMonths(edge,destination,origin),baseline-2);
});
test('a sea crossing uses its embarkation shipyard but cannot borrow a land road',()=>{
 const edge={sea:true,distance:350,road:true,river:true},destination={terrain:'plain',buildings:['road','bridge','shipyard']},origin={buildings:[]};
 const ordinary=edgeMonths(edge,destination,origin);
 assert.equal(ordinary,3,'road and bridge flags must not speed a sea link');
 origin.buildings.push('shipyard');assert.equal(edgeMonths(edge,destination,origin),ordinary-1);
 const s=newGrandGame('senate'),army=s.armies.find(unit=>unit.owner==='senate'),port=s.regions.find(site=>site.id==='italiaS');army.region=port.id;
 const improved=previewMarch(s,army.id,'t075');assert.equal(improved.ok,true);assert.equal(improved.path[0].sea,true);
 port.buildings=port.buildings.filter(id=>id!=='shipyard');
 const ordinaryRoute=previewMarch(s,army.id,'t075');assert.equal(ordinaryRoute.ok,true);
 assert.equal(ordinaryRoute.months,improved.months+1,'the live route preview must use the built embarkation shipyard');
});
test('field-march coordination changes paid, active land orders but not known-only or sea orders',()=>{
 const s=newGame('caesar'),d=development(s,'caesar'),idea=IDEAS.find(x=>x.id==='field-march-coordination');
 assert.deepEqual(idea.prerequisites,['legion-training']);
 assert.equal(researchInnovation(s,'caesar','idea',idea.id).ok,false,'the prerequisite matters');
 const baseline=previewMarch(s,'xiii','narbo').months;
 assert.equal(baseline,2);
 d.knownIdeas.push('legion-training',idea.id);
 assert.equal(previewMarch(s,'xiii','narbo').months,baseline,'knowing the idea is not adopting it');
 const upkeep=nationalBudget(s,'caesar').ideaUpkeep;
 d.slots.military[0]=idea.id;
 assert.equal(previewMarch(s,'xiii','narbo').months,baseline-1);
 assert.equal(nationalBudget(s,'caesar').ideaUpkeep,upkeep+3);
 assert.equal(edgeMonths({sea:true,distance:300},{terrain:'plain',buildings:[]},null,1),edgeMonths({sea:true,distance:300},{terrain:'plain',buildings:[]}));
 assert.equal(moveArmy(s,'xiii','narbo').ok,true);
 assert.equal(s.armies.find(a=>a.id==='xiii').move.remaining,1);
 const grand=newGrandGame('caesar'),legion=grand.armies.find(a=>a.id==='xiii'),war=(state,a,b)=>state.wars.some(w=>w.includes(a)&&w.includes(b));
 const before=grandRoute(grand,legion,'t024',war).months;
 const gd=development(grand,'caesar');gd.knownIdeas.push('legion-training',idea.id);gd.slots.military[0]=idea.id;
 assert.equal(grandRoute(grand,legion,'t024',war).months,before-1);
 assert.equal(grandRoute(upgradeSave(JSON.parse(JSON.stringify(grand))),legion,'t024',war).months,before-1);
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
  assert.deepEqual(Object.values(d.slots).flat(),plan,`${player} treasury ${s.factions[player].treasury}, paid trade ${s.naval.routes.filter(r=>r.last?.seller===player).reduce((sum,r)=>sum+(r.last.paid||0),0)}`);
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
test('AI studies a usable replacement when its only learned idea needs a lost institution',()=>{
 const prepare=known=>{
  const s=newGame('senate'),d=development(s,'egypt');
  s.month=4;s.factions.egypt.treasury=500;d.knownMaterial=MATERIALS.map(item=>item.id);
  for(const [category,id] of Object.entries({military:'frontier-defense',government:'public-legal-reference',diplomacy:'diplomatic-accommodation',economy:'tax-farming'})){
   d.knownIdeas.push(id);d.slots[category][0]=id;
  }
  d.knownIdeas.push(known);return s;
 };
 let s=prepare('philosophical-patronage'),d=development(s,'egypt');
 assert.equal(ideaAdoptionPlan(s,'egypt','philosophical-patronage').reason,'building');
 const before=s.factions.egypt.treasury;
 aiTurn(s,'egypt');
 assert.equal(d.research?.branch,'idea');assert.equal(IDEAS.find(item=>item.id===d.research.id)?.category,'culture');
 assert.notEqual(d.research.id,'philosophical-patronage');assert.ok(s.factions.egypt.treasury<before,'replacement research is paid');
 s=upgradeSave(JSON.parse(JSON.stringify(s)));d=development(s,'egypt');
 for(let month=0;month<5;month++)tick(s);
 assert.equal(d.slots.culture[0],'rhetorical-education','the AI researches, adopts and activates a viable culture policy after reload');
 assert.equal(d.knownIdeas.includes('philosophical-patronage'),true,'previous knowledge remains available if the institution returns');
 const ready=prepare('rhetorical-education'),readyDevelopment=development(ready,'egypt');
 aiTurn(ready,'egypt');
 assert.equal(readyDevelopment.research,null,'an already adoptable idea does not trigger redundant research');
 assert.equal(readyDevelopment.adoption?.ideaId,'rhetorical-education');
});
test('foreign practice without a supportive local community does not occupy the AI research lane',()=>{
 const s=newGrandGame('egypt'),d=development(s,'caesar');
 s.month=4;s.factions.caesar.treasury=500;d.knownMaterial=MATERIALS.map(item=>item.id);
 for(const [category,id] of Object.entries({government:'central-administration',diplomacy:'hardline-diplomacy',economy:'public-works',culture:'rhetorical-education'})){
  d.knownIdeas.push(id);d.slots[category][0]=id;
 }
 d.knownIdeas.push('numidian-mounted-scouts');
 assert.equal(ideaAdoptionPlan(s,'caesar','numidian-mounted-scouts').reason,'cultural-base');
 aiTurn(s,'caesar');
 assert.equal(d.research?.id,'legion-training');
 assert.equal(d.slots.military[0],null);
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
test('commissioned instruction follows the selected subject instead of the first available one',()=>{
 const s=newGame('caesar');s.wars=[];s.relations['caesar:egypt']=25;s.factions.caesar.treasury=300;
 s.development.egypt.knownMaterial.push('quarrying');
 const topics=scholarVisitTopics(s,'caesar','egypt').map(x=>x.item.id);
 assert.ok(topics.includes('water-control')&&topics.includes('quarrying'));
 assert.match(developmentPanel(s,'en','material'),/Commission instruction/);
 assert.match(developmentPanel(s,'zh','material'),/委托指导/);
 const before=s.factions.caesar.treasury;
 assert.equal(inviteForeignScholars(s,'caesar','egypt','idea','quarrying').reason,'expertise');
 assert.equal(s.factions.caesar.treasury,before);
 const chosen=inviteForeignScholars(s,'caesar','egypt','material','quarrying');
 assert.equal(chosen.ok,true);assert.equal(chosen.id,'quarrying');
 assert.equal(s.factions.caesar.treasury,before-24);
 assert.equal(s.development.caesar.knownMaterial.includes('quarrying'),false);
 const arrived=upgradeSave(JSON.parse(JSON.stringify(s)));months(arrived,chosen.travel);
 const other=upgradeSave(JSON.parse(JSON.stringify(arrived))),otherBefore=other.factions.caesar.treasury;
 assert.equal(researchInnovation(other,'caesar','material','water-control').ok,true);
 assert.equal(otherBefore-other.factions.caesar.treasury,24);
 const subjectBefore=arrived.factions.caesar.treasury;
 assert.equal(researchInnovation(arrived,'caesar','material','quarrying').ok,true);
 assert.equal(subjectBefore-arrived.factions.caesar.treasury,17);
 assert.equal(arrived.development.caesar.research.remaining,2);
});
test('foreign instruction follows a saved civilian route and requires an accepting court',()=>{
 const refused=newGame('caesar');refused.wars=[];refused.relations['caesar:egypt']=20;refused.factions.caesar.treasury=300;
 const before=refused.factions.caesar.treasury;
 assert.equal(inviteForeignScholars(refused,'caesar','egypt','material','water-control').reason,'refused');
 assert.equal(refused.factions.caesar.treasury,before);
 assert.equal(refused.development.caesar.visitingScholars.length,0);
 const s=newGrandGame('caesar');s.wars=[];s.relations['caesar:egypt']=25;s.factions.caesar.treasury=300;
 const accepted=inviteForeignScholars(s,'caesar','egypt','material','water-control');assert.equal(accepted.ok,true);assert.equal(accepted.accepted,true);
 const visit=s.development.caesar.visitingScholars[0];
 assert.equal(visit.acceptedBy,'ai');assert.deepEqual(visit.expertise,{branch:'material',id:'water-control'});
 assert.equal(visit.route[0],visit.origin);assert.equal(visit.route.at(-1),visit.destination);assert.ok(visit.route.length>2);
 assert.equal(visit.currentRegion,visit.origin);assert.equal(researchTerms(s,'caesar','material','water-control').cost,24);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));months(saved,1);
 const traveling=saved.development.caesar.visitingScholars[0];assert.ok(traveling.travelRemaining>0);assert.ok(traveling.route.includes(traveling.currentRegion));
 assert.equal(researchTerms(saved,'caesar','material','water-control').cost,24,'the journey is not an immediate research bonus');
 months(saved,traveling.travelRemaining);assert.equal(saved.development.caesar.visitingScholars[0].currentRegion,visit.destination);
 assert.equal(researchTerms(saved,'caesar','material','water-control').cost,21);
});
test('a player may accept or refuse a foreign request without silent payment',()=>{
 const s=newGame('egypt');s.wars=[];s.relations['caesar:egypt']=25;s.factions.caesar.treasury=300;
 const caesarBefore=s.factions.caesar.treasury,egyptBefore=s.factions.egypt.treasury;
 const proposal=inviteForeignScholars(s,'caesar','egypt','material','water-control');assert.equal(proposal.pending,true);
 assert.equal(s.factions.caesar.treasury,caesarBefore);assert.equal(s.factions.egypt.treasury,egyptBefore);
 assert.equal(s.development.caesar.visitingScholars.length,0);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.match(developmentPanel(saved,'en','material'),/Instruction request from/);
 assert.match(developmentPanel(saved,'zh','material'),/技术指导请求来自/);
 assert.equal(acceptScholarVisit(saved,'caesar','caesar','material','water-control').reason,'request');
 assert.equal(acceptScholarVisit(saved,'egypt','caesar','material','water-control').ok,true);
 assert.equal(saved.factions.caesar.treasury,caesarBefore-24);assert.equal(saved.factions.egypt.treasury,egyptBefore+10);
 assert.equal(saved.development.egypt.scholarRequests.length,0);assert.equal(saved.development.caesar.visitingScholars[0].acceptedBy,'player');
 assert.equal(acceptScholarVisit(saved,'egypt','caesar','material','water-control').reason,'request');
 const declined=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(declineScholarVisit(declined,'egypt','caesar','material','water-control').ok,true);
 assert.equal(declined.factions.caesar.treasury,caesarBefore);assert.equal(declined.factions.egypt.treasury,egyptBefore);
 assert.equal(declined.development.egypt.scholarRequests.length,0);
});
test('an occupied destination cancels a traveling delegation before it can advise research',()=>{
 const s=newGame('caesar');s.wars=[];s.relations['caesar:egypt']=25;s.factions.caesar.treasury=300;
 assert.equal(inviteForeignScholars(s,'caesar','egypt','material','water-control').ok,true);
 const destination=s.development.caesar.visitingScholars[0].destination;
 s.regions.find(r=>r.id===destination).owner='senate';months(s,1);
 assert.equal(s.development.caesar.visitingScholars.length,0);
 assert.equal(researchTerms(s,'caesar','material','water-control').cost,24);
});
test('war closes a sender transit route and removes the unfinished visit',()=>{
 const s=newGame('caesar');s.wars=[];s.relations['caesar:egypt']=25;s.factions.caesar.treasury=300;
 assert.equal(inviteForeignScholars(s,'caesar','egypt','material','water-control').ok,true);
 assert.ok(s.development.caesar.visitingScholars[0].route.some(id=>s.regions.find(r=>r.id===id)?.owner==='senate'));
 s.wars.push(['egypt','senate']);months(s,1);
 assert.equal(s.development.caesar.visitingScholars.length,0);
 assert.equal(researchTerms(s,'caesar','material','water-control').cost,24);
});
test('a solvent peacetime AI court can request player expertise without deciding for the player',()=>{
 const s=newGame('egypt');s.wars=[];s.month=2;s.relations['egypt:senate']=50;s.factions.senate.treasury=300;
 aiTurn(s,'senate');
 assert.ok(s.development.egypt.scholarRequests.some(x=>x.host==='senate'&&x.branch==='material'&&x.id==='water-control'));
 assert.equal(s.development.senate.visitingScholars.length,0);
 const saved=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(acceptScholarVisit(saved,'egypt','senate','material','water-control').ok,true);
 assert.equal(saved.development.senate.visitingScholars[0].acceptedBy,'player');
});
test('AI knowledge buyers keep a levy reserve while human buyers may choose to spend it',()=>{
 const ai=newGame('caesar');ai.relations['caesar:egypt']=30;
 ai.development.caesar.knownIdeas.push('legion-training');
 ai.factions.egypt.treasury=45;
 assert.equal(sellKnowledge(ai,'caesar','egypt','idea','legion-training').reason,'buyer treasury');
 assert.equal(ai.factions.egypt.treasury,45);
 assert.match(developmentPanel(ai,'en','idea'),/data-sell-buyer="egypt"[^>]*data-sell-id="legion-training"[^>]*disabled/);
 ai.factions.egypt.treasury=46;
 assert.doesNotMatch(developmentPanel(ai,'en','idea'),/data-sell-buyer="egypt"[^>]*data-sell-id="legion-training"[^>]*disabled/);
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

test('foreign idea adoption pauses when its local base is lost and resumes after a saved recovery',()=>{
 const s=newGrandGame('senate');s.wars=[];s.factions.senate.treasury=500;
 const id='egyptian-multiscript-decrees',region=s.regions.find(r=>r.id==='egypt'),d=development(s,'senate');
 d.knownIdeas.push(id);region.owner='senate';region.civicSatisfaction=50;
 assert.equal(adoptIdea(s,'senate',id).ok,true);
 const duration=d.adoption.remaining,cash=s.factions.senate.treasury;
 region.owner='egypt';
 const notices=[];for(let month=0;month<duration;month++)advanceDevelopment(s,(en,zh)=>notices.push([en,zh]));
 assert.equal(d.adoption.pausedReason,'cultural-base');
 assert.equal(d.adoption.remaining,1);
 assert.equal(d.slots.government[0],null);
 assert.equal(activeEffects(s,'senate').egyptianDecrees,undefined);
 assert.equal(s.factions.senate.treasury,cash,'a pause must not charge another adoption fee');
 assert.match(notices[0][0],/paused/);assert.match(notices[0][1],/暂停/);
 assert.match(ideasPanel(s,'en'),/originating culture territory/);
 assert.match(ideasPanel(s,'zh'),/起源文化领土/);
 assert.match(ideasPanel(s,'en'),/Cancel transition/);
 assert.match(ideasPanel(s,'zh'),/取消过渡/);
 const cancelled=upgradeSave(JSON.parse(JSON.stringify(s)));
 assert.equal(cancelIdeaAdoption(cancelled,'senate').ok,true);
 assert.equal(development(cancelled,'senate').adoption,null);
 assert.equal(development(cancelled,'senate').slots.government[0],null);
 assert.equal(cancelIdeaAdoption(cancelled,'senate').reason,'unavailable');
 const loaded=upgradeSave(JSON.parse(JSON.stringify(s))),restored=loaded.regions.find(r=>r.id==='egypt');
 assert.equal(development(loaded,'senate').adoption.pausedReason,'cultural-base');
 restored.owner='senate';restored.civicSatisfaction=44;
 advanceDevelopment(loaded);
 assert.equal(development(loaded,'senate').adoption.pausedReason,'local-support');
 assert.equal(development(loaded,'senate').slots.government[0],null);
 assert.match(ideasPanel(loaded,'zh'),/当地满意度至少45/);
 restored.civicSatisfaction=45;
 advanceDevelopment(loaded);
 assert.equal(development(loaded,'senate').adoption,null);
 assert.equal(development(loaded,'senate').slots.government[0],id);
 assert.equal(activeEffects(loaded,'senate').egyptianDecrees,1);
});
