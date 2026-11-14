import {ROUTES,REGIONS} from './data.js?v=phase-x-1';
import {reportedControl,reportedFortification,observeFortification} from './control-intelligence.js?v=fort-intel-1';
import {activeAgreement} from './agreements.js?v=grand-chessboard-2';
import {politicalAmbition} from './conspiracies.js?v=succession-ui-recovery-1';
import {focusModifiers} from './national-focus.js?v=cursus-portraits-1';
import {armyStats,commanderSpecialty,commandConcentration} from './legion-designer.js?v=cursus-portraits-1';

// OPERATIONAL BATTLE PLANNER. Plans are an order layer over the existing War
// Council orders: every movement goes through issueMilitaryOrder/moveArmy, so
// terrain, march time, supply, battles and sieges are resolved exactly as for
// hand-issued orders. Plans use only the owner's reports and sightings.
export const ROLES=['offensive','siege','frontline','defensive','fallback','reserve','recon','supply_guard'];
export const ROLE_NAMES={offensive:['Offensive line','进攻目标'],siege:['Siege objective','围城目标'],frontline:['Frontline','战线'],defensive:['Defensive line','防御阵地'],fallback:['Fallback position','后撤阵地'],reserve:['Reserve force','预备队'],recon:['Reconnaissance objective','侦察目标'],supply_guard:['Supply route guard','补给线护卫']};
export const MODES=['manual','assisted','automatic'];
const LIVE=['preparing','active','paused','needs_attention'];
const date=s=>s.year*12+s.month;
const isWar=(s,a,b)=>a!==b&&!!b&&s.wars.some(w=>w.includes(a)&&w.includes(b));
const adjacentIds=id=>ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>r[0]===id?r[1]:r[0]);
const link=(a,b)=>ROUTES.find(r=>(r[0]===a&&r[1]===b)||(r[0]===b&&r[1]===a));
const region=(s,id)=>s.regions.find(r=>r.id===id);
const army=(s,id)=>s.armies.find(a=>a.id===id);
export function plansState(s){s.world.battlePlans||=[];s.world.nextBattlePlan||=1;return s.world.battlePlans}
export function plansFor(s,owner){return plansState(s).filter(p=>p.owner===owner)}
export function planById(s,id){return plansState(s).find(p=>p.id===id)||null}

// Entry legality from the owner's own knowledge: own ground, a reported enemy
// at war, or military access. Unknown ground is attempted and may be refused
// by the engine on arrival.
export function legalStep(s,owner,from,to){
 if(!link(from,to))return {ok:false,reason:'adjacent'};
 const rep=reportedControl(s,owner,to)?.owner;
 if(rep&&rep!==owner&&!isWar(s,owner,rep)&&!activeAgreement(s,owner,rep,'military_access'))return {ok:false,reason:'peace'};
 return {ok:true,hostile:!!rep&&isWar(s,owner,rep),sea:link(from,to)[2]==='sea'};
}
export function validatePath(s,owner,start,path){
 if(!Array.isArray(path)||!path.length)return {ok:false,reason:'empty'};
 if(path.some(id=>!REGIONS.some(r=>r.id===id)))return {ok:false,reason:'unknown_region'};
 let prev=start;for(const id of path){if(id===prev)continue;const step=legalStep(s,owner,prev,id);if(!step.ok)return {ok:false,reason:step.reason,at:id};prev=id}
 return {ok:true};
}
// Shortest legal route on the real territory graph (sea links cost more).
export function findRoute(s,owner,from,to,{avoid=new Set()}={}){
 if(from===to)return [];const dist=new Map([[from,0]]),prev=new Map(),queue=[[0,from]];
 while(queue.length){queue.sort((a,b)=>a[0]-b[0]);const [d,id]=queue.shift();if(id===to)break;if(d>dist.get(id))continue;
  for(const next of adjacentIds(id)){if(avoid.has(next)&&next!==to)continue;const step=legalStep(s,owner,id,next);if(!step.ok)continue;const nd=d+(step.sea?3:1)+(['hills','desert'].includes(region(s,next)?.terrain)?1:0);if(nd<(dist.get(next)??Infinity)){dist.set(next,nd);prev.set(next,id);queue.push([nd,next])}}}
 if(!prev.has(to))return null;const out=[];let cur=to;while(cur!==from){out.unshift(cur);cur=prev.get(cur)}return out;
}

