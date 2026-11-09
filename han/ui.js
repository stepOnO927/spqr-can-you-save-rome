// MANDATE OF HEAVEN — interface. Every button calls a real system.
import {FACTIONS,PLAYABLE,OASIS,OFFICES,COURT_FACTIONS,START} from './data.js?v=han-1';
import {LATER_HISTORY,PERSON} from './people.js?v=han-1';
import {newHanGame,tick,moveArmy,setTaxLevel,designateHeir,elevateEmpress,SCENARIOS,ENDINGS,canFinalize,finalizeHan,visibleProgress,serialize,loadHanSave,SAVE_KEY,DLC_ID} from './engine.js?v=han-1';
import {statusOf,STATUS_NAMES,eligibility,isLiuClan,claimStrength,recognition,yearsBetween,agnaticChain} from './dynasty.js?v=han-1';
import {appoint,dismiss,EDICTS,edictSupport,issueEdict,startAudit,knownAttributes,answerDebate,DEBATE_NAMES,DEBATE_OPTIONS,respondToDisaster,DISASTER_RESPONSES,DISASTERS,adminCapacity,emperorAuthority,age} from './court.js?v=han-1';
import {relation,atWar,propose,answerProposal,answerRequest,protectorateAction,PROTECTORATE_ACTIONS,TREATY_TYPES,declareWar,treaty} from './frontier.js?v=han-1';
import {tradePath,intermediaries,embassyConditions,sendTradeEmbassy,protectRoute} from './silk-road.js?v=han-1';
import {treeFor,focusStatus,focusState,startFocus,BRANCHES,focusById} from './focus.js?v=han-1';
import {COMPONENTS,PRESETS,templatesFor,templateStats,recruitQuote,recruit,saveTemplate,cultureOf,routeBetween,neighbours,validateMix} from './military.js?v=han-1';
import {drawMap,CAMERAS,MODES} from './map.js?v=han-1';
import {ZHOU,THEATERS} from './data.js?v=han-1';
import {dateLabel} from './util.js?v=han-1';

let lang=(()=>{try{return localStorage.getItem('spqr-lang')==='zh'?1:0}catch{return 0}})();
let mapMode='political';
let s=null,tab='emperor',selRegion='changan',selArmy=null,ordering=false,playing=null,toast='',camera='all',designer=null,setup={scenario:'historical',faction:'han',difficulty:'standard'},slot='1';
const L=v=>Array.isArray(v)?v[lang]:v;
const esc=x=>String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T={
 title:['MANDATE OF HEAVEN','天命：大汉帝国'],sub:['Civilization Expansion · SPQR','文明扩展 · SPQR'],treasury:['Treasury','钱'],grain:['Grain','粮'],manpower:['Manpower','卒'],horses:['Horses','马'],mandate:['Mandate','天命'],authority:['Imperial authority','皇权'],admin:['Administration','吏治'],
 play:['Play','开始'],pause:['Pause','暂停'],step:['+1 month','+1 月'],save:['Save','保存'],load:['Load','读取'],menu:['Main menu','主菜单'],
 emperor:['Emperor','皇帝'],genealogy:['Liu Genealogy','刘氏世系'],court:['Imperial Court','大汉朝廷'],officials:['Officials','百官'],succession:['Succession','继承'],focus:['National Focus','国策'],finance:['State Finances','国计'],frontier:['Frontier Affairs','边务'],silk:['Silk Road','丝绸之路'],army:['Han Army Organizer','汉军编制'],provinces:['Provinces','郡国'],records:['Records','史册'],council:['Council','议事'],
 begin:['Begin campaign','开始战役'],scenario:['Scenario','剧本'],faction:['Play as','扮演'],difficulty:['Difficulty','难度'],cont:['Continue from slot','从存档继续'],
 march:['Order march','下达行军令'],cancel:['Cancel','取消'],recruit:['Raise formation','编练新军'],unknown:['Unknown','未知'],alive:['Alive','在世'],dead:['Deceased','已故'],
 eligible:['Eligible','合格'],notEligible:['Not eligible','不合格'],appoint:['Appoint','任命'],dismiss:['Dismiss','罢免'],audit:['Investigate','稽查'],issue:['Issue edict','下诏'],
 start:['Begin','开始'],accept:['Accept','接受'],reject:['Reject','拒绝'],propose:['Propose','提议'],war:['Declare war','宣战'],finalize:['Finalize this campaign','封存本次战役'],
 noTarget:['Click a connected territory on the map.','点击地图上相连的地区。'],vacant:['Vacant','空缺'],age:['Age','年龄'],record:['Record','记载'],
 historical:['historical','史载'],alternate:['alternate history','架空'],fictional:['fictional','虚构'],simulated:['born in this campaign','本局出生']
};
const t=k=>L(T[k]||[k,k]);
const fac=id=>FACTIONS[id]?L(FACTIONS[id].name):id==='rebels'?L(['Rebels','起事民众']):id==='rival_court'&&s?.factions.rival_court?.name?L(s.factions.rival_court.name):id;
const pname=id=>s?.persons[id]?L(s.persons[id].name):id;
const colors=Object.fromEntries(Object.entries(FACTIONS).map(([k,v])=>[k,v.color]));colors.rebels='#3c3c3c';colors.rival_court='#d07a3a';
const fill=(e)=>L(e.text).replace('%NAME2%',pname(e.who2)).replace('%NAME%',pname(e.who)).replace('%REGION%',e.region?L(s.regions.find(r=>r.id===e.region)?.name):'').replace('%FACTION2%',fac(e.faction2)).replace('%FACTION%',fac(e.faction));
const fmt=n=>Math.round(n).toLocaleString(lang?'zh-CN':'en-US');
const portrait=(id,size=128)=>{const p=s.persons[id]||PERSON[id];const key=p?.portrait;return key?`<img class="portrait" src="../assets/portraits/${key}-${size===64?64:128}.jpg" alt="${esc(L(p.name))}" width="${size===64?48:72}" height="${size===64?48:72}">`:`<span class="seal-mono" aria-hidden="true">${esc((L(p?.name)||'?').replace(/^Liu |^刘/,'').slice(0,1))}</span>`};
const isHanPlayer=()=>['han','han_loyalist'].includes(s.player);
const flash=m=>{toast=m;render();setTimeout(()=>{if(toast===m){toast='';render()}},2600)};
const reason=r=>L({treasury:['Not enough treasury','国库不足'],grain:['Not enough grain','粮食不足'],manpower:['Not enough manpower','兵源不足'],horses:['Not enough horses','马匹不足'],iron:['No iron-working region','无冶铁之地'],frontier_only:['Garrisons are raised on the frontier','戍军只能在边郡征发'],arsenal:['Needs an arsenal (Luoyang)','需要武库（洛阳）'],horse_country:['Needs horse-breeding country','需要产马之地'],not_owner:['Not your territory','非己方领地'],busy:['Another focus is in progress','另一国策进行中'],locked:['Prerequisites missing','前置未完成'],excluded:['Excluded by a rival choice','与已选国策互斥'],requires_liu_clan:['Only a Liu clan member may hold this office','此职仅限刘氏宗室'],eunuch_bar:['Eunuchs cannot hold this office','宦者不得任此职'],cost:['Cannot afford it','费用不足'],already:['Already under way','已在进行'],no_access:['No right of passage','无通行权'],not_adjacent:['Not connected','不相连'],no_protectorate:['The Protectorate seat is lost','都护驻地已失'],forming:['Still forming','正在编练'],unfinished:['The campaign cannot be finalized yet','战役尚不能封存'],deceased:['deceased','已故'],not_male_line:['not of the male line','非男系'],not_born_liu:['not born a Liu','非生而姓刘'],surname:['does not bear the Liu surname','未称刘姓'],lineage_unverified:['Liu lineage unverified','刘氏宗籍未经核验'],removed_from_clan_register:['removed from the clan register','已除宗籍'],no_claim:['no valid claim','无有效继承权'],insufficient_recognition:['insufficient court recognition','朝廷承认不足'],insufficient_control:['insufficient control of the court','未能掌控朝廷'],invalid:['invalid','无效'],unknown:['unknown','未知']}[r]||[r,r]);

