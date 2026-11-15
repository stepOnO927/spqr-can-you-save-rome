import {FACTIONS} from '../data.js?v=9';

const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const titles={'Caesarian Victor':['Caesarian Victor','凯撒派胜者'],'Senatorial Defender':['Senatorial Defender','元老院捍卫者'],'Thessaly Victor':['Thessaly Victor','色萨利胜者'],'Rubicon Survivor':['Rubicon Survivor','卢比孔河幸存者']};

export function triumphalArchHtml(profile,language='en'){
 const zh=language==='zh',t=(en,cn)=>zh?cn:en;
 const records=Array.isArray(profile.triumphs)?profile.triumphs:[];
 const challenges=new Set((profile.achievements||[]).filter(item=>item?.id==='challenge'&&item.claimed).map(item=>item.runId)).size;
 const raceWins=Math.max(0,Number(profile.race?.wins)||0);
 const score=records.length*3+challenges*2+raceWins;
 const rank=score>=20?3:score>=10?2:score>=4?1:0;
 const rankNames=[['Citizen','市民'],['Veteran','老兵'],['Laurel Bearer','桂冠持有者'],['Triumphal Laureate','凯旋桂冠者']];
 const byFaction=new Map();
 for(const record of records)byFaction.set(record.faction,(byFaction.get(record.faction)||0)+1);
 const factions=[...byFaction].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
 const factionName=id=>id==='unknown'?t('Earlier unclassified records','早期未分类记录'):FACTIONS[id]?.short?.[zh?1:0]||id;
 const largest=records.filter(record=>Number.isInteger(record.territories)).sort((a,b)=>b.territories-a.territories)[0];
 const date=record=>Number.isInteger(record?.year)?zh?`公元${record.year<0?'前':'后'}${Math.abs(record.year)}年`:`${Math.abs(record.year)} ${record.year<0?'BCE':'CE'}`:'—';
 const recent=records.slice(0,5).map(record=>`<li><span>${escape(factionName(record.faction))}</span><b>${escape(date(record))}</b><small>${Number.isInteger(record.territories)?`${record.territories} ${t('territories','领土')} · `:''}${record.method==='settlement'?t('negotiated victory','和议胜利'):record.method==='military'?t('military victory','军事胜利'):t('victory','胜利')}</small></li>`).join('');
 return `<div class="panel-head"><span>ARCUS TRIVMPHALIS</span><h2>${t('Triumphal Arch','凯旋门')}</h2><p>${t('Only completed victories are carved here; defeats and voluntary endings remain in the Archive.','此处只铭刻已结束的胜利；战败与自愿结束仍保存在档案馆。')}</p></div><div class="arch-stone"><span>SPQR</span><h3>${(profile.titles||[]).length?profile.titles.map(title=>escape((titles[title]||[title,title])[zh?1:0])).join('<br>'):records.length?t('Victories recorded','胜利已铭刻'):t('No triumph yet','尚无凯旋')}</h3><div class="arch-metrics"><div><strong>${records.length}</strong><small>${t('Campaign victories','战役胜利')}</small></div><div><strong>${challenges}</strong><small>${t('Challenge clears','挑战通关')}</small></div><div><strong>${raceWins}</strong><small>${t('Race wins','战车胜利')}</small></div></div><p class="arch-rank">${t('Legacy standing','遗产等级')}: <b>${t(...rankNames[rank])}</b> · ${score} ${t('points','点')}</p><small class="arch-rule">${t('Victory 3 · challenge 2 · race win 1. Standing grants no campaign bonus.','战役胜利3点 · 挑战2点 · 战车胜利1点；等级不提供战役加成。')}</small></div><section class="arch-records"><h3>${t('Victory records by faction','各阵营胜利记录')}</h3>${factions.length?`<div class="arch-factions">${factions.map(([id,count])=>`<span>${escape(factionName(id))} <b>${count}</b></span>`).join('')}</div>`:`<p>${t('No completed campaign victories yet.','尚无已完成的战役胜利。')}</p>`}${largest?`<p>${t('Largest victorious realm','胜利时领土最多')}: <b>${escape(factionName(largest.faction))}</b> · ${largest.territories} ${t('territories','领土')} · ${escape(date(largest))}</p>`:''}${recent?`<h4>${t('Recent triumphs','近期凯旋')}</h4><ol>${recent}</ol>`:''}</section>`;
}