export function createPlan(s,owner,{name='',mode='assisted',objective=null,commanderId=null,condition={kind:'immediate'},fallback=null,supplyPriority=false,ai=false}={}){
 if(!s.factions[owner]||!MODES.includes(mode))return {ok:false,reason:'invalid'};
 if(objective&&!region(s,objective))return {ok:false,reason:'unknown_region'};
 if(fallback&&!region(s,fallback))return {ok:false,reason:'unknown_region'};
 if(commanderId&&s.world.characters[commanderId]?.faction!==owner)return {ok:false,reason:'commander'};
 const id=`plan:${s.world.nextBattlePlan=(s.world.nextBattlePlan||1)}`;s.world.nextBattlePlan++;
 const plan={id,owner,name:String(name||'').slice(0,48)||`Operation ${s.world.nextBattlePlan-1}`,mode,status:'draft',objective,commanderId,condition:{...condition},fallback,supplyPriority:!!supplyPriority,roles:[],preparation:{progress:0,target:0,spent:{treasury:0,food:0}},events:[],recommendations:[],created:[s.year,s.month],ai:!!ai,supplyBoost:[]};
 plansState(s).push(plan);return {ok:true,plan};
}
export function assignRole(s,owner,planId,{armyId,role,path=[],target=null}){
 const plan=planById(s,planId),a=army(s,armyId);
 if(!plan||plan.owner!==owner||['completed','cancelled','failed'].includes(plan.status))return {ok:false,reason:'plan'};
 if(!a||a.owner!==owner||a.men<=0)return {ok:false,reason:'army'};
 if(!ROLES.includes(role))return {ok:false,reason:'role'};
 if(plansState(s).some(p=>p.id!==planId&&LIVE.concat('draft').includes(p.status)&&p.roles.some(r=>r.armyId===armyId)))return {ok:false,reason:'assigned'};
 const route=role==='offensive'?path:[target].filter(Boolean);
 if(!route.length)return {ok:false,reason:'target'};
 if(role==='offensive'){const v=validatePath(s,owner,a.region,path);if(!v.ok)return v}
 else{const t=route[0];if(!region(s,t))return {ok:false,reason:'unknown_region'};
  if(['frontline','defensive','fallback','reserve','supply_guard'].includes(role)&&region(s,t).owner!==owner)return {ok:false,reason:'own_territory'};
  if(role==='siege'&&reportedControl(s,owner,t)?.owner===owner)return {ok:false,reason:'own_territory'};
  if(!findRoute(s,owner,a.region,role==='recon'?nearestApproach(s,owner,a.region,t):t)&&a.region!==t)return {ok:false,reason:'unreachable'}}
 plan.roles=plan.roles.filter(r=>r.armyId!==armyId);
 plan.roles.push({armyId,role,path:[...route],target:route.at(-1),state:{stuck:0,visits:{},lastRegion:a.region,startMen:a.men,captured:[],done:false,suspended:false,siegeSince:null}});
 return {ok:true};
}
export function removeRole(s,owner,planId,armyId){const plan=planById(s,planId);if(!plan||plan.owner!==owner)return {ok:false};plan.roles=plan.roles.filter(r=>r.armyId!==armyId);return {ok:true}}
export function editPlan(s,owner,planId,changes){const plan=planById(s,planId);if(!plan||plan.owner!==owner||['completed','cancelled','failed'].includes(plan.status))return {ok:false,reason:'plan'};
 for(const k of ['name','mode','fallback','supplyPriority','commanderId','condition','objective'])if(k in changes){if(k==='mode'&&!MODES.includes(changes.mode))return {ok:false,reason:'mode'};if(['fallback','objective'].includes(k)&&changes[k]&&!region(s,changes[k]))return {ok:false,reason:'unknown_region'};plan[k]=changes[k]}
 return {ok:true}}
