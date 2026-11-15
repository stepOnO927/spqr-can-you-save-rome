import {footholdConnected, footholdQuote, startFoothold, stockFoothold, resupplyAtFoothold} from '../foothold.js';

export function renderFootholdPanel({state, entity, actor, language, panel, refresh}) {
  const zh = language === 'zh', own = entity.foothold?.owner === actor ? entity.foothold : null;
  const section = document.createElement('section'); section.className = 'help-list foothold-panel';
  const title = document.createElement('strong'); title.textContent = zh ? '前进据点' : 'FORWARD FOOTHOLD'; section.append(title);
  const status = document.createElement('p'); status.textContent = own ?
    (zh ? `等级 ${own.level} · 储粮 ${own.stockFood} · ${footholdConnected(state, entity.id, actor) ? '补给线路畅通' : '补给线路中断'}` : `Level ${own.level} · stored food ${own.stockFood} · ${footholdConnected(state, entity.id, actor) ? 'supply line connected' : 'supply line cut'}`) :
    (zh ? '尚未建立据点；地方通行或控制权不等于驻军基地。' : 'No foothold yet; local passage or control is not a military base.'); section.append(status);
  if (own?.project) { const progress = document.createElement('p'); progress.textContent = zh ? `建设中：等级 ${own.project.targetLevel}，还需 ${own.project.remaining} 个月。驻军或线路中断会暂停建设。` : `Building level ${own.project.targetLevel}: ${own.project.remaining} months remain. Missing garrison or connection pauses progress.`; section.append(progress); }
  const quote = footholdQuote(state, entity.id, actor);
  if (!own?.project) {
    const build = document.createElement('button'); build.id = 'foothold-build'; build.disabled = !quote.ok;
    build.textContent = quote.ok ? (zh ? `建设等级 ${quote.level} · ${quote.treasury}国库 / ${quote.food}粮食 / ${quote.months}个月` : `Build level ${quote.level} · ${quote.treasury} treasury / ${quote.food} food / ${quote.months} months`) :
      (zh ? '当前无法建设据点' : 'Foothold construction unavailable');
    build.onclick = () => { if (startFoothold(state, entity.id, actor).ok) refresh(); }; section.append(build);
    if (!quote.ok) { const reason = document.createElement('p'); reason.textContent = ({no_rights: zh ? '需要地方协议或控制权。' : 'Local rights or control required.', control: zh ? '更高等级需要控制城邦。' : 'Higher levels require city control.', host_control: zh ? '需要控制所在战区。' : 'Control of the host theater required.', route_cut: zh ? '没有安全的补给线路。' : 'No reliable supply connection.', garrison: zh ? '需要当地驻军。' : 'A local garrison is required.', resources: zh ? '国库或粮食不足。' : 'Insufficient treasury or food.', administration: zh ? '需要先整顿地方行政。' : 'Local administration must be established first.', maximum: zh ? '已达该地点最高等级。' : 'This location is at its maximum level.'})[quote.reason] || ''; section.append(reason); }
  }
  if (own?.level >= 1) {
    const stock = document.createElement('button'); stock.id = 'foothold-stock'; stock.textContent = zh ? '运入4粮食' : 'Stock 4 food'; stock.disabled = !footholdConnected(state, entity.id, actor) || state.factions[actor].food < 4 || own.stockFood + 4 > own.level * 12; stock.onclick = () => { if (stockFoothold(state, entity.id, actor, 4).ok) refresh(); }; section.append(stock);
    const armies = state.armies.filter(army => army.owner === actor && army.region === entity.theater && army.men > 0 && !army.move);
    if (armies.length) { const select = document.createElement('select'); select.setAttribute('aria-label', zh ? '据点补给军队' : 'Army to rest at foothold'); for (const army of armies) { const option = document.createElement('option'); option.value = army.id; option.textContent = army.name[zh ? 1 : 0]; select.append(option); } const rest = document.createElement('button'); rest.id = 'foothold-rest'; rest.textContent = zh ? '消耗2储粮休整军队' : 'Rest army using 2 stored food'; rest.disabled = own.stockFood < 2; rest.onclick = () => { if (resupplyAtFoothold(state, entity.id, select.value, actor).ok) refresh(); }; section.append(select, rest); }
  }
  panel.append(section);
  return section;
}
