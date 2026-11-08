import {advancePersonalDiplomacy,personalDiplomaticCredit} from './personal-diplomacy.js?v=phase-x-1';
import {initializeGovernments,advanceGovernments,deriveGovernment,validSuccessionPlan} from './governance.js?v=phase-x-7';
import {REGIONS, ROUTES, FACTIONS, INITIAL_ARMIES} from './data.js?v=phase-x-1';
import {initializeWorld,OPENING_LEADERS,CHARACTER_CATALOG} from './characters.js?v=phase-x-1';
import {queueMission,advanceOperations,advanceAgentRequests,requestAgentRelease,advanceCharacters,advanceMissingCommanders,advanceDisputes,battlefieldWound,commandFactor,linkCommanders,relieveIncapacitatedCommanders,publicLeaderClaim,addReport,observeArmies,supportClaimant,refreshReportConfidence} from './character-system.js?v=phase-x-1';
import {advanceOffices,officeEffects,governorLoyaltyEffect} from './office-system.js?v=phase-x-1';
import {advanceConspiracies} from './conspiracies.js?v=phase-x-1';
import {initializeControlKnowledge,observeControl,advanceControlScouts,reportedControl,observeArrival} from './control-intelligence.js?v=phase-x-1';
import {resolveDynasticWars,canMediate,requestMediation,advanceMediations} from './civil-war.js?v=phase-x-1';
import {initializeDynasties,seedOpeningFictionalHouseholds,advanceDynasties,createDisputedHeirScenario,recordLifeEvent} from './dynasties.js?v=phase-x-1';
import {initializeChronicle,captureCampaignState,recordCampaignTurn} from './chronicle.js?v=phase-x-6';
export {queueMission};
export {personalDiplomaticCredit};

const clone = value => JSON.parse(JSON.stringify(value));
export const region = (s,id) => s.regions.find(r=>r.id===id);
export const army = (s,id) => s.armies.find(a=>a.id===id);
export const adjacent = (id) => ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>({to:r[0]===id?r[1]:r[0],sea:r[2]==='sea'}));
const rnd = s => {s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296};
const log = (s,en,zh,meta={}) => {s.log.unshift({month:s.month,year:s.year,en,zh,...meta});s.log=s.log.slice(0,80)};
export const isWar = (s,a,b) => a!==b && s.wars.some(w=>w.includes(a)&&w.includes(b));
export const PLAYABLE = ['caesar','senate','egypt','numidia','mauretania','armenia','parthia','galatia','bosporus'];
const pair = (a,b) => [a,b].sort().join(':');
export const relation = (s,a,b) => s.relations[pair(a,b)] ?? 0;
export const isAllied = (s,a,b) => s.alliances.some(p=>p.includes(a)&&p.includes(b));
const strength = (s,id) => s.armies.filter(a=>a.owner===id).reduce((v,a)=>v+a.men,0);

export function newGame(player='caesar'){
  if(!PLAYABLE.includes(player))throw new Error('Invalid playable faction');
  const s=initializeWorld({version:3,chronicleVisibilityVersion:1,seed:49049,year:-49,month:1,mode:'historical',player,relations:{'caesar:numidia':-30,'caesar:mauretania':20,'caesar:parthia':-10,'numidia:senate':25,'galatia:senate':25},alliances:[],
    regions:clone(REGIONS),armies:clone(INITIAL_ARMIES).map(a=>({...a,move:null,siege:null})),
    factions:{
      caesar:{treasury:90,food:65,manpower:22000,stability:58,legitimacy:49,tax:'normal',research:0},
      senate:{treasury:135,food:100,manpower:34000,stability:57,legitimacy:68,tax:'normal',research:0},
      egypt:{treasury:85,food:90,manpower:9000,stability:64,legitimacy:60,tax:'normal',research:0},
      ...Object.fromEntries(['numidia','mauretania','armenia','parthia','galatia','bosporus'].map(id=>[id,{treasury:60,food:60,manpower:9000,stability:65,legitimacy:60,tax:'normal',research:0}])),
      rebels:{treasury:10,food:15,manpower:0,stability:50,legitimacy:0,tax:'normal',research:0}
    },wars:[['caesar','senate']],log:[],victory:false,nextArmy:1});
  // A new campaign starts with frontier observations, not every foreign army's
  // exact opening location. Existing saves keep their accumulated sightings.
  for(const targets of Object.values(s.knowledge))for(const knowledge of Object.values(targets))knowledge.sightings={};
  linkCommanders(s);observeArmies(s);observeControl(s);initializeDynasties(s);seedOpeningFictionalHouseholds(s);initializeChronicle(s);return initializeGovernments(s);
}

export function newDynastyScenario(){const s=newGame('egypt');createDisputedHeirScenario(s);return s}

