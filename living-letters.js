import {CHARACTER_CATALOG,ageRange} from './characters.js?v=succession-ui-recovery-1';
import {FACTIONS} from './data.js?v=phase-x-1';
import {campaignDate} from './campaign-date.js?v=calendar-1';

const label=(id,language)=>CHARACTER_CATALOG[id]?.name?.[language]||FACTIONS[id]?.short?.[language]||id;
const role=(id,language)=>CHARACTER_CATALOG[id]?.role?.[language]||'';
const region=(s,id,language)=>s.regions.find(r=>r.id===id)?.name?.[language]||id;
const index=(s)=>s.year*12+s.month;
const parts=date=>{const year=Math.floor((date-1)/12);return {year,month:date-year*12}};
const dateText=(date,language)=>{const {year,month}=parts(date);return campaignDate(month,year,language)};
const hash=value=>[...String(value)].reduce((n,c)=>Math.imul(n^c.charCodeAt(0),16777619)>>>0,2166136261);
const pick=(items,key)=>items[hash(key)%items.length];
const roman=id=>['caesar','senate'].includes(id);
const title=(id,language)=>role(id,language);
const standing=(s,a,b)=>s.world?.personalRelations?.[[a,b].sort().join(':')]?.trust||0;
const paragraph=(...xs)=>xs.filter(Boolean).join('\n\n');

// The venue is a persistent, fictional household within a real campaign theater.
// Its marker uses the theater's existing cartographic anchor, never invented coordinates.
export function registerVenue(s,hostId,territoryId){
 const host=s.world?.characters?.[hostId];
 const theater=s.regions.find(r=>r.id===territoryId);
 if(!host?.alive||!theater)return null;
 s.mail.venues||={};
 const id=`residence:${hostId}:${territoryId}`;
 if(!s.mail.venues[id])s.mail.venues[id]={
  id,territoryId,hostId,kind:'residence',
  name:[`${label(hostId,0)}'s residence at ${theater.city||theater.name[0]}`,`${theater.city||theater.name[1]}的${label(hostId,1)}宅邸`],
  mapAnchor:territoryId,fictional:true
 };
 return s.mail.venues[id];
}

function banquetFood(s,host,territory,date){
 const {month}=parts(date),warm=month>=4&&month<=9;
 const culture=CHARACTER_CATALOG[host.id]?.culture?.[0]||'Roman';
 const rich=(host.wealth??host.influence??50)>=70;
 if(/Han|Chinese/.test(culture))return warm?
  [['millet, seasonal vegetables, roast meat and warm wine','黍米、时蔬、炙肉与温酒'],['grain, preserved fruits and warm wine','谷食、果脯与温酒']][rich?0:1]:
  [['millet, stewed meat and warm wine','黍米、炖肉与温酒'],['grain, broth and warm wine','谷食、羹汤与温酒']][rich?0:1];
 if(/Parthian|Numidian|Armenian|Central|Xiongnu/.test(culture))return rich?['roasted meat, flatbread and local wine','烤肉、饼与本地酒']:['bread, curds and a warm meat dish','饼、酪与热肉食'];
 if(rich)return warm?['bread, olives, roasted meat, figs and local wine','面包、橄榄、烤肉、无花果与本地葡萄酒']:['warm bread, roast meat, dried figs and wine','热面包、烤肉、干无花果与葡萄酒'];
 return warm?['bread, olives, seasonal fruit and local wine','面包、橄榄、时令水果与本地葡萄酒']:['bread, lentils, dried fruit and wine','面包、扁豆、干果与葡萄酒'];
}

