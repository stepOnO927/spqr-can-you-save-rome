import {nationalBudget} from './national-budget.js?v=42';
import {expensesThisMonth} from './expense-ledger.js?v=3';
const number=x=>(Object.is(x,-0)?0:Number(x)).toLocaleString(undefined,{maximumFractionDigits:1});
export function budgetHtml(s,lang,contribution=null,provisions=null,aerarium=null){
 const b=nationalBudget(s,s.player),spent=expensesThisMonth(s,s.player),zh=lang==='zh',row=(a,c,v)=>`<tr><td>${zh?c:a}</td><td>${typeof v==='string'?v:number(v)}</td></tr>`;
 const rows=[
  row('Tax revenue','税收',b.tax),row('Army upkeep','陆军军费',-b.armyUpkeep),
  b.homeIncome?row('Home domain dues · game estimate','本土领地收入 · 游戏估算',b.homeIncome):'',
  row('Office income','行政收入',b.officeIncome),row('Ideas: income / upkeep','理念收入／维持费',b.ideaIncome-b.ideaUpkeep),
  b.grainCommutation?row('Grain dues paid in cash','粮赋折现收入',b.grainCommutation):'',
  row('Buildings: income / upkeep','建筑收入／维持费',b.buildingIncome-b.buildingUpkeep),row('Fleet upkeep','舰队军费',-b.navyUpkeep),
  row('Naval officers','海军官员',-b.navalJobs),row('Administration','行政维持费',-b.administrationExpense),
  b.reviewExpense?row('Provincial tax review','行省税务复核',-b.reviewExpense):'',
  b.templeExpense?row('Egyptian temple revenue guarantees','埃及神庙收入保障',-b.templeExpense):'',
  row('Religious patronage','地方祭仪资助',-b.religiousExpense),row('Projected treasury change','预计国库变化',b.projectedNet),
  row('Construction paid this month','本月已付建造费',-spent.construction),row('Research paid this month','本月已付研究费',-spent.research),row('Idea and slot changes paid this month','本月已付理念与槽位变更费',-spent.policy),row('Construction materials bought this month','本月已付建筑材料采购费',-spent.materials),
  b.tradeImportPaid?row('Maritime imports paid this month','本月已付海运进口费',-b.tradeImportPaid):'',
  s.aerariumSeizure?.year===s.year&&s.aerariumSeizure.month===s.month&&s.aerariumSeizure.owner===s.player?row('Roman public reserve taken this month','本月动用罗马公共金库',s.aerariumSeizure.income):'',
  row('Local food production','地方粮食产出',b.foodProduction),
  b.seasonalFood?row('  of which seasonal labor','  其中季节雇工',b.seasonalFood):'',
  b.granaryFood?row('Food held in provincial grain stores','行省储粮设施存粮',b.granaryFood):'',
  row('Army rations','军队口粮',-b.troopFood),
  row('Regional consumption','地方消耗',-b.regionalFood),
  b.requisitionLoss?row('Local stores recovery · production loss','地方储粮恢复 · 产量损失',-b.requisitionLoss):'',
  b.homeFood?row('Home domain stores · game estimate','本土领地储粮 · 游戏估算',b.homeFood):'',
  b.officeFood?row('Offices: food','官职粮食收益',b.officeFood):'',
  b.ideaFood?row('Ideas: food','理念粮食收益',b.ideaFood):'',
  b.buildingFood?row('Buildings: food','建筑粮食收益',b.buildingFood):'',
  b.tenantFood?row('Tenant crop shares','佃作分成粮食',-b.tenantFood):'',
  b.grainCommutation?row('Grain dues retained locally','粮赋折现减少入库粮',-b.grainCommutation):'',
  row('Projected food change','预计粮食变化',b.foodNet),row('Projected manpower gain','预计兵源恢复',b.manpowerNet)
 ].join('');
 const taxRates={low:.65,normal:1,high:1.4},currentRate=taxRates[s.factions[s.player].tax]||1;
 const taxForecast=Object.entries(taxRates).map(([level,rate])=>{
  const projected=b.projectedNet+Math.round(b.tax*rate/currentRate-b.armyUpkeep)-Math.round(b.tax-b.armyUpkeep);
  const pressure={low:zh?'忠诚＋1、满意度＋2':'loyalty +1, satisfaction +2',normal:zh?'忠诚与满意度无基础变化':'no base loyalty or satisfaction change',high:zh?'忠诚−2、满意度−2':'loyalty −2, satisfaction −2'}[level];
  const name={low:zh?'低税':'Low tax',normal:zh?'标准税':'Normal tax',high:zh?'高税':'High tax'}[level];
  return `${name}${s.factions[s.player].tax===level?zh?'（当前）':' (current)':''}: ${zh?'预计国库':'projected treasury'} ${projected>=0?'+':''}${number(projected)}; ${pressure}`;
 }).join(' · ');
 const taxForecastHtml=`<p class="budget-tax-forecast">${zh?'税率选择（按目前领土与民心估算下一月；地方建筑、理念及其他事件会改变实际民心）：':'Tax choices (next month at current ownership and support; buildings, ideas and other events can change actual local support):'} ${taxForecast}${zh?'。':'.'}</p>`;
 const foodStores=s.factions[s.player].food,runway=b.foodNet<0&&foodStores>=0?Math.floor(foodStores/-b.foodNet)+1:null;
 const treasury=s.factions[s.player].treasury,cashRunway=b.projectedNet<0&&treasury>=0?Math.floor(treasury/-b.projectedNet)+1:null;
 const cashWarning=treasury<0
  ?`<p class="budget-runway">${zh?'国库已经低于零；持续负债会每月削弱稳定度与军队士气。':'Treasury is already below zero; continued debt reduces stability and army morale each month.'}</p>`
  :cashRunway===null?'':`<p class="budget-runway">${zh?`若目前的每月收支不变，国库约${cashRunway}个月后会低于零；一次性支出、贸易、战事与领土变化可能使时间提前或推后。`:`At the current monthly rate, treasury may fall below zero in about ${cashRunway} month${cashRunway===1?'':'s'}; one-time spending, trade, war and territorial changes can move this date.`}</p>`;
 const budgetWarnings=taxForecastHtml+cashWarning+(runway===null?'':`<p class="budget-runway">${zh?`若每月收支不变，全国存粮约${runway}个月后会跌破零；行省储粮设施可能延后缺粮，贸易与战事也会改变结果。`:`At the current monthly rate, national food may fall below zero in about ${runway} month${runway===1?'':'s'}; provincial grain stores may delay the shortage, and trade or war can change this.`}</p>`);
 const reason=contribution?.reason,status=contribution?.ok?(zh?`从${contribution.regions}个稳定领土取得${contribution.income}国库；每处忠诚−5、满意度−4，国家稳定度−2。`:`Raise ${contribution.income} treasury from ${contribution.regions} stable territories; each loses 5 loyalty and 4 satisfaction, and national stability falls by 2.`):reason==='cooldown'?(zh?`还需等待${contribution.remaining}个月。`:`Available again in ${contribution.remaining} months.`):reason==='stability'?(zh?'国家稳定度须至少为40。':'National stability must reach 40.'):reason==='support'?(zh?'当前没有足够的稳定城镇愿意出资。':'Too few stable communities can contribute.'):reason==='campaign'?(zh?'战役已经正式结束。':'The campaign has ended.'):zh?'仅在与其他国家交战时可用。':'Available during a war with another state.';
 const contributionHtml=contribution?`<div class="war-contribution-panel"><h3>${zh?'战时城镇筹款':'WARTIME MUNICIPAL CONTRIBUTIONS'}</h3><p>${status}</p><button class="action" id="war-contribution" ${contribution.ok?'':'disabled'}>${zh?'征集战时款项':'COLLECT WAR CONTRIBUTIONS'}</button><p>${zh?'每12个月最多一次。凯撒在《内战记》1.6.8中指称对手向意大利城镇征款；此行动的数值与社会后果属于游戏设计。':'At most once every 12 months. Caesar alleges municipal contributions in Civil War 1.6.8; the amounts and social consequences here are game design.'} <a href="https://classics.andrewgadsden.com/library/caesar/de-bello-civili/1?line=76" target="_blank" rel="noopener noreferrer">${zh?'查看原文':'Primary text'}</a></p></div>`:'';
 const supplyReason=provisions?.reason,supplyStatus=provisions?.ok?(zh?`从${provisions.regions}处己方城镇取得${provisions.food}粮食；每处忠诚−4、满意度−5，国家稳定度−2，未来三个月产量降低。`:`Gather ${provisions.food} food from ${provisions.regions} friendly communities; each loses 4 loyalty and 5 satisfaction, national stability falls by 2, and production falls for three months.`):supplyReason==='cooldown'?(zh?`还需等待${provisions.remaining}个月。`:`Available again in ${provisions.remaining} months.`):supplyReason==='storage'?(zh?'粮仓没有足够空间。':'Not enough storage capacity.'):supplyReason==='support'?(zh?'没有足够愿意提供储粮的稳定城镇。':'Too few stable communities have stores to contribute.'):supplyReason==='stability'?(zh?'国家稳定度须至少为40。':'National stability must reach 40.'):supplyReason==='campaign'?(zh?'战役已经正式结束。':'The campaign has ended.'):zh?'仅在与其他国家交战时可用。':'Available during a war with another state.';
 const supplyHtml=provisions?`<div class="war-contribution-panel"><h3>${zh?'紧急征集粮食':'EMERGENCY PROVISIONS'}</h3><p>${supplyStatus}</p><button class="action" id="emergency-provisions" ${provisions.ok?'':'disabled'}>${zh?'征集地方储粮':'GATHER LOCAL STORES'}</button><p>${zh?'每12个月最多一次。凯撒在《内战记》1.52记述从友好城镇紧急取得补给；数值和三个月的地方损失属于游戏设计。':'At most once every 12 months. Caesar describes seeking emergency supplies from friendly communities in Civil Wars 1.52; amounts and three-month local costs are game design.'} <a href="https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Civil_Wars/1B%2A.html" target="_blank" rel="noopener noreferrer">${zh?'查看原文':'Primary text'}</a></p></div>`:'';
 const reserveStatus=aerarium?.ok?(zh?`一次取得${aerarium.income}国库；合法性−${aerarium.legitimacyLoss}，罗马忠诚与满意度各−${aerarium.loyaltyLoss}。`:`Take ${aerarium.income} treasury once; legitimacy −${aerarium.legitimacyLoss}, Rome loyalty and satisfaction −${aerarium.loyaltyLoss} each.`):aerarium?.reason==='claimed'?(zh?'公共储备已动用；读档或重新占领罗马不会再次取得。':'The reserve has been taken; reloading or retaking Rome cannot pay it again.'):aerarium?.reason==='rome'?(zh?'须先控制罗马。':'Control Rome first.'):aerarium?.reason==='war'?(zh?'仅在与元老院交战时可动用。':'Available only during the war with the Senate.'):zh?'战役已结束。':'The campaign has ended.';
 const reserveHtml=aerarium?`<div class="war-contribution-panel"><h3>${zh?'罗马公共金库':'ROME PUBLIC RESERVE'}</h3><p>${reserveStatus}</p><button class="action" id="seize-aerarium" ${aerarium.ok?'':'disabled'}>${zh?'动用公共储备':'TAKE PUBLIC RESERVE'}</button><p>${zh?'这是可放弃的一次性政治决定。阿庇安《内战史》2.41记述凯撒在保民官反对下取走罗马公共金库；85国库及政治代价是游戏估算，不是史料金额。':'This optional political decision is available once. Appian, Civil Wars 2.41, describes Caesar taking Rome’s public reserve despite a tribune’s opposition. The 85 treasury and political costs are game estimates, not historical sums.'} <a href="https://scriptura.si/works/appian-civil-wars/10/" target="_blank" rel="noopener noreferrer">${zh?'查看原文':'Primary text'}</a></p></div>`:'';
 return `<section class="national-budget"><h3>${zh?'每月国家预算':'MONTHLY NATIONAL BUDGET'}</h3><table><tbody>${rows}</tbody></table>${budgetWarnings}<p>${zh?'建造、研究、理念／槽位变更与建筑材料采购在下令时一次付费；本月已付费用不包含在预计下月国库变化中，建成后的维持费列于上方。新征召3000人消耗12–24国库（取决于地方设施）、6粮食、3000兵源；增援消耗24国库、6粮食、3000兵源并等待一个月；训练消耗8国库、2粮食并等待一个月。贸易、战斗、修船与事件可能使实际结算偏离预计值。粮仓容量和债务下限也会截断变化。':'Construction, research, idea or slot changes, and construction-material purchases are paid once when ordered. This month’s paid costs are separate from the projected next-month treasury change; ongoing building upkeep appears above. Raising 3,000 troops costs 12–24 treasury (depending on local facilities), 6 food and 3,000 manpower. Reinforcing costs 24 treasury, 6 food and 3,000 manpower and one month; training costs 8 treasury, 2 food and one month. Trade, combat, repairs and events can change the actual result. Storage caps and debt limits can truncate it.'}</p><p>${zh?'粮食库存低于零会损害军队、稳定度与地方民心；缺口达到8或20时惩罚加重，严重缺粮也会加快人口流失。':'Food stores below zero harm armies, stability and local support. Losses worsen when the deficit reaches 8 or 20; severe shortages also accelerate population decline.'}</p>${contributionHtml}${supplyHtml}${reserveHtml}</section>`;
}
