import {newHanGame,tick,moveArmy,serialize,loadHanSave,SAVE_KEY,recommendOfficial} from './engine.js?v=faces-government-courier-1';
import {FACTIONS,PLAYABLE,ROUTES} from './data.js';
import {drawMap} from './map.js';
import {templatesFor,recruitQuote,recruit,neighbours} from './military.js';
import {changeDependency,dependencyOf} from './dependencies.js';
import {declareWar,propose,atWar} from './frontier.js';
import {marketReasonName,renderEasternMarketPanel} from './market-ui.js?v=faces-horse-remounts-1';
import {renderHanCourtPanel} from './court-ui.js?v=faces-of-empire-4';
import {ownRulerHtml} from './ruler-ui.js';
import {appoint,startAudit,respondToDisaster} from './court.js?v=han-1';
import {init as initExperience,act as experienceAction} from './experience.js?v=government-courier-guidance-1';
import {renderExperience} from './experience-ui.js?v=government-courier-guidance-1';
const $=id=>document.getElementById(id),D=(en,zh)=>lang?zh:en,L=a=>Array.isArray(a)?a[lang]||a[0]:a;
let lang=localStorage.getItem('spqr-han-lang')==='zh'?1:0,s=null,selected=null,army=null,camera='all',mode='political',marketOpen=false,courtOpen=false,selectedCourt='shi-gao';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function message(en,zh){$('message').textContent=D(en,zh)}
function save(){if(!s)return;localStorage.setItem(SAVE_KEY('browser'),serialize(s));message('Campaign saved.','战役已保存。')}
function load(){const raw=localStorage.getItem(SAVE_KEY('browser'));if(!raw){message('No saved campaign.','尚无存档。');return}try{s=loadHanSave(raw);initExperience(s);selected=null;army=null;marketOpen=false;courtOpen=false;render();message('Campaign loaded.','战役已读取。')}catch(e){message('Save could not be loaded: '+e.message,'无法读取存档：'+e.message)}}
function begin(f){s=newHanGame(f);initExperience(s,{guided:true});selected=s.regions.find(r=>r.owner===f)?.id||null;army=null;marketOpen=false;courtOpen=false;render();message('Choose an objective, inspect your realm, then act.','先查看目标与国势，再作出选择。')}
function navigateExperience(kind,id){
 marketOpen=false;courtOpen=false;
 if(kind==='army'){const selectedArmy=s.armies.find(a=>a.id===id&&a.owner===s.player)||s.armies.find(a=>a.owner===s.player&&a.men>0);if(selectedArmy){army=selectedArmy.id;selected=selectedArmy.region;experienceAction(s,'army',army)}}
 else if(kind==='region'){const site=s.regions.find(r=>r.id===id)||s.regions.find(r=>r.owner===s.player&&r.frontier)||s.regions.find(r=>r.owner===s.player);if(site){selected=site.id;experienceAction(s,site.owner===s.player?'frontier':'route',site.id)}}
 render();
}
function date(){return lang?`公元前${Math.abs(s.year)}年${s.month}月`:`${Math.abs(s.year)} BCE · month ${s.month}`}
function renderChronicle(){$('chronicle').innerHTML=`<h3>${D('Recent events','近期事件')}</h3>${s.log.slice(-6).reverse().map(e=>`<p>${esc(e.year||s.year)} · ${esc(L(e.text||e.message||e))}</p>`).join('')||`<p class="muted">${D('The campaign has just begun.','战役刚刚开始。')}</p>`}`}
function render(){
 document.documentElement.lang=lang?'zh-CN':'en';$('title').textContent=D('MANDATE OF HEAVEN · SILK ROAD','天命 · 丝路诸国');$('lang').textContent=lang?'English':'中文';$('save').textContent=D('Save','保存');$('load').textContent=D('Load','读取');$('campaignTitle').textContent=s?`${esc(L(FACTIONS[s.player]?.name))} · ${date()}`:D('Choose a polity','选择政体');
 $('advance').textContent=D('Next month','推进一月');$('advance').disabled=!s||!!s.finalized;$('trade-panel').textContent=D(marketOpen?'Close markets':'Markets',marketOpen?'关闭市场':'市场');$('trade-panel').disabled=!s||!!s.finalized;$('trade-panel').setAttribute('aria-pressed',String(marketOpen));$('court-panel').textContent=D(courtOpen?'Close court':'Court',courtOpen?'关闭朝廷':'朝廷');$('court-panel').disabled=!s||!!s.finalized||s.player!=='han';$('court-panel').setAttribute('aria-pressed',String(courtOpen));
 const choices=[['all',D('All Eurasia','欧亚全图')],['han',D('Han frontier','汉地边疆')],['tarim',D('Tarim Basin','塔里木盆地')],['central',D('Central Asia','中亚')],['iran',D('Iran and Mesopotamia','伊朗与两河')],['caucasus',D('Caucasus','高加索')]];
 $('camera').innerHTML=choices.map(([v,n])=>`<option value="${v}">${n}</option>`).join('');$('camera').value=camera;
 $('mode').innerHTML=[['political',D('Political','政治')],['terrain',D('Terrain','地形')],['military',D('Own armies','我军')],['supply',D('Supply','补给')],['economy',D('Local taxes','地方税收')]].map(([v,n])=>`<option value="${v}">${n}</option>`).join('');$('mode').value=mode;
 $('setup').innerHTML=s?`<p class="muted">${D('All polities share one simulated campaign. Regional centers are approximate, not precise borders.','所有政体共用同一战役模拟。政体中心为概略位置，不代表精确国界。')}</p>`:`<p>${D('Choose Han to begin with Emperor Yuan in 48 BCE, or another polity in 49 BCE.','选择大汉将从公元前48年元帝即位后开始；其他国家从公元前49年开始。')}</p><select id="factionSelect">${PLAYABLE.map(id=>`<option value="${esc(id)}">${esc(L(FACTIONS[id].name))}</option>`).join('')}</select><button id="begin">${D('Begin campaign','开始战役')}</button>`;
 if(!s){$('begin').onclick=()=>begin($('factionSelect').value);$('map').innerHTML='';$('overview').innerHTML='';$('inspector').innerHTML='';$('chronicle').innerHTML='';return}
 if(s.finalized){
  const why=s.finalized.reason==='army_collapse'?D('Six wartime months passed without a field army.','交战期间连续六个月没有野战军。'):s.finalized.reason==='exile'?D('The realm could not regain a home after a year in exile.','失去领地一年后仍未能复国。'):D('No territory or field army remains.','已无领地及野战军。');
  const elapsed=Math.max(0,s.finalized.year*12+s.finalized.month-(s.stats?.startMonth||s.finalized.year*12+s.finalized.month));
  $('overview').innerHTML=`<section class="campaign-defeat" role="status"><h3>${D('Campaign lost','战役失败')}</h3><p>${why}</p><p>${D(`${elapsed} months played · ${s.finalized.regions} regions · ${s.finalized.armies} armies remained.`,`历经${elapsed}个月 · 剩余领地${s.finalized.regions}处 · 军队${s.finalized.armies}支。`)}</p><p class="muted">${D('The campaign is finished. Save it to keep this record, or start a new campaign.','战役已结算。可保存此记录，或开始新战役。')}</p><button id="restart" class="action">${D('New campaign','新战役')}</button></section>`;
  $('inspector').innerHTML=`<h2>${D('Campaign summary','战役总结')}</h2><p>${why}</p>`;
  $('map').innerHTML=drawMap(s,{lang,selected:null,selectedArmy:null,visibleArmy:a=>a.owner===s.player,colors:Object.fromEntries(Object.values(FACTIONS).map(f=>[f.id,f.color])),targets:new Set(),camera,mode,silkPath:s.silk?.lastPath});
  $('restart').onclick=()=>{s=null;selected=null;army=null;marketOpen=false;courtOpen=false;render();message('Choose a polity to begin.','请选择政体开始。')};
  renderChronicle();return;
 }
 const f=s.factions[s.player],owned=s.regions.filter(r=>r.owner===s.player),mine=s.armies.filter(a=>a.owner===s.player&&a.men>0);
 const loss=s.lastPlayerTerritoryLoss,site=loss&&s.regions.find(r=>r.id===loss.region),recentLoss=site&&site.owner!==s.player&&s.year*12+s.month-(loss.year*12+loss.month)<=3;
 const alarm=recentLoss?`<p class="territory-alert" role="status">${D('Territory lost','失地警报')}: ${esc(L(site.name))} → ${esc(L(FACTIONS[loss.to]?.name)||loss.to)}</p>`:'';
 $('overview').innerHTML=`${alarm}<h3>${D('Realm','国势')}</h3><dl><dt>${D('Treasury','国库')}</dt><dd>${f.treasury}</dd><dt>${D('Grain','粮食')}</dt><dd>${f.grain}</dd><dt>${D('Manpower','兵源')}</dt><dd>${f.manpower}</dd><dt>${D('Stability','稳定')}</dt><dd>${f.stability}</dd><dt>${D('Regions','领地')}</dt><dd>${owned.length}</dd><dt>${D('Armies','军队')}</dt><dd>${mine.length}</dd></dl>${ownRulerHtml(s,lang)}<h3>${D('Your armies','麾下军队')}</h3>${mine.map(a=>`<div class="list"><button data-select-army="${esc(a.id)}">${esc(a.id)} · ${esc(L(s.regions.find(r=>r.id===a.region)?.name))} · ${a.men}</button></div>`).join('')||D('No armies remain.','已无军队。')}`;
  $('overview').querySelectorAll('[data-select-army]').forEach(b=>b.onclick=()=>{army=b.dataset.selectArmy;selected=s.armies.find(a=>a.id===army)?.region;marketOpen=false;courtOpen=false;experienceAction(s,'army',army);render()});
 const colors=Object.fromEntries(Object.values(FACTIONS).map(f=>[f.id,f.color]));
 const targets=new Set(army?neighbours(s.armies.find(a=>a.id===army)?.region||'').map(x=>typeof x==='string'?x:x.id):[]);
 $('map').innerHTML=drawMap(s,{lang,selected,selectedArmy:army,visibleArmy:a=>a.owner===s.player,colors,targets,camera,mode,silkPath:s.silk?.lastPath});
 $('map').querySelectorAll('[data-region]').forEach(el=>el.addEventListener('click',()=>{const id=el.dataset.region;marketOpen=false;courtOpen=false;if(army&&id!==selected){const a=s.armies.find(x=>x.id===army);if(a){const r=moveArmy(s,a.id,id,{owner:s.player});if(r.ok){experienceAction(s,'order',id);message(`March ordered: ${r.months} month(s).`,`已下达行军令，预计${r.months}个月。`);render();return}else message(`Cannot move: ${r.reason}.`,`无法行军：${reason(r.reason)}。`)}}selected=id;const place=s.regions.find(r=>r.id===id);experienceAction(s,place?.owner===s.player?'frontier':'route',id);render()}));
  $('map').querySelectorAll('[data-army]').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();army=el.dataset.army;selected=s.armies.find(a=>a.id===army)?.region;marketOpen=false;courtOpen=false;experienceAction(s,'army',army);render()}));
 const r=s.regions.find(x=>x.id===selected),a=s.armies.find(x=>x.id===army);
  renderExperience(s,lang,{navigate:navigateExperience,render,message});
 if(marketOpen){renderEasternMarketPanel({root:$('inspector'),state:s,lang,selected,onPrivilege:result=>{message(result.ok?'Merchant privilege granted.':'Privilege unavailable.',result.ok?'商人特权已授予。':'无法授予商人特权。');render()},onRequisition:result=>{message(result.ok?`Assigned ${result.transfer.head} army horses.`:`Remounts unavailable: ${marketReasonName(result.reason,0)}.`,result.ok?`已拨入军马 ${result.transfer.head} 匹。`:`军马拨付失败：${marketReasonName(result.reason,1)}。`);render()},onOrder:result=>{message(result.ok?'Merchant dispatched.':`Order failed: ${marketReasonName(result.reason,0)}.`,result.ok?'商队已派出。':`下单失败：${marketReasonName(result.reason,1)}。`);render()},onProposal:result=>{const status=result.proposal?.status,labels={accepted:['accepted','已接受'],rejected:['rejected','已拒绝'],pending:['awaiting reply','待答复']},label=labels[status]||['unavailable','无法执行'];message(result.ok?`Market proposal ${label[0]}.`:'Proposal unavailable.',result.ok?`互市提议：${label[1]}。`:'无法提出互市提议。');render()},onTariff:result=>{message(result.ok?'Customs policy updated.':'Customs policy unavailable.',result.ok?'关税政策已更新。':'无法调整关税政策。');render()},onRestriction:result=>{message(result.ok?'Export policy updated.':'Export policy unavailable.',result.ok?'出口政策已更新。':'无法调整出口政策。');render()},onSale:result=>{message(result.ok?'Goods reserved and offered.':'Sale offer unavailable.',result.ok?'货物已扣留并挂牌。':'无法挂牌出售。');render()},onCancelSale:result=>{message(result.ok?'Sale offer cancelled; stock returned.':'Sale offer unavailable.',result.ok?'挂单已撤销，库存已退回。':'无法撤销挂单。');render()},onContract:result=>{message(result.ok?result.contract.status==='withdrawn'?'Supply agreement withdrawn.':'Supply agreement active; first caravan dispatched.':`Agreement failed: ${marketReasonName(result.reason,0)}.`,result.ok?result.contract.status==='withdrawn'?'供货约定已撤回。':'供货约定生效，首批商队已派出。':`约定失败：${marketReasonName(result.reason,1)}。`);render()}});renderChronicle();return}
 if(courtOpen&&s.player==='han'){
  renderHanCourtPanel({root:$('inspector'),state:s,lang,selected:selectedCourt,
   onSelect:id=>{selectedCourt=id;render()},
   onAppoint:(id,office)=>{const result=appoint(s,office,id);message(result.ok?'Appointment made.':`Appointment failed: ${result.reason}.`,result.ok?'任命已生效。':'任命未获准。');render()},
   onRecommend:office=>{const result=recommendOfficial(s,office);message(result.ok?'Recommendation requested; return in three months.':`Recommendation unavailable: ${result.reason}.`,result.ok?'已提出察举请求；三个月后查看。':'无法察举此官。');render()},
   onAudit:id=>{const result=startAudit(s,id);message(result.ok?'Audit opened.':`Audit unavailable: ${result.reason}.`,result.ok?'稽查已启动。':'无法启动稽查。');render()},
   onDisaster:(response,faction)=>{const result=respondToDisaster(s,response,{faction});message(result.ok?'Court response enacted.':`Response failed: ${result.reason}.`,result.ok?'朝廷已作出应对。':'应对未获执行。');render()}
  });renderChronicle();return
 }
 let detail=`<h2>${D('Inspect','检视')}</h2>`;
 if(r){detail+=`<h3>${esc(L(r.name))}</h3><dl><dt>${D('Controller','控制方')}</dt><dd>${esc(L(FACTIONS[r.owner]?.name)||D('Independent','无主'))}</dd><dt>${D('Terrain','地形')}</dt><dd>${esc(r.terrain)}</dd><dt>${D('Population','人口')}</dt><dd>${r.pop}</dd><dt>${D('Supply','补给')}</dt><dd>${r.supply}</dd><dt>${D('Taxes','税收')}</dt><dd>${r.tax}</dd><dt>${D('Fort','城防')}</dt><dd>${r.fort}</dd></dl>`;
 if(r.owner===s.player){const t=templatesFor(s,s.player)[0],q=t?recruitQuote(s,s.player,r.id,t.id,500):null;detail+=`<button class="action" id="recruit" ${q?.ok?'':'disabled'}>${D('Recruit 500','征募500人')}</button><small>${q?.ok?D(`Cost: ${q.quote.treasury} treasury, ${q.quote.grain} grain, ${q.quote.manpower} manpower.`,`花费：国库${q.quote.treasury}、粮食${q.quote.grain}、兵源${q.quote.manpower}。`):D('Unavailable: '+(q?.problems||['unknown']).join(', '),'不可用：'+(q?.problems||['未知']).join('、'))}</small>`;
 }
 if(r.owner&&r.owner!==s.player&&s.regions.some(o=>o.owner===s.player&&neighbours(o.id).includes(r.id))){detail+=`<h3>${D('Diplomacy','外交')}</h3><p class="muted">${D('Foreign strength may be uncertain. War can close caravan routes and draw in allies.','敌军兵力可能不明。战争会阻断商路，也可能引来盟友。')}</p><button class="action" id="market">${D('Propose market access','提议市场通行')}</button><button class="action" id="war" ${atWar(s,s.player,r.owner)?'disabled':''}>${D('Declare war','宣战')}</button>`}
 const dep=dependencyOf(s,r.owner);if(dep?.overlord===s.player)detail+=`<p>${D('Dependent polity; autonomy','附属政体；自治度')} ${dep.autonomy}</p><button class="action" id="autonomy">${D('Grant autonomy','增加自治')}</button><button class="action" id="aid">${D('Request military aid','请求兵员支援')}</button>`;
 }
 if(a){detail+=`<h3>${D('Selected army','选中军队')} · ${esc(a.id)}</h3><dl><dt>${D('Strength','兵力')}</dt><dd>${a.men}</dd><dt>${D('Morale','士气')}</dt><dd>${a.morale}</dd><dt>${D('Supply','补给')}</dt><dd>${a.supply}</dd><dt>${D('Commander','统帅')}</dt><dd>${esc(L(s.persons[a.commander]?.name)||D('Unappointed','未任命'))}</dd><dt>${D('Order','命令')}</dt><dd>${a.move?esc(L(s.regions.find(x=>x.id===a.move.to)?.name)):D('Hold','驻守')}</dd></dl>`;if(a.move)detail+=`<button id="cancel">${D('Cancel movement','取消行军')}</button>`;detail+=`<p class="muted">${D('Adjacent destinations are marked on the map. Click one to issue an order; occupied or inaccessible routes will explain why they fail.','相邻目的地已在地图标出。点击下令；不可进入的路线会说明原因。')}</p>`}
 $('inspector').innerHTML=detail;
 if($('han-inspect-supply'))$('han-inspect-supply').onclick=()=>{experienceAction(s,'supply',a.id);message(`Supply ${a.supply}; local limit ${r?.supply??'?'}.`,`补给 ${a.supply}；当地上限 ${r?.supply??'?'}。`);render()};
 if($('market'))$('market').onclick=()=>{const before=s.treaties.length,v=propose(s,s.player,r.owner,'market');if(v.ok)experienceAction(s,'treaty',r.owner);message(v.ok?`Proposal ${v.proposal.status}; treaties ${before} → ${s.treaties.length}.`:'Proposal unavailable.',v.ok?`提议${v.proposal.status}；条约 ${before} → ${s.treaties.length}。`:'无法提出此项提议。');render()};
 if($('war'))$('war').onclick=()=>{const v=declareWar(s,s.player,r.owner);message(v.ok?'War declared; caravan access may close.':'Already at war.',v.ok?'已宣战；商路可能中断。':'已处于战争状态。');render()};
 if($('recruit'))$('recruit').onclick=()=>{const t=templatesFor(s,s.player)[0],f=s.factions[s.player],before={treasury:f.treasury,grain:f.grain,manpower:f.manpower},v=recruit(s,s.player,r.id,t.id,{men:500});if(v.ok)experienceAction(s,'recruit',r.id);message(v.ok?`Recruitment: treasury ${before.treasury} → ${f.treasury}, grain ${before.grain} → ${f.grain}, manpower ${before.manpower} → ${f.manpower}.`:'Recruitment unavailable.',v.ok?`征募：国库 ${before.treasury} → ${f.treasury}，粮食 ${before.grain} → ${f.grain}，兵源 ${before.manpower} → ${f.manpower}。`:'无法征募。');render()};
 if($('cancel'))$('cancel').onclick=()=>{a.move=null;message('Movement canceled.','行军已取消。');render()};
 if($('autonomy'))$('autonomy').onclick=()=>{changeDependency(s,r.owner,'grant_autonomy');render()};
 if($('aid'))$('aid').onclick=()=>{const v=changeDependency(s,r.owner,'request_aid');message(v.ok?`Received ${v.aid} manpower.`:'Request refused.',v.ok?`获得${v.aid}名兵员。`:'请求被拒绝。');render()};
 renderChronicle();
}
function reason(x){return ({not_adjacent:'目的地不相邻',no_access:'尚无通行权或战争状态',forming:'军队仍在集结',invalid:'不是可指挥的军队'})[x]||x}
$('lang').onclick=()=>{lang=1-lang;localStorage.setItem('spqr-han-lang',lang?'zh':'en');render()};
$('save').onclick=save;$('load').onclick=load;
$('advance').onclick=()=>{if(!s||s.finalized)return;const before=s.factions[s.player],snapshot={treasury:before.treasury,grain:before.grain,stability:before.stability};tick(s);experienceAction(s,'advance');render();const after=s.factions[s.player];message(s.finalized?'Campaign lost.':`One month: treasury ${snapshot.treasury} → ${after.treasury}, grain ${snapshot.grain} → ${after.grain}, stability ${snapshot.stability} → ${after.stability}.`,s.finalized?'战役失败。':`一月结算：国库 ${snapshot.treasury} → ${after.treasury}，粮食 ${snapshot.grain} → ${after.grain}，稳定 ${snapshot.stability} → ${after.stability}。`)};
$('trade-panel').onclick=()=>{if(!s)return;marketOpen=!marketOpen;courtOpen=false;army=null;render()};
$('court-panel').onclick=()=>{if(!s||s.player!=='han')return;courtOpen=!courtOpen;marketOpen=false;army=null;render()};
$('camera').onchange=e=>{camera=e.target.value;render()};$('mode').onchange=e=>{mode=e.target.value;render()};
render();message('Choose a polity to begin.','请选择政体开始。');
