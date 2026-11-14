import {campaignYear,campaignDate} from './campaign-date.js?v=calendar-1';
import {reportedControl} from './control-intelligence.js?v=fort-intel-1';
import {REGIONS,ROUTES,FACTIONS} from './data.js?v=phase-x-1';
import {CHARACTER_CATALOG} from './characters.js?v=succession-ui-recovery-1';
import {mapPoint} from './map.js?v=succession-ui-recovery-1';
import {BRANCH_NAMES,PATH_NAMES} from './imperium-focus-data.js?v=imperium-1';
import {treeFor,focusStatus,focusState,canStartFocus,startFocus,cancelFocus,focusCost,focusReportsFor,focusById} from './national-focus.js?v=succession-ui-recovery-1';
import {COMPONENTS,CULTURE_NAMES,templatesFor,templateStats,saveTemplate,duplicateTemplate,deleteTemplate,validateTemplate,availableComponents,cultureOf,reorganizationQuote,reorganizeArmy,recruitmentQuote,recruitFormation,commanderSpecialty,commandConcentration,seedTemplates,formationState,outdatedArmies} from './legion-designer.js?v=succession-ui-recovery-1';
import {ROLES,ROLE_NAMES,MODES,plansFor,planById,createPlan,assignRole,removeRole,approvePlan,pausePlan,cancelPlan,editPlan,assessPlan,adviserCounsel,approveRecommendation,legalStep} from './battle-plans.js?v=succession-ui-recovery-1';

// IMPERIUM screens: national strategy tree, legion designer, operational planner.
// UI state is local to this module; game state changes only through engine APIs.
export const IMPERIUM_TABS=[['focus','✠'],['legions','▤'],['plans','➶']];
export const IMPERIUM_LABELS={en:{focus:'Strategy',legions:'Legions',plans:'Operations'},zh:{focus:'国家方针',legions:'军团编制',plans:'作战计划'}};
const ui={focusOpen:false,zoom:.82,pan:[24,24],selected:null,draft:null,draftFor:null,compare:[],plan:null,drawing:null,addRole:'offensive',addArmy:'',addTarget:''};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const L=(lang,pair)=>Array.isArray(pair)?pair[lang==='zh'?1:0]:pair;
const rname=(id,lang)=>L(lang,REGIONS.find(r=>r.id===id)?.name)||id;
const fname=(id,lang)=>L(lang,FACTIONS[id]?.short)||id;
const cname=(id,lang)=>L(lang,CHARACTER_CATALOG[id]?.name)||id;
const T={
 en:{open:'Open the national strategy',active:'Current focus',none:'No focus selected',months:'months',start:'Begin focus',cancel:'Set aside (keeps progress)',cost:'Cost',prereq:'Requires',any:'Requires one of',excl:'Excludes',effects:'Effects',history:'Historical context',alternate:'Alternate history',status:'Status',close:'Close',reports:'Foreign strategy reports (as reported)',noReports:'No foreign focus has been reported to your court.',progress:'Progress',zoomIn:'Zoom in',zoomOut:'Zoom out',reset:'Reset view',
  st:{available:'Available',in_progress:'In progress',completed:'Completed',locked:'Locked',exclusive:'Mutually exclusive',suspended:'Suspended — conditions unmet',invalid:'Invalidated',busy:'Another focus is active',treasury:'Not enough treasury',legitimacy:'Legitimacy too low',stability:'Stability too low'},
  designer:'Legion Designer',templates:'Templates',newT:'New template',name:'Formation name',main:'Main body',support:'Support attachments',save:'Save template',saveNew:'Save as new',dup:'Duplicate',del:'Delete',stats:'Calculated statistics',personnel:'Personnel',recruit:'Recruitment cost',equip:'Equipment cost',upkeep:'Monthly upkeep',food:'Food per month',speed:'Movement',attack:'Attack',defense:'Holding power',morale:'Morale',training:'Training',recon:'Reconnaissance',siege:'Siege capability',supply:'Supply support',terrain:'Terrain performance',locked:'locked',apply:'Apply to army (reorganize)',raise:'Raise new formation',army:'Army',region:'Theater',quote:'Requires',compare:'Compare',compareHint:'Tick up to three templates to compare.',commander:'Commander',noCommander:'— none —',concentration:'Concentration of military power',outdated:'Armies organized under an older version of this template',reinforce:'Reinforcement per 1,000',profile:'Profile',errors:'Cannot save',partial:'Partial conversion',
  speeds:{fast:'Fast on rough ground',normal:'Normal',slow:'Slow on rough ground'},profiles:{cavalry:'Cavalry-heavy',infantry:'Heavy infantry',siege:'Siege-oriented',mixed:'Mixed'},levels:{low:'low',elevated:'elevated',high:'high'},
  planner:'Operational Battle Planner',plans:'Plans',newPlan:'New plan',planName:'Plan name',mode:'Execution mode',modes:{manual:'Manual — you issue each order',assisted:'Assisted — recommendations need approval',automatic:'Automatic — assigned armies execute'},condition:'Execution condition',conditions:{immediate:'Immediately on approval',prepared:'After preparation (costs time and resources)'},fallback:'Fallback position',supplyP:'Supply priority (3 treasury/month)',roles:'Assigned armies',addArmy:'Assign army',role:'Role',target:'Target',draw:'Draw route on the map',drawing:'Click adjacent theaters on the map to extend the route.',done:'Finish route',undo:'Undo step',approve:'Approve plan',pause:'Pause',resume:'Resume',cancelP:'Cancel plan',remove:'Remove',risk:'Risk assessment',advisers:'Council',events:'Plan log',recs:'Recommendations',approveRec:'Approve',noPlans:'No operations planned.',friendly:'Friendly strength',known:'Known enemy forces',intel:'Intelligence age',travel:'Travel time',reinforceD:'Reinforcement distance',siegeD:'Fortified objectives',counter:'Counterattack threats',political:'Political risks',supplyC:'Supply',noIntel:'none',
  pstatus:{draft:'Draft',preparing:'Preparing',active:'Active',paused:'Paused',needs_attention:'Needs your decision',completed:'Completed',cancelled:'Cancelled',failed:'Failed'},
  stance:{support:'supports',caution:'urges caution',oppose:'opposes'},reasons:{supply:'supply is the weak point',enemy_strength:'the enemy may be stronger than reported',stale_intelligence:'the intelligence is old',counterattack:'a counterattack threatens the flank',long_siege:'the siege will be long',distance:'the distance is great',political:'it concentrates power dangerously',personal_gain:'it would bring personal glory',confidence:'the legions will prevail',sound:'the plan is sound',none:'no clear objection'},
  attention:{enemy_reinforced:'Scouts report stronger enemy forces at the objective.',supply:'Supply is failing.',siege_delay:'The siege is taking longer than expected.',inaccessible:'An objective can no longer be entered.',new_war:'A new war has begun.',stuck:'An army made no progress and stopped.'}},
 zh:{open:'打开国家方针树',active:'当前方针',none:'尚未选择方针',months:'个月',start:'开始此方针',cancel:'暂时搁置（保留进度）',cost:'代价',prereq:'前置要求',any:'需其中之一',excl:'互斥',effects:'效果',history:'历史背景',alternate:'架空历史',status:'状态',close:'关闭',reports:'外国方针报告（据报）',noReports:'尚无外国方针报告送达你的宫廷。',progress:'进度',zoomIn:'放大',zoomOut:'缩小',reset:'重置视图',
  st:{available:'可选',in_progress:'进行中',completed:'已完成',locked:'未解锁',exclusive:'已互斥',suspended:'中止——条件不满足',invalid:'已失效',busy:'另一项方针正在进行',treasury:'国库不足',legitimacy:'合法性过低',stability:'稳定度过低'},
  designer:'军团编制器',templates:'编制模板',newT:'新模板',name:'编队名称',main:'主力',support:'支援附属',save:'保存模板',saveNew:'另存为新模板',dup:'复制',del:'删除',stats:'计算属性',personnel:'所需兵员',recruit:'征召费用',equip:'装备费用',upkeep:'每月维持费',food:'每月粮耗',speed:'机动',attack:'攻击',defense:'坚守能力',morale:'士气',training:'训练',recon:'侦察能力',siege:'攻城能力',supply:'补给支援',terrain:'地形适应',locked:'未解锁',apply:'应用到军队（改编）',raise:'征召新编队',army:'军队',region:'战区',quote:'需要',compare:'比较',compareHint:'勾选最多三个模板进行比较。',commander:'指挥官',noCommander:'——无——',concentration:'军权集中程度',outdated:'仍按此模板旧版本编组的军队',reinforce:'每补充1000人',profile:'类型',errors:'无法保存',partial:'部分改编',
  speeds:{fast:'崎岖地形上较快',normal:'正常',slow:'崎岖地形上较慢'},profiles:{cavalry:'骑兵为主',infantry:'重步兵',siege:'攻城型',mixed:'混合'},levels:{low:'低',elevated:'偏高',high:'高'},
  planner:'战略作战计划',plans:'作战计划',newPlan:'新建计划',planName:'计划名称',mode:'执行模式',modes:{manual:'手动——每道命令由你下达',assisted:'辅助——建议需你批准',automatic:'自动——所属军队自行执行'},condition:'执行条件',conditions:{immediate:'批准后立即执行',prepared:'准备完成后执行（耗费时间与资源）'},fallback:'后撤阵地',supplyP:'补给优先（每月3国库）',roles:'所属军队',addArmy:'分配军队',role:'任务',target:'目标',draw:'在地图上绘制路线',drawing:'在地图上依次点击相邻战区以延伸路线。',done:'完成路线',undo:'撤销一步',approve:'批准计划',pause:'暂停',resume:'恢复',cancelP:'取消计划',remove:'移除',risk:'风险评估',advisers:'幕僚意见',events:'计划记录',recs:'建议',approveRec:'批准',noPlans:'尚无作战计划。',friendly:'己方兵力',known:'已知敌军',intel:'情报时效',travel:'行军时间',reinforceD:'增援距离',siegeD:'设防目标',counter:'反击威胁',political:'政治风险',supplyC:'补给',noIntel:'无',
  pstatus:{draft:'草案',preparing:'准备中',active:'执行中',paused:'已暂停',needs_attention:'需要你的决定',completed:'已完成',cancelled:'已取消',failed:'已失败'},
  stance:{support:'支持',caution:'主张谨慎',oppose:'反对'},reasons:{supply:'补给是薄弱环节',enemy_strength:'敌军可能比报告的更强',stale_intelligence:'情报已经过时',counterattack:'侧翼有遭反击之虞',long_siege:'围城将旷日持久',distance:'路途遥远',political:'这会危险地集中权力',personal_gain:'这能带来个人荣耀',confidence:'军团必胜',sound:'计划稳妥',none:'没有明确异议'},
  attention:{enemy_reinforced:'侦察报告目标处敌军增强。',supply:'补给不足。',siege_delay:'围攻比预期更久。',inaccessible:'某个目标已无法进入。',new_war:'新的战争爆发。',stuck:'一支军队毫无进展，已停下。'}}
};
const tx=lang=>T[lang==='zh'?'zh':'en'];