const event=(s,plan,kind,detail={},log=null)=>{plan.events.unshift({kind,year:s.year,month:s.month,...detail});plan.events=plan.events.slice(0,30);if(log&&plan.owner===s.player){const m=EVENT_TEXT[kind];if(m)log(s,m[0](plan,detail),m[1](plan,detail),{kind:'plan',plan:plan.id})}};
const rn=(id,i)=>REGIONS.find(r=>r.id===id)?.name?.[i]||id;
const EVENT_TEXT={
 approved:[(p)=>`Operation “${p.name}” approved.`,(p)=>`作战计划“${p.name}”已批准。`],
 prepared:[(p)=>`Operation “${p.name}” has finished preparing and is now active.`,(p)=>`作战计划“${p.name}”准备完毕，开始执行。`],
 stalled:[(p)=>`Preparations for “${p.name}” stalled for lack of funds or grain.`,(p)=>`“${p.name}”因资金或粮食不足而准备停滞。`],
 army_lost:[(p,d)=>`“${p.name}”: an assigned army was lost.`,(p)=>`“${p.name}”：一支所属军队已损失。`],
 defected:[(p)=>`“${p.name}”: an assigned army changed sides.`,(p)=>`“${p.name}”：一支所属军队已倒戈。`],
 recaptured:[(p,d)=>`“${p.name}”: ${rn(d.region,0)} was lost again; the advance is recalculated.`,(p,d)=>`“${p.name}”：${rn(d.region,1)}得而复失；重新计算推进路线。`],
 enemy_reinforced:[(p,d)=>`“${p.name}”: scouts report stronger enemy forces at ${rn(d.region,0)}. Your decision is needed.`,(p,d)=>`“${p.name}”：侦察报告${rn(d.region,1)}敌军增强。需要你的决定。`],
 supply:[(p)=>`“${p.name}”: supply is failing; the operation is paused.`,(p)=>`“${p.name}”：补给不足；作战暂停。`],
 siege_delay:[(p,d)=>`“${p.name}”: the siege of ${rn(d.region,0)} is taking longer than expected.`,(p,d)=>`“${p.name}”：对${rn(d.region,1)}的围攻比预期更久。`],
 inaccessible:[(p,d)=>`“${p.name}”: ${rn(d.region,0)} can no longer be entered.`,(p,d)=>`“${p.name}”：已无法进入${rn(d.region,1)}。`],
 new_war:[(p)=>`“${p.name}”: a new war changes the situation. Review the plan.`,(p)=>`“${p.name}”：新的战争改变了形势。请复核计划。`],
 stuck:[(p,d)=>`“${p.name}”: an army made no progress and stopped to await orders.`,(p)=>`“${p.name}”：一支军队毫无进展，已停下待命。`],
 recon:[(p,d)=>`“${p.name}”: reconnaissance around ${rn(d.region,0)} reports ${d.count} enemy force(s).`,(p,d)=>`“${p.name}”：在${rn(d.region,1)}周边侦察到 ${d.count} 支敌军。`],
 fallback:[(p,d)=>`“${p.name}”: a battered army falls back toward ${rn(d.region,0)}.`,(p,d)=>`“${p.name}”：一支受创军队向${rn(d.region,1)}后撤。`],
 reserve:[(p,d)=>`“${p.name}”: the reserve moves to support ${rn(d.region,0)}.`,(p,d)=>`“${p.name}”：预备队前往支援${rn(d.region,1)}。`],
 completed:[(p)=>`Operation “${p.name}” achieved its objectives.`,(p)=>`作战计划“${p.name}”已完成目标。`],
 failed:[(p)=>`Operation “${p.name}” failed: no assigned armies remain.`,(p)=>`作战计划“${p.name}”失败：已无所属军队。`],
 coordinated:[(p,d)=>`“${p.name}” is coordinated with an allied operation.`,(p)=>`“${p.name}”已与盟军行动协调。`]
};
export function approvePlan(s,owner,planId,{log=()=>{}}={}){
 const plan=planById(s,planId);if(!plan||plan.owner!==owner||!['draft','paused','needs_attention'].includes(plan.status))return {ok:false,reason:'plan'};
 if(!plan.roles.length)return {ok:false,reason:'no_armies'};
 if(plan.status==='draft'){const prep=plan.condition?.kind==='prepared';plan.preparation.target=prep?Math.max(1,3-(focusModifiers(s,owner).planPrep||0)):0;plan.status=prep?'preparing':'active';if(plan.status==='active')activateSupply(s,plan)}
 else plan.status=plan.preparation.progress<plan.preparation.target?'preparing':'active';
 plan.attention=null;for(const r of plan.roles){r.state.suspended=false;r.state.stuck=0}
 event(s,plan,'approved',{},log);return {ok:true,status:plan.status};
}
export function pausePlan(s,owner,planId){const plan=planById(s,planId);if(!plan||plan.owner!==owner||!LIVE.includes(plan.status))return {ok:false};plan.status='paused';return {ok:true}}
export function cancelPlan(s,owner,planId,{reason='cancelled'}={}){const plan=planById(s,planId);if(!plan||plan.owner!==owner||['completed','cancelled','failed'].includes(plan.status))return {ok:false};endPlan(s,plan,'cancelled');plan.cancelReason=reason;return {ok:true}}
function endPlan(s,plan,status){plan.status=status;plan.ended=[s.year,s.month];for(const b of plan.supplyBoost){const r=region(s,b.region);if(r)r.supply=Math.max(1,r.supply-b.n)}plan.supplyBoost=[]}
function activateSupply(s,plan){
 if(!plan.supplyPriority||plan.supplyBoost.length)return;
 const ids=new Set(plan.roles.flatMap(r=>r.path).filter(id=>region(s,id)?.owner===plan.owner));
 for(const r of plan.roles){const a=army(s,r.armyId);if(a&&region(s,a.region)?.owner===plan.owner)ids.add(a.region)}
 for(const id of [...ids].slice(0,4)){region(s,id).supply+=2;plan.supplyBoost.push({region:id,n:2})}
}
export function planControlled(s,armyId){return plansState(s).some(p=>['active','preparing'].includes(p.status)&&p.mode==='automatic'&&p.roles.some(r=>r.armyId===armyId&&!r.state.done&&!r.state.suspended))}

