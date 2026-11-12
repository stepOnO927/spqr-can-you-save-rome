import {FOCUS_TREES,TREE_ALIASES,BRANCHES,ICONS} from './imperium-focus-data.js?v=imperium-1';
import {ROUTES,FACTIONS} from './data.js?v=phase-x-1';
import {rememberPoliticalEvent} from './political-memory.js?v=grand-chessboard-2';
import {proposeAgreement} from './agreements.js?v=grand-chessboard-2';
import {politicalAmbition,improveLeaderTrust} from './conspiracies.js?v=newborn-age-1';
import {successionCandidates} from './governance.js?v=inheritance-fix-1';
import {reportedControl} from './control-intelligence.js?v=phase-x-1';

// IMPERIUM national focus engine. One primary focus per state progresses with
// the monthly tick. Costs are paid when a focus starts and shown beforehand;
// interrupted progress is kept. Completion applies concrete effects through
// existing systems; diplomatic effects only open proposals that the other
// court decides on its own.
const date=s=>s.year*12+s.month,pair=(a,b)=>[a,b].sort().join(':');
const isWar=(s,a,b)=>a!==b&&s.wars.some(w=>w.includes(a)&&w.includes(b));
const holds=(s,id)=>s.regions.some(r=>r.owner===id);
const roll=(s,key,salt)=>{let h=(s.seed^(date(s)*977)^salt)>>>0;for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x45d9f3b)>>>0;h^=h>>>16;return (h>>>0)/4294967296};
const COASTAL=new Set(['narbo','hispaniaN','hispaniaS','cisalpine','italiaS','sicilia','africa','illyricum','epirus','achaia','anatolia','syria','egypt','numidia','mauretania','bosporus','roma','italiaN']);
export const MODIFIER_KEYS=['battle','defense','march','tax','treasury','food','stability','intelligence','planPrep','siege','reorg','seaCost','training'];
const EFFECT_KEYS=['res','mod','unlock','armyMorale','supply','elite','perceive','leaderInfluence','generals','succession','relation','peaceLetter','propose','foreignTrust','loyalty','oversight','satisfaction','fort','religion','regionLoyalty','characterInfluence','characterLoyalty'];

export function treeFor(actor){return FOCUS_TREES[TREE_ALIASES[actor]||actor]||null}
export function focusById(actor,id){return (treeFor(actor)||[]).find(f=>f.id===id)||null}
const allFocuses=()=>Object.values(FOCUS_TREES).flat();

