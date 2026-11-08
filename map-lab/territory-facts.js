import {MATERIALS} from '../inventions.js?v=phase-xiv-1';
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
import {BUILDINGS,RELIGIONS} from '../civilization.js?v=phase-xiii-1';

export function renderTerritoryFacts({state, territory, language = 'en', sightings = []}) {
 const zh = language === 'zh', own = territory.owner === state.player;
 const friendly = state.armies.filter(a => a.owner === state.player && a.region === territory.id && a.men > 0);
 const strength = friendly.reduce((sum, a) => sum + a.men, 0);
 const unitNames = friendly.map(a => escapeHtml(a.name?.[zh ? 1 : 0] || a.id)).join(zh ? '、' : ', ');
 const presence = friendly.length ? `${unitNames} · ${strength.toLocaleString()} ${zh ? '人' : 'men'}` : zh ? '未发现己方驻军' : 'No friendly garrison';
 const reports = sightings.filter(a => a.region === territory.id).map(a => `${escapeHtml(a.name?.[zh ? 1 : 0] || a.id)} · ${a.month}/${Math.abs(a.year)} BCE · ${zh ? '兵力未知' : 'strength unknown'}`);
 const religion=Object.entries(territory.religions||{}).map(([id,share])=>`${escapeHtml(RELIGIONS[id]?.[zh?1:0]||id)} ${share}%`).join(zh?'、':', '),buildings=(territory.buildings||[]).map(id=>escapeHtml((BUILDINGS[id]||MATERIALS.find(x=>x.id===id))?.name[zh?1:0]||id)).join(zh?'、':', ');
 return `<section class="theater-facts" data-region-facts="${escapeHtml(territory.id)}"><h3>${zh ? '战区实况' : 'THEATER RECORD'}</h3><div class="detail-grid"><span>${zh ? '粮食潜力' : 'Food potential'}</span><b>${own ? territory.food : zh ? '未知' : 'Unknown'}</b><span>${zh ? '军事存在' : 'Military presence'}</span><b>${presence}</b><span>${zh ? '人口' : 'Population'}</span><b>${own ? territory.population?.toLocaleString() : zh?'未知':'Unknown'}</b><span>${zh ? '人口满意度' : 'Population satisfaction'}</span><b>${own ? territory.satisfaction+'%' : zh?'未知':'Unknown'}</b><span>${zh ? '宗教构成' : 'Religious composition'}</span><b>${own ? religion : zh?'未知':'Unknown'}</b><span>${zh ? '建筑与建设队列' : 'Buildings and construction queue'}</span><b>${own ? `${buildings||'—'}${territory.buildQueue?' · '+escapeHtml(BUILDINGS[territory.buildQueue.id]?.name[zh?1:0]||territory.buildQueue.id):''}${territory.construction?' · '+escapeHtml(MATERIALS.find(x=>x.id===territory.construction.id)?.name[zh?1:0]||territory.construction.id):''}}` : zh?'未知':'Unknown'}</b></div>${reports.length ? `<p>${zh ? '敌军报告（可能过时）：' : 'Enemy reports (may be outdated): '}${reports.join(zh ? '；' : '; ')}</p>` : ''}<p>${zh ? '地图上的历史道路和城址并非已建成的游戏建筑。' : 'Mapped historical roads and places are geographic references, not completed game buildings.'}</p></section>`;
}
