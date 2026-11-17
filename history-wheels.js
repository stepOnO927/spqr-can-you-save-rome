// The Wheels of History reads the existing simulation. It never resolves an
// economy, battle, treaty or appointment of its own.
import {sendLetter} from './epistulae.js?v=born-portraits-eleven-1';
import {CHARACTER_CATALOG} from './characters.js?v=succession-ui-recovery-1';
import {reassurePerson} from './conspiracies.js?v=mutual-audience-1';

const L=(en,zh)=>[en,zh];
const date=s=>s.year*12+s.month;
export const AMBITIONS={
 military:{name:L('Military dominance','军事霸权'),note:L('Secure the army and win a sustainable settlement.','巩固军队，并争取可维持的战后秩序。')},
 diplomatic:{name:L('Diplomatic hegemony','外交霸权'),note:L('Build agreements and a durable peace.','建立协定与持久和平。')},
 economic:{name:L('Economic prosperity','富国之路'),note:L('Restore the treasury without exhausting the provinces.','充实国库，同时避免耗尽行省。')},
 reform:{name:L('Political reform','政治改革'),note:L('Strengthen legitimacy and stable institutions.','巩固合法性和稳定制度。')},
 dynastic:{name:L('Dynastic legacy','王朝千秋'),note:L('Protect legitimate succession and family continuity.','维护合法继承与家族延续。')},
 cultural:{name:L('Cultural golden age','文明盛世'),note:L('Fund scholarship and lasting national projects.','支持学术及长期国家建设。')},
 custom:{name:L('Custom objective','自定义国家目标'),note:L('Choose a measurable treasury, stability or territory target.','选择可衡量的国库、稳定度或战区目标。')}
};
export const availableAmbitions=s=>Object.keys(AMBITIONS).filter(id=>id!=='dynastic'||!['senate','caesar'].includes(s.player));
export function initializeWheels(s){
 s.historyWheels||={version:1,ambition:'',chosenAt:null,changes:[],chains:[],nextId:1,pressureMonths:0,lastMonth:null};
 const w=s.historyWheels;w.chains||=[];w.changes||=[];w.nextId||=1;return w;
}
export function chooseAmbition(s,id,options={}){
 if(!availableAmbitions(s).includes(id))return false;
 const w=initializeWheels(s),allowed={treasury:[50,100,150],stability:[60,70,80],regions:[1,2,3]};
 if(id==='custom'){
  const metric=options.metric||'treasury',target=Number(options.target)||100;
  if(!allowed[metric]?.includes(target))return false;
  w.custom={metric,target,baseline:metric==='regions'?s.regions.filter(r=>r.owner===s.player).length:0};
 }
 if(w.ambition===id&&id!=='custom')return true;
 const old=w.ambition;w.ambition=id;w.chosenAt={year:s.year,month:s.month};
 w.changes.push({id:`ambition:${w.nextId++}`,from:old,to:id,year:s.year,month:s.month});
 // A change of plans is visible to the court, but does not invent a resource loss.
 s.log.unshift({year:s.year,month:s.month,en:`The court adopted ${AMBITIONS[id].name[0]} as its national ambition.`,zh:`朝廷将“${AMBITIONS[id].name[1]}”定为国家野心。`,kind:'government',topic:'ambition'});
 s.log=s.log.slice(0,80);return true;
}
export function ambitionStatus(s){
 const w=initializeWheels(s),f=s.factions[s.player],own=s.regions.filter(r=>r.owner===s.player),forces=s.armies.filter(a=>a.owner===s.player&&a.men>0),atWar=s.wars.some(war=>war.includes(s.player));
 const agreements=(s.agreements||[]).filter(a=>a.status==='active'&&a.parties?.includes(s.player)).length;
 const focus=s.world?.nationalFocus?.[s.player],completed=focus?.completed?.length||0;
 const meanLoyalty=own.length?Math.round(own.reduce((n,r)=>n+r.loyalty,0)/own.length):0;
 const rows={
  military:{title:L('Maintain a supplied field army and secure peace or victory','保持有补给的野战军，并争取和平或胜利'),progress:L(`${forces.length} armies · ${f.food} food · ${atWar?'war':'peace'}`,`${forces.length} 支军队 · 粮食 ${f.food} · ${atWar?'交战中':'和平'}`),done:forces.length>0&&f.food>=20&&(!atWar||s.victory)},
  diplomatic:{title:L('Conclude two agreements or establish durable peace','达成两项协定，或建立持久和平'),progress:L(`${agreements}/2 agreements · ${s.world?.peacefulSettlementMonths||0}/12 peace months`,`${agreements}/2 项协定 · 和平 ${s.world?.peacefulSettlementMonths||0}/12 月`),done:agreements>=2||!!s.peacefulVictory},
  economic:{title:L('Hold 100 treasury with loyal provinces','国库达到100，同时维持行省忠诚'),progress:L(`${f.treasury}/100 treasury · ${meanLoyalty}/55 loyalty`,`国库 ${f.treasury}/100 · 忠诚度 ${meanLoyalty}/55`),done:f.treasury>=100&&meanLoyalty>=55},
  reform:{title:L('Complete a national focus and stabilize the government','完成国家方针并稳定政府'),progress:L(`${completed}/1 focus · ${f.stability}/65 stability · ${f.legitimacy}/55 legitimacy`,`方针 ${completed}/1 · 稳定度 ${f.stability}/65 · 合法性 ${f.legitimacy}/55`),done:completed>0&&f.stability>=65&&f.legitimacy>=55},
  dynastic:{title:L('Preserve a recognized succession and stable government','维护公认继承与稳定政府'),progress:L(`${f.stability}/65 stability · ${f.legitimacy}/60 legitimacy`,`稳定度 ${f.stability}/65 · 合法性 ${f.legitimacy}/60`),done:f.stability>=65&&f.legitimacy>=60&&!!s.world?.governments?.[s.player]?.succession},
  cultural:{title:L('Complete two national projects while maintaining stability','完成两项国家工程并维持稳定'),progress:L(`${completed}/2 projects · ${f.stability}/55 stability`,`工程 ${completed}/2 · 稳定度 ${f.stability}/55`),done:completed>=2&&f.stability>=55},
  custom:(()=>{const c=w.custom||{metric:'treasury',target:100,baseline:0};const value=c.metric==='treasury'?f.treasury:c.metric==='stability'?f.stability:own.length-c.baseline;const unit=c.metric==='treasury'?L('treasury','国库'):c.metric==='stability'?L('stability','稳定度'):L('additional territories','新增战区');return {title:L(`Reach ${c.target} ${unit[0]}`,`达到 ${c.target} ${unit[1]}`),progress:L(`${value}/${c.target} ${unit[0]}`,`${value}/${c.target} ${unit[1]}`),done:value>=c.target}})()
 };
 return w.ambition?{id:w.ambition,...rows[w.ambition]}:null;
}

