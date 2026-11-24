import {localStore as localStorage} from '../safe-storage.js';
import {analytics} from '../analytics.js';

const text=(language,en,zh)=>language()==='zh'?zh:en;
const month=state=>state.year*12+state.month;
const liveArmy=(state,id,side)=>state.armies.find(army=>army.id===id&&army.owner===side&&army.men>0);

export function tutorialTurnProgress(state,side,selectedId){
 const id=selectedId||state.tutorial?.armyId||(side==='senate'?'italy':'xiii');
 const battle=(state.battles||[]).find(entry=>entry.year===state.year&&entry.month===state.month&&[entry.attacker,entry.defender].some(army=>army?.id===id&&army.owner===side));
 if(battle)return {kind:'battle',armyId:id};
 const unit=liveArmy(state,id,side);
 if(!unit)return {kind:'unavailable',armyId:id};
 if(unit.move)return {kind:'marching',armyId:id,remaining:unit.move.remaining};
 if(unit.siege)return {kind:'siege',armyId:id};
 return {kind:'stopped',armyId:id};
}

// Each transition below checks a real campaign action and the resulting state.
// Locating a control never submits an order or completes a lesson.
export function createTutorial({language,onReset,onMode,getState,getRoutes=()=>[],onFocus=()=>{},onCombatPractice=()=>{},skipInitial=false}){
 const $=selector=>document.querySelector(selector);
 const box=$('#guide'),pointer=$('#guide-pointer');
 let running=false,paused=false,step=0,phase='preview',faction='caesar',armyId='',turnBefore=null,direction='',result='',highlight=null,timer=null;
 const ownCity=()=>faction==='senate'?'ARIMINUM':'RAVENNA';
 const pickArmy=()=>{
  const state=getState();
  return liveArmy(state,armyId,faction)||state.armies.find(army=>army.owner===faction&&army.men>0&&getRoutes(army.id).some(route=>route.ok))||state.armies.find(army=>army.owner===faction&&army.men>0);
 };
 const routes=()=>pickArmy()?getRoutes(pickArmy().id).filter(route=>route.ok):[];
 const safeRoute=()=>routes().find(route=>route.owner===faction);
 const labels=()=>language()==='zh'?[
  ['认清你的战区','点击地图上属于你的城市，查看战区归属。','城市点不到？按“指给我看”，地图会移动到它。'],
  ['选择军队','点击地图上的己方军旗，查看人数、指挥官和位置。','军旗被遮挡？按“指给我看”。'],
  ['查看补给','在军队详情中点“查看补给”，了解粮食和当地承载上限。','详情不见了？按“指给我看”重新打开军队。'],
  ['下第一道命令',phase==='defend'?'当前没有安全的己方行军路线。点“防御”先守住阵地。':phase==='preview'?'选相邻战区预览，或点“行军规划”在地图上绘制途经点，再看地形与口粮。预览免费。':'看过路线后确认命令；规划器中的路线也要确认才会执行。','不必攻击强敌；可选己方战区。命令确认后仍要推进月份。'],
  ['推进一个月','命令需要时间。点击“推进一月”，观察真实结算。','若命令已取消，请重新下令；也可以先防守再推进。'],
  ['阅读结果','打开“编年史”，查看刚才这一月真正发生了什么。','没有战斗也正常；编年史仍会记录本月变化。'],
  ['做一个政策决定','查看资源后，选择与当前不同的税率；它会改变今后的收支和忠诚。','资源入口在窄屏菜单里。按“指给我看”可定位。'],
  ['选择下一步目标','从军事、外交或发展中选一个方向。选择后可随时改变。','这里仅设定建议方向，不会自动花费资源。']
 ]:[
  ['Find your territory','Select a city under your control to inspect its theater.','Cannot see the city? Show me will move the map to it.'],
  ['Select an army','Select one of your standards to see its soldiers, commander and location.','If a marker is obscured, use Show me.'],
  ['Inspect supply','In the army details, open Supply to check food and local capacity.','If the panel is closed, Show me will reopen the army.'],
  ['Give your first order',phase==='defend'?'No safe friendly march is available. Choose Defend to hold your position.':phase==='preview'?'Preview a neighboring theater, or open March Planner and draw waypoints to review terrain and provisions. Previewing is free.':'Confirm the order after reviewing the route. Planned routes also need confirmation.','You need not attack a stronger enemy. You can march to friendly territory and advance time.'],
  ['Advance one month','Orders take time. Advance one month to resolve real events.','If the order was cancelled, issue another; defense is also possible.'],
  ['Read the outcome','Open the Chronicle to see what actually happened this month.','A quiet month still has a real report.'],
  ['Make a policy choice','Open Resources and choose a different tax rate. It changes future income and loyalty.','On narrow screens Resources is in the menu. Show me will locate it.'],
  ['Choose your next goal','Pick military, diplomacy or development. You can change this later.','This sets guidance only and spends no resources.']
 ];
 function state(){return getState()}
 function persist(){if(state())state().tutorial={version:2,running,paused,step,phase,faction,armyId,turnBefore,direction,result}}
 function removeHighlight(){if(highlight)highlight.classList.remove('guide-highlight');highlight=null;pointer.hidden=true}
 function target(){
  if(step===0)return '#map [data-city="'+ownCity()+'"]';
  if(step===1)return pickArmy()?'#map [data-army="'+pickArmy().id+'"]':null;
  if(step===2)return '#inspect-army-supply';
  if(step===3)return phase==='preview'?'#lab-orders select':phase==='defend'?'[data-order="defend"]':'#lab-orders button';
  if(step===4)return '#advance';
  if(step===5)return '#chronicle';
  if(step===6)return $('#command-detail [data-tax]')?'#command-detail [data-tax]:not([disabled])':'#resources-help';
  return null;
 }
 function reveal(element){
  if(!element)return;
  if(window.getComputedStyle(element).display==='none'||!element.getClientRects().length){
   const menu=$('#compact-menu-toggle');
   if(menu&&element.closest('#compact-menu')&&$('#compact-menu').hidden)menu.click();
  }
  if(element.closest('.selection')){$('.selection')?.classList.remove('collapsed');$('#selection-toggle')?.setAttribute('aria-expanded','true')}
  if(element.closest('.brief')){$('.brief')?.classList.remove('collapsed');$('#brief-toggle')?.setAttribute('aria-expanded','true')}
 }
 function place(){
  if(!running||paused)return;
  const selector=target(),element=selector?$(selector):null;
  if(element!==highlight){removeHighlight();highlight=element;if(element){element.classList.add('guide-highlight');if(!element.closest('#map'))element.scrollIntoView({block:'nearest',inline:'nearest',behavior:'smooth'})}}
  if(!element){pointer.hidden=true;return}
  reveal(element);
  const bounds=element.getBoundingClientRect();
  if(bounds.width&&bounds.height&&bounds.left<innerWidth&&bounds.right>0&&bounds.top<innerHeight&&bounds.bottom>0){
   pointer.hidden=false;pointer.style.left=Math.max(12,Math.min(innerWidth-34,bounds.left+bounds.width/2-10))+'px';pointer.style.top=Math.max(60,bounds.top-32)+'px';
   box.classList.toggle('guide-at-top',bounds.top>innerHeight*.48);
   box.classList.toggle('guide-on-right',innerWidth<=700&&innerHeight<=500&&bounds.left<innerWidth*.4);
  }else pointer.hidden=true;
 }
 function feedback(message){$('#guide-feedback').textContent=message}
 function resultForStep(){
  const s=state();
  if(step===1)return text(language,'This theater belongs to '+(faction==='senate'?'the Senate':'Caesar')+'.','这个战区属于'+(faction==='senate'?'元老院派':'凯撒派')+'。');
  if(step===2){const army=pickArmy();return army?text(language,army.name[0]+' · '+army.men.toLocaleString()+' soldiers · '+army.commander[0],army.name[1]+' · '+army.men.toLocaleString()+'人 · '+army.commander[1]):''}
  if(step===5){const army=pickArmy();return army?.move?text(language,'Your army is still marching.','军队仍在行军。'):result}
  if(step===6){const summary=s.turnSummaries?.[0];return summary?text(language,'Latest turn: '+summary.movements.length+' arrival(s), '+summary.changes.length+' control update(s).','本月：'+summary.movements.length+'支军队抵达，'+summary.changes.length+'份控制报告更新。'):result}
  return result;
 }
 function render(){
  if(!running)return;
  box.hidden=false;
  if(paused){removeHighlight();$('#guide-label').textContent=text(language,'GUIDE PAUSED','教学已暂停');$('#guide-title').textContent=text(language,'Resume when ready','准备好后继续');$('#guide-body').textContent='';$('#guide-recovery').textContent='';$('#guide-show').hidden=true;$('#guide-pause').textContent=text(language,'Resume','继续');return}
  const rows=labels(),row=rows[Math.min(step,7)];
  $('#guide-label').textContent=text(language,'FIRST COMMAND','第一道命令')+' · '+Math.min(step+1,8)+'/8';
  $('#guide-title').textContent=step===8?text(language,'You are in command','现在由你指挥'):row[0];
  $('#guide-body').textContent=step===8?text(language,'Your chosen direction is saved. Use What now? or Objectives whenever you need help.','已保存你的方向。迷惑时可查看“下一步”或“目标”。'):row[1];
  $('#guide-recovery').textContent=step===8?'':row[2];
  $('#guide-result').textContent=resultForStep();
  $('#guide-show').hidden=step>=7;
  $('#guide-pause').textContent=text(language,'Pause','暂停');
  $('#guide-skip').textContent=text(language,'Skip','跳过');
  $('#guide-show').textContent=text(language,'SHOW ME','指给我看');
  $('#guide-retry').setAttribute('aria-label',text(language,'Restart this lesson','重试本课'));
  $('#guide-next').hidden=step!==8;$('#guide-next').textContent=text(language,'Begin independent play','开始自由战役');
  const choices=$('#guide-choices');choices.replaceChildren();
  if(step===7)for(const [id,en,zh] of [['military','Military','军事'],['diplomacy','Diplomacy','外交'],['development','Development','发展']]){
   const button=document.createElement('button');button.type='button';button.dataset.direction=id;button.textContent=text(language,en,zh);button.onclick=()=>{direction=id;result=text(language,'Direction saved: '+en+'.','已选择：'+zh+'。');step=8;persist();render()};choices.append(button)
  }
  if(step===8&&state()?.training){const button=document.createElement('button');button.type='button';button.id='training-combat-practice';button.textContent=text(language,'Preview a practice battle','预览训练战斗');button.onclick=()=>{stop('complete');onCombatPractice()};choices.append(button)}
  if(step===3&&phase==='preview'&&!safeRoute()){
   phase='defend';persist();render();feedback(text(language,'No safe friendly march is available. A defensive order is a valid alternative.','目前没有安全的己方行军路线；可先下防御命令。'));return
  }
  place()
 }
 function setStep(next,message=''){step=next;result=message;persist();removeHighlight();render();if([1,2,3].includes(step)){const home=pickArmy()?.region;if(home)onFocus(home)}}
 function stop(reason='skip'){
  if(running&&reason!=='load')analytics.track(reason==='complete'?'tutorial_completed':'tutorial_skipped',{}, {humanAction:false});
  running=false;paused=false;persist();box.hidden=true;removeHighlight();if(timer){clearInterval(timer);timer=null}
 }
 function begin(side){faction=side;running=true;paused=false;step=0;phase='preview';armyId='';turnBefore=null;direction='';result='';analytics.track('tutorial_started',{}, {humanAction:false});persist();if(timer)clearInterval(timer);timer=setInterval(place,450);render();const home=state().regions.find(r=>r.owner===side&&r.city?.toUpperCase()===ownCity());if(home)onFocus(home.id)}
 function showMe(){
  if(step<=1&&window.matchMedia('(max-width:700px)').matches){$('.brief')?.classList.add('collapsed');$('.selection')?.classList.add('collapsed');$('#brief-toggle')?.setAttribute('aria-expanded','false');$('#selection-toggle')?.setAttribute('aria-expanded','false')}
  if(step===2&&!$('#inspect-army-supply'))$('#map [data-army="'+(pickArmy()?.id||'')+'"]')?.click();
  if(step===3&&!$('#lab-orders select')){phase='preview';persist();$('#map [data-army="'+(pickArmy()?.id||'')+'"]')?.click()}
  if(step===6&&!$('#command-detail [data-tax]'))$('#resources-help')?.click();
  const selected=step===0?state().regions.find(r=>r.owner===faction&&r.city?.toUpperCase()===ownCity()):step<=3?state().regions.find(r=>r.id===pickArmy()?.region):null;
  if(selected)onFocus(selected.id);
  place();target()&&$(target())?.focus({preventScroll:true});
  if(!$(target()))feedback(text(language,'That control is unavailable now. Select another friendly army or restart this lesson.','当前控件不可用。请换一支己方军队，或重新开始本课。'))
 }
 $('#guide-show').onclick=showMe;$('#guide-pause').onclick=()=>{paused=!paused;persist();render()};
 $('#guide-skip').onclick=()=>stop();$('#guide-next').onclick=()=>{if(step===8)stop('complete')};
 $('#guide-retry').onclick=()=>{if(step===3){phase='preview';armyId=pickArmy()?.id||armyId}if(step===4&&!liveArmy(state(),armyId,faction))step=1;result='';persist();render();showMe()};
 document.addEventListener('spqr:action',event=>{
  if(!running||paused)return;
  const action=event.detail||{},s=state(),unit=liveArmy(s,armyId,faction);
  if(action.type==='invalid'){feedback(action.reason||text(language,'That route is unavailable. Choose a highlighted legal route.','这条路线不可用，请选择高亮的合法路线。'));return}
  if(step===0&&action.type==='territory'&&s.regions.some(r=>r.id===action.id&&r.owner===faction)){setStep(1);return}
  if(step===1&&action.type==='army'&&action.own&&liveArmy(s,action.id,faction)){armyId=action.id;setStep(2);return}
  if(step===2&&action.type==='supply'&&action.id===armyId&&unit){setStep(3);return}
  if(step===3&&phase==='preview'&&action.type==='preview'&&(action.routePreview&&action.id===armyId||routes().some(route=>route.to===action.id))){
   phase='confirm';persist();render();return
  }
  if(step===3&&action.type==='order'&&action.id===armyId&&unit&&(unit.move||unit.order?.kind==='defend')){
   turnBefore=month(s);setStep(4,text(language,'Order recorded in the real campaign.','命令已记入实际战役。'));return
  }
  if(step===4&&action.type==='cancel'&&action.id===armyId){phase='preview';setStep(3);return}
  if(step===4&&action.type==='advance'&&month(s)>turnBefore){
   const progress=tutorialTurnProgress(s,faction,armyId);
   setStep(5,text(language,'Turn resolved: '+progress.kind+'. Open the report for details.','本月结算：'+({battle:'发生战斗',marching:'仍在行军',siege:'正在围攻',stopped:'军队停驻',unavailable:'军队已失去'}[progress.kind]||progress.kind)+'。打开战报查看详情。'));return
  }
  if(step===5&&action.type==='report'){setStep(6);return}
  if(step===6&&action.type==='policy'&&action.changed){setStep(7,text(language,'Tax policy changed; future months will reflect it.','税率已改变，未来月份将反映后果。'));return}
 });
 const start=$('#start-overlay');let initialStart=!skipInitial;
 $('#start-language').onclick=()=>$('#language').click();
 function renderStart(){
  const zh=language()==='zh',senate=$('#roman-faction').value==='senate',touring=$('#difficulty').value==='travel';
  $('#roman-faction-label').textContent=zh?'罗马阵营':'Roman faction';
  $('#roman-faction').options[0].textContent=zh?'凯撒派':'Caesarian command';
  $('#roman-faction').options[1].textContent=zh?'元老院与庞培派':'Senate and Pompeian command';
  $('#roman-faction-note').textContent=zh?'双方均有可操作的互动教学。':'Both sides have playable lessons.';
  $('.intro-leader img').src=senate?'../assets/portraits/pompey-128.jpg':'../assets/portraits/caesar-128.jpg';
  $('#start-title').textContent=zh?'从第一道命令开始':'Start with your first command';
  $('#start-description').textContent=senate?(zh?'你指挥元老院。先认清自己的战区和军队，再决定如何保卫意大利。':'Command the Senate. Find your territory and army before deciding how to defend Italy.'):(zh?'你指挥凯撒。先学会查看军队和下令，再决定是否进攻。':'Command Caesar. Learn to inspect and order an army before deciding whether to attack.');
  if(touring)$('#start-description').textContent=zh?'旅行模式：资源丰厚，羽毛会全程提供建议。':'Travel mode: abundant resources and continuing Feather advice.';
  $('#difficulty-label').textContent=zh?'难度':'Difficulty';
  [['旅行：羽毛全程指导','Travel: Feather advises throughout'],['新手：更多提示','Beginner: more guidance'],['标准','Standard'],['困难','Hard'],['棋手','Grandmaster']].forEach((v,i)=>$('#difficulty').options[i].textContent=zh?v[0]:v[1]);
  $('#economic-handicap-label').textContent=zh?'可选经济惩罚：困难 −10%，棋手 −20%':'Optional economic handicap: Hard −10%, Grandmaster −20%';
  $('#start-guide-label').textContent=zh?'开启八步互动教学':'Start eight hands-on lessons';
  $('#start-note').textContent=zh?'教学使用真实战役规则。可暂停、跳过或重新开始。':'The guide uses real campaign rules. You can pause, skip or restart.';
  $('#start-game').textContent=zh?'开始战役':'Start campaign';
  $('#start-training').textContent=zh?'独立训练战役（不覆盖正式存档）':'Training campaign (separate saves)';
  $('#start-free').textContent=zh?'自由开始':'Play freely';
  $('#start-cancel').textContent=initialStart?(zh?'返回主菜单':'Return to main menu'):(zh?'返回当前战役':'Return to current campaign')
 }
 $('#roman-faction').onchange=renderStart;$('#difficulty').onchange=()=>{$('#start-guide').checked=!['hard','expert'].includes($('#difficulty').value);renderStart()};
 function openStart(){renderStart();start.hidden=false}
 $('#start-cancel').onclick=()=>{if(initialStart){location.assign('../');return}start.hidden=true};
 $('#start-game').onclick=()=>{const mode=$('#difficulty').value,side=$('#roman-faction').value;onReset(mode,side,$('#economic-handicap').checked);onMode(mode);initialStart=false;start.hidden=true;localStorage.setItem('spqr-onboarded','1');if($('#start-guide').checked)begin(side);else stop()};
 $('#start-training').onclick=()=>{const side=$('#roman-faction').value;onReset('beginner',side,false,true);onMode('beginner');initialStart=false;start.hidden=true;begin(side)};
 $('#start-free').onclick=()=>{const mode=$('#difficulty').value;onReset(mode,$('#roman-faction').value,$('#economic-handicap').checked);onMode(mode);start.hidden=true;localStorage.setItem('spqr-onboarded','1');stop()};
 $('#guide-restart').onclick=openStart;if(!skipInitial)openStart();
 function restore(saved){stop('load');if(!saved?.running)return;faction=saved.faction==='senate'?'senate':'caesar';running=true;paused=!!saved.paused;step=saved.version===2?Math.max(0,Math.min(8,saved.step|0)):0;phase=saved.version===2?saved.phase||'preview':'preview';armyId=saved.armyId||'';turnBefore=Number.isFinite(saved.turnBefore)?saved.turnBefore:null;direction=saved.direction||'';result=saved.result||'';persist();timer=setInterval(place,450);render()}
 return {refresh(){renderStart();if(running)render()},stop,restore,isRunning:()=>running,focus:showMe};
}
