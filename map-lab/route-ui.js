import {planRoutes} from '../route-planner.js';

export function renderRoutePlanner({state, army, language, panel, onFirstStep, onStartExpedition}) {
  const zh = language === 'zh';
  const name = id => state.regions.find(region => region.id === id)?.name?.[zh ? 1 : 0] || id;
  const section = document.createElement('section'); section.className = 'help-list route-planner';
  const title = document.createElement('strong'); title.textContent = zh ? '远程路线预览' : 'LONG-DISTANCE ROUTES'; section.append(title);
  const help = document.createElement('p'); help.textContent = zh ? '使用现有战区连接和本方控制报告估算路线。可为已知合法路线下达逐段远征令；战斗、围城或线路变化会使远征暂停。' : 'Routes use the existing theater graph and your control reports. A confirmed route can be ordered leg by leg; combat, sieges or changed access pause the expedition.'; section.append(help);
  const select = document.createElement('select'); select.setAttribute('aria-label', zh ? '路线目的地' : 'Route destination');
  const prompt = document.createElement('option'); prompt.value = ''; prompt.textContent = zh ? '选择远方战区' : 'Choose destination'; select.append(prompt);
  for (const theater of state.regions.filter(region => region.id !== army.region)) { const option = document.createElement('option'); option.value = theater.id; option.textContent = name(theater.id); select.append(option); }
  const button = document.createElement('button'); button.textContent = zh ? '比较路线' : 'COMPARE ROUTES';
  const results = document.createElement('div'); results.setAttribute('role', 'status'); section.append(select, button, results); panel.append(section);
  const statusText = {
    legal: zh ? '按已报告控制权可合法行军' : 'Legally passable on current reports',
    treaty: zh ? '依现有条约通行' : 'Passage uses an existing treaty',
    supply_risk: zh ? '补给吃紧；行军或战斗有风险' : 'Supply risk on this route',
    unconfirmed: zh ? '部分控制权未知；不能保证合法通行' : 'Some control is unknown; legal access is unconfirmed',
    requires_transport: zh ? '现有国库不足以支付全部海运' : 'Current treasury does not cover all sea transport',
    requires_permission: zh ? '至少一段需要军事通行权或明确的非法越境命令' : 'At least one leg needs military access or an explicit unauthorized order'
  };
  button.onclick = () => {
    results.replaceChildren();
    if (!select.value) return;
    const plan = planRoutes(state, army.id, select.value);
    if (!plan.ok) { results.textContent = zh ? '没有已建模的可达路线；目的地可能不在本剧本。' : 'No modeled route reaches that destination in this scenario.'; return; }
    for (const [index, route] of plan.routes.entries()) {
      const row = document.createElement('div'); row.className = 'route-choice';
      const recommended = index === 0 && ['legal', 'treaty', 'supply_risk'].includes(route.status);
      const label = document.createElement('strong'); label.textContent = `${recommended ? (zh ? '推荐 · ' : 'RECOMMENDED · ') : ''}${route.nodes.map(name).join(' → ')}`; row.append(label);
      const detail = document.createElement('p'); detail.textContent = `${statusText[route.status]} · ${zh ? '约' : 'about '}${route.months}${zh ? '个月' : ' months'}${route.seaCost ? ` · ${zh ? '预计海运' : 'estimated sea transport'} ${route.seaCost}` : ''}`; row.append(detail);
      const brief=route.brief;
      if(brief){
        const dossier=document.createElement('details');dossier.className='route-brief';
        const summary=document.createElement('summary');summary.textContent=zh?'远征简报：目标、补给与风险':'EXPEDITION BRIEF: OBJECTIVE, SUPPLY & RISKS';dossier.append(summary);
        const line=(label,value)=>{const p=document.createElement('p');p.textContent=`${label}: ${value}`;dossier.append(p)};
        line(zh?'战区目标':'Territorial objective',name(brief.objective));
        line(zh?'本土基地':'Home base',brief.homeBase?name(brief.homeBase):(zh?'当前路线没有已整合的本土基地':'No integrated home base on this route'));
        line(zh?'已知集结候选点':'Known staging candidates',brief.staging.length?brief.staging.map(point=>`${name(point.theater)}${point.kind==='depot'?` (${zh?'仓库存粮':'depot food'} ${point.storedFood}；${zh?'出发时重新核实联络线':'connection rechecked on departure'})`:''}`).join(' · '):(zh?'未发现已整合战区或有粮仓库':'No integrated theater or stocked depot found'));
        line(zh?'补给需求':'Supply requirement',zh?`${brief.armyMen.toLocaleString()} 人；前沿仓库每月最低 ${brief.monthlyDepotFood} 粮；本方现有粮食 ${brief.factionFood}；预计海运国库 ${brief.seaCost}`:`${brief.armyMen.toLocaleString()} soldiers; forward depot minimum ${brief.monthlyDepotFood} food per month; faction food ${brief.factionFood}; estimated sea transport ${brief.seaCost} treasury`);
        const accessLabel={legal:zh?'按报告可通行':'reported legal',treaty:zh?'依条约通行':'treaty',unconfirmed:zh?'控制未知':'unconfirmed',requires_permission:zh?'需取得通行权':'permission needed'};
        line(zh?'逐段政治通行':'Political access by leg',brief.politicalAccess.map(leg=>`${name(leg.theater)} · ${accessLabel[leg.status]||leg.status}`).join(' → '));
        const riskLabel={requires_permission:zh?'通行权不足':'access required',unconfirmed:zh?'控制报告不足':'control unconfirmed',supply:zh?'基准补给容量可能不足':'baseline supply may be strained',support_unconfirmed:zh?'外国地方补给未经核实':'foreign local support unconfirmed',sea:zh?'海运耗时并收费':'sea travel takes time and funds',transport:zh?'现有国库不足海运':'treasury below estimated sea cost'};
        line(zh?'已知风险':'Known risks',brief.risk.length?brief.risk.map(item=>`${item.theater?name(item.theater)+' · ':''}${riskLabel[item.kind]||item.kind}`).join('；'):(zh?'当前报告未显示特殊风险；途中仍须重新核实':'No special risk in current reports; each leg is checked again en route'));
        row.append(dossier);
      }
      const first = document.createElement('button'); first.textContent = zh ? `查看第一步：${name(route.firstStep)}` : `Inspect first step: ${name(route.firstStep)}`; first.onclick = () => onFirstStep(route.firstStep); row.append(first);
      const start = document.createElement('button'); start.textContent = zh ? '按此路线远征' : 'START EXPEDITION'; start.disabled = !['legal', 'treaty', 'supply_risk'].includes(route.status) || route.legs.some(leg => !['legal', 'treaty'].includes(leg.status)); start.onclick = () => { const outcome = onStartExpedition(route.nodes); if (!outcome.ok) { const error = document.createElement('p'); error.textContent = zh ? '路线或军队状态已经变化，请重新比较路线。' : 'Route or army status changed; compare routes again.'; row.append(error); } }; row.append(start);
      results.append(row);
    }
  };
  return section;
}
