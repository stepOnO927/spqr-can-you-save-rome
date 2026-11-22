import {sendLetter,initializeMail} from './epistulae.js?v=family-contact-1';
import {reportedArmies} from './character-system.js?v=family-contact-1';
import {CHARACTER_CATALOG} from './characters.js?v=saved-age-consistency-1';
import {MATERIALS} from './inventions.js?v=mission-discount-1';
import {ROUTES} from './data.js?v=phase-x-1';
import {FACTIONS} from './data.js?v=phase-x-1';
import {campaignDate} from './campaign-date.js?v=calendar-1';
import {storedCorrespondentName} from './person-knowledge.js?v=family-contact-1';

const month=s=>s.year*12+s.month;
const owned=s=>s.regions.filter(r=>r.owner===s.player);
const sightings=s=>Object.fromEntries(reportedArmies(s,s.player).map(x=>[`${x.owner}:${x.id}`,{region:x.region,year:x.year,month:x.month}]));
const snapshot=s=>({tax:s.factions[s.player].tax,food:s.factions[s.player].food,appointment:s.world.appointments?.[s.player]||null,
  regions:Object.fromEntries(owned(s).map(r=>[r.id,{loyalty:r.loyalty,fort:r.fort,buildings:[...(r.buildings||[])],population:r.population?.total??null}])),
  allegations:(s.world.religionReports?.[s.player]||[]).map(r=>`${r.id}:${r.year}:${r.month}`),sightings:sightings(s)});
const home=s=>owned(s)[0]?.id||null;

