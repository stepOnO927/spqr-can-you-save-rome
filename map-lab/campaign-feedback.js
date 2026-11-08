import {unrecoveredOwnLosses} from './turn-report.js?v=defeat-1';

const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderCampaignFeedback({state,language,onRegion,onChronicle,onLegacy}){
 const zh=language==='zh',losses=unrecoveredOwnLosses(state),notice=state.world?.romanDefeatNotice;
 let alert=document.querySelector('#front-alert');
 if(!alert){alert=document.createElement('section');alert.id='front-alert';alert.setAttribute('role','status');document.body.append(alert)}
 alert.hidden=!losses.length&&!notice;
 alert.innerHTML=`${notice?`<strong>${zh?'紧急：己方没有野战军':'URGENT: NO FIELD ARMY'}</strong><p>${zh?`剩余 ${notice.remaining} 个月征召新军；否则战役将失败。`:`Raise a force within ${notice.remaining} month(s) or the campaign will be lost.`}</p>`:''}${losses.length?`<strong>${zh?'失地警报':'TERRITORY LOST'} · ${losses.length}</strong><p>${zh?'以下是已确认失去且尚未收复的战区；敌方之后的动向仍需情报核实。':'These theaters were confirmed lost and have not been recaptured. Later enemy movements still require intelligence.'}</p>${losses.slice(0,4).map(loss=>`<button data-front-region="${escape(loss.region)}">${escape(loss.name?.[zh?1:0]||loss.region)} · ${loss.month}/${Math.abs(loss.year)} BCE</button>`).join('')}${losses.length>4?`<small>${zh?`另有 ${losses.length-4} 处；查看战报。`:`${losses.length-4} more; see Chronicle.`}</small>`:''}`:''}`;
 alert.querySelectorAll('[data-front-region]').forEach(button=>button.onclick=()=>onRegion(button.dataset.frontRegion));
 let outcome=document.querySelector('#campaign-outcome');
 if(!outcome){outcome=document.createElement('div');outcome.id='campaign-outcome';outcome.setAttribute('role','dialog');outcome.setAttribute('aria-modal','true');document.body.append(outcome)}
 outcome.hidden=!state.defeat;
 if(!state.defeat)return;
 const casualties=(state.chronicle?.entries||[]).filter(e=>e.kind==='battle').reduce((sum,e)=>sum+(e.ownCasualties||0),0);
 outcome.innerHTML=`<section><small>SPQR · ${state.month}/${Math.abs(state.year)} BCE</small><h2>${zh?'战役失败':'CAMPAIGN DEFEAT'}</h2><p>${zh?'罗马指挥方连续三个月没有野战军，战役结束。':'The Roman command had no field army for three months. The campaign has ended.'}</p><p>${zh?'已确认失地':'Confirmed lost theaters'}: ${losses.length} · ${zh?'已知己方战斗伤亡':'Known friendly battle casualties'}: ${casualties.toLocaleString()}</p><div><button id="outcome-chronicle">${zh?'查看战报':'REVIEW CHRONICLE'}</button><button id="outcome-legacy">${zh?'查看罗马遗产并封存':'OPEN ROMAN LEGACY'}</button></div></section>`;
 outcome.querySelector('#outcome-chronicle').onclick=()=>{outcome.hidden=true;onChronicle()};
 outcome.querySelector('#outcome-legacy').onclick=onLegacy;
}
