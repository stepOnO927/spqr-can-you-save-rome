// The First Hundred Days: guidance reads observable campaign state. It never
// issues orders or uses unreported foreign strength, locations or intentions.
import {receivedMail,sendLetter} from './epistulae.js?v=frontier-review-1';
import {CHARACTER_CATALOG} from './characters.js?v=saved-age-consistency-1';
import {treeFor,canStartFocus,focusCost} from './national-focus.js?v=frontier-review-1';
import {initializeWheels,ambitionStatus,economicProjectStatus} from './history-wheels.js?v=frontier-review-1';

const label=(en,zh)=>[en,zh];
const month=s=>s.year*12+s.month;
const ownArmy=s=>s.armies.find(a=>a.owner===s.player&&a.men>0);
const ownRegions=s=>s.regions.filter(r=>r.owner===s.player);
const aliveLeader=s=>(s.world?.leadership?.[s.player]||[]).find(id=>s.world.characters[id]?.alive&&CHARACTER_CATALOG[id]);
const title=(s,en,zh)=>s.player==='senate'?label(en.replace('Caesar','the Senate'),zh.replace('凯撒','元老院')):label(en,zh);

export const DIRECTIONS={
 military:{name:label('Military campaign','军事行动'),note:label('Protect the field army, investigate routes and decide when to act.','保护野战军、调查路线，并自行决定何时行动。')},
 political:{name:label('Diplomacy and politics','外交与政治'),note:label('Use correspondence, institutions and agreements to pursue a settlement.','通过书信、制度与条约寻找和解。')},
 development:{name:label('National development','国家发展'),note:label('Build finances, administration and readiness while keeping options open.','改善财政、行政与战备，同时保留选择空间。')}
};

export function initializeExperience(s,{guided=false,presentation='beginner',openingLetter=false}={}){
 if(!s.experience||typeof s.experience!=='object')s.experience={direction:'',presentation,guide:{running:!!guided,paused:false,skipped:!guided,step:0,hints:true},actions:{},milestones:[],decisions:[],started:month(s),openingLetter:null};
 const x=s.experience;x.guide||={running:false,paused:false,skipped:true,step:0,hints:true};x.guide.completed||=Object.fromEntries((paths[s.player]||paths.caesar).slice(0,x.guide.step||0).map(row=>[row[0],true]));x.actions||={};x.milestones||=[];x.decisions||=[];x.presentation||=presentation;
 if(openingLetter&&!x.openingLetter){const leader=aliveLeader(s),home=ownRegions(s)[0]?.id;if(leader&&home){const result=sendLetter(s,{senderId:leader,senderFaction:s.player,recipient:s.player,destination:home,category:'government',priority:'important',subject:s.player==='senate'?label('Pompey asks for a first assessment','庞培请求初步评估'):label('Caesar asks for a first assessment','凯撒请求初步评估'),body:s.player==='senate'?label('Our command is divided and Caesar remains in the field. Review our forces and finances, then decide whether to defend, negotiate or prepare a campaign.','本方指挥分散，凯撒仍有野战军。请先检查军力与财务，再决定防守、谈判或准备行动。'):label('The civil war has begun. Review our legion and supplies, then choose whether to negotiate, develop our resources or prepare a campaign.','内战已起。请检查军团与补给，再决定谈判、发展资源或准备行动。'),options:['war_council','review_budget','acknowledge'],context:{kind:'opening_brief',region:home}});if(result.ok){result.letter.arrival=month(s)+1;result.letter.courierRisk=0;x.openingLetter=result.letter.id}}}
 return x;
}