// ---------- assessment & counsel ----------
const freshSightings=(s,owner)=>{const now=date(s);return Object.values(s.knowledge?.[owner]||{}).flatMap(k=>Object.values(k.sightings||{})).filter(x=>x.owner!==owner&&now-(x.year*12+x.month)>=0&&now-(x.year*12+x.month)<=12)};
export function assessPlan(s,owner,planId,{previewMarch=null,estimatedStrength=null}={}){
 const plan=planById(s,planId);if(!plan||plan.owner!==owner)return null;
 const armies=plan.roles.map(r=>army(s,r.armyId)).filter(Boolean),friendly=armies.reduce((n,a)=>n+a.men,0),sightings=freshSightings(s,owner),now=date(s);
 const route=[...new Set(plan.roles.flatMap(r=>r.path))],targets=[...new Set(plan.roles.filter(r=>['offensive','siege'].includes(r.role)).map(r=>r.target))];
 const known=sightings.filter(x=>route.includes(x.region)||route.some(id=>adjacentIds(id).includes(x.region))).map(x=>({id:x.id,owner:x.owner,region:x.region,band:x.strengthBand,age:now-(x.year*12+x.month),profile:x.profile||null}));
 // Age of the latest troop sighting at the objectives. Knowing who controls a place is
 // not knowing what defends it: with no sighting the age is unknown (null).
 const ages=targets.flatMap(t=>sightings.filter(x=>x.region===t).map(x=>now-(x.year*12+x.month)));
 const intelAge=ages.length?Math.min(...ages):null;
 let travel=0;for(const r of plan.roles.filter(r=>['offensive','siege'].includes(r.role))){const a=army(s,r.armyId);if(!a)continue;let prev=a.region,months=0;const full=r.role==='siege'?(findRoute(s,owner,a.region,r.target)||[]):r.path;for(const id of full){if(id===prev)continue;const l=link(prev,id),t=region(s,id);months+=Math.max(1,(l?.[2]==='sea'?3:1)+(['hills','desert'].includes(t?.terrain)?1:0));prev=id}travel=Math.max(travel,months)}
 const terrains=route.map(id=>region(s,id)?.terrain).filter(Boolean),f=s.factions[owner];
 const supplyRatio=armies.length?Math.min(...armies.map(a=>{const r=region(s,a.region);return r?r.supply*1000/Math.max(1,a.men):1})):1;
 const reinforce=targets.length?Math.min(...targets.map(t=>{const r=findRoute(s,owner,t,s.regions.filter(x=>x.owner===owner).sort((a,b)=>b.supply-a.supply)[0]?.id||t);return r?r.length:9})):0;
 const siege=targets.map(t=>{const observation=reportedFortification(s,owner,t);return {region:t,fort:observation&&!observation.stale?Math.round((observation.band[0]+observation.band[1])/2):null,observation}});
 const enemyEstimate=known.filter(x=>isWar(s,owner,x.owner)).reduce((n,x)=>n+(x.band[0]+x.band[1])/2,0);
 const counter=known.filter(x=>isWar(s,owner,x.owner)&&!targets.includes(x.region)&&(x.band[1]>=friendly*.4)).length;
 const political=[];if(plan.commanderId){const c=commandConcentration(s,owner,plan.commanderId);if(c.level!=='low')political.push({kind:'concentration',level:c.level,share:c.share})}
 for(const id of route){const rep=reportedControl(s,owner,id)?.owner;if(rep&&rep!==owner&&!isWar(s,owner,rep))political.push({kind:'neutral_territory',region:id,owner:rep})}
 const risks=[];if(supplyRatio<.8||f.food<15)risks.push('supply');if(intelAge===null||intelAge>6)risks.push('stale_intelligence');if(enemyEstimate>friendly*.9)risks.push('enemy_strength');if(counter)risks.push('counterattack');if(siege.some(x=>x.fort>=2))risks.push('long_siege');if(travel>=5)risks.push('distance');if(political.length)risks.push('political');
 return {friendly,known,intelAge,terrain:terrains,supply:{ratio:Math.round(supplyRatio*100)/100,food:f.food},travel,reinforceDistance:reinforce,siege,enemyEstimate:Math.round(enemyEstimate),counterattack:counter,political,risks};
}
// Advisers judge from the same report, filtered through their own qualities:
// acumen notices the real weakness, low integrity backs risk for gain, and an
// inexperienced loyal adviser can sincerely misjudge.
function counselProfile(s,id){const c=s.world.characters[id];if(!c)return null;if(!c.counsel){let h=2166136261;for(const ch of id+'counsel')h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;c.counsel={acumen:30+h%61,integrity:25+(h>>>8)%71}}return c.counsel}
export function adviserCounsel(s,owner,planId,opts={}){
 const report=assessPlan(s,owner,planId,opts),plan=planById(s,planId);if(!report)return [];
 const leaders=new Set(s.world.leadership?.[owner]||[]);
 const people=Object.values(s.world.characters).filter(c=>c.alive&&c.faction===owner&&!leaders.has(c.id)&&!c.missing).sort((a,b)=>(b.influence||0)-(a.influence||0)||a.id.localeCompare(b.id)).slice(0,3);
 const worst=report.risks.includes('supply')?'supply':report.risks.includes('enemy_strength')?'enemy_strength':report.risks[0]||null;
 return people.map(c=>{const p=counselProfile(s,c.id),ambition=politicalAmbition(s,c.id)??40,spec=commanderSpecialty(s,c.id),inPlan=plan.commanderId===c.id||plan.roles.some(r=>army(s,r.armyId)?.characterId===c.id);
  let stance,reason;
  if(p.integrity<40&&ambition>=55&&inPlan){stance='support';reason='personal_gain'}
  else if(p.acumen>=70&&worst){stance='oppose';reason=worst}
  else if(p.acumen<45&&(c.loyalty??60)>=60){stance=report.risks.length>=3?'support':'caution';reason=report.risks.length>=3?'confidence':(report.risks[1]||'none')}
  else if(report.risks.length>=3){stance='oppose';reason=report.risks[0]}
  else if(report.risks.length){stance='caution';reason=report.risks[0]}
  else{stance='support';reason='sound'}
  if(spec?.caution>=2&&stance==='support'&&report.risks.length)stance='caution';
  return {id:c.id,stance,reason}});
}