// ---------- validation ----------
export function validateFocusTrees(trees=FOCUS_TREES,{components=null,regions=null}={}){
 const errors=[],ids=new Set();
 for(const [faction,tree] of Object.entries(trees)){
  const local=new Map(tree.map(f=>[f.id,f]));
  for(const f of tree){
   if(ids.has(f.id))errors.push(`duplicate id ${f.id}`);ids.add(f.id);
   if(!BRANCHES.includes(f.branch))errors.push(`${f.id}: unknown branch ${f.branch}`);
   if(!ICONS.includes(f.icon))errors.push(`${f.id}: unknown icon ${f.icon}`);
   for(const field of ['name','desc','history'])if(!Array.isArray(f[field])||f[field].length!==2||f[field].some(x=>typeof x!=='string'||!x.trim()))errors.push(`${f.id}: missing localization ${field}`);
   if(!Number.isInteger(f.months)||f.months<1)errors.push(`${f.id}: invalid duration`);
   for(const p of [...f.prereq,...f.any,...f.exclusive])if(!local.has(p))errors.push(`${f.id}: missing reference ${p}`);
   for(const x of f.exclusive){const other=local.get(x);if(other&&!other.exclusive.includes(f.id))errors.push(`${f.id}: exclusion with ${x} is not mutual`)}
   for(const e of f.effects){const keys=Object.keys(e);if(keys.length!==1||!EFFECT_KEYS.includes(keys[0]))errors.push(`${f.id}: invalid effect ${JSON.stringify(e)}`);
    if(e.mod)for(const k of Object.keys(e.mod))if(!MODIFIER_KEYS.includes(k))errors.push(`${f.id}: invalid modifier ${k}`);
    if(e.unlock&&components)for(const c of e.unlock)if(!components[c])errors.push(`${f.id}: unknown component ${c}`);
    if(regions){const where=e.supply?.where||e.fort?.where;if(Array.isArray(where))for(const r of where)if(!regions.includes(r))errors.push(`${f.id}: unknown region ${r}`);if(e.regionLoyalty&&!regions.includes(e.regionLoyalty.region))errors.push(`${f.id}: unknown region ${e.regionLoyalty.region}`)}
    for(const t of [...(e.relation||[]).map(x=>x.target),...(e.propose?.targets||[]),e.peaceLetter,e.foreignTrust?.faction].filter(Boolean))if(!FACTIONS[t])errors.push(`${f.id}: unknown faction ${t}`)}
  }
  // cycles and reachability: every focus must be reachable from a root
  const state=new Map();const visit=(id,stack)=>{if(state.get(id)===2)return;if(state.get(id)===1){errors.push(`${faction}: circular prerequisite at ${id} (${stack.join(' → ')})`);return}state.set(id,1);const f=local.get(id);for(const p of [...(f?.prereq||[]),...(f?.any||[])])if(local.has(p))visit(p,[...stack,p]);state.set(id,2)};
  for(const f of tree)visit(f.id,[f.id]);
  const roots=tree.filter(f=>!f.prereq.length&&!f.any.length);if(!roots.length)errors.push(`${faction}: no root focus`);
  const reachable=new Set(roots.map(f=>f.id));let grew=true;while(grew){grew=false;for(const f of tree){if(reachable.has(f.id))continue;if(f.prereq.every(p=>reachable.has(p))&&(!f.any.length||f.any.some(p=>reachable.has(p)))&&!f.prereq.some(p=>f.exclusive.includes(p))){reachable.add(f.id);grew=true}}}
  for(const f of tree)if(!reachable.has(f.id))errors.push(`${faction}: unreachable focus ${f.id}`);
  // a prerequisite chain must not require two mutually exclusive focuses
  const ancestors=id=>{const out=new Set(),todo=[id];while(todo.length){const f=local.get(todo.pop());for(const p of f?.prereq||[])if(!out.has(p)){out.add(p);todo.push(p)}}return out};
  for(const f of tree){const anc=ancestors(f.id);for(const a of anc)for(const x of local.get(a).exclusive)if(anc.has(x)||x===f.id)errors.push(`${f.id}: requires exclusive focuses ${a} and ${x}`)}
 }
 return errors;
}

