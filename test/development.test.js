import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,upgradeSave,tick,aiTurn,setTax,recruit,researchInnovation,adoptIdea,removeIdea,expandIdeaSlot,startConstruction,constructionCheck,knowledgeTrade,sellKnowledge,proposeKnowledgeSale,proposeKnowledgePurchase,acceptKnowledgePurchase,declineKnowledgePurchase,acceptKnowledgeOffer,declineKnowledgeOffer,exchangeKnowledge,inviteForeignScholars,purchaseMaterials} from '../engine.js';
import {IDEA_CATEGORIES,IDEAS,MATERIALS,BUILDINGS,development,activeEffects,ideaCompatibility} from '../development.js';
import {developmentPanel,ideasPanel} from '../development-ui.js';
import {edgeMonths} from '../grand-operations.js';
import {techIllustration} from '../tech-art.js';
import {faithSatisfaction} from '../local-society.js';
import {nationalBudget} from '../national-budget.js';
const months=(s,n)=>{for(let i=0;i<n;i++)tick(s)};

test('every development node has its own interpretive illustration',()=>{
 const art=[...MATERIALS,...IDEAS].map(item=>techIllustration(item));
 assert.equal(art.length,65);assert.equal(new Set(art).size,65);
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

test('five categories begin with one independent inactive slot and research alone has no effect',()=>{
  const s=newGame();s.wars=[];s.alliances.push(['caesar','senate']);const d=development(s,'caesar');
  assert.equal(IDEA_CATEGORIES.length,5);assert.equal(IDEAS.length,31);assert.equal(MATERIALS.length,34);assert.equal(BUILDINGS.length,33);
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
  assert.equal(adoptIdea(s,'caesar','diplomatic-accommodation',1).reason,'conflict');
  assert.equal(ideaCompatibility(s,'caesar','hardline-diplomacy',1).reason,'duplicate');
  assert.equal(adoptIdea(s,'caesar','hardline-diplomacy',1).reason,'duplicate');
  assert.equal(adoptIdea(s,'caesar','diplomatic-accommodation',0).ok,true);
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
 assert.equal(inviteForeignScholars(s,'caesar','egypt').ok,true);
 const plain=newGame('caesar');plain.factions.caesar.treasury=300;
 const baseline=plain.factions.caesar.treasury;assert.equal(researchInnovation(plain,'caesar','material','quarrying').ok,true);
 const before=s.factions.caesar.treasury;assert.equal(researchInnovation(s,'caesar','material','quarrying').ok,true);
 assert.equal(before-s.factions.caesar.treasury,baseline-plain.factions.caesar.treasury-3);
 assert.equal(caesar.research.remaining,Math.max(1,plain.development.caesar.research.remaining-1));
 assert.equal(upgradeSave(JSON.parse(JSON.stringify(s))).development.caesar.visitingScholars.length,1);
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
