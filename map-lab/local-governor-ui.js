import {CHARACTER_CATALOG} from '../characters.js?v=18';
import {localGovernor,governorCandidates,appointGovernor,dismissGovernor} from '../office-system.js?v=9';

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// These are theater-level game assignments, not historical city governors.
export function renderLocalGovernor({panel,state,theater,language,refresh}){
 const zh=language==='zh',idx=zh?1:0,r=state.regions.find(x=>x.id===theater),box=document.createElement('section');
 if(!r)return;box.className='mission-box';box.id='local-governor';
 if(r.owner!==state.player){box.innerHTML=`<strong>${zh?'地方政务':'LOCAL ADMINISTRATION'}</strong><p>${zh?'地方负责人未知；不能从政治控制者推断其身份或位置。':'Local authority unknown; political control does not establish a governor’s identity or location.'}</p>`;panel.append(box);return}
 const current=localGovernor(state,theater),candidates=governorCandidates(state,theater);
 box.innerHTML=`<strong>${zh?'战区行政官（游戏任命）':'THEATER ADMINISTRATOR (GAME ASSIGNMENT)'}</strong><p>${zh?'当前':'Current'}: ${escape(CHARACTER_CATALOG[current]?.name[idx]||(zh?'未具名／空缺':'Unnamed / vacant'))}</p><p>${zh?'任命或更换消耗5国库；合格官员每季度使本战区忠诚 +1。人选须位于此战区、忠诚至少40，且未担任其他职务或指挥军队。重病、失联、叛变或失去战区控制时任命结束。这是游戏中的战区职位，不代表历史城市总督或本人就在城市中。':'Appointment or replacement costs 5 treasury; an eligible administrator adds 1 theater loyalty each quarter. The person must be in this theater, have loyalty of at least 40, and hold no other office or army command. The assignment ends on incapacity, disappearance, defection or loss of control. It is a game theater role, not a historical city governorship or proof of presence in the city.'}</p><label>${zh?'人选':'Candidate'} <select id="governor-choice">${candidates.length?candidates.map(id=>`<option value="${escape(id)}" ${id===current?'selected':''}>${escape(CHARACTER_CATALOG[id].name[idx])}</option>`).join(''):`<option value="">${zh?'没有合适人选':'No eligible person'}</option>`}</select></label><button id="governor-appoint" ${candidates.length?'':'disabled'}>${zh?'任命或更换':'APPOINT OR REPLACE'}</button><button id="governor-dismiss" ${current?'':'disabled'}>${zh?'解除':'DISMISS'}</button><div id="governor-feedback" role="status"></div>`;
 panel.append(box);
 box.querySelector('#governor-appoint').onclick=()=>{const id=box.querySelector('#governor-choice').value,out=box.querySelector('#governor-feedback');out.textContent=(zh?'确认任命，费用5国库：':'Confirm appointment, cost 5 treasury: ')+(CHARACTER_CATALOG[id]?.name[idx]||'')+' ';const b=document.createElement('button');b.textContent=zh?'确认':'CONFIRM';out.append(b);b.onclick=()=>{const result=appointGovernor(state,theater,id);if(result.ok)refresh();else out.textContent=zh?'无法任命：检查人选、当前职务和国库。':'Unavailable: check eligibility, current assignment and treasury.'}};
 box.querySelector('#governor-dismiss').onclick=()=>{const out=box.querySelector('#governor-feedback');out.textContent=zh?'确认解除该任命？':'Confirm dismissal? ';const b=document.createElement('button');b.textContent=zh?'确认':'CONFIRM';out.append(b);b.onclick=()=>{if(dismissGovernor(state,theater).ok)refresh();else out.textContent=zh?'该职务已空缺。':'The assignment is already vacant.'}};
}
