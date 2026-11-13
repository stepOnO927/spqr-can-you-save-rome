// The tutorial follows only the selected friendly army, not an unrelated battle.
export function tutorialTurnProgress(state,side){
 const armyId=side==='senate'?'italy':'xiii',destination=side==='senate'?'cisalpine':'italiaN';
 const battle=(state.battles||[]).find(b=>b.year===state.year&&b.month===state.month&&((b.attacker?.owner===side&&b.attacker.id===armyId)||(b.defender?.owner===side&&b.defender.id===armyId)));
 if(battle)return {kind:'battle',armyId};
 const unit=state.armies.find(a=>a.id===armyId&&a.owner===side);if(!unit)return {kind:'unavailable',armyId};
 if(unit.move)return {kind:'marching',armyId,remaining:unit.move.remaining};
 if(unit.siege)return {kind:'siege',armyId};
 return {kind:unit.region===destination?'arrived':'stopped',armyId};
}

// The tutorial advances only when actual campaign actions are reported by the UI.
export function createTutorial({language,onReset,onMode,getState,skipInitial=false}){
 let step=-1, running=false, previous=null, pulseTimer=null, faction='caesar', ordered=false, battlePending=false;
 const $=s=>document.querySelector(s), box=$('#guide'), arrow=$('#guide-pointer');
 const copy={en:{skip:'Skip',continue:'Continue',finish:'Begin independent play',step:'GUIDED CAMPAIGN',invalid:'That action is unavailable. Choose the highlighted option.',wrong:'That is not the current tutorial step. Choose the highlighted option.',steps:[
  ['Who are you?','You command Caesar. Pompey and the Senate oppose you. Your first objective is to secure northern Italy.'],
  ['Identify your command','You control Caesar’s red standards and territory. The Senate is blue-gray; other powers are neutral unless at war. Select Legio XIII. Shared outlines do not imply a precise border.'],
  ['Inspect your legion','Caesar commands 7,200 soldiers. Morale and experience affect battle. The local supply limit is informational. Continue to choose an adjacent destination.'],
  ['Preview a route','Choose any highlighted adjacent destination. Red means hostile. You can inspect the route without committing to an attack.'],
  ['Choose your plan','Review travel time, food and enemy uncertainty. Confirm a safe or hostile march, or advance the month to postpone this attack.'],
  ['Orders and time','A march can be cancelled before arrival. Advance a month to resolve orders, sieges, economy and enemy moves.'],
  ['Review the outcome','If a battle occurred, open its report to see your losses. Otherwise continue; a siege or quiet month is also a real outcome.'],
  ['Territory and cities','Select Ariminum. Cities are historical locations; control belongs to strategic regions. A fort may require a siege before control changes.'],
  ['Manage the republic','Open the resource explanation. Treasury, food and stability influence the real simulation.'],
  ['Your campaign','You are in command. Secure Latium, watch food and loyalty, and use the Chronicle for developments.']
 ]},zh:{skip:'跳过',continue:'继续',finish:'开始自由战役',step:'战役教学',invalid:'这个操作暂时不可用，请选择高亮的选项。',wrong:'这不是当前教学步骤，请选择高亮的选项。',steps:[
  ['你是谁？','你指挥凯撒。庞培与元老院是你的对手。第一个目标是控制意大利北部。'],
  ['辨认你的军队','你指挥红色的凯撒派；元老院为蓝灰色，其他势力是否敌对取决于战争状态。点击第十三军团。共用轮廓不代表精确边界。'],
  ['查看你的军团','凯撒指挥7200名将士。士气与经验影响战斗；当地补给上限目前仅供参考。点击继续，选择相邻目的地。'],
  ['预览路线','选择任意高亮的相邻战区。红色表示敌对；预览路线不会强迫你进攻。'],
  ['决定行动','检查行程、粮食和敌情风险。可以确认安全或敌对路线，也可以推进月份，暂缓进攻。'],
  ['命令与时间','抵达前可取消行军。推进一个月将结算命令、围攻、经济和敌军行动。'],
  ['查看结果','若发生战斗，打开报告查看伤亡；否则继续教学。围攻或平静的一月也是实际结果。'],
  ['战区与城市','点击阿里米努姆。城市是历史地点，控制权属于战区；有工事时可能需要围攻才能占领。'],
  ['管理共和国','打开资源说明。国库、粮食和稳定度会影响实际模拟。'],
  ['独立指挥','现在由你决定。争取拉丁姆，留意粮食和忠诚度，并用战报查看局势。']
 ]}};
 const senateSteps={en:[
  ['Who are you?','You command the Senate and Pompey against Caesar. Your first goal is to challenge Caesar in Cisalpine Gaul.'],
  ['Identify your command','Your standards are blue-gray; Caesar’s are red. Other powers are neutral unless at war. Select the Italian levies. Shared outlines do not imply a precise border.'],
  ['Inspect your forces','The Italian levies begin with 5,200 soldiers under a named fictional officer. Morale and experience affect battle; the local supply limit is informational.'],
  ['Preview a route','Choose any highlighted adjacent destination. Cisalpine Gaul is hostile and may hold Caesar’s forces; you may inspect a safer route.'],
  ['Choose your plan','Review travel time and food. Confirm a march or advance the month to defend and postpone the attack.'],
  ['Orders and time','A march can be cancelled before arrival. Advance a month to resolve orders, sieges, economy and enemy moves.'],
  ['Review the outcome','If a battle occurred, open its report to see your losses. Otherwise continue; a siege or quiet month is also a real outcome.'],
  ['Territory and cities','Select Ravenna. Cities are historical locations; control belongs to strategic regions. A fort may require a siege before control changes.'],
  ['Manage the republic','Open the resource explanation. Treasury, food and stability influence the real simulation.'],
  ['Your campaign','You are in command. Protect Rome, watch food and loyalty, and use the Chronicle for developments.']
 ],zh:[
  ['你是谁？','你指挥元老院与庞培派，对抗凯撒。第一个目标是争夺山南高卢。'],
  ['辨认你的军队','你指挥蓝灰色的元老院派；凯撒派为红色，其他势力是否敌对取决于战争状态。点击意大利征召军。共用轮廓不代表精确边界。'],
  ['查看你的部队','意大利征召军最初有5200人，由有独立档案的虚构军官指挥。士气与经验影响战斗；当地补给上限目前仅供参考。'],
  ['预览路线','选择任意高亮的相邻战区。山南高卢属于敌方，可能有凯撒军队；也可先看更安全的路线。'],
  ['决定行动','检查行程和粮食。可以确认行军，也可以推进月份防守，暂缓进攻。'],
  ['命令与时间','抵达前可取消行军。推进一个月将结算命令、围攻、经济和敌军行动。'],
  ['查看结果','若发生战斗，打开报告查看伤亡；否则继续教学。围攻或平静的一月也是实际结果。'],
  ['战区与城市','点击拉文纳。城市是历史地点，控制权属于战区；有工事时可能需要围攻才能占领。'],
  ['管理共和国','打开资源说明。国库、粮食和稳定度会影响实际模拟。'],
  ['独立指挥','现在由你决定。保卫罗马，留意粮食和忠诚度，并用战报查看局势。']
 ]};
 const data=()=>({...copy[language()],steps:faction==='senate'?senateSteps[language()]:copy[language()].steps});
 const scenario=()=>faction==='senate'?{army:'italy',destination:'cisalpine',city:'RAVENNA'}:{army:'xiii',destination:'italiaN',city:'ARIMINUM'};
 const targets=()=>['',`#map [data-army="${scenario().army}"]`,'#command-detail','#lab-orders select','#lab-orders button','#advance','#recent-battle',`#map [data-city="${scenario().city}"]`,'#resources-help','#factions','#objectives',''];
 const extra={en:[['Intelligence and uncertainty','Open Factions and inspect a foreign power. Reports are dated and may be incomplete or wrong; investigating costs treasury and time.'],['Objectives and victory','Select an objective. These are strategic milestones, not final victory. Final victory requires the opposing Roman command to lose every theater and field army; a courier then needs three months. Play may continue afterward.'],['Independent command','You may attack, defend, recruit or negotiate. Keep an eye on your resources and the Chronicle.']],zh:[['情报与不确定性','打开势力并查看外国势力。报告有观察日期，可能不完整或有误；调查要花国库和时间。'],['目标与胜利','点击一项目标。它们是战略里程碑，不等于最终胜利。敌对罗马阵营失去全部战区和野战军后，还需等待三个月的信使消息；胜利后可以继续玩。'],['独立指挥','你可以进攻、防守、征召或议和。留意资源和战报。']]};
 const allSteps=()=>[...data().steps.slice(0,9),...extra[language()]];
 function persist(){const s=getState?.();if(s)s.tutorial={running,step,faction,ordered,battlePending}}
 function unmark(){if(previous){previous.classList.remove('guide-highlight');previous=null}arrow.hidden=true}
 function place(){if(!running)return;const selector=targets()[step],target=selector?$(selector):null;if(target!==previous){unmark();previous=target;if(target){target.classList.add('guide-highlight');target.scrollIntoView({block:'nearest',inline:'nearest'})}}if(target){const r=target.getBoundingClientRect();if(r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth){arrow.hidden=false;arrow.style.left=Math.max(12,Math.min(innerWidth-32,r.left+r.width/2-10))+'px';arrow.style.top=Math.max(72,r.top-31)+'px'}else arrow.hidden=true}}
 function render(){if(!running)return;const c=data(),steps=allSteps();box.hidden=false;$('#guide-label').textContent=`${c.step} · ${step+1}/${steps.length}`;$('#guide-title').textContent=steps[step][0];$('#guide-body').textContent=steps[step][1];$('#guide-skip').textContent=c.skip;const next=$('#guide-next');next.hidden=![0,2,6,11].includes(step)||(step===6&&battlePending);next.textContent=step===11?c.finish:c.continue;$('#guide-feedback').textContent='';place()}
 function setStep(next){step=next;persist();unmark();render()}
 function stop(){running=false;persist();box.hidden=true;unmark();if(pulseTimer){clearInterval(pulseTimer);pulseTimer=null}}
 function begin(side){faction=side;running=true;ordered=false;battlePending=false;step=0;persist();box.hidden=false;if(pulseTimer)clearInterval(pulseTimer);pulseTimer=setInterval(place,250);render()}
 $('#guide-next').onclick=()=>{if(step===0)setStep(1);else if(step===2)setStep(3);else if(step===6)setStep(7);else if(step===11)stop()};$('#guide-skip').onclick=stop;
 document.addEventListener('spqr:action',e=>{if(!running)return;const d=e.detail||{};if(d.type==='invalid'){$('#guide-feedback').textContent=data().invalid;return}
  if(step===1&&d.type==='army'&&d.own)setStep(2);
  else if(step===3&&d.type==='preview')setStep(4);
  else if(step===4&&d.type==='order'){ordered=true;persist();setStep(5)}
  else if(step===4&&d.type==='advance'){ordered=false;battlePending=!!d.battle;persist();setStep(6)}
  else if(step===5&&d.type==='cancel'){ordered=false;persist();setStep(4)}
  else if(step===5&&d.type==='advance'){battlePending=!!d.battle;persist();setStep(6)}
  else if(step===6&&d.type==='battle'){battlePending=false;persist();setStep(7)}
  else if(step===7&&d.type==='city')setStep(8);
  else if(step===8&&d.type==='resources')setStep(9);
  else if(step===9&&d.type==='intelligence')setStep(10);
  else if(step===10&&d.type==='objective')setStep(11);
 });
 const start=$('#start-overlay');let initialStart=!skipInitial;$('#start-language').onclick=()=>$('#language').click();
 function renderStart(){const zh=language()==='zh',senate=$('#roman-faction').value==='senate',touring=$('#difficulty').value==='travel';$('#roman-faction-label').textContent=zh?'罗马阵营':'Roman faction';$('#roman-faction').options[0].textContent=zh?'凯撒派':'Caesarian command';$('#roman-faction').options[1].textContent=zh?'元老院与庞培派':'Senate and Pompeian command';$('#roman-faction-note').textContent=zh?'双方都是罗马阵营，各有互动教学。':'Both Roman commands have guided tutorials.';$('#start-game').disabled=false;document.querySelector('.intro-leader img').src=senate?'../assets/portraits/pompey-128.jpg':'../assets/portraits/caesar-128.jpg';document.querySelector('.intro-leader img').alt=senate?(zh?'庞培，艺术复原':'Pompey, artistic reconstruction'):(zh?'凯撒，艺术复原':'Caesar, artistic reconstruction');$('#start-title').textContent=zh?'开始公元前49年战役':'Begin the 49 BCE campaign';$('#start-description').textContent=senate?(zh?'公元前49年，共和国陷入内战。你指挥元老院与庞培派，保卫意大利并应对凯撒的军队。肖像为艺术复原。':'49 BCE: Rome is divided by civil war. Command the Senate and Pompey against Caesar. Defend Italy and manage the Republic. Portrait is an artistic reconstruction.'):(zh?'公元前49年，共和国陷入内战。你指挥凯撒与12,600名将士，对抗庞培及元老院。先向意大利推进，同时管理粮食、国库与政治稳定。插画为原创示意。':'49 BCE: Rome is divided by civil war. Command Caesar and 12,600 soldiers against Pompey and the Senate. Advance into Italy while managing food, treasury and political stability. Original interpretive portrait.');if(touring)$('#start-description').textContent=zh?'旅行模式：你将拥有丰厚资源、完整的模拟官员班子和额外军团。羽毛会在整局提供建议；敌方情报仍可能过时。':'Travel mode: begin with abundant resources, a full simulated staff, and extra legions. Feather advises throughout the campaign; enemy reports may still be outdated.';$('#difficulty-label').textContent=zh?'难度':'Difficulty';const opts=$('#difficulty').options;opts[0].textContent=zh?'旅行：充足资源、完整官员与羽毛全程指导':'Travel: abundant resources, full staff and Feather guidance';opts[1].textContent=zh?'新手：有限资源补助与更多提示':'Beginner: limited bonus and more guidance';opts[2].textContent=zh?'标准：正常规则':'Standard: normal rules';opts[3].textContent=zh?'困难：更有计划的对手':'Hard: more deliberate opponents';opts[4].textContent=zh?'棋手：审慎的战略规划':'Grandmaster: careful strategic planning';$('#economic-handicap-label').textContent=zh?'可选经济惩罚：困难收入与粮食 −10%；棋手 −20%':'Optional economic handicap: −10% income and food on Hard; −20% on Grandmaster';$('#start-guide-label').textContent=zh?'启用互动教学':'Interactive tutorial';$('#start-guide').parentElement.hidden=false;$('#start-note').textContent=zh?'开始新战役会替换当前未保存的原型进度；已保存的存档不受影响。':'Starting a new campaign replaces unsaved prototype progress; saved games remain available.';$('#start-game').textContent=zh?'开始战役':'Start campaign';$('#start-free').textContent=zh?'自由开始':'Play freely';$('#start-cancel').textContent=initialStart?(zh?'返回主菜单':'Return to main menu'):(zh?'返回当前战役':'Return to current campaign')}
 $('#roman-faction').onchange=renderStart;
 $('#difficulty').onchange=()=>{$('#start-guide').checked=!['hard','expert'].includes($('#difficulty').value);renderStart()};
 function openStart(){renderStart();start.hidden=false}
 $('#start-cancel').onclick=()=>{if(initialStart){location.assign('../');return}start.hidden=true};
 $('#start-game').onclick=()=>{const mode=$('#difficulty').value,side=$('#roman-faction').value;onReset(mode,side,$('#economic-handicap').checked);onMode(mode);initialStart=false;start.hidden=true;localStorage.setItem('spqr-onboarded','1');if($('#start-guide').checked)begin(side);else stop()};
 $('#start-free').onclick=()=>{const mode=$('#difficulty').value;onReset(mode,$('#roman-faction').value,$('#economic-handicap').checked);onMode(mode);start.hidden=true;localStorage.setItem('spqr-onboarded','1');stop()};
 $('#guide-restart').onclick=openStart;
 if(!skipInitial)openStart();
 function restore(saved){stop();if(!saved?.running)return;faction=saved.faction==='senate'?'senate':'caesar';step=Math.max(0,Math.min(11,saved.step|0));ordered=!!saved.ordered;battlePending=!!saved.battlePending;running=true;persist();box.hidden=false;pulseTimer=setInterval(place,250);render()}
 return {refresh(){renderStart();if(running)render()},stop,restore,isRunning:()=>running};
}
