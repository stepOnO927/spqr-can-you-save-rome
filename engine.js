import {advancePersonalDiplomacy,personalDiplomaticCredit} from './personal-diplomacy.js?v=varus-portrait-1';
import {initializeGovernments,advanceGovernments,deriveGovernment,validSuccessionPlan} from './governance.js?v=safe-save-1';
import {REGIONS, ROUTES, FACTIONS, INITIAL_ARMIES} from './data.js?v=phase-x-1';
import {initializeWorld,OPENING_LEADERS,CHARACTER_CATALOG,snapshotFictionalCatalog,restoreFictionalCatalog} from './characters.js?v=safe-save-1';
import {queueMission,advanceOperations,advanceAgentRequests,requestAgentRelease,advanceCharacters,advanceMissingCommanders,advanceDisputes,battlefieldWound,commandFactor,linkCommanders,relieveIncapacitatedCommanders,publicLeaderClaim,addReport,observeArmies,supportClaimant,refreshReportConfidence,reportedHealthSubjects,claimantRepresentatives} from './character-system.js?v=succession-feedback-1';
import {advanceOffices,officeEffects,governorLoyaltyEffect} from './office-system.js?v=safe-save-1';
import {advanceConspiracies} from './conspiracies.js?v=safe-save-1';
import {initializeControlKnowledge,observeControl,advanceControlScouts,reportedControl,observeArrival} from './control-intelligence.js?v=phase-x-1';
import {resolveDynasticWars,canMediate,requestMediation,advanceMediations} from './civil-war.js?v=safe-save-1';
import {initializeDynasties,seedOpeningFictionalHouseholds,seedHanCommanders,seedHanFrontierPeople,advanceDynasties,createDisputedHeirScenario,recordLifeEvent} from './dynasties.js?v=safe-save-1';
import {initializeChronicle,captureCampaignState,recordCampaignTurn} from './chronicle.js?v=succession-feedback-1';
import {evaluateStrategicPlan,assessAttack,strategicPersonality,observeAttackPattern} from './strategic-planning.js?v=multipolar-2';
import {advancePersonalPlans} from './personal-plans.js?v=multipolar-2';
import {initializeInventions,advanceInventions,aiInnovation,activeModifiers as inventionModifiers,buildingModifiers} from './inventions.js?v=grand-chessboard-2';
import {advanceFocuses,focusModifiers} from './national-focus.js?v=safe-save-1';
import {seedTemplates,formationCombatFactor,formationMarchDelta,formationSiegeReduction,formationUpkeepDelta,observeFormationRecon,advanceReorganizations,aiDesignFormations,aiRecruitFormation,aiReorganize,advanceCommandInfluence} from './legion-designer.js?v=safe-save-1';
import {advanceBattlePlans,aiBattlePlans,planControlled} from './battle-plans.js?v=safe-save-1';
// IMPERIUM systems are on by default. A scenario or an isolated legacy test may set
// world.imperium.enabled=false to run the pre-expansion AI unchanged.
const imperiumOn=s=>s.world?.imperium?.enabled!==false;
// IMPERIUM: completed national focuses add to the same modifier table as policies.
const activeModifiers=(s,id)=>{const out={...inventionModifiers(s,id)};for(const [k,v] of Object.entries(focusModifiers(s,id)))out[k]=(out[k]||0)+v;return out};
import {initializeAgreements,activeAgreement,advanceAgreements,proposeAgreement,terminateAgreement,fullAllianceTerms} from './agreements.js?v=grand-chessboard-2';
import {assessOpportunities} from './multipolar.js?v=multipolar-2';
import {advanceStrategicWarnings} from './strategic-warnings.js?v=multipolar-2';
import {rememberPoliticalEvent} from './political-memory.js?v=grand-chessboard-2';
import {formCoalition,advanceCoalitions,coalitionInterest,coalitionMilitaryObjective,observeBalanceOfPower} from './coalitions.js?v=multipolar-2';
import {offerPoliticalContact,advancePoliticalContacts} from './political-contacts.js?v=safe-save-1';
import {initializeReligion,advanceReligion,populationFactor,religiousTaxCost,religiousPolicy} from './religion.js?v=safe-save-1';
import {initializeMovements,advanceMovements,reportedMovements,offerMovementSupport,recognizeMovement} from './movements.js?v=safe-save-1';
import {initializeDiplomaticKnowledge,observeDiplomacy,reportedDiplomacy} from './diplomatic-knowledge.js?v=multipolar-2';
export {queueMission};
export {personalDiplomaticCredit};

const clone = value => JSON.parse(JSON.stringify(value));
export const region = (s,id) => s.regions.find(r=>r.id===id);
export const army = (s,id) => s.armies.find(a=>a.id===id);
export const adjacent = (id) => ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>({to:r[0]===id?r[1]:r[0],sea:r[2]==='sea',frontier:r[2]==='frontier'}));
const rnd = s => {s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296};
// Strategic deliberation gets a deterministic per-actor stream so considering
// an opportunity does not consume a courier, battle or disease random roll.
const strategicRoll=(s,actor,salt)=>{let h=(s.seed^(s.year*37+s.month*101)^salt)>>>0;for(const c of actor)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x7feb352d)>>>0;h^=h>>>15;return (h>>>0)/4294967296};
const log = (s,en,zh,meta={}) => {s.log.unshift({month:s.month,year:s.year,en,zh,...meta});s.log=s.log.slice(0,80)};
export const isWar = (s,a,b) => a!==b && s.wars.some(w=>w.includes(a)&&w.includes(b));
export const PLAYABLE = ['caesar','senate','egypt','numidia','mauretania','armenia','parthia','galatia','bosporus','han'];
const pair = (a,b) => [a,b].sort().join(':');
export const relation = (s,a,b) => s.relations[pair(a,b)] ?? 0;
export const isAllied = (s,a,b) => s.alliances.some(p=>p.includes(a)&&p.includes(b));
const strength = (s,id) => s.armies.filter(a=>a.owner===id).reduce((v,a)=>v+a.men,0);

export function newGame(player='caesar'){
  if(!PLAYABLE.includes(player))throw new Error('Invalid playable faction');
  const s=initializeWorld({version:3,chronicleVisibilityVersion:1,seed:49049,year:-49,month:1,mode:'historical',player,relations:{'caesar:numidia':-30,'caesar:mauretania':20,'caesar:parthia':-10,'numidia:senate':25,'galatia:senate':25,...(player==='han'?{'han:shanshan':35}:{})},alliances:[],
    regions:clone(REGIONS.filter(r=>player==='han'||!['han','shanshan'].includes(r.owner))),armies:clone(INITIAL_ARMIES.filter(a=>player==='han'||!['han','shanshan'].includes(a.owner))).map(a=>({...a,move:null,siege:null})),
    factions:{
      caesar:{treasury:90,food:65,manpower:22000,stability:58,legitimacy:49,tax:'normal',research:0},
      senate:{treasury:135,food:100,manpower:34000,stability:57,legitimacy:68,tax:'normal',research:0},
      egypt:{treasury:85,food:90,manpower:9000,stability:64,legitimacy:60,tax:'normal',research:0},
      ...(player==='han'?{han:{treasury:260,food:180,manpower:48000,stability:67,legitimacy:76,tax:'normal',research:0},shanshan:{treasury:35,food:45,manpower:3000,stability:58,legitimacy:55,tax:'normal',research:0}}:{}),
      ...Object.fromEntries(['numidia','mauretania','armenia','parthia','galatia','bosporus'].map(id=>[id,{treasury:60,food:60,manpower:9000,stability:65,legitimacy:60,tax:'normal',research:0}])),
      rebels:{treasury:10,food:15,manpower:0,stability:50,legitimacy:0,tax:'normal',research:0}
    },wars:[['caesar','senate']],log:[],victory:false,nextArmy:1});
  // A new campaign starts with frontier observations, not every foreign army's
  // exact opening location. Existing saves keep their accumulated sightings.
  for(const targets of Object.values(s.knowledge))for(const knowledge of Object.values(targets))knowledge.sightings={};
  linkCommanders(s);observeArmies(s);observeControl(s);initializeDynasties(s);seedOpeningFictionalHouseholds(s);seedHanCommanders(s);seedHanFrontierPeople(s);initializeReligion(s);initializeMovements(s);initializeDiplomaticKnowledge(s);initializeChronicle(s);initializeAgreements(s);initializeInventions(s);migrateImperium(s);return initializeGovernments(s);
}

export function newDynastyScenario(){const s=newGame('egypt');createDisputedHeirScenario(s);return s}