// ---------- state ----------
export function focusState(s,actor){
 s.world.nationalFocus||={};
 return s.world.nationalFocus[actor]||={active:null,completed:[],partial:{},history:[],modifiers:{},unlocked:[],priorities:null};
}
export function focusModifiers(s,actor){return s.world?.nationalFocus?.[actor]?.modifiers||{}}
export function unlockedComponents(s,actor){return s.world?.nationalFocus?.[actor]?.unlocked||[]}
const leaderOf=(s,actor)=>(s.world.leadership?.[actor]||[]).find(id=>s.world.characters[id]?.alive)||null;
function condition(s,actor,c={}){
 if(c.war===true&&!s.wars.some(w=>w.includes(actor)))return false;
 if(c.war===false&&s.wars.some(w=>w.includes(actor)))return false;
 if(c.warWith&&!isWar(s,actor,c.warWith))return false;
 if(c.holds&&s.regions.find(r=>r.id===c.holds)?.owner!==actor)return false;
 if(c.alive&&!(s.world.characters[c.alive]?.alive&&s.world.characters[c.alive].faction===actor))return false;
 if(c.minStability&&s.factions[actor].stability<c.minStability)return false;
 return true;
}
function invalidated(s,actor,f){
 if(!holds(s,actor))return 'collapse';
 const c=f.invalid||{};
 if(c.dead&&!s.world.characters[c.dead]?.alive)return 'leader_lost';
 if(s.world.disputes?.[actor]?.war&&f.branch==='diplomatic'&&f.effects.some(e=>e.peaceLetter))return 'civil_war';
 return null;
}
// available | in_progress | completed | locked | exclusive | suspended | invalid
export function focusStatus(s,actor,id){
 const f=focusById(actor,id),st=focusState(s,actor);if(!f)return 'unknown';
 if(st.completed.includes(id))return 'completed';
 if(f.exclusive.some(x=>st.completed.includes(x)||st.active?.id===x))return 'exclusive';
 if(st.active?.id===id)return st.active.suspended?'suspended':'in_progress';
 if(invalidated(s,actor,f))return 'invalid';
 if(!f.prereq.every(p=>st.completed.includes(p))||f.any.length&&!f.any.some(p=>st.completed.includes(p)))return 'locked';
 if(!condition(s,actor,f.pre))return 'suspended';
 return 'available';
}
export function focusCost(s,actor,id){const f=focusById(actor,id);return f?{treasury:f.cost.treasury||0,legitimacy:f.cost.legitimacy||0,stability:f.cost.stability||0}:null}
export function canStartFocus(s,actor,id){
 const status=focusStatus(s,actor,id);if(status!=='available')return status;
 const st=focusState(s,actor);if(st.active)return 'busy';
 const c=focusCost(s,actor,id),f=s.factions[actor];
 if(f.treasury<c.treasury)return 'treasury';if(f.legitimacy<c.legitimacy+5)return 'legitimacy';if(f.stability<c.stability+5)return 'stability';
 return null;
}
export function startFocus(s,actor,id,{log=()=>{}}={}){
 const reason=canStartFocus(s,actor,id);if(reason)return {ok:false,reason};
 const st=focusState(s,actor),f=focusById(actor,id),c=focusCost(s,actor,id),fac=s.factions[actor];
 fac.treasury-=c.treasury;fac.legitimacy-=c.legitimacy;fac.stability-=c.stability;
 const done=st.partial[id]||0;delete st.partial[id];
 st.active={id,progress:done,months:f.months,started:[s.year,s.month],paid:c};
 st.history.push({id,event:'started',year:s.year,month:s.month});
 if(actor===s.player)log(s,`National focus begun: ${f.name[0]} (${f.months-done} months).`,`国家方针开始：${f.name[1]}（${f.months-done}个月）。`,{kind:'focus'});
 return {ok:true,months:f.months-done};
}
// Cancelling keeps the progress made; a later restart resumes it.
export function cancelFocus(s,actor,{log=()=>{},reason='cancelled'}={}){
 const st=focusState(s,actor);if(!st.active)return {ok:false,reason:'none'};
 const f=focusById(actor,st.active.id);st.partial[st.active.id]=st.active.progress;
 st.history.push({id:st.active.id,event:reason,year:s.year,month:s.month,progress:st.active.progress});st.active=null;
 if(actor===s.player)log(s,`National focus set aside: ${f.name[0]}. Progress is kept.`,`国家方针暂停：${f.name[1]}。进度已保留。`,{kind:'focus'});
 return {ok:true};
}