// Add newly modeled courts to older campaigns without resetting existing people or territory.
function migrateRegionalPowers(s){
 initializeWorld(s);const added=[];for(const id of ['galatia','bosporus']){if(s.factions[id])continue;added.push(id);s.factions[id]={treasury:60,food:60,manpower:9000,stability:65,legitimacy:60,tax:'normal',research:0};if(!s.regions.some(r=>r.id===id))s.regions.push(clone(REGIONS.find(r=>r.id===id)));if(!s.armies.some(a=>a.id===id+'army'))s.armies.push({...clone(INITIAL_ARMIES.find(a=>a.id===id+'army')),move:null,siege:null});const leader=OPENING_LEADERS[id][0],person=s.world.characters[leader];s.world.leadership[id]=person?.alive?[leader]:[];if(person&&person.faction==null){person.faction=id;if(person.location==null&&!person.missing)person.location=id}}
 if(added.length){for(const actor of Object.keys(s.factions)){s.knowledge[actor]||={};for(const target of Object.keys(s.factions)){if(!s.knowledge[actor][target])s.knowledge[actor][target]={reportedLeaders:clone(OPENING_LEADERS[target]||[]),reports:[],sightings:{}}}}if(added.includes('galatia')&&s.relations['galatia:senate']===undefined)s.relations['galatia:senate']=25}
}
// Earlier saves represented each realm as one theater. Split the existing
// economic potential and preserve its controller and reported control; do not
// invent a boundary or change the owner of a campaign already in progress.
function migrateEasternTheaters(s){
 for(const [parentId,newId] of [['egypt','egyptUpper'],['parthia','media']]){
  if(s.regions.some(r=>r.id===newId))continue;
  const parent=region(s,parentId),template=REGIONS.find(r=>r.id===newId);if(!parent||!template)continue;
  const next=clone(template);next.owner=parent.owner;next.loyalty=parent.loyalty;
  for(const key of ['food','tax']){const total=Number.isFinite(parent[key])?parent[key]:0;next[key]=Math.max(0,Math.floor(total/3));parent[key]=total-next[key]}
  const parentTemplate=REGIONS.find(r=>r.id===parentId);if(parentTemplate)parent.name=clone(parentTemplate.name);
  s.regions.push(next);
  for(const reports of Object.values(s.controlKnowledge||{}))if(!reports[newId]&&reports[parentId])reports[newId]={...reports[parentId]};
 }
}
function migrateBattleIds(s){
 const reports=s.battles||[];let next=Math.max(s.nextBattle||1,...reports.map(b=>Number(String(b.id||'').split(':')[1])||0))+1;
 for(const report of [...reports].reverse())if(!report.id)report.id=`battle:${next++}`;
 for(const entry of s.chronicle?.entries||[]){if(!entry.battleId||String(entry.battleId).startsWith('battle:'))continue;const candidates=reports.filter(b=>b.year===entry.year&&b.month===entry.month&&b.region===entry.region&&b.attacker.id===String(entry.battleId).split(':').at(-1));const match=candidates.find(b=>{const loss=b.attacker.owner===s.player?b.lossA:b.lossD;return loss===entry.ownCasualties})||candidates[0];if(match)entry.battleId=match.id}
 for(const month of s.chronicle?.monthly||[])month.battles=month.entryIds.map(id=>s.chronicle.entries.find(e=>e.id===id&&e.kind==='battle')?.battleId).filter(Boolean);
 s.nextBattle=next;
}
export function upgradeSave(s){
 if(s.version===2){const old=s.relations||{},oldAllies=s.alliances||[];s.relations=Object.fromEntries(Object.entries(old).map(([id,value])=>[pair('caesar',id),value]));s.alliances=oldAllies.map(id=>['caesar',id]);s.version=3}
 if(s.version!==3)throw new Error('Unsupported save');
 if(!s.chronicleVisibilityVersion){for(const event of s.log||[])event.legacyUnverified=true;s.chronicleVisibilityVersion=1}
 migrateRegionalPowers(s);migrateEasternTheaters(s);initializeDynasties(s);initializeControlKnowledge(s);initializeChronicle(s);migrateBattleIds(s);return refreshReportConfidence(initializeGovernments(s));
}

export function previewMarch(s,armyId,destination){
  const a=army(s,armyId); const target=region(s,destination);
  if(!a||!target||a.men<=0||a.move||a.siege)return {ok:false,reason:'unavailable'};
  const link=adjacent(a.region).find(e=>e.to===destination);
  if(!link)return {ok:false,reason:'adjacent'};
  const report=reportedControl(s,a.owner,destination),reportedOwner=report?.owner;
  if(reportedOwner&&reportedOwner!==a.owner&&!isWar(s,a.owner,reportedOwner))return {ok:false,reason:'peace'};
  const faction=s.factions[a.owner];
  if(link.sea&&faction.treasury<8)return {ok:false,reason:'transport'};
  const months=(link.sea?3:1)+(target.terrain==='hills'?1:0)+(target.terrain==='desert'?1:0);
  return {ok:true,months,sea:!!link.sea,terrain:target.terrain,hostile:!!reportedOwner&&reportedOwner!==a.owner,reportedOwner:reportedOwner||null,controlReport:report,food:faction.food,supply:target.supply};
}

export function moveArmy(s,armyId,destination){
  const estimate=previewMarch(s,armyId,destination);
  if(!estimate.ok)return estimate;
  const a=army(s,armyId),target=region(s,destination),link=adjacent(a.region).find(e=>e.to===destination);
  if(link.sea)s.factions[a.owner].treasury-=8;
  const months=estimate.months;
  a.move={to:destination,remaining:months,sea:link.sea};
  a.order={kind:'move',target:destination};
  if(a.owner===s.player)log(s,`${a.name[0]} marched toward ${target.name[0]} (${months} month${months>1?'s':''}).`,`${a.name[1]}向${target.name[1]}行军（${months}个月）。`);
  return {ok:true};
}

// All player and AI field orders use the same state transition. Persistent
// stances are resolved during combat and monthly upkeep, including old saves
// whose armies have no order field.
export function issueMilitaryOrder(s,armyId,kind,targetId=null,owner=s.player){
  const a=army(s,armyId),f=s.factions[owner],place=a&&region(s,a.region);
  if(!a||a.owner!==owner||a.men<=0||!f||!place)return {ok:false,reason:'unavailable'};
  if(kind==='cancel'){
    if(!a.move&&!a.siege&&!a.order)return {ok:false,reason:'unavailable'};
    a.move=null;a.siege=null;a.order=null;
    if(owner===s.player)log(s,`${a.name[0]} cancelled its field order.`,`${a.name[1]}取消了野战命令。`);
    return {ok:true};
  }
  if(kind==='move'||kind==='attack'){
    if(a.move||a.siege)return {ok:false,reason:'unavailable'};
    const plan=previewMarch(s,armyId,targetId);
    if(!plan.ok)return plan;
    if(kind==='attack'&&!plan.hostile)return {ok:false,reason:'target'};
    const result=moveArmy(s,armyId,targetId);
    if(result.ok){a.move.intent=kind;a.order={kind,target:targetId}}
    return result;
  }
  if(kind==='retreat'){
    const link=adjacent(a.region).find(x=>x.to===targetId),dest=region(s,targetId);
    if(!link||!dest||dest.owner!==owner||a.move)return {ok:false,reason:'target'};
    if(link.sea&&f.treasury<8)return {ok:false,reason:'transport'};
    if(link.sea)f.treasury-=8;
    a.siege=null;a.order={kind,target:targetId};a.move={to:targetId,remaining:link.sea?3:1,sea:link.sea,intent:'retreat'};
    a.morale=Math.max(20,a.morale-3);
    if(owner===s.player)log(s,`${a.name[0]} withdrew toward ${dest.name[0]}.`,`${a.name[1]}向${dest.name[1]}撤退。`);
    return {ok:true};
  }
  if(a.move||a.siege)return {ok:false,reason:'unavailable'};
  if(['defend','hold','guard'].includes(kind)){
    if(kind==='guard'&&place.owner!==owner)return {ok:false,reason:'target'};
    a.order={kind,target:a.region};
    if(owner===s.player)log(s,`${a.name[0]} received a ${kind} order at ${place.name[0]}.`,`${a.name[1]}在${place.name[1]}接受了${{defend:'防御',hold:'坚守',guard:'守卫要地'}[kind]}命令。`);
    return {ok:true};
  }
  if(kind==='reinforce'){
    if(place.owner!==owner||f.treasury<6||f.food<2||f.manpower<1000||a.men>=15000)return {ok:false,reason:'resources'};
    f.treasury-=6;f.food-=2;f.manpower-=1000;a.men+=1000;
    if(owner===s.player)log(s,`${a.name[0]} received 1,000 reinforcements at ${place.name[0]}.`,`${a.name[1]}在${place.name[1]}获得1000名援兵。`);
    return {ok:true};
  }
  if(kind==='rally'){
    if(f.treasury<5||f.food<2||a.morale>=90)return {ok:false,reason:'resources'};
    f.treasury-=5;f.food-=2;a.morale=Math.min(90,a.morale+10);
    if(owner===s.player)log(s,`${a.name[0]} rallied at ${place.name[0]}.`,`${a.name[1]}在${place.name[1]}重整士气。`);
    return {ok:true};
  }
  if(kind==='recruit')return recruit(s,a.region,owner)?{ok:true}:{ok:false,reason:'resources'};
  return {ok:false,reason:'unavailable'};
}

