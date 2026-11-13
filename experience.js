// The First Hundred Days: guidance reads observable campaign state. It never
// issues orders or uses unreported foreign strength, locations or intentions.
import {receivedMail,sendLetter} from './epistulae.js?v=epistulae-2';
import {CHARACTER_CATALOG} from './characters.js?v=separate-crowns-1';

const label=(en,zh)=>[en,zh];
const month=s=>s.year*12+s.month;
const ownArmy=s=>s.armies.find(a=>a.owner===s.player&&a.men>0);
const ownRegions=s=>s.regions.filter(r=>r.owner===s.player);
const aliveLeader=s=>(s.world?.leadership?.[s.player]||[]).find(id=>s.world.characters[id]?.alive&&CHARACTER_CATALOG[id]);
const title=(s,en,zh)=>s.player==='senate'?label(en.replace('Caesar','the Senate'),zh.replace('凯撒','元老院')):label(en,zh);

export const DIRECTIONS={
 military:{name:label('Military campaign','军事行动'),note:label('Protect the field army, investigate routes and decide when to act.','保护野战军、调查路线，并自行决定何时行动。')},
 political:{name:label('Political settlement','政治和解'),note:label('Use correspondence, institutions and agreements to pursue a settlement.','通过书信、制度与条约寻找和解。')},
 development:{name:label('National development','国家发展'),note:label('Build finances, administration and readiness while keeping options open.','改善财政、行政与战备，同时保留选择空间。')}
};

export function initializeExperience(s,{guided=false,presentation='beginner',openingLetter=false}={}){
 if(!s.experience||typeof s.experience!=='object')s.experience={direction:'',presentation,guide:{running:!!guided,paused:false,skipped:!guided,step:0,hints:true},actions:{},milestones:[],decisions:[],started:month(s),openingLetter:null};
 const x=s.experience;x.guide||={running:false,paused:false,skipped:true,step:0,hints:true};x.actions||={};x.milestones||=[];x.decisions||=[];x.presentation||=presentation;
 if(openingLetter&&!x.openingLetter){const leader=aliveLeader(s),home=ownRegions(s)[0]?.id;if(leader&&home){const result=sendLetter(s,{senderId:leader,senderFaction:s.player,recipient:s.player,destination:home,category:'government',priority:'important',subject:s.player==='senate'?label('Pompey asks for a first assessment','庞培请求初步评估'):label('Caesar asks for a first assessment','凯撒请求初步评估'),body:s.player==='senate'?label('Our command is divided and Caesar remains in the field. Review our forces and finances, then decide whether to defend, negotiate or prepare a campaign.','本方指挥分散，凯撒仍有野战军。请先检查军力与财务，再决定防守、谈判或准备行动。'):label('The civil war has begun. Review our legion and supplies, then choose whether to negotiate, develop our resources or prepare a campaign.','内战已起。请检查军团与补给，再决定谈判、发展资源或准备行动。'),options:['war_council','review_budget','acknowledge'],context:{kind:'opening_brief',region:home}});if(result.ok)x.openingLetter=result.letter.id}}
 return x;
}

export function recordExperience(s,action,detail=''){
 const x=initializeExperience(s);x.actions[action]=(x.actions[action]||0)+1;
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
 if(command==='restart'){g.running=true;g.paused=false;g.skipped=false;g.step=0;for(const key of ['army','supply','direction','advance','chronicle','mail','reply'])delete s.experience.actions[key]}
 if(command==='hints')g.hints=!g.hints;
 return g;
}

const paths={
 caesar:[['army','Select one of your legions on the map.','在地图上选择一支己方军团。','army'],['supply','Inspect its supply and condition.','查看该军团的补给与状态。','army'],['direction','Choose your strategic direction.','选择战略方向。','direction'],['advance','Advance one month and observe the world.','推进一个月，观察局势。','advance'],['chronicle','Open the Chronicle and review the result.','打开编年史，检查本月结果。','chronicle'],['mail','Read the political letter in your mailbox.','阅读邮箱中的政治来信。','mail'],['reply','Reply to a political development.','回复一项政治事态。','mail']],
 senate:[['army','Select a Senate field army before judging a threat.','先选择元老院野战军，再判断威胁。','army'],['supply','Review its supply and readiness.','检查该军的补给与战备。','army'],['direction','Choose defense, settlement or development as your emphasis.','选择防守、和解或发展作为重点。','direction'],['advance','Advance time; do not commit to an unknown battle.','推进时间；无须贸然投入未知战斗。','advance'],['chronicle','Review political and military developments.','检查政治与军事新动向。','chronicle'],['mail','Read the leadership message.','阅读领导层来信。','mail'],['reply','Respond to the message.','答复来信。','mail']]
};
export function tutorialStep(s){const x=initializeExperience(s),steps=paths[s.player]||paths.caesar;let index=x.guide.step||0;
 while(index<steps.length){const [key]=steps[index];if((x.actions[key]||0)>0){index++;continue}break}x.guide.step=index;
 return index<steps.length?{index,total:steps.length,key:steps[index][0],title:label(steps[index][1],steps[index][2]),target:steps[index][3]}:null;
}
export function replayLesson(s,index){const x=initializeExperience(s),steps=paths[s.player]||paths.caesar;if(index<0||index>=steps.length)return false;x.guide={...x.guide,running:true,paused:false,skipped:false,step:index};delete x.actions[steps[index][0]];return true}