export function boot(){
 const root=document.getElementById('han-app');
 root.addEventListener('click',onClick);root.addEventListener('change',onChange);
 document.addEventListener('keydown',e=>{if(e.key===' '&&s&&!e.target.closest('input,select,textarea')){e.preventDefault();togglePlay()}});
 render();
}
function togglePlay(){if(!s)return;if(playing){clearInterval(playing);playing=null}else playing=setInterval(()=>{const t0=performance.now();tick(s);s._lastTick=performance.now()-t0;render()},900);render()}

// ---------- setup ----------
function setupScreen(){
 const saves=[1,2,3].map(n=>{try{const raw=localStorage.getItem(SAVE_KEY(n));if(!raw)return null;const x=JSON.parse(raw);return {n,label:`${fac(x.player)} · ${dateLabel(x.year,x.month,lang)}`}}catch{return null}}).filter(Boolean);
 return `<section class="setup"><div class="setup-seal">天命</div><h1>${t('title')}</h1><p class="setup-sub">${lang?'西汉 · 匈奴 · 西域 · 丝绸之路':'The Western Han · the Xiongnu · the Western Regions · the Silk Road'}</p>
 <p class="setup-motto">${lang?'“江山可以争夺，汉室正统不可伪造。”':'“The throne may be seized. The Han bloodline cannot be forged.”'}</p>
 <label>${t('scenario')}<select data-setup="scenario">${Object.entries(SCENARIOS).map(([id,x])=>`<option value="${id}" ${setup.scenario===id?'selected':''}>${esc(L(x.name))}</option>`).join('')}</select></label>
 <p class="hint">${esc(L(SCENARIOS[setup.scenario].note))}</p>
 <label>${t('faction')}<select data-setup="faction">${PLAYABLE.map(id=>`<option value="${id}" ${setup.faction===id?'selected':''}>${esc(fac(id))}</option>`).join('')}</select></label>
 <label>${t('difficulty')}<select data-setup="difficulty">${[['beginner','Beginner','新手'],['standard','Standard','标准'],['hard','Hard','困难']].map(([id,en,zh])=>`<option value="${id}" ${setup.difficulty===id?'selected':''}>${lang?zh:en}</option>`).join('')}</select></label>
 <button class="act primary" data-act="begin">${t('begin')}</button>
 ${saves.length?`<div class="setup-saves"><b>${t('cont')}</b>${saves.map(x=>`<button class="act" data-act="load-slot" data-slot="${x.n}">${x.n} · ${esc(x.label)}</button>`).join('')}</div>`:''}
 <p class="hint">${lang?'本扩展独立于罗马战役：罗马存档与剧本不受影响。':'This expansion runs beside the Roman campaign: Roman saves and scenarios are untouched.'}</p>
 <div class="setup-foot"><a href="../" class="act">${lang?'返回罗马主菜单':'Back to the Roman main menu'}</a><button class="act" data-act="lang">${lang?'English':'中文'}</button></div></section>`;
}