export function recordExperience(s,action,detail=''){
 const x=initializeExperience(s);x.actions[action]=(x.actions[action]||0)+1;
 if(x.guide.running&&!x.guide.paused&&!x.guide.skipped&&(paths[s.player]||paths.caesar)[x.guide.step]?.[0]===action)x.guide.completed[action]=true;
 if(['order','peace','tax','recruit','agreement','appointment','reply'].includes(action))x.actions.course=(x.actions.course||0)+1;
 if(['direction','order','peace','tax','focus','reply','recruit','appointment','agreement'].includes(action)){
  x.decisions.unshift({year:s.year,month:s.month,action,detail:String(detail).slice(0,100)});x.decisions=x.decisions.slice(0,16);
 }
 refreshExperience(s);return x;
}

export function setDirection(s,direction){if(!DIRECTIONS[direction])return false;initializeExperience(s).direction=direction;recordExperience(s,'direction',direction);return true}
export function setGuide(s,command){const g=initializeExperience(s).guide;
 if(command==='pause'&&g.running)g.paused=true;
 if(command==='resume'){g.running=true;g.paused=false;g.skipped=false}
 if(command==='skip'){g.running=false;g.paused=false;g.skipped=true}
 if(command==='restart'){g.running=true;g.paused=false;g.skipped=false;g.step=0;g.completed={};for(const key of ['territory','army','supply','order','advance','chronicle','tax','direction'])delete s.experience.actions[key]}
 if(command==='hints')g.hints=!g.hints;
 return g;
}

const paths={
 caesar:[['territory','Select one of your theaters.','点击一处己方战区。','map'],['army','Select a friendly legion.','点击一支己方军团。','army'],['supply','Inspect its food and local supply limit.','查看粮食和当地补给上限。','supply'],['order','Preview a legal route, then order a safe march.','预览合法路线，再下达安全行军令。','military'],['advance','Advance one real month.','实际推进一个月。','advance'],['chronicle','Read the result in the Chronicle.','在编年史中查看真实结果。','chronicle'],['tax','Choose a different tax policy.','选择另一种税率。','government'],['direction','Choose your next strategic direction.','选择下一步战略方向。','direction']],
 senate:[['territory','Select a Senate theater.','点击一处元老院战区。','map'],['army','Select a Senate field army.','点击一支元老院野战军。','army'],['supply','Inspect its food and local supply limit.','查看粮食和当地补给上限。','supply'],['order','Preview a legal defensive march, then order it.','预览合法的防御行军，再下令。','military'],['advance','Advance one real month.','实际推进一个月。','advance'],['chronicle','Read the result in the Chronicle.','在编年史中查看真实结果。','chronicle'],['tax','Choose a different tax policy.','选择另一种税率。','government'],['direction','Choose your next strategic direction.','选择下一步战略方向。','direction']]
};
export const tutorialLessons=s=>paths[s.player]||paths.caesar;
export function tutorialStep(s){const x=initializeExperience(s),steps=tutorialLessons(s);let index=x.guide.step||0;
 while(index<steps.length){const [key]=steps[index];if(x.guide.completed[key]){index++;continue}break}x.guide.step=index;
 if(index>=steps.length)return null;
 const target=steps[index][0]==='order'?'army':steps[index][3];
 return {index,total:steps.length,key:steps[index][0],title:label(steps[index][1],steps[index][2]),target};
}
export function replayLesson(s,index){const x=initializeExperience(s),steps=tutorialLessons(s);if(index<0||index>=steps.length)return false;x.guide={...x.guide,running:true,paused:false,skipped:false,step:index};delete x.guide.completed[steps[index][0]];return true}

