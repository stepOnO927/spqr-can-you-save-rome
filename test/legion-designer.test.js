import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,tick,upgradeSave,resolveBattle,previewMarch,forecastEconomy,issueMilitaryOrder} from '../engine.js?v=portrait-pool-2';
import {COMPONENTS,PRESETS,templatesFor,templateStats,saveTemplate,duplicateTemplate,renameTemplate,validateTemplate,compareTemplates,reorganizeArmy,reorganizationQuote,recruitFormation,recruitmentQuote,formationCombatFactor,formationUpkeepDelta,commanderSpecialty,commandConcentration,outdatedArmies,aiDesignFormations,availableComponents,cultureOf,formationState} from '../legion-designer.js?v=portrait-pool-2';
import {focusState} from '../national-focus.js?v=portrait-pool-2';

const roundTrip=s=>upgradeSave(JSON.parse(JSON.stringify(s)));
const tpl=(s,owner,name)=>templatesFor(s,owner).find(t=>t.name===name);
function three(s){return ['Standard Field Legion','Mobile Cavalry-Supported Force','Siege-Oriented Formation'].map(n=>tpl(s,'caesar',n))}

test('three Roman formations differ in cost, manpower, movement, logistics, siege and terrain performance',()=>{
 const s=newGame('caesar'),[std,mob,sie]=three(s).map(t=>templateStats(t));
 assert.notEqual(std.recruitCost+std.equipment,mob.recruitCost+mob.equipment);assert.notEqual(std.personnel,mob.personnel);assert.notEqual(std.personnel,sie.personnel);
 assert.equal(mob.speed,'fast');assert.equal(std.speed,'normal');assert.ok(mob.food/mob.personnel>std.food/std.personnel,'cavalry needs more fodder per man');
 assert.ok(sie.siege>std.siege&&std.siege>mob.siege);assert.ok(mob.recon>std.recon);
 assert.ok(mob.terrain.plain>std.terrain.plain&&mob.terrain.forest<std.terrain.forest,'cavalry suits open ground, not forest');
 assert.ok(std.defense>mob.defense,'heavy infantry has more holding power');
 // No universal bonus: every template has a terrain where it is below 1.
 for(const t of Object.values(PRESETS).flat())assert.ok(Object.values(templateStats(t).terrain).some(v=>v<1));
});

test('templates can be created, renamed, duplicated and edited; editing never transforms existing armies',()=>{
 const s=newGame('caesar');s.wars=[];s.factions.caesar.treasury=500;s.factions.caesar.manpower=50000;s.factions.caesar.food=200;
 const made=saveTemplate(s,'caesar',{name:'Frontier Column',main:{cohort:4,roman_cavalry:3},support:{scouts:1,light_infantry:2}});assert.ok(made.ok);
 assert.ok(renameTemplate(s,'caesar',made.template.id,'Rhine Column').ok);assert.equal(formationState(s).templates[made.template.id].name,'Rhine Column');
 const copy=duplicateTemplate(s,'caesar',made.template.id,'Rhine Column II');assert.ok(copy.ok);assert.notEqual(copy.template.id,made.template.id);
 const raised=recruitFormation(s,'caesar','cisalpine',made.template.id);assert.ok(raised.ok);const a=s.armies.find(x=>x.id===raised.armyId);const men=a.men;
 assert.ok(saveTemplate(s,'caesar',{id:made.template.id,name:'Rhine Column',main:{cohort:8,roman_cavalry:1},support:{scouts:1}}).ok);
 assert.equal(a.men,men);assert.equal(a.formation.main.cohort,4);assert.deepEqual(outdatedArmies(s,'caesar'),[a.id]);
 // Invalid or impossible templates are refused.
 assert.ok(validateTemplate(s,'caesar',{main:{cohort:1},support:{}}).length);assert.ok(validateTemplate(s,'caesar',{main:{phalangites:6},support:{}}).some(e=>e.includes('not available')));
 assert.ok(validateTemplate(s,'caesar',{main:{veteran_cohort:6},support:{}}).some(e=>e.includes('locked')));assert.ok(validateTemplate(s,'caesar',{main:{cohort:6},support:{siege_train:1}}).length);
 assert.equal(compareTemplates(s,'caesar',[made.template.id,copy.template.id]).length,2);
});

