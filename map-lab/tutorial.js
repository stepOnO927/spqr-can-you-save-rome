// The tutorial advances only when actual campaign actions are reported by the UI.
export function createTutorial({language,onReset,onMode}){
 let step=-1, running=false, previous=null, pulseTimer=null;
 const $=s=>document.querySelector(s), box=$('#guide'), arrow=$('#guide-pointer');
 const copy={en:{skip:'Skip',continue:'Continue',finish:'Begin independent play',step:'GUIDED CAMPAIGN',invalid:'That action is unavailable. Choose the highlighted option.',wrong:'That is not the current tutorial step. Choose the highlighted option.',steps:[
  ['Who are you?','You command Caesar. Pompey and the Senate oppose you. Your first objective is to secure northern Italy.'],
  ['Identify your command','You control Caesar’s red standards and territory. The Senate is blue-gray; other powers are neutral unless at war. Select Legio XIII. Shared outlines do not imply a precise border.'],
  ['Inspect your legion','Caesar commands 7,200 soldiers. Morale and experience affect battle. The local supply limit is informational. Continue to choose an adjacent destination.'],
  ['Choose a destination','Choose Northern Italy from the destination list. It is hostile and controls the route toward Rome.'],
  ['Confirm the march','Check the route, travel time and food warning, then confirm the order.'],
  ['Advance time','Advance one month. Play and pause run time automatically; the speed button changes the rate. The march resolves on the monthly tick.'],
  ['Understand the battle','The enemy is encountered when the army arrives. Open the latest battle report to compare forces and casualties.'],
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
  ['理解战斗','抵达时会遭遇敌军。打开最近战斗报告，对比双方兵力和伤亡。'],
  ['战区与城市','点击阿里米努姆。城市是历史地点，控制权属于战区；有工事时可能需要围攻才能占领。'],
  ['管理共和国','打开资源说明。国库、粮食和稳定度会影响实际模拟。'],
  ['独立指挥','现在由你决定。争取拉丁姆，留意粮食和忠诚度，并用战报查看局势。']
 ]}};
 const data=()=>copy[language()];
 const targets=['','#map [data-army="xiii"]','#command-detail','#lab-orders select','#lab-orders button','#advance','#recent-battle','#map [data-city="ARIMINUM"]','#resources-help',''];
 function unmark(){if(previous){previous.classList.remove('guide-highlight');previous=null}arrow.hidden=true}
 function place(){if(!running)return;const target=targets[step]?$(targets[step]):null;if(target!==previous){unmark();previous=target;if(target){target.classList.add('guide-highlight');target.scrollIntoView({block:'nearest',inline:'nearest'})}}if(target){const r=target.getBoundingClientRect();if(r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth){arrow.hidden=false;arrow.style.left=Math.max(12,Math.min(innerWidth-32,r.left+r.width/2-10))+'px';arrow.style.top=Math.max(72,r.top-31)+'px'}else arrow.hidden=true}}
 function render(){if(!running)return;const c=data();box.hidden=false;$('#guide-label').textContent=`${c.step} · ${step+1}/10`;$('#guide-title').textContent=c.steps[step][0];$('#guide-body').textContent=c.steps[step][1];$('#guide-skip').textContent=c.skip;const next=$('#guide-next');next.hidden=step!==0&&step!==2&&step!==9;next.textContent=step===9?c.finish:c.continue;$('#guide-feedback').textContent='';place()}
 function setStep(next){step=next;unmark();render()}
 function stop(){running=false;box.hidden=true;unmark();if(pulseTimer){clearInterval(pulseTimer);pulseTimer=null}}
 function begin(){running=true;step=0;box.hidden=false;if(pulseTimer)clearInterval(pulseTimer);pulseTimer=setInterval(place,250);render()}
 $('#guide-next').onclick=()=>{if(step===0)setStep(1);else if(step===2)setStep(3);else if(step===9)stop()};$('#guide-skip').onclick=stop;
 document.addEventListener('spqr:action',e=>{if(!running)return;const d=e.detail||{};if(d.type==='invalid'){ $('#guide-feedback').textContent=data().invalid;return}if(step===1&&d.type==='army'&&d.id==='xiii')setStep(2);else if(step===3&&d.type==='preview'&&d.id==='italiaN')setStep(4);else if(step===4&&d.type==='order'&&d.id==='italiaN')setStep(5);else if(step===5&&d.type==='advance'&&d.battle)setStep(6);else if(step===5&&d.type==='advance'&&!d.battle)setStep(7);else if(step===6&&d.type==='battle')setStep(7);else if(step===7&&d.type==='city'&&d.id==='ARIMINUM')setStep(8);else if(step===8&&d.type==='resources')setStep(9);else if((step===1&&d.type==='army')||(step===3&&d.type==='preview')||(step===4&&d.type==='preview')){if(step===4&&d.type==='preview')setStep(3);$('#guide-feedback').textContent=data().wrong}});
 const start=$('#start-overlay');
 function renderStart(){const zh=language()==='zh';$('#start-title').textContent=zh?'开始公元前49年战役':'Begin the 49 BCE campaign';$('#start-description').textContent=zh?'公元前49年，共和国陷入内战。你指挥凯撒与12,600名将士，对抗庞培及元老院。先向意大利推进，同时管理粮食、国库与政治稳定。插画为原创示意。':'49 BCE: Rome is divided by civil war. Command Caesar and 12,600 soldiers against Pompey and the Senate. Advance into Italy while managing food, treasury and political stability. Original interpretive portrait.';$('#difficulty-label').textContent=zh?'难度':'Difficulty';const opts=$('#difficulty').options;opts[0].textContent=zh?'新手：额外初始资源':'Beginner: additional starting resources';opts[1].textContent=zh?'标准：原有开局':'Standard: original starting state';$('#start-guide-label').textContent=zh?'教学可随时跳过':'Tutorial can be skipped at any time';$('#start-guide').parentElement.hidden=true;$('#start-note').textContent=zh?'开始新教学战役会替换当前未保存的原型进度；已保存的存档不受影响。':'Starting a new guided campaign replaces unsaved prototype progress; saved games remain available.';$('#start-game').textContent=zh?'开始互动教学':'Start tutorial';$('#start-free').textContent=zh?'自由开始':'Play freely';$('#start-cancel').textContent=zh?'返回当前战役':'Return to current campaign'}
 function openStart(){renderStart();start.hidden=false}
 $('#start-cancel').onclick=()=>{start.hidden=true;localStorage.setItem('spqr-onboarded','1')};
 $('#start-game').onclick=()=>{const mode=$('#difficulty').value;onReset(mode);onMode(mode);start.hidden=true;localStorage.setItem('spqr-onboarded','1');begin()};
 $('#start-free').onclick=()=>{const mode=$('#difficulty').value;onReset(mode);onMode(mode);start.hidden=true;localStorage.setItem('spqr-onboarded','1');stop()};
 $('#guide-restart').onclick=openStart;
 if(!localStorage.getItem('spqr-onboarded'))openStart();
 return {refresh(){renderStart();if(running)render()},stop,isRunning:()=>running};
}