export function refreshExperience(s){const x=initializeExperience(s),add=(id,en,zh)=>{if(!x.milestones.some(m=>m.id===id))x.milestones.push({id,year:s.year,month:s.month,title:label(en,zh)})};
 if(x.actions.army)add('first_army','Inspected a field army','检查了野战军');
 if(x.actions.direction)add('direction','Chose a campaign direction','选择了战役方向');
 if(x.actions.reply)add('first_reply','Answered a letter','回复了来信');
 if(x.actions.chronicle)add('first_report','Reviewed a campaign report','查阅了战役报告');
 if(month(s)-x.started>=3)add('hundred_days','Completed the first hundred days','完成百日执政');
 if(month(s)-x.started>=12)add('first_year','Completed the first year','完成执政第一年');
 if(month(s)-x.started>=36)add('three_years','Completed three years','完成执政三年');
 if((s.agreements||[]).some(a=>a.parties?.includes(s.player)&&a.status!=='proposed'))add('first_treaty','Concluded a diplomatic agreement','达成首项外交协定');
 if((s.battles||[]).some(b=>b.attacker?.owner===s.player&&b.attackerWins||b.defender?.owner===s.player&&!b.attackerWins))add('first_victory','Won a field battle','赢得首场野战');
 if((s.world?.nationalFocus?.[s.player]?.completed||[]).length)add('first_focus','Completed a national focus','完成首项国家方针');
 const ambition=ambitionStatus(s);if(ambition?.done)add(`ambition:${ambition.id}`,`Reached ${ambition.title[0]}`,`达成${ambition.title[1]}`);
 tutorialStep(s);return x;
}

