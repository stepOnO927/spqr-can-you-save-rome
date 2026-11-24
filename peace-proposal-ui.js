import {sendInquiry,inquiryCost,inquiryDuration,supportsCourtInquiry} from './engine.js?v=dossier-archive-1';
import {peaceOfferRegions,peaceTermsText} from './peace-terms.js?v=territorial-peace-1';
import {FACTIONS} from './data.js?v=phase-x-1';
import {campaignDate} from './campaign-date.js?v=calendar-1';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderPeaceProposal({panel,state,language,target=null,refresh}){
 const actor=state.player,zh=language==='zh',enemies=[...new Set(state.wars.filter(w=>w.includes(actor)).flatMap(w=>w.filter(id=>id!==actor&&supportsCourtInquiry(id)&&(!target||id===target))))];
 if(!enemies.length)return;
 const name=id=>FACTIONS[id]?.short?.[zh?1:0]||id,box=document.createElement('section');box.className='rule-block';box.dataset.peaceProposal='';
 const records=(state.inquiries||[]).filter(x=>x.actor===actor&&x.subject==='peace'&&(!target||x.target===target)).slice(0,4);
 box.innerHTML=`<h3>${zh?'议和与控制权让步':'PEACE AND TERRITORIAL TERMS'}</h3><p>${zh?'可提出移交一个相邻战区的控制权换取和平。主城和最后一个战区不能让出。提议不保证获接受；书信可能遗失或遭拒，接受书送达且条款仍有效时才会停战并移交。':'Offer control of one frontier theater in return for peace. The command core and last theater cannot be offered. Acceptance is not guaranteed; letters can be lost or refused. Peace and transfer take effect only when a valid acceptance is delivered.'}</p><label>${zh?'交战对象':'Opponent'} <select data-peace-target>${enemies.map(id=>`<option value="${esc(id)}">${esc(name(id))}</option>`).join('')}</select></label> <label>${zh?'提议移交':'Offer control of'} <select data-peace-region></select></label><p data-peace-quote></p><button data-peace-send></button><p data-peace-feedback role="status"></p>${records.map(x=>`<p>${esc(name(x.target))} · ${campaignDate(x.sentMonth,x.sentYear,language)} · ${esc(x.status==='pending'||x.status==='awaiting_decision'?(zh?'等待回信':'Awaiting reply'):x.status==='refused'?(zh?'议和遭拒':'Declined'):x.status==='no_reply'?(zh?'未收到回信':'No reply received'):x.peaceSettlement==='concluded'?(zh?'和平协议已生效':'Settlement concluded'):(zh?'收到答复，协议未生效':'Reply received; settlement not concluded'))}<br>${esc(peaceTermsText(x,language))}</p>`).join('')}`;
 panel.append(box);
 const opponent=box.querySelector('[data-peace-target]'),region=box.querySelector('[data-peace-region]'),button=box.querySelector('[data-peace-send]'),feedback=box.querySelector('[data-peace-feedback]'),fee=inquiryCost(state,actor);
 const quote=()=>{
  delete button.dataset.confirmed;button.textContent=zh?`寄出议和提议 · ${fee}国库`:`Send peace offer · ${fee} treasury`;feedback.textContent='';
  const pending=(state.inquiries||[]).some(x=>x.actor===actor&&x.target===opponent.value&&['pending','awaiting_decision'].includes(x.status));
  button.disabled=pending||state.factions[actor].treasury<fee;
  button.title=pending?(zh?'已有寄往该方的待回复信件。':'A letter to this court is already pending.'):state.factions[actor].treasury<fee?(zh?'国库不足。':'Insufficient treasury.'):'';
  box.querySelector('[data-peace-quote]').textContent=(zh?`往返预计${inquiryDuration(opponent.value)}个月。`:`Estimated round trip: ${inquiryDuration(opponent.value)} months. `)+(region.value?(zh?'移交后将失去该战区的税粮和兵源；驻军不会自动转移或改换阵营。':'Transfer removes that theater’s taxes, food and recruits; armies do not teleport or change factions.'):(zh?'维持现有控制，不涉及领土移交。':'Current control is retained without a territorial transfer.'));
 };
 const options=()=>{region.innerHTML=`<option value="">${zh?'维持现有控制':'Retain current control'}</option>`+peaceOfferRegions(state,actor,opponent.value).map(r=>`<option value="${esc(r.id)}">${esc(r.name[zh?1:0])}</option>`).join('');quote()};
 opponent.onchange=options;region.onchange=quote;options();
 button.onclick=()=>{
  if(!button.dataset.confirmed){button.dataset.confirmed='true';button.textContent=zh?`确认向${name(opponent.value)}寄出条款 · ${fee}国库`:`Confirm terms to ${name(opponent.value)} · ${fee} treasury`;feedback.textContent=region.value?(zh?'你将提出让出所选战区；收到有效接受前仍由本方控制。':'You are offering the selected theater; it remains yours until a valid acceptance arrives.'):(zh?'这是一封议和提议，寄出后战争不会立即结束。':'This is a peace offer; sending it does not immediately end the war.');return}
  const result=sendInquiry(state,actor,opponent.value,'peace',{offerRegion:region.value||null});
  if(result.ok)refresh();else{quote();feedback.textContent=zh?'无法寄出：请检查战区控制、已知边界、资金和待回复信件。':'Cannot send: check control, reported frontier, treasury and pending letters.'}
 };
}

