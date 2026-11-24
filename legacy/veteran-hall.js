const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

export function veteranService(profile){
 const veterans=new Map();
 for(const campaign of Array.isArray(profile?.archive)?profile.archive:[]){
  for(const battle of Array.isArray(campaign?.battleHistory)?campaign.battleHistory:[]){
   const commander=battle?.commander;
   const name=Array.isArray(commander)?commander:typeof commander==='string'?[commander,commander]:null;
   if(typeof name?.[0]!=='string'||!name[0]||typeof name[1]!=='string'||!name[1])continue;
   const key=JSON.stringify(name),entry=veterans.get(key)||{name:[...name],battles:0,wins:0,losses:0,casualties:0};
   entry.battles++;
   if(battle.winner===campaign.faction)entry.wins++;
   else if(typeof battle.winner==='string'&&battle.winner)entry.losses++;
   const casualties=Number(battle.casualties);
   if(Number.isFinite(casualties))entry.casualties+=Math.max(0,casualties);
   veterans.set(key,entry);
  }
 }
 return [...veterans.values()].sort((a,b)=>b.battles-a.battles||b.wins-a.wins||a.name[0].localeCompare(b.name[0]));
}

export function veteranHallHtml(profile,language='en'){
 const zh=language==='zh',t=(en,cn)=>zh?cn:en,records=veteranService(profile);
 const count=(Array.isArray(profile?.archive)?profile.archive:[]).reduce((sum,campaign)=>sum+(Array.isArray(campaign?.battleHistory)?campaign.battleHistory.length:0),0);
 const rows=records.slice(0,12).map(veteran=>`<li><strong>${escape(veteran.name[zh?1:0])}</strong><span>${t('Recorded battles','记录战斗')} ${veteran.battles} · ${t('Won / lost','胜／负')} ${veteran.wins}/${veteran.losses} · ${t('Own casualties','己方伤亡')} ${veteran.casualties.toLocaleString()}</span></li>`).join('');
 return `<section class="feature-card veteran-hall"><h3>${t('Veteran hall','老兵厅')}</h3><p>${t('Service records from formally ended campaigns only. Each campaign keeps its latest 80 battles; earlier saves may have summary counts without individual battle records.','仅统计正式结束的战役。每场战役保留最近80次战斗；早期存档可能只有汇总，没有逐场记录。')}</p><p>${t('Individual battles on record','已保存逐场战斗')} ${count}</p>${rows?`<ol class="veteran-roster">${rows}</ol>`:`<p>${t('No named commander has a recorded battle yet.','尚无将领的逐场战斗记录。')}</p>`}${records.length>12?`<small>${t('Showing 12 commanders with the most recorded battles.','显示记录战斗最多的12名将领。')}</small>`:''}</section>`;
}
