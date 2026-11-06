import {reportedControl} from '../control-intelligence.js?v=4-xxii';
import {FACTIONS} from '../data.js?v=11-xxii';
import {CHARACTER_CATALOG} from '../characters.js?v=20-xxii';
import {localGovernor,governorCandidates,appointGovernor,dismissGovernor} from '../office-system.js?v=12-xxii';

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Only the observer's retained reports are used for foreign administration.
export function reportedTheaterAdministrators(state,theater){
 const control=reportedControl(state,state.player,theater),owner=control?.owner;
 if(!owner||owner===state.player||owner==='shared'||owner==='rebels')return [];
 return (state.knowledge?.[state.player]?.[owner]?.reports||[]).filter(r=>r.kind==='office_theater:'+theater).map((r,index)=>({report:r,index,date:(r.observationYear??r.year)*12+(r.observationMonth??r.month)})).filter(x=>Number.isFinite(x.date)).sort((a,b)=>b.date-a.date||a.index-b.index).slice(0,4).map(({report:r})=>({person:CHARACTER_CATALOG[r.value]?r.value:null,year:r.observationYear??r.year,month:r.observationMonth??r.month,receivedYear:r.year,receivedMonth:r.month,source:r.source,originSource:r.originSource||null,fromFaction:r.fromFaction||null,confidence:r.confidence||'unverified',outdated:(state.year-(r.observationYear??r.year))*12+state.month-(r.observationMonth??r.month)>24}));
}

// These are theater-level game assignments, not historical city governors.
export function renderLocalGovernor({panel,state,theater,language,refresh,onShowCharacter=()=>{}}){
 const zh=language==='zh',idx=zh?1:0,r=state.regions.find(x=>x.id===theater),box=document.createElement('section');
 if(!r)return;box.className='mission-box';box.id='local-governor';
 if(r.owner!==state.player){
  const reports=reportedTheaterAdministrators(state,theater),sources={spy:['Spy','间谍'],envoy:['Envoy','使者'],travelers:['Travelers','商旅'],exchange:['Allied exchange','盟友交换'],official:['Official letter','官方书信']},confidence={confirmed:['Corroborated','多方证实'],credible:['Highly credible','高可信度'],disputed:['Disputed','存在争议'],rumor:['Rumor','传闻'],unverified:['Unverified','未经核实']};
  box.innerHTML=`<strong>${zh?'地方政务报告':'LOCAL ADMINISTRATION REPORTS'}</strong><p>${zh?'报告仅涉及当时的战区任命，不证明现职或人物位于此城；没有可靠消息不代表职位空缺。':'Reports concern a past theater assignment, not current office or presence in this city; no reliable information does not establish a vacancy.'}</p>`+(reports.length?reports.map(x=>`<p>${x.person?`<button data-reported-governor="${escape(x.person)}">${escape(CHARACTER_CATALOG[x.person].name[idx])}</button>`:(zh?'没有可靠消息':'No reliable information')} · ${x.month}/${Math.abs(x.year)} BCE · ${escape(sources[x.source]?.[idx]||x.source|| (zh?'来源未知':'Unknown source'))}${x.fromFaction?' · '+escape(FACTIONS[x.fromFaction]?.short?.[idx]||x.fromFaction)+' · '+(zh?'原始来源：':'original source: ')+escape(sources[x.originSource]?.[idx]||x.originSource||(zh?'未知':'unknown'))+' · '+(zh?'收到':'received')+' '+x.receivedMonth+'/'+Math.abs(x.receivedYear)+' BCE':''} · ${x.outdated?(zh?'情报过期':'Outdated'):escape(confidence[x.confidence]?.[idx]||(zh?'未经核实':'Unverified'))}</p>`).join(''):`<p>${zh?'地方负责人未知；不能从政治控制者推断其身份或位置。':'Local authority unknown; political control does not establish a governor’s identity or location.'}</p>`);
  panel.append(box);box.querySelectorAll('[data-reported-governor]').forEach(button=>button.onclick=()=>onShowCharacter(button.dataset.reportedGovernor));return;
 }
 const current=localGovernor(state,theater),candidates=governorCandidates(state,theater);
 box.innerHTML=`<strong>${zh?'战区行政官（游戏任命）':'THEATER ADMINISTRATOR (GAME ASSIGNMENT)'}</strong><p>${zh?'当前':'Current'}: ${escape(CHARACTER_CATALOG[current]?.name[idx]||(zh?'未具名／空缺':'Unnamed / vacant'))}</p><p>${zh?'任命或更换消耗5国库；合格官员每季度使本战区忠诚 +1。人选须位于此战区、忠诚至少40，且未担任其他职务或指挥军队。重病、失联、叛变或失去战区控制时任命结束。这是游戏中的战区职位，不代表历史城市总督或本人就在城市中。':'Appointment or replacement costs 5 treasury; an eligible administrator adds 1 theater loyalty each quarter. The person must be in this theater, have loyalty of at least 40, and hold no other office or army command. The assignment ends on incapacity, disappearance, defection or loss of control. It is a game theater role, not a historical city governorship or proof of presence in the city.'}</p><label>${zh?'人选':'Candidate'} <select id="governor-choice">${candidates.length?candidates.map(id=>`<option value="${escape(id)}" ${id===current?'selected':''}>${escape(CHARACTER_CATALOG[id].name[idx])}</option>`).join(''):`<option value="">${zh?'没有合适人选':'No eligible person'}</option>`}</select></label><button id="governor-appoint" ${candidates.length?'':'disabled'}>${zh?'任命或更换':'APPOINT OR REPLACE'}</button><button id="governor-dismiss" ${current?'':'disabled'}>${zh?'解除':'DISMISS'}</button><div id="governor-feedback" role="status"></div>`;
 panel.append(box);
 box.querySelector('#governor-appoint').onclick=()=>{const id=box.querySelector('#governor-choice').value,out=box.querySelector('#governor-feedback');out.textContent=(zh?'确认任命，费用5国库：':'Confirm appointment, cost 5 treasury: ')+(CHARACTER_CATALOG[id]?.name[idx]||'')+' ';const b=document.createElement('button');b.textContent=zh?'确认':'CONFIRM';out.append(b);b.onclick=()=>{const result=appointGovernor(state,theater,id);if(result.ok)refresh();else out.textContent=zh?'无法任命：检查人选、当前职务和国库。':'Unavailable: check eligibility, current assignment and treasury.'}};
 box.querySelector('#governor-dismiss').onclick=()=>{const out=box.querySelector('#governor-feedback');out.textContent=zh?'确认解除该任命？':'Confirm dismissal? ';const b=document.createElement('button');b.textContent=zh?'确认':'CONFIRM';out.append(b);b.onclick=()=>{if(dismissGovernor(state,theater).ok)refresh();else out.textContent=zh?'该职务已空缺。':'The assignment is already vacant.'}};
}