// ---------- glyphs (original line icons) ----------
const GLYPH={eagle:'M-9 2 L-3 -2 L0 -8 L3 -2 L9 2 L3 1 L2 7 L-2 7 L-3 1 Z',scroll:'M-8 -6 H6 A2 2 0 0 1 6 -2 H-6 V6 H8 M-8 -6 A2 2 0 0 0 -8 -2',laurel:'M0 8 C-8 2 -8 -4 -4 -8 M0 8 C8 2 8 -4 4 -8 M-6 -1 L-3 0 M6 -1 L3 0 M-5 -5 L-2 -4 M5 -5 L2 -4',sword:'M0 -9 L2 5 L0 7 L-2 5 Z M-5 4 H5 M0 7 V9',shield:'M0 -8 L7 -5 V1 C7 5 3 7 0 9 C-3 7 -7 5 -7 1 V-5 Z',coin:'M0 -7 A7 7 0 1 0 0.01 -7 M-3 -3 H3 M-3 3 H3 M0 -5 V5',grain:'M0 9 V-7 M0 -4 L-4 -7 M0 -4 L4 -7 M0 0 L-4 -3 M0 0 L4 -3 M0 4 L-4 1 M0 4 L4 1',road:'M-4 9 L-1 -9 M4 9 L1 -9 M0 6 V4 M0 1 V-1 M0 -4 V-6',ship:'M-9 3 H9 L6 7 H-6 Z M0 3 V-8 L6 -1 H0',temple:'M-8 -3 L0 -8 L8 -3 Z M-7 -3 V6 M-3 -3 V6 M3 -3 V6 M7 -3 V6 M-9 7 H9',crown:'M-8 5 L-7 -5 L-3 0 L0 -7 L3 0 L7 -5 L8 5 Z',seal:'M0 -8 A8 8 0 1 0 0.01 -8 M0 -4 L2 0 L0 4 L-2 0 Z',horse:'M-7 7 L-5 0 L-1 -2 L3 -7 L6 -6 L4 -3 L6 2 L4 7 M-5 0 L-8 2',tower:'M-5 9 V-5 H5 V9 M-6 -5 V-8 H-3 V-6 H-1 V-8 H1 V-6 H3 V-8 H6 V-5 M-2 9 V4 H2 V9',handshake:'M-9 0 L-4 -3 L0 -1 L4 -3 L9 0 M-4 -3 L-1 3 L3 1 M0 -1 L3 3',scales:'M0 -8 V7 M-6 7 H6 M-8 -5 H8 M-8 -5 L-10 1 H-6 Z M8 -5 L6 1 H10 Z',bow:'M-4 -9 C6 -5 6 5 -4 9 M-4 -9 V9 M-4 0 H8 M5 -2 L8 0 L5 2',river:'M-9 -4 C-5 -7 -1 -1 3 -4 C6 -6 8 -5 9 -4 M-9 2 C-5 -1 -1 5 3 2 C6 0 8 1 9 2 M-9 7 C-5 4 -1 9 3 7',mountain:'M-9 7 L-3 -4 L0 1 L4 -7 L9 7 Z',star:'M0 -9 L2 -3 L9 -3 L3 1 L5 8 L0 4 L-5 8 L-3 1 L-9 -3 L-2 -3 Z',column:'M-6 -8 H6 M-5 -6 H5 M-4 -6 V7 M0 -6 V7 M4 -6 V7 M-6 8 H6',fasces:'M-3 -8 V8 M0 -8 V8 M3 -8 V8 M-4 -4 H4 M-4 4 H4 M3 -8 L8 -5 L3 -3',camel:'M-8 7 V2 L-5 -1 L-2 1 L1 -3 L4 0 L7 -6 L9 -5 L7 2 V7',elephant:'M-8 6 V-1 C-8 -6 4 -7 6 -2 L8 3 L7 7 M6 -2 C9 -1 9 4 7 7 M-4 6 V3 M2 6 V3',torch:'M-2 9 L-3 -1 H3 L2 9 M0 -1 C-4 -4 -2 -6 0 -9 C2 -6 4 -4 0 -1'};
const glyph=(k,cls='glyph')=>`<path class="${cls}" d="${GLYPH[k]||GLYPH.star}"/>`;