// ---------- effects ----------
const factionCharacters=(s,actor)=>Object.values(s.world.characters).filter(c=>c.alive&&c.faction===actor);
const frontier=(s,actor)=>s.regions.filter(r=>r.owner===actor&&ROUTES.some(([a,b])=>(a===r.id||b===r.id)&&s.regions.find(x=>x.id===(a===r.id?b:a))?.owner!==actor));
const contacts=(s,actor)=>Object.keys(s.factions).filter(o=>o!==actor&&o!=='rebels'&&holds(s,o)&&(s.regions.some(r=>r.owner===o&&ROUTES.some(([a,b])=>(a===r.id||b===r.id)&&s.regions.find(x=>x.id===(a===r.id?b:a))?.owner===actor))||(s.agreements||[]).some(t=>t.status==='active'&&t.parties.includes(o)&&t.parties.includes(actor))));
export function applyFocusEffects(s,actor,f,{log=()=>{},sendInquiry=null}={}){
 const st=focusState(s,actor),fac=s.factions[actor],notes=[];
 for(const e of f.effects){
  if(e.res)for(const [k,v] of Object.entries(e.res)){if(k in fac)fac[k]=k==='stability'||k==='legitimacy'?Math.max(0,Math.min(100,fac[k]+v)):fac[k]+v}
  if(e.mod)for(const [k,v] of Object.entries(e.mod))st.modifiers[k]=Math.round(((st.modifiers[k]||0)+v)*1000)/1000;
  if(e.unlock)for(const c of e.unlock)if(!st.unlocked.includes(c))st.unlocked.push(c);
  if(e.armyMorale)for(const a of s.armies.filter(x=>x.owner===actor&&x.men>0))a.morale=Math.min(95,a.morale+e.armyMorale);
  if(e.supply){const where=e.supply.where==='coastal'?s.regions.filter(r=>r.owner===actor&&COASTAL.has(r.id)):s.regions.filter(r=>r.owner===actor&&(!Array.isArray(e.supply.where)||e.supply.where.includes(r.id)));for(const r of where)r.supply=Math.min(25,r.supply+e.supply.n)}
  if(e.loyalty)for(const r of s.regions.filter(r=>r.owner===actor))r.loyalty=Math.max(0,Math.min(100,r.loyalty+e.loyalty));
  if(e.regionLoyalty){const r=s.regions.find(x=>x.id===e.regionLoyalty.region&&x.owner===actor);if(r)r.loyalty=Math.max(0,Math.min(100,r.loyalty+e.regionLoyalty.n))}
  if(e.satisfaction)for(const r of s.regions.filter(r=>r.owner===actor&&r.population))r.population.satisfaction=Math.max(0,Math.min(100,r.population.satisfaction+e.satisfaction));
  if(e.fort){const list=(Array.isArray(e.fort.where)?s.regions.filter(r=>r.owner===actor&&e.fort.where.includes(r.id)):frontier(s,actor)).filter(r=>r.fort<3).sort((a,b)=>(b.terrain==='hills')-(a.terrain==='hills')||a.fort-b.fort||a.id.localeCompare(b.id));for(const r of list.slice(0,e.fort.count||1)){r.fort++;notes.push(['fort',r.id])}}
  if(e.religion)for(const o of s.world.religiousInstitutions||[])if(s.regions.find(r=>r.id===o.region)?.owner===actor){o.relations||={};o.relations[actor]=Math.min(100,(o.relations[actor]||0)+e.religion)}
  if(e.oversight){s.world.constitutionalOversight||={};s.world.constitutionalOversight[actor]=true}
  const leader=leaderOf(s,actor);
  if(e.leaderInfluence&&leader){const c=s.world.characters[leader];c.influence=Math.max(0,Math.min(100,(c.influence||50)+e.leaderInfluence))}
  if(e.characterInfluence){const c=s.world.characters[e.characterInfluence.id];if(c?.alive)c.influence=Math.max(0,Math.min(100,(c.influence||50)+e.characterInfluence.n))}
  if(e.characterLoyalty)for(const id of e.characterLoyalty.ids){const c=s.world.characters[id];if(c?.alive&&c.faction===actor)c.loyalty=Math.max(0,Math.min(100,(c.loyalty??60)+e.characterLoyalty.n))}
  // Elites: influential non-leaders react to a reform. Generals: ambitious commanders.
  if(e.elite)for(const c of factionCharacters(s,actor).filter(c=>c.id!==leader&&(c.influence??50)>=45)){c.loyalty=Math.max(0,Math.min(100,(c.loyalty??60)+e.elite));if(e.elite<0)notes.push(['elite',c.id])}
  if(e.generals){const commanders=new Set(s.armies.filter(a=>a.owner===actor&&a.characterId).map(a=>a.characterId));for(const c of factionCharacters(s,actor).filter(c=>c.id!==leader&&(commanders.has(c.id)||(politicalAmbition(s,c.id)??0)>=60))){c.loyalty=Math.max(0,Math.min(100,(c.loyalty??60)+e.generals));notes.push(['general',c.id])}}
  if(e.relation)for(const {target,n} of e.relation)if(s.factions[target]&&target!==actor){const k=pair(actor,target);s.relations[k]=Math.max(-100,Math.min(100,(s.relations[k]??0)+n))}
  if(e.foreignTrust){const leaders=new Set(s.world.leadership?.[e.foreignTrust.faction]||[]);for(const c of factionCharacters(s,e.foreignTrust.faction).filter(c=>!leaders.has(c.id)))c.loyalty=Math.max(0,Math.min(100,(c.loyalty??60)-Math.round(e.foreignTrust.n/2)));rememberPoliticalEvent(s,e.foreignTrust.faction,actor,'clemency',e.foreignTrust.n/2)}
  // Diplomatic effects open a proposal; the other court decides with existing rules.
  if(e.peaceLetter&&isWar(s,actor,e.peaceLetter)&&sendInquiry){const r=sendInquiry(s,actor,e.peaceLetter,'peace');notes.push(['peace_letter',e.peaceLetter,r.ok?'sent':r.reason])}
  if(e.propose)for(const target of e.propose.targets){if(!holds(s,target)||isWar(s,actor,target))continue;const [from,to]=e.propose.reverse?[target,actor]:[actor,target];const r=proposeAgreement(s,from,to,e.propose.type);notes.push(['proposal',target,e.propose.type,r.ok?'accepted':r.reason])}
  if(e.perceive)for(const o of contacts(s,actor)){rememberPoliticalEvent(s,o,actor,'strategic_threat',-e.perceive);notes.push(['perceived',o])}
  if(e.succession&&leader){const heir=(successionCandidates(s,actor)||[]).find(id=>id&&id!==leader&&s.world.characters[id]?.alive);if(heir){s.world.successionPlans||={};s.world.successionPlans[actor]=heir;notes.push(['succession',heir])}else notes.push(['succession',null])}
 }
 return notes;
}