export function refreshExperience(s){const x=initializeExperience(s),add=(id,en,zh)=>{if(!x.milestones.some(m=>m.id===id))x.milestones.push({id,year:s.year,month:s.month,title:label(en,zh)})};
 if(x.actions.army)add('first_army','Inspected a field army','检查了野战军');
 if(x.actions.direction)add('direction','Chose a campaign direction','选择了战役方向');
 if(x.actions.reply)add('first_reply','Answered a letter','回复了来信');
 if(x.actions.chronicle)add('first_report','Reviewed a campaign report','查阅了战役报告');
 if(month(s)-x.started>=3)add('hundred_days','Completed the first hundred days','完成百日执政');
 if(month(s)-x.started>=12)add('first_year','Completed the first year','完成执政第一年');
 if(month(s)-x.started>=36)add('three_years','Completed three years','完成执政三年');
 tutorialStep(s);return x;
}

const suggestion=(id,priority,action,why,where,cost,benefit,risk,target)=>({id,priority,action:label(...action),why:label(...why),where:label(...where),cost:label(...cost),benefit:label(...benefit),risk:label(...risk),target});
export function recommendations(s){
 const x=initializeExperience(s),f=s.factions[s.player],armies=s.armies.filter(a=>a.owner===s.player&&a.men>0),regions=ownRegions(s),pending=receivedMail(s).filter(m=>!m.archived&&!m.responses.length),unread=pending.find(m=>!m.read),atWar=(s.wars||[]).some(w=>w.includes(s.player)),choices=[];
 if(unread)choices.push(suggestion('mail',100,['Read a pending letter','阅读待处理来信'],['A real message awaits your decision.','一封真实来信等待决定。'],['Mailbox','邮箱'],['No direct cost','无直接费用'],['Learn terms or respond','了解条件或作出回应'],['An offer may expire','提议可能过期'],{kind:'mail',id:unread.id}));
 const weak=armies.find(a=>a.supply<55||a.morale<45);if(weak)choices.push(suggestion('weak-army',95,['Inspect an understrength army','检查状态欠佳的军队'],['Its reported supply or morale is low.','己方补给或士气偏低。'],[weak.name?.[0]||weak.id,weak.name?.[1]||weak.id],['Inspection is free','查看免费'],['Choose a feasible recovery plan','选择可行的恢复方案'],['An order without preparation may fail','仓促下令可能失利'],{kind:'army',id:weak.id}));
 const low=regions.find(r=>r.loyalty<45);if(low)choices.push(suggestion('province',90,['Review a troubled theater','检查不稳战区'],['Local loyalty is low.','当地忠诚度偏低。'],[low.name[0],low.name[1]],['Inspection is free','查看免费'],['Consider tax or administration','考虑税政或行政调整'],['Unrest may grow','不满可能扩大'],{kind:'region',id:low.id}));
 if(!x.direction)choices.push(suggestion('direction',85,['Choose a strategic direction','选择战略方向'],['Your priorities are still unset.','尚未确定行动重点。'],['Campaign progress','战役进度'],['Free; reversible','免费；可更改'],['Objectives reflect your plan','目标将贴合计划'],['No action is locked out','不会锁定其他行动'],{kind:'direction'}));
 if(!x.actions.army&&armies.length)choices.push(suggestion('army',80,['Inspect your first field army','检查第一支野战军'],['You can judge readiness before giving orders.','先了解战备，再考虑下令。'],[armies[0].name?.[0]||armies[0].id,armies[0].name?.[1]||armies[0].id],['Free','免费'],['See strength, morale and supply','查看兵力、士气与补给'],['No order is issued','不会自动下令'],{kind:'army',id:armies[0].id}));
 if(atWar&&f.treasury>=8&&x.direction==='political')choices.push(suggestion('peace',75,['Examine peace correspondence','考虑议和书信'],['A political route remains open during war.','战争中仍可尝试政治途径。'],['Government · diplomacy','政府 · 外交'],['Courier and inquiry cost shown in panel','面板中显示使者及询问费用'],['A negotiated end may preserve control','谈判结束战争可能保留控制权'],['Delivery or acceptance is uncertain','送达或接受均不确定'],{kind:'government'}));
 if(!x.actions.chronicle&&month(s)>x.started)choices.push(suggestion('report',72,['Review the last turn','查看上月结果'],['Time advanced; consequences may be recorded.','时间已推进，结果可能已入史录。'],['Chronicle','编年史'],['Free','免费'],['See confirmed developments','查看已确认进展'],['Reports can reflect limited knowledge','报告受己方认知限制'],{kind:'chronicle'}));
 if(f.treasury>=30&&x.direction!=='military')choices.push(suggestion('focus',55,['Review a national focus','查看国家方针'],['The treasury can support a longer plan.','国库足以考虑长期计划。'],['National focus','国家方针'],['Check project cost in panel','面板中查看项目费用'],['Build economic or administrative capacity','发展经济或行政能力'],['Investment uses time and resources','投资需要时间与资源'],{kind:'focus'}));
 if(f.treasury<25||f.food<15)choices.push(suggestion('budget',70,['Review next month’s budget','查看下月预算'],['A core resource is running low.','核心资源储备偏低。'],['Government · treasury','政府 · 国库'],['Free to review','查看免费'],['Adjust feasible policies','调整可行政策'],['War and events can change the forecast','战争与事件会改变预测'],{kind:'government'}));
 if(!choices.length||choices.length<3)choices.push(suggestion('development',35,['Review government and development','查看政府与发展'],['A quiet month allows institution building.','平静月份适合建设制度。'],['Government','政府'],['Costs vary by action','费用视操作而定'],['Improve stability and capacity','改善稳定度与能力'],['Policy tradeoffs still apply','政策仍有取舍'],{kind:'government'}));
 choices.push(suggestion('time',15,['Advance time when ready','准备好后推进时间'],['Orders, finances and other courts resolve each month.','命令、财政及其他政体按月结算。'],['Time control','时间控制'],['One month','一个月'],['See the consequences of your choices','观察决策结果'],['Unanswered opportunities may change','未处理机会可能变化'],{kind:'time'}));
 return choices.sort((a,b)=>b.priority-a.priority).slice(0,5);
}

