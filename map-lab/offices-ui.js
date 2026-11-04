import {OFFICE_TYPES,initializeOffices,officeCandidates,appointOffice,dismissOffice} from '../office-system.js?v=3';
import {CHARACTER_CATALOG} from '../characters.js?v=13';

const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={finance:['Finance officer','财务专员'],supply:['Supply officer','粮秣专员'],administration:['Administration officer','政务专员']};
const effects={finance:['+2 treasury each month','每月国库 +2'],supply:['+2 food each month','每月粮食 +2'],administration:['+1 stability each quarter','每季度稳定度 +1']};

export function renderOffices({panel,state,language,refresh}){
 const zh=language==='zh',idx=zh?1:0,faction=state.player,posts=initializeOffices(state)[faction],box=document.createElement('section');box.className='mission-box';
 box.innerHTML=`<h3>${zh?'行政任命':'ADMINISTRATIVE ASSIGNMENTS'}</h3><p>${zh?'游戏中的职务，并非历史官职。任命或更换消耗5国库，解除免费。需要忠诚至少40、能够履职且未指挥军队的己方人物；一人只能担任一个职务，任职期间不能独立旅行；不再符合条件时会在下次月度经济结算前卸任。':'Simulated assignments, not historical offices. Appointment or replacement costs 5 treasury; dismissal is free. A capable friendly person needs at least 40 loyalty, no army command and no other assignment; officeholders cannot travel independently. An ineligible person leaves the assignment before the next monthly economy.'}</p>`+OFFICE_TYPES.map(office=>{
  const current=posts[office],candidates=officeCandidates(state,faction,office);
  return `<div class="office-row"><strong>${escape(labels[office][idx])} · ${escape(effects[office][idx])}</strong><p>${zh?'当前':'Current'}: ${escape(CHARACTER_CATALOG[current]?.name[idx]||(zh?'空缺':'Vacant'))}</p><label>${zh?'人选':'Candidate'} <select data-office-choice="${office}">${candidates.length?candidates.map(id=>`<option value="${escape(id)}" ${id===current?'selected':''}>${escape(CHARACTER_CATALOG[id].name[idx])}</option>`).join(''):`<option value="">${zh?'没有合适人选':'No eligible person'}</option>`}</select></label><button data-office-appoint="${office}" ${candidates.length?'':'disabled'}>${zh?'任命或更换':'APPOINT OR REPLACE'}</button><button data-office-dismiss="${office}" ${current?'':'disabled'}>${zh?'解除':'DISMISS'}</button></div>`;
 }).join('')+`<div id="office-feedback" role="status"></div>`;
 panel.append(box);
 box.querySelectorAll('[data-office-appoint]').forEach(button=>button.onclick=()=>{
  const office=button.dataset.officeAppoint,id=box.querySelector(`[data-office-choice="${office}"]`).value,out=box.querySelector('#office-feedback');
  out.textContent=(zh?'确认任命，费用5国库：':'Confirm appointment, cost 5 treasury: ')+(CHARACTER_CATALOG[id]?.name[idx]||'')+' ';const confirm=document.createElement('button');confirm.textContent=zh?'确认':'CONFIRM';out.append(confirm);
  confirm.onclick=()=>{const result=appointOffice(state,office,id);if(result.ok)refresh();else out.textContent=zh?'无法任命：检查人选、当前职务和国库。':'Unavailable: check eligibility, existing assignment and treasury.'};
 });
 box.querySelectorAll('[data-office-dismiss]').forEach(button=>button.onclick=()=>{
  const office=button.dataset.officeDismiss,out=box.querySelector('#office-feedback');out.textContent=zh?'确认解除该任命？':'Confirm dismissal? ';const confirm=document.createElement('button');confirm.textContent=zh?'确认':'CONFIRM';out.append(confirm);confirm.onclick=()=>{if(dismissOffice(state,office).ok)refresh();else out.textContent=zh?'该职务已空缺。':'The assignment is already vacant.'};
 });
}
