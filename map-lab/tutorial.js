// The tutorial advances only when actual campaign actions are reported by the UI.
export function createTutorial({language,onReset,onMode,skipInitial=false}){
 let step=-1, running=false, previous=null, pulseTimer=null, faction='caesar';
 const $=s=>document.querySelector(s), box=$('#guide'), arrow=$('#guide-pointer');
 const copy={en:{skip:'Skip',continue:'Continue',finish:'Begin independent play',step:'GUIDED CAMPAIGN',invalid:'That action is unavailable. Choose the highlighted option.',wrong:'That is not the current tutorial step. Choose the highlighted option.',steps:[
  ['Who are you?','You command Caesar. Pompey and the Senate oppose you. Your first objective is to secure northern Italy.'],
  ['Identify your command','You control Caesar’s red standards and territory. The Senate is blue-gray; other powers are neutral unless at war. Select Legio XIII. Shared outlines do not imply a precise border.'],
  ['Inspect your legion','Caesar commands 7,200 soldiers. Morale and experience affect battle. The local supply limit is informational. Continue to choose an adjacent destination.'],
  ['Choose a destination','Choose Northern Italy from the destination list. It is hostile and controls the route toward Rome.'],
  ['Confirm the march','Check the route, travel time and food warning, then confirm the order.'],
  ['Advance time','Advance one month. Play and pause run time automatically; the speed button changes the rate. The march resolves on the monthly tick.'],
  ['Understand the battle','The enemy is encountered when the army arrives. Open the report to see your forces and losses; exact enemy details remain unknown.'],
  ['Territory and cities','Select Ariminum. Cities are historical locations; control belongs to strategic regions. A fort may require a siege before control changes.'],
  ['Manage the republic','Open the resource explanation. Treasury, food and stability influence the real simulation.'],
  ['Your campaign','You are in command. Secure Latium, watch food and loyalty, and use the Chronicle for developments.']
 ]},zh:{skip:'跳过',continue:'继续',finish:'开始自由战役',step:'新手教学',invalid:'这个操作暂时不可用，请选择高亮的选项。',wrong:'这不是当前教学步骤，请选择高亮的选项。',steps:[
  ['你是谁？','你指挥凯撒。庞培与元老院是你的对手。第一个目标是控制意大利北部。'],
  ['辨认你的军队','你指挥红色的凯撒派；元老院为蓝灰色，其他势力是否敌对取决于战争状态。点击第十三军团。共用轮廓不代表精确边界。'],
  ['查看你的军团','凯撒指挥7200名将士。士气与经验影响战斗；当地补给上限目前仅供参考。点击继续，选择相邻目的地。'],
  ['选择目的地','在目的地下拉框中选择意大利北部。这里属于敌方，是通往罗马的要地。'],
  ['确认行军','检查路线、所需月份和粮食提示，然后确认命令。'],
  ['推进时间','点击推进月份。开始／暂停可自动推进；倍速按钮改变速度。行军按月结算。'],
  ['理解战斗','抵达时会遭遇敌军。打开战报查看己方兵力与伤亡；敌方确切数据仍未知。'],
  ['战区与城市','点击阿里米努姆。城市是历史地点，控制权属于战区；有工事时可能需要围攻才能占领。'],
  ['管理共和国','打开资源说明。国库、粮食和稳定度会影响实际模拟。'],
  ['独立指挥','现在由你决定。争取拉丁姆，留意粮食和忠诚度，并用战报查看局势。']
 ]}};
 const senateSteps={en:[
  ['Who are you?','You command the Senate and Pompey against Caesar. Your first goal is to assess the northern frontier and protect Rome.'],
  ['Identify your command','Your standards are blue-gray; Caesar’s are red. Other powers are neutral unless at war. Select the Italian levies. Shared outlines do not imply a precise border.'],
  ['Inspect your forces','The Italian levies begin with 5,200 soldiers under an unnamed officer. Morale and experience affect battle; the local supply limit is informational.'],
  ['Choose a destination','Choose Cisalpine Gaul to inspect a possible operation. This is not an order to attack.'],
  ['Assess the risk','Open the order review. Compare your 5,200 soldiers and morale, commander, terrain, report date, confidence and uncertain enemy strength.'],
  ['Choose your operation','Attack now, send scouts, probe, reinforce, delay or cancel. Every choice is valid; no battle result is scripted.'],
  ['Read the outcome','Advance a month for scouts, movement or AI decisions. If a battle occurs, inspect its review. You may continue without attacking.'],
  ['Territory and cities','Select Ravenna. Cities are historical locations; control belongs to strategic regions. A fort may require a siege before control changes.'],
  ['Manage the republic','Open the resource explanation. Treasury, food and stability influence the real simulation.'],
  ['Your campaign','You are in command. Protect Rome, watch food and loyalty, and use the Chronicle for developments.']
 ],zh:[
  ['你是谁？','你指挥元老院与庞培派，对抗凯撒。先评估北方前线，并保卫罗马。'],
  ['辨认你的军队','你指挥蓝灰色的元老院派；凯撒派为红色，其他势力是否敌对取决于战争状态。点击意大利征召军。共用轮廓不代表精确边界。'],
  ['查看你的部队','意大利征召军最初有5200人，由未具名军官指挥。士气与经验影响战斗；当地补给上限目前仅供参考。'],
  ['选择目的地','选择山南高卢以评估可能的行动。此时并未下达进攻令。'],
  ['评估风险','打开命令评估，对比己方5200人、士气、指挥官、地形、情报日期与可信度，以及不确定的敌军兵力。'],
  ['选择行动','可以立即进攻、派斥候、试探、增援、延迟或取消。每个选择都有效；不会预设战斗输赢。'],
  ['查看结果','推进一个月，观察侦察、行军和敌方决策；若发生战斗，查看复盘。不进攻也能继续教学。'],
  ['战区与城市','点击拉文纳。城市是历史地点，控制权属于战区；有工事时可能需要围攻才能占领。'],
  ['管理共和国','打开资源说明。国库、粮食和稳定度会影响实际模拟。'],
  ['独立指挥','现在由你决定。保卫罗马，留意粮食和忠诚度，并用战报查看局势。']
 ]};
 const data=()=>({...copy[language()],steps:faction==='senate'?senateSteps[language()]:copy[language()].steps});
 const scenario=()=>faction==='senate'?{army:'italy',destination:'cisalpine',city:'RAVENNA'}:{army:'xiii',destination:'italiaN',city:'ARIMINUM'};
 const targets=()=>faction==='senate'?['',`#map [data-army="${scenario().army}"]`,'#command-detail','#lab-orders select','#lab-orders button','.prebattle-screen','#advance',`#map [data-city="${scenario().city}"]`,'#resources-help','']:['',`#map [data-army="${scenario().army}"]`,'#command-detail','#lab-orders select','#lab-orders button','#advance','#recent-battle',`#map [data-city="${scenario().city}"]`,'#resources-help',''];
 function unmark(){if(previous){previous.classList.remove('guide-highlight');previous=null}arrow.hidden=true}
 function place(){if(!running)return;const selector=targets()[step],target=selector?$(selector):null;if(target!==previous){unmark();previous=target;if(target){target.classList.add('guide-highlight');target.scrollIntoView({block:'nearest',inline:'nearest'})}}if(target){const r=target.getBoundingClientRect();if(r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth){arrow.hidden=false;arrow.style.left=Math.max(12,Math.min(innerWidth-32,r.left+r.width/2-10))+'px';arrow.style.top=Math.max(72,r.top-31)+'px'}else arrow.hidden=true}}
 function render(){if(!running)return;const c=data();box.hidden=false;document.body.classList.toggle('guide-army-step',step===1);$('#guide-label').textContent=`${c.step} · ${step+1}/10`;$('#guide-title').textContent=c.steps[step][0];$('#guide-body').textContent=c.steps[step][1];$('#guide-skip').textContent=c.skip;const next=$('#guide-next');next.hidden=step!==0&&step!==2&&step!==9&&!(faction==='senate'&&step===6);next.textContent=step===9?c.finish:c.continue;$('#guide-feedback').textContent='';place()}
 function setStep(next){step=next;unmark();render()}
 function stop(){running=false;box.hidden=true;document.body.classList.remove('guide-army-step');unmark();if(pulseTimer){clearInterval(pulseTimer);pulseTimer=null}}
 function begin(side){faction=side;running=true;step=0;box.hidden=false;if(pulseTimer)clearInterval(pulseTimer);pulseTimer=setInterval(place,250);render()}
 $('#guide-next').onclick=()=>{if(step===0)setStep(1);else if(step===2)setStep(3);else if(faction==='senate'&&step===6)setStep(7);else if(step===9)stop()};$('#guide-skip').onclick=stop;
 document.addEventListener('spqr:action',e=>{if(!running)return;const d=e.detail||{},plan=scenario();if(d.type==='invalid'){ $('#guide-feedback').textContent=data().invalid;return}if(step===1&&d.type==='army'&&d.id===plan.army)setStep(2);else if(step===3&&d.type==='preview'&&d.id===plan.destination)setStep(4);else if(faction==='senate'&&step===4&&d.type==='assessment')setStep(5);else if(faction==='senate'&&step===5&&['order','scouts','probe','reinforce','delay','cancel'].includes(d.type))setStep(6);else if(faction==='senate'&&step===6&&d.type==='battle')setStep(7);else if(faction!=='senate'&&step===4&&d.type==='order'&&d.id===plan.destination)setStep(5);else if(faction!=='senate'&&step===5&&d.type==='advance'&&d.battle)setStep(6);else if(faction!=='senate'&&step===5&&d.type==='advance'&&!d.battle)setStep(7);else if(faction!=='senate'&&step===6&&d.type==='battle')setStep(7);else if(step===7&&d.type==='city'&&d.id===plan.city)setStep(8);else if(step===8&&d.type==='resources')setStep(9);else if((step===1&&d.type==='army')||(step===3&&d.type==='preview')||(step===4&&d.type==='preview')){if(step===4&&d.type==='preview')setStep(3);$('#guide-feedback').textContent=data().wrong}});
 const start=$('#start-overlay');
 function renderStart(){const zh=language()==='zh',senate=$('#roman-faction').value==='senate';$('#roman-faction-label').textContent=zh?'罗马阵营':'Roman faction';$('#roman-faction').options[0].textContent=zh?'凯撒派':'Caesarian command';$('#roman-faction').options[1].textContent=zh?'元老院与庞培派':'Senate and Pompeian command';$('#roman-faction-note').textContent=zh?'双方都是罗马阵营，各有互动教学。':'Both Roman commands have guided tutorials.';$('#start-game').disabled=false;document.querySelector('.intro-leader img').src=senate?'../assets/portraits/pompey-128.jpg':'../assets/portraits/caesar-128.jpg';document.querySelector('.intro-leader img').alt=senate?(zh?'庞培，艺术复原':'Pompey, artistic reconstruction'):(zh?'凯撒，艺术复原':'Caesar, artistic reconstruction');$('#start-title').textContent=zh?'开始公元前49年战役':'Begin the 49 BCE campaign';$('#start-description').textContent=senate?(zh?'公元前49年，共和国陷入内战。你指挥元老院与庞培派，保卫意大利并应对凯撒的军队。肖像为艺术复原。':'49 BCE: Rome is divided by civil war. Command the Senate and Pompey against Caesar. Defend Italy and manage the Republic. Portrait is an artistic reconstruction.'):(zh?'公元前49年，共和国陷入内战。你指挥凯撒与12,600名将士，对抗庞培及元老院。先向意大利推进，同时管理粮食、国库与政治稳定。插画为原创示意。':'49 BCE: Rome is divided by civil war. Command Caesar and 12,600 soldiers against Pompey and the Senate. Advance into Italy while managing food, treasury and political stability. Original interpretive portrait.');$('#difficulty-label').textContent=zh?'难度':'Difficulty';const opts=$('#difficulty').options;opts[0].textContent=zh?'新手：额外初始资源':'Beginner: additional starting resources';opts[1].textContent=zh?'标准：原有开局':'Standard: original starting state';$('#start-guide-label').textContent=zh?'教学可随时跳过':'Tutorial can be skipped at any time';$('#start-guide').parentElement.hidden=true;$('#start-note').textContent=zh?'开始新战役会替换当前未保存的原型进度；已保存的存档不受影响。':'Starting a new campaign replaces unsaved prototype progress; saved games remain available.';$('#start-game').textContent=zh?'开始互动教学':'Start tutorial';$('#start-free').textContent=zh?'自由开始':'Play freely';$('#start-cancel').textContent=zh?'返回当前战役':'Return to current campaign'}
 $('#roman-faction').onchange=renderStart;
 function openStart(){renderStart();start.hidden=false}
 $('#start-cancel').onclick=()=>{start.hidden=true;localStorage.setItem('spqr-onboarded','1')};
 $('#start-game').onclick=()=>{const mode=$('#difficulty').value,side=$('#roman-faction').value;onReset(mode,side);onMode(mode);start.hidden=true;localStorage.setItem('spqr-onboarded','1');begin(side)};
 $('#start-free').onclick=()=>{const mode=$('#difficulty').value;onReset(mode,$('#roman-faction').value);onMode(mode);start.hidden=true;localStorage.setItem('spqr-onboarded','1');stop()};
 $('#guide-restart').onclick=openStart;
 if(!skipInitial&&!localStorage.getItem('spqr-onboarded'))openStart();
 return {refresh(){renderStart();if(running)render()},stop,isRunning:()=>running};
}