export function banquetInvitation(s,hostId,recipientId){
 const host=s.world?.characters?.[hostId],recipient=s.world?.characters?.[recipientId];
 if(!host?.alive||!recipient?.alive||!host.location||!s.regions.some(r=>r.id===host.location))return null;
 const venue=registerVenue(s,hostId,host.location),date=index(s)+4;
 const guests=Object.values(s.world.characters).filter(p=>p.alive&&!p.missing&&!p.travel&&p.id!==hostId&&p.id!==recipientId&&p.location===host.location&&p.faction===host.faction&&(!ageRange(p.id,s.year)||ageRange(p.id,s.year)[0]>=16)&&
  !['seriously_ill','dying','deceased','incapacitated'].includes(p.health)&&CHARACTER_CATALOG[p.id]?.name)
  .sort((a,b)=>(b.influence||0)-(a.influence||0)).slice(0,3).map(p=>p.id);
 const bond=standing(s,hostId,recipientId),war=(s.wars||[]).some(w=>w.includes(host.faction));
 const ambitious=(host.ambition||0)>=65,learned=(host.education||0)>=2,wealth=(host.wealth??host.influence??50);
 const reason=war?'service and the court’s next decisions':ambitious?'the duties now before our court':bond>=15?'renewing a friendship':learned?'an exchange of ideas':'conversation among the court’s companions';
 const reasonZh=war?'酬谢军中效劳，并商谈朝廷接下来的安排':ambitious?'商谈朝廷眼前的职责':bond>=15?'重叙交情':learned?'交换见解':'与同僚相聚交谈';
 const theater=s.regions.find(r=>r.id===host.location);
 const activity=war?['a reading of recent campaign accounts','共阅近期军务记录']:wealth>=70&&roman(host.faction)&&['forest','hills'].includes(theater?.terrain)?['a hunt in the nearby grounds, if weather permits','若天气允许，到附近林地狩猎']:learned?['a reading of verse and discussion','诵读诗文并讨论']:pick([
  ['music and conversation in the courtyard','庭院中的乐曲与谈话'],
  ['a discussion of local affairs after supper','饭后商谈本地事务'],
  ['a short walk beyond the residence after supper','饭后在宅邸外散步'],
  ['a hunt in the nearby grounds, if weather permits','若天气允许，到附近林地狩猎']
 ],`${hostId}:${date}`);
 const purpose=war?['the demands of the current campaign','当前战事所需']:ambitious?['appointments and service at court','朝中任职与效劳之事']:bond>=15?['the duties that have kept us apart','近来使我们难得相聚的职责']:['the needs of our people in this theater','本战区民众的需要'];
 const welcome=wealth>=70?['It would honor my household to receive you.','若能迎阁下莅临，家门不胜荣幸。']:bond>=15?['It has been too long since we spoke without a council around us.','离开议事厅好好谈话，已是久违。']:learned?['I hope the table will give us room to think aloud.','愿一席清谈容我们畅言。']:['I hope you can spare the evening.','盼阁下能拨冗共度一晚。'];
 const food=banquetFood(s,host,venue.territoryId,date);
 const venueName=venue.name,where=[region(s,venue.territoryId,0),region(s,venue.territoryId,1)];
 const guestNames=guests.map(id=>[label(id,0),label(id,1)]);
 const guestLine=guestNames.length?
  [`I have also invited ${guestNames.map(x=>x[0]).join(', ')}; their answers are still pending.`,`我也邀请了${guestNames.map(x=>x[1]).join('、')}；他们的答复尚待送达。`]:
  ['No other guest has yet confirmed, so our company may be small.','其余宾客尚未确认，席间或许清静。'];
 const body=[
  paragraph(`To ${label(recipientId,0)}${title(recipientId,0)?`, ${title(recipientId,0)}`:''},`,
   `${welcome[0]} I write to invite you to ${venueName[0]} in ${where[0]} on ${dateText(date,0)}, the fifteenth day of the month, at dusk. We shall gather for ${reason}.`,
   `My household will serve ${food[0]}. Afterwards I propose ${activity[0]}. ${guestLine[0]}`,
   `If you are willing, I should also like to speak with you about ${purpose[0]}; there is no need to settle it at table. Please tell me whether you can attend or would prefer a private conversation.`,
   `With respect,\n${label(hostId,0)}${title(hostId,0)?` · ${title(hostId,0)}`:''}`),
  paragraph(`致${label(recipientId,1)}${title(recipientId,1)?`（${title(recipientId,1)}）`:''}：`,
   `${welcome[1]}谨邀阁下于${dateText(date,1)}十五日黄昏，莅临${where[1]}的${venueName[1]}。此次设宴，是为${reasonZh}。`,
   `家中备有${food[1]}。餐后将${activity[1]}。${guestLine[1]}`,
   `若蒙出席，我也想同阁下谈谈${purpose[1]}；此事不必在席间定夺。请回信告知能否赴宴，或是否更愿私下见面。`,
   `谨致敬意，\n${label(hostId,1)}${title(hostId,1)?` · ${title(hostId,1)}`:''}`)
 ];
 return {body,venue,date,day:15,time:['at dusk','黄昏'],guestIds:guests,activity,food,purpose,region:venue.territoryId};
}