export function recruit(s,regionId,owner=s.player){
  const r=region(s,regionId),f=s.factions[owner];
  if(!r||r.owner!==owner||f.treasury<24||f.manpower<3000||f.food<6)return false;
  f.treasury-=24;f.manpower-=3000;f.food-=6;
  const id=`levy${s.nextArmy++}`;
  const roman=owner==='caesar'||owner==='senate';
  s.armies.push({id,name:roman?['Newly raised legion','新编军团']:['Newly raised forces','新征召军队'],owner,region:regionId,men:3000,morale:58,skill:1,experience:0,commander:['Unnamed officer','未具名军官'],move:null,siege:null});
  r.loyalty=Math.max(0,r.loyalty-3);
  if(owner===s.player)log(s,`New forces were raised in ${r.name[0]}.`,`在${r.name[1]}征召了新军队。`);
  return true;
}

export function setTax(s,owner,level){
  if(!['low','normal','high'].includes(level)||!s.factions[owner])return false;
  s.factions[owner].tax=level;
  if(owner===s.player)log(s,`${FACTIONS[owner].short[0]} set ${level} taxation.`,`${FACTIONS[owner].short[1]}实行${{low:'低',normal:'标准',high:'高'}[level]}税率。`);
  return true;
}

export function diplomacy(s, actor, target, action){
  if(actor===target || !s.factions[actor] || !s.factions[target] || target==='rebels'||actor==='rebels' || !s.regions.some(r=>r.owner===actor) || !s.regions.some(r=>r.owner===target))return false;
  const key=pair(actor,target);
  if(action==='improve' && !isWar(s,actor,target) && s.factions[actor].treasury>=10){s.factions[actor].treasury-=10;s.relations[key]=Math.min(100,relation(s,actor,target)+15);if(actor===s.player||target===s.player)log(s,`${FACTIONS[actor].short[0]} improved relations with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}改善了与${FACTIONS[target].short[1]}的关系。`,{other:actor===s.player?target:actor});return true}
  if(action==='alliance' && !isWar(s,actor,target) && relation(s,actor,target)+personalDiplomaticCredit(s,actor,target)>=30 && !isAllied(s,actor,target) && !s.wars.some(w=>(w.includes(actor)&&isAllied(s,target,w.find(x=>x!==actor)))||(w.includes(target)&&isAllied(s,actor,w.find(x=>x!==target))))){s.alliances.push([actor,target]);if(actor===s.player||target===s.player)log(s,`${FACTIONS[actor].short[0]} allied with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}与${FACTIONS[target].short[1]}结盟。`,{other:actor===s.player?target:actor});return true}
  if(action==='break' && isAllied(s,actor,target)){s.alliances=s.alliances.filter(p=>!(p.includes(actor)&&p.includes(target)));s.relations[key]=relation(s,actor,target)-20;if(actor===s.player||target===s.player)log(s,`${FACTIONS[actor].short[0]} broke its alliance with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}解除了与${FACTIONS[target].short[1]}的同盟。`,{other:actor===s.player?target:actor});return true}
  if(action==='war' && !isWar(s,actor,target)){
    if(isAllied(s,actor,target))return false;
    const playerWarsBefore=new Set(s.wars.filter(w=>w.includes(s.player)).map(w=>w.find(id=>id!==s.player)));
    s.wars.push([actor,target]);
    for(const p of s.alliances.filter(p=>p.includes(target))){const ally=p.find(x=>x!==target);if(ally!==actor&&!isWar(s,ally,actor)&&!isAllied(s,ally,actor))s.wars.push([ally,actor])}
    for(const p of s.alliances.filter(p=>p.includes(actor))){const ally=p.find(x=>x!==actor);if(ally!==target&&!isWar(s,ally,target)&&!isAllied(s,ally,target))s.wars.push([ally,target])}
    s.relations[key]=-60;
    s.factions[actor].legitimacy=Math.max(0,s.factions[actor].legitimacy-5);
    if(actor===s.player||target===s.player)log(s,`${FACTIONS[actor].short[0]} declared war on ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}向${FACTIONS[target].short[1]}宣战。`,{other:actor===s.player?target:actor});
    else for(const enemy of s.wars.filter(w=>w.includes(s.player)).map(w=>w.find(id=>id!==s.player)).filter(id=>!playerWarsBefore.has(id))){log(s,`An alliance has brought your faction into war with ${FACTIONS[enemy].short[0]}.`,`同盟义务使本方与${FACTIONS[enemy].short[1]}进入战争。`)}
    return true;
  }
  if(action==='peace' && isWar(s,actor,target)){
    // The responding government knows its own forces, but judges the sender by its reports.
    if(estimatedStrength(s,target,actor)<strength(s,target)*.6 && s.factions[target].stability>35)return false;
    s.wars=s.wars.filter(w=>!(w.includes(actor)&&w.includes(target)));
    s.relations[key]=-20;
    for(const a of s.armies.filter(a=>a.owner===actor||a.owner===target)){
      const other=a.owner===actor?target:actor;
      if(a.move && reportedControl(s,a.owner,a.move.to)?.owner===other)a.move=null;
      if(a.siege && region(s,a.siege.region).owner===other)a.siege=null;
    }
    if(actor===s.player||target===s.player)log(s,`${FACTIONS[actor].short[0]} and ${FACTIONS[target].short[0]} made peace; current control remains.`,`${FACTIONS[actor].short[1]}与${FACTIONS[target].short[1]}议和，维持现有控制。`,{other:actor===s.player?target:actor});
    return true;
  }
  return false;
}

