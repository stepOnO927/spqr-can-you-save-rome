import {FACTIONS,REGIONS} from '../data.js?v=9';
import {GRAND_SITES} from '../grand-map-data.js?v=3';
import {achievementDefinition} from '../achievement-system.js?v=5';

const labels=new Map([...REGIONS.map(r=>[r.id,r.name]),...GRAND_SITES.map(site=>[site.id,site.site])]);
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const finite=value=>Number.isFinite(value)?Number(value).toLocaleString():'—';

export function archivePanelHtml(profile,language='en'){
 const zh=language==='zh',t=(en,cn)=>zh?cn:en,name=value=>Array.isArray(value)?value[zh?1:0]||value[0]:value||'',faction=id=>name(FACTIONS[id]?.short)||id||'?',place=id=>name(labels.get(id))||id||'?';
 const dateOf=(year,month)=>Number.isFinite(year)?`${zh?`公元${year<0?'前':'后'}${Math.abs(year)}年`:`${Math.abs(year)} ${year<0?'BCE':'CE'}`}${Number.isFinite(month)?zh?`${month}月`:` · month ${month}`:''}`:'—';
 const victories=(profile.archive||[]).filter(record=>record.result==='victory');
 const factionWins=[...new Set(victories.map(record=>record.faction))].map(id=>`<span>${escape(faction(id))}: ${finite(victories.filter(record=>record.faction===id).length)}</span>`).join('');
 const victoryTimeline=victories.slice(0,6).map(record=>`<li>${escape(dateOf(record.year,record.month))} · ${escape(faction(record.faction))} · ${record.summary?.method==='settlement'?t('settlement','和议'):t('military','军事')}</li>`).join('');
 const rows=(profile.archive||[]).map(record=>{
  const summary=record.summary||{},economy=summary.economy||{},achievements=(profile.achievements||[]).filter(item=>item.runId===record.id).map(item=>achievementDefinition(item.id)).filter(Boolean);
  const result=record.result==='defeat'?t('Defeat','战败'):record.result==='retired'?t('Voluntary ending','自愿结束'):record.result==='victory'?summary.method==='settlement'?t('Negotiated victory','和议胜利'):t('Military victory','军事胜利'):t('Unresolved','未决');
  const notable=(Array.isArray(record.notable)?record.notable:[]).map(b=>`${escape(place(b?.region))} · ${escape(faction(b?.winner))}`);
  const battles=(Array.isArray(record.battleHistory)?record.battleHistory:[]).map(b=>`<li>${escape(dateOf(b?.year,b?.month))} · ${escape(place(b?.region))} · ${escape(faction(b?.attacker))} ${t('vs','对')} ${escape(faction(b?.defender))} · ${b?.winner===record.faction?t('won','胜'):t('lost','败')} · ${t('own losses','己方伤亡')} ${finite(b?.casualties)}${b?.commander?` · ${escape(name(b.commander))}`:''}</li>`).join('');
  const commanders=(Array.isArray(summary.commanders)?summary.commanders:[]).map(c=>escape(name(c)));
  const captured=Number.isFinite(summary.conquests)?` · ${t('Distinct captures','不同领土的夺取')} ${finite(summary.conquests)}`:'';
  const worst=summary.worstBattle&&Number.isFinite(summary.worstBattle.casualties)?`<p>${t('Heaviest friendly losses','己方伤亡最重一战')}: ${escape(place(summary.worstBattle.region))} · ${finite(summary.worstBattle.casualties)} · ${summary.worstBattle.won?t('won','胜'):t('lost','败')}</p>`:'';
  const date=dateOf(record.year,record.month);
  const civil=summary.civilWarOutcome&&!['caesar','senate'].includes(record.faction)?`<p>${t('Roman civil war','罗马内战')}: ${escape(faction(summary.civilWarOutcome.winner))} · ${summary.civilWarOutcome.kind==='settlement'?t('settlement','和议'):t('military result','军事结果')}</p>`:'';
  const details=notable.length||battles.length||commanders.length||achievements.length?`<details class="archive-details"><summary>${t('Battles, commanders and earned milestones','战斗、将领与已获成就')}</summary>${battles.length?`<h3>${t('Battle history','战斗纪事')} ${Number(record.battles)>80?t('(latest 80)','（最近80场）'):''}</h3><ol class="archive-battles">${battles}</ol>`:notable.length?`<p>${t('Notable battles','重要战斗')}: ${notable.join(' / ')}</p>`:''}${commanders.length?`<p>${t('Your commanders','己方将领')}: ${commanders.join(' / ')}</p>`:''}${achievements.length?`<p>${t('Revealed achievements','已揭晓成就')}: ${achievements.map(item=>escape(name(item.name))).join(' / ')}</p>`:''}</details>`:'';
  return `<article><strong>${escape(faction(record.faction))} · ${date}</strong><span>${t('Territories','领土')} ${finite(record.territories)} · ${t('Battles','战斗')} ${finite(record.battles)}${captured}</span><p>${t('Outcome','结局')}: ${result}${Number.isFinite(summary.duration)?` · ${t('Duration','历时')} ${finite(summary.duration)} ${t('months','个月')}`:''}${Number.isFinite(summary.wins)&&Number.isFinite(summary.losses)?` · ${t('Won / lost','胜／负')} ${finite(summary.wins)}/${finite(summary.losses)}`:''}</p>${Number.isFinite(summary.casualties)?`<p>${t('Your casualties','己方伤亡')}: ${finite(summary.casualties)}</p>`:''}${worst}${civil}${Object.keys(economy).length?`<p>${t('Treasury / food / manpower','国库／粮食／兵源')}: ${finite(economy.treasury)}/${finite(economy.food)}/${finite(economy.manpower)}</p>`:''}${details}</article>`;
 }).join('');
 return `<div class="panel-head"><span>TABVLARIVM</span><h2>${t('Archive of campaigns','战役档案馆')}</h2><p>${t('Completed campaign records and earned milestones.','已结束战役的记录与实际获得的成就。')}</p></div>${victories.length?`<section class="archive-victories"><h3>${t('Faction victories','阵营胜绩')}</h3><p>${factionWins}</p><h3>${t('Victory timeline','胜利年表')}</h3><ol>${victoryTimeline}</ol></section>`:''}<div class="archive-list">${rows||`<p class="empty">${t('Complete a campaign to fill the archive.','完成战役后，档案会在此出现。')}</p>`}</div>`;
}
