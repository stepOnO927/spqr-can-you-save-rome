import {ROUTES, FACTIONS} from './data.js?v=phase-x-1';
import {CHARACTER_CATALOG,ageRange} from './characters.js?v=separate-crowns-1';
import {AGREEMENT_TYPES} from './agreements.js?v=grand-chessboard-2';
import {formatChronicleEntry} from './chronicle.js?v=separate-crowns-1';
import {initializePersonnel,applyWarPersonnel} from './epistulae-personnel.js?v=regional-mail-merge-1';
import {fictionalPortraitKey,observedFictionalPortrait} from './portrait-registry.js?v=portrait-pool-2';
import {rememberPoliticalEvent} from './political-memory.js?v=grand-chessboard-2';
import {canMediate,requestMediation} from './civil-war.js?v=separate-crowns-1';

const monthIndex = (year, month) => year * 12 + month;
const pair = (a, b) => [a, b].sort().join(':');
const atWar = (s, a, b) => (s.wars || []).some(w => w.includes(a) && w.includes(b));
const name = id => CHARACTER_CATALOG[id]?.name || FACTIONS[id]?.short || [id, id];
const home = (s, faction) => s.regions.find(r => r.owner === faction)?.id || null;
const historicalPortraits=new Set(['caesar','pompey','cleopatra','arsinoe','orodes','artavasdes','ptolemy','juba','bocchus','bogud','pacorus','antony','cato','scipio','labienus','cicero','lepidus','deiotarus','pharnaces']);
const portrait=(s,id)=>!id?null:historicalPortraits.has(id)?id:id.startsWith('fictional:')?(s.world.characters[id]?.faction===s.player?fictionalPortraitKey(s,id):observedFictionalPortrait(s,id)):null;
// A stable per-letter roll does not consume battle or diplomacy randomness.
// The sender is not told whether a missing letter or answer was lost.
function courierLost(s,m,leg='outbound'){
  if(m.senderFaction===m.recipient||!Number.isFinite(m.courierSeed))return false;
  let h=((m.courierSeed??0)^0x9e3779b9)>>>0;
  for(const c of `${m.id}:${leg}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;
  h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;
  return (h>>>0)/4294967296 < (m.courierRisk??.08);
}

export function initializeMail(s) {
  if (!s.mail || typeof s.mail !== 'object') s.mail = {};
  s.mail.messages ||= [];
  s.mail.nextId ||= 1;
  s.mail.generated ||= {};
  s.mail.preferences ||= {muteRoutine:false, pauseCritical:false, autoArchiveRoutine:false};
  s.mail.warPolicies ||= {};
  s.mail.events ||= [];
  initializePersonnel(s);
  return s.mail;
}

// A theater route is an operational approximation, never an instant courier.
export function courierMonths(s, source, destination, urgent = false) {
  if (!source || !destination) return urgent ? 2 : 4;
  if (source === destination) return 1;
  const queue = [[source, 0]], best = new Map([[source,0]]);
  while (queue.length) {
    queue.sort((a,b)=>a[1]-b[1]);
    const [place, distance] = queue.shift();
    if(distance!==best.get(place))continue;
    if(place===destination)return Math.max(1,urgent?Math.ceil(distance/2):distance);
    for (const [a, b, kind] of ROUTES) {
      const next = a === place ? b : b === place ? a : null;
      if (!next) continue;
      const cost = distance + (kind === 'sea' ? 2 : 1);
      if(cost >= (best.get(next)??Infinity))continue;
      best.set(next,cost);queue.push([next,cost]);
    }
  }
  return urgent ? 2 : 4;
}

export function sendLetter(s, spec) {
  const mail = initializeMail(s);
  const {senderId, senderInstitution, senderFaction, recipient, category = 'personal'} = spec;
  if (!s.factions?.[senderFaction] || !s.factions?.[recipient] || (senderFaction === recipient && category === 'diplomatic')) return {ok:false, reason:'faction'};
  if (senderId && (!s.world?.characters?.[senderId]||!s.world.characters[senderId].alive||s.world.characters[senderId].faction!==senderFaction)) return {ok:false, reason:'sender'};
  if (!senderId && senderInstitution !== senderFaction) return {ok:false, reason:'sender'};
  const source = spec.source || (senderId ? s.world.characters[senderId].location : null) || home(s, senderFaction);
  const destination = spec.destination || home(s, recipient);
  const sent = monthIndex(s.year, s.month);
  const travel = courierMonths(s, source, destination, spec.priority === 'critical');
  const id = 'mail:' + mail.nextId++;
  const letter = {
    id, threadId:spec.threadId || id, senderId:senderId || null, senderInstitution:senderInstitution || null,
    senderFaction, recipient, senderName:senderId ? name(senderId) : name(senderFaction),
    senderPortrait:portrait(s,senderId),
    subject:spec.subject, body:spec.body, category, priority:spec.priority || 'routine',
    created:{year:s.year, month:s.month}, arrival:sent + travel, courierSeed:(s.seed??0)>>>0,
    courierRisk:atWar(s,senderFaction,recipient)?.16:.08,
    source, destination, delivery:'traveling', read:false, archived:false,
    responses:[], options:spec.options || [], eventId:spec.eventId || null,
    context:spec.context || null, confidentiality:spec.confidentiality || 'ordinary',
    confidence:spec.confidence || null, expires:spec.expires || null,
    politicalState:spec.politicalState || null, recipientId:spec.recipientId || null
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
  const senderId=original.senderFaction===original.recipient&&s.world.characters[original.senderId]?.alive?original.senderId:senderFor(s,original.senderFaction);
  return sendLetter(s, {
    senderId,senderInstitution:senderId?null:original.senderFaction,
    senderFaction:original.senderFaction, recipient:original.recipient, category:original.category,
    priority, subject, body, threadId:original.threadId, context:{replyTo:original.id}
  });
}

export function replyToLetter(s, id, choice, actions) {
  const m = receivedMail(s).find(x => x.id === id);
  if (!m || m.recipient !== s.player || m.responses.length || !m.options.includes(choice)) return {ok:false, reason:'unavailable'};
  if (m.expires !== null && monthIndex(s.year, s.month) > m.expires) return {ok:false, reason:'expired'};
  if (['war_council','view_location','review_budget'].includes(choice)) {
    m.read=true;
    return {ok:true,open:choice==='war_council'?'military':choice==='review_budget'?'government':m.context?.region};
  }
  let ok = true;
  if (m.context?.kind === 'peace') {
    ok = actions.answerPeaceOffer?.(s,m.senderFaction,choice).ok === true;
  } else if (m.context?.kind === 'war' && choice === 'negotiate') {
    ok = actions.sendInquiry(s, s.player, m.senderFaction, 'peace').ok;
  } else if (m.context?.kind === 'war' && choice === 'condemn') {
    const key = pair(m.senderFaction, m.recipient);
    s.relations[key] = Math.max(-100, (s.relations[key] || 0) - 5);
    s.factions[s.player].legitimacy=Math.min(100,s.factions[s.player].legitimacy+1);
    rememberPoliticalEvent(s,m.senderFaction,s.player,'formal_condemnation',-3);
    s.log.unshift({year:s.year,month:s.month,en:`Our court formally condemned ${name(m.senderFaction)[0]}'s declaration of war.`,zh:`本朝正式谴责${name(m.senderFaction)[1]}的宣战。`,other:m.senderFaction});
  } else if (m.context?.kind === 'war' && choice === 'seek_allies') {
    const allies=(s.alliances||[]).filter(a=>a.includes(s.player)).map(a=>a.find(id=>id!==s.player)).filter(id=>s.factions[id]&&!atWar(s,id,m.senderFaction));
    if(!allies.length)return {ok:false,reason:'no_allies'};
    const ally=allies[0],leader=senderFor(s,s.player);
    sendLetter(s,{senderId:leader,senderInstitution:leader?null:s.player,senderFaction:s.player,recipient:ally,
      category:'diplomatic',priority:'important',subject:['Request for allied support','请求盟友支持'],
      body:[`Our court requests support against ${name(m.senderFaction)[0]}.`,`本朝请求援助，对抗${name(m.senderFaction)[1]}。`],
      context:{kind:'allied_support',enemy:m.senderFaction,original:m.id},threadId:m.threadId});
  } else if (m.context?.kind === 'chronicle' && choice === 'request_reinforcements') {
    const place=m.context.region;
    if(!place||!s.regions.some(r=>r.id===place&&r.owner===s.player))return {ok:false,reason:'region'};
    ok=actions.recruit?.(s,place,s.player)===true;
  } else if (m.context?.kind === 'chronicle' && choice === 'contact_governor') {
    const place=m.context.region;
    if(!place||!s.regions.some(r=>r.id===place&&r.owner===s.player))return {ok:false,reason:'region'};
    s.mail.events.push({id:'governor:'+m.id,letterId:m.id,type:'governor',region:place,date:monthIndex(s.year,s.month)+2,status:'scheduled'});
  } else if (m.context?.kind === 'personal_age') {
    const leader=s.world.characters[m.context.leader],sender=s.world.characters[m.senderId];
    if (!leader?.alive || !sender?.alive) return {ok:false,reason:'unavailable'};
    if (choice === 'truth' && !ageRange(m.context.leader,s.year)) return {ok:false,reason:'unknown_age'};
    const key=pair(m.senderId,m.context.leader),bond=s.world.personalRelations[key]||{trust:0,meetings:0};
    bond.trust=Math.max(-100,Math.min(100,bond.trust+({truth:3,polite:0,humor:2,ask_why:1,ignore:-2}[choice]||0)));
    s.world.personalRelations[key]=bond;
  } else if(m.context?.kind==='personal_flavor'){
    const sender=s.world.characters[m.senderId],leader=s.world.characters[m.context.leader];
    if(!sender?.alive||!leader?.alive)return {ok:false,reason:'unavailable'};
    const key=pair(m.senderId,m.context.leader),bond=s.world.personalRelations[key]||{trust:0,meetings:0};
    if(choice==='grant_favor'){
      if(s.factions[s.player].treasury<3)return {ok:false,reason:'treasury'};
      s.factions[s.player].treasury-=3;sender.loyalty=Math.min(100,(sender.loyalty||50)+3);
    }
    if(choice==='grant_audience'){
      if(!sender.location||sender.location!==leader.location)return {ok:false,reason:'location'};
      const date=monthIndex(s.year,s.month)+1;
      if(s.mail.events.some(e=>e.status==='scheduled'&&e.date===date&&e.participantId===leader.id))return {ok:false,reason:'commitment'};
      s.mail.events.push({id:'audience:'+m.id,letterId:m.id,hostId:m.senderId,guestId:leader.id,participantId:leader.id,
        privateMeeting:true,date,status:'scheduled',venue:sender.location});
    }
    bond.trust=Math.max(-100,Math.min(100,bond.trust+({respond_warmly:2,respond_formally:0,grant_favor:3,grant_audience:1,ignore:-1}[choice]||0)));
    s.world.personalRelations[key]=bond;
  } else if(m.context?.kind==='provincial_relief'){
    const place=s.regions.find(r=>r.id===m.context.region&&r.owner===s.player),officer=s.world.characters[m.senderId],f=s.factions[s.player];
    if(!place||!officer?.alive||officer.faction!==s.player)return {ok:false,reason:'changed_state'};
    const cost=choice==='full_relief'?12:choice==='limited_relief'?5:0;
    if(f.treasury<cost)return {ok:false,reason:'treasury'};
    const before={treasury:f.treasury,loyalty:place.loyalty};
    if(choice==='request_report')s.mail.events.push({id:'governor:'+m.id,letterId:m.id,type:'governor',region:place.id,date:monthIndex(s.year,s.month)+2,status:'scheduled'});
    else {f.treasury-=cost;place.loyalty=Math.max(0,Math.min(100,place.loyalty+(choice==='full_relief'?7:choice==='limited_relief'?3:-1)));officer.loyalty=Math.max(0,Math.min(100,(officer.loyalty||50)+(cost?2:-1)))}
    s.log.unshift({year:s.year,month:s.month,en:`${place.name[0]} relief decision: treasury ${before.treasury} → ${f.treasury}, loyalty ${before.loyalty} → ${place.loyalty}.`,zh:`${place.name[1]}赈济决策：国库 ${before.treasury} → ${f.treasury}，忠诚度 ${before.loyalty} → ${place.loyalty}。`,region:place.id});
    s.log=s.log.slice(0,80);
  } else if(m.context?.kind==='aid_request'){
    if(choice==='send_aid'){
      if(s.factions[s.player].treasury<5)return {ok:false,reason:'treasury'};
      s.factions[s.player].treasury-=5;
    }
  } else if(m.context?.kind==='ultimatum'){
    if(choice==='concede'){
      if(s.factions[s.player].treasury<6)return {ok:false,reason:'treasury'};
      s.factions[s.player].treasury-=6;
    }
  } else if(m.context?.kind==='mediation'&&choice==='mediate'){
    ok=requestMediation(s,s.player,m.senderFaction).ok===true;
  } else if (m.context?.kind === 'banquet') {
    const host=s.world.characters[m.senderId],guest=s.world.characters[m.context.leader];
    if (!host?.alive || !guest?.alive) return {ok:false,reason:'unavailable'};
    if (choice === 'accept' || choice === 'representative' || choice==='private_meeting') {
      const travel=courierMonths(s,guest.location,host.location);
      const participant=choice==='representative'?Object.values(s.world.characters).find(p=>p.faction===s.player&&p.alive&&p.id!==guest.id&&p.location===guest.location):guest;
      if(!participant)return {ok:false,reason:'representative'};
      const date=monthIndex(s.year,s.month)+travel;
      if((s.mail.events||[]).some(e=>e.status==='scheduled'&&e.date===date&&e.participantId===participant.id))return {ok:false,reason:'commitment'};
      s.mail.events.push({id:'invitation:'+m.id,letterId:m.id,hostId:m.senderId,guestId:m.context.leader,
        participantId:participant.id,representative:choice === 'representative',privateMeeting:choice==='private_meeting',date,status:'scheduled',venue:host.location});
    }
    if (choice === 'decline') host.loyalty=Math.max(0,(host.loyalty||50)-1);
  } else if (m.context?.kind === 'treasury' && choice === 'audit') {
    if (s.factions[s.player].treasury < 3) return {ok:false,reason:'treasury'};
    s.factions[s.player].treasury -= 3;
    s.mail.events.push({id:'audit:'+m.id,letterId:m.id,type:'audit',date:monthIndex(s.year,s.month)+2,status:'scheduled'});
  } else if (m.context?.kind === 'treasury' && choice === 'consult_official') {
    s.mail.events.push({id:'consult:'+m.id,letterId:m.id,type:'consult',date:monthIndex(s.year,s.month)+1,status:'scheduled'});
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
  const delayed=choice!=='ignore'&&['treaty','full_alliance','aid_request','ultimatum','complaint','greeting'].includes(m.context?.kind);
  m.responses.push({choice, year:s.year, month:s.month,
    body:responseBody,
    arrival:delayed ? monthIndex(s.year,s.month) + courierMonths(s,m.destination,m.source) : null,
    resolved:!delayed});
  if(m.context?.kind==='personal_age'&&choice==='ask_why')replyNotice(s,m,['Why I asked','为何相问'],['I wished to know you better, and meant no offense.','只盼多了解阁下，并无冒犯之意。']);
  if(m.context?.kind==='personal_flavor'&&choice==='grant_favor')replyNotice(s,m,['A note of thanks','致谢短笺'],['I am grateful for the court’s assistance.','承蒙朝廷资助，谨致谢意。']);
  if(!['ignore','acknowledge','seek_allies'].includes(choice)){
    const leader=senderFor(s,s.player),to=m.senderFaction;
    const phrase={accept:['We accept the proposed accord.','本朝接受所议协定。'],reject:['We decline the proposed accord.','本朝谢绝所议协定。'],negotiate:['We request further negotiations.','本朝请求继续商议。'],condemn:['We condemn this declaration.','本朝谴责此项宣战。'],apologize:['We regret the strain between our courts.','两国关系紧张，本朝深表遗憾。'],defend:['Our court maintains its position.','本朝坚持原有立场。'],welcome:['We welcome this correspondence.','本朝欣然收到来函。'],send_aid:['We have committed five treasury units in support.','本朝决定提供五单位国库援助。'],concede:['We accept the requested settlement.','本朝同意所请和解。']}[choice]||[choice.replaceAll('_',' '),choice];
    if(to!==s.player){const sent=sendLetter(s,{senderId:leader,senderInstitution:leader?null:s.player,senderFaction:s.player,recipient:to,source:m.destination,destination:m.source,
      category:m.category,priority:m.priority,subject:[`Re: ${m.subject[0]}`,`复：${m.subject[1]}`],
      body:responseBody||phrase,threadId:m.threadId,
      context:{kind:'reply',replyTo:m.id}});if(sent.ok&&m.responses.at(-1).arrival!==null){m.responses.at(-1).replyMailId=sent.letter.id;sent.letter.arrival=m.responses.at(-1).arrival}}
  }
  return {ok:true, open:choice === 'war_council' ? 'military' : choice === 'view_location' ? m.context?.region : null};
}

export function syncPeaceLetters(s) {
  const mail=initializeMail(s);
  for (const inquiry of s.inquiries || []) {
    if (inquiry.subject !== 'peace' || inquiry.target !== s.player || inquiry.status !== 'awaiting_decision' || inquiry.mailId) continue;
    const senderId=senderFor(s,inquiry.actor);
    const result=sendLetter(s,{senderId,senderInstitution:senderId?null:inquiry.actor,senderFaction:inquiry.actor,
      recipient:s.player,category:'diplomatic',priority:'important',
      subject:['Peace proposal','议和提议'],
      body:[`${name(inquiry.actor)[0]} requests an end to the present war. The war continues until an acceptance reaches the sender.`,`${name(inquiry.actor)[1]}请求结束当前战争。接受书送达发信方之前，战争仍将继续。`],
      options:['accept','refuse','war_council'],context:{kind:'peace'}});
    if (result.ok) {
      inquiry.mailId=result.letter.id;
      result.letter.arrival=monthIndex(s.year,s.month);
      result.letter.delivery='received';
      mail.generated['peace:'+result.letter.id]=true;
    }
  }
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
    const occasions=[
      [['Invitation to a private banquet','私人宴会邀请'],['Your Excellency, I would be honored to receive you at a modest banquet.','阁下，若蒙光临寒舍薄宴，不胜荣幸。']],
      [['Invitation to a court dinner','宫廷晚宴邀请'],['May I invite you to a court dinner in our city?','敢请阁下莅临本城宫廷晚宴。']],
      [['Invitation to a political meeting','政务聚会邀请'],['Several officials will gather for a private discussion of court affairs.','数位官员将私下商议朝中事务，谨邀阁下莅临。']],
      [['Invitation to a scholarly gathering','学术聚会邀请'],['A small gathering of scholars would welcome your company.','学者小聚，敬邀阁下。']],
      [['Invitation to a family celebration','家族庆典邀请'],['My household invites you to a modest family celebration.','寒舍将举行家族小庆，恭请阁下莅临。']]
    ];
    if(['caesar','senate'].includes(s.player))occasions.push([['Invitation to a Senate gathering','元老院聚会邀请'],['A gathering of senators will meet in our city.','本城将举行元老聚会，谨邀阁下。']]);
    if((s.world.religiousInstitutions||[]).some(o=>o.region===sender.location))occasions.push([['Invitation to a civic festival','公民节庆邀请'],['A local institution will host a civic festival.','本地机构将举办公民节庆，谨邀阁下。']]);
    if((s.wars||[]).some(w=>w.includes(s.player)))occasions.push([['Invitation to a military ceremony','军中仪式邀请'],['A ceremony will honor service in this campaign.','将举行仪式表彰本次战役中的服役者。']]);
    const [subject,body]=occasions[Math.abs(s.year)%occasions.length];
    sendLetter(s,{senderId,senderFaction:s.player,recipient:s.player,category:'invitations',priority:'routine',
      subject,body,
      options:['accept','decline','representative','private_meeting','ignore'],context:{kind:'banquet',leader,region:sender.location},expires:monthIndex(s.year,s.month)+4});
  }
  if(s.month===10&&!mail.generated[`flavor:${s.year}:${s.player}`]){
    const seed=sender.personalitySeed||0,war=(s.wars||[]).some(w=>w.includes(s.player));
    const subjects=[
      [['A courtly greeting','宫廷问候'],['Your Excellency, I send greetings and hope this season finds the court at peace.','阁下，谨致问候，愿本季宫廷安宁。'],['respond_warmly','respond_formally','ignore']],
      [['A few verses','诗笺数行'],['A quiet morning brought a few verses to mind; I offer them for your amusement.','清晨偶得诗句数行，谨呈阁下闲览。'],['respond_warmly','respond_formally','ignore']],
      [['A matter of counsel','请教一事'],['May I ask how you judge the temper of our court this season?','敢问阁下如何看待本季朝中人心？'],['respond_warmly','respond_formally','ignore']],
      [['A request for audience','请求觐见'],['If the court allows, I would ask for a brief audience while we are in the same city.','若朝廷允许，愿趁同城之便求见片刻。'],['grant_audience','respond_formally','ignore']],
      [['A modest favor','一项小小请求'],['I ask for a modest grant from the court; I know its coffers have other demands.','谨请求朝廷小额资助，亦知国库另有重任。'],['grant_favor','respond_formally','ignore']],
      [['A family matter','家事问安'],['My household sends its respects and hopes your family is well.','家中谨致敬意，愿阁下家人平安。'],['respond_warmly','respond_formally','ignore']]
    ];
    if(war)subjects.push([['News from the court','宫廷近讯'],['Your Excellency, the court awaits news of our forces and hopes for steadiness in your counsel.','阁下，宫中盼望前线音讯，也盼您持重筹谋。'],['respond_warmly','respond_formally','ignore']]);
    if(recipient.health!=='healthy')subjects.push([['Concern for your health','问候身体'],['The court has heard that you are unwell and hopes for your recovery.','宫中闻阁下身体欠安，谨祝早日康复。'],['respond_warmly','respond_formally','ignore']]);
    const [subject,body,options]=subjects[Math.abs(seed+s.year)%subjects.length];
    if(sendLetter(s,{senderId,senderFaction:s.player,recipient:s.player,category:'personal',subject,body,
      options,context:{kind:'personal_flavor',leader}}).ok)mail.generated[`flavor:${s.year}:${s.player}`]=true;
  }
}

