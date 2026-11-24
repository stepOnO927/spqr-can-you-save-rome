import {campaignYear,campaignDate} from '../campaign-date.js?v=calendar-1';
import {MATERIALS} from '../inventions.js?v=mission-discount-1';
import {TRADITIONS} from '../religious-demographics.js';
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
 const traditions=population?.traditions?Object.entries(population.traditions).filter(([,share])=>share>=1).sort((a,b)=>b[1]-a[1]).map(([id,share])=>`${escapeHtml(TRADITIONS[id]?.name[zh?1:0]||id)} ${Math.round(share)}%`).join(zh?'、':', '):(zh?'未知':'Unknown');
 const institutions=own?(local.map(o=>`${escapeHtml(o.name?.[zh?1:0]||o.id)} · ${o.followers.toLocaleString()}`).join(zh?'、':', ')||(zh?'无机构':'No institution')):(zh?'未知':'Unknown');
 const migration=own?[...(state.world?.populationMigrations||[])].reverse().find(x=>x.from===territory.id||x.to===territory.id):null;
 const other=migration&&state.regions.find(r=>r.id===(migration.from===territory.id?migration.to:migration.from));
 const migrationDetail=migration&&other?(zh?`${migration.count.toLocaleString()}人 · ${migration.from===territory.id?'迁往':'来自'}${escapeHtml(other.name?.[1]||other.id)} · ${campaignDate(migration.month,migration.year,language)}`:`${migration.count.toLocaleString()} people · ${migration.from===territory.id?'left for':'arrived from'} ${escapeHtml(other.name?.[0]||other.id)} · ${campaignDate(migration.month,migration.year,language)}`):own?(zh?'暂无记录':'No recorded movement'):(zh?'未知':'Unknown');
 return `<section class="theater-facts" data-region-facts="${escapeHtml(territory.id)}"><h3>${zh ? '战区实况' : 'THEATER RECORD'}</h3><div class="detail-grid"><span>${zh ? '粮食潜力' : 'Food potential'}</span><b>${own ? territory.food : zh ? '未知' : 'Unknown'}</b><span>${zh ? '军事存在' : 'Military presence'}</span><b>${presence}</b><span>${zh ? '估算人口' : 'Simulated population'}</span><b>${population?population.total.toLocaleString():(zh?'未知':'Unknown')}</b><span>${zh ? '人口满意度' : 'Population satisfaction'}</span><b>${population?population.satisfaction+'/100':(zh?'未知':'Unknown')}</b><span>${zh ? '最近迁徙' : 'Recent migration'}</span><b>${migrationDetail}</b><span>${zh ? '宗教传统（游戏估算）' : 'Religious traditions (game estimate)'}</span><b>${traditions}</b><span>${zh ? '宗教机构支持者' : 'Institution supporters'}</span><b>${institutions}</b><span>${zh ? '建筑与建设队列' : 'Buildings and construction queue'}</span><b>${buildings}</b></div>${reports.length ? `<p>${zh ? '敌军报告（可能过时）：' : 'Enemy reports (may be outdated): '}${reports.join(zh ? '；' : '; ')}</p>` : ''}<p>${zh ? '人口与宗教构成为游戏估算，非历史普查；地图上的道路和城址并非已建成的游戏建筑。' : 'Population and religious composition are gameplay estimates, not a historical census. Mapped roads and places are geographic references, not completed game buildings.'}</p></section>`;
}
