import {CHARACTER_CATALOG} from './characters.js?v=intelligence-archive-1';
import {FACTIONS} from './data.js?v=intelligence-archive-1';
import {campaignDate} from './campaign-date.js?v=intelligence-archive-1';
import {reportedHealthSubjects,reportedPersonName} from './character-system.js?v=intelligence-archive-1';
import {previewPersonTravel,startPersonTravel,setJourneyHalt,requestPersonalMeeting,audiencePublicRecord} from './personal-diplomacy.js?v=intelligence-archive-1';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=(pair,zh)=>Array.isArray(pair)?pair[zh?1:0]:'';

// Foreign fictional names are taken only from delivered report snapshots.
export function genealogyMeetingContacts(s,zh=false){
 const result=[];
 for(const faction of Object.keys(s.knowledge?.[s.player]||{})){
  if(faction===s.player||faction==='rebels'||!FACTIONS[faction])continue;
  const ids=reportedHealthSubjects(s,s.player,faction);let unknown=0;
  for(const id of ids){const person=CHARACTER_CATALOG[id];if(!person)continue;
   const reported=person.fictional?reportedPersonName(s,s.player,faction,id):null;
   const personName=person.fictional?(reported?`${label(reported.name,zh)} (${Number.isFinite(reported.year)&&Number.isInteger(reported.month)?`${zh?'报告于':'reported'} ${campaignDate(reported.month,reported.year,zh?'zh':'en')}`:(zh?'报告日期未知':'report date unknown')})`:(zh?`未核实人物 ${++unknown}`:`Unverified person ${++unknown}`)):label(person.name,zh);
   result.push({id,faction,label:`${personName} · ${label(FACTIONS[faction].short,zh)}`});
  }
 }
 return result;
}

