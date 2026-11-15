import {localEntity, villageDevelopment} from '../local-polities.js';
import {villageProjectQuote, startVillageProject, villageFoodQuote, takeVillageFood} from '../local-villages.js';
import {FACTIONS} from '../data.js?v=world-kings-trade-1';

export function renderVillage({state, id, actor, language, panel, refresh}) {
  const entity = localEntity(state, id), zh = language === 'zh';
  if (entity?.type !== 'village') return;
  const region = state.regions.find(place => place.id === entity.theater);
  const visible = region?.owner === actor || entity.controller === actor || state.armies.some(army => army.owner === actor && army.region === entity.theater && army.men > 0);
  const section = document.createElement('section'); section.className = 'theater-facts';
  const heading = document.createElement('h3'); heading.textContent = zh ? `村落 · ${entity.name[1]}` : `VILLAGE · ${entity.name[0]}`; section.append(heading);
  const description = document.createElement('p'); description.textContent = entity.description[zh ? 1 : 0]; section.append(description);
  if (!visible) { const unknown = document.createElement('p'); unknown.textContent = zh ? '尚无可靠的村落报告。' : 'No reliable village report yet.'; section.append(unknown); panel.append(section); return; }
  if(entity.sponsor){const patron=localEntity(state,entity.sponsor),control=document.createElement('p'),faction=id=>FACTIONS[id]?.short?.[zh?1:0]||id;control.textContent=zh?`地方豪强：${patron?.name?.[1]||'未知'} · 实际控制：${entity.controller===entity.sponsor?'豪强部曲':faction(entity.controller)} · 法理归属：${faction(entity.legalSovereign)}。效忠谈判不会自动转移村落。`:`Local chief: ${patron?.name?.[0]||'unknown'} · current control: ${entity.controller===entity.sponsor?'chief’s retinue':faction(entity.controller)} · legal title: ${faction(entity.legalSovereign)}. Personal service does not transfer the village.`;section.append(control)}
  const v = entity.village, facts = document.createElement('p');
  facts.textContent = zh
    ? `人口约 ${v.population} · ${v.leader[1]} · 特产${v.specialty[1]} · 储粮 ${v.storedFood} · 月产 ${v.foodProduction + v.irrigation + v.agriculture} / 村民月需 ${v.foodNeed} · 粮仓 ${v.granary}/2 · 灌溉 ${v.irrigation}/2 · 农田 ${v.agriculture}/2 · 市场 ${v.market}/1 · 水井 ${v.well}/1 · 道路 ${v.road}/1 · 围墙 ${v.wall}/1 · 社区祭所 ${v.shrine}/1 · 市场通达 ${v.marketAccess}/100 · 满意 ${v.satisfaction}/100 · 安全 ${v.security}/100`
    : `Population about ${v.population} · ${v.leader[0]} · ${v.specialty[0]} · stored food ${v.storedFood} · monthly production ${v.foodProduction + v.irrigation + v.agriculture} / local need ${v.foodNeed} · granary ${v.granary}/2 · irrigation ${v.irrigation}/2 · fields ${v.agriculture}/2 · market ${v.market}/1 · well ${v.well}/1 · road ${v.road}/1 · wall ${v.wall}/1 · community shrine ${v.shrine}/1 · market access ${v.marketAccess}/100 · satisfaction ${v.satisfaction}/100 · security ${v.security}/100`;
  section.append(facts);
  const development = villageDevelopment(v), status = document.createElement('p');
  status.textContent = zh ? `聚落发展：${development.marketTown ? '集镇' : '村落'}${development.fortified ? ' · 设防聚落' : ''}。需至少700人口、粮仓及足够粮产；集镇另需市场、道路、通达和满意度，设防另需围墙、道路及安全。` : `Settlement development: ${development.marketTown ? 'market town' : 'village'}${development.fortified ? ' · fortified settlement' : ''}. Requires at least 700 people, a granary and sufficient food production; a market town also needs a market, road, access and satisfaction, while fortification needs a wall, road and security.`;
  section.append(status);
  const rules = document.createElement('p'); rules.textContent = zh ? '正常购粮保留两个月村民口粮；紧急征粮会伤害村民。农田提高月产粮，祭所缓慢改善满意度；市场与道路改善收入、购粮和补给，围墙提高安全。集镇另增地方收入与可购粮量。' : 'Normal purchases preserve two months of civilian food; emergency requisition harms villagers. Fields add monthly food and a shrine slowly improves satisfaction; market and road improve income, purchases and supply, while a wall raises security. A market town adds local revenue and purchase capacity.'; section.append(rules);
  if (v.project) { const pending = document.createElement('p'), names = {granary:'粮仓',irrigation:'灌溉',market:'市场',well:'水井',road:'道路',wall:'围墙',shrine:'社区祭所',agriculture:'农田'}; pending.textContent = zh ? `${names[v.project.kind] || v.project.kind}建设剩余 ${v.project.remaining} 个月。` : `${v.project.kind} project: ${v.project.remaining} months remaining.`; section.append(pending); }
  const purchase = villageFoodQuote(state, id, actor);
  const actions = [
    {id: 'village-granary', label: zh ? '建粮仓 · 8国库 / 2粮食' : 'BUILD GRANARY · 8 TREASURY / 2 FOOD', quote: villageProjectQuote(state, id, 'granary', actor), run: () => startVillageProject(state, id, 'granary', actor)},
    {id: 'village-irrigation', label: zh ? '修灌溉 · 10国库 / 2粮食' : 'BUILD IRRIGATION · 10 TREASURY / 2 FOOD', quote: villageProjectQuote(state, id, 'irrigation', actor), run: () => startVillageProject(state, id, 'irrigation', actor)},
    {id: 'village-market', label: zh ? '建市场 · 12国库 / 2粮食' : 'BUILD MARKET · 12 TREASURY / 2 FOOD', quote: villageProjectQuote(state, id, 'market', actor), run: () => startVillageProject(state, id, 'market', actor)},
    {id: 'village-well', label: zh ? '挖水井 · 7国库 / 1粮食' : 'DIG WELL · 7 TREASURY / 1 FOOD', quote: villageProjectQuote(state, id, 'well', actor), run: () => startVillageProject(state, id, 'well', actor)},
    {id: 'village-road', label: zh ? '修道路 · 14国库 / 2粮食' : 'BUILD ROAD · 14 TREASURY / 2 FOOD', quote: villageProjectQuote(state, id, 'road', actor), run: () => startVillageProject(state, id, 'road', actor)},
    {id: 'village-wall', label: zh ? '筑围墙 · 16国库 / 2粮食' : 'BUILD WALL · 16 TREASURY / 2 FOOD', quote: villageProjectQuote(state, id, 'wall', actor), run: () => startVillageProject(state, id, 'wall', actor)},
    {id: 'village-shrine', label: zh ? '建社区祭所 · 9国库 / 1粮食' : 'BUILD COMMUNITY SHRINE · 9 TREASURY / 1 FOOD', quote: villageProjectQuote(state, id, 'shrine', actor), run: () => startVillageProject(state, id, 'shrine', actor)},
    {id: 'village-agriculture', label: zh ? '开垦农田 · 12国库 / 2粮食' : 'DEVELOP FIELDS · 12 TREASURY / 2 FOOD', quote: villageProjectQuote(state, id, 'agriculture', actor), run: () => startVillageProject(state, id, 'agriculture', actor)},
    {id: 'village-purchase', label: purchase.ok ? (zh ? `购粮 ${purchase.food} · ${purchase.treasury}国库` : `BUY ${purchase.food} FOOD · ${purchase.treasury} TREASURY`) : (zh ? '向村民购粮' : 'PURCHASE VILLAGE FOOD'), quote: purchase, run: () => takeVillageFood(state, id, actor)},
    {id: 'village-requisition', label: zh ? '紧急征粮 · 伤害村民' : 'EMERGENCY REQUISITION · HARMS VILLAGERS', quote: villageFoodQuote(state, id, actor, {emergency: true}), run: () => takeVillageFood(state, id, actor, {emergency: true})}
  ];
  for (const action of actions) { const button = document.createElement('button'); button.id = action.id; button.disabled = !action.quote.ok; button.textContent = action.label; button.onclick = () => {if (action.run().ok) refresh();}; section.append(button); }
  panel.append(section);
}
