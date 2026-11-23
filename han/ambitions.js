// Han ambitions are goals over the existing court, frontier, silk and focus
// systems. They do not alter the Liu succession rules or simulate new effects.
import {isLiuClan} from './dynasty.js?v=archived-exchange-1';
import {focusById} from './focus.js?v=archived-exchange-1';

const L=(en,zh)=>[en,zh];
export const AMBITIONS={
 frontier:L('Secure the frontier','巩固边疆'),
 diplomacy:L('Western Regions diplomacy','西域外交'),
 prosperity:L('Agriculture and prosperity','农桑富国'),
 reform:L('Court reform','朝政改革'),
 dynasty:L('Liu dynastic continuity','刘氏国祚'),
 culture:L('Cultural golden age','文明盛世'),
 independence:L('Preserve independence','维护独立'),
 custom:L('Custom objective','自定义国家目标')
};
export function available(s){return s.player==='han'?['frontier','diplomacy','prosperity','reform','dynasty','culture','custom']:['independence','diplomacy','prosperity','frontier','custom']}
export function initialize(s){s.nationalAmbition||={id:'',chosenAt:null,changes:[],custom:null};return s.nationalAmbition}
export const AMBITION_CHANGE_STABILITY_COST=3;
export function choose(s,id,options={}){
 if(!available(s).includes(id))return false;
 const a=initialize(s),old=a.id;
 if(id==='custom'){
  const metric=options.metric||'treasury',target=Number(options.target)||100;
  if(!({treasury:s.player==='han'?[700,900,1200]:[50,100,200],stability:[60,70,80],regions:[1,2,3]}[metric]||[]).includes(target))return false;
  if(old==='custom'&&a.custom?.metric===metric&&a.custom?.target===target)return true;
  a.custom={metric,target,baseline:s.regions.filter(r=>r.owner===s.player).length};
 }
 if(old===id&&id!=='custom')return true;
 const changing=!!old,f=s.factions[s.player];
 if(changing&&f)f.stability=Math.max(0,(f.stability??0)-AMBITION_CHANGE_STABILITY_COST);
 a.id=id;a.version=2;a.chosenAt={year:s.year,month:s.month};a.continuity={months:0,lastMonth:s.year*12+s.month};a.changes.push({from:old,to:id,year:s.year,month:s.month,...(changing?{cost:{stability:AMBITION_CHANGE_STABILITY_COST}}:{})});
 return true;
}
function maintained(s,id){
 const f=s.factions[s.player];if(!f)return false;
 if(id==='dynasty')return s.player==='han'&&!!s.throne?.orthodox&&isLiuClan(s,s.throne.orthodox)&&f.stability>=65;
 if(id==='independence')return s.regions.some(r=>r.owner===s.player)&&f.stability>=60&&!(s.finalized?.defeat);
 if(id==='frontier'){const forces=s.armies.filter(x=>x.owner===s.player&&x.men>0);return forces.length>0&&forces.every(x=>(x.supply??60)>=50)&&f.grain>=20}
 return false;
}
export function advance(s){
 const a=initialize(s);if(!['dynasty','independence','frontier'].includes(a.id))return a;
 const now=s.year*12+s.month,c=a.continuity||={months:0,lastMonth:now-1};
 if(c.lastMonth!==now){c.months=maintained(s,a.id)?c.months+1:0;c.lastMonth=now}
 return a;
}
export function status(s){
 const a=initialize(s);if(!a.id)return null;
 const continuous=a.continuity?.months||0;
 // An earned milestone from an older save remains earned after the new continuity rule.
 const previouslyReached=a.version!==2&&(s.experience?.milestones||[]).some(m=>m.id==='ambition:'+a.id);
 const f=s.factions[s.player],regions=s.regions.filter(r=>r.owner===s.player),forces=s.armies.filter(x=>x.owner===s.player&&x.men>0),focus=s.focus?.[s.player];
 const reform=(focus?.done||[]).filter(id=>['A','B'].includes(focusById(s.player,id)?.branch)).length;
 const culture=(focus?.done||[]).filter(id=>focusById(s.player,id)?.branch==='B').length;
 const agreements=(s.treaties||[]).filter(t=>t.status!=='ended'&&t.parties?.includes(s.player)).length,wealth=s.player==='han'?800:100,grainGoal=s.player==='han'?600:100;
 const orthodox=s.player==='han'&&!!s.throne?.orthodox&&isLiuClan(s,s.throne.orthodox);
 const rows={
  frontier:{title:L('Keep a supplied frontier force','保持有补给的边疆军队'),progress:L(`${forces.filter(x=>(x.supply??60)>=50).length}/${forces.length} supplied armies · ${f.grain} grain · ${continuous}/6 months`,`补给合格军队 ${forces.filter(x=>(x.supply??60)>=50).length}/${forces.length} · 粮食 ${f.grain} · ${continuous}/6个月`),done:(maintained(s,'frontier')&&continuous>=6)||previouslyReached},
  diplomacy:{title:L('Maintain two active agreements','维持两项有效协定'),progress:L(`${agreements}/2 agreements`,`协定 ${agreements}/2`),done:agreements>=2},
  prosperity:{title:L('Build a funded and well-provisioned state','建立充裕的国库与粮储'),progress:L(`${f.treasury}/${wealth} treasury · ${f.grain}/${grainGoal} grain`,`国库 ${f.treasury}/${wealth} · 粮储 ${f.grain}/${grainGoal}`),done:f.treasury>=wealth&&f.grain>=grainGoal},
  reform:{title:L('Complete a court focus and stabilize the court','完成朝政方针并稳定朝廷'),progress:L(`${reform}/1 court focus · ${f.stability}/65 stability`,`朝政方针 ${reform}/1 · 稳定度 ${f.stability}/65`),done:reform>=1&&f.stability>=65},
  dynasty:{title:L('Preserve an orthodox Liu emperor and stable court','维护刘氏正统与稳定朝廷'),progress:L(`${orthodox?'Liu emperor':'orthodoxy disputed'} · ${f.stability}/65 stability · ${continuous}/36 months`,`${orthodox?'刘氏皇帝在位':'正统存疑'} · 稳定度 ${f.stability}/65 · ${continuous}/36个月`),done:(maintained(s,'dynasty')&&continuous>=36)||previouslyReached},
  culture:{title:L('Complete two scholarship and government focuses','完成两项经学与朝政方针'),progress:L(`${culture}/2 scholarship focuses`,`经学方针 ${culture}/2`),done:culture>=2},
  independence:{title:L('Remain independent with a stable government','保持独立与稳定政府'),progress:L(`${regions.length} regions · ${f.stability}/60 stability · ${continuous}/24 months`,`${regions.length} 个地区 · 稳定度 ${f.stability}/60 · ${continuous}/24个月`),done:(maintained(s,'independence')&&continuous>=24)||previouslyReached},
  custom:(()=>{const c=a.custom||{metric:'treasury',target:100,baseline:0},value=c.metric==='treasury'?f.treasury:c.metric==='stability'?f.stability:regions.length-c.baseline,unit=c.metric==='treasury'?L('treasury','国库'):c.metric==='stability'?L('stability','稳定度'):L('additional regions','新增地区');return {title:L(`Reach ${c.target} ${unit[0]}`,`达到 ${c.target} ${unit[1]}`),progress:L(`${value}/${c.target} ${unit[0]}`,`${value}/${c.target} ${unit[1]}`),done:value>=c.target}})()
 };
 return {id:a.id,...rows[a.id]};
}