function foreignCourtNotes(s){
  const mail=initializeMail(s);
  if(s.month!==6)return;
  const candidates=Object.keys(s.factions).filter(id=>id!==s.player&&id!=='rebels'&&s.regions.some(r=>r.owner===id)&&!atWar(s,id,s.player));
  let routine=0;
  for(const faction of candidates){
    const relation=s.relations[pair(faction,s.player)]||0;
    const key=`court:${s.year}:${faction}`;
    if(mail.generated[key])continue;
    const senderId=senderFor(s,faction);
    const base={senderId,senderInstitution:senderId?null:faction,senderFaction:faction,recipient:s.player,category:'diplomatic'};
    const war=(s.wars||[]).find(w=>w.includes(faction)&&!w.includes(s.player));
    const allied=(s.alliances||[]).some(a=>a.includes(faction)&&a.includes(s.player));
    let offer=null;
    if(s.world.disputes?.[faction]?.war&&canMediate(s,s.player,faction))offer={priority:'important',subject:['Request for mediation','请求调停'],
      body:[`${name(faction)[0]} asks your court to consider mediation in its dynastic conflict.`,` ${name(faction)[1]}请求本朝考虑调停其王朝争端。`],
      options:['mediate','decline','ignore'],context:{kind:'mediation'}};
    else if(war&&relation>=20&&s.factions[s.player].treasury>=5)offer={priority:'important',subject:['Request for support','请求援助'],
      body:[`${name(faction)[0]} requests five treasury units in its ongoing war.`,` ${name(faction)[1]}请求在当前战争中获得五单位国库援助。`],
      options:['send_aid','decline','ignore'],context:{kind:'aid_request',enemy:war.find(id=>id!==faction)}};
    else if(relation<=-45)offer={priority:'important',subject:['Demand for satisfaction','要求交涉'],
      body:[`${name(faction)[0]} demands a settlement of six treasury units to ease the present dispute.`,` ${name(faction)[1]}要求以六单位国库达成和解，缓解当前争端。`],
      options:['concede','reject','ignore'],context:{kind:'ultimatum'}};
    else if(relation<=-25)offer={priority:'important',subject:['A diplomatic complaint','外交申诉'],
      body:[`${name(faction)[0]}'s court objects to the current strain in relations and asks for an answer.`,` ${name(faction)[1]}宫廷对当前紧张关系表示不满，请求答复。`],
      options:['apologize','defend','ignore'],context:{kind:'complaint',relationAtSending:relation}};
    else if(relation>=40&&!allied)offer={priority:'important',subject:['Proposal of full alliance','全面结盟提议'],
      body:[`${name(faction)[0]} proposes a full alliance. Your answer must return before either court is bound.`,` ${name(faction)[1]}提议全面结盟。答复送达前，双方均不受约束。`],
      options:['accept','reject','negotiate'],context:{kind:'full_alliance'}};
    else if(routine<2){
      const known=mail.messages.some(m=>m.senderFaction===faction&&m.recipient===s.player);
      offer={priority:'routine',subject:known?['Greetings from the court','宫廷问候']:['Formal introduction','正式致意'],
        body:known?[`${name(faction)[0]} sends a courteous greeting to your court.`,` ${name(faction)[1]}谨向本朝致以问候。`]:[`${name(faction)[0]} introduces its court and opens correspondence.`,` ${name(faction)[1]}正式致函，愿开启往来。`],
        options:['welcome','formal_reply','ignore'],context:{kind:'greeting'}};
      routine++;
    }
    if(offer&&sendLetter(s,{...base,...offer,expires:monthIndex(s.year,s.month)+18}).ok)mail.generated[key]=true;
  }
}