// Integrates the existing travel and meeting simulation into the campaign
// family tree.  The engine remains the sole validator and charges resources
// only when the player confirms an order.
export function bindGenealogyPersonalActions(panel,s,id,zh=false,onChange=()=>{}){
 const person=s.world?.characters?.[id];if(!person||person.faction!==s.player||!person.alive||person.missing)return;
 const area=document.createElement('section');area.className='rule-block gene-personal-actions';
 const journey=person.travel,contacts=genealogyMeetingContacts(s,zh),statuses={pending:['Awaiting reply','等待答复'],no_contact:['Could not meet','未能见面'],no_reply:['No reply','没有答复'],declined:['Declined','被拒绝'],met:['Met personally','已亲自会面']};
 const ownMeetings=(s.meetings||[]).filter(m=>m.actor===s.player&&m.person===id).slice(0,10);
 const meetingText=m=>{const view=audiencePublicRecord(s,m),observed=label(view.observedName,zh),requested=label(view.requestName,zh);return {view,name:observed||requested,previous:observed&&requested&&observed!==requested?requested:null}};
 const next=journey?.legs?.[0]?.to,regionName=region=>label(s.regions.find(r=>r.id===region)?.name,zh)||(zh?'未知':'Unknown');
 const travel=journey?`<p>${zh?'正在旅行；当前路段剩余':'Travelling; current leg remaining'} ${escape(journey.remaining)} ${zh?'个月':'months'} · ${zh?'下一战区':'Next theater'}: ${escape(regionName(next))} · ${zh?'目的地':'Destination'}: ${escape(regionName(journey.destination))}</p><p>${journey.haltAfterLeg?(zh?'已下令抵达下一战区后停下。':'Ordered to stop after the current leg.'):(zh?'行程按原计划继续。':'Journey continues as planned.')}</p>${journey.legs?.length>1?`<button type="button" data-gene-halt>${journey.haltAfterLeg?(zh?'撤回停下命令':'Withdraw stop order'):(zh?'在下一战区停下':'Stop at next theater')}</button><p class="hint">${zh?'完成当前路段后停下，已付旅费不退还。':'Stops after the current leg; travel costs are not refunded.'}</p>`:''}`:`<p class="hint">${zh?'人物位置按战区模拟。任职者、随军统帅和重病人物不能单独出行；路线依据控制报告和公开边境政策，抵达时复核。':'Locations are simulated by theater. Officeholders, army commanders and seriously ill people cannot travel independently. Routes use dated control reports and declared border policies, then recheck on arrival.'}</p><label>${zh?'旅行身份':'Travel purpose'} <select data-gene-purpose><option value="civilian">${zh?'民用旅行':'Civilian travel'}</option><option value="diplomatic">${zh?'外交使团':'Diplomatic delegation'}</option></select></label><label>${zh?'旅行目的地':'Travel destination'} <select data-gene-destination>${s.regions.map(r=>`<option value="${escape(r.id)}">${escape(label(r.name,zh))}</option>`).join('')}</select></label><button type="button" data-gene-preview>${zh?'查看行程':'Preview journey'}</button>`;
 const choices=contacts.map((c,i)=>`<option value="${i}">${escape(c.label)}</option>`).join('');
 area.innerHTML=`<h4>${zh?'人物旅行与个人会面':'PERSONAL TRAVEL & AUDIENCES'}</h4>${travel}<p data-gene-travel-feedback role="status"></p><p class="hint">${zh?'个人会面请求花费3国库，约两个月；书信可能遗失，对方可能拒绝或不在。只有双方实际位于同一战区且未随军行进时才可能见面。报告身份可能过时。':'A personal audience request costs 3 treasury and takes about two months. Letters may be lost; the recipient can decline or be absent. Both people must actually be in the same theater and not marching to meet. Reported identities may be outdated.'}</p><label>${zh?'报告中的会面对象':'Reported recipient'} <select data-gene-meeting-target ${contacts.length?'':'disabled'}>${choices||`<option value="">${zh?'尚无已报告对象':'No reported recipient'}</option>`}</select></label><button type="button" data-gene-meeting ${contacts.length?'':'disabled'}>${zh?'请求个人会面':'Request personal audience'}</button><p data-gene-meeting-feedback role="status"></p><div data-gene-meeting-history>${ownMeetings.map(m=>{const {view,name,previous}=meetingText(m);return `<p>${escape(name)}${previous?` (${zh?'请求时称呼：':'Addressed as: '}${escape(previous)})`:''} · ${escape(label(FACTIONS[m.targetFaction]?.short,zh)||(zh?'未知宫廷':'Unknown court'))}: ${escape(label(statuses[view.status],zh)||(zh?'未知':'Unknown'))}${view.remaining!=null?` · ${escape(view.remaining)} ${zh?'个月':'months'}`:''}</p>`}).join('')}</div>`;
 panel.append(area);
 const refresh=()=>{
  const previous=panel.closest('.inspector')?.scrollTop;onChange();
  const button=[...document.querySelectorAll('[data-gene-person]')].find(el=>el.dataset.genePerson===id);button?.click();
  const scroller=button?.closest('.inspector'),actions=scroller?.querySelector('.gene-personal-actions');
  if(scroller&&Number.isFinite(previous)){scroller.scrollTop=previous;if(actions){const area=actions.getBoundingClientRect(),view=scroller.getBoundingClientRect();if(area.bottom<=view.top||area.top>=view.bottom)actions.scrollIntoView({block:'nearest'})}}
 };
 area.querySelector('[data-gene-halt]')?.addEventListener('click',()=>{const out=area.querySelector('[data-gene-travel-feedback]'),result=setJourneyHalt(s,id,!journey.haltAfterLeg);if(result.ok)refresh();else out.textContent=zh?'停下命令不可用。':'Stop order unavailable.'});
 area.querySelector('[data-gene-preview]')?.addEventListener('click',()=>{const dest=area.querySelector('[data-gene-destination]').value,purpose=area.querySelector('[data-gene-purpose]').value,out=area.querySelector('[data-gene-travel-feedback]'),plan=previewPersonTravel(s,id,dest,{purpose});out.replaceChildren();if(!plan.ok){out.textContent=zh?'无法出行：检查位置、健康、军职、国库、路线和边境许可。':'Unavailable: check location, health, office, treasury, route and border access.';return}
  const route=plan.legs.map(leg=>regionName(leg.to)).join(zh?' → ':' → ');out.append(document.createTextNode((zh?'预计':'Estimated')+` ${plan.months} `+(zh?'个月；费用':'months; cost')+` ${plan.cost} · ${route}. `));const button=document.createElement('button');button.type='button';button.textContent=zh?'确认出发':'Confirm departure';out.append(button);button.onclick=()=>{const result=startPersonTravel(s,id,dest,{purpose});if(result.ok)refresh();else out.textContent=zh?'出行条件已变化，请重新查看行程。':'Travel conditions changed; preview the journey again.'};
 });
 area.querySelector('[data-gene-meeting]')?.addEventListener('click',()=>{const selected=contacts[Number(area.querySelector('[data-gene-meeting-target]').value)],out=area.querySelector('[data-gene-meeting-feedback]');out.replaceChildren();if(!selected){out.textContent=zh?'没有可用的已报告对象。':'No reported recipient is available.';return}
  out.append(document.createTextNode((zh?'确认向 ':'Confirm request to ')+selected.label+(zh?' 寄信：3国库，约两个月；可能无答复。 ':' : 3 treasury, about two months; there may be no reply. ')));const button=document.createElement('button');button.type='button';button.textContent=zh?'确认寄信':'Confirm request';out.append(button);button.onclick=()=>{const result=requestPersonalMeeting(s,id,selected.id,selected.faction);if(result.ok)refresh();else out.textContent=zh?'请求不可用：检查健康、位置、旅行、军队行进、国库和已有请求。':'Unavailable: check health, location, travel, army movement, treasury and pending requests.'};
 });
}
