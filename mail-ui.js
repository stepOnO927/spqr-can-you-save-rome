import {receivedMail,unreadCount} from './epistulae.js?v=epistulae-1';

const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const local = (value, zh) => Array.isArray(value) ? value[zh ? 1 : 0] : value;
const labels = {
  inbox:['Inbox','收件箱'], unread:['Unread','未读'], diplomatic:['Diplomatic','外交'],
  government:['Government','政务'], military:['Military','军事'], personal:['Personal','私人'],
  invitations:['Invitations','邀请'], sent:['Sent','已发送'], archive:['Archive','档案']
};
const choices = {
  accept:['Accept accord','接受协定'], reject:['Reject','拒绝'], negotiate:['Negotiate','商议条款'],
  condemn:['Condemn the aggressor','谴责侵略者'], war_council:['Open War Council','打开战争会议'],
  ignore:['No official reply','不予回复'], acknowledge:['Acknowledge','知悉'],
  view_location:['View location','查看地点'],truth:['Answer truthfully','如实回答'],
  polite:['Decline politely','婉言谢绝'],humor:['Reply humorously','幽默作答'],
  ask_why:['Ask why','询问缘由'],decline:['Decline','谢绝'],
  representative:['Send a representative','派代表出席']
};
export function mailboxHtml(s, {lang='en',filter='inbox',query='',sort='newest',sender='',selected=null} = {}) {
  const zh = lang === 'zh', all = s.mail?.messages || [];
  let letters = filter === 'sent' ? all.filter(m => m.senderFaction === s.player && m.recipient !== s.player)
    : receivedMail(s).filter(m => filter === 'archive' ? m.archived : !m.archived && (filter === 'inbox' || filter === 'unread' && !m.read || m.category === filter));
  if (query) letters = letters.filter(m => [m.senderName, m.subject, m.body].some(v => String(local(v, zh)).toLowerCase().includes(query.toLowerCase())));
  if (sender) letters = letters.filter(m => m.senderFaction === sender);
  letters.sort((a,b) => sort === 'oldest' ? a.arrival - b.arrival : sort === 'priority' ? ({critical:0,important:1,routine:2}[a.priority] - {critical:0,important:1,routine:2}[b.priority]) || b.arrival-a.arrival : b.arrival-a.arrival);
  const current = letters.find(m => m.id === selected) || letters[0] || null;
  const senders = [...new Set(all.filter(m => m.recipient === s.player).map(m => m.senderFaction))];
  return `<div class="mail-backdrop"><section class="mailbox" role="dialog" aria-modal="true" aria-label="${zh?'帝国来信':'Imperial mailbox'}">
    <header class="mail-head"><div><small>EPISTULAE · 帝国来信</small><h2>${zh?'帝国来信':'Imperial Mailbox'}</h2></div><button id="mail-close" aria-label="${zh?'关闭邮箱':'Close mailbox'}">×</button></header>
    <div class="mail-tabs">${Object.entries(labels).map(([key,label]) => `<button data-mail-filter="${key}" class="${filter===key?'active':''}">${label[zh?1:0]}${key==='unread' ? ' ('+unreadCount(s)+')' : ''}</button>`).join('')}</div>
    <div class="mail-controls"><label>${zh?'搜索':'Search'} <input id="mail-search" type="search" value="${safe(query)}"></label><label>${zh?'发送者':'Sender'} <select id="mail-sender"><option value="">${zh?'全部':'All'}</option>${senders.map(id => `<option value="${safe(id)}" ${sender===id?'selected':''}>${safe(id)}</option>`).join('')}</select></label><label>${zh?'排序':'Sort'} <select id="mail-sort"><option value="newest" ${sort==='newest'?'selected':''}>${zh?'最新':'Newest'}</option><option value="oldest" ${sort==='oldest'?'selected':''}>${zh?'最早':'Oldest'}</option><option value="priority" ${sort==='priority'?'selected':''}>${zh?'优先级':'Priority'}</option></select></label><button id="mail-read-all">${zh?'全部标为已读':'Mark all read'}</button></div>
    <div class="mail-columns"><div class="mail-list">${letters.length ? letters.map(m => `<button class="mail-row ${m.read?'':'unread'} ${m.priority}" data-mail-select="${safe(m.id)}" ${current?.id===m.id?'aria-current="true"':''}><strong>${safe(local(m.senderName,zh))}</strong><span>${safe(local(m.subject,zh))}</span><small>${m.created.month}/${Math.abs(m.created.year)} ${m.created.year<0?'BCE':'CE'} · ${m.priority}</small></button>`).join('') : `<p class="mail-empty">${zh?'此处暂无书信。':'No letters here.'}</p>`}</div>
    <article class="mail-letter">${current ? `<div class="mail-seal">✦ SPQR ✦</div><small>${safe(current.category)} · ${safe(current.priority)} · ${current.created.month}/${Math.abs(current.created.year)} ${current.created.year<0?'BCE':'CE'}</small><h3>${safe(local(current.subject,zh))}</h3><p class="mail-from">${zh?'来自':'From'} ${safe(local(current.senderName,zh))}</p><p>${safe(local(current.body,zh))}</p>${current.confidence ? `<small>${zh?'情报可信度':'Intelligence confidence'}: ${safe(current.confidence)}</small>` : ''}${all.some(m => m.threadId === current.threadId && m.id !== current.id && m.delivery === 'received' && m.recipient === s.player) ? `<div class="mail-thread"><h4>${zh?'往来书信':'Correspondence'}</h4>${all.filter(m => m.threadId === current.threadId && m.id !== current.id && m.delivery === 'received' && m.recipient === s.player).map(m => `<p><b>${safe(local(m.senderName,zh))}</b>: ${safe(local(m.body,zh))}</p>`).join('')}</div>` : ''}<div class="mail-actions">${!current.responses.length && current.recipient===s.player && !current.archived ? current.options.map(id => `<button data-mail-reply="${safe(id)}" data-mail-id="${safe(current.id)}">${safe(local(choices[id] || [id,id],zh))}</button>`).join('') : ''}${current.recipient===s.player ? `<button data-mail-archive="${safe(current.id)}">${zh?'归档':'Archive'}</button>` : ''}</div>${current.responses.length ? `<p class="mail-response">${zh?'已回复':'Replied'}: ${safe(local(choices[current.responses[0].choice] || [current.responses[0].choice,current.responses[0].choice],zh))}</p>` : ''}${current.responses[0]?.body ? `<p class="mail-response">${safe(local(current.responses[0].body,zh))}</p>` : ''}</article>` : `<p class="mail-empty">${zh?'选择一封信':'Select a letter'}</p>`}</div>
    <div class="mail-settings"><label><input id="mail-mute" type="checkbox" ${s.mail?.preferences?.muteRoutine?'checked':''}> ${zh?'静音常规来信':'Mute routine letters'}</label><label><input id="mail-pause" type="checkbox" ${s.mail?.preferences?.pauseCritical?'checked':''}> ${zh?'关键来信暂停战役':'Pause on critical letters'}</label><label><input id="mail-auto-archive" type="checkbox" ${s.mail?.preferences?.autoArchiveRoutine?'checked':''}> ${zh?'自动归档常规来信':'Auto-archive routine letters'}</label></div>
  </section></div>`;
}