// ---------- effect descriptions ----------
const MOD_NAMES={battle:['battle effectiveness','战斗力'],defense:['defense','防御'],march:['march speed','行军速度'],tax:['tax yield','税收'],treasury:['treasury per month','每月国库'],food:['food per month','每月粮食'],stability:['stability per month','每月稳定度'],intelligence:['intelligence','情报能力'],planPrep:['plan preparation','作战准备'],siege:['siege works','攻城速度'],reorg:['reorganization discount','改编折扣'],seaCost:['sea transport cost','渡海费用'],training:['training time','训练时间']};
export function describeEffect(e,lang){
 const zh=lang==='zh',sign=v=>(v>0?'+':'')+(Math.abs(v)<1&&v!==0?Math.round(v*100)+'%':v);
 if(e.res)return Object.entries(e.res).map(([k,v])=>`${zh?({treasury:'国库',food:'粮食',manpower:'兵源',stability:'稳定度',legitimacy:'合法性'})[k]:k} ${sign(v)}`).join(zh?'，':', ');
 if(e.mod)return Object.entries(e.mod).map(([k,v])=>`${L(lang,MOD_NAMES[k])} ${sign(v)}`).join(zh?'，':', ');
 if(e.unlock)return (zh?'解锁编制组件：':'Unlocks component: ')+e.unlock.map(c=>L(lang,COMPONENTS[c]?.name)).join(zh?'、':', ');
 if(e.armyMorale)return zh?`所有军队士气 +${e.armyMorale}`:`All armies morale +${e.armyMorale}`;
 if(e.supply)return zh?`补给 +${e.supply.n}（${e.supply.where==='coastal'?'已控制的沿海战区':(e.supply.where||[]).map(r=>rname(r,lang)).join('、')}）`:`Supply +${e.supply.n} (${e.supply.where==='coastal'?'held coastal theaters':(e.supply.where||[]).map(r=>rname(r,lang)).join(', ')})`;
 if(e.elite)return zh?`有影响力的人物忠诚度 ${sign(e.elite)}`:`Influential figures’ loyalty ${sign(e.elite)}`;
 if(e.generals)return zh?`将领与野心家忠诚度 ${sign(e.generals)}`:`Commanders’ and ambitious figures’ loyalty ${sign(e.generals)}`;
 if(e.perceive)return zh?'有接触的外国宫廷会视之为战略威胁':'Courts in contact may see this as a strategic threat';
 if(e.leaderInfluence)return zh?`统治者影响力 ${sign(e.leaderInfluence)}`:`Ruler’s influence ${sign(e.leaderInfluence)}`;
 if(e.succession)return zh?'通过继承系统安排继承人':'Designates a successor through the succession system';
 if(e.relation)return e.relation.map(r=>`${fname(r.target,lang)} ${zh?'关系':'relations'} ${sign(r.n)}`).join(zh?'，':', ');
 if(e.peaceLetter)return zh?`若处于战争，向${fname(e.peaceLetter,lang)}寄出议和书信（由对方决定）`:`If at war, sends a peace letter to ${fname(e.peaceLetter,lang)} (they decide)`;
 if(e.propose)return zh?`向${e.propose.targets.map(x=>fname(x,lang)).join('、')}提出协定（对方可拒绝）`:`Proposes an agreement to ${e.propose.targets.map(x=>fname(x,lang)).join(', ')} (they may refuse)`;
 if(e.foreignTrust)return zh?`${fname(e.foreignTrust.faction,lang)}人物对其领袖的忠诚略降`:`${fname(e.foreignTrust.faction,lang)} figures become slightly less loyal to their leaders`;
 if(e.loyalty)return zh?`已控制战区忠诚度 ${sign(e.loyalty)}`:`Held theaters’ loyalty ${sign(e.loyalty)}`;
 if(e.regionLoyalty)return `${rname(e.regionLoyalty.region,lang)} ${zh?'忠诚度':'loyalty'} ${sign(e.regionLoyalty.n)}`;
 if(e.satisfaction)return zh?`民众满意度 ${sign(e.satisfaction)}`:`Population satisfaction ${sign(e.satisfaction)}`;
 if(e.oversight)return zh?'建立宪政监督（降低密谋风险）':'Establishes constitutional oversight (lower plot risk)';
 if(e.fort)return zh?`加固${e.fort.count||1}个战区（要塞 +1）`:`Fortifies ${e.fort.count||1} theater(s) (fort +1)`;
 if(e.religion)return zh?`宗教机构关系 +${e.religion}`:`Religious institutions +${e.religion}`;
 if(e.characterInfluence)return `${cname(e.characterInfluence.id,lang)} ${zh?'影响力':'influence'} ${sign(e.characterInfluence.n)}`;
 if(e.characterLoyalty)return `${e.characterLoyalty.ids.map(id=>cname(id,lang)).join(zh?'、':', ')} ${zh?'忠诚度':'loyalty'} ${sign(e.characterLoyalty.n)}`;
 return '';
}

// ---------- national focus ----------
// Card titles wrap to two lines (about 17 Latin or 8 CJK characters per line).
function wrapName(name,lang){const max=lang==='zh'?8:17;if(name.length<=max)return [name];
 if(lang==='zh')return [name.slice(0,max),name.slice(max,max*2-1)+(name.length>max*2-1?'…':'')];
 const words=name.split(' ');let a='';while(words.length&&(a+' '+words[0]).trim().length<=max)a=(a+' '+words.shift()).trim();if(!a)a=words.shift();let b=words.join(' ');if(b.length>max+1)b=b.slice(0,max)+'…';return b?[a,b]:[a]}
