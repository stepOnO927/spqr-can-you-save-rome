// Political subordination is uncertain in several 49 BCE sources. These are
// adjustable relationships, not modern national borders or annexations.
import {DEPENDENCIES} from './eurasia-data.js';
import {relation,atWar,setRelation} from './frontier.js?v=han-1';
import {monthIndex,log} from './util.js?v=han-1';

export function initDependencies(s){
 if(!s.dependencies)s.dependencies=DEPENDENCIES.map(d=>({...d,autonomy:d.autonomy??70,tribute:d.kind==='political_influence'?0:1,active:true}));
}
export function dependencyOf(s,subject){return (s.dependencies||[]).find(d=>d.subject===subject&&d.active)}
export function changeDependency(s,subject,action,actor=s.player){
 const d=dependencyOf(s,subject);
 if(!d||d.overlord!==actor)return {ok:false,reason:'not_overlord'};
 const f=s.factions[actor],v=s.factions[subject];
 if(action==='grant_autonomy'){
  d.autonomy=Math.min(100,d.autonomy+15);d.tribute=Math.max(0,d.tribute-1);
  setRelation(s,actor,subject,Math.min(100,relation(s,actor,subject)+12));
  log(s,['%FACTION% grants local autonomy to %REGION%.','%FACTION%准许%REGION%增加自治。'],{kind:'diplomacy',faction:actor,region:subject});return {ok:true};
 }
 if(action==='request_aid'){
  if(relation(s,actor,subject)<15||d.autonomy>=95||v.manpower<500)return {ok:false,reason:'unwilling_or_exhausted'};
  const aid=Math.min(500,Math.floor(v.manpower/8));v.manpower-=aid;f.manpower+=aid;
  setRelation(s,actor,subject,Math.max(-100,relation(s,actor,subject)-6));
  log(s,['%REGION% contributes troops to %FACTION%.','%REGION%向%FACTION%输送兵员。'],{kind:'diplomacy',faction:actor,region:subject});return {ok:true,aid};
 }
 return {ok:false,reason:'unknown_action'};
}
export function advanceDependencies(s){
 initDependencies(s);
 for(const d of s.dependencies){
  if(!d.active)continue;
  const lord=s.factions[d.overlord],vassal=s.factions[d.subject];
  if(!lord||!vassal){d.active=false;continue}
  if(atWar(s,d.overlord,d.subject)||relation(s,d.overlord,d.subject)<-65){
   d.active=false;
   log(s,['%REGION% rejects the influence of %FACTION%.','%REGION%脱离%FACTION%的影响。'],{kind:'diplomacy',region:d.subject,faction:d.overlord});
   continue;
  }
  if(s.month===1&&d.tribute>0&&d.autonomy<90){
   const paid=Math.min(d.tribute,Math.max(0,vassal.treasury));
   vassal.treasury-=paid;lord.treasury+=paid;d.lastTribute=monthIndex(s);
  }
 }
}
