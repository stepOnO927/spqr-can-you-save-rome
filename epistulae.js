import {ROUTES, FACTIONS} from './data.js?v=phase-x-1';
import {CHARACTER_CATALOG,ageRange} from './characters.js?v=newborn-age-1';

const monthIndex = (year, month) => year * 12 + month;
const pair = (a, b) => [a, b].sort().join(':');
const atWar = (s, a, b) => (s.wars || []).some(w => w.includes(a) && w.includes(b));
const name = id => CHARACTER_CATALOG[id]?.name || FACTIONS[id]?.short || [id, id];
const home = (s, faction) => s.regions.find(r => r.owner === faction)?.id || null;

export function initializeMail(s) {
  if (!s.mail || typeof s.mail !== 'object') s.mail = {};
  s.mail.messages ||= [];
  s.mail.nextId ||= 1;
  s.mail.generated ||= {};
  s.mail.preferences ||= {muteRoutine:false, pauseCritical:false, autoArchiveRoutine:false};
  s.mail.warPolicies ||= {};
  s.mail.events ||= [];
  return s.mail;
}

// A theater route is an operational approximation, never an instant courier.
export function courierMonths(s, source, destination, urgent = false) {
  if (!source || !destination) return urgent ? 2 : 4;
  if (source === destination) return 1;
  const queue = [[source, 0]], seen = new Set([source]);
  while (queue.length) {
    const [place, distance] = queue.shift();
    for (const [a, b, kind] of ROUTES) {
      const next = a === place ? b : b === place ? a : null;
      if (!next || seen.has(next)) continue;
      const cost = distance + (kind === 'sea' ? 2 : 1);
      if (next === destination) return Math.max(1, urgent ? Math.ceil(cost / 2) : cost);
      seen.add(next); queue.push([next, cost]);
    }
  }
  return urgent ? 2 : 4;
}

export function sendLetter(s, spec) {
  const mail = initializeMail(s);
  const {senderId, senderInstitution, senderFaction, recipient, category = 'personal'} = spec;
  if (!s.factions?.[senderFaction] || !s.factions?.[recipient] || (senderFaction === recipient && category === 'diplomatic')) return {ok:false, reason:'faction'};
  if (senderId && !s.world?.characters?.[senderId]) return {ok:false, reason:'sender'};
  if (!senderId && senderInstitution !== senderFaction) return {ok:false, reason:'sender'};
  const source = spec.source || (senderId ? s.world.characters[senderId].location : null) || home(s, senderFaction);
  const destination = spec.destination || home(s, recipient);
  const sent = monthIndex(s.year, s.month);
  const travel = courierMonths(s, source, destination, spec.priority === 'critical');
  const id = 'mail:' + mail.nextId++;
  const letter = {
    id, threadId:spec.threadId || id, senderId:senderId || null, senderInstitution:senderInstitution || null,
    senderFaction, recipient, senderName:senderId ? name(senderId) : name(senderFaction),
    subject:spec.subject, body:spec.body, category, priority:spec.priority || 'routine',
    created:{year:s.year, month:s.month}, arrival:sent + travel,
    source, destination, delivery:'traveling', read:false, archived:false,
    responses:[], options:spec.options || [], eventId:spec.eventId || null,
    context:spec.context || null, confidentiality:spec.confidentiality || 'ordinary',
    confidence:spec.confidence || null, expires:spec.expires || null
  };
  mail.messages.push(letter);
  return {ok:true, letter};
}

export function receivedMail(s, recipient = s.player) {
  return initializeMail(s).messages.filter(m => m.recipient === recipient && m.delivery === 'received');
}
export function unreadCount(s) {
  return receivedMail(s).filter(m => !m.read && !m.archived).length;
}
export function markRead(s, id) {
  const m = receivedMail(s).find(x => x.id === id);
  if (!m) return false;
  m.read = true; return true;
}
export function archiveLetter(s, id) {
  const m = receivedMail(s).find(x => x.id === id);
  if (!m) return false;
  m.archived = true; m.read = true; return true;
}
export function markAllRead(s) {
  for (const m of receivedMail(s)) m.read = true;
}

