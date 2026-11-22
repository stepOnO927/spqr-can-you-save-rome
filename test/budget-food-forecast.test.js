import test from 'node:test';
import assert from 'node:assert/strict';
import {newGrandGame,setTax,upgradeSave} from '../engine.js';
import {nationalBudget} from '../national-budget.js';
import {budgetHtml} from '../budget-ui.js';

test('tax preview uses the real next-month budget and discloses local costs in both languages',()=>{
 for(const current of ['low','normal','high']){
  const state=newGrandGame('caesar');assert.equal(setTax(state,'caesar',current),true);
  const en=budgetHtml(state,'en'),zh=budgetHtml(state,'zh');
  for(const [level,labelEn,labelZh,pressureEn,pressureZh] of [
   ['low','Low tax','低税','loyalty +1, satisfaction +2','忠诚＋1、满意度＋2'],
   ['normal','Normal tax','标准税','no base loyalty or satisfaction change','忠诚与满意度无基础变化'],
   ['high','High tax','高税','loyalty −2, satisfaction −2','忠诚−2、满意度−2']
  ]){
   const hypothetical=upgradeSave(JSON.parse(JSON.stringify(state)));
   assert.equal(setTax(hypothetical,'caesar',level),true);
   const projected=nationalBudget(hypothetical,'caesar').projectedNet;
   const signed=`${projected>=0?'+':''}${projected}`;
   assert.ok(en.includes(`${labelEn}${level===current?' (current)':''}: projected treasury ${signed}; ${pressureEn}`));
   assert.ok(zh.includes(`${labelZh}${level===current?'（当前）':''}: 预计国库 ${signed}; ${pressureZh}`));
  }
 }
});

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
 assert.match(en,/trade or war can change this/i);
 const site=state.regions.find(r=>r.owner==='caesar');
 site.buildings.push('granary');site.grainReserve=8;
 state.armies.find(a=>a.owner==='caesar').men+=2400;
 const stored=nationalBudget(state,'caesar');
 assert.equal(stored.granaryFood,8);
 assert.ok(stored.foodNet<0);
 const withGranary=budgetHtml(state,'en'),withGranaryZh=budgetHtml(state,'zh');
 assert.match(withGranary,/Food held in provincial grain stores<\/td><td>8/);
 assert.match(withGranary,/provincial grain stores may delay the shortage/i);
 assert.match(withGranaryZh,/行省储粮设施存粮<\/td><td>8/);
 assert.match(withGranaryZh,/行省储粮设施可能延后缺粮/);
});

test('the treasury budget dates debt risk and explains an existing deficit in both languages',()=>{
 const state=newGrandGame('caesar'),f=state.factions.caesar;
 f.treasury=28;
 const budget=nationalBudget(state,'caesar');
 assert.ok(budget.projectedNet<0);
 const months=Math.floor(f.treasury/-budget.projectedNet)+1;
 assert.match(budgetHtml(state,'en'),new RegExp(`treasury may fall below zero in about ${months} month`));
 assert.match(budgetHtml(state,'zh'),new RegExp(`国库约${months}个月后会低于零`));
 f.treasury=-1;
 assert.match(budgetHtml(state,'en'),/continued debt reduces stability and army morale each month/);
 assert.match(budgetHtml(state,'zh'),/持续负债会每月削弱稳定度与军队士气/);
 assert.doesNotMatch(budgetHtml(state,'en'),/treasury may fall below zero in about/);
 f.treasury=28;
 state.armies.forEach(a=>{if(a.owner==='caesar')a.men=0});
 for(const site of state.regions.filter(r=>r.owner==='caesar'))site.tax+=5;
 assert.ok(nationalBudget(state,'caesar').projectedNet>=0);
 assert.doesNotMatch(budgetHtml(state,'en'),/treasury may fall below zero in about/);
});
