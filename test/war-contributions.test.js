import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,upgradeSave,warContributionPlan,collectWarContributions,emergencyProvisionsPlan,collectEmergencyProvisions,nationalBudget,tick,aiTurn} from '../engine.js';
import {budgetHtml} from '../budget-ui.js';
import {eventText} from '../campaign-reports.js';

test('wartime contributions draw on loyal provinces and cannot be repeated through a save reload',()=>{
 const state=newGrandGame('caesar'),plan=warContributionPlan(state,'caesar');
 assert.equal(plan.ok,true);
 assert.ok(plan.income>=8&&plan.income<=40&&plan.regions>0);
 const before=new Map(state.regions.map(region=>[region.id,{loyalty:region.loyalty,satisfaction:region.civicSatisfaction}]));
 const treasury=state.factions.caesar.treasury,stability=state.factions.caesar.stability;
 assert.deepEqual(collectWarContributions(state,'caesar'),{ok:true,income:plan.income,regions:plan.regions});
 assert.equal(state.factions.caesar.treasury,treasury+plan.income);
 assert.equal(state.factions.caesar.stability,stability-2);
 for(const site of state.regions){const old=before.get(site.id);assert.equal(site.loyalty,old.loyalty-(plan.regionIds.includes(site.id)?5:0));assert.equal(site.civicSatisfaction,old.satisfaction-(plan.regionIds.includes(site.id)?4:0))}
 assert.equal(collectWarContributions(state,'caesar').reason,'cooldown');
 const restored=upgradeSave(JSON.parse(JSON.stringify(state)));
 assert.equal(warContributionPlan(restored,'caesar').reason,'cooldown');
 assert.deepEqual(restored.warContributions,state.warContributions);
 const report=state.campaignEvents.find(event=>event.type==='warContribution');
 assert.match(eventText(state,report,'en').description,new RegExp(`${plan.income} treasury`));
 assert.match(eventText(state,report,'zh').description,new RegExp(`${plan.income}国库`));
 restored.year++;assert.equal(warContributionPlan(restored,'caesar').ok,true);
});

test('the contribution decision and limits are visible in both languages',()=>{
 const state=newGrandGame('caesar'),plan=warContributionPlan(state,'caesar');
 const senate=newGrandGame('senate'),senatePlan=warContributionPlan(senate,'senate');
 assert.equal(senatePlan.income,40);
 assert.ok(senatePlan.regions<senate.regions.filter(site=>site.owner==='senate').length,'The levy should burden a bounded set of willing communities');
 assert.match(budgetHtml(state,'en',plan),/COLLECT WAR CONTRIBUTIONS/);
 assert.match(budgetHtml(state,'zh',plan),/征集战时款项/);
 assert.match(budgetHtml(state,'en',plan),/Civil War 1\.6\.8/);
 collectWarContributions(state,'caesar');
 assert.match(budgetHtml(state,'en',warContributionPlan(state,'caesar')),/disabled/);
 assert.match(budgetHtml(state,'zh',warContributionPlan(state,'caesar')),/还需等待12个月/);
});

test('an AI can raise the same contributions but avoids a garrison it cannot feed',()=>{
 const state=newGrandGame('egypt');state.factions.caesar.treasury=5;state.factions.caesar.food=20;
 const army=state.armies.find(unit=>unit.id==='xiii');army.region='roma';state.regions.find(site=>site.id==='roma').owner='caesar';
 aiTurn(state,'caesar');
 assert.equal(state.lastWarContribution.caesar,state.year*12+state.month);
 assert.equal(state.armies.some(unit=>unit.owner==='caesar'&&unit.aiGarrisonRegion==='roma'),false);
});

test('emergency provisions draw bounded local stores with real three-month harvest costs and saved cooldown',()=>{
 const state=newGrandGame('caesar'),plan=emergencyProvisionsPlan(state,'caesar');
 assert.equal(plan.ok,true);assert.ok(plan.food>=6&&plan.food<=24);assert.ok(plan.regions>0&&plan.regions<=4);
 const before=state.factions.caesar.food,stability=state.factions.caesar.stability,baseBudget=nationalBudget(state,'caesar');
 const selected=plan.regionIds.map(id=>state.regions.find(r=>r.id===id));
 assert.deepEqual(collectEmergencyProvisions(state,'caesar'),{ok:true,food:plan.food,regions:plan.regions});
 assert.equal(state.factions.caesar.food,before+plan.food);assert.equal(state.factions.caesar.stability,stability-2);
 assert.ok(selected.every(r=>r.foodRequisitionRemaining===3&&r.foodRequisitionLoss>0));
 assert.ok(nationalBudget(state,'caesar').requisitionLoss>0);
 assert.ok(nationalBudget(state,'caesar').foodNet<=baseBudget.foodNet);
 assert.equal(emergencyProvisionsPlan(state,'caesar').reason,'cooldown');
 const restored=upgradeSave(JSON.parse(JSON.stringify(state)));
 assert.deepEqual(restored.emergencyProvisions,state.emergencyProvisions);
 assert.equal(emergencyProvisionsPlan(restored,'caesar').reason,'cooldown');
 const report=restored.campaignEvents.find(e=>e.type==='emergencyProvisions');
 assert.match(eventText(restored,report,'en').description,new RegExp(`${plan.food} food`));
 assert.match(eventText(restored,report,'zh').description,new RegExp(`${plan.food}粮食`));
 restored.wars=[];
 for(let i=0;i<2;i++){tick(restored);assert.ok(nationalBudget(restored,'caesar').requisitionLoss>0)}
 tick(restored);assert.equal(nationalBudget(restored,'caesar').requisitionLoss,0);
 assert.ok(selected.every(r=>r.foodRequisitionRemaining===3),'the source save must remain independent');
});

test('provision limits and both language views expose the decision without hiding future cost',()=>{
 const state=newGrandGame('caesar'),plan=emergencyProvisionsPlan(state,'caesar');
 assert.match(budgetHtml(state,'en',null,plan),/GATHER LOCAL STORES/);
 assert.match(budgetHtml(state,'zh',null,plan),/征集地方储粮/);
 assert.match(budgetHtml(state,'en',null,plan),/Civil Wars 1\.52/);
 collectEmergencyProvisions(state,'caesar');
 assert.match(budgetHtml(state,'en',null,emergencyProvisionsPlan(state,'caesar')),/Local stores recovery/);
 assert.match(budgetHtml(state,'zh',null,emergencyProvisionsPlan(state,'caesar')),/还需等待12个月/);
 state.lastEmergencyProvisions.caesar=undefined;state.factions.caesar.food=nationalBudget(state,'caesar').foodCapacity-5;
 assert.equal(emergencyProvisionsPlan(state,'caesar').reason,'storage');
 state.factions.caesar.food=20;for(const r of state.regions.filter(r=>r.owner==='caesar'))r.loyalty=0;
 assert.equal(emergencyProvisionsPlan(state,'caesar').reason,'support');
});

test('AI uses the same provisions only for a real food deficit',()=>{
 const state=newGrandGame('egypt');state.factions.caesar.food=5;
 assert.ok(nationalBudget(state,'caesar').foodNet<0);
 aiTurn(state,'caesar');
 assert.equal(state.lastEmergencyProvisions.caesar,state.year*12+state.month);
 assert.ok(state.factions.caesar.food>5);
 const renewed=state.factions.caesar.food;aiTurn(state,'caesar');assert.ok(state.factions.caesar.food<=renewed);
});