function layout(tree){
 const cols=[...new Set(tree.map(f=>f.path))].sort((a,b)=>a==='opening'?-1:b==='opening'?1:a.localeCompare(b));
 const depth=new Map();const d=f=>{if(depth.has(f.id))return depth.get(f.id);const p=[...f.prereq,...f.any].map(id=>tree.find(x=>x.id===id)).filter(Boolean);const v=p.length?Math.max(...p.map(d))+1:0;depth.set(f.id,v);return v};tree.forEach(d);
 // Each column is as wide as its busiest row, so cards never overlap.
 const slots={};for(const f of tree){const key=`${f.path}:${depth.get(f.id)}`;slots[key]=(slots[key]||0)+1}
 const span=cols.map(c=>Math.max(1,...Object.entries(slots).filter(([k])=>k.startsWith(c+':')).map(([,n])=>n)));
 const left=span.map((_,i)=>span.slice(0,i).reduce((a,b)=>a+b,0)*204);
 const pos=new Map(),rowsUsed={};
 for(const f of tree){const c=cols.indexOf(f.path),r=depth.get(f.id);const key=`${c}:${r}`;const n=rowsUsed[key]=(rowsUsed[key]||0)+1;pos.set(f.id,{x:left[c]+(n-1)*204,y:r*124,col:c})}
 const width=Math.max(...[...pos.values()].map(p=>p.x))+200,height=Math.max(...[...pos.values()].map(p=>p.y))+110;
 return {pos,cols,width,height,left,span};
}
export function focusPanel(state,lang){
 const L2=tx(lang),st=focusState(state,state.player),tree=treeFor(state.player);if(!tree)return `<p class="hint">—</p>`;
 const a=st.active,f=a&&focusById(state.player,a.id),reports=focusReportsFor(state,state.player).slice(0,8);
 const avail=tree.filter(x=>focusStatus(state,state.player,x.id)==='available').slice(0,6);
 return `<div class="panel-heading"><span class="eyebrow">CONSILIVM PVBLICVM</span><h2>${L2===T.zh?'国家方针':'National Strategy'}</h2></div>
 <div class="imp-current">${f?`<b>${esc(L(lang,f.name))}</b><div class="imp-bar" role="progressbar" aria-valuenow="${a.progress}" aria-valuemax="${a.months}"><i style="width:${Math.round(a.progress/a.months*100)}%"></i></div><small>${a.progress}/${a.months} ${L2.months}${a.suspended?' · '+L2.st.suspended:''}</small>`:`<small>${L2.none}</small>`}</div>
 <button class="action imp-open" data-imp-open-focus>${L2.open}</button>
 <h3 class="imp-sub">${L2.st.available}</h3><ul class="imp-list">${avail.map(x=>`<li><button data-imp-focus="${x.id}">${esc(L(lang,x.name))}<small>${x.months} ${L2.months} · ${x.cost.treasury||0}¤</small></button></li>`).join('')||'<li><small>—</small></li>'}</ul>
 <h3 class="imp-sub">${L2.reports}</h3>${reports.length?`<ul class="imp-list">${reports.map(r=>`<li><small>${esc(fname(r.actor,lang))} · ${esc(L(lang,focusById(r.actor,r.focus)?.name)||r.focus)} · ${r.month}/${campaignYear(r.year)}</small></li>`).join('')}</ul>`:`<p class="hint">${L2.noReports}</p>`}`;
}
export function focusScreen(state,lang){
 if(!ui.focusOpen)return '';const L2=tx(lang),tree=treeFor(state.player);if(!tree)return '';
 const {pos,cols,width,height,left,span}=layout(tree),st=focusState(state,state.player),paths=PATH_NAMES[state.player]||PATH_NAMES.default;
 const lines=tree.flatMap(f=>[...f.prereq,...f.any].map(p=>{const a=pos.get(p),b=pos.get(f.id);if(!a||!b)return '';const done=st.completed.includes(p);return `<path class="imp-link ${done?'done':''} ${f.any.includes(p)?'any':''}" d="M${a.x+92} ${a.y+84} C${a.x+92} ${a.y+104}, ${b.x+92} ${b.y-20}, ${b.x+92} ${b.y}"/>`})).join('');
 const excl=tree.flatMap(f=>f.exclusive.filter(x=>x>f.id).map(x=>{const a=pos.get(f.id),b=pos.get(x);if(!a||!b)return '';const mx=(Math.min(a.x,b.x)+184+Math.max(a.x,b.x))/2,my=(a.y+b.y)/2+88;const [p1,p2]=a.x<=b.x?[a,b]:[b,a];return `<path class="imp-excl" d="M${p1.x+184} ${p1.y+50} C${p1.x+200} ${p1.y+104}, ${p2.x-16} ${p2.y+104}, ${p2.x} ${p2.y+50}"/><g transform="translate(${mx} ${my})" class="imp-excl-mark"><circle r="7"/><path d="M-3 -3 L3 3 M3 -3 L-3 3"/></g>`})).join('');
 const nodes=tree.map(f=>{const p=pos.get(f.id),s=focusStatus(state,state.player,f.id),a=st.active?.id===f.id?st.active:null;return `<g class="imp-node s-${s} ${ui.selected===f.id?'sel':''} b-${f.branch}" transform="translate(${p.x} ${p.y})" data-imp-focus="${f.id}" tabindex="0" role="button" aria-label="${esc(L(lang,f.name))} · ${esc(L2.st[s]||s)}"><rect class="imp-card" width="184" height="84" rx="3"/><rect class="imp-band" width="6" height="84"/><g transform="translate(28 30)"><circle class="imp-seal" r="16"/>${glyph(f.icon)}</g>${wrapName(L(lang,f.name),lang).map((line,i)=>`<text x="52" y="${18+i*15}" class="imp-t">${esc(line)}</text>`).join('')}<text x="52" y="${wrapName(L(lang,f.name),lang).length>1?50:40}" class="imp-m">${f.months} ${L2.months} · ${f.cost.treasury||0}¤${f.cost.legitimacy?` · ${f.cost.legitimacy}⚖`:''}</text><text x="52" y="${wrapName(L(lang,f.name),lang).length>1?64:58}" class="imp-s">${esc(L2.st[s]||s)}</text>${a?`<rect x="52" y="72" width="120" height="5" class="imp-pbg"/><rect x="52" y="72" width="${Math.round(120*a.progress/a.months)}" height="5" class="imp-pfg"/>`:''}${f.alternate?`<text x="176" y="16" text-anchor="end" class="imp-alt">✦</text>`:''}</g>`}).join('');
 const headers=cols.map((c,i)=>`<text x="${left[i]+span[i]*102-10}" y="-14" text-anchor="middle" class="imp-col">${esc(L(lang,paths[c]||[c,c]))}</text>`).join('');
 const sel=ui.selected&&focusById(state.player,ui.selected),selStatus=sel&&focusStatus(state,state.player,sel.id),reason=sel&&canStartFocus(state,state.player,sel.id);
 const drawer=sel?`<aside class="imp-drawer" aria-label="${esc(L(lang,sel.name))}"><svg viewBox="-20 -20 40 40" class="imp-drawer-icon"><circle class="imp-seal" r="17"/>${glyph(sel.icon)}</svg><h3>${esc(L(lang,sel.name))}</h3><p class="imp-tags"><span>${esc(L(lang,BRANCH_NAMES[sel.branch]))}</span>${sel.alternate?`<span class="alt">${L2.alternate}</span>`:''}<span>${esc(L2.st[selStatus]||selStatus)}</span></p><p>${esc(L(lang,sel.desc))}</p>
  <dl><dt>${L2.cost}</dt><dd>${sel.cost.treasury||0} ¤${sel.cost.legitimacy?` · ${lang==='zh'?'合法性':'legitimacy'} −${sel.cost.legitimacy}`:''} · ${sel.months} ${L2.months}</dd>${sel.prereq.length?`<dt>${L2.prereq}</dt><dd>${sel.prereq.map(id=>esc(L(lang,focusById(state.player,id).name))).join(lang==='zh'?'、':', ')}</dd>`:''}${sel.exclusive.length?`<dt>${L2.excl}</dt><dd>${sel.exclusive.map(id=>esc(L(lang,focusById(state.player,id).name))).join(lang==='zh'?'、':', ')}</dd>`:''}<dt>${L2.effects}</dt><dd><ul>${sel.effects.map(e=>`<li>${esc(describeEffect(e,lang))}</li>`).join('')}</ul></dd><dt>${L2.history}</dt><dd>${esc(L(lang,sel.history))}</dd></dl>
  ${st.active?.id===sel.id?`<button class="action" data-imp-cancel-focus>${L2.cancel}</button>`:`<button class="action primary" data-imp-start-focus="${sel.id}" ${reason?'disabled':''}>${L2.start}</button>${reason&&reason!=='available'?`<p class="hint">${esc(L2.st[reason]||reason)}</p>`:''}`}</aside>`:'';
 return `<div class="imp-focus-screen" role="dialog" aria-label="${L2===T.zh?'国家方针树':'National focus tree'}"><header><span class="imp-mark">${esc(fname(state.player,lang))}</span><h2>${L2===T.zh?'国家方针 · 国家意志':'National Strategy · Imperium'}</h2><div class="imp-tools"><button data-imp-zoom="in" aria-label="${L2.zoomIn}">+</button><button data-imp-zoom="out" aria-label="${L2.zoomOut}">−</button><button data-imp-zoom="reset">${L2.reset}</button><button data-imp-close-focus>${L2.close}</button></div></header>
 <div class="imp-canvas"><svg id="imp-tree" viewBox="0 0 1400 820"><g id="imp-tree-view" transform="translate(${ui.pan[0]} ${ui.pan[1]+30}) scale(${ui.zoom})">${headers}${lines}${excl}${nodes}</g></svg>${drawer}</div>
 <footer>${Object.entries(BRANCH_NAMES).map(([k,v])=>`<span class="b-${k}"><i></i>${esc(L(lang,v))}</span>`).join('')}<span><i class="excl"></i>${L2.excl}</span><span>✦ ${L2.alternate}</span></footer></div>`;
}