export function treatyLetter(s, senderFaction, recipient, treatyType = 'non_aggression') {
  const senderId = senderFor(s, senderFaction);
  if (!AGREEMENT_TYPES[treatyType]||!s.factions[senderFaction]||!s.factions[recipient]||senderFaction===recipient||atWar(s, senderFaction, recipient) || (s.mail?.accessRestrictions?.[senderFaction]??-Infinity)>monthIndex(s.year,s.month) || (s.agreements || []).some(a => a.status === 'active' && a.type === treatyType && a.parties.includes(senderFaction) && a.parties.includes(recipient))) return {ok:false, reason:'unavailable'};
  const label={non_aggression:['non-aggression','互不侵犯'],trade:['trade','贸易'],military_access:['military access','军事通行'],intelligence:['intelligence sharing','情报共享'],defensive:['defensive','防御'],offensive:['offensive','共同进攻'],military_support:['military support','军事援助'],political:['political cooperation','政治合作'],guarantee:['guarantee','保障']}[treatyType];
  return sendLetter(s, {
    senderId, senderInstitution:senderId?null:senderFaction,senderFaction, recipient, category:'diplomatic', priority:'important',
    subject:[`Proposed accord with ${name(senderFaction)[0]}`,`与${name(senderFaction)[1]}的协定提议`],
    body:[`Our court proposes a ${label[0]} accord. Your answer will be carried back by courier.`,`本朝提议缔结${label[1]}协定。答复将由信使带回。`],
    options:['accept','reject','negotiate'], context:{kind:'treaty', treatyType},
    expires:monthIndex(s.year, s.month) + 18,politicalState:{agreementType:treatyType}
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
    applyWarPersonnel(s,war,eventId);
    for (const [senderFaction, recipient] of [[war[0], war[1]], [war[1], war[0]]]) {
      if (senderFaction !== war[0]) continue;
      const senderId = senderFor(s, senderFaction);
      sendLetter(s, {
        senderId, senderInstitution:senderId ? null : senderFaction, senderFaction, recipient,
        category:'diplomatic', priority:'critical', eventId,
        subject:['Declaration of war','宣战文书'],
        body:[`${name(senderFaction)[0]} has declared war. Hostilities are already in effect; this dispatch confirms the decision.`,`${name(senderFaction)[1]}已宣战。敌对状态现已生效；此书正式告知该决定。`],
        options:['negotiate','condemn','seek_allies','war_council','ignore'], context:{kind:'war',other:senderFaction}
      });
    }
  }
}

// Chronicle entries contain only events the player is entitled to know.
// A letter records that observation once, with the original event as its source.
export function chronicleLetters(s, entries) {
  const mail=initializeMail(s);
  mail.activeSieges||={};
  const underway=new Set((s.armies||[]).filter(a=>a.owner===s.player&&a.siege).map(a=>`${a.id}:${a.siege.region}`));
  for(const key of Object.keys(mail.activeSieges))if(!underway.has(key))delete mail.activeSieges[key];
  for(const e of entries||[]){
    if(e.kind==='economy'||e.kind==='movement'||e.kind==='diplomacy'&&e.change==='war')continue;
    const visibleText=`${e.en||''} ${e.zh||''}`;
    const institutionalEvent=e.kind==='dispatch'&&/election|elected|选举|当选|corruption|贪腐|腐败/i.test(visibleText);
    const recognitionEvent=e.kind==='dispatch'&&/recognition|recognized|承认/i.test(visibleText);
    if(e.priority==='routine'&&e.kind!=='intelligence'&&!institutionalEvent&&!recognitionEvent)continue;
    if(e.kind==='siege'){
      const key=`${e.armyId}:${e.region}`;
      if(mail.activeSieges[key])continue;
      mail.activeSieges[key]=true;
    }
    const eventId=`chronicle:${e.id}`;
    if(mail.generated[eventId])continue;
    const category=['territory','battle','army','siege'].includes(e.kind)?'military'
      :e.kind==='character'?'personal':e.kind==='intelligence'?'government'
      :e.kind==='government'||e.topic==='economy'||institutionalEvent?'government':e.topic==='battle'||e.topic==='siege'?'military':'diplomatic';
    const commander=e.ownArmyId&&s.armies.find(a=>a.id===e.ownArmyId)?.commanderId;
    const senderId=(commander&&s.world.characters[commander]?.alive?commander:null)||
      (e.characterId&&s.world.characters[e.characterId]?.alive?e.characterId:null);
    const subject=institutionalEvent?(/election|elected|选举|当选/i.test(visibleText)?['Election result','选举结果']:['Corruption report','腐败报告']):recognitionEvent?['Recognition notice','承认通报']:({territory:['Provincial dispatch','行省急报'],battle:['Battle report','战斗报告'],army:['Army report','军情报告'],siege:['Siege report','围城报告'],government:['Government notice','政务通报'],character:['Court notice','宫廷通报'],intelligence:['Intelligence report','情报报告']}[e.kind]||['Campaign dispatch','战役通报']);
    const options=category==='military'?(e.region?['view_location','war_council','request_reinforcements','contact_governor','acknowledge']:['war_council','acknowledge'])
      :category==='government'?['review_budget','acknowledge']:['acknowledge'];
    const result=sendLetter(s,{senderId,senderInstitution:senderId?null:s.player,senderFaction:s.player,recipient:s.player,
      category,priority:e.priority==='critical'?'critical':e.priority==='major'?'important':'routine',eventId,
      subject,body:[formatChronicleEntry(e,'en'),formatChronicleEntry(e,'zh')],
      source:e.region||home(s,s.player),destination:home(s,s.player),
      options,context:{kind:'chronicle',region:e.region||null,entryId:e.id},
      confidence:e.kind==='intelligence'?'unverified':null,
      politicalState:{kind:e.kind,topic:e.topic||null}});
    if(result.ok)mail.generated[eventId]=true;
  }
}

export function advanceMail(s, actions = {}) {
  const mail = initializeMail(s), now = monthIndex(s.year, s.month);
  const last=mail.generated.lastReliefMonth??-Infinity;
  if(now-last>=8&&!mail.messages.some(m=>m.context?.kind==='provincial_relief'&&m.delivery!=='lost'&&!m.responses.length)){
    const place=s.regions.filter(r=>r.owner===s.player&&r.loyalty<55).sort((a,b)=>a.loyalty-b.loyalty)[0];
    const officer=place&&Object.values(s.world.characters).find(p=>p.alive&&p.faction===s.player&&p.location===place.id&&p.id!==senderFor(s,s.player));
    if(place&&officer){const result=sendLetter(s,{senderId:officer.id,senderFaction:s.player,recipient:s.player,category:'government',priority:place.loyalty<35?'important':'routine',source:place.id,subject:[`Relief request from ${place.name[0]}`,`${place.name[1]}赈济请求`],body:[`Local loyalty is ${place.loyalty}. I ask for provincial relief: full aid costs 12 treasury, limited aid costs 5; alternatively request a report or decline.`,`当地忠诚度为 ${place.loyalty}。请考虑赈济：全额花费12国库，有限援助花费5；亦可索取报告或拒绝。`],options:['full_relief','limited_relief','request_report','decline'],context:{kind:'provincial_relief',region:place.id}});if(result.ok)mail.generated.lastReliefMonth=now}
  }
  for (const event of mail.events) {
    if (event.status !== 'scheduled' || event.date > now) continue;
    if (event.type === 'audit') {
      event.status='completed';
      const f=s.factions[s.player];
      sendLetter(s,{senderInstitution:s.player,senderFaction:s.player,recipient:s.player,category:'government',priority:'important',
        subject:['Requested treasury audit','受命国库审计'],
        body:[`At completion of the audit: treasury ${f.treasury}, food ${f.food}, manpower ${f.manpower}.`,`审计完成时：国库 ${f.treasury}，粮食 ${f.food}，兵源 ${f.manpower}。`],
        options:['review_budget','acknowledge'],threadId:mail.messages.find(m=>m.id===event.letterId)?.threadId,context:{kind:'treasury'}});
      continue;
    }
    if(event.type==='governor'||event.type==='consult'){
      event.status='completed';
      const place=s.regions.find(r=>r.id===event.region),f=s.factions[s.player];
      sendLetter(s,{senderInstitution:s.player,senderFaction:s.player,recipient:s.player,category:event.type==='consult'?'government':'military',priority:'routine',
        subject:event.type==='consult'?['Financial consultation','财政磋商']:['Governor response','总督回函'],
        body:event.type==='consult'?[`The current treasury holds ${f.treasury}; the next budget remains subject to changing events.`,`当前国库存有 ${f.treasury}；下期预算仍受局势变化影响。`]:[
          `${place?.name?.[0]||event.region}: ${place?.owner===s.player?`loyalty ${place.loyalty}, fortification ${place.fort}`:'the province is no longer under our authority'}.`,
          `${place?.name?.[1]||event.region}：${place?.owner===s.player?`忠诚度 ${place.loyalty}，防御等级 ${place.fort}`:'此地已不受本方管辖'}。`],
        threadId:mail.messages.find(m=>m.id===event.letterId)?.threadId,options:['acknowledge'],context:{kind:'report'}});
      continue;
    }
    const host=s.world.characters[event.hostId],participant=s.world.characters[event.participantId||event.guestId];
    event.status=host?.alive&&participant?.alive&&host.location===event.venue&&participant.location===event.venue&&participant.health!=='incapacitated'?'held':'missed';
    if(event.status==='held'){
      const key=pair(event.hostId,participant.id),bond=s.world.personalRelations[key]||{trust:0,meetings:0};
      bond.trust=Math.min(100,bond.trust+(event.representative?1:event.privateMeeting?3:2));bond.meetings++;s.world.personalRelations[key]=bond;
    }
    const original=mail.messages.find(m=>m.id===event.letterId);
    if(original)sendLetter(s,{senderId:host?.alive?event.hostId:null,senderInstitution:host?.alive?null:s.player,senderFaction:s.player,recipient:s.player,category:'invitations',priority:'routine',
      subject:event.status==='held'?['The gathering was held','宴会已举行']:['The gathering was missed','宴会未能举行'],
      body:event.status==='held'?['The invited guest and host met as arranged.','受邀者与主人如约会面。']:['The invited guest and host could not meet at the appointed place.','受邀者与主人未能在约定地点会面。'],
      threadId:original.threadId,options:['acknowledge'],context:{kind:'invitation_result'}});
  }
  for (const m of [...mail.messages]) for (const response of m.responses) {
    if (response.resolved || response.arrival === null || response.arrival > now) continue;
    response.resolved = true;
    const reply=response.replyMailId?mail.messages.find(x=>x.id===response.replyMailId):null;
    if(courierLost(s,reply||m,reply?'outbound':'return')){response.outcome='lost';continue}
    if(m.context?.kind==='complaint'||m.context?.kind==='greeting'){
      const key=pair(m.senderFaction,m.recipient);
      const delta=m.context.kind==='complaint'?({apologize:4,defend:-2}[response.choice]||0):(response.choice==='welcome'?2:0);
      s.relations[key]=Math.max(-100,Math.min(100,(s.relations[key]||0)+delta));
      if(m.context.kind==='complaint')rememberPoliticalEvent(s,m.senderFaction,m.recipient,'complaint_answer',delta);
      response.outcome='delivered';
      continue;
    }
    if(m.context?.kind==='full_alliance'){
      const accepted=response.choice==='accept'&&!atWar(s,m.senderFaction,m.recipient)&&actions.diplomacy?.(s,m.senderFaction,m.recipient,'alliance')===true;
      response.outcome=accepted?'accept':response.choice==='accept'?'failed':response.choice;
      if(response.choice==='reject')rememberPoliticalEvent(s,m.senderFaction,m.recipient,'alliance_refused',-2);
      if(m.recipient===s.player)replyNotice(s,m,accepted?['The alliance is sealed.','同盟已经缔结。']:['Alliance negotiations ended.','结盟商议已结束。'],accepted?['Both courts are now bound by the alliance.','双方现受同盟约束。']:['No alliance was concluded.','双方未缔结同盟。']);
      continue;
    }
    if(m.context?.kind==='aid_request'||m.context?.kind==='ultimatum'){
      const accepted=response.choice===(m.context.kind==='aid_request'?'send_aid':'concede'),amount=m.context.kind==='aid_request'?5:6;
      if(accepted&&s.factions[m.senderFaction])s.factions[m.senderFaction].treasury+=amount;
      const key=pair(m.senderFaction,m.recipient);
      s.relations[key]=Math.max(-100,Math.min(100,(s.relations[key]||0)+(accepted?(m.context.kind==='aid_request'?4:8):-1)));
      rememberPoliticalEvent(s,m.senderFaction,m.recipient,accepted?'aid_or_settlement':'request_refused',accepted?3:-1);
      response.outcome=accepted?'accepted':'refused';
      if(m.recipient===s.player)replyNotice(s,m,accepted?['Your answer was received.','贵方答复已送达。']:['The request was declined.','所请遭到拒绝。'],accepted?['The court acknowledges the delivered settlement.','本朝确认所议物资已送达。']:['The court has recorded your refusal.','本朝已记下贵方拒绝。']);
      continue;
    }
    if(m.context?.kind!=='treaty')continue;
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
      rememberPoliticalEvent(s,m.senderFaction,m.recipient,'proposal_refused',-2);
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
    if(courierLost(s,m)){m.delivery='lost';continue}
    m.delivery = 'received';
    if(m.recipient===s.player&&m.context?.kind==='support_result'&&m.context.transfer>0){s.factions[s.player].treasury+=m.context.transfer;m.context.transfer=0}
    if(m.recipient!==s.player&&m.context?.kind==='allied_support'){
      const enemy=m.context.enemy,ally=m.recipient,relation=s.relations[pair(ally,s.player)]||0;
      const help=relation>=20&&s.factions[ally].treasury>=12&&atWar(s,s.player,enemy);
      if(help)s.factions[ally].treasury-=5;
      const senderId=senderFor(s,ally);
      sendLetter(s,{senderId,senderInstitution:senderId?null:ally,senderFaction:ally,recipient:s.player,
        category:'diplomatic',priority:'important',threadId:m.threadId,
        subject:help?['Support dispatched','援助已送出']:['Support declined','援助请求遭拒'],
        body:help?['The allied court has sent 5 treasury units in support.','盟邦已送出 5 单位国库援助。']:['The allied court cannot offer support at present.','盟邦目前无法提供援助。'],options:['acknowledge'],context:{kind:'support_result',transfer:help?5:0}});
    }
    if (m.recipient !== s.player && m.context?.kind === 'treaty' && actions.proposeAgreement) {
      const key = pair(m.senderFaction, m.recipient),def=AGREEMENT_TYPES[m.context.treatyType],willingness=(s.relations[key] || 0)>=def.threshold&&s.factions[m.senderFaction].treasury>=def.cost;
      m.responses.push({choice:willingness ? 'accept' : 'reject', year:s.year, month:s.month, ai:true,
        arrival:now + courierMonths(s,m.destination,m.source), resolved:false});
    }
    if (m.recipient === s.player && m.priority === 'routine' && mail.preferences.autoArchiveRoutine) {
      m.archived = true; m.read = true;
    }
  }
  // One distinct proposal per foreign court each year, bounded for long campaigns.
  const factions = Object.keys(s.factions).filter(id => id !== 'rebels' && s.regions.some(r => r.owner === id));
  if (s.month === 2) for (const sender of factions.filter(id=>id!==s.player)) {
    const candidates=factions.filter(id=>id!==sender&&!atWar(s,sender,id)).sort((a,b)=>((s.relations[pair(sender,b)]||0)-(s.relations[pair(sender,a)]||0))||(a===s.player?-1:b===s.player?1:0));
    for(const target of candidates){
      const relation=s.relations[pair(sender,target)]||0;
      const types=relation>=35?['defensive','trade','military_access','non_aggression']:relation>=20?['trade','military_access','non_aggression']:['non_aggression'];
      const type=types.find(t=>relation>=AGREEMENT_TYPES[t].threshold&&s.factions[sender].treasury>=AGREEMENT_TYPES[t].cost&&!(s.agreements||[]).some(a=>a.status==='active'&&a.type===t&&a.parties.includes(sender)&&a.parties.includes(target)));
      if(type&&treatyLetter(s,sender,target,type).ok){mail.generated[`accord:${s.year}:${sender}:${target}`]=true;break}
    }
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
        options:['review_budget','audit','consult_official','acknowledge'], context:{kind:'treasury'},source:home(s,s.player), destination:home(s,s.player)});
      // Government institutions may address their own court.
      if (!m.ok) delete mail.generated[id];
    }
  }
  localCorrespondence(s);
  foreignCourtNotes(s);
  return mail;
}