function senderFor(s, faction) {
  const ids = s.world?.leadership?.[faction] || [];
  return ids.find(id => s.world.characters[id]?.alive && CHARACTER_CATALOG[id]) || null;
}
function replyNotice(s, original, subject, body, priority = 'routine') {
  return sendLetter(s, {
    senderId:senderFor(s, original.senderFaction), senderInstitution:senderFor(s, original.senderFaction) ? null : original.senderFaction,
    senderFaction:original.senderFaction, recipient:original.recipient, category:original.category,
    priority, subject, body, threadId:original.threadId, context:{replyTo:original.id}
  });
}

export function replyToLetter(s, id, choice, actions) {
  const m = receivedMail(s).find(x => x.id === id);
  if (!m || m.recipient !== s.player || m.responses.length || !m.options.includes(choice)) return {ok:false, reason:'unavailable'};
  if (m.expires !== null && monthIndex(s.year, s.month) > m.expires) return {ok:false, reason:'expired'};
  let ok = true;
  if (m.context?.kind === 'war' && choice === 'negotiate') {
    ok = actions.sendInquiry(s, s.player, m.senderFaction, 'peace').ok;
  } else if (m.context?.kind === 'war' && choice === 'condemn') {
    const key = pair(m.senderFaction, m.recipient);
    s.relations[key] = Math.max(-100, (s.relations[key] || 0) - 5);
  } else if (m.context?.kind === 'personal_age') {
    const leader=s.world.characters[m.context.leader],sender=s.world.characters[m.senderId];
    if (!leader?.alive || !sender?.alive) return {ok:false,reason:'unavailable'};
    if (choice === 'truth' && !ageRange(m.context.leader,s.year)) return {ok:false,reason:'unknown_age'};
    const key=pair(m.senderId,m.context.leader),bond=s.world.personalRelations[key]||{trust:0,meetings:0};
    bond.trust=Math.max(-100,Math.min(100,bond.trust+({truth:3,polite:0,humor:2,ask_why:1,ignore:-2}[choice]||0)));
    s.world.personalRelations[key]=bond;
  } else if (m.context?.kind === 'banquet') {
    const host=s.world.characters[m.senderId],guest=s.world.characters[m.context.leader];
    if (!host?.alive || !guest?.alive) return {ok:false,reason:'unavailable'};
    if (choice === 'accept' || choice === 'representative') {
      const travel=choice === 'representative' ? 1 : courierMonths(s,guest.location,host.location);
      s.mail.events.push({id:'invitation:'+m.id,letterId:m.id,hostId:m.senderId,guestId:m.context.leader,
        representative:choice === 'representative',date:monthIndex(s.year,s.month)+travel,status:'scheduled'});
    }
    if (choice === 'decline') host.loyalty=Math.max(0,(host.loyalty||50)-1);
  }
  if (!ok) return {ok:false, reason:'conditions'};
  m.read = true;
  const ages=m.context?.kind === 'personal_age' ? ageRange(m.context.leader,s.year) : null;
  const ageText=ages ? (ages[0]===ages[1] ? String(ages[0]) : `${ages[0]}–${ages[1]}`) : null;
  const responseBody=m.context?.kind === 'personal_age' ? ({
    truth:[`My age is about ${ageText} years, by the records of this court.`,`据本朝记录，我约${ageText}岁。`],
    polite:['I prefer to keep that matter private.','此事还请见谅，暂不相告。'],
    humor:['The years are fewer than my burdens, I hope.','但愿岁月尚不及肩上重担之多。'],
    ask_why:['Why do you inquire?','不知何故问起？'],
    ignore:['No answer was sent.','未寄出答复。']
  })[choice] : null;
  m.responses.push({choice, year:s.year, month:s.month,
    body:responseBody,
    arrival:m.context?.kind === 'treaty' ? monthIndex(s.year,s.month) + courierMonths(s,m.destination,m.source) : null,
    resolved:m.context?.kind !== 'treaty'});
  return {ok:true, open:choice === 'war_council' ? 'military' : choice === 'view_location' ? m.context?.region : null};
}