// ---------- monthly progression ----------
export function advanceFocuses(s,{autoplayPlayer=false,log=()=>{},sendInquiry=null}={}){
 s.world.nationalFocus||={};
 for(const actor of Object.keys(s.factions)){
  if(actor==='rebels'||!treeFor(actor))continue;
  const st=focusState(s,actor),a=st.active;
  // Three-month treasury trend, from the court's own accounts.
  st.treasuryLog=[...(st.treasuryLog||[]),s.factions[actor].treasury].slice(-4);st.treasuryTrend=st.treasuryLog.length>=2?st.treasuryLog.at(-1)-st.treasuryLog[0]:0;
  if(a){
   const f=focusById(actor,a.id),why=f&&invalidated(s,actor,f);
   if(!f){st.active=null;continue}
   if(why){
    // Invalidated: half of the treasury cost is recovered, progress is recorded,
    // and the disruption costs stability. Nothing is silently consumed.
    const refund=Math.floor((a.paid?.treasury||0)/2);s.factions[actor].treasury+=refund;s.factions[actor].stability=Math.max(0,s.factions[actor].stability-2);
    st.history.push({id:a.id,event:'invalidated',reason:why,year:s.year,month:s.month,progress:a.progress,refund});st.partial[a.id]=a.progress;st.active=null;
    if(actor===s.player)log(s,`National focus invalidated: ${f.name[0]} (${why==='leader_lost'?'its leader is gone':why==='civil_war'?'civil war':'government collapse'}). ${refund} treasury recovered; stability −2.`,`国家方针失效：${f.name[1]}（${why==='leader_lost'?'关键人物已不在':why==='civil_war'?'内战':'政府崩溃'}）。收回${refund}国库；稳定度−2。`,{kind:'focus'});
    continue;
   }
   if(!condition(s,actor,f.pre)){if(!a.suspended){a.suspended=true;st.history.push({id:a.id,event:'suspended',year:s.year,month:s.month,progress:a.progress});if(actor===s.player)log(s,`National focus suspended: ${f.name[0]}. Its conditions are no longer met; progress is kept.`,`国家方针中止：${f.name[1]}。条件已不满足；进度保留。`,{kind:'focus'})}continue}
   if(a.suspended){a.suspended=false;st.history.push({id:a.id,event:'resumed',year:s.year,month:s.month})}
   a.progress++;
   if(a.progress>=a.months){
    st.completed.push(a.id);st.active=null;const notes=applyFocusEffects(s,actor,f,{log,sendInquiry});
    st.history.push({id:a.id,event:'completed',year:s.year,month:s.month,notes});
    observeFocus(s,actor,f);generalsReact(s,actor,f,{log});
    if(actor===s.player)log(s,`National focus completed: ${f.name[0]}.`,`国家方针完成：${f.name[1]}。`,{kind:'focus',focus:f.id});
   }
  }
  const automated=autoplayPlayer||actor!==s.player;
  if(automated&&st.active&&s.month%3===0)reviewAIFocus(s,actor,{log});
  if(!st.active&&automated)chooseFocus(s,actor,{log});
 }
}

