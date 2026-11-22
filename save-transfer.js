import {localStore as localStorage} from './safe-storage.js';
import {validPlayableCampaign} from './local-campaign-save.js?v=world-kings-massilia-1';
const ROMAN_KEYS=['spqr-save-1','spqr-save-2','spqr-save-3'];
const HAN_KEY='spqr-han-save-browser';
const ARCHIVE_KEY='spqr-legacy-archive';
const KEYS=[...ROMAN_KEYS,HAN_KEY,ARCHIVE_KEY];

export function exportSaves(storage){
  const saves={};
  for(const key of KEYS){const value=storage.getItem(key);if(value!==null)saves[key]=value}
  return {format:'spqr-save-transfer',version:1,exportedAt:new Date().toISOString(),saves};
}

function valid(key,raw){
  if(typeof raw!=='string')return false;
  let data;
  try{data=JSON.parse(raw)}catch{return false}
  if(ROMAN_KEYS.includes(key))return validPlayableCampaign(data);
  if(key===HAN_KEY)return !!data&&data.dlc==='mandate-of-heaven'&&Array.isArray(data.regions)&&Array.isArray(data.armies)&&!!data.factions&&!!data.persons&&!!data.genealogy&&!!data.throne&&!!data.court;
  return key===ARCHIVE_KEY&&Array.isArray(data);
}

export function importSaves(bundle,storage){
  if(!bundle||bundle.format!=='spqr-save-transfer'||bundle.version!==1||!bundle.saves||typeof bundle.saves!=='object'||Array.isArray(bundle.saves))throw Error('Invalid SPQR transfer file');
  const plan=new Map(),used=new Set(),result={imported:[],unchanged:[],skipped:[]};
  for(const key of KEYS){
    const raw=bundle.saves[key];if(raw===undefined)continue;
    if(!valid(key,raw)){result.skipped.push(`${key}: invalid save`);continue}
    if(key===ARCHIVE_KEY){
      const incoming=JSON.parse(raw),currentRaw=storage.getItem(key),current=currentRaw?JSON.parse(currentRaw):[];
      if(!Array.isArray(current)){result.skipped.push(`${key}: existing archive invalid`);continue}
      const ids=new Set(current.map((entry,index)=>entry?.id??`local-${index}`));
      const additions=incoming.filter((entry,index)=>{const id=entry?.id??`import-${index}`;if(ids.has(id))return false;ids.add(id);return true});
      if(additions.length)plan.set(key,JSON.stringify([...current,...additions]));
      else result.unchanged.push(key);
      continue;
    }
    const candidates=ROMAN_KEYS.includes(key)?[key,...ROMAN_KEYS.filter(k=>k!==key)]:[key];
    if(candidates.some(candidate=>storage.getItem(candidate)===raw)){result.unchanged.push(key);continue}
    const target=candidates.find(candidate=>!used.has(candidate)&&storage.getItem(candidate)===null);
    if(!target){result.skipped.push(`${key}: no empty slot`);continue}
    used.add(target);plan.set(target,raw);
  }
  const written=[];
  try{for(const [key,value] of plan){const before=storage.getItem(key);storage.setItem(key,value);written.push([key,before]);result.imported.push(key)}}
  catch(error){for(const [key,before] of written.reverse()){if(before===null)storage.removeItem(key);else storage.setItem(key,before)}throw error}
  return result;
}

if(typeof document!=='undefined'){
  const zh=()=>document.documentElement.lang.toLowerCase().startsWith('zh')||localStorage.getItem('spqr-lang')==='zh'||localStorage.getItem('spqr-han-lang')==='zh';
  const label=(en,cn)=>zh()?cn:en;
  const trigger=document.createElement('button');trigger.id='save-transfer-open';trigger.type='button';trigger.textContent=label('Transfer saves','迁移存档');
  const dialog=document.createElement('dialog');dialog.id='save-transfer-dialog';
  dialog.innerHTML='<form method="dialog"><button class="transfer-close" aria-label="Close">×</button></form><h2></h2><p class="transfer-help"></p><div class="transfer-actions"><button type="button" id="save-transfer-export"></button><label id="save-transfer-import-label" for="save-transfer-file"></label><input id="save-transfer-file" type="file" accept=".json,application/json"></div><p id="save-transfer-status" role="status" aria-live="polite"></p>';
  document.body.append(dialog);
  // Keep the entry with each view's save controls. The campaign redraws its
  // toolbar, so reattach the same button after a redraw instead of floating
  // over the map or the advance-month control.
  const app=document.querySelector('#app'),mast=document.querySelector('.mast');
  const mount=()=>{const host=app?.querySelector('.setup-panel .setup-saves')||app?.querySelector('.map-toolbar .controls')||(mast?document.querySelector('#load')?.parentElement:null)||document.querySelector('body > header > div');if(!host||trigger.parentNode===host)return;const load=host.querySelector('#load');if(load)load.insertAdjacentElement('afterend',trigger);else host.append(trigger)};
  mount();const observed=app||mast;if(observed)new MutationObserver(mount).observe(observed,{childList:true,subtree:true});
  const refresh=()=>{trigger.textContent=label('Transfer saves','迁移存档');dialog.querySelector('h2').textContent=label('Transfer saves to another site','跨网站迁移存档');dialog.querySelector('.transfer-help').textContent=label('Save your current campaign first. Export on the old site, then import the file on the new site. Existing slots are never overwritten.','请先保存当前战役。在旧网站导出文件，再到新网站导入。已有栏位不会被覆盖。');dialog.querySelector('#save-transfer-export').textContent=label('Export saves','导出存档');dialog.querySelector('#save-transfer-import-label').textContent=label('Import saves','导入存档')};
  trigger.onclick=()=>{refresh();dialog.showModal()};
  dialog.querySelector('#save-transfer-export').onclick=()=>{const status=dialog.querySelector('#save-transfer-status');try{const bundle=exportSaves(localStorage);if(!Object.keys(bundle.saves).length){status.textContent=label('No saved campaigns found on this site.','此网站没有找到已保存的战役。');return}const url=URL.createObjectURL(new Blob([JSON.stringify(bundle)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download=`spqr-saves-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent=label('Save file exported. Keep it private.','存档文件已导出，请妥善保管。')}catch{status.textContent=label('Could not read browser saves.','无法读取浏览器存档。')}};
  dialog.querySelector('#save-transfer-file').onchange=async event=>{const status=dialog.querySelector('#save-transfer-status'),file=event.target.files?.[0];if(!file)return;try{if(file.size>50*1024*1024)throw Error('File too large');const result=importSaves(JSON.parse(await file.text()),localStorage);status.textContent=label(`Imported ${result.imported.length}; already present ${result.unchanged.length}; skipped ${result.skipped.length}. Reload to see imported saves.`,`已导入 ${result.imported.length} 项，已有 ${result.unchanged.length} 项，跳过 ${result.skipped.length} 项。刷新页面后即可读取。`)+(result.skipped.length?' '+result.skipped.join('; '):'')+(!localStorage.persistent?' '+label('Browser storage is restricted; export a file before closing.','浏览器存储受限；关闭前请导出文件。'):'')}catch(error){status.textContent=label('Import failed: ','导入失败：')+error.message}event.target.value=''};
}