export function objectives(s){const x=refreshExperience(s),step=x.guide.running&&!x.guide.paused?tutorialStep(s):null,regions=ownRegions(s),f=s.factions[s.player],atWar=(s.wars||[]).some(w=>w.includes(s.player));
 const immediate=step?{title:step.title,done:false,target:step.target}:receivedMail(s).some(m=>!m.read&&!m.archived)?{title:label('Read a new letter','阅读新来信'),done:false,target:'mail'}:{title:label('Review this month and decide your next action','检查本月局势并决定下一步'),done:false,target:'chronicle'};
 const inquiry=(s.inquiries||[]).find(q=>q.actor===s.player&&q.subject==='peace'&&['pending','awaiting_decision'].includes(q.status));
 const focus=s.world?.nationalFocus?.[s.player],activeFocus=focus?.active||focus?.current;
 const ready=s.armies.filter(a=>a.owner===s.player&&a.men>0&&a.morale>=55).length,total=s.armies.filter(a=>a.owner===s.player&&a.men>0).length;
 const short=x.direction==='political'?{title:atWar?(inquiry?label('Await a reply to the peace inquiry','等待议和回信'):label('Send a peace inquiry or secure an agreement','寄出议和书信或达成协议')):label('Maintain twelve months of stable peace','维持十二个月稳定和平'),progress:atWar?(inquiry?label('Inquiry in transit','书信往返中'):label('No peace inquiry pending','尚无待答议和书信')):label(`${s.world?.peacefulSettlementMonths||0}/12 months`,`${s.world?.peacefulSettlementMonths||0}/12个月`),target:'government'}:x.direction==='development'?{title:f.treasury<30?label('Restore treasury to 30','将国库恢复至30'):activeFocus?label('Complete the active national focus','完成进行中的国家方针'):label('Begin a focus or infrastructure project','启动方针或基础设施项目'),progress:f.treasury<30?label(`${f.treasury}/30 treasury`,`${f.treasury}/30 国库`):activeFocus?label('Project underway','项目进行中'):label('No active national focus','暂无进行中的国家方针'),target:'focus'}:x.direction==='military'?{title:label('Keep a ready field army and secure your theater','保持野战军战备并巩固战区'),progress:label(`${ready}/${total} armies at 55+ morale · ${f.food} food`,`${ready}/${total} 支军队士气≥55 · 粮食 ${f.food}`),target:'military'}:{title:label('Choose a direction and examine your resources','选择方向并检查资源'),progress:label(`${f.treasury} treasury · ${f.food} food`,`${f.treasury} 国库 · ${f.food} 粮食`),target:'direction'};
 const long=x.direction==='political'?label('Build a durable political settlement','建立持久政治和解'):x.direction==='development'?label('Build a stable and prosperous state','建设稳定繁荣的国家'):x.direction==='military'?label('Secure your command and end the civil war','巩固指挥并结束内战'):label('Choose a campaign ambition','选择战役抱负');
 return {immediate,short,long,regions:regions.length,months:month(s)-x.started};
}