test('recruitment and reorganization consume real resources and take real time, with partial conversion',()=>{
 const s=newGame('caesar');s.wars=[];const f=s.factions.caesar;f.treasury=400;f.manpower=40000;f.food=150;const std=tpl(s,'caesar','Standard Field Legion');
 const q=recruitmentQuote(s,'caesar',std.id),before={...f};const r=recruitFormation(s,'caesar','gaul',std.id);assert.ok(r.ok);
 assert.equal(f.treasury,before.treasury-q.treasury);assert.equal(f.manpower,before.manpower-q.manpower);assert.equal(f.food,before.food-q.food);
 const raw=s.armies.find(a=>a.id===r.armyId);assert.ok(raw.training>0);
 // Reorganize the opening Thirteenth Legion: time passes before it changes.
 const xiii=s.armies.find(a=>a.id==='xiii'),mob=tpl(s,'caesar','Mobile Cavalry-Supported Force'),quote=reorganizationQuote(s,'caesar','xiii',mob.id);assert.ok(quote.ok);assert.ok(quote.months>=1);
 const t0=f.treasury;assert.ok(reorganizeArmy(s,'caesar','xiii',mob.id).ok);assert.ok(f.treasury<t0);assert.equal(xiii.formation,undefined);
 assert.equal(previewMarch(s,'xiii','italiaN').reason,'reorganizing');
 for(let i=0;i<quote.months;i++)tick(s);assert.equal(xiii.formation.templateId,mob.id);
 // Partial conversion when resources are short.
 const poor=newGame('caesar');poor.wars=[];poor.factions.caesar.manpower=1500;poor.factions.caesar.treasury=14;const sie=tpl(poor,'caesar','Siege-Oriented Formation');
 const pq=reorganizationQuote(poor,'caesar','viii',sie.id);assert.ok(pq.partial);const pr=reorganizeArmy(poor,'caesar','viii',sie.id);assert.ok(pr.ok);assert.ok(pr.fraction<1);
});

test('an isolated army cannot reorganize in enemy territory or without a supply link',()=>{
 const s=newGame('caesar');const std=tpl(s,'caesar','Standard Field Legion');const xiii=s.armies.find(a=>a.id==='xiii');
 xiii.region='italiaN';assert.equal(reorganizationQuote(s,'caesar','xiii',std.id).reason,'location');
 xiii.region='cisalpine';xiii.siege={region:'italiaN',remaining:3};assert.equal(reorganizationQuote(s,'caesar','xiii',std.id).reason,'busy');
 xiii.siege=null;for(const r of s.regions.filter(r=>r.owner==='caesar'))r.supply=8;assert.equal(reorganizationQuote(s,'caesar','xiii',std.id).reason,'supply');
});

test('formations change battle outcomes by terrain, and upkeep changes the economy',()=>{
 const s=newGame('caesar'),[std,mob]=three(s);
 const field={...s.armies.find(a=>a.id==='xiii'),characterId:null,formation:{templateId:std.id,version:1,main:std.main,support:std.support,comp:{...std.main,...std.support}},formationFill:1};
 const horse={...field,formation:{templateId:mob.id,version:1,main:mob.main,support:mob.support,comp:{...mob.main,...mob.support}}};
 assert.ok(formationCombatFactor(s,horse,'plain','attack')>formationCombatFactor(s,field,'plain','attack'));
 assert.ok(formationCombatFactor(s,horse,'forest','attack')<formationCombatFactor(s,field,'forest','attack'));
 assert.ok(formationCombatFactor(s,field,'hills','defend')>formationCombatFactor(s,horse,'hills','defend'));
 // The same battle, same seed: the composition alone changes the result.
 const fight=attacker=>{const t=newGame('caesar');t.seed=4242;const target=t.regions.find(r=>r.id==='italiaN');const d=t.armies.find(a=>a.id==='italy');const a={...attacker,region:'cisalpine'};t.armies=t.armies.filter(x=>x.id!=='xiii').concat(a);resolveBattle(t,a,d,target);return t.battles.at(-1)};
 const b1=fight(field),b2=fight(horse);assert.notEqual(b1.lossA,b2.lossA);
 const g=newGame('caesar');const base=forecastEconomy(g,'caesar');g.armies.find(a=>a.id==='xiii').formation={templateId:mob.id,version:1,main:mob.main,support:mob.support,comp:{}};
 const after=forecastEconomy(g,'caesar');assert.notEqual(after.food,base.food);assert.ok(formationUpkeepDelta(g,'caesar').food>0);
});