// ---------- legion designer ----------
function draftFor(state){
 const own=templatesFor(state,state.player);if(ui.draftFor!==state.player||!ui.draft){ui.draftFor=state.player;const t=own[0];ui.draft=t?{id:t.id,name:t.name,main:{...t.main},support:{...t.support},commander:'',army:'',region:''}:{id:null,name:'',main:{},support:{},commander:'',army:'',region:''}}
 return ui.draft;
}
const bar=(v,max=1.3)=>`<span class="imp-meter"><i style="width:${Math.max(4,Math.min(100,v/max*100))}%"></i></span>`;
export function designerScreen(state,lang){
 seedTemplates(state,state.player);const L2=tx(lang),d=draftFor(state),owner=state.player,comps=availableComponents(state,owner),all=Object.values(COMPONENTS).filter(c=>c.cultures.includes(cultureOf(owner)));
 const errs=validateTemplate(state,owner,d),st=errs.filter(e=>!e.includes('main units')).length&&Object.keys({...d.main,...d.support}).length===0?null:templateStats(d);
 const slot=c=>{const open=comps.includes(c),n=(c.slot==='main'?d.main:d.support)[c.id]||0;return `<li class="${open?'':'locked'}"><span><b>${esc(L(lang,c.name))}</b><small>${esc(L(lang,c.desc))}</small></span><span class="imp-count"><button data-imp-slot="${c.id}" data-d="-1" ${!n?'disabled':''} aria-label="−">−</button><output>${n}</output><button data-imp-slot="${c.id}" data-d="1" ${!open||n>=c.max?'disabled':''} aria-label="+">+</button></span>${open?'':`<em>${L2.locked}</em>`}</li>`};
 const commanders=Object.values(state.world.characters).filter(c=>c.alive&&c.faction===owner);
 const spec=d.commander?commanderSpecialty(state,d.commander):null,conc=d.commander?commandConcentration(state,owner,d.commander):null;
 const own=templatesFor(state,owner),armies=state.armies.filter(a=>a.owner===owner&&a.men>0),regions=state.regions.filter(r=>r.owner===owner);
 const q=d.id&&d.army?reorganizationQuote(state,owner,d.army,d.id):null,rq=d.id?recruitmentQuote(state,owner,d.id):null;
 const outdated=d.id?outdatedArmies(state,owner).filter(id=>state.armies.find(a=>a.id===id)?.formation?.templateId===d.id):[];
 const cmp=ui.compare.map(id=>formationState(state).templates[id]).filter(t=>t&&t.owner===owner);
 const reasonText=r=>({location:lang==='zh'?'军队须位于己方战区':'Army must be in friendly territory',busy:lang==='zh'?'军队正在行军、围攻或改编':'Army is marching, besieging or reorganizing',enemy:lang==='zh'?'敌军在场':'Enemy present',supply:lang==='zh'?'没有通往己方补给中心的路线':'No route to a friendly supply center',template:lang==='zh'?'模板无效':'Template invalid',resources:lang==='zh'?'资源不足':'Not enough resources',unknown:'—'})[r]||r;
 return `<div class="imp-designer"><header><h2>${L2.designer}</h2><small>${esc(L(lang,CULTURE_NAMES[cultureOf(owner)]))}</small></header>
 <section class="imp-col-list"><h3>${L2.templates}</h3><ul>${own.map(t=>`<li class="${d.id===t.id?'on':''}"><label class="imp-cmp"><input type="checkbox" data-imp-compare="${t.id}" ${ui.compare.includes(t.id)?'checked':''} aria-label="${L2.compare}"></label><button data-imp-template="${t.id}">${esc(lang==='zh'&&t.nameZh?t.nameZh:t.name)}<small>${templateStats(t).personnel.toLocaleString()} · ${esc(L2.profiles[templateStats(t).profile])}</small></button></li>`).join('')}</ul><button class="action" data-imp-new-template>${L2.newT}</button><p class="hint">${L2.compareHint}</p></section>
 <section class="imp-col-edit"><label for="imp-tname">${L2.name}</label><input id="imp-tname" maxlength="48" value="${esc(d.name)}"><label for="imp-commander">${L2.commander}</label><select id="imp-commander"><option value="">${L2.noCommander}</option>${commanders.map(c=>`<option value="${c.id}" ${d.commander===c.id?'selected':''}>${esc(cname(c.id,lang))}</option>`).join('')}</select>
  <h3>${L2.main}</h3><ul class="imp-slots">${all.filter(c=>c.slot==='main').map(slot).join('')}</ul><h3>${L2.support}</h3><ul class="imp-slots">${all.filter(c=>c.slot==='support').map(slot).join('')}</ul>
  ${errs.length?`<p class="imp-err" role="alert">${L2.errors}: ${esc(errs.join('; '))}</p>`:''}
  <div class="imp-row"><button class="action primary" data-imp-save ${errs.length||!d.id?'disabled':''}>${L2.save}</button><button class="action" data-imp-save-new ${errs.length?'disabled':''}>${L2.saveNew}</button><button class="action" data-imp-dup ${!d.id?'disabled':''}>${L2.dup}</button><button class="action" data-imp-del ${!d.id?'disabled':''}>${L2.del}</button></div></section>
 <section class="imp-col-stats"><h3>${L2.stats}</h3>${st?`<dl class="imp-stats"><dt>${L2.personnel}</dt><dd>${st.personnel.toLocaleString()}</dd><dt>${L2.recruit}</dt><dd>${st.recruitCost} ¤</dd><dt>${L2.equip}</dt><dd>${st.equipment} ¤</dd><dt>${L2.upkeep}</dt><dd>${st.upkeep} ¤</dd><dt>${L2.food}</dt><dd>${st.food}</dd><dt>${L2.speed}</dt><dd>${esc(L2.speeds[st.speed])}</dd><dt>${L2.attack}</dt><dd>${bar(st.attack)} ${st.attack}</dd><dt>${L2.defense}</dt><dd>${bar(st.defense)} ${st.defense}</dd><dt>${L2.morale}</dt><dd>${st.morale}</dd><dt>${L2.training}</dt><dd>${st.training} ${L2.months}</dd><dt>${L2.recon}</dt><dd>${st.recon}</dd><dt>${L2.siege}</dt><dd>${st.siege}</dd><dt>${L2.supply}</dt><dd>+${Math.round(st.supply*100)}%</dd><dt>${L2.reinforce}</dt><dd>${st.reinforcePer1000.treasury} ¤</dd><dt>${L2.profile}</dt><dd>${esc(L2.profiles[st.profile])}</dd></dl>
  <h4>${L2.terrain}</h4><ul class="imp-terrain">${Object.entries(st.terrain).map(([k,v])=>`<li><span>${esc({plain:['Plain','平原'],hills:['Hills','丘陵'],forest:['Forest','森林'],urban:['Urban','城市'],desert:['Desert','沙漠']}[k][lang==='zh'?1:0])}</span>${bar(v)}<b class="${v<1?'neg':v>1?'pos':''}">${v.toFixed(2)}</b></li>`).join('')}</ul>`:'<p class="hint">—</p>'}
  ${spec?`<h4>${L2.commander}</h4><p class="hint">${lang==='zh'?`模拟专长：骑兵 ${spec.cavalry} · 工程 ${spec.engineering} · 谨慎 ${spec.caution}（游戏设定，非史实评价）`:`Simulated specialties: cavalry ${spec.cavalry} · engineering ${spec.engineering} · caution ${spec.caution} (gameplay traits, not historical judgments)`}</p><p class="imp-conc l-${conc.level}">${L2.concentration}: ${esc(L2.levels[conc.level])} · ${conc.share}%</p>`:''}
  <h4>${L2.apply}</h4><div class="imp-row"><label class="sr" for="imp-army">${L2.army}</label><select id="imp-army"><option value="">${L2.army}</option>${armies.map(a=>`<option value="${a.id}" ${d.army===a.id?'selected':''}>${esc(L(lang,a.name))} · ${a.men.toLocaleString()} · ${esc(rname(a.region,lang))}</option>`).join('')}</select><button class="action" data-imp-apply ${!q?.ok?'disabled':''}>${L2.apply.split('（')[0].split(' (')[0]}</button></div>${q?(q.ok?`<p class="hint">${L2.quote}: ${q.manpower.toLocaleString()} ${lang==='zh'?'兵员':'men'}, ${q.treasury} ¤, ${q.food} ${lang==='zh'?'粮':'grain'}, ${q.months} ${L2.months}${q.partial?` · ${L2.partial} ${Math.round(q.fraction*100)}%`:''}</p>`:`<p class="imp-err">${esc(reasonText(q.reason))}</p>`):''}
  <h4>${L2.raise}</h4><div class="imp-row"><label class="sr" for="imp-region">${L2.region}</label><select id="imp-region"><option value="">${L2.region}</option>${regions.map(r=>`<option value="${r.id}" ${d.region===r.id?'selected':''}>${esc(rname(r.id,lang))}</option>`).join('')}</select><button class="action" data-imp-raise ${!d.id||!d.region?'disabled':''}>${L2.raise}</button></div>${rq?`<p class="hint">${L2.quote}: ${rq.treasury} ¤, ${rq.manpower.toLocaleString()} ${lang==='zh'?'兵员':'men'}, ${rq.food} ${lang==='zh'?'粮':'grain'}, ${lang==='zh'?'训练':'training'} ${rq.training} ${L2.months}</p>`:''}
  ${outdated.length?`<p class="hint">${L2.outdated}: ${outdated.map(id=>esc(L(lang,state.armies.find(a=>a.id===id)?.name))).join(', ')}</p>`:''}</section>
 ${cmp.length>1?`<section class="imp-compare"><h3>${L2.compare}</h3><div class="imp-scroll"><table><thead><tr><th></th>${cmp.map(t=>`<th>${esc(t.name)}</th>`).join('')}</tr></thead><tbody>${[['personnel',x=>x.personnel.toLocaleString()],['recruit',x=>x.recruitCost+x.equipment+' ¤'],['upkeep',x=>x.upkeep],['food',x=>x.food],['speed',x=>L2.speeds[x.speed]],['attack',x=>x.attack],['defense',x=>x.defense],['recon',x=>x.recon],['siege',x=>x.siege],['training',x=>x.training]].map(([k,f])=>`<tr><th>${L2[k]}</th>${cmp.map(t=>`<td>${esc(f(templateStats(t)))}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`:''}</div>`;
}

// ---------- battle planner ----------
export function plannerPanel(state,lang,selectedArmy){
 const L2=tx(lang),owner=state.player,plans=plansFor(state,owner).filter(p=>!['completed','cancelled','failed'].includes(p.status)||p.id===ui.plan),plan=ui.plan&&planById(state,ui.plan);
 const own=state.regions.filter(r=>r.owner===owner),armies=state.armies.filter(a=>a.owner===owner&&a.men>0),commanders=Object.values(state.world.characters).filter(c=>c.alive&&c.faction===owner);
 if(!ui.addArmy&&selectedArmy&&armies.some(a=>a.id===selectedArmy))ui.addArmy=selectedArmy;
 const list=`<ul class="imp-plans">${plans.map(p=>`<li class="${p.id===ui.plan?'on':''}"><button data-imp-plan="${p.id}"><b>${esc(p.name)}</b><small class="ps-${p.status}">${esc(L2.pstatus[p.status])} · ${p.roles.length}</small></button></li>`).join('')||`<li><small>${L2.noPlans}</small></li>`}</ul><div class="imp-row"><label class="sr" for="imp-pname">${L2.planName}</label><input id="imp-pname" placeholder="${L2.planName}" maxlength="48"><button class="action" data-imp-new-plan>${L2.newPlan}</button></div>`;
 if(!plan)return `<div class="panel-heading"><span class="eyebrow">CONSILIVM BELLI</span><h2>${L2.planner}</h2></div>${list}`;
 const editable=!['completed','cancelled','failed'].includes(plan.status),report=assessPlan(state,owner,plan.id),counsel=adviserCounsel(state,owner,plan.id);
 const roleTarget=r=>r.role==='offensive'?r.path.map(id=>rname(id,lang)).join(' → '):rname(r.target,lang);
 const targets=ui.addRole==='offensive'?[]:['frontline','defensive','fallback','reserve','supply_guard'].includes(ui.addRole)?own.map(r=>r.id):REGIONS.map(r=>r.id).filter(id=>state.regions.some(r=>r.id===id)&&(ui.addRole!=='siege'||reportedControl(state,owner,id)?.owner!==owner));
 return `<div class="panel-heading"><span class="eyebrow">CONSILIVM BELLI</span><h2>${L2.planner}</h2></div>${list}
 <article class="imp-plan"><h3>${esc(plan.name)} <small class="ps-${plan.status}">${esc(L2.pstatus[plan.status])}</small></h3>
 ${plan.attention?`<p class="imp-err" role="alert">${esc(L2.attention[plan.attention]||plan.attention)}</p>`:''}
 <label for="imp-mode">${L2.mode}</label><select id="imp-mode" ${editable?'':'disabled'}>${MODES.map(m=>`<option value="${m}" ${plan.mode===m?'selected':''}>${esc(L2.modes[m])}</option>`).join('')}</select>
 <label for="imp-cond">${L2.condition}</label><select id="imp-cond" ${plan.status==='draft'?'':'disabled'}>${['immediate','prepared'].map(m=>`<option value="${m}" ${plan.condition?.kind===m?'selected':''}>${esc(L2.conditions[m])}</option>`).join('')}</select>
 <label for="imp-pcmd">${L2.commander}</label><select id="imp-pcmd" ${editable?'':'disabled'}><option value="">${L2.noCommander}</option>${commanders.map(c=>`<option value="${c.id}" ${plan.commanderId===c.id?'selected':''}>${esc(cname(c.id,lang))}</option>`).join('')}</select>
 <label for="imp-fallback">${L2.fallback}</label><select id="imp-fallback" ${editable?'':'disabled'}><option value="">—</option>${own.map(r=>`<option value="${r.id}" ${plan.fallback===r.id?'selected':''}>${esc(rname(r.id,lang))}</option>`).join('')}</select>
 <label class="imp-check"><input type="checkbox" id="imp-supply" ${plan.supplyPriority?'checked':''} ${editable?'':'disabled'}> ${L2.supplyP}</label>
 ${plan.status==='preparing'?`<p class="hint">${L2.progress}: ${plan.preparation.progress}/${plan.preparation.target} · ${plan.preparation.spent.treasury} ¤ · ${plan.preparation.spent.food} ${lang==='zh'?'粮':'grain'}</p>`:''}
 <h4>${L2.roles}</h4><ul class="imp-roles">${plan.roles.map(r=>{const a=state.armies.find(x=>x.id===r.armyId);return `<li><span><b>${esc(L(lang,a?.name)||r.armyId)}</b><small>${esc(L(lang,ROLE_NAMES[r.role]))} · ${esc(roleTarget(r))}${r.state.done?' ✓':''}${r.state.suspended?' ⏸':''}</small></span>${editable?`<button class="link" data-imp-remove-role="${r.armyId}">${L2.remove}</button>`:''}</li>`}).join('')||'<li><small>—</small></li>'}</ul>
 ${editable?`<fieldset class="imp-add"><legend>${L2.addArmy}</legend><label class="sr" for="imp-add-army">${L2.army}</label><select id="imp-add-army">${armies.map(a=>`<option value="${a.id}" ${ui.addArmy===a.id?'selected':''}>${esc(L(lang,a.name))} · ${esc(rname(a.region,lang))}</option>`).join('')}</select>
  <label class="sr" for="imp-add-role">${L2.role}</label><select id="imp-add-role">${ROLES.map(r=>`<option value="${r}" ${ui.addRole===r?'selected':''}>${esc(L(lang,ROLE_NAMES[r]))}</option>`).join('')}</select>
  ${ui.addRole==='offensive'?(ui.drawing?`<p class="hint">${L2.drawing}</p><p class="imp-path">${ui.drawing.path.map(id=>esc(rname(id,lang))).join(' → ')||'—'}</p><div class="imp-row"><button class="action" data-imp-undo ${ui.drawing.path.length?'':'disabled'}>${L2.undo}</button><button class="action primary" data-imp-finish ${ui.drawing.path.length?'':'disabled'}>${L2.done}</button></div>`:`<button class="action" data-imp-draw>${L2.draw}</button>`):`<label class="sr" for="imp-add-target">${L2.target}</label><select id="imp-add-target"><option value="">${L2.target}</option>${targets.map(id=>`<option value="${id}" ${ui.addTarget===id?'selected':''}>${esc(rname(id,lang))}</option>`).join('')}</select><button class="action" data-imp-add-role>${L2.addArmy}</button>`}</fieldset>`:''}
 <div class="imp-row">${['draft','paused','needs_attention'].includes(plan.status)?`<button class="action primary" data-imp-approve>${plan.status==='draft'?L2.approve:L2.resume}</button>`:''}${['active','preparing'].includes(plan.status)?`<button class="action" data-imp-pause>${L2.pause}</button>`:''}${editable?`<button class="action" data-imp-cancel-plan>${L2.cancelP}</button>`:''}</div>
 ${plan.recommendations?.length?`<h4>${L2.recs}</h4><ul class="imp-roles">${plan.recommendations.map((r,i)=>`<li><span><b>${esc(L(lang,state.armies.find(a=>a.id===r.armyId)?.name))}</b><small>${esc(r.kind)} → ${esc(rname(r.target,lang))}</small></span><button class="link" data-imp-rec="${i}">${L2.approveRec}</button></li>`).join('')}</ul>`:''}
 ${report?`<h4>${L2.risk}</h4><dl class="imp-stats"><dt>${L2.friendly}</dt><dd>${report.friendly.toLocaleString()}</dd><dt>${L2.known}</dt><dd>${report.known.length?report.known.map(k=>`${esc(fname(k.owner,lang))} ${esc(rname(k.region,lang))} ${k.band[0].toLocaleString()}–${k.band[1].toLocaleString()} (${k.age}${lang==='zh'?'个月前':' mo ago'})`).join('<br>'):L2.noIntel}</dd><dt>${L2.intel}</dt><dd>${report.intelAge==null?(lang==='zh'?'目标处无部队目击（不代表无守军）':'no troop sighting at the objective (not proof of no defenders)'):report.intelAge+' '+L2.months}</dd><dt>${L2.terrain}</dt><dd>${[...new Set(report.terrain)].join(', ')||'—'}</dd><dt>${L2.supplyC}</dt><dd class="${report.risks.includes('supply')?'neg':''}">${report.supply.ratio} · ${lang==='zh'?'粮':'food'} ${report.supply.food}</dd><dt>${L2.travel}</dt><dd>${report.travel} ${L2.months}</dd><dt>${L2.reinforceD}</dt><dd>${report.reinforceDistance}</dd><dt>${L2.siegeD}</dt><dd>${report.siege.map(x=>{const o=x.observation;return esc(rname(x.region,lang))+' · '+(o?(lang==='zh'?'报告等级':'reported level')+' '+o.band.join('–')+' · '+({frontier:lang==='zh'?'边境观察':'frontier observation',recon:lang==='zh'?'侦察':'reconnaissance',arrival:lang==='zh'?'抵达观察':'arrival',own:lang==='zh'?'己方':'own'}[o.source]||(lang==='zh'?'来源未知':'source unknown'))+' · '+campaignDate(o.month,o.year,lang)+(o.stale?(lang==='zh'?'（过期）':' (outdated)'):''):(lang==='zh'?'未知':'unknown'))}).join(', ')||'—'}</dd><dt>${L2.counter}</dt><dd>${report.counterattack}</dd><dt>${L2.political}</dt><dd>${report.political.map(p=>p.kind==='concentration'?`${L2.concentration}: ${L2.levels[p.level]}`:`${esc(rname(p.region,lang))}: ${esc(fname(p.owner,lang))}`).join('<br>')||'—'}</dd></dl>
 <h4>${L2.advisers}</h4><ul class="imp-counsel">${counsel.map(c=>`<li class="st-${c.stance}"><b>${esc(cname(c.id,lang))}</b> ${esc(L2.stance[c.stance])}: ${esc(L2.reasons[c.reason]||c.reason)}</li>`).join('')||'<li>—</li>'}</ul>`:''}
 ${plan.events.length?`<h4>${L2.events}</h4><ul class="imp-events">${plan.events.slice(0,8).map(e=>`<li><small>${campaignDate(e.month,e.year)}</small> ${esc(e.kind.replace(/_/g,' '))}${e.region?' · '+esc(rname(e.region,lang)):''}</li>`).join('')}</ul>`:''}</article>`;
}
// Military markers drawn over the strategic map; the map stays visible.
export function planOverlay(state,lang){
 const own=plansFor(state,state.player).filter(p=>['draft','preparing','active','paused','needs_attention'].includes(p.status));
 const marks=[];const pt=id=>mapPoint(id);
 for(const p of own)for(const r of p.roles){const a=state.armies.find(x=>x.id===r.armyId);if(!a)continue;const cls=`imp-ov ${p.id===ui.plan?'on':''} ps-${p.status}`;
  if(r.role==='offensive'){let prev=a.region;for(const id of r.path){const [x,y]=pt(prev),[u,v]=pt(id);marks.push(`<path class="${cls} imp-arrow" d="M${x} ${y} L${u} ${v}" marker-end="url(#imp-head)"/>`);prev=id}}
  else{const [x,y]=pt(r.target);const sym={siege:'M-5 6 V-4 H5 V6 M-6 -4 V-7 H6 V-4',frontline:'M-7 0 H7 M-7 -3 H7',defensive:'M0 -6 L5 -4 V0 C5 3 2 5 0 6 C-2 5 -5 3 -5 0 V-4 Z',fallback:'M-4 6 V-6 L5 -3 L-4 0',reserve:'M-4 -5 V5 M-4 -5 H2 C5 -5 5 0 2 0 H-4 M0 0 L4 5',recon:'M-6 0 C-3 -5 3 -5 6 0 C3 5 -3 5 -6 0 M0 -2 A2 2 0 1 0 0.01 -2',supply_guard:'M0 -6 A6 6 0 1 0 0.01 -6 M0 -6 V6 M-6 0 H6'}[r.role]||'';
   if(a.region!==r.target){const [ax,ay]=pt(a.region);marks.push(`<path class="${cls} imp-dash" d="M${ax} ${ay} L${x} ${y}"/>`)}
   marks.push(`<g class="${cls} imp-sym" transform="translate(${x+14} ${y-14})"><circle r="9"/><path d="${sym}"/><title>${esc(L(lang,ROLE_NAMES[r.role]))}</title></g>`)}}
 if(ui.drawing){const a=state.armies.find(x=>x.id===ui.drawing.armyId);if(a){let prev=a.region;for(const id of ui.drawing.path){const [x,y]=pt(prev),[u,v]=pt(id);marks.push(`<path class="imp-ov imp-draft" d="M${x} ${y} L${u} ${v}" marker-end="url(#imp-head)"/>`);prev=id}const last=ui.drawing.path.at(-1)||a.region;for(const [p1,p2] of ROUTES){const next=p1===last?p2:p2===last?p1:null;if(next&&legalStep(state,state.player,last,next).ok){const [x,y]=pt(next);marks.push(`<circle class="imp-reach" cx="${x}" cy="${y}" r="11"/>`)}}}}
 return `<g id="imp-overlay"><defs><marker id="imp-head" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7Z" class="imp-head"/></marker></defs>${marks.join('')}</g>`;
}
export function isDrawing(){return !!ui.drawing}

// ---------- binding ----------
export function bindImperium({state,lang,render,flash,log}){
 const $=s=>document.querySelector(s),all=s=>document.querySelectorAll(s),L2=tx(lang),owner=state.player;
 const reasonMsg=r=>L2.st[r]||(typeof r==='string'?r:'');
 all('[data-imp-open-focus]').forEach(el=>el.onclick=()=>{ui.focusOpen=true;render()});
 all('[data-imp-close-focus]').forEach(el=>el.onclick=()=>{ui.focusOpen=false;render()});
 all('[data-imp-focus]').forEach(el=>{const pick=()=>{ui.selected=el.dataset.impFocus;ui.focusOpen=true;render()};el.onclick=pick;el.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick()}}});
 all('[data-imp-start-focus]').forEach(el=>el.onclick=()=>{const r=startFocus(state,owner,el.dataset.impStartFocus,{log});if(!r.ok)flash(reasonMsg(r.reason));render()});
 all('[data-imp-cancel-focus]').forEach(el=>el.onclick=()=>{cancelFocus(state,owner,{log});render()});
 all('[data-imp-zoom]').forEach(el=>el.onclick=()=>{const k=el.dataset.impZoom;ui.zoom=k==='in'?Math.min(1.6,ui.zoom+.12):k==='out'?Math.max(.35,ui.zoom-.12):.82;if(k==='reset')ui.pan=[24,24];render()});
 const tree=$('#imp-tree');if(tree){let drag=null;tree.onpointerdown=e=>{if(e.target.closest('[data-imp-focus]'))return;drag={x:e.clientX,y:e.clientY,p:[...ui.pan]};tree.setPointerCapture(e.pointerId)};
  tree.onpointermove=e=>{if(!drag)return;const box=tree.getBoundingClientRect(),k=1400/box.width;ui.pan=[drag.p[0]+(e.clientX-drag.x)*k,drag.p[1]+(e.clientY-drag.y)*k];$('#imp-tree-view').setAttribute('transform',`translate(${ui.pan[0]} ${ui.pan[1]+30}) scale(${ui.zoom})`)};
  tree.onpointerup=()=>{drag=null};tree.onwheel=e=>{e.preventDefault();ui.zoom=Math.max(.35,Math.min(1.6,ui.zoom*(e.deltaY<0?1.08:.93)));$('#imp-tree-view').setAttribute('transform',`translate(${ui.pan[0]} ${ui.pan[1]+30}) scale(${ui.zoom})`)}}
 // designer
 const d=ui.draft;
 all('[data-imp-template]').forEach(el=>el.onclick=()=>{const t=formationState(state).templates[el.dataset.impTemplate];ui.draft={id:t.id,name:t.name,main:{...t.main},support:{...t.support},commander:d?.commander||'',army:d?.army||'',region:d?.region||''};render()});
 all('[data-imp-new-template]').forEach(el=>el.onclick=()=>{ui.draft={id:null,name:lang==='zh'?'新编队':'New formation',main:{},support:{},commander:'',army:'',region:''};render()});
 all('[data-imp-slot]').forEach(el=>el.onclick=()=>{const c=COMPONENTS[el.dataset.impSlot],g=c.slot==='main'?ui.draft.main:ui.draft.support;g[c.id]=Math.max(0,(g[c.id]||0)+Number(el.dataset.d));if(!g[c.id])delete g[c.id];render()});
 const nameIn=$('#imp-tname');if(nameIn)nameIn.oninput=()=>{ui.draft.name=nameIn.value};
 const cmd=$('#imp-commander');if(cmd)cmd.onchange=()=>{ui.draft.commander=cmd.value;render()};
 const armySel=$('#imp-army');if(armySel)armySel.onchange=()=>{ui.draft.army=armySel.value;render()};
 const regSel=$('#imp-region');if(regSel)regSel.onchange=()=>{ui.draft.region=regSel.value;render()};
 all('[data-imp-compare]').forEach(el=>el.onchange=()=>{const id=el.dataset.impCompare;ui.compare=el.checked?[...ui.compare.filter(x=>x!==id),id].slice(-3):ui.compare.filter(x=>x!==id);render()});
 const save=(asNew)=>{const r=saveTemplate(state,owner,{id:asNew?null:ui.draft.id,name:ui.draft.name,main:ui.draft.main,support:ui.draft.support});if(!r.ok){flash(r.reason);return}ui.draft.id=r.template.id;flash(lang==='zh'?'模板已保存。':'Template saved.')};
 all('[data-imp-save]').forEach(el=>el.onclick=()=>save(false));all('[data-imp-save-new]').forEach(el=>el.onclick=()=>save(true));
 all('[data-imp-dup]').forEach(el=>el.onclick=()=>{const r=duplicateTemplate(state,owner,ui.draft.id,`${ui.draft.name} II`);if(r.ok){ui.draft={...ui.draft,id:r.template.id,name:r.template.name}}render()});
 all('[data-imp-del]').forEach(el=>el.onclick=()=>{deleteTemplate(state,owner,ui.draft.id);ui.draft=null;ui.compare=ui.compare.filter(x=>formationState(state).templates[x]);render()});
 all('[data-imp-apply]').forEach(el=>el.onclick=()=>{const r=reorganizeArmy(state,owner,ui.draft.army,ui.draft.id,{log});if(!r.ok)flash(r.reason);render()});
 all('[data-imp-raise]').forEach(el=>el.onclick=()=>{const r=recruitFormation(state,owner,ui.draft.region,ui.draft.id,{log});if(!r.ok)flash(lang==='zh'?'资源不足或战区无效。':'Not enough resources or invalid theater.');render()});
 // planner
 all('[data-imp-plan]').forEach(el=>el.onclick=()=>{ui.plan=el.dataset.impPlan;ui.drawing=null;render()});
 all('[data-imp-new-plan]').forEach(el=>el.onclick=()=>{const r=createPlan(state,owner,{name:$('#imp-pname')?.value||'',mode:'assisted'});if(r.ok)ui.plan=r.plan.id;render()});
 const plan=ui.plan&&planById(state,ui.plan);
 if(plan){
  const sel=(id,fn)=>{const el=$(id);if(el)el.onchange=()=>{fn(el);render()}};
  sel('#imp-mode',el=>editPlan(state,owner,plan.id,{mode:el.value}));
  sel('#imp-cond',el=>editPlan(state,owner,plan.id,{condition:{kind:el.value}}));
  sel('#imp-pcmd',el=>editPlan(state,owner,plan.id,{commanderId:el.value||null}));
  sel('#imp-fallback',el=>editPlan(state,owner,plan.id,{fallback:el.value||null}));
  sel('#imp-supply',el=>editPlan(state,owner,plan.id,{supplyPriority:el.checked}));
  sel('#imp-add-army',el=>{ui.addArmy=el.value;ui.drawing=null});
  sel('#imp-add-role',el=>{ui.addRole=el.value;ui.drawing=null;ui.addTarget=''});
  sel('#imp-add-target',el=>{ui.addTarget=el.value});
  all('[data-imp-add-role]').forEach(el=>el.onclick=()=>{const r=assignRole(state,owner,plan.id,{armyId:$('#imp-add-army')?.value,role:ui.addRole,target:$('#imp-add-target')?.value||ui.addTarget});if(!r.ok)flash(r.reason);render()});
  all('[data-imp-draw]').forEach(el=>el.onclick=()=>{ui.drawing={armyId:$('#imp-add-army')?.value,path:[]};render()});
  all('[data-imp-undo]').forEach(el=>el.onclick=()=>{ui.drawing.path.pop();render()});
  all('[data-imp-finish]').forEach(el=>el.onclick=()=>{const r=assignRole(state,owner,plan.id,{armyId:ui.drawing.armyId,role:'offensive',path:ui.drawing.path});if(!r.ok)flash(r.reason);else ui.drawing=null;render()});
  all('[data-imp-remove-role]').forEach(el=>el.onclick=()=>{removeRole(state,owner,plan.id,el.dataset.impRemoveRole);render()});
  all('[data-imp-approve]').forEach(el=>el.onclick=()=>{const r=approvePlan(state,owner,plan.id,{log});if(!r.ok)flash(r.reason);render()});
  all('[data-imp-pause]').forEach(el=>el.onclick=()=>{pausePlan(state,owner,plan.id);render()});
  all('[data-imp-cancel-plan]').forEach(el=>el.onclick=()=>{cancelPlan(state,owner,plan.id);ui.drawing=null;render()});
  all('[data-imp-rec]').forEach(el=>el.onclick=async()=>{const {issueMilitaryOrder}=await import('./engine.js?v=peace-cursus-1');const r=approveRecommendation(state,owner,plan.id,Number(el.dataset.impRec),{issueOrder:issueMilitaryOrder});if(!r.ok)flash(r.reason||'');render()});
 }
 // Route drawing captures map clicks before the normal region selection.
 if(ui.drawing){all('[data-map-group]').forEach(el=>el.addEventListener('click',e=>{e.stopImmediatePropagation();e.preventDefault();const a=state.armies.find(x=>x.id===ui.drawing.armyId);if(!a)return;const last=ui.drawing.path.at(-1)||a.region,ids=el.dataset.mapGroup.split(','),next=ids.find(id=>legalStep(state,owner,last,id).ok);
  if(!next){flash(lang==='zh'?'只能选择相邻且可进入的战区。':'Choose an adjacent theater that can be entered.');return}ui.drawing.path.push(next);render()},{capture:true}))}
}