function localCorrespondence(s) {
  const mail=initializeMail(s),leader=senderFor(s,s.player);
  if (!leader) return;
  const senderId=Object.keys(s.world.characters).find(id=>id.startsWith('fictional:')&&s.world.characters[id].alive&&s.world.characters[id].faction===s.player&&id!==leader&&CHARACTER_CATALOG[id]);
  if (!senderId) return;
  const sender=s.world.characters[senderId],recipient=s.world.characters[leader];
  if (s.month===4 && !mail.generated[`age:${s.year}:${s.player}`]) {
    mail.generated[`age:${s.year}:${s.player}`]=true;
    const known=ageRange(leader,s.year),address=known ? 'Your age is the subject of courtly curiosity.' : 'Your years are a subject of courtly curiosity.';
    sendLetter(s,{senderId,senderFaction:s.player,recipient:s.player,category:'personal',
      subject:['A personal question','一件私事'],body:[`Your Excellency, if it is not improper, may I ask your age? ${address}`,'阁下，若不冒犯，可否请教您的年岁？'],options:['truth','polite','humor','ask_why','ignore'],context:{kind:'personal_age',leader}});
  }
  if (s.month===8 && sender.location && recipient.location && sender.location===recipient.location && !mail.generated[`banquet:${s.year}:${s.player}`]) {
    mail.generated[`banquet:${s.year}:${s.player}`]=true;
    sendLetter(s,{senderId,senderFaction:s.player,recipient:s.player,category:'invitations',priority:'routine',
      subject:['Invitation to a private banquet','私人宴会邀请'],body:['Your Excellency, I would be honored to receive you at a modest banquet.','阁下，若蒙光临寒舍薄宴，不胜荣幸。'],
      options:['accept','decline','representative','ignore'],context:{kind:'banquet',leader,region:sender.location},expires:monthIndex(s.year,s.month)+4});
  }
}

export function treatyLetter(s, senderFaction, recipient, treatyType = 'non_aggression') {
  const senderId = senderFor(s, senderFaction);
  if (!senderId || atWar(s, senderFaction, recipient) || (s.agreements || []).some(a => a.status === 'active' && a.type === treatyType && a.parties.includes(senderFaction) && a.parties.includes(recipient))) return {ok:false, reason:'unavailable'};
  return sendLetter(s, {
    senderId, senderFaction, recipient, category:'diplomatic', priority:'important',
    subject:[`Proposed accord with ${name(senderFaction)[0]}`,`与${name(senderFaction)[1]}的协定提议`],
    body:[`Our court proposes a ${treatyType.replaceAll('_',' ')} accord. Your answer will be carried back by courier.`,`本朝提议缔结${treatyType === 'non_aggression' ? '互不侵犯' : '外交'}协定。答复将由信使带回。`],
    options:['accept','reject','negotiate'], context:{kind:'treaty', treatyType},
    expires:monthIndex(s.year, s.month) + 12
  });
}

export function warLetters(s, before) {
  const mail = initializeMail(s), prior = new Set(before.map(w => pair(w[0], w[1])));
  for (const war of s.wars) {
    const key = pair(war[0], war[1]);
    if (prior.has(key)) continue;
    const eventId = `war:${key}:${s.year}:${s.month}`;
    if (mail.generated[eventId]) continue;
    mail.generated[eventId] = true;
    for (const [senderFaction, recipient] of [[war[0], war[1]], [war[1], war[0]]]) {
      if (senderFaction !== war[0]) continue;
      const senderId = senderFor(s, senderFaction);
      sendLetter(s, {
        senderId, senderInstitution:senderId ? null : senderFaction, senderFaction, recipient,
        category:'diplomatic', priority:'critical', eventId,
        subject:['Declaration of war','宣战文书'],
        body:[`${name(senderFaction)[0]} has declared war. Hostilities are already in effect; this dispatch confirms the decision.`,`${name(senderFaction)[1]}已宣战。敌对状态现已生效；此书正式告知该决定。`],
        options:['negotiate','condemn','war_council','ignore'], context:{kind:'war'}
      });
    }
  }
}

