import {campaignYear,campaignDate} from '../campaign-date.js?v=multipolar-review-1';
import {MATERIALS} from '../inventions.js?v=multipolar-review-1';
import {FACTIONS} from '../data.js?v=multipolar-review-1';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderTerritoryFacts({state, territory, language = 'en', sightings = []}) {
 const zh = language === 'zh', own = territory.owner === state.player;
 const friendly = state.armies.filter(a => a.owner === state.player && a.region === territory.id && a.men > 0);
 const strength = friendly.reduce((sum, a) => sum + a.men, 0);
 const unitNames = friendly.map(a => escapeHtml(a.name?.[zh ? 1 : 0] || a.id)).join(zh ? '、' : ', ');
 const presence = friendly.length ? `${unitNames} · ${strength.toLocaleString()} ${zh ? '人' : 'men'}` : zh ? '未发现己方驻军' : 'No friendly garrison';
 const reports = sightings.filter(a => a.region === territory.id).map(a => `${escapeHtml(a.name?.[zh ? 1 : 0] || a.id)} · ${a.month}/${campaignYear(a.year)} · ${zh ? '兵力未知' : 'strength unknown'}`);
 const buildingName=id=>escapeHtml(MATERIALS.find(i=>i.id===id)?.name[zh?1:0]||id);
 const buildings=own?((territory.buildings||[]).map(buildingName).join(zh?'、':', ')||(zh?'无':'None'))+(territory.construction?' · '+buildingName(territory.construction.id)+' ('+territory.construction.remaining+(zh?'月':' mo')+')':''):(zh?'未知':'Unknown');
 const population=own&&territory.population,local=own?(state.world?.religiousInstitutions||[]).filter(o=>o.region===territory.id):[];
 const institutions=own?(local.map(o=>`${escapeHtml(o.name?.[zh?1:0]||o.id)} · ${o.followers.toLocaleString()}`).join(zh?'、':', ')||(zh?'无机构':'No institution')):(zh?'未知':'Unknown');
 const legal=own?escapeHtml(FACTIONS[territory.legalSovereign]?.short?.[zh?1:0]||territory.legalSovereign||state.player):(zh?'未知':'Unknown');
 const occupier=own?(territory.militaryOccupier?escapeHtml(FACTIONS[territory.militaryOccupier]?.short?.[zh?1:0]||territory.militaryOccupier):(zh?'无':'None')):(zh?'未知':'Unknown');
 const administration=own?({integrated:zh?'已整合':'Integrated',occupied:zh?'军事占领':'Military occupation',administered:zh?'已设行政机构（仍为占领）':'Administered occupation',disputed:zh?'主权争议':'Disputed'}[territory.administrativeStatus]||escapeHtml(territory.administrativeStatus)):(zh?'未知':'Unknown');
 return `<section class="theater-facts" data-region-facts="${escapeHtml(territory.id)}"><h3>${zh ? '战区实况' : 'THEATER RECORD'}</h3><div class="detail-grid"><span>${zh?'法理归属':'Legal sovereign'}</span><b>${legal}</b><span>${zh?'军事占领者':'Military occupier'}</span><b>${occupier}</b><span>${zh?'行政状态':'Administration'}</span><b>${administration}</b><span>${zh ? '粮食潜力' : 'Food potential'}</span><b>${own ? territory.food : zh ? '未知' : 'Unknown'}</b><span>${zh ? '军事存在' : 'Military presence'}</span><b>${presence}</b><span>${zh ? '估算人口' : 'Simulated population'}</span><b>${population?population.total.toLocaleString():(zh?'未知':'Unknown')}</b><span>${zh ? '人口满意度' : 'Population satisfaction'}</span><b>${population?population.satisfaction+'/100':(zh?'未知':'Unknown')}</b><span>${zh ? '宗教机构支持者' : 'Institution supporters'}</span><b>${institutions}</b><span>${zh ? '建筑与建设队列' : 'Buildings and construction queue'}</span><b>${buildings}</b></div>${reports.length ? `<p>${zh ? '敌军报告（可能过时）：' : 'Enemy reports (may be outdated): '}${reports.join(zh ? '；' : '; ')}</p>` : ''}<p>${zh ? '人口为游戏估算，非历史普查；地图上的道路和城址并非已建成的游戏建筑。' : 'Population is a gameplay estimate, not a historical census. Mapped roads and places are geographic references, not completed game buildings.'}</p></section>`;
}