const suggestion=(id,priority,action,why,where,cost,benefit,risk,target)=>({id,priority,action:label(...action),why:label(...why),where:label(...where),cost:label(...cost),benefit:label(...benefit),risk:label(...risk),target});
export function recommendations(s){
 const x=initializeExperience(s),f=s.factions[s.player],armies=s.armies.filter(a=>a.owner===s.player&&a.men>0),regions=ownRegions(s),pending=receivedMail(s).filter(m=>!m.archived&&!m.responses.length),unread=pending.find(m=>!m.read),atWar=(s.wars||[]).some(w=>w.includes(s.player)),choices=[];
 const wheels=initializeWheels(s),financialReview=wheels.chains.find(c=>c.type==='cost_of_expansion'&&c.status==='active'),petition=wheels.chains.find(c=>c.type==='commander_petition'&&c.status==='active'&&!c.response);
 const movement=(s.world?.movements||[]).find(m=>m.parent===s.player&&['organized','network','negotiation','crisis'].includes(m.stage)&&s.regions.some(r=>r.id===m.region&&r.owner===s.player));
 if(movement){const place=s.regions.find(r=>r.id===movement.region),stageZh={organized:'组织化',network:'结成网络',negotiation:'谈判',crisis:'危机'}[movement.stage];choices.push(suggestion('movement',94,['Review a provincial political movement','检查行省政治运动'],[`Public opposition in ${place.name[0]} has reached the ${movement.stage} stage.`,`${place.name[1]}的公开反对运动进入${stageZh}阶段。`],place.name,['Policy costs depend on the response','政策费用取决于回应'],['Negotiation or reform may address grievances','谈判或改革可能缓解不满'],['Ignoring grievances may increase unrest','放任不满可能扩大动荡'],{kind:'government'}))}
 const reserveRegion=s.player==='caesar'&&atWar&&armies.length>0&&armies.length<=2&&f.treasury>=24&&f.food>=20&&f.manpower>=3000?regions.find(r=>armies.some(a=>a.region===r.id)):null;
 if(reserveRegion)choices.push(suggestion('frontier_reserve',91,['Consider raising a frontier reserve','考虑征召前线预备军'],['Your current field armies cover a costly civil-war front. A reserve can defend a theater or support a later campaign.','现有野战军承担内战前线的持续消耗。预备军可守住战区，或为后续进军提供支援。'],reserveRegion.name,['24 treasury · 6 food · 3,000 manpower; monthly upkeep follows','24国库 · 6粮食 · 3000兵源；之后还有每月维持费'],['Adds a real 3,000-person army at this theater','在该战区新增一支真实的3000人军队'],['More troops consume treasury and food each month; inspect the budget before committing','更多军队每月消耗国库和粮食；决定前请查看预算'],{kind:'region',id:reserveRegion.id}));
 if(!wheels.ambition)choices.push(suggestion('ambition',88,['Choose a national ambition','选择国家野心'],['A long-term aim gives the court a measurable priority.','长期目标能让朝廷确立可衡量的重点。'],['Campaign progress','战役进度'],['No treasury cost','无需国库支出'],['See live progress toward your aim','查看实时目标进度'],['You may change your aim later','以后可调整目标'],{kind:'direction'}));
 if(financialReview)choices.push(suggestion('financial_review',92,['Review the treasury strain','检查国库压力'],[`The review began at ${financialReview.cause.treasury} treasury and ${financialReview.cause.forecast} projected monthly balance.`,`检讨开始时国库为 ${financialReview.cause.treasury}，预计月收支 ${financialReview.cause.forecast}。`],['Government · treasury','政府 · 国库'],['Review is free; policy effects are shown in the budget','查看免费；税政影响见预算'],['A change may improve the real monthly balance','改变政策可能改善实际月收支'],['High tax can erode provincial loyalty','高税可能削弱行省忠诚'],{kind:'government'}));
 if(petition&&receivedMail(s).some(m=>m.id===petition.letterId&&!m.responses.length))choices.push(suggestion('commander_petition',93,['Answer a commander’s petition','答复将领请愿'],['A commander who has fought in this campaign is asking for recognition.','一位参加过本次战役的将领请求朝廷重视。'],['Mailbox','邮箱'],['Reassurance costs 8 treasury; deferring is free','安抚需8国库；暂缓免费'],['Reassurance improves loyalty through the existing political rule','安抚按现有政治规则提高忠诚度'],['Low loyalty may affect future political choices','忠诚度偏低可能影响日后的政治选择'],{kind:'mail',id:petition.letterId}));
 if(wheels.ambition==='economic'&&f.treasury<100&&!financialReview)choices.push(suggestion('economic_aim',58,['Compare tax and spending forecasts','比较税收与支出预测'],['Your economic ambition has not reached its treasury target.','富国目标尚未达到国库门槛。'],['Government · treasury','政府 · 国库'],['Free to inspect; changes follow policy costs','查看免费；更改政策按原有规则付费'],['See the next three months before deciding','决策前查看未来三个月预测'],['Higher tax can lower provincial loyalty','加税可能降低行省忠诚'],{kind:'government'}));
 if(wheels.ambition==='economic'&&!economicProjectStatus(s).done){
  const tree=treeFor(s.player)||[],direct=tree.find(item=>item.branch==='economic'&&!canStartFocus(s,s.player,item.id));
  const prior=tree.filter(item=>item.branch==='economic').flatMap(item=>item.prereq||[]).map(id=>tree.find(item=>item.id===id)).find(item=>item&&!canStartFocus(s,s.player,item.id));
  const candidate=direct||prior,cost=candidate?focusCost(s,s.player,candidate.id):null;
  choices.push(suggestion('economic_project',64,['Complete an economic project','完成一项经济建设'],['Treasury growth alone does not fulfill this newly chosen ambition. Finish an economic focus, trade pact or building.','仅靠国库自然增长不能完成新选的富国目标。需完成经济方针、贸易协定或建筑。'],candidate?.name||['Government · development','政府 · 发展'],cost?[`${cost.treasury} treasury · ${candidate.months} months`,`${cost.treasury}国库 · ${candidate.months}个月`]:['Review available project costs','查看可用项目费用'],['A completed project advances the economic ambition','项目完成后推进富国目标'],['Funding a project may delay the treasury target','项目支出可能推迟国库目标'],candidate?{kind:'focus',id:candidate.id}:{kind:'government'}));
 }
 if(wheels.ambition==='diplomatic'&&!atWar&&f.treasury>=2&&(s.agreements||[]).filter(a=>a.status==='active'&&a.parties?.includes(s.player)).length<2)choices.push(suggestion('diplomatic_aim',57,['Review treaty opportunities','检查条约机会'],['Your diplomatic ambition needs more active agreements or durable peace.','外交目标还需要更多有效协定或持久和平。'],['Government · diplomacy','政府 · 外交'],['Review is free; a courier costs 2 treasury','查看免费；派遣使者需2国库'],['An accepted treaty can advance the ambition','获接受的条约可推进目标'],['Acceptance depends on the other court and current relations','能否达成取决于对方与当前关系'],{kind:'government'}));
 if(wheels.ambition==='reform'&&f.stability<65)choices.push(suggestion('reform_aim',56,['Review offices and reform options','检查官职与改革选项'],['The political reform ambition needs a more stable government.','政治改革目标需要更稳定的政府。'],['Government','政府'],['Appointment and focus costs are shown before action','任命和方针费用在行动前显示'],['A completed focus or capable official may improve capacity','完成方针或任命合适官员可能提升能力'],['Incumbents and institutions may react','现任官员与制度可能产生反应'],{kind:'government'}));
 if(unread)choices.push(suggestion('mail',100,['Read a pending letter','阅读待处理来信'],['A real message awaits your decision.','一封真实来信等待决定。'],['Mailbox','邮箱'],['No direct cost','无直接费用'],['Learn terms or respond','了解条件或作出回应'],['An offer may expire','提议可能过期'],{kind:'mail',id:unread.id}));
 const weak=armies.find(a=>a.morale<45||f.food<20||((s.regions.find(r=>r.id===a.region)?.supply||0)*1000<a.men));if(weak)choices.push(suggestion('weak-army',95,['Inspect an understrength army','检查状态欠佳的军队'],['Its own food, local carrying capacity or morale is low.','己方粮食、当地补给上限或士气偏低。'],[weak.name?.[0]||weak.id,weak.name?.[1]||weak.id],['Inspection is free','查看免费'],['Choose a feasible recovery plan','选择可行的恢复方案'],['An order without preparation may fail','仓促下令可能失利'],{kind:'army',id:weak.id}));
 const low=regions.find(r=>r.loyalty<45);if(low)choices.push(suggestion('province',90,['Review a troubled theater','检查不稳战区'],['Local loyalty is low.','当地忠诚度偏低。'],[low.name[0],low.name[1]],['Inspection is free','查看免费'],['Consider tax or administration','考虑税政或行政调整'],['Unrest may grow','不满可能扩大'],{kind:'region',id:low.id}));
 if(!x.direction)choices.push(suggestion('direction',85,['Choose a strategic direction','选择战略方向'],['Your priorities are still unset.','尚未确定行动重点。'],['Campaign progress','战役进度'],['Free; reversible','免费；可更改'],['Objectives reflect your plan','目标将贴合计划'],['No action is locked out','不会锁定其他行动'],{kind:'direction'}));
 if(!x.actions.army&&armies.length)choices.push(suggestion('army',80,['Inspect your first field army','检查第一支野战军'],['You can judge readiness before giving orders.','先了解战备，再考虑下令。'],[armies[0].name?.[0]||armies[0].id,armies[0].name?.[1]||armies[0].id],['Free','免费'],['See strength, morale and supply','查看兵力、士气与补给'],['No order is issued','不会自动下令'],{kind:'army',id:armies[0].id}));
 if(atWar&&f.treasury>=8&&x.direction==='political')choices.push(suggestion('peace',75,['Examine peace correspondence','考虑议和书信'],['A political route remains open during war.','战争中仍可尝试政治途径。'],['Government · diplomacy','政府 · 外交'],['Courier and inquiry cost shown in panel','面板中显示使者及询问费用'],['A negotiated end may preserve control','谈判结束战争可能保留控制权'],['Delivery or acceptance is uncertain','送达或接受均不确定'],{kind:'government'}));
 if(!x.actions.chronicle&&month(s)>x.started)choices.push(suggestion('report',72,['Review the last turn','查看上月结果'],['Time advanced; consequences may be recorded.','时间已推进，结果可能已入史录。'],['Chronicle','编年史'],['Free','免费'],['See confirmed developments','查看已确认进展'],['Reports can reflect limited knowledge','报告受己方认知限制'],{kind:'chronicle'}));
 const availableFocus=x.direction!=='military'?(treeFor(s.player)||[]).find(item=>!canStartFocus(s,s.player,item.id)):null;if(availableFocus){const cost=focusCost(s,s.player,availableFocus.id);choices.push(suggestion('focus',55,['Review a viable national focus','查看可启动的国家方针'],['This project meets its current prerequisites.','这项方针目前满足前置条件。'],availableFocus.name,[`${cost.treasury} treasury · ${availableFocus.months} months`,`${cost.treasury}国库 · ${availableFocus.months}个月`],['See the listed project effects','查看列出的项目效果'],['Starting it spends resources and time','启动后消耗资源与时间'],{kind:'focus',id:availableFocus.id}))}
 if(f.treasury<25||f.food<15)choices.push(suggestion('budget',70,['Review next month’s budget','查看下月预算'],['A core resource is running low.','核心资源储备偏低。'],['Government · treasury','政府 · 国库'],['Free to review','查看免费'],['Adjust feasible policies','调整可行政策'],['War and events can change the forecast','战争与事件会改变预测'],{kind:'government'}));
 if(!choices.length||choices.length<3)choices.push(suggestion('development',35,['Review government and development','查看政府与发展'],['A quiet month allows institution building.','平静月份适合建设制度。'],['Government','政府'],['Costs vary by action','费用视操作而定'],['Improve stability and capacity','改善稳定度与能力'],['Policy tradeoffs still apply','政策仍有取舍'],{kind:'government'}));
 choices.push(suggestion('time',15,['Advance time when ready','准备好后推进时间'],['Orders, finances and other courts resolve each month.','命令、财政及其他政体按月结算。'],['Time control','时间控制'],['One month','一个月'],['See the consequences of your choices','观察决策结果'],['Unanswered opportunities may change','未处理机会可能变化'],{kind:'time'}));
 const ranked=choices.sort((a,b)=>b.priority-a.priority),picked=[ranked[0]];
 const development=ranked.find(item=>['focus','budget','province','development','economic_project'].includes(item.id)&&!picked.includes(item))||suggestion('development',35,['Review government and development','查看政府与发展'],['Inspect current policy before spending.','先检查现行政策，再决定是否支出。'],['Government','政府'],['Free to inspect','查看免费'],['Find a viable economic action','寻找可行的经济行动'],['Changing policy may have tradeoffs','调整政策可能有代价'],{kind:'government'});
 picked.push(development);
 picked.push(ranked.find(item=>item.id==='frontier_reserve'&&!picked.includes(item))||ranked.find(item=>['ambition','direction','peace','army','frontier_reserve','time','report'].includes(item.id)&&!picked.includes(item))||ranked.find(item=>!picked.includes(item))||suggestion('time',15,['Advance when ready','准备好后推进'],['Orders resolve over time.','命令会随时间结算。'],['Time control','时间控制'],['One month','一个月'],['See actual results','查看实际结果'],['Circumstances can change','局势可能变化'],{kind:'time'}));
 return picked;
}