// ---------- monthly execution ----------
function nearestApproach(s,owner,from,target){if(legalStep(s,owner,target,target).ok&&from===target)return target;const near=adjacentIds(target).filter(id=>reportedControl(s,owner,id)?.owner===owner||!isWar(s,owner,reportedControl(s,owner,id)?.owner)&&legalStep(s,owner,id,id).ok);return near.sort((a,b)=>(findRoute(s,owner,from,a)?.length??99)-(findRoute(s,owner,from,b)?.length??99))[0]||target}
function nextOrder(s,plan,r,a,{estimatedStrength}){
 const owner=plan.owner;
 if(r.role==='offensive'||r.role==='siege'){
  const remaining=(r.role==='siege'?[r.target]:r.path).filter(id=>region(s,id)?.owner!==owner);
  if(!remaining.length){r.state.done=true;return null}
  const goal=remaining[0];if(a.region===goal)return null;
  // Follow the drawn path; leave it only when a step is illegal or occupied territory was recaptured.
  const idx=r.path.indexOf(a.region);let step=idx>=0&&r.path[idx+1]&&link(a.region,r.path[idx+1])?r.path[idx+1]:null;
  if(!step||!legalStep(s,owner,a.region,step).ok){const route=findRoute(s,owner,a.region,goal);if(!route)return {blocked:goal};step=route[0]}
  const leg=legalStep(s,owner,a.region,step);if(!leg.ok)return {blocked:step};
  return {kind:leg.hostile?'attack':'move',target:step};
 }
 const hold=r.role==='recon'?nearestApproach(s,owner,a.region,r.target):r.target;
 if(a.region!==hold){const route=findRoute(s,owner,a.region,hold);if(!route)return {blocked:hold};return {kind:'move',target:route[0]}}
 if(['frontline','defensive','supply_guard','fallback'].includes(r.role)){const here=region(s,a.region);const kind=r.role==='defensive'&&here.owner===owner?(here.fort?'guard':'defend'):'defend';return a.order?.kind===kind?null:{kind,target:null}}
 if(r.role==='reserve'){
  const threatened=adjacentIds(a.region).find(id=>{const reg=region(s,id);return reg?.owner===owner&&freshSightings(s,owner).some(x=>isWar(s,owner,x.owner)&&x.region===id&&date(s)-(x.year*12+x.month)<=1)});
  const lost=plan.roles.find(o=>o!==r&&['offensive','siege'].includes(o.role)&&army(s,o.armyId)&&army(s,o.armyId).men<o.state.startMen*.65&&adjacentIds(a.region).includes(army(s,o.armyId).region));
  const go=threatened||lost&&army(s,lost.armyId).region;if(go&&go!==a.region){const leg=legalStep(s,owner,a.region,go);if(leg.ok)return {kind:leg.hostile?'attack':'move',target:go,reserve:true}}
  return null;
 }
 return null;
}
function reconSweep(s,plan,r,a){
 const places=new Set([a.region,...adjacentIds(a.region)]);let count=0;
 for(const id of places)observeFortification(s,plan.owner,id,'recon');
 for(const u of s.armies){if(u.owner===plan.owner||u.move||!places.has(u.region)||!s.knowledge?.[plan.owner]?.[u.owner])continue;const k=s.knowledge[plan.owner][u.owner];k.sightings||={};k.sightings[u.id]={id:u.id,name:[...u.name],owner:u.owner,region:u.region,year:s.year,month:s.month,commanderId:null,strengthBand:[Math.max(0,Math.floor(u.men*.75/1000)*1000),Math.max(1000,Math.ceil(u.men*1.25/1000)*1000)],profile:u.formation?.profile||null,source:'recon',planId:plan.id};count++}
 return count;
}
export function advanceBattlePlans(s,{autoplayPlayer=false,issueOrder,estimatedStrength,log=()=>{}}={}){
 const plans=plansState(s);
 for(const plan of plans){
  if(!LIVE.includes(plan.status))continue;
  const automatedOwner=plan.owner!==s.player||autoplayPlayer,f=s.factions[plan.owner];
  // Army loss or defection.
  for(const r of [...plan.roles]){const a=army(s,r.armyId);if(!a||a.men<=0){event(s,plan,'army_lost',{army:r.armyId},log);plan.roles=plan.roles.filter(x=>x!==r)}else if(a.owner!==plan.owner){event(s,plan,'defected',{army:r.armyId},log);plan.roles=plan.roles.filter(x=>x!==r)}}
  if(!plan.roles.length){endPlan(s,plan,'failed');event(s,plan,'failed',{},log);continue}
  // New wars since the last review.
  const wars=s.wars.filter(w=>w.includes(plan.owner)).map(w=>w.find(x=>x!==plan.owner)).sort().join('|');
  if(plan.knownWars!==undefined&&plan.knownWars!==wars&&wars.split('|').length>plan.knownWars.split('|').filter(Boolean).length){event(s,plan,'new_war',{},log);if(!automatedOwner&&plan.status==='active'){plan.status='needs_attention';plan.attention='new_war'}}
  plan.knownWars=wars;
  if(plan.status==='paused'||plan.status==='needs_attention')continue;
  if(plan.status==='preparing'){
   const cost={treasury:2+plan.roles.length,food:plan.roles.length};
   if(f.treasury<cost.treasury||f.food<cost.food){if(!plan.stalledAt||plan.stalledAt<date(s)-2){event(s,plan,'stalled',{},log);plan.stalledAt=date(s)}continue}
   f.treasury-=cost.treasury;f.food-=cost.food;plan.preparation.spent.treasury+=cost.treasury;plan.preparation.spent.food+=cost.food;plan.preparation.progress++;
   for(const r of plan.roles){const a=army(s,r.armyId);if(!a)continue;if(!a.move&&!a.siege)a.morale=Math.min(85,a.morale+3);
    if(r.role==='siege'){const st=armyStats(a);if((st?.siege||0)>=1)a.planSiegeWorks=Math.min(2,(a.planSiegeWorks||0)+1)}
    if(r.role==='recon'){const c=reconSweep(s,plan,r,a);if(c)event(s,plan,'recon',{region:a.region,count:c},log)}}
   if(plan.preparation.progress>=plan.preparation.target){plan.status='active';activateSupply(s,plan);event(s,plan,'prepared',{},log)}
   else continue;
  }
  if(plan.supplyPriority&&plan.supplyBoost.length){if(f.treasury>=3)f.treasury-=3;else{endSupply(s,plan)}}
  if(f.food<0&&plan.mode!=='manual'){event(s,plan,'supply',{},log);if(!automatedOwner){plan.status='needs_attention';plan.attention='supply';continue}}
  plan.recommendations=[];
  for(const r of plan.roles){
   const a=army(s,r.armyId);if(!a||r.state.done||r.state.suspended)continue;
   if(r.role==='recon'&&!a.move){const c=reconSweep(s,plan,r,a);if(c)event(s,plan,'recon',{region:a.region,count:c},log)}
   // Recaptured objective.
   for(const id of r.state.captured)if(region(s,id)?.owner!==plan.owner){event(s,plan,'recaptured',{region:id},log);r.state.captured=r.state.captured.filter(x=>x!==id)}
   for(const id of r.path)if(region(s,id)?.owner===plan.owner&&!r.state.captured.includes(id)&&['offensive','siege'].includes(r.role))r.state.captured.push(id);
   if(a.move||a.reorg){r.state.lastRegion=a.region;continue}
   if(a.siege){r.state.siegeSince??=date(s);r.state.siegeExpected??=Math.max(1,a.siege.remaining||1);if(date(s)-r.state.siegeSince>r.state.siegeExpected+2&&!r.state.siegeWarned){r.state.siegeWarned=true;event(s,plan,'siege_delay',{region:a.siege.region},log);if(!automatedOwner){plan.status='needs_attention';plan.attention='siege_delay'}}continue}
   r.state.siegeSince=null;r.state.siegeExpected=null;
   // Fallback for battered offensive armies.
   if(['offensive','siege'].includes(r.role)&&plan.fallback&&(a.morale<40||a.men<r.state.startMen*.4)&&a.region!==plan.fallback){const route=findRoute(s,plan.owner,a.region,plan.fallback);if(route){const own=region(s,route[0])?.owner===plan.owner;const order={kind:own?'retreat':'move',target:route[0]};if(plan.mode==='automatic'&&issueOrder(s,a.id,order.kind,order.target,plan.owner).ok){event(s,plan,'fallback',{region:plan.fallback},log);r.state.done=true;continue}if(plan.mode==='assisted')plan.recommendations.push({armyId:a.id,...order,why:'fallback'})}}
   // Stronger enemy reported at the next objective.
   if(['offensive','siege'].includes(r.role)){const goal=(r.role==='siege'?[r.target]:r.path).find(id=>region(s,id)?.owner!==plan.owner);const seen=goal&&freshSightings(s,plan.owner).filter(x=>x.region===goal&&isWar(s,plan.owner,x.owner)&&date(s)-(x.year*12+x.month)<=2);const est=seen?.reduce((n,x)=>n+x.strengthBand[0],0)||0;
    if(goal&&est>a.men*1.2&&!r.state.reinforcedWarned){r.state.reinforcedWarned=true;event(s,plan,'enemy_reinforced',{region:goal,estimate:est},log);if(!automatedOwner){plan.status='needs_attention';plan.attention='enemy_reinforced';break}
     // AI: switch to another reported objective or abandon this line.
     const alt=adjacentIds(a.region).filter(id=>isWar(s,plan.owner,reportedControl(s,plan.owner,id)?.owner)&&id!==goal&&!freshSightings(s,plan.owner).some(x=>x.region===id&&x.strengthBand[0]>a.men));
     if(alt.length){r.path=[alt[0]];r.target=alt[0];r.state.reinforcedWarned=false}else{r.state.done=true;continue}}}
   const order=nextOrder(s,plan,r,a,{estimatedStrength});
   if(!order){if(['offensive','siege'].includes(r.role)&&!r.state.done&&a.region===r.state.lastRegion)r.state.stuck++;r.state.lastRegion=a.region;continue}
   if(order.blocked){event(s,plan,'inaccessible',{region:order.blocked},log);if(!automatedOwner){plan.status='needs_attention';plan.attention='inaccessible';break}r.state.done=true;continue}
   r.state.visits[order.target]=(r.state.visits[order.target]||0)+1;
   // Loop guard: repeated moves into the same place without progress stop the army.
   if(r.state.visits[order.target]>3||r.state.stuck>=4){r.state.suspended=true;event(s,plan,'stuck',{army:a.id},log);if(!automatedOwner){plan.status='needs_attention';plan.attention='stuck'}continue}
   if(plan.mode==='automatic'){const res=issueOrder(s,a.id,order.kind,order.target,plan.owner);if(res.ok){r.state.stuck=0;if(order.reserve)event(s,plan,'reserve',{region:order.target},log)}else{r.state.stuck++}}
   else if(plan.mode==='assisted')plan.recommendations.push({armyId:a.id,kind:order.kind,target:order.target,why:r.role});
   r.state.lastRegion=a.region;
  }
  const objectives=plan.roles.filter(r=>['offensive','siege'].includes(r.role));
  if(objectives.length&&objectives.every(r=>r.state.done)&&objectives.every(r=>(r.role==='siege'?[r.target]:r.path).every(id=>region(s,id)?.owner===plan.owner))){endPlan(s,plan,'completed');event(s,plan,'completed',{},log)}
  else if(objectives.length&&objectives.every(r=>r.state.done||r.state.suspended)&&automatedOwner){endPlan(s,plan,'cancelled');plan.cancelReason='objectives_unreachable'}
 }
 // Keep the record bounded: drop old finished AI plans.
 const finished=plans.filter(p=>p.ai&&['completed','cancelled','failed'].includes(p.status));if(finished.length>20)s.world.battlePlans=plans.filter(p=>!finished.slice(0,finished.length-20).includes(p));
}
function endSupply(s,plan){for(const b of plan.supplyBoost){const r=region(s,b.region);if(r)r.supply=Math.max(1,r.supply-b.n)}plan.supplyBoost=[];plan.supplyPriority=false}
export function approveRecommendation(s,owner,planId,index,{issueOrder}){const plan=planById(s,planId);const rec=plan?.recommendations?.[index];if(!plan||plan.owner!==owner||!rec)return {ok:false};const r=issueOrder(s,rec.armyId,rec.kind,rec.target,owner);if(r.ok)plan.recommendations.splice(index,1);return r}