// A genre is selected from verified context; supplied factual notices remain intact.
export function composeLetter(s,spec){
 const kind=spec.context?.kind,from=spec.senderId||spec.senderFaction,to=spec.recipientId||s.world?.leadership?.[spec.recipient]?.[0]||spec.recipient;
 const name=language=>label(from,language),recipient=language=>label(to,language);
 const signature=language=>language?`谨上\n${name(1)}`:`Respectfully,\n${name(0)}`;
 const base=spec.body||['',''];
 if(kind==='banquet'&&spec.context?.invitation)return spec.context.invitation.body;
 if(kind==='war'){
  const grievance=(s.relations?.[[spec.senderFaction,spec.recipient].sort().join(':')]??0)<-30;
  const actor=s.world?.characters?.[spec.senderId],proud=(actor?.ambition??0)>=65;
  const opening=proud?['I will not conceal the judgment of my court.','本朝决定，无须隐瞒。']:grievance?['Our envoys have returned without satisfaction.','使者未能带回令人满意的答复。']:['I write with the gravity this decision deserves.','此事重大，谨以正式文书相告。'];
  return [
   paragraph(`To the court of ${recipient(0)},`,`${opening[0]} Relations between our courts have failed. ${grievance?'Our grievances have not been remedied.':'Our claims and security can no longer be settled by correspondence.'}`,`By the authority of ${name(0)}, a state of war now exists between our courts. We demand that your forces cease hostile movement and that you open negotiations if peace is sought. This dispatch records a decision already in force.`,signature(0)),
   paragraph(`致${recipient(1)}朝廷：`,`${opening[1]}两方交涉已告破裂。${grievance?'先前争议未获解决。':'双方主张与安危已无法仅凭书信解决。'}`,`奉${name(1)}之命，双方现处于战争状态。我方要求贵方停止敌对行军；若欲求和，请开启谈判。此信确认已经生效的决定。`,signature(1))
  ];
 }
 if(kind==='treasury'){
  const f=s.factions[spec.recipient];return [
   paragraph(`To the court of ${recipient(0)},`,`At the time of writing, the treasury holds ${f.treasury}; food reserves stand at ${f.food}, and available manpower at ${f.manpower}. These are current balances, not a forecast of revenue or expense.`,`The court may review the budget, commission an audit, or seek an official’s advice before changing policy.`,signature(0)),
   paragraph(`致${recipient(1)}朝廷：`,`落笔时国库存有 ${f.treasury}，粮食储备 ${f.food}，可用兵源 ${f.manpower}。这些是当前存量，并非收支预测。`,`朝廷可审阅预算、委托审计，或先向官员征询意见，再决定政策。`,signature(1))];
 }
 if(kind==='treaty'||kind==='full_alliance'){
  const type=spec.context?.treatyType||'alliance';
  return [
   paragraph(`To ${recipient(0)},`,base[0],`Our court proposes ${type.replaceAll('_',' ')}. An accord would set terms for the conduct of both sides; neither court is bound until your answer is returned and the terms are accepted.`,`Please reply with acceptance, refusal, or a request to negotiate. We will judge your answer against conditions when it reaches us.`,signature(0)),
   paragraph(`致${recipient(1)}：`,base[1],`本朝提议商定${type==='alliance'?'同盟':type.replaceAll('_',' ')}条款。答复送达且双方同意前，双方均不受此提议约束。`,`请回函接受、拒绝，或提出继续商议；答复送达时仍须核对届时局势。`,signature(1))];
 }
 if(kind==='complaint'||kind==='ultimatum'){
  const relation=spec.context?.relationAtSending??s.relations?.[[spec.senderFaction,spec.recipient].sort().join(':')]??0;
  return [paragraph(`To ${recipient(0)},`,`The present condition of relations between our courts is a cause for concern${relation<0?` (standing ${relation})`:''}. Our envoys have not found a settlement. ${kind==='ultimatum'?'We demand a payment of six treasury units as the proposed settlement.':'We ask for a direct answer to this grievance.'}`,`A courteous reply may reopen discussion; silence will leave the dispute unresolved.`,signature(0)),
   paragraph(`致${recipient(1)}：`,`两朝关系持续紧张${relation<0?`（关系值 ${relation}）`:''}，使者尚未寻得和解办法。${kind==='ultimatum'?'我方要求以六单位国库支付作为和解条件。':'我方请求就此争议直接答复。'}`,`礼貌的回函或可重启商议；沉默则使争议悬而未决。`,signature(1))];
 }
 if(kind==='personal_age'||kind==='personal_flavor'||kind==='greeting'){
  return [paragraph(`To ${recipient(0)},`,base[0],`I hope your answer finds a safe road back to me.`,signature(0)),
   paragraph(`致${recipient(1)}：`,base[1],`若蒙回函，愿信使一路平安。`,signature(1))];
 }
 if(kind==='aid_request'||kind==='mediation'){
  return [paragraph(`To ${recipient(0)},`,base[0],`Your answer will determine whether we can proceed. I ask that your court weigh the current obligations before replying.`,signature(0)),
   paragraph(`致${recipient(1)}：`,base[1],`贵方的答复将决定此事能否继续，恳请先衡量当前承担之责。`,signature(1))];
 }
 if(kind==='chronicle'&&spec.context?.region&&s.regions.some(r=>r.id===spec.context.region)){
  const place=[region(s,spec.context.region,0),region(s,spec.context.region,1)];
  return [paragraph(`Dispatch from ${place[0]} to the court of ${recipient(0)},`,base[0],`This account records what reached our court at the time of writing. The situation may change before further orders arrive.`,signature(0)),
   paragraph(`自${place[1]}致${recipient(1)}朝廷：`,base[1],`此信仅载落笔时已传至朝廷的情况；后续命令到达前，局势仍可能变化。`,signature(1))];
 }
 if(kind==='appointment_request'){
  const office=spec.context.officeName||['an assignment','一项职务'];
  return [paragraph(`To ${recipient(0)},`,`I ask that my candidacy for ${office[0]} be considered. ${base[0]}`,`I await the court’s decision and will not assume the appointment without it.`,signature(0)),
   paragraph(`致${recipient(1)}：`,`谨请考虑我出任${office[1]}之事。${base[1]}`,`朝廷裁决之前，我不会自称受任。`,signature(1))];
 }
 return base;
}