export function initializeMailReports(s){const mail=initializeMail(s);mail.reportSnapshot||=snapshot(s);return mail.reportSnapshot}
function report(s,eventId,category,priority,subject,body,{region=null,options=['acknowledge'],confidence=null,context={}}={}){
 const mail=initializeMail(s);if(mail.generated[eventId])return;
 const result=sendLetter(s,{senderInstitution:s.player,senderFaction:s.player,recipient:s.player,category,priority,
  eventId,subject,body,source:region||home(s),destination:home(s),options,confidence,
  context:{kind:'state_report',region,...context},politicalState:{source:'campaign',eventId}});
 if(result.ok)mail.generated[eventId]=true;
}
export function advanceMailReports(s){
 const mail=initializeMail(s),before=initializeMailReports(s),after=snapshot(s),now=month(s),f=s.factions[s.player];
 // A completed audience is a local record; a refusal is a delivered reply.
 // Silence and failed contact must not become invented correspondence.
 for(const meeting of s.meetings||[]){
  if(meeting.actor!==s.player||meeting.resultMailId||meeting.resolvedYear!==s.year||meeting.resolvedMonth!==s.month||!['met','declined'].includes(meeting.status))continue;
  const met=meeting.status==='met',person=storedCorrespondentName(meeting.person,meeting.observedPersonName||meeting.personName),target=storedCorrespondentName(meeting.target,met?meeting.observedName:meeting.reportedName),place=s.regions.find(r=>r.id===meeting.location)?.name||['an unrecorded theater','未记录的战区'];
  const subject=met?['Personal audience held','个人会面已举行']:['Personal audience declined','个人会面请求遭拒'];
  const body=met?[`${person[0]} met ${target[0]} in ${place[0]}. The meeting records what was observed then; later circumstances may differ.`,`${person[1]}在${place[1]}与${target[1]}会面。会面记录只反映当时情况，之后可能发生变化。`]:[`The request addressed to ${target[0]} for an audience was declined.`,`寄给${target[1]}的个人会面请求遭到拒绝。`];
  const sender=met?s.player:meeting.targetFaction;
  const result=sendLetter(s,{senderInstitution:sender,senderFaction:sender,recipient:s.player,category:met?'government':'diplomatic',priority:'important',subject,body,options:['acknowledge'],context:{kind:'personal_audience_result'}});
  if(result.ok){meeting.resultMailId=result.letter.id;if(!met)result.letter.sentDateKnown=false;result.letter.arrival=now;result.letter.delivery='received'}
 }
 // The diplomatic inquiry has already made its return trip. A lost reply is
 // silence, while a received answer or explicit refusal becomes one letter.
 for(const inquiry of s.inquiries||[]){
  if(inquiry.actor!==s.player||inquiry.resultMailId||inquiry.resolvedYear!==s.year||inquiry.resolvedMonth!==s.month||!['answered','refused'].includes(inquiry.status))continue;
  const court=FACTIONS[inquiry.target]?.short||['The court','对方宫廷'],peace=inquiry.subject==='peace',refused=inquiry.status==='refused';
  const hasDate=Number.isInteger(inquiry.responseYear)&&Number.isInteger(inquiry.responseMonth)&&inquiry.responseMonth>=1&&inquiry.responseMonth<=12;
  const when=hasDate?[campaignDate(inquiry.responseMonth,inquiry.responseYear,'en'),campaignDate(inquiry.responseMonth,inquiry.responseYear,'zh')]:['an unrecorded date','日期未记录'];
  const claim=Array.isArray(inquiry.claim)&&inquiry.claim.length>=2&&inquiry.claim.slice(0,2).every(x=>typeof x==='string')?inquiry.claim:['The reply content was not recorded.','回信内容未记录。'];
  const subject=peace?(refused?['Peace offer declined','议和提议遭拒']:['Peace reply received','议和回信已送达']):(refused?['Inquiry declined','询问信遭拒']:['Court reply received','宫廷回信已送达']);
  const body=refused?(peace?[`${court[0]} declined the peace offer.`,`${court[1]}回信拒绝议和。`]:[`${court[0]} declined to answer the inquiry.`,`${court[1]}回信表示不愿回答询问。`]):[`${court[0]} replied on ${when[0]}: ${claim[0]} ${peace?'':'This official statement is unverified and may be outdated.'}`,`${court[1]}于${when[1]}回信：${claim[1]}${peace?'':'此为未经独立核实的官方说法，可能已过时。'}`];
  const result=sendLetter(s,{senderInstitution:inquiry.target,senderFaction:inquiry.target,recipient:s.player,category:'diplomatic',priority:'important',subject,body,options:['acknowledge'],confidence:!refused&&!peace?'unverified':null,context:{kind:'inquiry_result',subject:inquiry.subject,target:inquiry.target}});
  if(result.ok){inquiry.resultMailId=result.letter.id;if(hasDate)result.letter.created={year:inquiry.responseYear,month:inquiry.responseMonth};else result.letter.sentDateKnown=false;result.letter.arrival=now;result.letter.delivery='received'}
 }
 // These missions already include the return journey. Record only a result
 // actually received this month; an unanswered mission produces no letter.
 for(const op of s.operations||[]){
  if(op.actor!==s.player||op.resultMailId||op.resolvedYear!==s.year||op.resolvedMonth!==s.month||!['complete','declined','captured','detected'].includes(op.status))continue;
  const target=FACTIONS[op.target]?.short||[op.target,op.target];
  let subject,body;
  if(op.status==='declined'){
   subject=['Request declined','请求遭拒'];body=[`The request concerning ${target[0]} was declined.`,`有关${target[1]}的请求遭到拒绝。`];
  }else if(op.status==='captured'||op.status==='detected'){
   subject=['Agent compromised','情报人员暴露'];body=op.status==='captured'?[`An agent operating against ${target[0]} was captured.`,`在${target[1]}活动的一名情报人员被抓获。`]:[`An agent operating against ${target[0]} was detected.`,`在${target[1]}活动的一名情报人员被发现。`];
  }else if(op.type==='support'){
   subject=['Claimant accepted support','竞争者接受支持'];body=[`The claimant accepted support concerning ${target[0]}; relations with the court worsened.`,`有关${target[1]}的竞争者接受了支持；与宫廷的关系恶化。`];
  }else if(op.type==='counter'&&op.subject==='counter_spies'){
   subject=['Counterintelligence watch','反间谍警戒'];body=['The watch will operate for the next six months.','反间谍警戒将在接下来的六个月运行。'];
  }else if(op.type==='envoy'&&op.subject==='relations'){
   subject=['Envoy received','使者获接待'];body=[`The envoy was received by ${target[0]} and relations improved by up to 8.`,`使者获得${target[1]}接待，双方关系最多提高8。`];
  }else{
   subject=['Intelligence report received','情报报告已送达'];body=[`A report concerning ${target[0]} has arrived. Review the foreign court dossier for its dated contents and source; the information may be wrong or outdated.`,`有关${target[1]}的报告已送达。请查看外国宫廷档案中的报告内容、日期和来源；情报可能有误或已经过时。`];
  }
  const result=sendLetter(s,{senderInstitution:s.player,senderFaction:s.player,recipient:s.player,category:'government',priority:'important',subject,body,options:['acknowledge'],confidence:op.status==='complete'?'unverified':null,context:{kind:'mission_result',operationId:op.id||null,target:op.target}});
  if(result.ok){op.resultMailId=result.letter.id;result.letter.arrival=now;result.letter.delivery='received'}
 }
 if(before.tax!==after.tax)report(s,`tax:${now}`,'government','important',['Tax policy changed','税政变更报告'],
  [`The court's tax rate is now ${after.tax}.`,`本朝税率现为${({low:'低',normal:'标准',high:'高'})[after.tax]||after.tax}。`],{options:['review_budget','acknowledge']});
 if(before.food>=0&&after.food<0){
  report(s,`shortage:${now}`,'government','critical',['Food shortage','粮食短缺急报'],
   [`Reserves have fallen to ${after.food}. The next harvest and army supply require attention.`,`存粮降至 ${after.food}。来季收成与军队补给亟待关注。`],{options:['review_budget','war_council','acknowledge']});
  if(s.armies.some(a=>a.owner===s.player))report(s,`supply:${now}`,'military','important',['Army supply concern','军队补给警报'],
   [`The army's government holds ${after.food} food reserves; inspect supply before further commitments.`,`本方现存粮 ${after.food}，请在继续调兵前检查补给。`],{options:['war_council','acknowledge']});
 }
 if(before.appointment!==after.appointment&&after.appointment){const who=CHARACTER_CATALOG[after.appointment]?.name||[after.appointment,after.appointment];
  report(s,`appointment:${now}:${after.appointment}`,'government','important',['Official appointment','官员任命'],
   [`${who[0]} has been appointed to acting authority in this campaign.`,`本战役中，${who[1]}已获任临时代行政务。`],{options:['acknowledge']});
 }
 for(const r of owned(s)){
  const old=before.regions[r.id];if(!old)continue;
  if(old.loyalty>=30&&r.loyalty<30)report(s,`unrest:${now}:${r.id}`,'government','critical',['Provincial unrest','行省动荡'],
   [`${r.name[0]} has fallen to ${r.loyalty} loyalty.`,` ${r.name[1]}的忠诚度已降至 ${r.loyalty}。`],{region:r.id,options:['view_location','acknowledge']});
  for(const id of (r.buildings||[]).filter(id=>!old.buildings.includes(id))){const item=MATERIALS.find(x=>x.id===id),label=item?.name||[id,id];
   report(s,`construction:${now}:${r.id}:${id}`,'government','routine',['Construction completed','建设竣工'],
    [`${label[0]} was completed in ${r.name[0]}.`,` ${r.name[1]}的${label[1]}已竣工。`],{region:r.id,options:['view_location','acknowledge']});
  }
  if(r.fort>old.fort)report(s,`fort:${now}:${r.id}`,'military','important',['Frontier fortification improved','边地防御加强'],
   [`Fortification in ${r.name[0]} rose from ${old.fort} to ${r.fort}.`,` ${r.name[1]}的防御等级由 ${old.fort} 升至 ${r.fort}。`],{region:r.id,options:['view_location','war_council','acknowledge']});
 }
 const known=new Set(before.allegations);for(const evidence of s.world.religionReports?.[s.player]||[]){
  if(evidence.value!=='suspected'||known.has(`${evidence.id}:${evidence.year}:${evidence.month}`))continue;
  const institution=s.world.religiousInstitutions?.find(o=>o.id===evidence.id);
  report(s,`allegation:${evidence.id}:${evidence.year}:${evidence.month}`,'government','important',['Unverified corruption allegation','未经核实的腐败指控'],
   [`An inquiry raised an unverified concern about ${institution?.name?.[0]||evidence.id}.`,`调查提出对${institution?.name?.[1]||evidence.id}的未经核实的疑虑。`],
   {region:institution?.region,confidence:'unverified',options:['review_budget','acknowledge']});
 }
 for(const [id,seen] of Object.entries(after.sightings)){
  if(before.sightings[id]?.region===seen.region||seen.year!==s.year||seen.month!==s.month)continue;
  const place=s.regions.find(r=>r.id===seen.region);
  const border=region=>ROUTES.some(([a,b])=>a===region&&s.regions.some(r=>r.id===b&&r.owner===s.player)||b===region&&s.regions.some(r=>r.id===a&&r.owner===s.player));
  const approaching=border(seen.region)&&!border(before.sightings[id]?.region);
  report(s,`sighting:${id}:${seen.region}:${now}`,'military',approaching?'critical':'important',approaching?['Foreign force near the frontier','边境附近发现外国军队']:['Foreign army sighted','发现外国军队'],
   [approaching?`A dated sighting places a foreign army near our frontier at ${place?.name?.[0]||seen.region}; its present position is uncertain.`:`A dated report places a foreign army near ${place?.name?.[0]||seen.region}; its present position may have changed.`,approaching?`有日期的目击报告显示外国军队曾在本方边境附近的${place?.name?.[1]||seen.region}出现；现址不明。`:`一份有日期的报告显示外国军队曾在${place?.name?.[1]||seen.region}附近；现址可能已变化。`],
   {region:seen.region,confidence:'unverified',options:['view_location','war_council','acknowledge']});
 }
 if(s.month===9)report(s,`harvest:${s.year}`,'government','routine',['Agricultural report','农业报告'],
  [`Controlled provinces yield a combined ${owned(s).reduce((n,r)=>n+r.food,0)} food potential; current reserves are ${f.food}.`,`本方控制的行省合计粮食潜力 ${owned(s).reduce((n,r)=>n+r.food,0)}；现存粮 ${f.food}。`],{options:['review_budget','acknowledge']});
 if(s.month===12){const population=owned(s).reduce((n,r)=>n+(r.population?.total||0),0),previous=mail.lastAnnualPopulation;
  report(s,`population:${s.year}`,'government','routine',['Population estimate','人口估算'],
   [`Controlled provinces hold an estimated ${population} people${previous==null?'':`; change since last annual report: ${population-previous}`}.`,`本方控制的行省估计人口 ${population}${previous==null?'':`；较上次年度报告变化 ${population-previous}`}。`],{options:['acknowledge']});
  mail.lastAnnualPopulation=population;
  report(s,`administration:${s.year}`,'government','routine',['Annual administrative review','年度行政评议'],
   [`The court controls ${owned(s).length} provinces; treasury ${f.treasury}, food ${f.food}, stability ${f.stability}.`,`本朝控制 ${owned(s).length} 个行省；国库 ${f.treasury}，粮食 ${f.food}，稳定度 ${f.stability}。`],{options:['review_budget','acknowledge']});
 }
 mail.reportSnapshot=after;
}
