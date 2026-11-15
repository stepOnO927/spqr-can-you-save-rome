import {localEntity} from '../local-polities.js';
import {villageProjectQuote, startVillageProject, villageFoodQuote, takeVillageFood} from '../local-villages.js';

export function renderVillage({state, id, actor, language, panel, refresh}) {
  const entity = localEntity(state, id), zh = language === 'zh';
  if (entity?.type !== 'village') return;
  const region = state.regions.find(place => place.id === entity.theater);
  const visible = region?.owner === actor || entity.controller === actor || state.armies.some(army => army.owner === actor && army.region === entity.theater && army.men > 0);
  const section = document.createElement('section'); section.className = 'theater-facts';
  const heading = document.createElement('h3'); heading.textContent = zh ? `村落 · ${entity.name[1]}` : `VILLAGE · ${entity.name[0]}`; section.append(heading);
  const description = document.createElement('p'); description.textContent = entity.description[zh ? 1 : 0]; section.append(description);
  if (!visible) { const unknown = document.createElement('p'); unknown.textContent = zh ? '尚无可靠的村落报告。' : 'No reliable village report yet.'; section.append(unknown); panel.append(section); return; }
  const v = entity.village, facts = document.createElement('p');
  facts.textContent = zh
    ? `人口约 ${v.population} · ${v.leader[1]} · 特产${v.specialty[1]} · 储粮 ${v.storedFood} · 月产 ${v.foodProduction + v.irrigation} / 村民月需 ${v.foodNeed} · 粮仓 ${v.granary}/2 · 灌溉 ${v.irrigation}/2 · 满意 ${v.satisfaction}/100 · 安全 ${v.security}/100`
    : `Population about ${v.population} · ${v.leader[0]} · ${v.specialty[0]} · stored food ${v.storedFood} · monthly production ${v.foodProduction + v.irrigation} / local need ${v.foodNeed} · granary ${v.granary}/2 · irrigation ${v.irrigation}/2 · satisfaction ${v.satisfaction}/100 · security ${v.security}/100`;
  section.append(facts);
  const rules = document.createElement('p'); rules.textContent = zh ? '正常购粮须留下两个月的村民口粮；紧急征粮会降低村民满意、安全与战区忠诚。粮仓扩大库存，灌溉增加月产。' : 'Normal purchases preserve two months of civilian food. Emergency requisition harms satisfaction, security and theater loyalty. Granaries raise storage; irrigation raises production.'; section.append(rules);
  if (v.project) { const pending = document.createElement('p'); pending.textContent = zh ? `${v.project.kind === 'granary' ? '粮仓' : '灌溉'}建设剩余 ${v.project.remaining} 个月。` : `${v.project.kind} project: ${v.project.remaining} months remaining.`; section.append(pending); }
  const actions = [
    {id: 'village-granary', label: zh ? '建粮仓 · 8国库 / 2粮食' : 'BUILD GRANARY · 8 TREASURY / 2 FOOD', quote: villageProjectQuote(state, id, 'granary', actor), run: () => startVillageProject(state, id, 'granary', actor)},
    {id: 'village-irrigation', label: zh ? '修灌溉 · 10国库 / 2粮食' : 'BUILD IRRIGATION · 10 TREASURY / 2 FOOD', quote: villageProjectQuote(state, id, 'irrigation', actor), run: () => startVillageProject(state, id, 'irrigation', actor)},
    {id: 'village-purchase', label: zh ? '向村民购粮' : 'PURCHASE VILLAGE FOOD', quote: villageFoodQuote(state, id, actor), run: () => takeVillageFood(state, id, actor)},
    {id: 'village-requisition', label: zh ? '紧急征粮 · 伤害村民' : 'EMERGENCY REQUISITION · HARMS VILLAGERS', quote: villageFoodQuote(state, id, actor, {emergency: true}), run: () => takeVillageFood(state, id, actor, {emergency: true})}
  ];
  for (const action of actions) { const button = document.createElement('button'); button.id = action.id; button.disabled = !action.quote.ok; button.textContent = action.label; button.onclick = () => {if (action.run().ok) refresh();}; section.append(button); }
  panel.append(section);
}
