import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,upgradeSave,warContributionPlan,collectWarContributions,aiTurn} from '../engine.js';
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
