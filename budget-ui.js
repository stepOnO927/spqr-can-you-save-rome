import {nationalBudget} from './national-budget.js?v=5';
import {expensesThisMonth} from './expense-ledger.js?v=1';
const number=x=>(Object.is(x,-0)?0:Number(x)).toLocaleString(undefined,{maximumFractionDigits:1});
export function budgetHtml(s,lang){
 const b=nationalBudget(s,s.player),spent=expensesThisMonth(s,s.player),zh=lang==='zh',row=(a,c,v)=>`<tr><td>${zh?c:a}</td><td>${typeof v==='string'?v:number(v)}</td></tr>`;
 const rows=[
  row('Tax revenue','税收',b.tax),row('Army upkeep','陆军军费',-b.armyUpkeep),
  b.homeIncome?row('Home domain dues · game estimate','本土领地收入 · 游戏估算',b.homeIncome):'',
  row('Office income','行政收入',b.officeIncome),row('Ideas: income / upkeep','理念收入／维持费',b.ideaIncome-b.ideaUpkeep),
  row('Buildings: income / upkeep','建筑收入／维持费',b.buildingIncome-b.buildingUpkeep),row('Fleet upkeep','舰队军费',-b.navyUpkeep),
  row('Naval officers','海军官员',-b.navalJobs),row('Administration','行政维持费',-b.administrationExpense),
  row('Religious patronage','地方祭仪资助',-b.religiousExpense),row('Projected treasury change','预计国库变化',b.projectedNet),
  row('Construction paid this month','本月已付建造费',-spent.construction),row('Research paid this month','本月已付研究费',-spent.research),
  row('Food production / consumption','粮食产出／消耗',`${number(b.foodProduction)} / ${number(b.foodConsumption)}`),
  b.homeFood?row('Home domain stores · game estimate','本土领地储粮 · 游戏估算',b.homeFood):'',
  b.tenantFood?row('Tenant crop shares','佃作分成粮食',-b.tenantFood):'',
  row('Projected food change','预计粮食变化',b.foodNet),row('Projected manpower gain','预计兵源恢复',b.manpowerNet)
 ].join('');
 return `<section class="national-budget"><h3>${zh?'每月国家预算':'MONTHLY NATIONAL BUDGET'}</h3><table><tbody>${rows}</tbody></table><p>${zh?'建造和研究在下令时一次付费；本月已付费用不包含在预计下月国库变化中，建成后的维持费列于上方。新征召3000人消耗12–24国库（取决于地方设施）、6粮食、3000兵源；增援消耗24国库、6粮食、3000兵源并等待一个月；训练消耗8国库、2粮食并等待一个月。贸易、战斗、修船与事件可能使实际结算偏离预计值。粮仓容量和债务下限也会截断变化。':'Construction and research are paid once when ordered. This month’s paid costs are separate from the projected next-month treasury change; ongoing building upkeep appears above. Raising 3,000 troops costs 12–24 treasury (depending on local facilities), 6 food and 3,000 manpower. Reinforcing costs 24 treasury, 6 food, 3,000 manpower and one month; training costs 8 treasury, 2 food and one month. Trade, combat, repairs and events can change the actual result. Storage caps and debt limits can truncate it.'}</p></section>`;
}