export function objectives(s){const x=refreshExperience(s),step=x.guide.running&&!x.guide.paused?tutorialStep(s):null,regions=ownRegions(s),f=s.factions[s.player],atWar=(s.wars||[]).some(w=>w.includes(s.player));
 const next=recommendations(s)[0];const immediate=step?{title:step.title,done:false,target:step.target}:next?{title:next.action,done:false,target:next.target.kind}:{title:label('Review this month and decide your next action','检查本月局势并决定下一步'),done:false,target:'chronicle'};
 const inquiry=(s.inquiries||[]).find(q=>q.actor===s.player&&q.subject==='peace'&&['pending','awaiting_decision'].includes(q.status));
 const focus=s.world?.nationalFocus?.[s.player],activeFocus=focus?.active||focus?.current,completedFocus=focus?.completed?.length||0,peaceMonths=s.world?.peacefulSettlementMonths||0;
 const ready=s.armies.filter(a=>a.owner===s.player&&a.men>0&&a.morale>=55).length,total=s.armies.filter(a=>a.owner===s.player&&a.men>0).length;
 const short=x.direction==='political'?{title:atWar?(inquiry?label('Await a reply to the peace inquiry','等待议和回信'):label('Send a peace inquiry or secure an agreement','寄出议和书信或达成协议')):label('Maintain twelve months of stable peace','维持十二个月稳定和平'),progress:atWar?(inquiry?label('Inquiry in transit','书信往返中'):label('No peace inquiry pending','尚无待答议和书信')):label(`${peaceMonths}/12 months`,`${peaceMonths}/12个月`),done:atWar?!!inquiry:peaceMonths>=12,target:'government'}:x.direction==='development'?{title:f.treasury<30?label('Restore treasury to 30','将国库恢复至30'):label('Complete a national focus','完成一项国家方针'),progress:f.treasury<30?label(`${f.treasury}/30 treasury`,`${f.treasury}/30 国库`):label(`${completedFocus} completed · ${activeFocus?'one underway':'none underway'}`,`已完成 ${completedFocus} 项 · ${activeFocus?'一项进行中':'暂无进行中'}`),done:f.treasury>=30&&completedFocus>0,target:'focus'}:x.direction==='military'?{title:label('Keep your field armies ready and supplied','保持野战军战备与补给'),progress:label(`${ready}/${total} armies at 55+ morale · ${f.food}/20 food`,`${ready}/${total} 支军队士气≥55 · 粮食 ${f.food}/20`),done:total>0&&ready===total&&f.food>=20,target:'military'}:{title:label('Choose a direction and examine your resources','选择方向并检查资源'),progress:label(`${f.treasury} treasury · ${f.food} food`,`${f.treasury} 国库 · ${f.food} 粮食`),done:false,target:'direction'};
 const long=x.direction==='political'?label('Build a durable political settlement','建立持久政治和解'):x.direction==='development'?label('Build a stable and prosperous state','建设稳定繁荣的国家'):x.direction==='military'?label('Secure your command and end the civil war','巩固指挥并结束内战'):label('Choose a campaign ambition','选择战役抱负');
 const longProgress=x.direction==='political'?label(`${peaceMonths}/12 stable peace months · ${s.peacefulVictory?'settlement achieved':'settlement pending'}`,`稳定和平 ${peaceMonths}/12 月 · ${s.peacefulVictory?'和解达成':'和解未达成'}`):x.direction==='development'?label(`${f.treasury}/50 treasury · ${f.stability}/55 stability · ${completedFocus}/1 focus`,`国库 ${f.treasury}/50 · 稳定度 ${f.stability}/55 · 方针 ${completedFocus}/1`):x.direction==='military'?label(`${regions.length} own theaters · ${s.victory?'victory confirmed':'campaign ongoing'}`,`己方战区 ${regions.length} · ${s.victory?'胜利已确认':'战役仍在进行'}`):label('Select a direction to define a measurable ambition','选择方向以确定可衡量的抱负');
 const longDone=x.direction==='political'?!!s.peacefulVictory:x.direction==='development'?f.treasury>=50&&f.stability>=55&&completedFocus>0&&month(s)-x.started>=12:x.direction==='military'?!!s.victory:false;
 const ambition=ambitionStatus(s);
 return {immediate,short,long:ambition?.title||long,longProgress:ambition?.progress||longProgress,longDone:ambition?.done??longDone,regions:regions.length,months:month(s)-x.started};
}