export function advanceMail(s, actions = {}) {
  const mail = initializeMail(s), now = monthIndex(s.year, s.month);
  for (const event of mail.events) {
    if (event.status !== 'scheduled' || event.date > now) continue;
    const host=s.world.characters[event.hostId],guest=s.world.characters[event.guestId];
    event.status=host?.alive && guest?.alive && (event.representative || host.location===guest.location) ? 'held' : 'missed';
    if (event.status==='held' && !event.representative) {
      const key=pair(event.hostId,event.guestId),bond=s.world.personalRelations[key]||{trust:0,meetings:0};
      bond.trust=Math.min(100,bond.trust+2);bond.meetings++;s.world.personalRelations[key]=bond;
    }
  }
  for (const m of [...mail.messages]) for (const response of m.responses) {
    if (response.resolved || response.arrival === null || response.arrival > now || m.context?.kind !== 'treaty') continue;
    response.resolved = true;
    let result = response.choice;
    if (result === 'accept') {
      const accepted = !atWar(s,m.senderFaction,m.recipient) && actions.proposeAgreement?.(s,m.senderFaction,m.recipient,m.context.treatyType).ok;
      result = accepted ? 'accept' : 'failed';
    }
    if (result === 'negotiate' && !atWar(s,m.senderFaction,m.recipient)) {
      const key=pair(m.senderFaction,m.recipient);s.relations[key]=Math.min(100,(s.relations[key]||0)+2);
    }
    if (result === 'reject') {
      const key=pair(m.senderFaction,m.recipient);s.relations[key]=Math.max(-100,(s.relations[key]||0)-2);
    }
    response.outcome = result;
    const words = result === 'accept' ? [['The treaty has been sealed.','条约已经缔结。'],['Your acceptance is recorded at our court.','贵方的接受已载入本朝记录。']]
      : result === 'reject' ? [['The proposal is withdrawn.','提议已经撤回。'],['Your refusal has reached our court.','贵方的拒绝已送达本朝。']]
      : result === 'failed' ? [['The accord could not be concluded.','协定未能缔结。'],['Circumstances have changed before your answer arrived.','贵方答复送达前局势已经变化。']]
      : [['Further terms are under consideration.','正在考虑进一步条款。'],['We shall consider your proposed changes.','我们将考虑贵方的修改意见。']];
    if (m.recipient === s.player) replyNotice(s,m,words[0],words[1]);
  }
  for (const m of mail.messages) {
    if (m.delivery !== 'traveling' || m.arrival > now) continue;
    m.delivery = 'received';
    if (m.recipient !== s.player && m.context?.kind === 'treaty' && actions.proposeAgreement) {
      const key = pair(m.senderFaction, m.recipient), willingness = (s.relations[key] || 0) >= 0;
      const accepted = willingness && actions.proposeAgreement(s, m.senderFaction, m.recipient, m.context.treatyType).ok;
      m.responses.push({choice:accepted ? 'accept' : 'reject', year:s.year, month:s.month, ai:true});
    }
    if (m.recipient === s.player && m.priority === 'routine' && mail.preferences.autoArchiveRoutine) {
      m.archived = true; m.read = true;
    }
  }
  // One court initiative per year keeps AI correspondence independent of the mailbox UI.
  const factions = Object.keys(s.factions).filter(id => id !== 'rebels' && s.regions.some(r => r.owner === id));
  if (s.month === 2) for (const sender of factions) {
    const target = factions.find(id => id !== sender && !atWar(s, sender, id) && !(s.agreements || []).some(a => a.status === 'active' && a.type === 'non_aggression' && a.parties.includes(sender) && a.parties.includes(id)));
    if (!target) continue;
    const key = pair(sender, target);
    if ((s.relations[key] || 0) < 0) continue;
    if (treatyLetter(s, sender, target).ok) mail.generated[`accord:${s.year}:${sender}:${target}`] = true;
  }
  if (s.month === 1 && s.year !== -49) {
    const id = `treasury:${s.year}:${s.player}`;
    if (!mail.generated[id]) {
      mail.generated[id] = true;
      const f = s.factions[s.player];
      // The ledger is captured when written; it never invents revenue.
      const m = sendLetter(s, {senderInstitution:s.player, senderFaction:s.player, recipient:s.player,
        category:'government', priority:'routine', eventId:id,
        subject:['Annual treasury ledger','年度国库报告'],
        body:[`Treasury: ${f.treasury}; food: ${f.food}; manpower: ${f.manpower}.`,`国库：${f.treasury}；粮食：${f.food}；兵源：${f.manpower}。`],
        options:['acknowledge'], source:home(s,s.player), destination:home(s,s.player)});
      // Government institutions may address their own court.
      if (!m.ok) delete mail.generated[id];
    }
  }
  localCorrespondence(s);
  if (mail.messages.length > 500) mail.messages = mail.messages.filter(m => !m.archived).slice(-500);
  return mail;
}
