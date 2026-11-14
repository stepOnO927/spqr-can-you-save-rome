import {FACTIONS} from './data.js';
import {CHARACTER_CATALOG} from './characters.js';
import {BUILDINGS,IDEAS,MATERIALS} from './development.js?v=36';
export const campaignTurn=(year,month)=>(year<0?49+year:48+year)*12+month;

export function initializeReports(s){
  s.campaignEvents ||= [];
  s.notifications ||= [];
  s.briefings ||= [];
  s.objectiveProgress ||= {};
  s.reportPreferences ||= {pauseCritical:false};
  s.nextCampaignEvent ||= 1;
  if(!s.nextBattle){let next=1;for(const battle of s.battles||[]){if(!battle.id)battle.id=`legacy-battle-${next++}`;else next=Math.max(next,Number(battle.id.match(/^battle-(\d+)$/)?.[1]||0)+1)}s.nextBattle=next}
  return s;
}
const own = (s,...ids) => ids.includes(s.player);
export function recordEvent(s,entry){
  initializeReports(s);
  if(entry.visibility==='hidden')return null;
  const event={id:`ev-${s.nextCampaignEvent++}`,turn:campaignTurn(s.year,s.month),year:s.year,month:s.month,read:false,confidence:'confirmed',...entry};
  s.campaignEvents.unshift(event);
  if(event.severity==='critical'||event.severity==='major'||entry.notify){
    s.notifications.unshift({eventId:event.id,read:false});
    s.notifications=s.notifications.slice(0,60);
  }
  return event;
}
export function recordControl(s,r,previousOwner,reason,{armyId=null,battleId=null,attacker=null,defender=null}={}){
  if(previousOwner===r.owner||!own(s,previousOwner,r.owner))return null;
  const lost=previousOwner===s.player;
  const consequences={incomeRemoved:lost,objectiveAffected:['italiaN','roma','cisalpine'].includes(r.id),accessChanged:true};
  const remainingFriendly=s.armies.filter(a=>a.owner===s.player&&a.region===r.id&&a.men>0).map(a=>({id:a.id,men:a.men}));
  return recordEvent(s,{type:'control',category:'military',severity:lost?'critical':'major',factionId:r.owner,affectedFactionIds:[previousOwner,r.owner],regionId:r.id,armyId,battleId,previousOwner,newOwner:r.owner,reason,attacker,defender,consequences,remainingFriendly});
}
export function recordBattle(s,report,attacker,defender){
  if(!own(s,attacker.owner,defender.owner))return null;
  const playerAttacked=defender.owner===s.player;
  const won=report.attackerWins?(attacker.owner===s.player):(defender.owner===s.player);
  return recordEvent(s,{type:'battle',category:'military',severity:won?'major':'critical',factionId:attacker.owner,affectedFactionIds:[attacker.owner,defender.owner],regionId:report.region,armyId:playerAttacked?defender.id:attacker.id,battleId:report.id,outcome:won?'won':'lost',ownCasualties:playerAttacked?report.lossD:report.lossA,confidence:'confirmed'});
}
export function recordSiege(s,r,army,phase){
  if(!own(s,r.owner,army.owner))return null;
  return recordEvent(s,{type:'siege',category:'military',severity:phase==='completed'?'major':'routine',factionId:army.owner,regionId:r.id,armyId:army.id,phase,notify:phase==='completed'});
}
export function recordMovement(s,army,from){
  if(army.owner!==s.player||from===army.region)return null;
  return recordEvent(s,{type:'movement',category:'military',severity:'routine',factionId:army.owner,regionId:army.region,armyId:army.id,armyName:[...army.name],fromRegionId:from});
}
export function recordDiplomacy(s,actor,target,action){
  if(!own(s,actor,target))return null;
  return recordEvent(s,{type:'diplomacy',category:'diplomatic',severity:action==='war'?'critical':action==='improve'?'routine':'major',factionId:actor,affectedFactionIds:[actor,target],targetFactionId:target,action,notify:action!=='improve'});
}
export function recordRebellion(s,r,previousOwner,armyId){
  if(previousOwner!==s.player)return null;
  return recordEvent(s,{type:'rebellion',category:'political',severity:'critical',factionId:'rebels',affectedFactionIds:[previousOwner,'rebels'],regionId:r.id,armyId,previousOwner,newOwner:'rebels'});
}
export function objectiveDefinitions(s){
  if(!['caesar','senate'].includes(s.player)){
    const home=s.regions.find(r=>r.id===s.player)||s.regions.find(r=>r.owner===s.player);
    if(!home)return [];
    const label=FACTIONS[s.player]?.short||[s.player,s.player];
    return [{id:'home',kind:'territory',regionId:home.id,en:`Hold ${label[0]}'s home theater`,zh:`守住${label[1]}本土战区`},
      {id:'field',kind:'army',regionId:home.id,en:'Keep an army in the field',zh:'保有一支野战军'}];
  }
  const first=s.player==='senate'?'cisalpine':'italiaN';
  return [{id:'frontier',kind:'territory',regionId:first,en:s.player==='senate'?'Challenge Caesar in Cisalpine Gaul':'Control northern Italy',zh:s.player==='senate'?'争夺山南高卢':'控制意大利北部'},
    {id:'rome',kind:'territory',regionId:'roma',en:s.player==='senate'?'Defend Latium and Rome':'Control Latium and Rome',zh:s.player==='senate'?'保卫拉丁姆与罗马':'控制拉丁姆与罗马'},
    {id:'field',kind:'army',regionId:first,en:'Keep an army in the field',zh:'保有一支野战军'}];
}
export function updateObjectives(s,initial=false){
  initializeReports(s);
  for(const goal of objectiveDefinitions(s)){
    const achieved=goal.kind==='army'?s.armies.some(a=>a.owner===s.player&&a.men>0):s.regions.find(r=>r.id===goal.regionId)?.owner===s.player;
    const old=s.objectiveProgress[goal.id];
    const status=achieved?'completed':['completed','lost'].includes(old?.status)?'lost':goal.kind==='army'?'blocked':s.armies.some(a=>a.owner===s.player&&a.men>0&&a.region===goal.regionId)?'in_progress':'not_started';
    if(!initial&&old&&old.status!==status){
      const cause=s.campaignEvents.find(e=>e.year===s.year&&e.month===s.month&&(goal.kind==='army'?(status==='lost'?e.type==='armyDestroyed':e.type==='recruitment'):(e.regionId===goal.regionId&&e.type==='control')));
      const event=recordEvent(s,{type:'objective',category:'political',severity:status==='lost'?'critical':'major',factionId:s.player,regionId:goal.kind==='army'?cause?.regionId||null:goal.regionId,battleId:cause?.battleId||null,objectiveId:goal.id,objectiveStatus:status,causeEventId:cause?.id||null,notify:true});
      s.objectiveProgress[goal.id]={status,changedTurn:event?.turn,eventId:event?.id,causeEventId:cause?.id||null};
    }else s.objectiveProgress[goal.id]={...old,status};
  }
}
export function beginBriefing(s){
  initializeReports(s);
  const f=s.factions[s.player];
  return {eventCounter:s.nextCampaignEvent,resources:Object.fromEntries(['treasury','food','manpower','stability','legitimacy'].map(k=>[k,f[k]])),owners:Object.fromEntries(s.regions.map(r=>[r.id,r.owner])),armies:Object.fromEntries(s.armies.filter(a=>a.owner===s.player).map(a=>[a.id,{region:a.region,men:a.men}])),buildings:Object.fromEntries(s.regions.filter(r=>r.owner===s.player).map(r=>[r.id,[...(r.buildings||[])]])),knownMaterial:[...(s.development?.[s.player]?.knownMaterial||[])],knownIdeas:[...(s.development?.[s.player]?.knownIdeas||[])],leaders:[...(s.world?.leadership?.[s.player]||[])],leaderAlive:Object.fromEntries((s.world?.leadership?.[s.player]||[]).map(id=>[id,s.world.characters[id]?.alive])),intelCounts:Object.fromEntries(Object.entries(s.knowledge?.[s.player]||{}).map(([id,k])=>[id,k.reports?.length||0]))};
}
export function finishBriefing(s,before){
  initializeReports(s);
  const f=s.factions[s.player];
  const delta=Object.fromEntries(Object.entries(before.resources).map(([k,v])=>[k,f[k]-v]));
  const territoryCounts=Object.fromEntries(Object.keys(s.factions).map(id=>[id,s.regions.filter(r=>r.owner===id).length]));
  delta.territories=territoryCounts[s.player]-Object.values(before.owners).filter(id=>id===s.player).length;
  for(const r of s.regions.filter(r=>r.owner===s.player))for(const buildingId of (r.buildings||[]).filter(id=>!before.buildings[r.id]?.includes(id)))recordEvent(s,{type:'construction',category:'economy',severity:'routine',factionId:s.player,regionId:r.id,buildingId});
  for(const [branch,key] of [['material','knownMaterial'],['idea','knownIdeas']])for(const innovationId of (s.development?.[s.player]?.[key]||[]).filter(id=>!before[key].includes(id)))recordEvent(s,{type:'research',category:'political',severity:'routine',factionId:s.player,innovationId,branch});
  for(const characterId of before.leaders.filter(id=>before.leaderAlive[id]&&!s.world?.characters?.[id]?.alive))recordEvent(s,{type:'rulerDeath',category:'political',severity:'critical',factionId:s.player,characterId,notify:true});
  if(before.leaders.join('|')!==(s.world?.leadership?.[s.player]||[]).join('|'))recordEvent(s,{type:'government',category:'political',severity:'major',factionId:s.player,characterIds:[...(s.world?.leadership?.[s.player]||[])],notify:true});
  for(const resource of ['treasury','food'])if(before.resources[resource]>=0&&f[resource]<0)recordEvent(s,{type:'economicCrisis',category:'economy',severity:'major',factionId:s.player,resource,value:f[resource],notify:true});
  for(const [targetFactionId,knowledge] of Object.entries(s.knowledge?.[s.player]||{}))if((knowledge.reports?.length||0)>(before.intelCounts[targetFactionId]||0))recordEvent(s,{type:'intelligence',category:'intelligence',severity:'intelligence',factionId:s.player,targetFactionId,confidence:'reported',notify:true});
  const eventIds=s.campaignEvents.filter(e=>Number(e.id.slice(3))>=before.eventCounter).map(e=>e.id);
  const entry={year:s.year,month:s.month,turn:campaignTurn(s.year,s.month),delta,territoryCounts,eventIds};
  s.briefings.unshift(entry);
  return entry;
}
export function unreadCount(s){return (s.notifications||[]).filter(n=>!n.read).length}
export function markRead(s,eventId){const n=s.notifications?.find(n=>n.eventId===eventId);if(n)n.read=true}
export function latestCritical(s,beforeId){return (s.campaignEvents||[]).find(e=>Number(e.id.slice(3))>=beforeId&&e.severity==='critical')}