// Add newly modeled courts to older campaigns without resetting existing people or territory.
function migrateRegionalPowers(s){
 initializeWorld(s);const added=[];for(const id of ['galatia','bosporus']){if(s.factions[id])continue;added.push(id);s.factions[id]={treasury:60,food:60,manpower:9000,stability:65,legitimacy:60,tax:'normal',research:0};if(!s.regions.some(r=>r.id===id))s.regions.push(clone(REGIONS.find(r=>r.id===id)));if(!s.armies.some(a=>a.id===id+'army'))s.armies.push({...clone(INITIAL_ARMIES.find(a=>a.id===id+'army')),move:null,siege:null});const leader=OPENING_LEADERS[id][0],person=s.world.characters[leader];s.world.leadership[id]=person?.alive?[leader]:[];if(person&&person.faction==null){person.faction=id;if(person.location==null&&!person.missing)person.location=id}}
 if(added.length){for(const actor of Object.keys(s.factions)){s.knowledge[actor]||={};for(const target of Object.keys(s.factions)){if(!s.knowledge[actor][target])s.knowledge[actor][target]={reportedLeaders:clone(OPENING_LEADERS[target]||[]),reports:[],sightings:{}}}}if(added.includes('galatia')&&s.relations['galatia:senate']===undefined)s.relations['galatia:senate']=25}
}
// Add an independent neighboring court to existing Han saves without changing
// their four Han theaters, armies, treasury, wars or accumulated intelligence.
function migrateHanFrontier(s){
 if(s.player!=='han'||s.factions.shanshan)return;
 s.factions.shanshan={treasury:35,food:45,manpower:3000,stability:58,legitimacy:55,tax:'normal',research:0};
 if(!s.regions.some(r=>r.id==='shanshanOasis'))s.regions.push(clone(REGIONS.find(r=>r.id==='shanshanOasis')));
 if(!s.armies.some(a=>a.id==='shanshanGuard'))s.armies.push({...clone(INITIAL_ARMIES.find(a=>a.id==='shanshanGuard')),move:null,siege:null});
 if(s.relations['han:shanshan']===undefined)s.relations['han:shanshan']=35;
 initializeWorld(s);s.world.leadership.shanshan||=[];
 for(const actor of Object.keys(s.factions)){s.knowledge[actor]||={};for(const target of Object.keys(s.factions))s.knowledge[actor][target]||={reportedLeaders:[],reports:[],sightings:{}}}
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
  // If an earlier save already carries population, divide its existing
  // people between theaters rather than inventing a second population.
  if(Number.isFinite(parent.population)){next.population=Math.floor(parent.population/3);parent.population-=next.population}
  else if(parent.population&&Number.isFinite(parent.population.total)){next.population=clone(parent.population);next.population.total=Math.floor(parent.population.total/3);parent.population.total-=next.population.total;if(Number.isFinite(parent.population.baseline)){next.population.baseline=Math.floor(parent.population.baseline/3);parent.population.baseline-=next.population.baseline}}
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
// IMPERIUM save migration: adds empty focus/plan records and preset templates only.
function migrateImperium(s){s.world.nationalFocus||={};s.world.battlePlans||=[];s.world.nextBattlePlan||=1;for(const id of Object.keys(s.factions))if(id!=='rebels')seedTemplates(s,id);s.world.imperiumVersion=1}
export function upgradeSave(s){
 const priorCatalog=snapshotFictionalCatalog();
 try{
 if(s.version===2){const old=s.relations||{},oldAllies=s.alliances||[];s.relations=Object.fromEntries(Object.entries(old).map(([id,value])=>[pair('caesar',id),value]));s.alliances=oldAllies.map(id=>['caesar',id]);s.version=3}
 if(s.version!==3)throw new Error('Unsupported save');
 if(!s.chronicleVisibilityVersion){for(const event of s.log||[])event.legacyUnverified=true;s.chronicleVisibilityVersion=1}
 migrateRegionalPowers(s);migrateEasternTheaters(s);migrateHanFrontier(s);initializeDynasties(s);seedHanCommanders(s);seedHanFrontierPeople(s);initializeReligion(s);initializeMovements(s);initializeDiplomaticKnowledge(s);initializeControlKnowledge(s);initializeChronicle(s);initializeAgreements(s);initializeInventions(s);migrateImperium(s);migrateBattleIds(s);return refreshReportConfidence(initializeGovernments(s));
 }catch(error){restoreFictionalCatalog(priorCatalog);throw error}
}

export function previewMarch(s,armyId,destination){
  const a=army(s,armyId); const target=region(s,destination);
  if(!a||!target||a.men<=0||a.move||a.siege)return {ok:false,reason:'unavailable'};
  if(a.reorg)return {ok:false,reason:'reorganizing'};
  const link=adjacent(a.region).find(e=>e.to===destination);
  if(!link)return {ok:false,reason:'adjacent'};
  const report=reportedControl(s,a.owner,destination),reportedOwner=report?.owner;
  if(reportedOwner&&reportedOwner!==a.owner&&!isWar(s,a.owner,reportedOwner)&&!activeAgreement(s,a.owner,reportedOwner,'military_access'))return {ok:false,reason:'peace'};
  const faction=s.factions[a.owner];
  const seaCost=Math.max(2,8+(activeModifiers(s,a.owner).seaCost||0));
  if(link.sea&&faction.treasury<seaCost)return {ok:false,reason:'transport'};
  const frontierCost=link.frontier?{food:8,treasury:6}:{food:0,treasury:0};
  if(faction.food<frontierCost.food)return {ok:false,reason:'supply'};
  if(faction.treasury<frontierCost.treasury)return {ok:false,reason:'transport'};
  const routeWorks=buildingModifiers(region(s,a.region)).march||0,doctrine=activeModifiers(s,a.owner).march||0;
  const months=Math.max(1,(link.sea?3:1)+(link.frontier?2:0)+(target.terrain==='hills'?1:0)+(target.terrain==='desert'?1:0)-routeWorks-doctrine+formationMarchDelta(s,a,link,target.terrain));
  return {ok:true,months,seaCost,frontierCost,sea:!!link.sea,frontier:!!link.frontier,terrain:target.terrain,hostile:!!reportedOwner&&isWar(s,a.owner,reportedOwner),reportedOwner:reportedOwner||null,controlReport:report,food:faction.food,supply:target.supply};
}

export function moveArmy(s,armyId,destination){
  const estimate=previewMarch(s,armyId,destination);
  if(!estimate.ok)return estimate;
  const a=army(s,armyId),target=region(s,destination),link=adjacent(a.region).find(e=>e.to===destination);
  if(link.sea)s.factions[a.owner].treasury-=estimate.seaCost;
  if(link.frontier){s.factions[a.owner].treasury-=estimate.frontierCost.treasury;s.factions[a.owner].food-=estimate.frontierCost.food}
  const months=estimate.months;
  a.move={to:destination,remaining:months,sea:link.sea,frontier:!!link.frontier};
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
  s.armies.push({id,name:roman?['Newly raised legion','新编军团']:['Newly raised forces','新征召军队'],owner,region:regionId,men:3000,morale:58+(buildingModifiers(r).recruit||0)*4,skill:1,experience:0,commander:['Unnamed officer','未具名军官'],move:null,siege:null});
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

export function diplomacy(s, actor, target, action, options={}){
  if(actor===target || !s.factions[actor] || !s.factions[target] || target==='rebels'||actor==='rebels' || !s.regions.some(r=>r.owner===actor) || !s.regions.some(r=>r.owner===target))return false;
  const key=pair(actor,target);
  if(action==='improve' && !isWar(s,actor,target) && s.factions[actor].treasury>=10){s.factions[actor].treasury-=10;s.relations[key]=Math.min(100,relation(s,actor,target)+15);if(actor===s.player||target===s.player)log(s,`${FACTIONS[actor].short[0]} improved relations with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}改善了与${FACTIONS[target].short[1]}的关系。`,{other:actor===s.player?target:actor});return true}
  if(action==='alliance' && !isWar(s,actor,target) && relation(s,actor,target)+personalDiplomaticCredit(s,actor,target)>=30 && !isAllied(s,actor,target) && !s.wars.some(w=>(w.includes(actor)&&isAllied(s,target,w.find(x=>x!==actor)))||(w.includes(target)&&isAllied(s,actor,w.find(x=>x!==target))))){s.alliances.push([actor,target,fullAllianceTerms(s)]);rememberPoliticalEvent(s,target,actor,'negotiated_agreement',2);if(actor===s.player||target===s.player)log(s,`${FACTIONS[actor].short[0]} allied with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}与${FACTIONS[target].short[1]}结盟。`,{other:actor===s.player?target:actor});return true}
  if(action==='break' && isAllied(s,actor,target)){const prior=s.alliances.find(p=>p.includes(actor)&&p.includes(target)),terms=prior[2]||fullAllianceTerms(s,{legacy:true});(s.world.allianceHistory||=[]).push({parties:prior.slice(0,2),terms,ended:{year:s.year,month:s.month,actor},outcome:'breached'});s.alliances=s.alliances.filter(p=>!(p.includes(actor)&&p.includes(target)));s.relations[key]=relation(s,actor,target)-20;s.diplomaticCredibility||={};s.diplomaticCredibility[actor]=Math.max(0,(s.diplomaticCredibility[actor]??100)-terms.breachPenalty);rememberPoliticalEvent(s,target,actor,'broken_treaty',-12);if(actor===s.player||target===s.player)log(s,`${FACTIONS[actor].short[0]} broke its alliance with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}解除了与${FACTIONS[target].short[1]}的同盟。`,{other:actor===s.player?target:actor});return true}
  if(action==='war' && !isWar(s,actor,target)){
    if(isAllied(s,actor,target)||activeAgreement(s,actor,target,'non_aggression'))return false;
    const playerWarsBefore=new Set(s.wars.filter(w=>w.includes(s.player)).map(w=>w.find(id=>id!==s.player)));
    s.wars.push([actor,target]);
    for(const p of s.alliances.filter(p=>p.includes(target))){const ally=p.find(x=>x!==target);if(ally!==actor&&!isWar(s,ally,actor)&&!isAllied(s,ally,actor)&&!activeAgreement(s,ally,actor,'non_aggression'))s.wars.push([ally,actor])}
    for(const p of s.alliances.filter(p=>p.includes(actor))){const ally=p.find(x=>x!==actor);if(ally!==target&&!isWar(s,ally,target)&&!isAllied(s,ally,target)&&!activeAgreement(s,ally,target,'non_aggression'))s.wars.push([ally,target])}
    for(const treaty of s.agreements||[]){
      if(treaty.status!=='active'||!['defensive','offensive','guarantee'].includes(treaty.type))continue;
      const supported=treaty.type==='offensive'?actor:target,opponent=treaty.type==='offensive'?target:actor;
      if(!treaty.parties.includes(supported)||!activeAgreement(s,treaty.parties[0],treaty.parties[1],treaty.type))continue;
      if(treaty.type==='guarantee'&&supported!==(treaty.terms?.recipient||treaty.parties[1]))continue;
      const ally=treaty.parties.find(x=>x!==supported);
      if(ally!==opponent&&!isWar(s,ally,opponent)&&!isAllied(s,ally,opponent)&&!activeAgreement(s,ally,opponent,'non_aggression'))s.wars.push([ally,opponent]);
    }
    for(const coalition of s.coalitions||[]){
      if(coalition.status!=='active'||coalition.target!==actor||!coalition.parties.includes(target))continue;
      for(const member of coalition.parties)if(s.factions[member]&&member!==target&&!isWar(s,member,actor)&&!isAllied(s,member,actor)&&!activeAgreement(s,member,actor,'non_aggression'))s.wars.push([member,actor]);
    }
    s.relations[key]=-60;
    s.factions[actor].legitimacy=Math.max(0,s.factions[actor].legitimacy-5);
    if(actor===s.player||target===s.player)log(s,`${FACTIONS[actor].short[0]} declared war on ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}向${FACTIONS[target].short[1]}宣战。`,{other:actor===s.player?target:actor});
    else for(const enemy of s.wars.filter(w=>w.includes(s.player)).map(w=>w.find(id=>id!==s.player)).filter(id=>!playerWarsBefore.has(id))){log(s,`An alliance has brought your faction into war with ${FACTIONS[enemy].short[0]}.`,`同盟义务使本方与${FACTIONS[enemy].short[1]}进入战争。`)}
    return true;
  }
  if(action==='peace' && isWar(s,actor,target)){
    // The responding government knows its own forces, but judges the sender by its reports.
    if(!options.acceptedByPlayer && estimatedStrength(s,target,actor)<strength(s,target)*Math.max(.35,.6-(activeModifiers(s,actor).pressure||0)/100) && s.factions[target].stability>35)return false;
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

// AI-to-AI coordination is a letter, not an order. The sender knows its own
// war and contacts; the recipient later evaluates the request using its own
// resources and intelligence. The human cannot be committed by an AI offer.
export function sendStrategicOffer(s,actor,recipient,target,{autoplayPlayer=false}={}){
 if(!s.factions[actor]||!s.factions[recipient]||!s.factions[target]||new Set([actor,recipient,target]).size!==3||[actor,recipient,target].includes('rebels')||!isWar(s,actor,target))return {ok:false,reason:'unavailable'};
 if(!autoplayPlayer&&(actor===s.player||recipient===s.player))return {ok:false,reason:'player_decision'};
 const owned=s.regions.filter(r=>r.owner===actor),frontier=owned.some(r=>adjacent(r.id).some(e=>reportedControl(s,actor,e.to)?.owner===recipient)),docs=reportedDiplomacy(s,actor),contact=docs.some(x=>x.status==='active'&&x.parties.includes(actor)&&x.parties.includes(recipient));
 if(!frontier&&!contact)return {ok:false,reason:'contact'};
 if(s.factions[actor].treasury<5)return {ok:false,reason:'treasury'};
 const date=s.year*12+s.month,offers=s.world.strategicOffers||=[];
 if(offers.some(o=>o.actor===actor&&o.recipient===recipient&&o.target===target&&date-(o.year*12+o.month)<18)||offers.filter(o=>o.actor===actor&&o.status==='pending').length>=3)return {ok:false,reason:'pending'};
 s.factions[actor].treasury-=5;const id=s.world.nextStrategicOffer||1;s.world.nextStrategicOffer=id+1;
 offers.unshift({id,actor,recipient,target,kind:'join_war',year:s.year,month:s.month,status:'pending',phase:'outbound',remaining:2});if(offers.length>100)offers.length=100;
 return {ok:true,id};
}

export function advanceStrategicOffers(s,{autoplayPlayer=false}={}){
 for(const offer of s.world.strategicOffers||[]){
  if(offer.status!=='pending'||--offer.remaining>0)continue;
  const date=s.year*12+s.month;
  if(offer.phase==='outbound'){
   if(strategicRoll(s,offer.actor,offer.id+30)<.1||!s.factions[offer.recipient]||!s.factions[offer.target]){offer.status='no_reply';offer.phase='lost';continue}
   if(!autoplayPlayer&&offer.recipient===s.player){offer.status='no_reply';offer.phase='unavailable';continue}
   const recipient=s.factions[offer.recipient],view=assessOpportunities(s,offer.recipient,estimatedStrength).find(x=>x.target===offer.target),trust=relation(s,offer.recipient,offer.actor),ownWars=s.wars.filter(w=>w.includes(offer.recipient)).length;
   // The sender may have made peace since writing; the recipient has only the
   // letter and its own dated reports, so do not inspect that hidden change.
   const eligible=!!view?.border&&view.readiness&&!view.allied&&!view.treaty&&!isWar(s,offer.recipient,offer.target)&&ownWars<2&&trust>=10;
   const probability=Math.max(.15,Math.min(.75,.25+(view?.score||0)*.015+trust*.002));
   const accepted=eligible&&strategicRoll(s,offer.recipient,offer.id+60)<probability&&diplomacy(s,offer.recipient,offer.target,'war');
   offer.sealed={decision:accepted?'accepted':'refused',year:s.year,month:s.month};offer.phase='return';offer.remaining=2;continue;
  }
  if(offer.phase==='return'){
   if(strategicRoll(s,offer.actor,offer.id+90)<.1){offer.status='no_reply';offer.phase='lost';delete offer.sealed;continue}
   offer.status=offer.sealed?.decision||'no_reply';offer.answeredYear=offer.sealed?.year;offer.answeredMonth=offer.sealed?.month;offer.deliveredYear=s.year;offer.deliveredMonth=s.month;delete offer.sealed;offer.phase='delivered';
   if(offer.status==='accepted'||offer.status==='refused')rememberPoliticalEvent(s,offer.actor,offer.recipient,offer.status==='accepted'?'cooperation_accepted':'cooperation_refused',offer.status==='accepted'?2:-2);
  }
 }
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
 const inquiryCost=Math.max(1,3-(activeModifiers(s,actor).intelligence||0));
 if(s.factions[actor].treasury<inquiryCost)return {ok:false,reason:'treasury'};
 if((s.inquiries||[]).some(x=>x.actor===actor&&x.target===target&&['pending','awaiting_decision'].includes(x.status)))return {ok:false,reason:'pending'};
 const duration=letterMonths[target]||4;s.factions[actor].treasury-=inquiryCost;
 (s.inquiries||=[]).unshift({actor,target,sentYear:s.year,sentMonth:s.month,remaining:duration,duration,subject,status:'pending',source:'official court',confidence:'unverified',...(target.endsWith('_claimant')?{targetGeneration:s.world.dynasticGenerations?.[target]||0}:{})});
 if(actor===s.player)log(s,`A letter was sent to ${FACTIONS[target].short[0]}; a reply may take ${duration} months.`,`已向${FACTIONS[target].short[1]}寄信；等待回信约需${duration}个月。`);
 return {ok:true,duration};
}
// Only an offer that reached the player's court can be answered. A positive
// decision becomes effective only when the reply reaches the sender.
export function answerPeaceOffer(s,actor,decision){
 if(!['accept','refuse'].includes(decision))return {ok:false,reason:'decision'};
 const letter=(s.inquiries||[]).find(x=>x.actor===actor&&x.target===s.player&&x.subject==='peace'&&x.status==='awaiting_decision');
 if(!letter||!isWar(s,actor,s.player))return {ok:false,reason:'unavailable'};
 letter.status='pending';letter.phase='return';letter.remaining=Math.max(1,Math.floor((letter.duration||2)/2));
 letter.sealed={status:decision==='accept'?'answered':'refused',year:s.year,month:s.month,acceptedByPlayer:decision==='accept',...(decision==='accept'?{claim:['Peace accepted; the war has ended.','议和获接受；战争结束。']}:{})};
 log(s,'Your reply to the peace offer has been sent; the war continues until a valid acceptance is delivered.','议和答复已寄出；在有效接受送达前战争继续。');
 return {ok:true};
}
function resolveInquiries(s,{autoplayPlayer=false}={}){
 for(const letter of s.inquiries||[]){
  if(letter.status==='awaiting_decision'){
   if(autoplayPlayer&&letter.target===s.player&&isWar(s,letter.actor,letter.target)){const f=s.factions[letter.target],threat=estimatedStrength(s,letter.target,letter.actor),own=strength(s,letter.target),accept=f.stability<45||f.food<15||f.treasury<10||threat>=own*.8;answerPeaceOffer(s,letter.actor,accept?'accept':'refuse');continue}
   if(!isWar(s,letter.actor,letter.target)||--letter.remaining<=0)letter.status='no_reply';continue
  }
  if(letter.status!=='pending')continue;
  letter.remaining=Math.max(0,letter.remaining-1);
  // The response is composed roughly halfway through the round trip. Its sealed
  // contents are simulation state and do not enter the sender's knowledge until
  // delivery; old pending saves already past this point are prepared on the next tick.
  if(!letter.sealed&&letter.remaining<=Math.floor((letter.duration||2)/2)){
   const roll=rnd(s),hostile=isWar(s,letter.actor,letter.target),rel=relation(s,letter.actor,letter.target);
   if(letter.subject==='peace'&&!autoplayPlayer&&letter.target===s.player&&letter.actor!==s.player){
    if(roll<.18||!hostile||!s.regions.some(r=>r.owner===letter.target)){letter.status='no_reply';continue}
    letter.status='awaiting_decision';letter.phase='at_court';letter.remaining=6;
    log(s,`A peace offer has arrived from ${FACTIONS[letter.actor].short[0]}; your decision is needed.`,`${FACTIONS[letter.actor].short[1]}的议和书信已送达，等待你的决定。`);continue;
   }
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
  if(letter.subject==='peace'&&reply.status==='answered'&&!diplomacy(s,letter.actor,letter.target,'peace',{acceptedByPlayer:!!reply.acceptedByPlayer&&letter.target===s.player}))reply={status:'no_reply'};
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
  const supplyA=Math.min(1,Math.max(.65,s.factions[attacker.owner].food/20))*Math.min(1,Math.max(.7,(region(s,attacker.region).supply+(buildingModifiers(region(s,attacker.region)).supply||0))*1000/Math.max(1,attacker.men)));
  const supplyD=Math.min(1,Math.max(.65,s.factions[defender.owner].food/20))*Math.min(1,Math.max(.7,(target.supply+(buildingModifiers(target).supply||0))*1000/Math.max(1,defender.men)));
  const stanceD=({defend:1.16,hold:1.09,guard:1.22})[defender.order?.kind]||1;
  linkCommanders(s);relieveIncapacitatedCommanders(s);const commandA=commandFactor(s,attacker),commandD=commandFactor(s,defender);
  let powerA=attacker.men*(.65+attacker.morale/200+attacker.skill*.055+attacker.experience*.025)*supplyA*commandA*(1+(activeModifiers(s,attacker.owner).battle||0)+(buildingModifiers(region(s,attacker.region)).battle||0)*.03);
  let powerD=defender.men*(.65+defender.morale/200+defender.skill*.055+defender.experience*.025)*terrain*(1+target.fort*.12)*supplyD*commandD*stanceD*(1+(activeModifiers(s,defender.owner).battle||0)+(activeModifiers(s,defender.owner).defense||0)+(buildingModifiers(target).battle||0)*.03);
  // IMPERIUM: formation composition, terrain fit, training and commander specialty.
  const formationA=formationCombatFactor(s,attacker,target.terrain,'attack'),formationD=formationCombatFactor(s,defender,target.terrain,'defend');powerA*=formationA;powerD*=formationD;
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
    if(!remaining){attacker.region=target.id;if(isWar(s,attacker.owner,target.owner)){target.owner=attacker.owner;target.loyalty=38}}
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
  if(target.owner!==a.owner&&!isWar(s,a.owner,target.owner)&&!activeAgreement(s,a.owner,target.owner,'military_access')){a.move=null;a.order=null;if(a.owner===s.player)log(s,`${a.name[0]} stopped: entry into ${target.name[0]} is no longer permitted.`,`${a.name[1]}停止行军：当前不能进入${target.name[1]}。`);return}
  const enemy=s.armies.find(other=>other.id!==a.id&&other.region===target.id&&other.owner!==a.owner&&isWar(s,a.owner,other.owner)&&!other.move);
  if(enemy){resolveBattle(s,a,enemy,target);return}
  const siegeWorks=(buildingModifiers(region(s,a.region)).siege||0)+formationSiegeReduction(s,a)+(a.planSiegeWorks||0);
  a.region=target.id;a.move=null;a.order=null;
  if(target.owner!==a.owner&&isWar(s,a.owner,target.owner)){
    if(target.fort>0){a.siege={region:target.id,remaining:Math.max(1,target.fort*2-siegeWorks)};delete a.planSiegeWorks;if(a.owner===s.player||target.owner===s.player)log(s,`${a.name[0]} began a siege at ${target.name[0]}.`,`${a.name[1]}开始围攻${target.name[1]}。`)}
    else {const witnessed=a.owner===s.player||target.owner===s.player;target.owner=a.owner;target.loyalty=38;if(witnessed)log(s,`${FACTIONS[a.owner].short[0]} occupied ${target.name[0]}.`,`${FACTIONS[a.owner].short[1]}占领了${target.name[1]}。`)}
  }
}

export function forecastEconomy(s,id=s.player){const base=baseForecastEconomy(s,id),fu=formationUpkeepDelta(s,id),f=s.factions[id],food=f.food+base.food-Math.round(fu.food),treasury=f.treasury+base.treasury-Math.round(fu.treasury);return {...base,treasury:base.treasury-Math.round(fu.treasury),food:base.food-Math.round(fu.food),manpower:food<0?-Math.min(f.manpower,Math.max(170,Math.ceil(Math.abs(food)*3))):treasury<=-50?Math.floor(base.manpower*.25):base.manpower}}
export function projectTaxPath(s,owner=s.player,level=s.factions[owner].tax,months=3){
 const copy=structuredClone(s);copy.factions[owner].tax=level;const rows=[];
 for(let i=0;i<months;i++){const before={treasury:copy.factions[owner].treasury,food:copy.factions[owner].food,manpower:copy.factions[owner].manpower};economy(copy);const f=copy.factions[owner],owned=copy.regions.filter(r=>r.owner===owner);rows.push({month:i+1,treasury:f.treasury-before.treasury,food:f.food-before.food,manpower:f.manpower-before.manpower,loyalty:owned.length?Math.round(owned.reduce((n,r)=>n+r.loyalty,0)/owned.length):0})}
 return rows;
}
function baseForecastEconomy(s,id=s.player){const f=s.factions[id],owned=s.regions.filter(r=>r.owner===id),offices=officeEffects(s,id),ideas=activeModifiers(s,id),troops=s.armies.filter(a=>a.owner===id).reduce((n,a)=>n+a.men,0),rate={low:.65,normal:1,high:1.4}[f.tax],difficulty=id===s.player&&s.economicHandicap===true?({hard:.9,expert:.8}[s.difficulty]||1):1;return {treasury:Math.round(owned.reduce((n,r)=>n+(r.tax+(buildingModifiers(r).tax||0))*rate*(r.loyalty/100)*populationFactor(r)*(1-Math.min(80,Math.max(0,r.autonomy||0))/200),0)*difficulty*(1+(ideas.tax||0))-troops/1100)+offices.treasury+(ideas.treasury||0)-religiousTaxCost(s,id)-owned.reduce((n,r)=>n+(buildingModifiers(r).upkeep||0),0)-Math.max(0,Object.values(s.inventions?.[id]?.slots||{}).reduce((n,v)=>n+v-1,0)),food:Math.round(owned.reduce((n,r)=>n+r.food+(buildingModifiers(r).food||0),0)*difficulty-troops/1200-owned.length*2)+offices.food+(ideas.food||0),manpower:owned.length*170+(ideas.manpower||0)}}
function economy(s){
  for(const [id,f] of Object.entries(s.factions)){
    const owned=s.regions.filter(r=>r.owner===id);
    const offices=officeEffects(s,id),ideas=activeModifiers(s,id);
    const troops=s.armies.filter(a=>a.owner===id).reduce((n,a)=>n+a.men,0);
    const rate={low:.65,normal:1,high:1.4}[f.tax];
    // Legacy resource handicaps are opt-in; decision quality is independent
    // of the difficulty setting. Old saves remain valid without the option.
    const difficulty=id===s.player&&s.economicHandicap===true?({hard:.9,expert:.8}[s.difficulty]||1):1;
    f.treasury+=Math.round(owned.reduce((n,r)=>n+(r.tax+(buildingModifiers(r).tax||0))*rate*(r.loyalty/100)*populationFactor(r)*(1-Math.min(80,Math.max(0,r.autonomy||0))/200),0)*difficulty*(1+(ideas.tax||0))-troops/1100)+offices.treasury+(ideas.treasury||0)-religiousTaxCost(s,id)-owned.reduce((n,r)=>n+(buildingModifiers(r).upkeep||0),0)-Math.max(0,Object.values(s.inventions?.[id]?.slots||{}).reduce((n,v)=>n+v-1,0));
    f.food+=Math.round(owned.reduce((n,r)=>n+r.food+(buildingModifiers(r).food||0),0)*difficulty-troops/1200-owned.length*2)+offices.food+(ideas.food||0);
    {const fu=formationUpkeepDelta(s,id);f.treasury-=Math.round(fu.treasury);f.food-=Math.round(fu.food)}
    f.stability=Math.max(0,Math.min(100,f.stability+offices.stability+(ideas.stability||0)+(s.month===1&&s.world.constitutionalOversight?.[id]?1:0)));
    const manpowerGain=owned.length*170+(ideas.manpower||0);
    if(f.food<0)f.manpower=Math.max(0,f.manpower-Math.max(170,Math.ceil(Math.abs(f.food)*3)));
    else f.manpower+=f.treasury<=-50?Math.floor(manpowerGain*.25):manpowerGain;
    if(f.treasury<0){f.stability=Math.max(0,f.stability-3);s.armies.filter(a=>a.owner===id).forEach(a=>a.morale=Math.max(20,a.morale-4))}
    if(f.food<0){f.stability=Math.max(0,f.stability-3);s.armies.filter(a=>a.owner===id).forEach(a=>a.men=Math.max(1,Math.round(a.men*(f.food<=-50?.92:.96))))}
    if(id===s.player&&f.treasury<=-50&&!s.world.debtCrisisNotified){log(s,'Deep debt has stalled recruitment and weakened the army.','严重债务已拖慢兵源补充，并削弱军队。');s.world.debtCrisisNotified=true}
    if(id===s.player&&f.food<=-50&&!s.world.famineNotified){log(s,'Food shortages are draining manpower and increasing army losses.','粮食短缺正在消耗兵源并增加军队减员。');s.world.famineNotified=true}
    if(f.treasury>-50&&id===s.player)delete s.world.debtCrisisNotified;
    if(f.food>-50&&id===s.player)delete s.world.famineNotified;
    f.treasury=Math.max(-100,Math.round(f.treasury));f.food=Math.max(-100,Math.round(f.food));
    owned.forEach(r=>{r.loyalty=Math.max(0,Math.min(100,r.loyalty+({low:1,normal:0,high:-2}[f.tax])+(f.food<0?-2:0)+governorLoyaltyEffect(s,r.id)+(ideas.loyalty||0)+(buildingModifiers(r).loyalty||0)))});
    if(ideas.relations)for(const other of Object.keys(s.factions))if(other!==id&&other!=='rebels'){const key=[id,other].sort().join(':');s.relations[key]=Math.max(-100,Math.min(100,(s.relations[key]||0)+ideas.relations))}
  }
}

function shortestStep(s,start,goal,owner){
  const queue=[[start,null]],seen=new Set([start]);
  while(queue.length){const [id,first]=queue.shift();if(id===goal)return first;
    for(const e of adjacent(id)){if(seen.has(e.to))continue;const controller=reportedControl(s,owner,e.to)?.owner;if(controller&&controller!==owner&&!isWar(s,owner,controller)&&!activeAgreement(s,owner,controller,'military_access'))continue;seen.add(e.to);queue.push([e.to,first||e.to])}}
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

function aiTurn(s,owner,{autoplayPlayer=false}={}){
  const f=s.factions[owner],owned=s.regions.filter(r=>r.owner===owner);
  const existingFeint=s.world.aiFeints?.[owner];if(existingFeint&&!s.armies.some(a=>a.id===existingFeint.army&&a.owner===owner&&a.men>0))delete s.world.aiFeints[owner];
  const internalOpponent=other=>Object.entries(s.world.disputes||{}).some(([parent,d])=>d.war&&[parent,d.war.rival].includes(owner)&&[parent,d.war.rival].includes(other));
  // A defeated government may still have a field army outside its last
  // theater; it must be able to continue the dynastic campaign.
  if(!owned.length&&!s.wars.some(w=>w.includes(owner)))return;
  // Replan quarterly, or immediately when the set of known wars changes.
  // estimatedStrength uses only this actor's reports and sightings.
  let strategy=null;const level=s.difficulty||'standard',strongPlanning=['hard','expert'].includes(level);
  if(owner!=='rebels' && ['standard','hard','expert'].includes(level)){
    s.world.strategicPlans||={};
    const enemies=s.wars.filter(w=>w.includes(owner)).map(w=>w.find(id=>id!==owner)).sort();
    const signature=enemies.join(':');
    const previous=s.world.strategicPlans[owner],now=s.year*12+s.month;
    if(!previous||previous.signature!==signature||now-previous.date>=(strongPlanning?3:6)){
      s.world.strategicPersonalities||={};const leader=(s.world.leadership[owner]||[]).find(id=>s.world.characters[id]?.alive)||null,profile=s.world.strategicPersonalities[owner];
      if(!profile||profile.leader!==leader){s.world.personalities||={};if(leader)s.world.personalities[leader]||=strategicPersonality(s.world.characters[leader]);s.world.strategicPersonalities[owner]={leader,personality:leader?s.world.personalities[leader]:strategicPersonality(null)}}
      const commitments=s.alliances.filter(a=>a.includes(owner)).length+(s.coalitions||[]).filter(c=>c.status==='active'&&c.parties.includes(owner)).length+(s.agreements||[]).filter(t=>t.status==='active'&&t.parties.includes(owner)).length;
      strategy={...evaluateStrategicPlan({treasury:f.treasury,food:f.food,stability:f.stability,ownStrength:strength(s,owner),enemies:enemies.map(id=>({id,estimatedStrength:estimatedStrength(s,owner,id)})),personality:s.world.strategicPersonalities[owner].personality,commitments}),signature,date:now};
      s.world.strategicPlans[owner]=strategy;
    }else strategy=previous;
  }
  if(owner!=='rebels'&&imperiumOn(s)){
    if((s.month+owner.length)%6===0||!s.world.aiFormationPlans?.[owner])aiDesignFormations(s,owner);
    if(strongPlanning||s.month%3===0)aiBattlePlans(s,owner,{estimatedStrength,log});
    // Reorganize quarterly, or soon after a lost battle when a battered army is safe at home.
    const beaten=(s.battles||[]).some(b=>(b.attackerWins?b.defender.owner:b.attacker.owner)===owner&&(s.year*12+s.month)-(b.year*12+b.month)<=2);
    const canFundReorganization=owner==='han'?f.treasury>180&&forecastEconomy(s,owner).treasury>=5:(s.month%4===2&&f.treasury>70||beaten&&f.treasury>35);
    if((s.month%4===2||beaten)&&canFundReorganization&&(!strategy||!['recover','stabilize'].includes(strategy.goal)||beaten))aiReorganize(s,owner,{log});
  }
  const reportedNeighbors=()=>owned.flatMap(r=>adjacent(r.id).map(e=>({id:e.to,owner:reportedControl(s,owner,e.to)?.owner}))).filter(r=>r.owner);
  // Review bounded, private opportunity estimates when observed wars change or
  // at most once per quarter. Reports may be stale or wrong; no missing enemy
  // sighting is treated as an empty garrison.
  let review=null;
  if(owner!=='rebels'&&owned.length){
    s.world.multipolarPlans||={};const date=s.year*12+s.month,knownWars=reportedDiplomacy(s,owner).filter(x=>x.kind==='war'&&x.status==='active'&&date-(x.year*12+x.month)>=0&&date-(x.year*12+x.month)<=24),signature=knownWars.map(x=>x.id).sort().join('|'),old=s.world.multipolarPlans[owner];
    if(!old||old.signature!==signature||date-old.date>=3){review={date,signature,opportunities:assessOpportunities(s,owner,estimatedStrength),lastAction:old?.lastAction||null};s.world.multipolarPlans[owner]=review}else review=old;
    if(review.date===date&&(!review.lastAction||date-review.lastAction.date>=12)){
      const chance=review.opportunities.find(x=>x.border&&x.readiness&&x.knownWars>0&&x.relation<0&&!x.allied&&!x.treaty&&!isWar(s,owner,x.target)&&x.score>=14&&x.ownStrength>x.estimate*1.25);
      // Avoid opening a second war while facing an acute domestic or supply crisis.
      if(chance&&f.food>=30&&f.stability>=45&&strategicRoll(s,owner,1)<.22&&diplomacy(s,owner,chance.target,'war'))review.lastAction={kind:'opportunistic_war',target:chance.target,date};
      else if(!chance&&f.food>=40&&f.stability>=55&&!s.wars.some(w=>w.includes(owner))){
        const breach=review.opportunities.find(x=>x.border&&x.readiness&&x.treaty&&!x.allied&&x.knownWars>=2&&x.relation<=-30&&['conqueror','schemer'].includes(x.personality)&&x.score+12>=23);
        const treaty=breach&&(s.agreements||[]).find(t=>t.type==='non_aggression'&&t.parties.includes(owner)&&t.parties.includes(breach.target)&&activeAgreement(s,owner,breach.target,'non_aggression')===t);
        if(treaty&&strategicRoll(s,owner,2)<.12&&terminateAgreement(s,treaty.id,owner).ok)review.lastAction={kind:'treaty_breach',target:breach.target,date};
      }
    }
  }
  const enemies=s.regions.filter(r=>isWar(s,owner,reportedControl(s,owner,r.id)?.owner));
  // IMPERIUM: armies under an automatic operational plan or reorganizing follow that plan.
  const available=s.armies.filter(a=>a.owner===owner&&!a.move&&!a.siege&&!a.reorg&&a.men>1200&&!planControlled(s,a.id));
  const observedPressure=strongPlanning?observeAttackPattern(s,owner):null;
  for(const a of available){
    if(!s.armies.includes(a))continue;
    const here=region(s,a.region),neighbors=adjacent(a.region).map(e=>region(s,e.to)).filter(Boolean);
    const now=s.year*12+s.month,feint=s.world.aiFeints?.[owner];
    if(feint?.army===a.id){
      if(a.region===feint.destination&&now>=feint.returnAt&&region(s,feint.origin)?.owner===owner){delete s.world.aiFeints[owner];if(issueMilitaryOrder(s,a.id,'move',feint.origin,owner).ok)continue}
      else if(a.region!==feint.origin&&a.region!==feint.destination||now>feint.returnAt+3)delete s.world.aiFeints[owner];
    }
    const threatened=neighbors.filter(r=>isWar(s,owner,reportedControl(s,owner,r.id)?.owner));
    const estimate=r=>{const rival=reportedControl(s,owner,r.id)?.owner;return rival&&isWar(s,owner,rival)?estimatedStrength(s,owner,rival)/Math.max(1,s.regions.filter(x=>reportedControl(s,owner,x.id)?.owner===rival).length):0};
    const ownSupport=neighbors.filter(r=>r.owner===owner).reduce((sum,r)=>sum+s.armies.filter(b=>b.owner===owner&&b.region===r.id&&!b.move&&b.id!==a.id).reduce((n,b)=>n+b.men,0),0);
    // Keep a real capital reserve while the Hexi garrison conducts frontier
    // operations. A recorded loss of Hexi releases it for a counterattack.
    if(owner==='han'&&a.id==='hanCapitalGuard'&&here.id==='hanGuanzhong'&&region(s,'hanHexi')?.owner==='han'){
      if(a.order?.kind!=='guard')issueMilitaryOrder(s,a.id,'guard',null,owner);continue;
    }
    // An oasis court defends its own approach when its *reported* opponent is
    // stronger; it does not gain hidden access to Han army strength.
    if(owner==='shanshan'&&here.owner===owner&&threatened.length&&estimatedStrength(s,owner,'han')>strength(s,owner)*1.25){
      if(a.order?.kind!=='guard')issueMilitaryOrder(s,a.id,'guard',null,owner);continue;
    }
    if(['caesar','senate'].includes(owner)&&threatened.some(r=>estimate(r)>a.men*1.7)&&a.morale<48){const safe=neighbors.filter(r=>r.owner===owner).sort((x,y)=>y.supply-x.supply)[0];if(safe&&issueMilitaryOrder(s,a.id,'retreat',safe.id,owner).ok)continue}
    if(['caesar','senate'].includes(owner)&&here.owner===owner&&threatened.length&&here.supply*1000<a.men*.75){const safe=neighbors.filter(r=>r.owner===owner&&r.supply>here.supply).sort((x,y)=>y.supply-x.supply)[0];if(safe&&issueMilitaryOrder(s,a.id,'move',safe.id,owner).ok)continue}
    if(observedPressure===here.id&&here.owner===owner&&threatened.length&&(a.morale<65||f.food<30)){issueMilitaryOrder(s,a.id,here.fort?'guard':'defend',null,owner);continue}
    if(['caesar','senate'].includes(owner)&&here.owner===owner&&threatened.length&&threatened.every(r=>estimate(r)>a.men*1.25)){
      // Only move toward a materially stronger nearby force. Sending similarly
      // sized armies toward one another makes them exchange positions forever.
      const support=neighbors.find(r=>r.owner===owner&&r.supply*1000>=a.men*.75&&s.armies.filter(b=>b.owner===owner&&b.region===r.id&&b.id!==a.id&&!b.move).reduce((n,b)=>n+b.men,0)>a.men*1.25);
      if(support&&issueMilitaryOrder(s,a.id,'move',support.id,owner).ok)continue;
      issueMilitaryOrder(s,a.id,here.fort||here.tax>=7?'guard':'defend',null,owner);continue;
    }
    if(strategy && ['recover','stabilize'].includes(strategy.goal) && here.owner===owner && threatened.length){issueMilitaryOrder(s,a.id,'defend',null,owner);continue}
    // A limited feint uses an existing smaller force and an actual movement to
    // another known frontier. Observers may see and interpret that movement;
    // the force returns on a later turn if its original position is still safe.
    if(strongPlanning&&strategy&&s.month===10&&here.owner===owner&&threatened.length&&!s.world.aiFeints?.[owner]&&(s.world.lastFeint?.[owner]??-Infinity)+24<=now&&s.armies.some(b=>b!==a&&b.owner===owner&&b.region===a.region&&!b.move&&!b.siege&&b.men>=a.men)){
      const alternate=neighbors.find(r=>r.owner===owner&&r.supply*1000>=a.men&&adjacent(r.id).some(e=>e.to!==a.region&&isWar(s,owner,reportedControl(s,owner,e.to)?.owner)));
      if(alternate&&issueMilitaryOrder(s,a.id,'move',alternate.id,owner).ok){s.world.aiFeints||={};s.world.lastFeint||={};s.world.aiFeints[owner]={army:a.id,origin:here.id,destination:alternate.id,returnAt:now+1};s.world.lastFeint[owner]=now;continue}
    }
    const sharedTarget=coalitionMilitaryObjective(s,owner);
    const targets=enemies.map(r=>({r,d:Math.hypot(r.x-region(s,a.region).x,r.y-region(s,a.region).y),shared:sharedTarget&&reportedControl(s,owner,r.id)?.owner===sharedTarget})).sort((x,y)=>Number(!!y.shared)-Number(!!x.shared)||x.d-y.d);
    let heldForPreparation=false;
    for(const {r} of targets){const step=shortestStep(s,a.region,r.id,owner);if(step&&step!==a.region){const defenderOwner=reportedControl(s,owner,step)?.owner;const hostile=isWar(s,owner,defenderOwner),theaters=s.regions.filter(x=>reportedControl(s,owner,x.id)?.owner===defenderOwner).length,estimate=hostile?estimatedStrength(s,owner,defenderOwner):0;const defenders=hostile?estimate/Math.max(1,theaters):0;
      const next=region(s,step),nextThreatened=adjacent(step).some(e=>isWar(s,owner,reportedControl(s,owner,e.to)?.owner));
      if(strongPlanning&&strategy&&!hostile&&next.owner===owner&&nextThreatened&&next.supply*1000<a.men*.75&&here.supply>next.supply)continue;
      if(defenders>a.men*(internalOpponent(defenderOwner)?2:({hard:1.15,expert:1.05}[s.difficulty]||1.35))||f.food<0){if(hostile&&strongPlanning){heldForPreparation=true;if(here.owner===owner)break}continue}
      if(hostile&&strongPlanning&&strategy&&!internalOpponent(defenderOwner)){
       const dest=region(s,step),now=s.year*12+s.month,sightings=Object.values(s.knowledge?.[owner]?.[defenderOwner]?.sightings||{}).filter(x=>x.region===step&&now-(x.year*12+x.month)>=0&&now-(x.year*12+x.month)<=12).length;
       const assessment=(unit)=>assessAttack({ownMen:unit.men,morale:unit.morale,skill:unit.skill,experience:unit.experience,food:f.food,estimatedTotal:estimate,reportedTheaters:theaters,sightings,terrain:dest.terrain,fort:dest.fort,difficulty:s.difficulty});
       if(!assessment(a).favorable&&here.owner===owner){
        const support=s.armies.filter(b=>b!==a&&b.owner===owner&&b.region===a.region&&!b.move&&!b.siege&&b.men>0&&a.men+b.men<=15000&&a.men+b.men<=here.supply*1000).sort((x,y)=>y.men-x.men).find(b=>{const total=a.men+b.men;return assessment({men:total,morale:(a.morale*a.men+b.morale*b.men)/total,skill:(a.skill*a.men+b.skill*b.men)/total,experience:(a.experience*a.men+b.experience*b.men)/total}).favorable});
        if(support){const total=a.men+support.men;for(const property of ['morale','skill','experience'])a[property]=Math.round((a[property]*a.men+support[property]*support.men)/total*10)/10;a.men=total;(a.mergedFrom||=[]).push(support.id,...(support.mergedFrom||[]));s.armies=s.armies.filter(b=>b!==support)}
       }
       if(!assessment(a).favorable){heldForPreparation=true;if(here.owner===owner)break;continue}
      }
      issueMilitaryOrder(s,a.id,defenders?'attack':'move',step,owner);break}}
    // A cautious force can prepare for a later offensive using real manpower,
    // money and food. It never receives fabricated troops or enemy numbers.
    const period=s.year*12+s.month;s.world.lastPreparation||={};
    if(heldForPreparation&&!a.move&&!a.siege&&here.owner===owner&&f.treasury>80&&f.food>40&&f.manpower>6000&&a.men+1000<=here.supply*1000&&s.world.lastPreparation[owner]!==period){
      const prepared=issueMilitaryOrder(s,a.id,a.morale<65?'rally':'reinforce',null,owner);
      if(prepared.ok)s.world.lastPreparation[owner]=period;
    }
  }
  if(f.treasury>65&&f.food>30&&forecastEconomy(s,owner).food+f.food>=0&&f.manpower>5500&&s.armies.filter(a=>a.owner===owner&&a.men>0).length<Math.max(2,Math.ceil(owned.length*.75))&&s.month%4===0&&(!strategy||!['recover','stabilize'].includes(strategy.goal))){
    const border=owned.find(r=>adjacent(r.id).some(e=>isWar(s,owner,reportedControl(s,owner,e.to)?.owner)));
    if(border&&!(owner!=='rebels'&&imperiumOn(s)&&aiRecruitFormation(s,owner,border.id,{log}).ok))recruit(s,border.id,owner);
  }
  if(f.stability<45&&f.treasury>25){f.treasury-=10;f.stability+=3}
  if(owner!=='rebels'&&s.month===7&&f.treasury>40){
    const institution=(s.world.religiousInstitutions||[]).find(o=>owned.some(r=>r.id===o.region)&&((o.relations[owner]??0)<-15||owned.find(r=>r.id===o.region)?.population?.satisfaction<40));
    if(institution){const relation=institution.relations[owner]??0;religiousPolicy(s,owner,institution.id,relation<0?'tolerance':'negotiate')}
  }
  // A faction may write about its own captured personnel, without exposing a
  // letter to the player until its outward journey reaches the holder.
  if(owner!=='rebels'&&s.month%6===3&&f.treasury>35){
    const captive=s.world.captives.find(c=>c.owner===owner&&c.holder!==owner&&s.factions[c.holder]&&c.state==='held'&&!s.releaseRequests.some(r=>r.captiveId===c.id&&((s.year-r.year)*12+s.month-r.month<12)));
    if(captive)requestAgentRelease(s,owner,captive.id);
  }
  if(['caesar','senate'].includes(owner)&&s.month===2&&f.treasury>40&&s.wars.some(w=>w.includes(owner)))queueMission(s,owner,owner,'counter','counter_spies');
  if(owner!=='rebels' && s.month===8 && f.treasury>=(owner==='han'?170:25)){const enemy=s.wars.find(w=>w.includes(owner))?.find(x=>x!==owner);if(enemy&&enemy!=='rebels')queueMission(s,owner,enemy,'spy','strength')}
  // Rival Roman commands investigate and act on their own reports, not on the
  // concealed state of the Egyptian court. An old report may lead nowhere.
  if(['caesar','senate'].includes(owner)&&s.month===6&&f.treasury>45)queueMission(s,owner,'egypt','spy','claimants');
  if(['caesar','senate'].includes(owner)&&s.month===9&&f.treasury>45)queueMission(s,owner,'parthia','spy','claimants');
  if(['caesar','senate'].includes(owner)&&s.month===10&&f.treasury>45)for(const court of ['egypt','parthia'])if(canMediate(s,owner,court)){requestMediation(s,owner,court);break}
  if(['caesar','senate'].includes(owner)&&s.difficulty==='expert'&&s.month===3&&f.treasury>50){const rival=owner==='caesar'?'senate':'caesar';for(const person of reportedHealthSubjects(s,owner,rival)){const representative=claimantRepresentatives(s,owner,person)[0];if(representative&&offerPoliticalContact(s,owner,rival,person,representative).ok)break}}
  if(owner!=='rebels'&&s.difficulty==='expert'&&s.month===9&&f.treasury>50){for(const report of reportedMovements(s,owner).filter(x=>x.parent!==owner&&x.leader&&!['settled','collapsed','defeated','victorious'].includes(x.stage))){const representative=claimantRepresentatives(s,owner,report.leader)[0];if(representative&&offerMovementSupport(s,owner,report.id,representative).ok)break}}
  if(owner!=='rebels'&&s.difficulty==='expert'&&s.month===11&&f.treasury>55){const report=reportedMovements(s,owner).find(x=>x.parent!==owner&&['crisis','armed'].includes(x.stage)&&relation(s,owner,x.parent)<-30&&!s.world.movementRecognitions?.[owner]?.[x.id]);if(report)recognizeMovement(s,owner,report.id)}
  if(owner!=='rebels'&&s.month===12){for(const court of ['egypt','parthia']){if(f.treasury<=35)break;if(court===owner)continue;const connected=reportedNeighbors().some(x=>x.owner===court)||reportedDiplomacy(s,owner).some(x=>x.status==='active'&&x.parties.includes(owner)&&x.parties.includes(court));if(!connected)continue;const claimant=aiClaimantChoice(s,owner,court);if(claimant)supportClaimant(s,owner,court,claimant)}}
  if(owner!=='rebels' && s.month===12){
    const enemy=s.wars.find(w=>w.includes(owner))?.find(x=>x!==owner);
    const internal=internalOpponent(enemy);
    if(enemy && !internal && (f.food<0||f.treasury<0||f.stability<35||estimatedStrength(s,owner,enemy)>strength(s,owner)*1.7))sendInquiry(s,owner,enemy,'peace');
    if(!enemy && f.treasury>35){const neighbor=reportedNeighbors().find(r=>r.owner!==owner&&r.owner!=='rebels'&&relation(s,owner,r.owner)>=0&&!isAllied(s,owner,r.owner));if(neighbor && rnd(s)<.2)diplomacy(s,owner,neighbor.owner,'improve')}
  }
  // Independent courts negotiate with known neighbors; they never bind the
  // player without a decision. One candidate per review keeps work bounded.
  if(owner!=='rebels'&&['hard','expert'].includes(s.difficulty)&&s.month%6===4&&f.treasury>45){
    const partners=[...new Set(reportedNeighbors().map(r=>r.owner))].filter(id=>id!==owner&&(autoplayPlayer||id!==s.player)&&id!=='rebels'&&s.factions[id]&&!isWar(s,owner,id)).sort((a,b)=>relation(s,owner,b)-relation(s,owner,a)||a.localeCompare(b));
    for(const partner of partners){
      const ownEnemies=s.wars.filter(w=>w.includes(owner)).map(w=>w.find(x=>x!==owner)),known=reportedDiplomacy(s,owner);const sharedEnemy=ownEnemies.some(enemy=>known.some(doc=>doc.kind==='war'&&doc.status==='active'&&doc.parties.includes(partner)&&doc.parties.includes(enemy))); 
      const partnerAtWar=known.some(doc=>doc.kind==='war'&&doc.status==='active'&&doc.parties.includes(partner)&&!doc.parties.includes(owner));
      const type=sharedEnemy&&relation(s,owner,partner)>=30?'defensive':partnerAtWar&&relation(s,owner,partner)>=25&&f.treasury>=60&&f.food>=40?'military_support':'trade';
      if(activeAgreement(s,owner,partner,type)||relation(s,owner,partner)<({trade:10,military_support:25,defensive:30}[type]))continue;
      proposeAgreement(s,owner,partner,type);break;
    }
  }
  // A government at war can spend real diplomatic resources to secure a
  // temporary neutral frontier. The prospective partner can decline, and a
  // player is never bound without their decision.
  if(owner!=='rebels'&&['hard','expert'].includes(s.difficulty)&&s.month===10&&f.treasury>45&&s.wars.some(w=>w.includes(owner))){
    const neutral=[...new Set(reportedNeighbors().map(r=>r.owner))].filter(id=>id!==owner&&(autoplayPlayer||id!==s.player)&&id!=='rebels'&&s.factions[id]&&!isWar(s,owner,id)&&!isAllied(s,owner,id)&&!activeAgreement(s,owner,id,'non_aggression')&&relation(s,owner,id)>=0).sort((a,b)=>relation(s,owner,b)-relation(s,owner,a)||a.localeCompare(b))[0];
    if(neutral)proposeAgreement(s,owner,neutral,'non_aggression');
  }
  if(owner!=='rebels'&&['standard','hard','expert'].includes(level)&&s.month===5&&f.treasury>45&&(level!=='standard'||s.year%2===0&&s.wars.some(w=>w.includes(owner)))){
    const threats=[...new Set(reportedNeighbors().map(r=>r.owner))].filter(id=>id!==owner&&id!=='rebels'&&s.factions[id]&&coalitionInterest(s,owner,id,estimatedStrength).interested);
    for(const threat of threats){
      const partners=PLAYABLE.filter(id=>s.factions[id]&&id!==owner&&id!==threat&&(autoplayPlayer||id!==s.player)&&relation(s,owner,id)>=15&&coalitionInterest(s,id,threat,estimatedStrength).interested).sort((a,b)=>relation(s,owner,b)-relation(s,owner,a)||a.localeCompare(b)).slice(0,2);
      if(partners.length===2&&formCoalition(s,owner,partners,threat,estimatedStrength,{allowPlayer:autoplayPlayer}).ok)break;
    }
  }
  // Ask one known partner to consider the sender's existing war. Sending
  // spends resources, and a later independent reply may be lost or refused.
  if(PLAYABLE.includes(owner)&&s.month%6===1&&f.treasury>50){
    const enemy=s.wars.filter(w=>w.includes(owner)).map(w=>w.find(id=>id!==owner)).find(id=>PLAYABLE.includes(id));
    const documents=reportedDiplomacy(s,owner).filter(d=>d.status==='active'),contacts=[...new Set([...reportedNeighbors().map(x=>x.owner),...documents.filter(d=>d.parties.includes(owner)).flatMap(d=>d.parties)])];
    const partner=contacts.filter(id=>id!==owner&&id!==enemy&&PLAYABLE.includes(id)&&(autoplayPlayer||id!==s.player)&&relation(s,owner,id)>=15&&!documents.some(d=>d.kind==='war'&&d.parties.includes(id)&&d.parties.includes(enemy))).sort((a,b)=>relation(s,owner,b)-relation(s,owner,a)||a.localeCompare(b))[0];
    if(enemy&&partner&&strategicRoll(s,owner,149)<.35)sendStrategicOffer(s,owner,partner,enemy,{autoplayPlayer});
  }
  if(review&&s.month%6===0&&f.treasury>40&&f.food>=25&&f.stability>=40&&strength(s,owner)>2000&&s.wars.filter(w=>w.includes(owner)).length<2){
    const date=s.year*12+s.month,border=review.opportunities.find(x=>x.border&&x.readiness&&x.relation<0&&!x.allied&&!x.treaty&&!isWar(s,owner,x.target)&&x.score>=10&&x.ownStrength>x.estimate*1.5);
    if(border&&(!review.lastAction||date-review.lastAction.date>=12)&&rnd(s)<.18&&diplomacy(s,owner,border.target,'war'))review.lastAction={kind:'frontier_war',target:border.target,date};
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

export function advanceRomanDefeat(s){
 if(!['caesar','senate'].includes(s.player)||s.victory||s.defeat)return;
 const opponent=s.player==='caesar'?'senate':'caesar';
 if(!isWar(s,s.player,opponent)||s.armies.some(a=>a.owner===s.player&&a.men>0)){delete s.world.romanDefeatNotice;return}
 const territory=s.regions.some(r=>r.owner===s.player);
 if(!territory){delete s.world.romanDefeatNotice;s.defeat=true;s.victor=opponent;s.defeatDate={year:s.year,month:s.month};log(s,'The last Roman field army and remaining territory are lost. The campaign has ended in defeat.','最后一支罗马野战军和余下战区均已失去。战役以失败告终。');return}
 let notice=s.world.romanDefeatNotice;
 if(!notice){s.world.romanDefeatNotice={remaining:3};log(s,'No field army remains. Raise another force within three months or face defeat.','已无野战军。请在三个月内重建军队，否则战役将失败。');return}
 if(--notice.remaining>0)return;
 delete s.world.romanDefeatNotice;s.defeat=true;s.victor=opponent;s.defeatDate={year:s.year,month:s.month};
 log(s,'The Roman command has collapsed without a field army. The campaign has ended in defeat.','罗马指挥体系因失去野战军而瓦解。战役以失败告终。');
}

// A durable settlement offers a peaceful completion path. The campaign can
// continue, but renewed war before finalization ends the qualification.
export function advancePeacefulSettlement(s){
 if(!['caesar','senate'].includes(s.player)||s.victory)return;
 const f=s.factions[s.player],secure=f&&s.regions.some(r=>r.owner===s.player)&&!s.wars.some(w=>w.includes(s.player))&&f.stability>=55&&f.legitimacy>=40&&f.treasury>=0&&f.food>=0;
 if(!secure){s.world.peacefulSettlementMonths=0;if(!s.world.dynasties?.finalized)delete s.peacefulVictory;return}
 const month=s.year*12+s.month;if(s.world.lastPeacefulSettlementMonth===month)return;s.world.lastPeacefulSettlementMonth=month;
 s.world.peacefulSettlementMonths=Math.min(12,(s.world.peacefulSettlementMonths||0)+1);
 if(s.world.peacefulSettlementMonths>=12&&!s.peacefulVictory){s.peacefulVictory=true;log(s,'A year of peace and stable government has established a durable settlement. The campaign may be finalized or continued.','一年和平与稳定治理建立了持久的政治和解；可以封存战役或继续游玩。')}
}

export function tick(s,{autoplayPlayer=false,playerDifficulty=null}={}){
  if(s.defeat)return s;
  initializeWorld(s);linkCommanders(s);relieveIncapacitatedCommanders(s);
  const chronicleBefore=captureCampaignState(s);
  s.month++;if(s.month>12){s.month=1;s.year++}
  refreshReportConfidence(s);
  advanceInventions(s);advanceOffices(s);economy(s);advanceAgreements(s);advanceCoalitions(s);advanceReligion(s);
  if(imperiumOn(s))advanceFocuses(s,{autoplayPlayer,log,sendInquiry});advanceReorganizations(s,{log});
  // Travel and sieges resolve before new AI orders.
  for(const a of [...s.armies]){
    if(!s.armies.includes(a))continue;
    if(a.move){a.move.remaining--;if(a.move.remaining<=0)arrive(s,a)}
    else if(a.siege){a.siege.remaining--;if(a.siege.remaining<=0){const r=region(s,a.siege.region),witnessed=a.owner===s.player||r.owner===s.player;r.owner=a.owner;r.loyalty=36;a.siege=null;if(witnessed)log(s,`${r.name[0]} surrendered after a siege.`,`${r.name[1]}在围攻后投降。`)}}
  }
  advanceMovements(s,{autoplayPlayer});
  resolveInquiries(s,{autoplayPlayer});advanceOperations(s);advanceAgentRequests(s,{autoplayPlayer});advanceCharacters(s);advanceDynasties(s);relieveIncapacitatedCommanders(s);advanceMissingCommanders(s);resolveDynasticWars(s);advanceMediations(s);advanceDisputes(s);advancePersonalPlans(s);advanceConspiracies(s);advancePoliticalContacts(s,addReport);advanceGovernments(s,{autoplayPlayer});linkCommanders(s);advancePersonalDiplomacy(s);
  advanceControlScouts(s);observeArmies(s);observeFormationRecon(s);observeControl(s);if(s.month%6===0)observeBalanceOfPower(s);
  if(imperiumOn(s)){advanceBattlePlans(s,{autoplayPlayer,issueOrder:issueMilitaryOrder,estimatedStrength,log});advanceCommandInfluence(s,{log})}
  // Friendly courts may forward fresh scout sightings; recipients judge them on their own.
  advanceStrategicWarnings(s,{autoplayPlayer,letterMonths,issueOrder:issueMilitaryOrder,log});
  advanceStrategicOffers(s,{autoplayPlayer});
  for(const owner of Object.keys(s.factions).filter(id=>autoplayPlayer||id!==s.player)){
    const override=autoplayPlayer&&owner===s.player&&playerDifficulty;if(!override){aiTurn(s,owner,{autoplayPlayer});if(owner!=='rebels')aiInnovation(s,owner);continue}
    const originalDifficulty=s.difficulty,hadDifficulty=Object.prototype.hasOwnProperty.call(s,'difficulty');s.difficulty=playerDifficulty;
    try{aiTurn(s,owner,{autoplayPlayer});if(owner!=='rebels')aiInnovation(s,owner)}finally{if(hadDifficulty)s.difficulty=originalDifficulty;else delete s.difficulty}
  }
  observeDiplomacy(s);
  advanceRomanDefeat(s);if(!s.defeat){advanceRomanVictory(s);advancePeacefulSettlement(s)}
  recordCampaignTurn(s,chronicleBefore);
  return s;
}