// Official letters are simulated per sender and persist in compatible saves.
const courtReports={
 caesar:['Julius Caesar, military and political leader','尤利乌斯·凯撒，政治与军事领袖'],
 senate:['Pompey, commander aligned with the Senate','庞培，元老院方面军事统帅'],
 egypt:['Cleopatra VII and Ptolemy XIII, joint rulers','克娄巴特拉七世与托勒密十三世，共同统治者'],
 numidia:['Juba I, king','朱巴一世，国王'],mauretania:['Bocchus II and Bogud, rulers of separate kingdoms','博库斯二世与博古德，各自统治不同王国'],
 armenia:['Artavasdes II, king','阿尔塔瓦兹德二世，国王'],parthia:['Orodes II, king','奥罗德二世，国王'],galatia:['Deiotarus, Galatian king','代奥塔鲁斯，加拉太国王'],bosporus:['Pharnaces II, king','法尔纳刻斯二世，国王'],egypt_claimant:['Disputed Egyptian authority','争议中的埃及执政方'],parthia_claimant:['Disputed Parthian authority','争议中的帕提亚执政方']
};
const letterMonths={senate:2,caesar:2,egypt:4,egypt_claimant:4,numidia:3,mauretania:4,armenia:5,parthia:5,parthia_claimant:5,galatia:4,bosporus:5};
export function sendInquiry(s,actor,target,subject='leaders'){
 if(!['leaders','successor','availability','representative','clashes','peace'].includes(subject)||subject==='clashes'&&!['egypt','parthia'].includes(target))return {ok:false,reason:'subject'};
 if(actor===target||!s.factions[actor]||!courtReports[target]||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unavailable'};
 if(subject==='peace'&&!isWar(s,actor,target))return {ok:false,reason:'unavailable'};
 if(target.endsWith('_claimant')&&!s.regions.some(r=>reportedControl(s,actor,r.id)?.owner===target)&&!Object.keys(s.knowledge[actor]?.[target]?.sightings||{}).length&&!s.knowledge[actor]?.[target]?.reportedLeaders?.length)return {ok:false,reason:'unavailable'};
 if(s.factions[actor].treasury<3)return {ok:false,reason:'treasury'};
 if((s.inquiries||[]).some(x=>x.actor===actor&&x.target===target&&x.status==='pending'))return {ok:false,reason:'pending'};
 const duration=letterMonths[target]||4;s.factions[actor].treasury-=3;
 (s.inquiries||=[]).unshift({actor,target,sentYear:s.year,sentMonth:s.month,remaining:duration,duration,subject,status:'pending',source:'official court',confidence:'unverified',...(target.endsWith('_claimant')?{targetGeneration:s.world.dynasticGenerations?.[target]||0}:{})});
 if(actor===s.player)log(s,`A letter was sent to ${FACTIONS[target].short[0]}; a reply may take ${duration} months.`,`已向${FACTIONS[target].short[1]}寄信；等待回信约需${duration}个月。`);
 return {ok:true,duration};
}
function resolveInquiries(s){
 for(const letter of s.inquiries||[]){
  if(letter.status!=='pending')continue;
  letter.remaining=Math.max(0,letter.remaining-1);
  // The response is composed roughly halfway through the round trip. Its sealed
  // contents are simulation state and do not enter the sender's knowledge until
  // delivery; old pending saves already past this point are prepared on the next tick.
  if(!letter.sealed&&letter.remaining<=Math.floor((letter.duration||2)/2)){
   const roll=rnd(s),hostile=isWar(s,letter.actor,letter.target),rel=relation(s,letter.actor,letter.target);
   const sealed={status:'answered',year:s.year,month:s.month};
   if(roll<.18||!s.regions.some(r=>r.owner===letter.target)||(letter.target.endsWith('_claimant')&&(letter.targetGeneration??0)!==(s.world.dynasticGenerations?.[letter.target]||0)))sealed.status='no_reply';
   else if(letter.subject==='peace'&&!hostile)sealed.status='no_reply';
   else if(roll<(hostile?.65:rel<0?.46:.34)||letter.subject==='peace'&&estimatedStrength(s,letter.target,letter.actor)<strength(s,letter.target)*.6&&s.factions[letter.target].stability>35)sealed.status='refused';
   else{
   const current=s.world.leadership[letter.target]||[],opening=OPENING_LEADERS[letter.target]||[],claimants=s.world.claimants[letter.target]||[],subject=letter.subject||'leaders';
   const stated=hostile&&opening.some(id=>!current.includes(id))?opening:current;
   const plan=subject==='successor'?validSuccessionPlan(s,letter.target):null;
   const disclose=subject==='successor'&&!hostile&&rel>=30&&roll>=.75&&!claimants.length&&plan&&CHARACTER_CATALOG[plan];
   if(subject==='peace'){
    sealed.claim=['Peace accepted; the war has ended.','议和获接受；战争结束。'];
   }else if(subject==='successor'){
    sealed.claim=disclose?[`The court names ${CHARACTER_CATALOG[plan].name[0]} as a possible successor.`,`宫廷称${CHARACTER_CATALOG[plan].name[1]}为可能的继任人选。`]:['The reply did not name a successor.','回信没有指明继任人选。'];
    sealed.report={kind:'succession',value:disclose?plan:'unknown'};
   }else if(subject==='clashes'){
    const recent=!!s.world.disputes[letter.target]?.war||s.world.disputeHistory.some(e=>e.faction===letter.target&&['clashes','civil_war'].includes(e.outcome)&&(s.year-e.year)*12+s.month-e.month>=0&&(s.year-e.year)*12+s.month-e.month<=12);
    // Guarded courts may deny violence to conceal their weakness. Silence or a
    // denial is an official claim, never proof that the country is peaceful.
    const admit=recent&&!hostile&&rel>=30&&roll>=.75,deny=!admit&&(hostile||rel<0||!recent)&&roll>=.6;
    sealed.claim=admit?['The court acknowledges reports of local fighting.','宫廷承认有地方武装冲突的报告。']:deny?['The court denies reports of local fighting.','宫廷否认地方武装冲突的报告。']:['The court gives no clear answer about local fighting.','宫廷没有就地方武装冲突给出明确答复。'];
    sealed.report={kind:'clashes',value:admit?'reported':deny?'denied':'unknown'};
   }else if(subject==='availability'){
    // This is a court statement composed now, not a promise, a diagnosis or
    // proof that a particular person can be met when the letter arrives.
    const government=deriveGovernment(s,letter.target),reachable=government.acting.some(id=>{const c=s.world.characters[id];return c?.alive&&!c.missing&&!c.travel&&!['seriously_ill','dying','deceased'].includes(c.health)&&s.regions.some(r=>r.id===c.location&&r.owner===letter.target)&&!s.armies.some(a=>a.characterId===id&&a.move)});
    const open=!hostile&&rel>=0&&roll>=.65&&(reachable||claimants.length>0&&roll>=.85),value=open?'open':hostile||!reachable||claimants.length?'deferred':'unknown';
    sealed.claim=open?['The court invites a later request for an audience, without guaranteeing a meeting.','宫廷表示可另行请求会面，但不保证会见。']:value==='deferred'?['The court defers an audience request and makes no commitment.','宫廷暂缓会面请求，未作任何承诺。']:['The court has made no binding commitment to a meeting.','宫廷尚未就会面作出承诺。'];
    sealed.report={kind:'availability',value};
   }
   else if(subject==='representative'){
    // A cooperative court may name people who currently exercise authority.
    // A guarded or contested court gives no names; silence proves nothing.
    const government=deriveGovernment(s,letter.target),actors=government.acting.filter(id=>CHARACTER_CATALOG[id]);
    const reveal=!hostile&&!claimants.length&&rel>=0&&roll>=.65&&actors.length>0;
    if(reveal){const en=actors.map(id=>CHARACTER_CATALOG[id].name[0]).join(', '),zh=actors.map(id=>CHARACTER_CATALOG[id].name[1]).join('、');
     sealed.claim=[`The court names ${en} as exercising authority; negotiating powers remain unconfirmed.`,`宫廷称${zh}行使政务；谈判权限尚未确认。`];
     sealed.report={kind:'authority',value:{kind:government.kind,actors:[...actors]}};
    }else{sealed.claim=['An unnamed official may represent the court; no individual was named.','一名未具名官员可代表宫廷；回信没有指明具体人物。'];sealed.report={kind:'authority',value:'unknown'}}
   }
   else{sealed.claim=stated.length?[stated.map(id=>CHARACTER_CATALOG[id].name[0]).join(', '),stated.map(id=>CHARACTER_CATALOG[id].name[1]).join('、')]:['Authority uncertain','执政者不明'];sealed.report={kind:'leaders',leaders:[...stated],exhaustive:true}}
   }
   letter.sealed=sealed;
  }
  if(letter.remaining>0)continue;
  // A reply can be lost on its return journey, even if the court answered or
  // refused. The sender sees only silence, never the sealed contents. War at
  // delivery makes the return route riskier. Previously saved pending letters
  // use the same rule without changing their already-composed response.
  let reply=letter.sealed;
  if(reply.status!=='no_reply'&&rnd(s)<(isWar(s,letter.actor,letter.target) ? 0.18 : 0.08))reply={status:'no_reply'};
  // A provisional acceptance only takes effect when it reaches the sender.
  // Circumstances may change during the return journey.
  if(letter.subject==='peace'&&reply.status==='answered'&&!diplomacy(s,letter.actor,letter.target,'peace'))reply={status:'no_reply'};
  letter.status=reply.status;delete letter.sealed;
  if(reply.status==='no_reply'){if(letter.actor===s.player)log(s,`No reply has arrived from ${FACTIONS[letter.target].short[0]}; the letter or answer may have been lost.`,`来自${FACTIONS[letter.target].short[1]}的回信尚未到达；书信或回信可能遗失。`)}
  else if(reply.status==='refused'){if(letter.actor===s.player)log(s,letter.subject==='peace'?`A reply from ${FACTIONS[letter.target].short[0]} rejected the peace offer.`:`A reply from ${FACTIONS[letter.target].short[0]} declined to answer.`,letter.subject==='peace'?`${FACTIONS[letter.target].short[1]}回信拒绝议和。`:`${FACTIONS[letter.target].short[1]}回信表示不愿回答。`)}
  else{letter.claim=reply.claim;letter.responseYear=reply.year;letter.responseMonth=reply.month;letter.reportYear=s.year;letter.reportMonth=s.month;
   if(reply.report)addReport(s,letter.actor,letter.target,{...reply.report,source:'official',confidence:'unverified',reliability:'unknown',observationYear:reply.year,observationMonth:reply.month});
   if(letter.actor===s.player)log(s,`An unverified official response arrived from ${FACTIONS[letter.target].short[0]}.`,`收到${FACTIONS[letter.target].short[1]}的官方答复，内容尚未经独立核实。`);
  }
 }
}

export function resolveBattle(s,attacker,defender,target){
  const terrain={plain:1,hills:1.2,forest:1.12,urban:1.25,desert:1.06}[target.terrain];
  const supplyA=Math.min(1,Math.max(.65,s.factions[attacker.owner].food/20))*Math.min(1,Math.max(.7,region(s,attacker.region).supply*1000/Math.max(1,attacker.men)));
  const supplyD=Math.min(1,Math.max(.65,s.factions[defender.owner].food/20))*Math.min(1,Math.max(.7,target.supply*1000/Math.max(1,defender.men)));
  const stanceD=({defend:1.16,hold:1.09,guard:1.22})[defender.order?.kind]||1;
  linkCommanders(s);relieveIncapacitatedCommanders(s);const commandA=commandFactor(s,attacker),commandD=commandFactor(s,defender);
  const powerA=attacker.men*(.65+attacker.morale/200+attacker.skill*.055+attacker.experience*.025)*supplyA*commandA;
  const powerD=defender.men*(.65+defender.morale/200+defender.skill*.055+defender.experience*.025)*terrain*(1+target.fort*.12)*supplyD*commandD*stanceD;
  const roll=.85+rnd(s)*.3;
  const attackerWins=powerA*roll>powerD;
  if(attacker.characterId)recordLifeEvent(s,attacker.characterId,`${attackerWins?'Won':'Lost'} a battle at ${target.name[0]}.`,`在${target.name[1]}的战斗中${attackerWins?'获胜':'战败'}。`);
  if(defender.characterId)recordLifeEvent(s,defender.characterId,`${attackerWins?'Lost':'Won'} a battle at ${target.name[0]}.`,`在${target.name[1]}的战斗中${attackerWins?'战败':'获胜'}。`);
  const lossA=Math.min(attacker.men,Math.round(defender.men*(attackerWins?.19:.31)*(powerD/powerA)**.25));
  const lossD=Math.min(defender.men,Math.round(attacker.men*(attackerWins?.34:.19)*(powerA/powerD)**.25));
  s.nextBattle??=(s.battles?.length||0)+1;
  const report={id:`battle:${s.nextBattle++}`,year:s.year,month:s.month,region:target.id,attacker:{id:attacker.id,name:[...attacker.name],commander:[...attacker.commander],owner:attacker.owner,men:attacker.men,morale:attacker.morale,food:s.factions[attacker.owner].food,power:Math.round(powerA),supply:supplyA,command:commandA},defender:{id:defender.id,name:[...defender.name],commander:[...defender.commander],owner:defender.owner,men:defender.men,morale:defender.morale,food:s.factions[defender.owner].food,power:Math.round(powerD),supply:supplyD,command:commandD,stance:stanceD},terrain:target.terrain,fort:target.fort,roll,attackerWins,lossA,lossD};
  (s.battles ||= []).unshift(report);
  attacker.men-=lossA;defender.men-=lossD;for(const unit of [attacker,defender]){const person=s.world.characters[unit.characterId];if(person?.alive)person.battlesCommanded=(Number.isFinite(person.battlesCommanded)?person.battlesCommanded:0)+1}battlefieldWound(s,attacker);battlefieldWound(s,defender);
  attacker.morale=Math.max(20,attacker.morale+(attackerWins?7:-16));
  defender.morale=Math.max(20,defender.morale+(attackerWins?-16:7));
  if(attackerWins){
    defender.region=adjacent(target.id).map(e=>region(s,e.to)).find(r=>r.owner===defender.owner)?.id||target.id;
    if(defender.region===target.id)defender.men=0;
    const remaining=s.armies.some(other=>other.id!==attacker.id&&other.id!==defender.id&&other.men>0&&other.region===target.id&&!other.move&&isWar(s,attacker.owner,other.owner));
    if(!remaining){attacker.region=target.id;target.owner=attacker.owner;target.loyalty=38}
  } else {
    attacker.region=adjacent(target.id).map(e=>region(s,e.to)).find(r=>r.owner===attacker.owner)?.id||attacker.region;
  }
  report.ownerAfter=target.owner;report.attackerRemaining=attacker.men;report.defenderRemaining=defender.men;
  attacker.move=null;attacker.order=null;defender.order=defender.region===target.id?defender.order:null;attacker.experience=Math.min(5,attacker.experience+1);
  defender.experience=Math.min(5,defender.experience+1);
  if(attacker.owner===s.player||defender.owner===s.player){const ownLoss=attacker.owner===s.player?lossA:lossD,ownStart=attacker.owner===s.player?report.attacker.men:report.defender.men,capture=attackerWins&&target.owner===attacker.owner?` ${target.name[0]} is now under ${FACTIONS[target.owner].short[0]} control.`:'';log(s,`${FACTIONS[attacker.owner].short[0]} ${attackerWins?'won':'lost'} at ${target.name[0]}. Casualties: own ${ownLoss.toLocaleString()}; enemy unknown.${capture}${ownLoss>ownStart*.3?' Severe friendly losses.':''}`,`${FACTIONS[attacker.owner].short[1]}在${target.name[1]}${attackerWins?'获胜':'战败'}。己方伤亡：${ownLoss.toLocaleString()}；敌方伤亡未知。${capture?` ${target.name[1]}现由${FACTIONS[target.owner].short[1]}控制。`:''}${ownLoss>ownStart*.3?' 己方伤亡惨重。':''}`)}
  for(const lost of s.armies.filter(a=>a.men<=0&&a.characterId)){
    const person=s.world.characters[lost.characterId];if(!person||!person.alive)continue;person.location=null;person.missing={origin:target.id,remaining:3,year:s.year,month:s.month};
    if(lost.owner===s.player)log(s,`${CHARACTER_CATALOG[person.id].name[0]}'s location is unknown after the army was destroyed.`,`${CHARACTER_CATALOG[person.id].name[1]}的军队覆灭后，其位置不明。`);
  }
  s.armies=s.armies.filter(a=>a.men>0);
  return attackerWins;
}

function arrive(s,a){
  const target=region(s,a.move.to);
  observeArrival(s,a.owner,target.id);
  if(target.owner!==a.owner&&!isWar(s,a.owner,target.owner)){a.move=null;a.order=null;if(a.owner===s.player)log(s,`${a.name[0]} stopped: entry into ${target.name[0]} is no longer permitted.`,`${a.name[1]}停止行军：当前不能进入${target.name[1]}。`);return}
  const enemy=s.armies.find(other=>other.id!==a.id&&other.region===target.id&&other.owner!==a.owner&&isWar(s,a.owner,other.owner)&&!other.move);
  if(enemy){resolveBattle(s,a,enemy,target);return}
  a.region=target.id;a.move=null;a.order=null;
  if(target.owner!==a.owner){
    if(target.fort>0){a.siege={region:target.id,remaining:target.fort*2};if(a.owner===s.player||target.owner===s.player)log(s,`${a.name[0]} began a siege at ${target.name[0]}.`,`${a.name[1]}开始围攻${target.name[1]}。`)}
    else {const witnessed=a.owner===s.player||target.owner===s.player;target.owner=a.owner;target.loyalty=38;if(witnessed)log(s,`${FACTIONS[a.owner].short[0]} occupied ${target.name[0]}.`,`${FACTIONS[a.owner].short[1]}占领了${target.name[1]}。`)}
  }
}

function economy(s){
  for(const [id,f] of Object.entries(s.factions)){
    const owned=s.regions.filter(r=>r.owner===id);
    const offices=officeEffects(s,id);
    const troops=s.armies.filter(a=>a.owner===id).reduce((n,a)=>n+a.men,0);
    const rate={low:.65,normal:1,high:1.4}[f.tax];
    const difficulty=id===s.player?({hard:.9,expert:.8}[s.difficulty]||1):1;
    f.treasury+=Math.round(owned.reduce((n,r)=>n+r.tax*rate*(r.loyalty/100),0)*difficulty-troops/1100)+offices.treasury;
    f.food+=Math.round(owned.reduce((n,r)=>n+r.food,0)*difficulty-troops/1200-owned.length*2)+offices.food;
    f.stability=Math.min(100,f.stability+offices.stability);
    f.manpower+=owned.length*170;
    if(f.treasury<0){f.stability=Math.max(0,f.stability-3);s.armies.filter(a=>a.owner===id).forEach(a=>a.morale=Math.max(20,a.morale-4))}
    if(f.food<0){f.stability=Math.max(0,f.stability-3);s.armies.filter(a=>a.owner===id).forEach(a=>a.men=Math.max(1,Math.round(a.men*.96)))}
    f.treasury=Math.max(-100,Math.round(f.treasury));f.food=Math.max(-100,Math.round(f.food));
    owned.forEach(r=>{r.loyalty=Math.max(0,Math.min(100,r.loyalty+({low:1,normal:0,high:-2}[f.tax])+(f.food<0?-2:0)+governorLoyaltyEffect(s,r.id)))});
  }
}

function rebellion(s){
  const candidate=s.regions.find(r=>r.owner!=='rebels'&&r.loyalty<25&&s.factions[r.owner].stability<60&&!s.armies.some(a=>a.region===r.id&&a.owner===r.owner));
  if(!candidate)return;
  const previousOwner=candidate.owner;
  candidate.owner='rebels';candidate.loyalty=45;
  s.armies.push({id:`rebel${s.nextArmy++}`,name:['Provincial uprising','行省起义军'],owner:'rebels',region:candidate.id,men:2400,morale:59,skill:1,experience:0,commander:['Local leaders','地方首领'],move:null,siege:null});
  if(!isWar(s,'rebels',previousOwner))s.wars.push(['rebels',previousOwner]);
  if(previousOwner===s.player)log(s,`${candidate.name[0]} has risen in rebellion and formed an armed faction.`,`${candidate.name[1]}爆发叛乱，形成了武装派系。`);
}

function shortestStep(s,start,goal,owner){
  const queue=[[start,null]],seen=new Set([start]);
  while(queue.length){const [id,first]=queue.shift();if(id===goal)return first;
    for(const e of adjacent(id)){if(seen.has(e.to))continue;const controller=reportedControl(s,owner,e.to)?.owner;if(controller&&controller!==owner&&!isWar(s,owner,controller))continue;seen.add(e.to);queue.push([e.to,first||e.to])}}
  return null;
}

// AI uses its own reports and approximate sightings, never the real enemy roster.
// After two years, a numerical report fades gradually toward an uncertain prior.
export function estimatedStrength(s,observer,target){
 const k=s.knowledge?.[observer]?.[target],now=s.year*12+s.month,age=x=>now-((x.observationYear??x.year)*12+(x.observationMonth??x.month));
 const sightings=Object.values(k?.sightings||{}).filter(x=>age(x)>=0&&age(x)<=24).length,prior=4000+Math.min(5,sightings)*1000;
 const reports=(k?.reports||[]).filter(x=>x.kind==='strength'&&Number.isFinite(x.value)&&x.value>=0&&age(x)>=0).sort((a,b)=>age(a)-age(b));
 if(!reports.length)return prior;
 // Compare only observations from the newest month. Forwarded copies from the
 // same source family must not outvote independent contradictory evidence.
 const newestAge=age(reports[0]),families=new Map();
 for(const report of reports.filter(x=>age(x)===newestAge)){
  const origin=report.originSource||report.source, family=({official:'court',envoy:'court',audience:'court',exchange:'unknown'}[origin]||origin||'unknown');
  const values=families.get(family)||new Set();values.add(report.value);families.set(family,values);
 }
 const estimates=[...families.values()].map(values=>{const entries=[...values];return (Math.min(...entries)+Math.max(...entries))/2});
 const estimate=estimates.reduce((sum,value)=>sum+value,0)/estimates.length;
 const weight=Math.max(0,Math.min(1,1-(newestAge-24)/24));return Math.round(prior+(estimate-prior)*weight);
}
// Choose from this faction's own recent reports; a forwarded copy does not
// create another independent source. Missing names do not prove absence.
export function aiClaimantChoice(s,actor,target){
 const now=s.year*12+s.month,families=new Map();
 for(const report of s.knowledge?.[actor]?.[target]?.reports||[]){
  if(report.kind!=='claimants'||!Array.isArray(report.leaders))continue;
  const age=now-((report.observationYear??report.year)*12+(report.observationMonth??report.month));if(!Number.isFinite(age)||age<0||age>24)continue;
  const ids=report.leaders.filter(id=>CHARACTER_CATALOG[id]?.faction===target);if(!ids.length)continue;
  const origin=report.originSource||report.source,family=({official:'court',envoy:'court',audience:'court',exchange:'unknown'}[origin]||origin||'unknown'),old=families.get(family);
  if(!old||age<old.age)families.set(family,{age,ids:new Set(ids)});else if(age===old.age)for(const id of ids)old.ids.add(id);
 }
 const scores=new Map();for(const {age,ids} of families.values())for(const id of ids)scores.set(id,(scores.get(id)||0)+(25-age)/25);
 return [...scores].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0]||null;
}