const label=(id,lang)=>FACTIONS[id]?.short?.[lang==='zh'?1:0]||id||'';
const place=(s,id,lang)=>s.regions.find(r=>r.id===id)?.name?.[lang==='zh'?1:0]||id||'';
const unit=(s,id,lang)=>s.armies.find(a=>a.id===id)?.name?.[lang==='zh'?1:0]||id||'';
export function eventText(s,e,lang='en'){
  const z=lang==='zh',r=place(s,e.regionId,lang),a=label(e.factionId,lang),old=label(e.previousOwner,lang),u=e.armyName?.[z?1:0]||unit(s,e.armyId,lang);
  if(e.type==='control')return {title:z?`${r}${e.previousOwner===s.player?'失守':'易主'}`:`${r} ${e.previousOwner===s.player?'lost':'captured'}`,description:z?`${old}失去${r}；${a}取得控制权。${e.reason==='siege'?'围攻结束。':e.reason==='battle'?'战斗后控制权改变。':e.reason==='rebellion'?'地方叛乱。':'部队占领。'}`:`${old} lost ${r}; ${a} now controls it. ${e.reason==='siege'?'The siege ended.':e.reason==='battle'?'Control changed after battle.':e.reason==='rebellion'?'A rebellion occurred.':'The region was occupied.'}`};
  if(e.type==='battle')return {title:z?`${r}战斗：${e.outcome==='won'?'胜利':'失利'}`:`Battle at ${r}: ${e.outcome==='won'?'victory':'defeat'}`,description:z?`己方伤亡 ${e.ownCasualties?.toLocaleString()||0} 人。`:`Own casualties: ${e.ownCasualties?.toLocaleString()||0}.`};
  if(e.type==='siege')return {title:z?`${r}${e.phase==='begun'?'开始围攻':'围攻结束'}`:`Siege ${e.phase==='begun'?'began':'completed'} at ${r}`,description:z?`${u}参与${r}的围攻。`:`${u} operated at ${r}.`};
  if(e.type==='movement')return {title:z?`${u}抵达${r}`:`${u} arrived in ${r}`,description:z?`从${place(s,e.fromRegionId,lang)}出发。`:`From ${place(s,e.fromRegionId,lang)}.`};
  if(e.type==='recruitment')return {title:z?`${r}完成征召`:`Forces recruited in ${r}`,description:z?`${u}已加入战场。`:`${u} joined the field army.`};
  if(e.type==='warContribution')return {title:z?'战时城镇筹款':'Wartime municipal contributions',description:z?`${e.regions||0}个城镇筹得${e.income||0}国库；地方忠诚、满意度和国家稳定度下降。`:`${e.regions||0} communities raised ${e.income||0} treasury; local loyalty, satisfaction and national stability fell.`};
  if(e.type==='emergencyProvisions')return {title:z?'紧急征集粮食':'Emergency provisions',description:z?`${e.regions||0}处己方城镇提供${e.food||0}粮食；地方忠诚、满意度、国家稳定度及短期产量下降。`:`${e.regions||0} friendly communities provided ${e.food||0} food; local loyalty, satisfaction, national stability and short-term production fell.`};
  if(e.type==='rebellion')return {title:z?`${r}爆发叛乱`:`Rebellion in ${r}`,description:z?`${r}脱离${old}控制。`:`${r} broke from ${old} control.`};
  if(e.type==='armyDestroyed'){const name=e.armyName?.[z?1:0]||e.armyId;return {title:z?`${name}在${r}覆灭`:`${name} destroyed at ${r}`,description:z?'军队已从战场序列移除。':'The army is no longer in the field.'};}
  if(e.type==='construction'){const name=BUILDINGS.find(x=>x.id===e.buildingId)?.name?.[z?1:0]||e.buildingId;return {title:z?`${r}建成${name}`:`${name} completed in ${r}`,description:''};}
  if(e.type==='research'){const name=[...MATERIALS,...IDEAS].find(x=>x.id===e.innovationId)?.name?.[z?1:0]||e.innovationId;return {title:z?`研究完成：${name}`:`Research completed: ${name}`,description:''};}
  if(e.type==='rulerDeath'){const name=CHARACTER_CATALOG[e.characterId]?.name?.[z?1:0]||e.characterId;return {title:z?`${name}逝世`:`${name} died`,description:z?'政府继承和军队指挥可能受到影响。':'Succession and army command may be affected.'};}
  if(e.type==='government'){const names=e.characterIds.map(id=>CHARACTER_CATALOG[id]?.name?.[z?1:0]||id).join(z?'、':', ');return {title:z?'政府领导层变更':'Government leadership changed',description:z?`现任：${names||'空缺'}`:`Current leadership: ${names||'vacant'}`};}
  if(e.type==='economicCrisis')return {title:z?`${e.resource==='food'?'粮食':'国库'}出现危机`:`${e.resource==='food'?'Food':'Treasury'} crisis`,description:z?`当前数值：${e.value}`:`Current value: ${e.value}`};
  if(e.type==='intelligence')return {title:z?`收到关于${label(e.targetFactionId,lang)}的情报`:`Intelligence received concerning ${label(e.targetFactionId,lang)}`,description:z?'内容应以已收集的情报档案为准；详情可能未经核实。':'Consult the intelligence dossier; details may remain unverified.'};
  if(e.type==='diplomacy')return {title:z?`${a}与${label(e.targetFactionId,lang)}：${{war:'宣战',peace:'议和',settlement:'内战和议',alliance:'结盟',break:'解除同盟',improve:'改善关系'}[e.action]}`:`${a} and ${label(e.targetFactionId,lang)}: ${{war:'war declared',peace:'peace agreed',settlement:'civil settlement agreed',alliance:'alliance formed',break:'alliance ended',improve:'relations improved'}[e.action]}`,description:''};
  if(e.type==='objective'){const goal=objectiveDefinitions(s).find(g=>g.id===e.objectiveId),status=z?{lost:'失效',completed:'完成',blocked:'受阻',in_progress:'进行中',not_started:'未开始'}[e.objectiveStatus]:{lost:'lost',completed:'completed',blocked:'blocked',in_progress:'in progress',not_started:'not started'}[e.objectiveStatus],cause=s.campaignEvents.find(x=>x.id===e.causeEventId);return {title:z?`目标${status}：${goal?.zh}`:`Objective ${status}: ${goal?.en}`,description:cause?eventText(s,cause,lang).description:e.objectiveId==='field'&&e.objectiveStatus==='lost'?(z?'已无己方野战军。':'No friendly field army remains.'):''};}
  return {title:z?'战役消息':'Campaign report',description:''};
}