// Foreign courts with contact learn of a completed focus as a dated report.
export function observeFocus(s,actor,f){
 s.world.focusReports||={};
 for(const o of contacts(s,actor)){const list=s.world.focusReports[o]||=[];list.unshift({actor,focus:f.id,branch:f.branch,year:s.year,month:s.month,threat:f.effects.some(e=>e.perceive)||f.branch==='military'});s.world.focusReports[o]=list.slice(0,40)}
}
export function focusReportsFor(s,viewer){return (s.world.focusReports?.[viewer]||[]).map(x=>({...x}))}

// ---------- AI ----------
// Scores use only the actor's own state, its leader's personality, its known
// wars, its own sightings and focus reports it has received. Hard and expert
// AIs weigh anticipated threats; nobody sees future random events.
export function scoreFocus(s,actor,f){
 const fac=s.factions[actor],ai=f.ai||{},level=s.difficulty||'standard',personality=s.world.strategicPersonalities?.[actor]?.personality||'survivor';
 const atWar=s.wars.some(w=>w.includes(actor)),now=date(s);
 const sightings=Object.values(s.knowledge?.[actor]||{}).flatMap(k=>Object.values(k.sightings||{})).filter(x=>now-(x.year*12+x.month)<=6&&x.owner!==actor);
 const ownRegions=new Set(s.regions.filter(r=>r.owner===actor).map(r=>r.id));
 const near=sightings.filter(x=>ownRegions.has(x.region)||ROUTES.some(([a,b])=>(a===x.region&&ownRegions.has(b))||(b===x.region&&ownRegions.has(a)))).filter(x=>isWar(s,actor,x.owner)||(s.relations[pair(actor,x.owner)]??0)<0).length;
 const reports=(s.world.focusReports?.[actor]||[]).filter(r=>r.threat&&now-(r.year*12+r.month)<=12).length;
 let score=ai.base||10;
 if(atWar)score+=ai.war||0;else score+=ai.peace||0;
 if(fac.treasury<30)score+=ai.lowTreasury||0;
 if(fac.stability<45)score+=ai.lowStability||0;
 if(fac.food<20)score+=ai.lowFood||0;
 // A court whose treasury has been falling favours focuses that raise revenue.
 const st=s.world.nationalFocus?.[actor],deficit=st&&Number.isFinite(st.treasuryTrend)&&st.treasuryTrend<0;
 if(deficit&&f.effects.some(e=>e.mod&&(e.mod.treasury>0||e.mod.tax>0)))score+=14;
 if(['hard','expert'].includes(level))score+=(ai.threat||0)*Math.min(2,(near?1:0)+(reports?1:0));
 score+=(ai.personality?.[personality]||0);
 if(f.effects.some(e=>e.peaceLetter)&&!atWar)score-=8;
 if(f.pre?.warWith&&!isWar(s,actor,f.pre.warWith))score-=20;
 const cost=f.cost.treasury||0;if(cost>fac.treasury*.6)score-=6;
 if(level==='beginner')score+=roll(s,actor+f.id,0x91)*14;else if(level==='standard')score+=roll(s,actor+f.id,0x91)*8;else score+=roll(s,actor+f.id,0x91)*3;
 return Math.round(score*10)/10;
}
export function chooseFocus(s,actor,{log=()=>{}}={}){
 const st=focusState(s,actor),tree=treeFor(actor);if(!tree||st.active||!holds(s,actor))return null;
 // Keep a treasury reserve: the AI does not spend itself into insolvency on a focus.
 const fac=s.factions[actor];
 const options=tree.filter(f=>canStartFocus(s,actor,f.id)===null&&(fac.treasury-(f.cost.treasury||0)>=15||fac.treasury-(f.cost.treasury||0)>=3&&f.effects.some(e=>e.mod&&(e.mod.treasury>0||e.mod.tax>0)))).map(f=>({f,score:scoreFocus(s,actor,f)})).sort((a,b)=>b.score-a.score||a.f.id.localeCompare(b.f.id));
 st.priorities={date:date(s),top:options.slice(0,3).map(x=>({id:x.f.id,score:x.score}))};
 const pick=options.find(x=>x.score>=4);if(!pick)return null;
 const r=startFocus(s,actor,pick.f.id,{log});return r.ok?pick.f.id:null;
}
// An AI may abandon a strategy when circumstances change (e.g. a peace path
// during a collapsing war, or a costly reform while bankrupt).
export function reviewAIFocus(s,actor,{log=()=>{}}={}){
 const st=focusState(s,actor);if(!st.active)return false;
 const f=focusById(actor,st.active.id);if(!f)return false;
 const options=treeFor(actor).filter(x=>x.id!==f.id&&canStartFocusIgnoringBusy(s,actor,x.id)).map(x=>scoreFocus(s,actor,x));
 const best=Math.max(-Infinity,...options),current=scoreFocus(s,actor,f);
 if(st.active.suspended&&best>=current-2||best>current+12&&st.active.progress<st.active.months/2){cancelFocus(s,actor,{log,reason:'abandoned'});return true}
 return false;
}
function canStartFocusIgnoringBusy(s,actor,id){if(focusStatus(s,actor,id)!=='available')return false;const c=focusCost(s,actor,id),f=s.factions[actor];return f.treasury>=c.treasury&&f.legitimacy>=c.legitimacy+5&&f.stability>=c.stability+5}