function aiTurn(s,owner){
  const f=s.factions[owner],owned=s.regions.filter(r=>r.owner===owner);
  const internalOpponent=other=>Object.entries(s.world.disputes||{}).some(([parent,d])=>d.war&&[parent,d.war.rival].includes(owner)&&[parent,d.war.rival].includes(other));
  // A defeated government may still have a field army outside its last
  // theater; it must be able to continue the dynastic campaign.
  if(!owned.length&&!s.wars.some(w=>w.includes(owner)))return;
  const reportedNeighbors=()=>owned.flatMap(r=>adjacent(r.id).map(e=>({id:e.to,owner:reportedControl(s,owner,e.to)?.owner}))).filter(r=>r.owner);
  const enemies=s.regions.filter(r=>isWar(s,owner,reportedControl(s,owner,r.id)?.owner));
  const available=s.armies.filter(a=>a.owner===owner&&!a.move&&!a.siege&&a.men>1200);
  for(const a of available){
    const here=region(s,a.region),neighbors=adjacent(a.region).map(e=>region(s,e.to)).filter(Boolean);
    const threatened=neighbors.filter(r=>isWar(s,owner,reportedControl(s,owner,r.id)?.owner));
    const estimate=r=>{const rival=reportedControl(s,owner,r.id)?.owner;return rival&&isWar(s,owner,rival)?estimatedStrength(s,owner,rival)/Math.max(1,s.regions.filter(x=>reportedControl(s,owner,x.id)?.owner===rival).length):0};
    const ownSupport=neighbors.filter(r=>r.owner===owner).reduce((sum,r)=>sum+s.armies.filter(b=>b.owner===owner&&b.region===r.id&&!b.move&&b.id!==a.id).reduce((n,b)=>n+b.men,0),0);
    if(['caesar','senate'].includes(owner)&&threatened.some(r=>estimate(r)>a.men*1.7)&&a.morale<48){const safe=neighbors.filter(r=>r.owner===owner).sort((x,y)=>y.supply-x.supply)[0];if(safe&&issueMilitaryOrder(s,a.id,'retreat',safe.id,owner).ok)continue}
    if(['caesar','senate'].includes(owner)&&here.owner===owner&&threatened.length&&here.supply*1000<a.men*.75){const safe=neighbors.filter(r=>r.owner===owner&&r.supply>here.supply).sort((x,y)=>y.supply-x.supply)[0];if(safe&&issueMilitaryOrder(s,a.id,'move',safe.id,owner).ok)continue}
    if(['caesar','senate'].includes(owner)&&here.owner===owner&&threatened.length&&threatened.every(r=>estimate(r)>a.men*1.25)){
      const support=neighbors.find(r=>r.owner===owner&&s.armies.some(b=>b.owner===owner&&b.region===r.id&&b.id!==a.id&&!b.move));
      if(support&&issueMilitaryOrder(s,a.id,'move',support.id,owner).ok)continue;
      issueMilitaryOrder(s,a.id,here.fort||here.tax>=7?'guard':'defend',null,owner);continue;
    }
    const targets=enemies.map(r=>({r,d:Math.hypot(r.x-region(s,a.region).x,r.y-region(s,a.region).y)})).sort((x,y)=>x.d-y.d);
    for(const {r} of targets){const step=shortestStep(s,a.region,r.id,owner);if(step&&step!==a.region){const defenderOwner=reportedControl(s,owner,step)?.owner;const defenders=isWar(s,owner,defenderOwner)?estimatedStrength(s,owner,defenderOwner)/Math.max(1,s.regions.filter(x=>reportedControl(s,owner,x.id)?.owner===defenderOwner).length):0;if(defenders>a.men*(internalOpponent(defenderOwner)?2:({hard:1.15,expert:1.05}[s.difficulty]||1.35))||f.food<0)continue;issueMilitaryOrder(s,a.id,defenders?'attack':'move',step,owner);break}}
  }
  if(f.treasury>65&&f.manpower>5500&&s.month%4===0){
    const border=owned.find(r=>adjacent(r.id).some(e=>isWar(s,owner,reportedControl(s,owner,e.to)?.owner)));
    if(border)recruit(s,border.id,owner);
  }
  if(f.stability<45&&f.treasury>25){f.treasury-=10;f.stability+=3}
  // A faction may write about its own captured personnel, without exposing a
  // letter to the player until its outward journey reaches the holder.
  if(owner!=='rebels'&&s.month%6===3&&f.treasury>35){
    const captive=s.world.captives.find(c=>c.owner===owner&&c.holder===s.player&&c.state==='held'&&!s.releaseRequests.some(r=>r.captiveId===c.id&&((s.year-r.year)*12+s.month-r.month<12)));
    if(captive)requestAgentRelease(s,owner,captive.id);
  }
  if(['caesar','senate'].includes(owner)&&s.month===2&&f.treasury>40&&s.wars.some(w=>w.includes(owner)))queueMission(s,owner,owner,'counter','counter_spies');
  if(owner!=='rebels' && s.month===8 && f.treasury>=25){const enemy=s.wars.find(w=>w.includes(owner))?.find(x=>x!==owner);if(enemy&&enemy!=='rebels')queueMission(s,owner,enemy,'spy','strength')}
  // Rival Roman commands investigate and act on their own reports, not on the
  // concealed state of the Egyptian court. An old report may lead nowhere.
  if(['caesar','senate'].includes(owner)&&s.month===6&&f.treasury>45)queueMission(s,owner,'egypt','spy','claimants');
  if(['caesar','senate'].includes(owner)&&s.month===9&&f.treasury>45)queueMission(s,owner,'parthia','spy','claimants');
  if(['caesar','senate'].includes(owner)&&s.month===10&&f.treasury>45)for(const court of ['egypt','parthia'])if(canMediate(s,owner,court)){requestMediation(s,owner,court);break}
  if(['caesar','senate'].includes(owner)&&s.month===12){for(const court of ['egypt','parthia']){if(f.treasury<=35)break;const claimant=aiClaimantChoice(s,owner,court);if(claimant)supportClaimant(s,owner,court,claimant)}}
  if(owner!=='rebels' && s.month===12){
    const enemy=s.wars.find(w=>w.includes(owner))?.find(x=>x!==owner);
    const internal=internalOpponent(enemy);
    if(enemy && !internal && (f.food<0||f.treasury<0||f.stability<35) && strength(s,owner)>=estimatedStrength(s,owner,enemy)*.6)sendInquiry(s,owner,enemy,'peace');
    if(!enemy && f.treasury>35){const neighbor=reportedNeighbors().find(r=>r.owner!==owner&&r.owner!=='rebels'&&relation(s,owner,r.owner)>=0&&!isAllied(s,owner,r.owner));if(neighbor && rnd(s)<.2)diplomacy(s,owner,neighbor.owner,'improve')}
  }
  if(owner!=='rebels' && s.month%6===0 && f.treasury>40 && f.food>10 && strength(s,owner)>2000){
    const border=reportedNeighbors().find(r=>r.owner!==owner&&r.owner!=='rebels'&&!isWar(s,owner,r.owner)&&!isAllied(s,owner,r.owner)&&strength(s,owner)>estimatedStrength(s,owner,r.owner)*1.5&&relation(s,owner,r.owner)<0);
    if(border&&rnd(s)<.18)diplomacy(s,owner,border.owner,'war');
  }
}

