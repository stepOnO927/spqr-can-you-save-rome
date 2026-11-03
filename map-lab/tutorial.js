// The tutorial advances only when actual campaign actions are reported by the UI.
export function createTutorial({language,onReset,onMode}){
 let step=-1, running=false, previous=null, pulseTimer=null;
 const $=s=>document.querySelector(s), box=$('#guide'), arrow=$('#guide-pointer');
 const copy={en:{skip:'Skip',continue:'Continue',finish:'Begin independent play',step:'GUIDED CAMPAIGN',invalid:'That action is unavailable. Choose the highlighted option.',wrong:'That is not the current tutorial step. Choose the highlighted option.',steps:[
  ['Who are you?','You command Caesar. Pompey and the Senate oppose you. Your first objective is to secure northern Italy.'],
  ['Read the map','Caesar is red; the Senate is blue-gray. Shared coloring means the sources do not define a precise division. Select Roma to inspect a place.'],
  ['Choose your legion','Select the red Legio XIII standard. The panel shows its commander, soldiers, morale and local supply limit.'],
  ['Choose a destination','Choose Northern Italy from the destination list. It is hostile and controls the route toward Rome.'],
  ['Confirm the march','Check the route, travel time and food warning, then confirm the order.'],
  ['Advance time','Advance one month. Play and pause run time automatically; the speed button changes the rate. The march resolves on the monthly tick.'],
  ['Understand the battle','The enemy is encountered when the army arrives. Open the latest battle report to compare forces and casualties.'],
  ['Manage the republic','Open the resource explanation. Treasury, food and stability influence the real simulation.'],
  ['Your campaign','You are in command. Secure Latium, watch food and loyalty, and use the Chronicle for developments.']
 ]},zh:{skip:'跳过',continue:'继续',finish:'开始自由战役',step:'新手教学',invalid:'这个操作暂时不可用，请选择高亮的选项。',wrong:'这不是当前教学步骤，请选择高亮的选项。',steps:[
  ['你是谁？','你指挥凯撒。庞培与元老院是你的对手。第一个目标是控制意大利北部。'],
  ['认识地图','红色代表凯撒，蓝灰色代表元老院。共用颜色表示史料没有确定的内部界线。点击罗马查看地点。'],
  ['选择军团','点击红色的第十三军团军旗。面板会显示指挥官、人数、士气和当地补给上限。'],
  ['选择目的地','在目的地下拉框中选择意大利北部。这里属于敌方，是通往罗马的要地。'],
  ['确认行军','检查路线、所需月份和粮食提示，然后确认命令。'],
  ['推进时间','点击推进月份。开始／暂停可自动推进；倍速按钮改变速度。行军按月结算。'],
  ['理解战斗','抵达时会遭遇敌军。打开最近战斗报告，对比双方兵力和伤亡。'],
  ['管理共和国','打开资源说明。国库、粮食和稳定度会影响实际模拟。'],
  ['独立指挥','现在由你决定。争取拉丁姆，留意粮食和忠诚度，并用战报查看局势。']
 ]}};
 const data=()=>copy[language()];
 const targets=['','#map [data-city="ROMA"]','#map [data-army="xiii"]','#lab-orders select','#lab-orders button','#advance','#recent-battle','#resources-help',''];
 function unmark(){if(previous){previous.classList.remove('guide-highlight');previous=null}arrow.hidden=true}
 function place(){if(!running)return;const target=targets[step]?$(targets[step]):null;if(target!==previous){unmark();previous=target;if(target){target.classList.add('guide-highlight');target.scrollIntoView({block:'nearest',inline:'nearest'})}}if(target){const r=target.getBoundingClientRect();if(r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth){arrow.hidden=false;arrow.style.left=Math.max(12,Math.min(innerWidth-32,r.left+r.width/2-10))+'px';arrow.style.top=Math.max(72,r.top-31)+'px'}else arrow.hidden=true}}
 function render(){if(!running)return;const c=data();box.hidden=false;$('#guide-label').textContent=`${c.step} · ${step+1}/9`;$('#guide-title').textContent=c.steps[step][0];$('#guide-body').textContent=c.steps[step][1];$('#guide-skip').textContent=c.skip;const next=$('#guide-next');next.hidden=step!==0&&step!==8;next.textContent=step===8?c.finish:c.continue;$('#guide-feedback').textContent='';place()}
 function setStep(next){step=next;unmark();render()}
 function stop(){running=false;box.hidden=true;unmark();if(pulseTimer){clearInterval(pulseTimer);pulseTimer=null}}
 function begin(){running=true;step=0;box.hidden=false;if(pulseTimer)clearInterval(pulseTimer);pulseTimer=setInterval(place,250);render()}
 $('#guide-next').onclick=()=>{if(step===0)setStep(1);else if(step===8)stop()};$('#guide-skip').onclick=stop;
 document.addEventListener('spqr:action',e=>{if(!running)return;const d=e.detail||{};if(d.type==='invalid'){ $('#guide-feedback').textContent=data().invalid;return}if(step===1&&d.type==='city'&&d.id==='ROMA')setStep(2);else if(step===2&&d.type==='army'&&d.id==='xiii')setStep(3);else if(step===3&&d.type==='preview'&&d.id==='italiaN')setStep(4);else if(step===4&&d.type==='order'&&d.id==='italiaN')setStep(5);else if(step===5&&d.type==='advance'&&d.battle)setStep(6);else if(step===5&&d.type==='advance'&&!d.battle){$('#guide-feedback').textContent=language()==='zh'?'本次没有发生战斗，请继续推进或重新开始教学。':'No battle occurred; advance again or restart the tutorial.'}else if(step===6&&d.type==='battle')setStep(7);else if(step===7&&d.type==='resources')setStep(8);else if((step===1&&d.type==='city')||(step===2&&d.type==='army')||(step===3&&d.type==='preview')||(step===4&&d.type==='preview')){if(step===4&&d.type==='preview')setStep(3);$('#guide-feedback').textContent=data().wrong}});
 const start=$('#start-overlay');
 function renderStart(){const zh=language()==='zh';$('#start-title').textContent=zh?'开始公元前49年战役':'Begin the 49 BCE campaign';$('#start-description').textContent=zh?'选择难度，决定是否跟随互动教学。':'Choose a difficulty and whether to follow the interactive tutorial.';$('#difficulty-label').textContent=zh?'难度':'Difficulty';const opts=$('#difficulty').options;opts[0].textContent=zh?'新手：额外初始资源':'Beginner: additional starting resources';opts[1].textContent=zh?'标准：原有开局':'Standard: original starting state';$('#start-guide-label').textContent=zh?'开启互动教学':'Start the interactive tutorial';$('#start-note').textContent=zh?'开始新教学战役会替换当前未保存的原型进度；已保存的存档不受影响。':'Starting a new guided campaign replaces unsaved prototype progress; saved games remain available.';$('#start-game').textContent=zh?'开始新战役':'Start new campaign';$('#start-cancel').textContent=zh?'返回当前战役':'Return to current campaign'}
 function openStart(){renderStart();start.hidden=false}
 $('#start-cancel').onclick=()=>{start.hidden=true;localStorage.setItem('spqr-onboarded','1')};
 $('#start-game').onclick=()=>{const mode=$('#difficulty').value;onReset(mode);onMode(mode);start.hidden=true;localStorage.setItem('spqr-onboarded','1');if($('#start-guide').checked)begin();else stop()};
 $('#guide-restart').onclick=openStart;
 if(!localStorage.getItem('spqr-onboarded'))openStart();
 return {refresh(){renderStart();if(running)render()},stop,isRunning:()=>running};
}