export function legitimateFocusView(s,viewer,actor){
 // The player sees its own tree fully; a foreign tree shows only reported completions.
 if(viewer===actor)return {completed:[...focusState(s,actor).completed],active:focusState(s,actor).active?{...focusState(s,actor).active}:null};
 return {completed:(s.world.focusReports?.[viewer]||[]).filter(r=>r.actor===actor).map(r=>r.focus),active:null};
}

// National vs personal strategy: when the government chooses negotiation, an
// ambitious commander may comply, criticize or quietly turn against the leader.
// The outcome depends on loyalty and ambition; nothing is forced beyond that.
export function generalsReact(s,actor,f,{log=()=>{}}={}){
 const conciliatory=f.effects.some(e=>e.peaceLetter||['non_aggression','political'].includes(e.propose?.type));if(!conciliatory)return [];
 const leaders=new Set(s.world.leadership?.[actor]||[]),out=[];
 for(const a of s.armies.filter(x=>x.owner===actor&&x.characterId&&!leaders.has(x.characterId))){
  const c=s.world.characters[a.characterId];if(!c?.alive)continue;const ambition=politicalAmbition(s,c.id)??40,loyalty=c.loyalty??60;
  let reaction='comply';
  if(ambition>=70&&loyalty<50){reaction='intrigue';c.loyalty=Math.max(0,loyalty-5);improveLeaderTrust(s,c.id,-8)}
  else if(ambition>=55){reaction='criticize';c.influence=Math.min(90,(c.influence??50)+2);c.loyalty=Math.max(0,loyalty-2)}
  out.push({id:c.id,reaction});
  (s.world.policyReactions||=[]).unshift({actor,focus:f.id,person:c.id,reaction,year:s.year,month:s.month});s.world.policyReactions=s.world.policyReactions.slice(0,40);
  if(actor===s.player&&reaction==='criticize')log(s,'A senior commander openly criticizes the new policy of negotiation.','一位资深将领公开批评新的谈判政策。',{kind:'focus'});
 }
 return out;
}