// A defeated rival must lose both its territories and its field forces. The
// simulated outcome is not announced until a courier has had time to arrive.
export function advanceRomanVictory(s){
 if(!['caesar','senate'].includes(s.player)||s.victory)return;
 const opponent=s.player==='caesar'?'senate':'caesar',survives=s.regions.some(r=>r.owner===opponent)||s.armies.some(a=>a.owner===opponent&&a.men>0),ownSurvives=s.regions.some(r=>r.owner===s.player)||s.armies.some(a=>a.owner===s.player&&a.men>0);
 if(survives||!ownSurvives||!isWar(s,s.player,opponent)){delete s.world.romanVictoryNotice;return}
 let notice=s.world.romanVictoryNotice;if(!notice||notice.opponent!==opponent){s.world.romanVictoryNotice={opponent,remaining:3};return}
 if(--notice.remaining>0)return;delete s.world.romanVictoryNotice;s.victory=true;s.victor=s.player;
 log(s,'A dispatch reports the opposing Roman command has collapsed. The campaign continues.','信使报告敌对罗马指挥方已瓦解；战役仍可继续。');
}

export function tick(s){
  initializeWorld(s);linkCommanders(s);relieveIncapacitatedCommanders(s);
  const chronicleBefore=captureCampaignState(s);
  s.month++;if(s.month>12){s.month=1;s.year++}
  refreshReportConfidence(s);
  advanceOffices(s);economy(s);
  // Travel and sieges resolve before new AI orders.
  for(const a of [...s.armies]){
    if(!s.armies.includes(a))continue;
    if(a.move){a.move.remaining--;if(a.move.remaining<=0)arrive(s,a)}
    else if(a.siege){a.siege.remaining--;if(a.siege.remaining<=0){const r=region(s,a.siege.region),witnessed=a.owner===s.player||r.owner===s.player;r.owner=a.owner;r.loyalty=36;a.siege=null;if(witnessed)log(s,`${r.name[0]} surrendered after a siege.`,`${r.name[1]}在围攻后投降。`)}}
  }
  rebellion(s);
  resolveInquiries(s);advanceOperations(s);advanceAgentRequests(s);advanceCharacters(s);advanceDynasties(s);relieveIncapacitatedCommanders(s);advanceMissingCommanders(s);resolveDynasticWars(s);advanceMediations(s);advanceDisputes(s);advanceConspiracies(s);advanceGovernments(s);linkCommanders(s);advancePersonalDiplomacy(s);
  advanceControlScouts(s);observeArmies(s);observeControl(s);
  for(const owner of Object.keys(s.factions).filter(id=>id!==s.player))aiTurn(s,owner);
  advanceRomanVictory(s);
  recordCampaignTurn(s,chronicleBefore);
  return s;
}
