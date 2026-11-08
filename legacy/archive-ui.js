import {FACTIONS,REGIONS} from '../data.js?v=9';
import {GRAND_SITES} from '../grand-map-data.js';
import {achievementDefinition} from '../achievement-system.js?v=4';

const labels=new Map([...REGIONS.map(r=>[r.id,r.name]),...GRAND_SITES.map(site=>[site.id,site.site])]);
const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const finite=value=>Number.isFinite(value)?Number(value).toLocaleString():'—';

export function archivePanelHtml(profile,language='en'){
 const zh=language==='zh',t=(en,cn)=>zh?cn:en,name=value=>Array.isArray(value)?value[zh?1:0]||value[0]:value||'',faction=id=>name(FACTIONS[id]?.short)||id||'?',place=id=>name(labels.get(id))||id||'?';
 const rows=(profile.archive||[]).map(record=>{
  const summary=record.summary||{},economy=summary.economy||{},achievements=(profile.achievements||[]).filter(item=>item.runId===record.id).map(item=>achievementDefinition(item.id)).filter(Boolean);
  const result=record.result==='defeat'?t('Defeat','战败'):record.result==='retired'?t('Voluntary ending','自愿结束'):record.result==='victory'?summary.method==='settlement'?t('Negotiated victory','和议胜利'):t('Military victory','军事胜利'):t('Unresolved','未决');
  const notable=(Array.isArray(record.notable)?record.notable:[]).map(b=>`${escape(place(b?.region))} · ${escape(faction(b?.winner))}`);
  const commanders=(Array.isArray(summary.commanders)?summary.commanders:[]).map(c=>escape(name(c)));
  const civil=summary.civilWarOutcome&&!['caesar','senate'].includes(record.faction)?`<p>${t('Roman civil war','罗马内战')}: ${escape(faction(summary.civilWarOutcome.winner))} · ${summary.civilWarOutcome.kind==='settlement'?t('settlement','和议'):t('military result','军事结果')}</p>`:'';
  const details=notable.length||commanders.length||achievements.length?`<details class="archive-details"><summary>${t('Battles, commanders and earned milestones','战斗、将领与已获成就')}</summary>${notable.length?`<p>${t('Notable battles','重要战斗')}: ${notable.join(' / ')}</p>`:''}${commanders.length?`<p>${t('Your commanders','己方将领')}: ${commanders.join(' / ')}</p>`:''}${achievements.length?`<p>${t('Revealed achievements','已揭晓成就')}: ${achievements.map(item=>escape(name(item.name))).join(' / ')}</p>`:''}</details>`:'';
  return `<article><strong>${escape(faction(record.faction))} · ${Number.isFinite(record.year)?Math.abs(record.year):'—'} BCE</strong><span>${t('Territories','领土')} ${finite(record.territories)} · ${t('Battles','战斗')} ${finite(record.battles)}</span><p>${t('Outcome','结局')}: ${result}${Number.isFinite(summary.duration)?` · ${t('Duration','历时')} ${finite(summary.duration)} ${t('months','个月')}`:''}${Number.isFinite(summary.wins)&&Number.isFinite(summary.losses)?` · ${t('Won / lost','胜／负')} ${finite(summary.wins)}/${finite(summary.losses)}`:''}</p>${Number.isFinite(summary.casualties)?`<p>${t('Your casualties','己方伤亡')}: ${finite(summary.casualties)}</p>`:''}${civil}${Object.keys(economy).length?`<p>${t('Treasury / food / manpower','国库／粮食／兵源')}: ${finite(economy.treasury)}/${finite(economy.food)}/${finite(economy.manpower)}</p>`:''}${details}</article>`;
 }).join('');
 return `<div class="panel-head"><span>TABVLARIVM</span><h2>${t('Archive of campaigns','战役档案馆')}</h2><p>${t('Completed campaign records and earned milestones.','已结束战役的记录与实际获得的成就。')}</p></div><div class="archive-list">${rows||`<p class="empty">${t('Complete a campaign to fill the archive.','完成战役后，档案会在此出现。')}</p>`}</div>`;
}
