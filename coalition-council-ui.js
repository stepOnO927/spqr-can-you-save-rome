import {eligibleCoalitionAdmissionTargets} from './coalition-admissions.js?v=world-kings-neighbor-trade-1';

const kinds={leadership:['Leadership vote','盟主改选'],expulsion:['Expulsion','成员除名'],admission:['Member nomination','提议增员'],contribution:['Contribution change','责任调整'],dissolution:['Dissolution','解散联盟']};
const policies={military:['Military','军事'],funding:['Funding','资金'],supplies:['Supplies','粮食'],diplomacy:['Diplomacy','外交']};
const label=(table,key,zh)=>table[key]?.[zh?1:0]||key||'—';

export function coalitionCouncilHtml(s,lang,factionName,esc,campaignDate,onlyId=null){
 const zh=lang==='zh',owned=(s.coalitions||[]).filter(c=>c.status==='active'&&c.parties.includes(s.player)&&(!onlyId||c.id===onlyId));
 if(!owned.length)return '';
 const date=index=>campaignDate(((index-1)%12+12)%12+1,Math.floor((index-1)/12),lang);
 const option=id=>`<option value="${esc(id)}">${esc(factionName(id))}</option>`;
 return `<div class="rule-block"><h3>${zh?'联盟议事':'Coalition council'}</h3><p>${zh?'普通议案由全体成员过半赞成通过；解散须三分之二赞成。通知下月送达，未投票按弃权。成员保持独立主权。成员可单独议和；若盟友仍在作战，本方与他们的关系和联盟凝聚力会下降，本方十二个月内不再因联盟义务自动重返同一战争。':'Ordinary motions need a majority of all members; dissolution needs two thirds. Notices arrive next month, and silence counts as abstention. Members remain sovereign. Separate peace is allowed; while allies continue the war, relations and cohesion fall, and the peacemaker is excused from a renewed coalition call to arms for twelve months.'}</p>${owned.map(c=>{
  const pending=(s.world.coalitionMotions||[]).find(m=>m.coalitionId===c.id&&m.status==='voting');
  const expellable=c.parties.filter(id=>id!==s.player&&id!==c.leader);
  const helpers=c.parties.filter(id=>id!==s.player);
  const nominees=eligibleCoalitionAdmissionTargets(s,c,s.player).filter(id=>!(s.world.coalitionAdmissions||[]).some(x=>x.coalitionId===c.id&&x.target===id&&x.status==='pending'));
  const current=c.contributions?.[s.player]?.policy;
  const available=Object.keys(policies).filter(policy=>policy!==current&&(policy!=='funding'||s.factions[s.player].treasury>35)&&(policy!=='supplies'||s.factions[s.player].food>25));
  const headline=`<p><b>${esc(c.name||c.id)}</b> · ${zh?'盟主':'Leader'} ${esc(factionName(c.leader))} · ${zh?'当前承担':'Current contribution'} ${esc(label(policies,current,zh))}</p>`;
  const peace=(c.separatePeaces||[]).filter(x=>x.member===s.player&&x.until>s.year*12+s.month).at(-1);
  const peaceNotice=peace?`<p>${zh?'本方单独议和；免于联盟自动参战至':'Your separate peace exempts coalition call to arms until'} ${esc(date(peace.until))}</p>`:'';
  const ballot=pending?`<p>${zh?'议案表决中':'Ballot open'} · ${esc(label(kinds,pending.kind,zh))} · ${pending.kind==='contribution'?esc(label(policies,pending.policy,zh)):pending.kind==='dissolution'?'':esc(factionName(pending.target))} · ${zh?'截止':'Closes'} ${esc(date(pending.closesAt))}</p>`:'';
  const controls=pending?'':`${c.leader!==s.player?`<button class="action" data-coalition-motion="${esc(c.id)}" data-motion-kind="leadership" data-motion-target="${esc(s.player)}">${zh?'发起盟主改选 · 2国库':'Propose leadership vote · 2 treasury'}</button>`:''}${c.parties.length>=4&&expellable.length?`<label>${zh?'除名对象':'Expel member'} <select id="motion-target-${esc(c.id)}">${expellable.map(option).join('')}</select></label> <button class="action" data-coalition-motion="${esc(c.id)}" data-motion-kind="expulsion">${zh?'发起除名表决 · 2国库':'Propose expulsion · 2 treasury'}</button>`:''}${c.leader!==s.player&&c.parties.length<5&&nominees.length?`<label>${zh?'提名国家':'Nominate court'} <select id="motion-nominee-${esc(c.id)}">${nominees.map(option).join('')}</select></label> <button class="action" data-coalition-motion="${esc(c.id)}" data-motion-kind="admission">${zh?'提议邀请 · 5国库；未寄出退3':'Nominate member · 5 treasury; 3 refunded if unsent'}</button>`:''}${available.length?`<label>${zh?'新承担责任':'New contribution'} <select id="motion-policy-${esc(c.id)}">${available.map(policy=>`<option value="${policy}">${esc(label(policies,policy,zh))}</option>`).join('')}</select></label> <button class="action" data-coalition-motion="${esc(c.id)}" data-motion-kind="contribution" data-motion-target="${esc(s.player)}">${zh?'提议责任调整 · 2国库':'Propose contribution change · 2 treasury'}</button>`:''}<button class="action" data-coalition-motion="${esc(c.id)}" data-motion-kind="dissolution" data-motion-target="${esc(s.player)}">${zh?'提议解散 · 2国库':'Propose dissolution · 2 treasury'}</button>`;
  const aid=helpers.length?`<label>${zh?'求援盟友':'Request from ally'} <select id="coalition-aid-${esc(c.id)}">${helpers.map(option).join('')}</select></label> <button class="action" data-coalition-aid="${esc(c.id)}">${zh?'请求8国库与6粮食 · 派信2国库':'Request 8 treasury and 6 food · 2 treasury courier'}</button>`:'';
  const aidHistory=(s.world.coalitionAidRequests||[]).filter(x=>x.coalitionId===c.id&&x.requester===s.player).slice(-2).map(x=>`<p>${zh?'求援':'Aid request'} · ${esc(factionName(x.recipient))} · ${esc(({pending:zh?'等待回信':'Awaiting reply',accepted:zh?'已抵达':'Delivered',refused:zh?'遭拒':'Refused',no_reply:zh?'无回信或遗失':'No reply or lost',lapsed:zh?'失效':'Lapsed'})[x.status]||x.status)}</p>`).join('');
  const history=(c.motions||[]).slice(-3).map(m=>`<p>${esc(label(kinds,m.kind,zh))} · ${m.kind==='contribution'?esc(label(policies,m.policy,zh)):m.kind==='dissolution'?'':esc(factionName(m.target))} · ${m.status==='passed'?(zh?'通过':'Passed'):m.status==='lapsed'?(zh?'失效':'Lapsed'):(zh?'未通过':'Rejected')} · ${m.yes}/${m.eligible}</p>`).join('');
  return headline+peaceNotice+ballot+controls+aid+history+aidHistory;
 }).join('')}</div>`;
}
