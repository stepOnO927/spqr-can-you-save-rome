import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame} from '../engine.js';
import {nationalBudget} from '../national-budget.js';
import {budgetHtml} from '../budget-ui.js';

test('the food budget explains its deficit and dates the current-rate shortage in both languages',()=>{
 const state=newGrandGame('caesar');state.factions.caesar.food=5;
 const budget=nationalBudget(state,'caesar');
 assert.ok(budget.foodNet<0);
 assert.equal(budget.foodNet,Math.round(budget.foodProduction-budget.troopFood-budget.regionalFood-budget.tenantFood-budget.requisitionLoss)+budget.homeFood+budget.officeFood+budget.ideaFood+budget.buildingFood);
 const months=Math.floor(state.factions.caesar.food/-budget.foodNet)+1;
 const en=budgetHtml(state,'en'),zh=budgetHtml(state,'zh');
 for(const label of ['Local food production','Army rations','Regional consumption','Projected food change'])assert.ok(en.includes(label));
 for(const label of ['地方粮食产出','军队口粮','地方消耗','预计粮食变化'])assert.ok(zh.includes(label));
 assert.match(en,new RegExp(`about ${months} month`));
 assert.match(zh,new RegExp(`约${months}个月后`));
 assert.match(en,/trade and war can change this/i);
});