test('commander specialties adjust formations within limits; command concentration is measured',()=>{
 const s=newGame('caesar'),mob=tpl(s,'caesar','Mobile Cavalry-Supported Force');
 assert.ok(commanderSpecialty(s,'caesar').engineering>=2);assert.equal(commanderSpecialty(s,'labienus').cavalry,3);
 const unit={...s.armies.find(a=>a.id==='xiii'),formation:{templateId:mob.id,version:1,main:mob.main,support:mob.support,comp:{}},formationFill:1};
 const withLabienus={...unit,characterId:'labienus'},withScipio={...unit,characterId:'scipio'};
 assert.ok(formationCombatFactor(s,withLabienus,'plain','attack')>formationCombatFactor(s,withScipio,'plain','attack'));
 // A specialty never changes geography: march time is unaffected by the commander.
 const a=s.armies.find(x=>x.id==='xiii');const m1=previewMarch(s,'xiii','narbo').months;a.characterId='antony';assert.equal(previewMarch(s,'xiii','narbo').months,m1);
 const c=commandConcentration(s,'caesar','antony');assert.ok(c.share>=50);assert.ok(['low','elevated','high'].includes(c.level));
});

test('scouts in a formation report enemy forces in neighbouring theaters',()=>{
 const s=newGame('caesar');s.wars=[['caesar','senate']];const std=tpl(s,'caesar','Standard Field Legion');const xiii=s.armies.find(a=>a.id==='xiii');
 xiii.formation={templateId:std.id,version:1,main:std.main,support:std.support,comp:{}};s.knowledge.caesar.senate.sightings={};
 const spain=s.armies.find(a=>a.id==='spain');spain.region='narbo';xiii.region='gaul';
 tick(s);assert.ok(Object.values(s.knowledge.caesar.senate.sightings).some(x=>x.id==='spain'));
});

test('AI factions design, recruit and reorganize with the same rules, and saves keep everything',()=>{
 const s=newGame('caesar');s.difficulty='expert';for(let i=0;i<24;i++)tick(s,{autoplayPlayer:true});
 for(const id of ['caesar','senate','egypt','parthia','armenia'])assert.ok(s.world.aiFormationPlans?.[id]?.preferred,`${id} chose a template`);
 const organized=s.armies.filter(a=>a.formation);assert.ok(organized.length>0,'some AI armies are organized');
 for(const a of organized){const t=formationState(s).templates[a.formation.templateId];if(t)assert.deepEqual(validateTemplate(s,a.owner,{main:a.formation.main,support:a.formation.support},{ignoreUnlock:true}),[])}
 for(const id of Object.keys(s.factions).filter(x=>x!=='rebels'))for(const t of templatesFor(s,id))assert.ok(t.main&&Object.keys(t.main).every(c=>COMPONENTS[c].cultures.includes(cultureOf(id))));
 const saved=roundTrip(s);assert.deepEqual(saved.world.formations,s.world.formations);assert.deepEqual(saved.armies.map(a=>[a.id,a.formation?.templateId,a.reorg?.remaining]),s.armies.map(a=>[a.id,a.formation?.templateId,a.reorg?.remaining]));
 // Expert AI explores more candidates than standard AI.
 const e=newGame('caesar'),st=newGame('caesar');e.difficulty='expert';st.difficulty='standard';aiDesignFormations(e,'parthia');aiDesignFormations(st,'parthia');
 assert.ok(templatesFor(e,'parthia').length>=templatesFor(st,'parthia').length);
 // Civilizations have different building blocks.
 assert.ok(availableComponents(s,'parthia').some(c=>c.id==='horse_archers'));assert.ok(!availableComponents(s,'parthia').some(c=>c.id==='cohort'));
});

test('old saves keep their armies, treasury and territories; legacy armies are unorganized',()=>{
 const s=newGame('caesar');delete s.world.formations;delete s.world.nationalFocus;delete s.world.battlePlans;delete s.world.imperiumVersion;
 const armies=JSON.stringify(s.armies),treasury=s.factions.caesar.treasury,regions=JSON.stringify(s.regions.map(r=>r.owner));
 const up=roundTrip(s);assert.equal(JSON.stringify(up.armies),armies);assert.equal(up.factions.caesar.treasury,treasury);assert.equal(JSON.stringify(up.regions.map(r=>r.owner)),regions);
 assert.equal(up.world.imperiumVersion,1);assert.ok(templatesFor(up,'caesar').length>=3);assert.ok(up.armies.every(a=>!a.formation));
 tick(up);assert.ok(up.world.nationalFocus);
});