// ---------- AI ----------
// Hard and expert courts build multi-army operations from their own reports;
// standard courts set defensive lines only. Impossible plans are abandoned.
export function aiBattlePlans(s,owner,{estimatedStrength,log=()=>{}}={}){
 const level=s.difficulty||'standard';if(owner==='rebels'||level==='beginner')return null;
 const mine=plansFor(s,owner).filter(p=>LIVE.includes(p.status));
 for(const p of mine)if(p.status==='needs_attention'||p.status==='paused')cancelPlan(s,owner,p.id,{reason:'abandoned'});
 const enemies=s.wars.filter(w=>w.includes(owner)).map(w=>w.find(x=>x!==owner));if(!enemies.length)return null;
 const own=s.regions.filter(r=>r.owner===owner),ownIds=new Set(own.map(r=>r.id)),sightings=freshSightings(s,owner);
 const busy=new Set(plansFor(s,owner).filter(p=>LIVE.includes(p.status)).flatMap(p=>p.roles.map(r=>r.armyId)));
 const free=s.armies.filter(a=>a.owner===owner&&a.men>1200&&!a.move&&!a.siege&&!a.reorg&&!busy.has(a.id)&&ownIds.has(a.region)).sort((a,b)=>b.men-a.men||a.id.localeCompare(b.id));
 if(!free.length)return null;
 const threatened=own.filter(r=>adjacentIds(r.id).some(id=>sightings.some(x=>x.region===id&&enemies.includes(x.owner)))).map(r=>r.id);
 if(level==='standard'){
  if(!threatened.length||mine.length)return null;
  const a=free.find(x=>threatened.includes(x.region))||free[0];const r=createPlan(s,owner,{name:'Frontier watch',mode:'automatic',ai:true});assignRole(s,owner,r.plan.id,{armyId:a.id,role:'defensive',target:threatened.includes(a.region)?a.region:threatened[0]});approvePlan(s,owner,r.plan.id,{log});return r.plan.id;
 }
 if(mine.some(p=>p.roles.some(r=>['offensive','siege'].includes(r.role))))return null;
 // Candidate objectives: reported enemy theaters adjacent to own territory.
 const perRegion=e=>estimatedStrength?estimatedStrength(s,owner,e)/Math.max(1,s.regions.filter(r=>reportedControl(s,owner,r.id)?.owner===e).length):4000;
 const allies=Object.keys(s.factions).filter(o=>o!==owner&&((s.alliances||[]).some(a=>a.includes(owner)&&a.includes(o))||activeAgreement(s,owner,o,'defensive')||activeAgreement(s,owner,o,'offensive')));
 const allied=new Set(plansState(s).filter(p=>allies.includes(p.owner)&&LIVE.includes(p.status)).flatMap(p=>p.roles.filter(r=>['offensive','siege'].includes(r.role)).map(r=>r.target)));
 const candidates=[];
 for(const id of new Set(own.flatMap(r=>adjacentIds(r.id)))){const rep=reportedControl(s,owner,id)?.owner;if(!enemies.includes(rep)||ownIds.has(id))continue;const seen=sightings.filter(x=>x.region===id&&x.owner===rep);const est=seen.length?seen.reduce((n,x)=>n+(x.strengthBand[0]+x.strengthBand[1])/2,0):perRegion(rep);const reg=region(s,id),baseline=REGIONS.find(r=>r.id===id),observation=reportedFortification(s,owner,id),fort=observation&&!observation.stale?(observation.band[0]+observation.band[1])/2:1;candidates.push({id,rep,est:est*(1+fort*.25),value:(baseline?.tax||0)+(baseline?.food||0)+(reg.terrain==='urban'?4:0)+(allied.has(id)?6:0),coordinated:allied.has(id)})}
 candidates.sort((a,b)=>(b.value/Math.max(1,b.est/1000))-(a.value/Math.max(1,a.est/1000))||a.id.localeCompare(b.id));
 const margin=level==='expert'?1.4:1.25;
 for(const c of candidates){
  const strike=free.find(a=>a.men>c.est*margin&&a.morale>=55&&findRoute(s,owner,a.region,c.id));if(!strike)continue;
  const route=findRoute(s,owner,strike.region,c.id);
  const reg=region(s,c.id),observation=reportedFortification(s,owner,c.id),siegeRole=!!(observation&&!observation.stale&&observation.band[1]>0);
  const r=createPlan(s,owner,{name:`${reg.name[0]} campaign`,mode:'automatic',objective:c.id,commanderId:strike.characterId||null,condition:{kind:level==='expert'?'prepared':'immediate'},fallback:strike.region,supplyPriority:level==='expert'&&s.factions[owner].treasury>90,ai:true});
  assignRole(s,owner,r.plan.id,siegeRole?{armyId:strike.id,role:'siege',target:c.id}:{armyId:strike.id,role:'offensive',path:route});
  const rest=free.filter(a=>a!==strike);
  const reserve=rest.find(a=>adjacentIds(a.region).includes(strike.region)||a.region===strike.region);if(reserve)assignRole(s,owner,r.plan.id,{armyId:reserve.id,role:'reserve',target:reserve.region});
  if(level==='expert'){
   // Guard the friendly theater the strike departs from, if another army is close.
   const base=strike.region,guard=rest.find(a=>a!==reserve&&ownIds.has(a.region)&&(a.region===base||adjacentIds(a.region).includes(base)));
   if(guard)assignRole(s,owner,r.plan.id,{armyId:guard.id,role:'supply_guard',target:ownIds.has(base)?base:guard.region});
   // Old or missing intelligence: send scouts if available, otherwise the smallest spare force.
   const age=assessPlan(s,owner,r.plan.id)?.intelAge;const spare=rest.filter(a=>a!==reserve&&a!==guard);
   const scout=spare.find(a=>(armyStats(a)?.recon||0)>=2)||spare.sort((a,b)=>a.men-b.men)[0];
   if(scout&&(age===null||age>3))assignRole(s,owner,r.plan.id,{armyId:scout.id,role:'recon',target:c.id})}
  for(const a of rest.filter(a=>threatened.includes(a.region)&&!r.plan.roles.some(x=>x.armyId===a.id)).slice(0,2))assignRole(s,owner,r.plan.id,{armyId:a.id,role:'frontline',target:a.region});
  if(c.coordinated)event(s,r.plan,'coordinated',{target:c.id},log);
  approvePlan(s,owner,r.plan.id,{log});return r.plan.id;
 }
 // Nothing promising: hold the threatened frontier.
 if(threatened.length&&!mine.length){const r=createPlan(s,owner,{name:'Defensive line',mode:'automatic',ai:true});for(const a of free.filter(a=>threatened.includes(a.region)).slice(0,3))assignRole(s,owner,r.plan.id,{armyId:a.id,role:'defensive',target:a.region});if(r.plan.roles.length){approvePlan(s,owner,r.plan.id,{log});return r.plan.id}cancelPlan(s,owner,r.plan.id)}
 return null;
}