// ---------- panels ----------
const statusChip=id=>{const st=statusOf(s,id);return st?`<span class="status st-${st}">${esc(L(STATUS_NAMES[st]))}</span>`:''};
function personRow(id,extra=''){const p=s.persons[id];if(!p)return '';return `<div class="person">${portrait(id,64)}<div><b>${esc(L(p.name))}</b> ${statusChip(id)}<small>${t('age')} ${p.birth!=null?yearsBetween(p.birth,s.year):'?'}${p.birthApprox?(lang?'（约）':' (approx.)'):''} · ${p.alive?t('alive'):t('dead')} · ${esc(t(p.record||'historical'))}</small>${extra}</div></div>`}
function panelEmperor(){
 const e=s.throne.orthodox,d=s.throne.dynasty;
 const statuses=['orthodox_han_emperor','disputed_liu_claimant','regent','de_facto_ruler','non_liu_usurper','new_dynasty_founder'].map(st=>{const who=Object.keys(s.persons).filter(id=>s.persons[id].alive&&statusOf(s,id)===st);return `<tr><th>${esc(L(STATUS_NAMES[st]))}</th><td>${who.length?who.map(pname).map(esc).join('、'):'—'}</td></tr>`}).join('');
 return `<h2>${t('emperor')}</h2>
 ${e?`<div class="emperor-card">${portrait(e)}<div><h3>${esc(pname(e))}</h3>${statusChip(e)}<p>${t('age')} ${age(s,e)} · ${t('authority')} ${emperorAuthority(s)}</p>${s.throne.regent?`<p>${lang?'摄政':'Regent'}: ${esc(pname(s.throne.regent))}${isLiuClan(s,s.throne.regent)?'':lang?'（非刘氏，不可为帝）':' (non-Liu: can never be emperor)'}</p>`:''}${s.throne.puppet===e?`<p class="warn">${lang?'此帝为权臣所立，实权旁落。':'Installed by a dominant minister; real power lies elsewhere.'}</p>`:''}</div></div>`:`<p class="warn">${lang?'正统皇位虚悬。':'The orthodox throne is vacant.'}</p>`}
 <p class="dynasty-line">${lang?'王朝':'Dynasty'}: <b>${esc(L(d.name))}</b> ${d.orthodox?`<span class="status st-orthodox_han_emperor">${lang?'汉室正统':'orthodox Han'}</span>`:`<span class="status st-non_liu_usurper">${lang?'非正统 · 篡位政权':'not orthodox · usurping regime'}</span>`}</p>
 ${s.throne.occupant&&s.throne.occupant!==e?`<p>${lang?'实际据有皇位者':'Holder of the palace'}: ${esc(pname(s.throne.occupant))} ${statusChip(s.throne.occupant)}</p>`:''}
 <table class="kv statuses"><caption>${lang?'四种政治地位截然不同':'Four distinct political statuses'}</caption>${statuses}</table>
 ${isHanPlayer()&&s.pendingEmpress?`<button class="act" data-act="empress" data-id="${s.pendingEmpress}">${lang?'立':'Make '}${esc(pname(s.pendingEmpress))}${lang?'为皇后':' empress'}</button>`:''}
 <p class="hint">${lang?'只有经核验的刘氏宗室，经承认的继承程序，方可为正统汉帝。军功、改姓、婚姻、收养、国策与天命点数均不能取得正统。':'Only a verified Liu clan member, raised through a recognised succession, can be the orthodox Han emperor. Victory, surname change, marriage, adoption, national focuses and Mandate cannot confer it.'}</p>`;
}
function panelGenealogy(){
 const kids={};for(const [id,r] of Object.entries(s.genealogy))if(r.father&&r.birthSurname==='Liu')(kids[r.father]||=[]).push(id);
 const node=(id,depth=0)=>{const p=s.persons[id];if(!p||depth>14)return '';const e=eligibility(s,id);const ch=(kids[id]||[]).sort((a,b)=>(s.genealogy[a].birth||0)-(s.genealogy[b].birth||0));
  return `<li><span class="g-node ${p.alive?'alive':''} ${p.emperor||s.throne.history.some(h=>h.id===id)?'emp':''}">${esc(L(p.name))} <small>${p.birth!=null?(lang?`生于公元前${Math.abs(p.birth)}年`:`b. ${Math.abs(p.birth)} BCE`):''}${p.birthApprox?(lang?'（约）':'?'):''}${p.death!=null&&!p.alive?` – ${Math.abs(p.death)}`:''} · ${esc(t(p.record||'historical'))}</small>${p.alive?(e.ok?` <em class="ok">${t('eligible')} · ${lang?'继承强度':'claim'} ${claimStrength(s,id)}</em>`:''):''}</span>${ch.length?`<ul>${ch.map(c=>node(c,depth+1)).join('')}</ul>`:''}</li>`};
 return `<h2>${t('genealogy')}</h2><p class="hint">${lang?'仅按出生记录中的父系追溯。改姓、婚姻与收养不改变宗籍。':'Traced only through recorded agnatic births. Surname change, marriage and adoption never alter clan membership.'}</p><ul class="genealogy">${node('liu-taigong')}</ul>
 <h3>${lang?'后世史实（不进入模拟）':'Later history (not simulated)'}</h3><ul class="later">${LATER_HISTORY.map(x=>`<li>${esc(L(x.name))}</li>`).join('')}</ul>`;
}
function panelCourt(){
 if(!s.court)return '';
 const F=s.court.factions,total=Object.values(F).reduce((a,f)=>a+f.influence,0)||1;
 const officials=Object.values(s.persons).filter(p=>p.alive&&p.faction===(s.player==='han_loyalist'?'han_loyalist':'han')&&['official','general','envoy'].includes(p.role));
 const pend=s.court.pendingDisaster;
 return `<h2>${t('court')}</h2>
 <div class="bars">${Object.entries(F).map(([k,f])=>`<div class="bar"><span>${esc(L(COURT_FACTIONS[k].name))}</span><i style="width:${Math.round(f.influence/total*100)}%"></i><b>${Math.round(f.influence/total*100)}%</b><small>${esc(L(COURT_FACTIONS[k].aim))}</small></div>`).join('')}</div>
 ${pend?`<div class="alert"><b>${esc(L(DISASTERS[pend.type].name))} · ${esc(L(s.regions.find(r=>r.id===pend.region).name))}</b>${pend.readings.map(r=>`<p>${esc(L(r.text))}</p>`).join('')}<div class="row">${Object.entries(DISASTER_RESPONSES).map(([k,v])=>`<button class="act" data-act="disaster" data-id="${k}" ${isHanPlayer()?'':'disabled'}>${esc(L(v.name))}</button>`).join('')}</div></div>`:''}
 ${s.court.debates.map(d=>`<div class="alert"><b>${esc(L(DEBATE_NAMES[d.kind]||[d.kind,d.kind]))}</b>${d.region&&d.kind==='unrest'?` · ${esc(L(s.regions.find(r=>r.id===d.region)?.name))}`:''}<div class="row">${d.options.map(o=>`<button class="act" data-act="debate" data-id="${d.id}" data-choice="${o}" ${isHanPlayer()?'':'disabled'}>${esc(L(DEBATE_OPTIONS[o]||[o,o]))}</button>`).join('')}</div></div>`).join('')}
 <h3>${lang?'公卿':'Offices'}</h3><table class="offices">${Object.entries(OFFICES).map(([k,o])=>{const h=s.court.offices[k];return `<tr><th title="${esc(L(o.gloss))}">${esc(L(o.name))}<small>${esc(L(o.gloss))}</small></th><td>${h?esc(pname(h)):`<i>${t('vacant')}</i>`}</td><td>${isHanPlayer()?`<select data-appoint="${k}"><option value="">${t('appoint')}…</option>${officials.filter(p=>p.id!==h).map(p=>`<option value="${p.id}">${esc(L(p.name))}</option>`).join('')}</select>${h?`<button class="mini" data-act="dismiss" data-id="${k}">${t('dismiss')}</button>`:''}`:''}</td></tr>`}).join('')}</table>
 <h3>${lang?'诏令（需朝议支持与时间推行）':'Edicts (need court support and time)'}</h3><table class="edicts">${Object.entries(EDICTS).map(([k,e])=>{const live=s.court.edicts.find(x=>x.type===k&&x.status==='implementing');return `<tr><th>${esc(L(e.name))}</th><td>${lang?'支持':'support'} ${edictSupport(s,k)}%${e.cost.treasury?` · ${e.cost.treasury}¤`:''}</td><td>${live?`${lang?'推行中':'implementing'} ${Math.floor(live.progress)}/${live.needed}`:isHanPlayer()?`<button class="mini" data-act="edict" data-id="${k}">${t('issue')}</button>`:''}</td></tr>`}).join('')}</table>
 ${s.court.edicts.filter(x=>x.status==='stalled').length?`<p class="warn">${lang?'受阻诏令':'Stalled edicts'}: ${s.court.edicts.filter(x=>x.status==='stalled').map(x=>esc(L(EDICTS[x.type].name))).join('、')}</p>`:''}`;
}
function panelOfficials(){
 const list=Object.values(s.persons).filter(p=>p.alive&&p.faction===(s.player==='han_loyalist'?'han_loyalist':'han')&&['official','general','envoy','consort','dowager'].includes(p.role));
 return `<h2>${t('officials')}</h2><p class="hint">${lang?'才干在任职一年后可知；贪渎与野心只能凭证据得知。无据指控会结怨。':'Competence becomes known after a year in office; corruption and ambition only through evidence. Unfounded accusations make enemies.'}</p>
 <table class="officials"><tr><th></th><th>${lang?'职位':'Office'}</th><th>${lang?'派系':'Faction'}</th><th>${lang?'才干':'Competence'}</th><th>${lang?'操守':'Integrity'}</th><th>${lang?'权势':'Control'}</th><th></th></tr>${list.map(p=>{const k=knownAttributes(s,p.id),au=s.court.audits.find(a=>a.target===p.id&&a.status==='open');return `<tr><td>${portrait(p.id,64)} ${esc(L(p.name))}</td><td>${p.office?esc(L(OFFICES[p.office].name)):'—'}</td><td>${p.courtFaction?esc(L(COURT_FACTIONS[p.courtFaction].name)):'—'}</td><td>${k.competence??t('unknown')}</td><td>${{unknown:t('unknown'),proven:lang?'贪渎属实':'misconduct proven',no_evidence:lang?'查无实据':'no evidence'}[k.corruption]}</td><td>${s.court.control[p.id]??0}</td><td>${au?`${lang?'稽查中':'under audit'} ${au.months}/4`:isHanPlayer()?`<button class="mini" data-act="audit" data-id="${p.id}">${t('audit')} · 15¤</button>`:''}</td></tr>`}).join('')}</table>`;
}
function panelSuccession(){
 const cands=Object.values(s.persons).filter(p=>p.alive&&isLiuClan(s,p.id)).sort((a,b)=>claimStrength(s,b.id)-claimStrength(s,a.id)).slice(0,10);
 return `<h2>${t('succession')}</h2><p>${lang?'皇太子':'Heir apparent'}: <b>${s.throne.heir?esc(pname(s.throne.heir)):t('vacant')}</b></p>
 ${s.throne.claimants.length?`<div class="alert"><b>${lang?'争位者':'Claimants'}</b>${s.throne.claimants.map(c=>`<p>${esc(pname(c.id))} · ${lang?'朝廷承认度':'court recognition'} ${recognition(s,c.id)}%${c.loyalist?(lang?' · 勤王':' · loyalist'):''}</p>`).join('')}${s.throne.paralysis>0?`<p class="warn">${lang?'朝政停摆':'Government paralysed'}</p>`:''}</div>`:''}
 <table class="succession"><tr><th></th><th>${lang?'继承强度':'Claim'}</th><th>${lang?'朝廷承认':'Recognition'}</th><th>${lang?'资格':'Eligibility'}</th><th></th></tr>${cands.map(p=>{const e=eligibility(s,p.id);return `<tr><td>${esc(L(p.name))} ${statusChip(p.id)}</td><td>${claimStrength(s,p.id)}</td><td>${recognition(s,p.id)}%</td><td>${e.ok?t('eligible'):esc(e.reasons.map(reason).join('；'))}</td><td>${isHanPlayer()&&e.ok&&s.throne.orthodox!==p.id&&s.throne.heir!==p.id?`<button class="mini" data-act="heir" data-id="${p.id}">${lang?'立为太子':'Name heir'}</button>`:''}</td></tr>`}).join('')}</table>
 <p class="hint">${lang?'权臣可控制、废立刘氏皇帝，或自立新朝；但新朝永不被视为汉室正统。':'A dominant minister may control or replace a Liu emperor, or found a new dynasty — which is never treated as orthodox Han.'}</p>`;
}
function panelFocus(){
 const f=s.player,tree=treeFor(f),st=focusState(s,f);if(!tree.length)return `<h2>${t('focus')}</h2><p>${lang?'此势力暂无国策树。':'No focus tree for this power.'}</p>`;
 const branches=[...new Set(tree.map(x=>x.branch))];
 return `<h2>${t('focus')}</h2>${st.current?`<p class="current-focus">${lang?'进行中':'In progress'}: <b>${esc(L(focusById(f,st.current.id).name))}</b> ${st.current.progress}/${focusById(f,st.current.id).months}</p>`:''}
 <div class="focus-grid">${branches.map(b=>`<section class="branch"><h3>${esc(L(BRANCHES[b]))}</h3>${tree.filter(x=>x.branch===b).map(x=>{const status=focusStatus(s,f,x.id);return `<button class="focus ${status}" data-act="focus" data-id="${x.id}" ${status==='available'&&!st.current?'':'disabled'} title="${esc(x.effects.map(e=>Object.keys(e)[0]).join(', '))}"><b>${esc(L(x.name))}</b><small>${x.months}${lang?'月':' mo'} · ${x.cost.treasury||0}¤ · ${esc({done:lang?'已完成':'done',active:lang?'进行中':'active',available:lang?'可开始':'available',locked:lang?'未解锁':'locked',excluded:lang?'互斥':'excluded'}[status])}</small></button>`}).join('')}</section>`).join('')}</div>
 <p class="hint">${lang?'国策完成只开启谈判、改革或冲突，不保证成功；任何国策都不能改变正统。':'A completed focus opens negotiations, reforms or conflicts — it does not guarantee success, and no focus can alter orthodoxy.'}</p>`;
}
function panelFinance(){
 const f=s.factions[s.player],m=s.mandate;
 return `<h2>${t('finance')}</h2><table class="kv"><tr><th>${t('treasury')}</th><td>${fmt(f.treasury)}</td></tr><tr><th>${t('grain')}</th><td>${fmt(f.grain)}</td></tr><tr><th>${t('manpower')}</th><td>${fmt(f.manpower)}</td></tr><tr><th>${t('horses')}</th><td>${fmt(f.horses||0)}</td></tr>${s.court&&isHanPlayer()?`<tr><th>${t('admin')}</th><td>${adminCapacity(s)}</td></tr>`:''}</table>
 ${isHanPlayer()?`<h3>${lang?'田租':'Land tax'}</h3><div class="row">${['low','normal','high'].map(l=>`<button class="act ${s.taxLevel===l?'on':''}" data-act="tax" data-id="${l}">${L({low:['Light','轻'],normal:['Customary','常'],high:['Heavy','重']}[l])}</button>`).join('')}</div>${s.taxRelief>0?`<p>${lang?'减租中':'Tax remission'}: ${s.taxRelief}${lang?'月':' mo'}</p>`:''}
 <h3>${lang?'天命（政治评判，非超自然）':'The Mandate (a political judgement, not a supernatural meter)'} — ${m.value}</h3><table class="kv">${Object.entries(m.components).map(([k,v])=>`<tr><th>${esc(L({administration:['Administration','吏治'],succession:['Succession','继承'],court:['Court','朝廷'],order:['Public order','治安'],grain:['Grain','粮储'],taxation:['Taxation','赋税'],military:['Military record','战绩'],disasters:['Calamities','灾异'],corruption:['Corruption','贪渎'],ritual:['Ritual','礼制'],omens:['Response to portents','应对灾异']}[k]))}</th><td>${v>0?'+':''}${v}</td></tr>`).join('')}</table>`:''}`;
}
function panelFrontier(){
 const me=s.player;const others=Object.keys(s.factions).filter(x=>x!==me&&s.regions.some(r=>r.owner===x));
 const pend=s.proposals.filter(p=>p.to===me&&p.status==='pending'),req=s.pendingRequests.filter(q=>q.to===me);
 return `<h2>${t('frontier')}</h2>
 ${pend.map(p=>`<div class="alert"><b>${esc(fac(p.from))}</b>: ${esc(L(TREATY_TYPES[p.type]))}<div class="row"><button class="act" data-act="proposal" data-id="${p.id}" data-choice="1">${t('accept')}</button><button class="act" data-act="proposal" data-id="${p.id}" data-choice="0">${t('reject')}</button></div></div>`).join('')}
 ${req.map(q=>`<div class="alert"><b>${esc(fac(q.from))}</b>: ${lang?`请求粮食 ${q.amount}`:`asks for ${q.amount} grain`}<div class="row"><button class="act" data-act="request" data-id="${q.id}" data-choice="1">${t('accept')}</button><button class="act" data-act="request" data-id="${q.id}" data-choice="0">${t('reject')}</button></div></div>`).join('')}
 ${me==='han'?`<h3>${lang?'西域都护：分层权威':'Western Regions Protectorate — layered authority'}</h3><table class="protectorate"><tr><th></th><th>${lang?'向汉':'Han standing'}</th><th>${lang?'向匈奴':'Xiongnu'}</th><th>${lang?'自主':'Autonomy'}</th><th>${lang?'忧虑':'Concern'}</th><th>${lang?'质子':'Hostage'}</th><th></th></tr>${OASIS.map(o=>{const x=s.protectorate.oasis[o];return `<tr><td>${esc(fac(o))}</td><td>${Math.round(x.han)}</td><td>${Math.round(x.xiongnu)}</td><td>${Math.round(x.autonomy)}</td><td>${Math.round(x.concern)}</td><td>${x.hostage?'✓':'—'}</td><td><select data-protect="${o}"><option value="">${lang?'措施…':'Action…'}</option>${Object.entries(PROTECTORATE_ACTIONS).map(([k,a])=>`<option value="${k}">${esc(L(a.name))}${a.cost.treasury?` · ${a.cost.treasury}¤`:''}</option>`).join('')}</select></td></tr>`}).join('')}</table><p class="hint">${lang?'向汉≥50方可借道驻军；≥60时诸国纳贡并互通消息。直接吞并会惊动全体城郭之国。':'Standing ≥50 opens passage for troops; ≥60 brings tribute and shared news. Direct annexation alarms every oasis ruler.'}</p>`:''}
 <h3>${lang?'诸国关系':'Relations'}</h3><table class="relations">${others.map(o=>`<tr><td>${esc(fac(o))}</td><td>${relation(s,me,o)}</td><td>${atWar(s,me,o)?`<b class="warn">${lang?'交战':'at war'}</b>`:s.treaties.filter(x=>x.parties.includes(me)&&x.parties.includes(o)).map(x=>esc(L(TREATY_TYPES[x.type]))).join('、')}</td><td><select data-propose="${o}"><option value="">${t('propose')}…</option>${Object.entries(TREATY_TYPES).map(([k,v])=>`<option value="${k}">${esc(L(v))}</option>`).join('')}<option value="__war">${t('war')}</option></select></td></tr>`).join('')}</table>`;
}
function panelSilk(){
 const p=s.silk.lastPath||tradePath(s),c=embassyConditions(s),inter=intermediaries(s,p);
 return `<h2>${t('silk')}</h2>${p?`<p>${lang?'当前商路':'Current route'}: ${p.map(id=>esc(L(s.regions.find(r=>r.id===id).name).split(/[（(]/)[0])).join(' → ')}</p><p>${lang?'中间人':'Intermediaries'}: ${inter.map(fac).map(esc).join('、')||'—'}</p>`:`<p class="warn">${lang?'商路断绝':'The road is closed'}${s.silk.blocked?`: ${esc(L(s.regions.find(r=>r.id===s.silk.blocked.to)?.name))} (${esc(s.silk.blocked.reason)})`:''}</p>`}
 <table class="kv"><tr><th>${lang?'连续畅通':'Open for'}</th><td>${s.silk.functionalMonths}${lang?'月':' months'}</td></tr><tr><th>${lang?'在途商队':'Caravans en route'}</th><td>${s.silk.caravans.filter(x=>x.status==='travelling').length}</td></tr><tr><th>${lang?'累计关税与回货':'Customs and returns'}</th><td>${fmt(s.silk.income.han||0)}</td></tr><tr><th>${lang?'商路治安':'Road security'}</th><td>${s.silk.security||0}/5</td></tr><tr><th>${lang?'安息':'Anxi'}</th><td>${esc({hearsay:lang?'耳闻':'hearsay',trade:lang?'间接贸易':'indirect trade'}[s.silk.contact.anxi.level])}</td></tr><tr><th>${lang?'犁靬（极西）':'Lijian (far west)'}</th><td>${esc({unknown:lang?'一无所知':'nothing known',rumour:lang?'仅有传闻':'rumour only',embassy:lang?'使团已至（架空）':'embassy arrived (alternate)'}[s.silk.contact.lijian.level])}</td></tr></table>
 ${s.player==='han'?`<div class="row"><button class="act" data-act="protect">${lang?'护路 · 20¤':'Guard the road · 20¤'}</button><button class="act" data-act="embassy" ${c.ok?'':'disabled'}>${lang?'遣通商使团 · 150¤':'Send trade embassy · 150¤'}</button></div><p class="hint">${lang?'使团条件：已闻传闻、商路畅通36个月、与康居关系≥20、国库≥150。':'Embassy needs: a rumour heard, 36 months of open road, Kangju relation ≥20, 150 treasury.'} ${Object.entries(c).filter(([k])=>k!=='ok').map(([k,v])=>`${k} ${v?'✓':'✗'}`).join(' · ')}</p>`:''}
 <p class="hint">${lang?'汉与罗马在开局时互不相知。货物与消息经中间人辗转，往返需数年。':'Han and Rome know nothing of each other at the start. Goods and news pass through intermediaries and take years each way.'}</p>`;
}
function panelArmy(){
 const me=s.player,culture=cultureOf(me),comps=Object.values(COMPONENTS).filter(c=>c.culture===culture);
 designer||={name:'',mix:Object.fromEntries(comps.map(c=>[c.id,0]))};
 const total=Object.values(designer.mix).reduce((a,b)=>a+b,0);
 const r=s.regions.find(x=>x.id===selRegion);
 return `<h2>${culture==='han'?t('army'):L(['Military organisation','军制'])}</h2>
 <div class="templates">${templatesFor(s,me).map(tp=>{const st=templateStats(tp),q=r?recruitQuote(s,me,r.id,tp.id):null;return `<div class="tpl"><b>${esc(L(tp.name))}</b><small>${Object.entries(tp.mix).map(([k,v])=>`${esc(L(COMPONENTS[k].name))} ${v}%`).join(' · ')}</small><small>${lang?'攻':'Atk'} ${st.atk.toFixed(2)} · ${lang?'守':'Def'} ${st.def.toFixed(2)} · ${lang?'速':'Spd'} ${st.speed.toFixed(2)} · ${lang?'侦':'Rec'} ${st.recon.toFixed(2)} · ${lang?'攻城':'Siege'} ${st.siege.toFixed(2)}</small>${q?`<small>5,000: ${q.quote.treasury}¤ · ${q.quote.grain} ${t('grain')} · ${q.quote.horses} ${t('horses')} · ${q.quote.months}${lang?'月':' mo'}</small><button class="mini" data-act="recruit" data-id="${tp.id}" ${q.ok?'':'disabled'} title="${esc(q.problems.map(reason).join('; '))}">${t('recruit')} · ${esc(L(r.name).split(/[（(]/)[0])}</button>${q.ok?'':`<small class="warn">${esc(q.problems.map(reason).join('; '))}</small>`}`:''}</div>`}).join('')}</div>
 <h3>${lang?'自定编制':'Design a formation'}</h3><div class="designer">${comps.map(c=>`<label>${esc(L(c.name))}<input type="range" min="0" max="100" step="5" value="${designer.mix[c.id]||0}" data-mix="${c.id}"><b>${designer.mix[c.id]||0}%</b><small>${esc(L(c.desc))}</small></label>`).join('')}<p>${lang?'合计':'Total'} ${total}%</p><input data-design-name placeholder="${lang?'编制名称':'Formation name'}" value="${esc(designer.name)}"><button class="act" data-act="save-template" ${total===100?'':'disabled'}>${lang?'保存编制':'Save formation'}</button></div>
 <h3>${lang?'野战军':'Field armies'}</h3><ul class="armies">${s.armies.filter(a=>a.owner===me).map(a=>`<li><button class="link" data-army-select="${a.id}">${esc(L(a.template.name))}</button> · ${fmt(a.men)} · ${esc(L(s.regions.find(x=>x.id===a.region).name).split(/[（(]/)[0])}${a.move?` → ${esc(L(s.regions.find(x=>x.id===a.move.to).name).split(/[（(]/)[0])} (${a.move.months})`:''}${a.forming?` · ${lang?'编练':'forming'} ${a.forming}`:''} · ${lang?'士气':'morale'} ${a.morale} · ${lang?'补给':'supply'} ${a.supply}</li>`).join('')}</ul>`;
}
function panelProvinces(){
 const mine=s.regions.filter(r=>r.owner===s.player);
 const byTheater={};for(const r of mine)(byTheater[r.theater]||=[]).push(r);
 const threat=list=>{let men=0;const ids=new Set(list.map(r=>r.id));for(const r of list)for(const n of neighbours(r.id)){if(ids.has(n))continue;const i=s.intel[s.player]?.[n];if(i)men+=i.armies.filter(a=>a.owner!==s.player&&atWar(s,s.player,a.owner)).reduce((x,a)=>x+a.men,0)}return men};
 return `<h2>${t('provinces')}</h2><p class="hint">${lang?'郡国按战区编组；州部为监察区。战区兵力与敌情只来自己方情报。':'Territories grouped by military theatre; circuits are inspection districts. Enemy figures come only from your own intelligence.'}</p>
 ${Object.entries(byTheater).map(([th,list])=>{const troops=s.armies.filter(a=>a.owner===s.player&&list.some(r=>r.id===a.region)).reduce((x,a)=>x+a.men,0),sup=list.reduce((x,r)=>x+r.supply,0),loy=Math.round(list.reduce((x,r)=>x+r.loyalty,0)/list.length),enemy=threat(list);
  return `<section class="theater-block"><h3>${esc(L(THEATERS[th].name))} <small>${esc(L(THEATERS[th].role))}</small></h3><p class="theater-sum">${lang?'驻军':'Troops'} <b>${fmt(troops)}</b> · ${lang?'补给容量':'Supply'} <b>${sup}</b> · ${lang?'平均忠诚':'Avg. loyalty'} <b>${loy}</b> · ${lang?'已知相邻敌军':'Known hostile forces nearby'} <b class="${enemy>troops?'warn':''}">${fmt(enemy)}</b></p>
  <table class="provinces"><tr><th></th><th>${lang?'州部':'Circuit'}</th><th>${lang?'忠诚':'Loyalty'}</th><th>${t('grain')}</th><th>${lang?'赋':'Tax'}</th><th>${lang?'仓':'Granary'}</th><th>${lang?'水利':'Irrig.'}</th><th>${lang?'工事':'Fort'}</th><th></th></tr>${list.map(r=>`<tr><td><button class="link" data-region-select="${r.id}">${esc(L(r.name))}</button> <small>${esc(L({commandery:['commandery','郡'],kingdom:['kingdom','王国'],capital:['capital','京师'],protectorate:['protectorate','都护'],oasis:['oasis state','城郭'],steppe:['pastures','牧地']}[r.kind]))}</small></td><td>${esc(L(ZHOU[r.zhou].name))}</td><td>${Math.round(r.loyalty)}</td><td>${r.grain}</td><td>${r.tax}</td><td>${r.granary||0}</td><td>${r.irrigation||0}</td><td>${r.fort}</td><td>${r.disaster?`<b class="warn">${esc(L(DISASTERS[r.disaster.type].name))}</b>`:''}${r.unrest?` <b class="warn">${lang?'民变':'unrest'}</b>`:''}</td></tr>`).join('')}</table></section>`}).join('')}`;
}
function panelRecords(){
 const v=visibleProgress(s);
 return `<h2>${t('records')}</h2>${s.finalized?`<div class="final"><h3>${lang?'本局已封存':'Campaign archived'}</h3><p>${lang?'结局':'Endings'}: ${s.finalized.endings.map(e=>esc(L(ENDINGS[e].name))+(ENDINGS[e].note?` (${esc(L(ENDINGS[e].note))})`:'')).join('、')||'—'}</p><h3>${lang?'功绩':'Achievements'}</h3><ul>${s.finalized.achievements.map(a=>`<li>${esc(L(a.name))}</li>`).join('')||'<li>—</li>'}</ul><p>${lang?'月桂币':'Laurel Coins'}: +${s.finalized.laurelCoins}</p></div>`:`<p>${lang?'当前可达成的结局':'Endings currently within reach'}: ${v.endingsInReach.map(e=>`<b>${esc(L(e.name))}</b>${e.orthodox===false?(lang?'（非正统）':' (not orthodox)'):''}`).join('、')||'—'}</p><p class="hint">${lang?'隐藏功绩只在正式封存后揭晓；继续游戏不会显示。':'Hidden achievements are revealed only after official finalization; continuing play never shows them.'}</p>${canFinalize(s)?`<button class="act primary" data-act="finalize">${t('finalize')}</button>`:`<p class="hint">${lang?'可在十年后，或汉室再兴/新朝确立后封存。':'You may finalize after ten years, or after a restoration or an established new dynasty.'}</p>`}`}
 <h3>${lang?'简牍记录':'Bamboo-slip dispatches'}</h3><ol class="slips">${s.log.slice(-40).reverse().filter(e=>visibleLog(e)).map(e=>`<li><small>${dateLabel(e.year,e.month,lang)}</small> ${esc(fill(e))}</li>`).join('')}</ol>`;
}
// Players read only news they could plausibly know: their own affairs,
// events in observed regions, and public court/throne events of Han.
function visibleLog(e){if(isHanPlayer())return true;if(e.faction===s.player||e.faction2===s.player||(e.parties||[]).includes(s.player))return true;if(e.region)return !!s.intel[s.player]?.[e.region];return ['throne','silk'].includes(e.kind)}

function inspector(){
 const r=s.regions.find(x=>x.id===selRegion),a=s.armies.find(x=>x.id===selArmy);
 const known=r?(r.owner===s.player?r.owner:s.intel[s.player]?.[r.id]?.owner||null):null;
 return `${r?`<section class="insp"><h3>${esc(L(r.name))}</h3><dl><dt>${lang?'控制':'Held by'}</dt><dd>${known?esc(fac(known)):t('unknown')}</dd><dt>${lang?'州部':'Circuit'}</dt><dd>${esc(L(ZHOU[r.zhou].name))}</dd><dt>${lang?'战区':'Theatre'}</dt><dd>${esc(L(THEATERS[r.theater].name))}</dd><dt>${lang?'地形':'Terrain'}</dt><dd>${esc(L({plain:['plain','平原'],hills:['hills','丘陵'],mountain:['mountains','山地'],river:['river country','水乡'],desert:['desert','沙碛'],steppe:['steppe','草原'],oasis:['oasis','绿洲'],urban:['capital city','都城']}[r.terrain]))}</dd><dt>${lang?'治所':'Seat'}</dt><dd>${esc(L(r.seat||['—','—']))}</dd>${r.owner===s.player?`<dt>${lang?'忠诚':'Loyalty'}</dt><dd>${Math.round(r.loyalty)}</dd><dt>${lang?'补给':'Supply'}</dt><dd>${r.supply}</dd>`:''}<dt>${lang?'工事':'Fort'}</dt><dd>${r.fort}</dd></dl>${r.siege?`<p class="warn">${lang?'围城':'Siege'} ${r.siege.months}/${r.siege.need}</p>`:''}<p class="hint">${neighbours(r.id).map(n=>{const l=routeBetween(r.id,n);return `${esc(L(s.regions.find(x=>x.id===n).name).split(/[（(]/)[0])} (${esc(L({road:['road','道路'],river:['river','水道'],pass:['pass','关隘'],desert:['desert','沙碛'],steppe:['steppe','草原'],oasis:['oasis road','绿洲道']}[l.kind]))}, ${l.months}${lang?'月':' mo'})`}).join(' · ')}</p></section>`:''}
 ${a?`<section class="insp"><h3>${esc(L(a.template.name))}</h3>${a.owner===s.player?`<p>${fmt(a.men)} · ${lang?'士气':'morale'} ${a.morale} · ${lang?'补给':'supply'} ${a.supply}${a.commander?` · ${esc(pname(a.commander))}`:''}</p><button class="act primary" data-act="march" ${a.move||a.forming?'disabled':''}>${ordering?t('cancel'):t('march')}</button>${ordering?`<p class="hint">${t('noTarget')}</p>`:''}`:`<p>${esc(fac(a.owner))} · ${lang?'约':'about'} ${fmt(Math.round(a.men/1000)*1000)}</p>`}</section>`:''}`;
}

function legend(){
 if(mapMode==='circuits')return Object.entries(ZHOU).filter(([z])=>s.regions.some(r=>r.zhou===z)).map(([z,v])=>`<span><i style="background:${v.color}"></i>${esc(L(v.name))}</span>`).join('')+`<span class="hint">${lang?'刺史部为监察区，非一级政府':'Inspection circuits, not a level of government'}</span>`;
 if(mapMode==='theaters')return Object.entries(THEATERS).map(([k,v],i)=>`<span><i style="background:hsl(${(i*47)%360} 32% 55%)"></i>${esc(L(v.name))}</span>`).join('');
 if(mapMode==='terrain')return [['plateau','#c9b9a0',['Plateau','高原']],['mountain','#b8a68a',['Mountains','山地']],['desert','#e8d39c',['Desert','沙漠']],['steppe','#cdd2a0',['Steppe','草原']],['marsh','#b9c6a8',['Marsh','泽薮']]].map(([k,c,n])=>`<span><i style="background:${c}"></i>${esc(L(n))}</span>`).join('')+`<span><i class="line river"></i>${lang?'河流':'Rivers'}</span><span><i class="line wall"></i>${lang?'汉塞':'Han frontier'}</span>`;
 return [...new Set(s.regions.map(r=>r.owner))].filter(Boolean).map(o=>`<span><i style="background:${colors[o]||'#777'}"></i>${esc(fac(o))}</span>`).join('')+`<span><i class="stripes"></i>${lang?'向汉的城郭之国（都护监护）':'Oasis states standing with Han'}</span>`;
}
function railTabs(){
 const han=isHanPlayer();
 return [['emperor','帝'],['genealogy','谱'],...(han?[['court','廷'],['officials','官'],['succession','嗣']]:[]),['focus','策'],['finance','计'],['frontier','边'],['silk','丝'],['army','军'],['provinces','郡'],['records','史']];
}
function panel(){return ({emperor:panelEmperor,genealogy:panelGenealogy,court:panelCourt,officials:panelOfficials,succession:panelSuccession,focus:panelFocus,finance:panelFinance,frontier:panelFrontier,silk:panelSilk,army:panelArmy,provinces:panelProvinces,records:panelRecords}[tab]||panelEmperor)()}

export function render(){
 const root=document.getElementById('han-app');if(!root)return;
 document.documentElement.lang=lang?'zh-CN':'en';
 if(!s){root.innerHTML=setupScreen()+(toast?`<div class="toast">${esc(toast)}</div>`:'');return}
 const f=s.factions[s.player]||{},army=s.armies.find(a=>a.id===selArmy);
 const targets=new Set(ordering&&army?neighbours(army.region):[]);
 const visibleArmy=a=>a.owner===s.player||s.intel[s.player]?.[a.region]?.month===s.year*12+s.month;
 const scrollTop=root.querySelector('.panel')?.scrollTop||0;
 root.innerHTML=`<header class="top"><div class="brand"><span class="seal">汉</span><div><b>${t('title')}</b><small>${esc(L(SCENARIOS[s.scenario].name))} · ${esc(fac(s.player))}</small></div></div>
 <div class="date"><b>${dateLabel(s.year,s.month,lang)}</b><small>${esc(L(s.throne.dynasty.name))} · ${s.throne.orthodox?esc(pname(s.throne.orthodox)):(lang?'皇位虚悬':'throne vacant')}</small></div>
 <div class="stats">${[['treasury',fmt(f.treasury||0)],['grain',fmt(f.grain||0)],['manpower',fmt(f.manpower||0)],['horses',fmt(f.horses||0)],...(isHanPlayer()?[['mandate',s.mandate.value],['authority',emperorAuthority(s)]]:[])].map(([k,v])=>`<span><small>${t(k)}</small><b>${v}</b></span>`).join('')}</div>
 <div class="controls"><button data-act="play" class="act primary">${playing?t('pause'):t('play')}</button><button data-act="step" class="act">${t('step')}</button><select data-slot>${[1,2,3].map(n=>`<option ${slot==n?'selected':''}>${n}</option>`).join('')}</select><button data-act="save" class="act">${t('save')}</button><button data-act="load" class="act">${t('load')}</button><button data-act="lang" class="act">${lang?'EN':'中文'}</button><button data-act="menu" class="act">${t('menu')}</button></div></header>
 <div class="shell"><nav class="rail">${railTabs().map(([id,g])=>`<button data-tab="${id}" class="${tab===id?'on':''}"><span>${g}</span>${t(id)}</button>`).join('')}</nav>
 <main><div class="map-tools"><span class="tool-group">${Object.entries(MODES).map(([id,n])=>`<button class="mini mode ${mapMode===id?'on':''}" data-mode="${id}">${esc(L(n))}</button>`).join('')}</span><span class="tool-group">${Object.entries(CAMERAS).map(([id,c])=>`<button class="mini ${camera===id?'on':''}" data-camera="${id}">${esc(L(c.name))}</button>`).join('')}</span></div><div class="map-wrap">${drawMap(s,{lang,selected:selRegion,selectedArmy:selArmy,visibleArmy,colors,targets,silkPath:s.silk.lastPath,camera,mode:mapMode,oasisStanding:Object.fromEntries(OASIS.map(o=>[o,s.protectorate.oasis[o]?.han||0]))})}</div>
 <div class="legend">${legend()}</div>${inspector()}</main>
 <aside class="panel">${panel()}</aside></div>${toast?`<div class="toast" role="status">${esc(toast)}</div>`:''}`;
 const p=root.querySelector('.panel');if(p)p.scrollTop=scrollTop;
}

// ---------- events ----------
function onChange(e){
 const el=e.target;
 if(el.dataset.setup){setup[el.dataset.setup]=el.value;render();return}
 if(el.hasAttribute('data-slot')){slot=el.value;return}
 if(el.dataset.appoint&&el.value){const r=appoint(s,el.dataset.appoint,el.value);flash(r.ok?(lang?'任命已下':'Appointment made'):reason(r.reason));return}
 if(el.dataset.protect&&el.value){const r=protectorateAction(s,el.dataset.protect,el.value);flash(r.ok?(lang?`向汉 ${r.change>=0?'+':''}${r.change}`:`Han standing ${r.change>=0?'+':''}${r.change}`):reason(r.reason));return}
 if(el.dataset.propose&&el.value){const to=el.dataset.propose;if(el.value==='__war'){declareWar(s,s.player,to);render();return}const r=propose(s,s.player,to,el.value);flash(r.ok?(r.proposal.status==='accepted'?(lang?'对方接受':'Accepted'):r.proposal.status==='rejected'?(lang?'对方拒绝':'Rejected'):(lang?'已送出':'Sent')):reason(r.reason));return}
 if(el.dataset.mix){designer.mix[el.dataset.mix]=Number(el.value);render();return}
 if(el.hasAttribute('data-design-name')){designer.name=el.value;return}
}
function onClick(e){
 const b=e.target.closest('[data-act],[data-tab],[data-region],[data-army],[data-camera],[data-mode],[data-army-select],[data-region-select]');if(!b)return;
 if(b.dataset.tab){tab=b.dataset.tab;render();return}
 if(b.dataset.camera){camera=b.dataset.camera;render();return}
 if(b.dataset.mode){mapMode=b.dataset.mode;render();return}
 if(b.dataset.armySelect){selArmy=b.dataset.armySelect;render();return}
 if(b.dataset.regionSelect){selRegion=b.dataset.regionSelect;render();return}
 if(b.dataset.army&&!b.dataset.act){selArmy=b.dataset.army;ordering=false;render();return}
 if(b.dataset.region&&!b.dataset.act){
  if(ordering&&selArmy){const r=moveArmy(s,selArmy,b.dataset.region);ordering=false;if(!r.ok)flash(reason(r.reason));else flash(lang?`行军 ${r.months} 月`:`March: ${r.months} month(s)`);return}
  selRegion=b.dataset.region;render();return}
 const id=b.dataset.id,act=b.dataset.act;
 const done=(r,ok)=>flash(r.ok?ok:reason(r.reason));
 switch(act){
  case 'begin':s=newHanGame(setup.faction,{scenario:setup.scenario,difficulty:setup.difficulty});selRegion=s.regions.find(r=>r.owner===s.player)?.id;selArmy=s.armies.find(a=>a.owner===s.player)?.id||null;tab=isHanPlayer()?'emperor':'frontier';render();break;
  case 'lang':lang=lang?0:1;try{localStorage.setItem('spqr-lang',lang?'zh':'en')}catch{}render();break;
  case 'menu':if(playing)togglePlay();s=null;render();break;
  case 'play':togglePlay();break;
  case 'step':{const t0=performance.now();tick(s);s._lastTick=performance.now()-t0;render();break}
  case 'save':try{localStorage.setItem(SAVE_KEY(slot),serialize(s));flash(lang?`已存入栏位 ${slot}`:`Saved to slot ${slot}`)}catch{flash(lang?'无法保存':'Could not save')}break;
  case 'load':case 'load-slot':{const n=b.dataset.slot||slot;try{const raw=localStorage.getItem(SAVE_KEY(n));if(!raw){flash(lang?'空栏位':'Empty slot');break}s=loadHanSave(raw);selRegion=s.regions.find(r=>r.owner===s.player)?.id;selArmy=null;flash(lang?'已读取':'Loaded')}catch{flash(lang?'存档无法读取':'Save could not be read')}break}
  case 'march':ordering=!ordering;render();break;
  case 'empress':done(elevateEmpress(s,id),lang?'已立皇后':'Empress named');break;
  case 'heir':done(designateHeir(s,id),lang?'已立太子':'Heir named');break;
  case 'dismiss':done(dismiss(s,id),lang?'已罢免':'Dismissed');break;
  case 'edict':done(issueEdict(s,id),lang?'诏令已下':'Edict issued');break;
  case 'audit':done(startAudit(s,id),lang?'开始稽查':'Investigation opened');break;
  case 'debate':done(answerDebate(s,Number(id),b.dataset.choice),lang?'已裁决':'Decided');break;
  case 'disaster':done(respondToDisaster(s,id),lang?'已应对':'Response ordered');break;
  case 'proposal':done(answerProposal(s,Number(id),b.dataset.choice==='1'),lang?'已答复':'Answered');break;
  case 'request':done(answerRequest(s,Number(id),b.dataset.choice==='1'),lang?'已答复':'Answered');break;
  case 'tax':done(setTaxLevel(s,id),lang?'田租已调整':'Land tax set');break;
  case 'focus':done(startFocus(s,s.player,id),lang?'国策开始':'Focus begun');break;
  case 'recruit':{const r=recruit(s,s.player,selRegion,id);done(r,lang?'新军编练中':'Formation raising');break}
  case 'save-template':{const r=saveTemplate(s,s.player,{name:designer.name||(lang?'自定编制':'Custom'),mix:Object.fromEntries(Object.entries(designer.mix).filter(([,v])=>v>0))});flash(r.ok?(lang?'编制已保存':'Formation saved'):r.errors.join(', '));break}
  case 'protect':done(protectRoute(s),lang?'加强护路':'Road guarded');break;
  case 'embassy':done(sendTradeEmbassy(s),lang?'使团启程':'Embassy dispatched');break;
  case 'finalize':{let store=null;try{store=localStorage}catch{}const r=finalizeHan(s,store);done(r,lang?'战役已封存':'Campaign finalized');break}
 }
}
export const __test={get state(){return s},set state(v){s=v},panels:{panelEmperor,panelGenealogy,panelCourt,panelOfficials,panelSuccession,panelFocus,panelFinance,panelFrontier,panelSilk,panelArmy,panelProvinces,panelRecords},setLang:v=>{lang=v},T};