function financialSender(s){
 const people=s.world?.characters||{},offices=s.world?.offices?.[s.player]||{};
 const ids=[offices.finance,...(s.world?.leadership?.[s.player]||[])];
 return ids.find(id=>people[id]?.alive&&people[id].faction===s.player&&CHARACTER_CATALOG[id]?.name)||null;
}
function note(s,chain,en,zh){
 const id=`wheel:${chain.id}:${chain.events.length+1}`;
 chain.events.push({id,parentId:chain.events.at(-1)?.id||null,year:s.year,month:s.month,en,zh});
 s.log.unshift({year:s.year,month:s.month,en,zh,kind:'government',topic:'economy',eventId:id,characterId:chain.senderId||null});
 s.log=s.log.slice(0,80);
}
function retireFinancialRequest(s,chain,treasury,forecast){
 const letter=s.mail?.messages?.find(m=>m.id===chain.letterId);
 if(!letter||letter.responses.length)return;
 letter.options=['acknowledge'];letter.context={kind:'wheels_finance_closed',chainId:chain.id};
 letter.body=L(`${letter.body[0]} Later review: treasury ${treasury}, next-month balance ${forecast}; the original request is closed.`,`${letter.body[1]} 后续检讨：国库 ${treasury}、下月收支 ${forecast}；原请求已结束。`);
}
function retireCommanderRequest(s,chain){
 const letter=s.mail?.messages?.find(m=>m.id===chain.letterId);
 if(letter&&!letter.responses.length){letter.options=['acknowledge'];letter.context={kind:'wheels_commander_closed',chainId:chain.id}}
}
export function commanderDecision(s,chainId,choice){
 const chain=initializeWheels(s).chains.find(c=>c.id===chainId&&c.type==='commander_petition'&&c.status==='active');
 const officer=chain&&s.world?.characters?.[chain.characterId];
 if(!officer?.alive||officer.faction!==s.player||chain.response||!['commander_reassure','commander_defer'].includes(choice))return false;
 const before=officer.loyalty;
 if(choice==='commander_reassure'){
  const result=reassurePerson(s,chain.characterId);
  if(!result.ok)return false;
  note(s,chain,`${CHARACTER_CATALOG[chain.characterId].name[0]} received political reassurance at a cost of ${result.cost} treasury; loyalty changed from ${before} to ${officer.loyalty}.`,`${CHARACTER_CATALOG[chain.characterId].name[1]}获政治安抚，国库支出 ${result.cost}；忠诚度由 ${before} 变为 ${officer.loyalty}。`);
 }else note(s,chain,`The court deferred ${CHARACTER_CATALOG[chain.characterId].name[0]}'s petition; loyalty remained ${officer.loyalty}.`,`朝廷暂缓答复${CHARACTER_CATALOG[chain.characterId].name[1]}的请求；忠诚度仍为 ${officer.loyalty}。`);
 chain.response=choice;chain.respondedAt={year:s.year,month:s.month};return true;
}
function advanceCommanderPetitions(s,w,now){
 for(const chain of w.chains.filter(c=>c.type==='commander_petition'&&c.status==='active')){
  const person=s.world?.characters?.[chain.characterId],unit=s.armies.find(a=>a.id===chain.armyId&&a.characterId===chain.characterId&&a.owner===s.player&&a.men>0);
  const ended=!person?.alive||person.faction!==s.player||!unit;
  if(ended||now-chain.openedAt>=12){
   chain.status=ended?'command_ended':'closed';chain.closedAt=now;
   const name=CHARACTER_CATALOG[chain.characterId]?.name||[chain.characterId,chain.characterId];
   note(s,chain,`${name[0]}'s command petition closed: ${ended?'the officer no longer holds this command':'the officer remains in command'}; last known loyalty ${person?.loyalty??'unknown'}.`,`${name[1]}的指挥请求结束：${ended?'该人物已不再指挥此军':'该人物仍在指挥此军'}；最后已知忠诚度 ${person?.loyalty??'不明'}。`);
   retireCommanderRequest(s,chain);
  }else if(chain.respondedAt&&!chain.reviewedAt&&now>chain.respondedAt.year*12+chain.respondedAt.month){
   chain.reviewedAt=now;note(s,chain,`After the court's answer, ${CHARACTER_CATALOG[chain.characterId].name[0]} still commands ${unit.name[0]}; loyalty is ${person.loyalty}.`,`朝廷答复后，${CHARACTER_CATALOG[chain.characterId].name[1]}仍指挥${unit.name[1]}；忠诚度为 ${person.loyalty}。`);
  }
 }
 if(s.defeat||s.victory)return;
 const candidates=s.armies.filter(a=>a.owner===s.player&&a.men>0&&a.characterId).map(a=>({unit:a,person:s.world?.characters?.[a.characterId]})).filter(({person})=>person?.alive&&person.faction===s.player&&(person.battlesCommanded||0)>=2&&person.loyalty<60&&CHARACTER_CATALOG[person.id]&&!(s.world.leadership[s.player]||[]).includes(person.id)&&!w.chains.some(c=>c.type==='commander_petition'&&c.characterId===person.id&&(c.status==='active'||now-c.closedAt<24))).sort((a,b)=>a.person.loyalty-b.person.loyalty||a.person.id.localeCompare(b.person.id));
 const pick=candidates[0];if(!pick||w.chains.some(c=>c.type==='commander_petition'&&c.status==='active'))return;
 const {unit,person}=pick,name=CHARACTER_CATALOG[person.id].name;
 const chain={id:`chain:${w.nextId++}`,type:'commander_petition',status:'active',cause:{battlesCommanded:person.battlesCommanded,loyalty:person.loyalty,armyId:unit.id,year:s.year,month:s.month},characterId:person.id,armyId:unit.id,territoryId:unit.region,events:[],response:null,openedAt:now};w.chains.push(chain);
 note(s,chain,`${name[0]}, commander of ${unit.name[0]}, petitioned the court after ${person.battlesCommanded} battles; loyalty stood at ${person.loyalty}.`,`指挥${unit.name[1]}的${name[1]}在参战 ${person.battlesCommanded} 次后上书朝廷；其忠诚度为 ${person.loyalty}。`);
 const letter=sendLetter(s,{senderId:person.id,senderFaction:s.player,recipient:s.player,category:'government',priority:'important',subject:L('A commander asks to be heard','将领请求朝廷倾听'),body:L(`After ${person.battlesCommanded} battles with ${unit.name[0]}, I ask the court to acknowledge my service. Political reassurance costs 8 treasury and may improve loyalty; you may also defer without a charge. My current command is unchanged by either reply.`,`我率${unit.name[1]}参战 ${person.battlesCommanded} 次，请朝廷正视此番效力。政治安抚需8国库，可能改善忠诚；亦可暂缓答复且不花费。两种答复均不直接改变军职。`),options:['commander_reassure','commander_defer','view_location'],context:{kind:'wheels_commander',chainId:chain.id,region:unit.region},source:unit.region,expires:now+12});
 if(letter.ok){chain.letterId=letter.letter.id;letter.letter.arrival=now+1;letter.letter.courierRisk=0}
}
export function financeDecision(s,chainId,choice,beforeTax=null){
 const chain=initializeWheels(s).chains.find(c=>c.id===chainId&&c.status==='active');
 if(!chain||!['finance_high_tax','finance_low_tax','finance_wait'].includes(choice))return false;
 chain.response=choice;chain.respondedAt={year:s.year,month:s.month};chain.taxAtResponse=s.factions[s.player].tax;
 if(choice!=='finance_wait')note(s,chain,`The court changed tax policy from ${beforeTax||chain.cause.tax} to ${chain.taxAtResponse}; treasury stood at ${s.factions[s.player].treasury}.`,`朝廷将税率由 ${beforeTax||chain.cause.tax} 改为 ${chain.taxAtResponse}；当时国库为 ${s.factions[s.player].treasury}。`);
 if(choice==='finance_wait')note(s,chain,'The court postponed a change to tax policy while the treasury remained under review.','朝廷暂缓改变税政，继续观察国库。');
 return true;
}
export function advanceWheels(s,{forecast,setTax}={}){
 const w=initializeWheels(s),now=date(s);if(w.lastMonth===now)return w;w.lastMonth=now;
 advanceCommanderPetitions(s,w,now);
 const f=s.factions[s.player];if(!f||!forecast)return w;
 const outlook=forecast(s,s.player),strained=f.treasury<15&&outlook.treasury<0;
 w.pressureMonths=strained?w.pressureMonths+1:0;
 let active=w.chains.find(c=>c.type==='cost_of_expansion'&&c.status==='active');
 if(!active&&w.pressureMonths>=2&&now-(w.chains.filter(c=>c.type==='cost_of_expansion').at(-1)?.closedAt||-Infinity)>=12){
  const senderId=financialSender(s);active={id:`chain:${w.nextId++}`,type:'cost_of_expansion',status:'active',cause:{treasury:f.treasury,forecast:outlook.treasury,tax:f.tax,year:s.year,month:s.month},senderId,events:[],response:null,healthyMonths:0,openedAt:now};w.chains.push(active);
  note(s,active,`The treasury fell to ${f.treasury} with a forecast of ${outlook.treasury} next month. The court opened a financial review.`,`国库降至 ${f.treasury}，下月预测收支 ${outlook.treasury}。朝廷开始财政检讨。`);
  const letter=sendLetter(s,{senderId,senderInstitution:senderId?null:s.player,senderFaction:s.player,recipient:s.player,category:'government',priority:'important',subject:L('The cost of the campaign','战役开支'),body:L(`Treasury ${f.treasury}; next month ${outlook.treasury}. Raising tax may improve revenue but erode provincial loyalty. Lowering tax may protect loyalty but deepen the deficit. You may also leave policy unchanged and review the budget.`,`国库 ${f.treasury}；下月收支预测 ${outlook.treasury}。加税可能改善收入，但会削弱行省忠诚；减税可能维护忠诚，却会扩大赤字。也可暂缓调整并查看预算。`),options:['finance_high_tax','finance_low_tax','finance_wait','review_budget'],context:{kind:'wheels_finance',chainId:active.id},source:s.regions.find(r=>r.owner===s.player)?.id});
  if(letter.ok){active.letterId=letter.letter.id;letter.letter.arrival=now+1;letter.letter.courierRisk=0}
 }
 if(!active)return w;
 if(active.respondedAt&&!active.reviewedAt&&now>active.respondedAt.year*12+active.respondedAt.month){active.reviewedAt=now;note(s,active,`One month after the court's response, treasury is ${f.treasury} and the next-month balance is projected at ${outlook.treasury}.`,`朝廷答复一月后，国库为 ${f.treasury}，下月收支预测 ${outlook.treasury}。`)}
 if(active.response&&active.taxAtResponse!==f.tax&&active.response==='finance_wait')active.response='policy_changed';
 const healthy=f.treasury>=25&&outlook.treasury>=0;active.healthyMonths=healthy?active.healthyMonths+1:0;
 if(active.healthyMonths>=2){active.status='resolved';active.closedAt=now;note(s,active,`The financial review closed: treasury ${f.treasury}, next-month forecast ${outlook.treasury}, tax policy ${f.tax}.`,`财政检讨结束：国库 ${f.treasury}、下月收支预测 ${outlook.treasury}、现行税率 ${f.tax}。`);retireFinancialRequest(s,active,f.treasury,outlook.treasury)}
 else if(now-active.openedAt>=12){active.status='unresolved';active.closedAt=now;note(s,active,`The review ended without recovery: treasury ${f.treasury}, next-month forecast ${outlook.treasury}.`,`财政检讨结束但未恢复：国库 ${f.treasury}，下月收支预测 ${outlook.treasury}。`);retireFinancialRequest(s,active,f.treasury,outlook.treasury)}
 return w;
}