export function composeReply(s,m,choice,representativeName=null){
 if(choice==='ignore')return null;
 const from=s.world?.leadership?.[s.player]?.find(id=>s.world.characters[id]?.alive)||s.player;
 const strategicTarget=s.world?.strategicOffers?.find(offer=>offer.id===m.context?.offerId)?.target;
 const strategicEnemy=strategicTarget?[label(strategicTarget,0),label(strategicTarget,1)]:['the named enemy','来函所指敌国'];
 const subject=m.context?.kind==='banquet'?m.context.invitation?.venue?.name||[region(s,m.context.region,0),region(s,m.context.region,1)]:m.subject;
 const decisions={
  accept:[`I accept your invitation to ${subject[0]} and intend to attend at the appointed time.`,`我接受赴${subject[1]}之邀，拟按约定时间出席。`],
  decline:['I regret that I cannot attend. Please accept my thanks for the invitation.','承蒙相邀，惜不能赴约，谨致谢意。'],
  representative:[`I shall send ${representativeName?.[0]||'a representative'} in my place.`,`我将派${representativeName?.[1]||'代表'}代为出席。`],
  private_meeting:['I would prefer to discuss the matter with you privately at the appointed place.','我更希望在约定地点同您私下商谈。'],
  ask_guests:['Before I decide, please tell me which invited guests have answered.','决定之前，烦请告知哪些受邀宾客已经答复。'],
  send_gift:['I send a modest gift with my thanks for your invitation.','随函奉上一份薄礼，感谢相邀。'],
  speak_host:['I valued our conversation and shall remember the matter you raised.','我珍视席间谈话，也会记下您提出的事。'],
  meet_guest:['I was pleased to make the acquaintance of our fellow guest.','很高兴认识同席宾客。'],
  discuss_issue:['I am willing to continue discussing the issue you raised.','我愿继续商谈您提出的议题。'],
  join_activity:['The shared activity was a welcome respite from court affairs.','共同活动使我们暂离政务，甚觉愉快。'],
  leave_early:['I thank you for your hospitality, though my duties required an early departure.','感谢款待，只因公务在身，不得不提前告辞。'],
  negotiate:['I request that our envoys examine terms before further blood is shed.','谨请双方使者在更多流血之前商议条件。'],
  condemn:['I reject the grounds of your declaration and record my court’s condemnation.','我方拒绝贵方宣战理由，并正式记载本朝谴责。'],
  seek_allies:['I have asked our allies for support in the present war.','我已就当前战事向盟邦请求援助。'],
  accept_accord:['I accept the proposal under the terms stated in your letter.','我方接受来函所列条件。'],
  join_war:[`I accept your request for military cooperation against ${strategicEnemy[0]}. Our declaration of war is now in force; this answer still needs to reach your court.`,`我方接受对抗${strategicEnemy[1]}的军事协作请求。宣战已经生效；此回函仍须送达贵朝。`],
  refuse:['I decline your request to join the war. Our forces will not enter this conflict on the terms proposed.','我方谢绝加入战事的请求，不会依照来函条件参战。'],
  reject:['I cannot accept the terms you have proposed.','我方无法接受贵方所提条件。'],
  acknowledge:['Your report has been received and entered in the court record.','来报已收，业已载入朝廷记录。'],
  audit:['I have commissioned the requested audit; its actual cost has been charged to the treasury.','已命开展审计，实际费用已从国库支出。'],
  consult_official:['I request a consultation before setting the next budget.','请先召集官员商议，再确定下一期预算。'],
  send_aid:['Our treasury has committed the requested support. The transfer awaits delivery.','本朝国库已拨出所请援助，待送达后生效。'],
  concede:['I accept the proposed settlement and have set aside the required funds.','我方接受和解条件，已拨出所需款项。'],
  apologize:['I regret the strain between our courts and ask that our envoys speak again.','两朝关系紧张，本朝深感遗憾，愿使者重启商议。'],
  defend:['Our court maintains its position and asks that you reconsider your accusation.','本朝坚持原有立场，并请贵方重新审视指责。'],
  welcome:['Your greeting is received with goodwill; may correspondence continue.','来函谨收，愿双方继续往来。'],
  formal_reply:['Your letter has been entered in the court record.','来函已记入朝廷文书。'],
  appoint:['I have approved your appointment; the court will record its actual cost and duties.','已准许任职；朝廷将记载实际费用与职责。'],
  ask_qualifications:['Please send your record of service before I decide.','决定之前，请先送交任职资料。']
 };
 const d=(choice==='accept'&&m.context?.kind!=='banquet'?decisions.accept_accord:decisions[choice])||null;
 if(!d)return [`To ${label(m.senderId||m.senderFaction,0)},\n\nI have received your letter and record my decision: ${choice.replaceAll('_',' ')}.\n\n${label(from,0)}`,`致${label(m.senderId||m.senderFaction,1)}：\n\n来函已收，本朝决定：${choice.replaceAll('_',' ')}。\n\n${label(from,1)}`];
 return [paragraph(`To ${label(m.senderId||m.senderFaction,0)},`,d[0],`Respectfully,\n${label(from,0)}`),
  paragraph(`致${label(m.senderId||m.senderFaction,1)}：`,d[1],`谨上\n${label(from,1)}`)];
}
