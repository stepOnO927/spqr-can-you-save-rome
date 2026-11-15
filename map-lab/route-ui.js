import {planRoutes} from '../route-planner.js';

export function renderRoutePlanner({state, army, language, panel, onFirstStep}) {
  const zh = language === 'zh';
  const name = id => state.regions.find(region => region.id === id)?.name?.[zh ? 1 : 0] || id;
  const section = document.createElement('section'); section.className = 'help-list route-planner';
  const title = document.createElement('strong'); title.textContent = zh ? '远程路线预览' : 'LONG-DISTANCE ROUTES'; section.append(title);
  const help = document.createElement('p'); help.textContent = zh ? '使用现有战区连接和本方控制报告估算路线；每一步仍须单独下令，抵达时重新核实通行权。' : 'Routes use the existing theater graph and your control reports. Order each step separately; passage is checked again on arrival.'; section.append(help);
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
      const first = document.createElement('button'); first.textContent = zh ? `查看第一步：${name(route.firstStep)}` : `Inspect first step: ${name(route.firstStep)}`; first.onclick = () => onFirstStep(route.firstStep); row.append(first);
      results.append(row);
    }
  };
  return section;
}
