import {canMediate,requestMediation} from '../civil-war.js?v=7-xxiif';

export function renderMediation({panel,state,target,language,refresh}){
 if(!['egypt','parthia'].includes(target))return;
 const zh=language==='zh',actor=state.player,records=(state.mediations||[]).filter(m=>m.actor===actor&&m.parent===target);
 const section=document.createElement('section');section.className='help-list';
 section.innerHTML=`<h3>${zh?'王朝调停':'DYNASTIC MEDIATION'}</h3><p>${zh?'根据已知冲突线索向双方寄信调停，费用12国库，预计六个月。双方都可能拒绝，去信或回信都可能遗失；费用不退。双方可能在回信抵达前和解，回信也可能过时。线索本身可能有误。':'Send a proposal to both sides based on a reported conflict. It costs 12 treasury and takes about six months. Either side may refuse; outgoing letters or replies can be lost, and the cost is not refunded. A settlement can occur before the reply arrives, and a reply may be outdated. The underlying report can also be wrong.'}</p><button id="mediation-start">${zh?'提出书信调停':'PROPOSE MEDIATION BY LETTER'}</button><div id="mediation-feedback" role="status"></div><div id="mediation-records"></div>`;
 panel.append(section);
 const start=section.querySelector('#mediation-start'),feedback=section.querySelector('#mediation-feedback');
 const available=canMediate(state,actor,target),pending=records.some(x=>x.status==='pending');
 start.disabled=!available||pending||state.factions[actor].treasury<12;
 start.title=!available?(zh?'先调查有关战事或竞争者的线索。':'First investigate reports of fighting or a rival claimant.'):pending?(zh?'已有待回复调停书信。':'A mediation proposal is already pending.'):(zh?'需要12国库。':'Requires 12 treasury.');
 start.onclick=()=>{feedback.textContent=zh?'确认花费12国库寄信？回信约需六个月，可能被拒绝或丢失。':'Spend 12 treasury? A reply takes about six months and may be refused or lost.';const confirm=document.createElement('button');confirm.textContent=zh?'确认寄出':'CONFIRM SEND';feedback.append(document.createElement('br'),confirm);confirm.onclick=()=>{const result=requestMediation(state,actor,target);if(result.ok)refresh();else feedback.textContent=zh?'无法寄出，请检查线索、国库和待回复书信。':'Cannot send; check reports, treasury and pending correspondence.'}};
 const list=section.querySelector('#mediation-records');
 for(const m of records){const item=document.createElement('article'),date=`${m.sentMonth}/${Math.abs(m.sentYear)} BCE`;let result=m.status==='pending'?(zh?`等待回信 · 约余${m.remaining}个月`:`Awaiting reply · about ${m.remaining} month(s)`):m.status==='accepted'?(zh?'回信称双方达成和解；情况可能已改变。':'Reply reports a settlement; circumstances may have changed.'):m.status==='refused'?(zh?'对方回信拒绝了调停。':'A reply declined mediation.'):(zh?'未收到回信；信件可能遗失或无人回复。':'No reply; correspondence may be lost or unanswered.');item.textContent=`${zh?'寄出':'Sent'} ${date} · ${result}`;if(m.status!=='pending'&&m.status!=='no_reply'&&m.responseYear!=null)item.textContent+=` · ${zh?'作答':'Composed'} ${m.responseMonth}/${Math.abs(m.responseYear)} BCE`;list.append(item)}
}
