import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,newGrandGame,upgradeSave,region,nationalBudget,aerariumPlan,seizeAerarium,aiTurn} from '../engine.js';
import {budgetHtml} from '../budget-ui.js';
import {eventText} from '../campaign-reports.js';

test('Rome public reserve requires actual control and one wartime decision',()=>{
 const s=newGrandGame('caesar');
 assert.equal(aerariumPlan(s,'caesar').reason,'rome');
 assert.equal(seizeAerarium(s,'caesar').ok,false);
 const rome=region(s,'roma');rome.owner='caesar';
 const plan=aerariumPlan(s,'caesar'),f=s.factions.caesar;
 assert.equal(plan.income,85);
 const before={cash:f.treasury,legitimacy:f.legitimacy,loyalty:rome.loyalty,satisfaction:rome.civicSatisfaction,monthly:nationalBudget(s,'caesar').projectedNet};
 assert.deepEqual(seizeAerarium(s,'caesar'),{ok:true,income:85});
 assert.equal(f.treasury,before.cash+85);
 assert.equal(f.legitimacy,before.legitimacy-8);
 assert.equal(rome.loyalty,before.loyalty-6);
 assert.equal(rome.civicSatisfaction,before.satisfaction-6);
 assert.equal(nationalBudget(s,'caesar').projectedNet,before.monthly-1,'lower Roman loyalty changes actual monthly tax');
 assert.deepEqual(s.aerariumSeizure,{owner:'caesar',year:-49,month:1,income:85,legitimacyLoss:8,loyaltyLoss:6,satisfactionLoss:6});
 assert.equal(seizeAerarium(s,'caesar').reason,'claimed');
 assert.match(eventText(s,s.campaignEvents.find(e=>e.type==='aerariumSeizure'),'en').description,/85 treasury/);
 assert.match(eventText(s,s.campaignEvents.find(e=>e.type==='aerariumSeizure'),'zh').description,/85国库/);
 const restored=upgradeSave(JSON.parse(JSON.stringify(s)));region(restored,'roma').owner='senate';
 assert.equal(aerariumPlan(restored,'caesar').reason,'claimed');
 region(restored,'roma').owner='caesar';assert.equal(seizeAerarium(restored,'caesar').reason,'claimed');
 assert.equal(restored.factions.caesar.treasury,before.cash+85);
});

test('reserve is optional, campaign-bound and disclosed in both languages',()=>{
 const s=newGrandGame('caesar');region(s,'roma').owner='caesar';
 assert.match(budgetHtml(s,'en',null,null,aerariumPlan(s,'caesar')),/TAKE PUBLIC RESERVE/);
 assert.match(budgetHtml(s,'zh',null,null,aerariumPlan(s,'caesar')),/动用公共储备/);
 assert.match(budgetHtml(s,'en',null,null,aerariumPlan(s,'caesar')),/game estimates/);
 const monthly=nationalBudget(s,'caesar').projectedNet;
 seizeAerarium(s,'caesar');
 assert.match(budgetHtml(s,'en',null,null,aerariumPlan(s,'caesar')),/Roman public reserve taken this month/);
 assert.match(budgetHtml(s,'zh',null,null,aerariumPlan(s,'caesar')),/本月动用罗马公共金库/);
 assert.match(budgetHtml(s,'en',null,null,aerariumPlan(s,'caesar')),/disabled/);
 assert.ok(nationalBudget(s,'caesar').projectedNet<=monthly,'one-time reserve must not become recurring income');
 const old=newGame('caesar');region(old,'roma').owner='caesar';assert.equal(aerariumPlan(old,'caesar').reason,'faction');
 const peaceful=newGrandGame('caesar');region(peaceful,'roma').owner='caesar';peaceful.wars=[];assert.equal(aerariumPlan(peaceful,'caesar').reason,'war');
 const ended=newGrandGame('caesar');region(ended,'roma').owner='caesar';ended.achievementState.finalized=true;assert.equal(aerariumPlan(ended,'caesar').reason,'campaign');
});

test('Caesarian AI can make the same costly decision when holding Rome under a cash deficit',()=>{
 const s=newGrandGame('egypt');region(s,'roma').owner='caesar';
 s.factions.caesar.treasury=-50;
 aiTurn(s,'caesar');
 assert.equal(s.aerariumSeizure?.owner,'caesar');
 assert.equal(s.aerariumSeizure?.income,85);
 assert.ok(s.factions.caesar.legitimacy<49);
 assert.equal(s.campaignEvents.some(e=>e.type==='aerariumSeizure'),false,'foreign decisions stay out of the player chronicle');
});
