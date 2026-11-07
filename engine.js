import {advancePersonalDiplomacy,personalDiplomaticCredit} from './personal-diplomacy.js?v=56';
import {initializeGovernments,advanceGovernments,deriveGovernment} from './governance.js?v=16';
import {REGIONS, ROUTES, FACTIONS, INITIAL_ARMIES} from './data.js?v=9';
import {initializeWorld,OPENING_LEADERS,CHARACTER_CATALOG} from './characters.js?v=15';
import {queueMission,advanceOperations,advanceAgentRequests,advanceCharacters,advanceMissingCommanders,advanceDisputes,battlefieldWound,commandFactor,linkCommanders,relieveIncapacitatedCommanders,publicLeaderClaim,addReport,observeArmies,reportedClaimants,supportClaimant,refreshReportConfidence} from './character-system.js?v=54';
import {advanceOffices,officeEffects,governorLoyaltyEffect} from './office-system.js?v=6';
import {advanceConspiracies} from './conspiracies.js?v=7';
import {IDEAS,MATERIALS,BUILDINGS,initializeDevelopment,advanceDevelopment,activeEffects,localBuildingEffects,knowledgeTrade,sellKnowledge,exchangeKnowledge,inviteForeignScholars,researchInnovation,adoptIdea,removeIdea,expandIdeaSlot,startConstruction,constructionCheck,purchaseMaterials} from './development.js?v=2';
import {initializeReports,recordEvent,recordControl,recordBattle,recordSiege,recordMovement,recordDiplomacy,recordRebellion,updateObjectives,beginBriefing,finishBriefing} from './campaign-reports.js';
import {advanceRecon,assessment,sendScouts,latestRecon} from './reconnaissance.js?v=2';
import {grandRegionsFrom,GRAND_ROUTES} from './grand-map-data.js';
import {grandAdjacent,grandRoute,edgeMonths,armySupply,advanceOperationalState,encircled,flankFactor,canEmbark,supplyBottlenecks} from './grand-operations.js?v=2';
import {initializeLocalSociety,faithSatisfaction,advanceDemography,advanceReligion,setReligiousPolicy} from './local-society.js';
import {initializeFigures,advanceFigures} from './great-figures.js';
import {initializeNaval,advanceNaval,commitArmyTransport} from './naval.js?v=3';
import {initializeAchievements,evaluateAchievements,endCampaign} from './achievement-system.js';
export {endCampaign,revealedAchievements} from './achievement-system.js';
export {SEA_ZONES,SHIPS,NAVAL_JOBS,portZone,seaRoute,fleet,queueShip,appointFleet,dismissFleetCommander,appointNavalJob,dismissNavalJob,orderFleet,reportedHostileFleets,supportPirates} from './naval.js?v=3';
export {recruitFigure,figureStatus,figureActive} from './great-figures.js';
export {holdPosition,strategicRetreat,armySupply,encircled,supplyNetwork,navalCapacity,availableNavalLift,supplyBottlenecks} from './grand-operations.js?v=2';
export {knowledgeTrade,sellKnowledge,exchangeKnowledge,inviteForeignScholars,researchInnovation,adoptIdea,removeIdea,expandIdeaSlot,startConstruction,constructionCheck,purchaseMaterials};
export {setReligiousPolicy};
export {queueMission};
export {personalDiplomaticCredit};

const clone = value => JSON.parse(JSON.stringify(value));
export const region = (s,id) => s.regions.find(r=>r.id===id);
export const army = (s,id) => s.armies.find(a=>a.id===id);
export const adjacent = (id,s) => s?.grandMap?grandAdjacent(id):ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>({to:r[0]===id?r[1]:r[0],sea:r[2]==='sea'}));
const rnd = s => {s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296};
const log = (s,en,zh) => {s.log.unshift({month:s.month,year:s.year,en,zh});s.log=s.log.slice(0,80)};
export const isWar = (s,a,b) => a!==b && s.wars.some(w=>w.includes(a)&&w.includes(b));
export const PLAYABLE = ['caesar','senate','egypt','numidia','mauretania','armenia','parthia','galatia','bosporus'];
const pair = (a,b) => [a,b].sort().join(':');
export const relation = (s,a,b) => s.relations[pair(a,b)] ?? 0;
export const isAllied = (s,a,b) => s.alliances.some(p=>p.includes(a)&&p.includes(b));
const strength = (s,id) => s.armies.filter(a=>a.owner===id).reduce((v,a)=>v+a.men,0);

export function newGame(player='caesar'){
  if(!PLAYABLE.includes(player))throw new Error('Invalid playable faction');
  const s=initializeWorld({version:3,seed:49049,year:-49,month:1,mode:'historical',player,relations:{'caesar:numidia':-30,'caesar:mauretania':20,'caesar:parthia':-10,'numidia:senate':25,'galatia:senate':25},alliances:[],
    regions:clone(REGIONS),armies:clone(INITIAL_ARMIES).map(a=>({...a,move:null,siege:null})),
    factions:{
      caesar:{treasury:90,food:65,manpower:22000,stability:58,legitimacy:49,tax:'normal',research:0,navalLift:1},
      senate:{treasury:135,food:100,manpower:34000,stability:57,legitimacy:68,tax:'normal',research:0,navalLift:2},
      egypt:{treasury:85,food:90,manpower:9000,stability:64,legitimacy:60,tax:'normal',research:0,navalLift:2},
      ...Object.fromEntries(['numidia','mauretania','armenia','parthia','galatia','bosporus'].map(id=>[id,{treasury:60,food:60,manpower:9000,stability:65,legitimacy:60,tax:'normal',research:0,navalLift:['numidia','mauretania','bosporus'].includes(id)?1:0}])),
      rebels:{treasury:10,food:15,manpower:0,stability:50,legitimacy:0,tax:'normal',research:0}
    },wars:[['caesar','senate']],log:[],victory:false,nextArmy:1});
  s.legacyRunId=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
  s.startYear=s.year;s.startMonth=s.month;
  // A new campaign starts with frontier observations, not every foreign army's
  // exact opening location. Existing saves keep their accumulated sightings.
  for(const targets of Object.values(s.knowledge))for(const knowledge of Object.values(targets))knowledge.sightings={};
  linkCommanders(s);observeArmies(s);initializeReports(s);updateObjectives(s,true);initializeFigures(initializeDevelopment(initializeGovernments(s)));initializeAchievements(s);s.briefingBaseline=beginBriefing(s);return s;
}
export function convertToGrandMap(s){
 if(s.grandMap)return s;
 const pending=s.armies.filter(a=>a.move).map(a=>({army:a,destination:a.move.to}));
 s.regions=grandRegionsFrom(s.regions);s.grandMap=true;s.mapVersion=2;initializeLocalSociety(s);
 for(const {army:unit,destination} of pending){const plan=grandRoute(s,unit,destination,isWar);if(!plan?.path.length){unit.move=null;unit.attackIntel=null;continue}const [first,...rest]=plan.path;unit.move={to:first.id,remaining:first.months,sea:first.sea,path:rest,final:destination};unit.attackIntel=null}
 initializeNaval(s);s.briefingBaseline=beginBriefing(s);return s;
}
export function newGrandGame(player='caesar'){const state=convertToGrandMap(newGame(player));initializeNaval(state);state.startYear=state.year;state.startMonth=state.month;return state}

function importedRunId(s){const source=JSON.stringify(s);let a=2166136261,b=0x9e3779b9;for(let i=0;i<source.length;i++){const code=source.charCodeAt(i);a=Math.imul(a^code,16777619);b=Math.imul(b^code,2246822519)}return `legacy-import-${(a>>>0).toString(16)}-${(b>>>0).toString(16)}`}

// Add newly modeled courts to older campaigns without resetting existing people or territory.
function migrateRegionalPowers(s){
 initializeWorld(s);const added=[];for(const id of ['galatia','bosporus']){if(s.factions[id])continue;added.push(id);s.factions[id]={treasury:60,food:60,manpower:9000,stability:65,legitimacy:60,tax:'normal',research:0};if(!s.regions.some(r=>r.id===id))s.regions.push(clone(REGIONS.find(r=>r.id===id)));if(!s.armies.some(a=>a.id===id+'army'))s.armies.push({...clone(INITIAL_ARMIES.find(a=>a.id===id+'army')),move:null,siege:null});const leader=OPENING_LEADERS[id][0],person=s.world.characters[leader];s.world.leadership[id]=person?.alive?[leader]:[];if(person&&person.faction==null){person.faction=id;if(person.location==null&&!person.missing)person.location=id}}
 if(added.length){for(const actor of Object.keys(s.factions)){s.knowledge[actor]||={};for(const target of Object.keys(s.factions)){if(!s.knowledge[actor][target])s.knowledge[actor][target]={reportedLeaders:clone(OPENING_LEADERS[target]||[]),reports:[],sightings:{}}}}if(added.includes('galatia')&&s.relations['galatia:senate']===undefined)s.relations['galatia:senate']=25}
}
export function upgradeSave(s){
 if(!s.legacyRunId)s.legacyRunId=importedRunId(s);
 if(s.year===0)s.year=1;
 if(s.version===2){const old=s.relations||{},oldAllies=s.alliances||[];s.relations=Object.fromEntries(Object.entries(old).map(([id,value])=>[pair('caesar',id),value]));s.alliances=oldAllies.map(id=>['caesar',id]);s.version=3}
 if(s.version!==3)throw new Error('Unsupported save');migrateRegionalPowers(s);initializeReports(s);updateObjectives(s,true);initializeFigures(initializeDevelopment(refreshReportConfidence(initializeGovernments(s))));initializeLocalSociety(s);initializeNaval(s);initializeAchievements(s);s.briefingBaseline ||= beginBriefing(s);return s;
}

export function previewMarch(s,armyId,destination){
  const a=army(s,armyId); const target=region(s,destination);
  if(!a||!target||a.men<=0||a.move||a.siege||a.reconPending)return {ok:false,reason:'unavailable'};
  if(s.grandMap){const plan=grandRoute(s,a,destination,isWar);if(!plan)return {ok:false,reason:'route'};return {ok:true,...plan,terrain:target.terrain,hostile:plan.hostile,food:s.factions[a.owner].food,supply:target.supply}}
  const link=adjacent(a.region).find(e=>e.to===destination);
  if(!link)return {ok:false,reason:'adjacent'};
  if(target.owner!==a.owner&&!isWar(s,a.owner,target.owner))return {ok:false,reason:'peace'};
  const faction=s.factions[a.owner];
  if(link.sea&&faction.treasury<8)return {ok:false,reason:'transport'};
  const start=localBuildingEffects(region(s,a.region)),end=localBuildingEffects(target);
  const months=Math.max(1,(link.sea?3:1)+(target.terrain==='hills'?1:0)+(target.terrain==='desert'?1:0)-(link.sea?Math.min(1,(start.seaSpeed||0)+(end.seaSpeed||0)):Math.min(1,(start.march||0)+(end.march||0))));
  return {ok:true,months,sea:!!link.sea,terrain:target.terrain,hostile:target.owner!==a.owner,food:faction.food,supply:target.supply};
}

export function moveArmy(s,armyId,destination){
  const estimate=previewMarch(s,armyId,destination);
  if(!estimate.ok)return estimate;
  if(s.grandMap){const a=army(s,armyId),first=estimate.path[0];let transport=null;if(first.sea){transport=commitArmyTransport(s,a,region(s,a.region),region(s,first.id));if(!transport.ok)return transport;s.factions[a.owner].treasury-=8}a.stance=null;a.prepared=0;a.move={to:first.id,remaining:first.months,sea:first.sea,path:estimate.path.slice(1),final:destination,...(transport?{transportFleetId:transport.fleetId,transportReady:false}:{})};a.attackIntel=region(s,first.id).owner!==a.owner?assessment(s,armyId,first.id,{months:first.months,sea:first.sea}):null;if(a.owner===s.player)log(s,`${a.name[0]} began a ${estimate.path.length}-territory march toward ${region(s,destination).name[0]}.`,`${a.name[1]}开始向${region(s,destination).name[1]}行军，途经${estimate.path.length}个战区。`);return {ok:true,path:estimate.path.map(x=>x.id),months:estimate.months}}
  const a=army(s,armyId),target=region(s,destination),link=adjacent(a.region).find(e=>e.to===destination);
  if(link.sea)s.factions[a.owner].treasury-=8;
  const months=estimate.months;
  a.move={to:destination,remaining:months,sea:link.sea};
  a.attackIntel=estimate.hostile?assessment(s,armyId,destination,estimate):null;
  if(a.owner===s.player)log(s,`${a.name[0]} marched toward ${target.name[0]} (${months} month${months>1?'s':''}).`,`${a.name[1]}向${target.name[1]}行军（${months}个月）。`);
  return {ok:true};
}

export function recruit(s,regionId,owner=s.player){
  const r=region(s,regionId),f=s.factions[owner];
  const effects=activeEffects(s,owner),local=r?localBuildingEffects(r):{};
  const cost=Math.max(12,24-(local.recruitCost||0));
  if(!r||r.owner!==owner||f.treasury<cost||f.manpower<3000||f.food<6)return false;
  f.treasury-=cost;f.manpower-=3000;f.food-=6;
  const id=`levy${s.nextArmy++}`;
  const roman=owner==='caesar'||owner==='senate';
  s.armies.push({id,name:roman?['Newly raised legion','新编军团']:['Newly raised forces','新征召军队'],owner,region:regionId,men:3000,morale:Math.min(100,58+(effects.recruitMorale||0)+(local.recruitMorale||0)),skill:1,experience:0,commander:['Unnamed officer','未具名军官'],move:null,siege:null});
  r.loyalty=Math.max(0,r.loyalty-3);
  if(owner===s.player){log(s,`New forces were raised in ${r.name[0]}.`,`在${r.name[1]}征召了新军队。`);recordEvent(s,{type:'recruitment',category:'military',severity:'routine',factionId:owner,regionId:r.id,armyId:id})}
  if(owner===s.player)updateObjectives(s);
  return true;
}

export function setTax(s,owner,level){
  if(!['low','normal','high'].includes(level)||!s.factions[owner])return false;
  s.factions[owner].tax=level;
  log(s,`${FACTIONS[owner].short[0]} set ${level} taxation.`,`${FACTIONS[owner].short[1]}实行${{low:'低',normal:'标准',high:'高'}[level]}税率。`);
  return true;
}

export function diplomacy(s, actor, target, action){
  if(actor===target || !s.factions[actor] || !s.factions[target] || target==='rebels'||actor==='rebels' || !s.regions.some(r=>r.owner===actor) || !s.regions.some(r=>r.owner===target))return false;
  const key=pair(actor,target);
  if(action==='improve' && !isWar(s,actor,target) && s.factions[actor].treasury>=10){s.factions[actor].treasury-=10;s.relations[key]=Math.min(100,relation(s,actor,target)+15+(activeEffects(s,actor).diplomacy||0));log(s,`${FACTIONS[actor].short[0]} improved relations with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}改善了与${FACTIONS[target].short[1]}的关系。`);recordDiplomacy(s,actor,target,action);return true}
  if(action==='alliance' && !isWar(s,actor,target) && relation(s,actor,target)+personalDiplomaticCredit(s,actor,target)>=30 && !isAllied(s,actor,target) && !s.wars.some(w=>(w.includes(actor)&&isAllied(s,target,w.find(x=>x!==actor)))||(w.includes(target)&&isAllied(s,actor,w.find(x=>x!==target))))){s.alliances.push([actor,target]);log(s,`${FACTIONS[actor].short[0]} allied with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}与${FACTIONS[target].short[1]}结盟。`);recordDiplomacy(s,actor,target,action);return true}
  if(action==='break' && isAllied(s,actor,target)){s.alliances=s.alliances.filter(p=>!(p.includes(actor)&&p.includes(target)));s.relations[key]=relation(s,actor,target)-20;log(s,`${FACTIONS[actor].short[0]} broke its alliance with ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}解除了与${FACTIONS[target].short[1]}的同盟。`);recordDiplomacy(s,actor,target,action);return true}
  if(action==='war' && !isWar(s,actor,target)){
    if(isAllied(s,actor,target))return false;
    s.wars.push([actor,target]);const firstNewWar=s.wars.length;
    for(const p of s.alliances.filter(p=>p.includes(target))){const ally=p.find(x=>x!==target);if(ally!==actor&&!isWar(s,ally,actor)&&!isAllied(s,ally,actor))s.wars.push([ally,actor])}
    for(const p of s.alliances.filter(p=>p.includes(actor))){const ally=p.find(x=>x!==actor);if(ally!==target&&!isWar(s,ally,target)&&!isAllied(s,ally,target))s.wars.push([ally,target])}
    s.relations[key]=-60;
    s.factions[actor].legitimacy=Math.max(0,s.factions[actor].legitimacy-5);
    log(s,`${FACTIONS[actor].short[0]} declared war on ${FACTIONS[target].short[0]}.`,`${FACTIONS[actor].short[1]}向${FACTIONS[target].short[1]}宣战。`);
    recordDiplomacy(s,actor,target,action);
    for(const [ally,enemy] of s.wars.slice(firstNewWar))if([ally,enemy].includes(s.player)&&![actor,target].includes(s.player)){recordDiplomacy(s,ally,enemy,'war');log(s,`An alliance drew ${FACTIONS[s.player].short[0]} into war with ${FACTIONS[enemy===s.player?ally:enemy].short[0]}.`,`同盟使${FACTIONS[s.player].short[1]}与${FACTIONS[enemy===s.player?ally:enemy].short[1]}交战。`)}
    return true;
  }
  if(action==='peace' && isWar(s,actor,target)){
    // The responding government knows its own forces, but judges the sender by its reports.
    if(estimatedStrength(s,target,actor)*(1+(activeEffects(s,actor).diplomacyPressure||0)/100)<strength(s,target)*.6 && s.factions[target].stability>35)return false;
    s.wars=s.wars.filter(w=>!(w.includes(actor)&&w.includes(target)));
    s.relations[key]=-20;
    for(const a of s.armies.filter(a=>a.owner===actor||a.owner===target)){
      const other=a.owner===actor?target:actor;
      if(a.move && region(s,a.move.to).owner===other)a.move=null;
      if(a.siege && region(s,a.siege.region).owner===other)a.siege=null;
      if(region(s,a.region).owner===other){const destination=s.regions.filter(r=>r.owner===a.owner).sort((x,y)=>Math.hypot(x.x-region(s,a.region).x,x.y-region(s,a.region).y)-Math.hypot(y.x-region(s,a.region).x,y.y-region(s,a.region).y))[0];if(destination){a.region=destination.id;a.move=null;a.siege=null;a.attackIntel=null}}
    }
    log(s,`${FACTIONS[actor].short[0]} and ${FACTIONS[target].short[0]} made peace; current control remains.`,`${FACTIONS[actor].short[1]}与${FACTIONS[target].short[1]}议和，维持现有控制。`);
    recordDiplomacy(s,actor,target,action);
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
 armenia:['Artavasdes II, king','阿尔塔瓦兹德二世，国王'],parthia:['Orodes II, king','奥罗德二世，国王'],galatia:['Deiotarus, Galatian king','代奥塔鲁斯，加拉太国王'],bosporus:['Pharnaces II, king','法尔纳刻斯二世，国王']
};
const letterMonths={senate:2,caesar:2,egypt:4,numidia:3,mauretania:4,armenia:5,parthia:5,galatia:4,bosporus:5};
export function sendInquiry(s,actor,target,subject='leaders'){
 if(!['leaders','successor','availability','representative'].includes(subject))return {ok:false,reason:'subject'};
 if(actor===target||!s.factions[actor]||!courtReports[target]||!s.regions.some(r=>r.owner===actor)||!s.regions.some(r=>r.owner===target))return {ok:false,reason:'unavailable'};
 if(s.factions[actor].treasury<3)return {ok:false,reason:'treasury'};
 if((s.inquiries||[]).some(x=>x.actor===actor&&x.target===target&&x.status==='pending'))return {ok:false,reason:'pending'};
 const duration=letterMonths[target]||4;s.factions[actor].treasury-=3;
 (s.inquiries||=[]).unshift({actor,target,sentYear:s.year,sentMonth:s.month,remaining:duration,duration,subject,status:'pending',source:'official court',confidence:'unverified'});
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
   if(roll<.18||!s.regions.some(r=>r.owner===letter.target))sealed.status='no_reply';
   else if(roll<(hostile?.65:rel<0?.46:.34))sealed.status='refused';
   else{
   const current=s.world.leadership[letter.target]||[],opening=OPENING_LEADERS[letter.target]||[],claimants=s.world.claimants[letter.target]||[],subject=letter.subject||'leaders';
   const stated=hostile&&opening.some(id=>!current.includes(id))?opening:current;
   const plan=s.world.successionPlans?.[letter.target],candidate=s.world.characters[plan];
   const disclose=subject==='successor'&&!hostile&&rel>=30&&roll>=.75&&!claimants.length&&candidate?.alive&&!candidate.missing&&candidate.faction===letter.target&&!current.includes(plan)&&CHARACTER_CATALOG[plan];
   if(subject==='successor'){
    sealed.claim=disclose?[`The court names ${CHARACTER_CATALOG[plan].name[0]} as a possible successor.`,`宫廷称${CHARACTER_CATALOG[plan].name[1]}为可能的继任人选。`]:['The reply did not name a successor.','回信没有指明继任人选。'];
    sealed.report={kind:'succession',value:disclose?plan:'unknown'};
   }else if(subject==='availability')sealed.claim=['The court has made no binding commitment to a meeting.','宫廷尚未就会面作出承诺。'];
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
  letter.status=reply.status;delete letter.sealed;
  if(reply.status==='no_reply'){if(letter.actor===s.player)log(s,`No reply has arrived from ${FACTIONS[letter.target].short[0]}; the letter or answer may have been lost.`,`来自${FACTIONS[letter.target].short[1]}的回信尚未到达；书信或回信可能遗失。`)}
  else if(reply.status==='refused'){if(letter.actor===s.player)log(s,`A reply from ${FACTIONS[letter.target].short[0]} declined to answer.`,`${FACTIONS[letter.target].short[1]}回信表示不愿回答。`)}
  else{letter.claim=reply.claim;letter.responseYear=reply.year;letter.responseMonth=reply.month;letter.reportYear=s.year;letter.reportMonth=s.month;
   if(reply.report)addReport(s,letter.actor,letter.target,{...reply.report,source:'official',confidence:'unverified',reliability:'unknown',observationYear:reply.year,observationMonth:reply.month});
   if(letter.actor===s.player)log(s,`An unverified official response arrived from ${FACTIONS[letter.target].short[0]}.`,`收到${FACTIONS[letter.target].short[1]}的官方答复，内容尚未经独立核实。`);
  }
 }
}

export function resolveBattle(s,attacker,defender,target){
  const terrain={plain:1,hills:1.2,forest:1.12,urban:1.25,desert:1.06}[target.terrain];
  const supplyA=Math.min(1,Math.max(.65,s.factions[attacker.owner].food/20))*(s.grandMap?armySupply(s,attacker):1);
  const supplyD=Math.min(1,Math.max(.65,s.factions[defender.owner].food/20))*(s.grandMap?armySupply(s,defender):1);
  linkCommanders(s);relieveIncapacitatedCommanders(s);const commandA=commandFactor(s,attacker),commandD=commandFactor(s,defender),transport=s.naval?.fleets.find(f=>f.id===attacker.move?.transportFleetId),escort=transport&&Object.entries(transport.ships).some(([kind,count])=>['light','trireme','quadrireme','quinquereme'].includes(kind)&&count>0)?.05:0,landingFactor=attacker.move?.sea&&target.owner!==attacker.owner?Math.max(.65,.88-target.fort*.03+escort):1;const powerA=attacker.men*(.65+attacker.morale/200+attacker.skill*.055+attacker.experience*.025)*supplyA*commandA*flankFactor(s,attacker,target)*landingFactor*(1+(activeEffects(s,attacker.owner).combatAttack||0));
  const powerD=defender.men*(.65+defender.morale/200+defender.skill*.055+defender.experience*.025)*terrain*(1+target.fort*.12)*supplyD*commandD*(1+(defender.prepared||0)*.06)*(1+(activeEffects(s,defender.owner).combatDefense||0));
  const roll=.85+rnd(s)*.3;
  const attackerWins=powerA*roll>powerD;
  const lossA=Math.min(attacker.men,Math.round(defender.men*(attackerWins?.19:.31)*(powerD/powerA)**.25));
  const lossD=Math.min(defender.men,Math.round(attacker.men*(attackerWins?.34:.19)*(powerA/powerD)**.25));
  const report={year:s.year,month:s.month,region:target.id,preBattleIntel:attacker.attackIntel||null,landingFactor,attacker:{name:[...attacker.name],commander:[...attacker.commander],owner:attacker.owner,men:attacker.men,morale:attacker.morale,experience:attacker.experience,supply:supplyA,commandFactor:commandA,food:s.factions[attacker.owner].food,power:Math.round(powerA)},defender:{name:[...defender.name],commander:[...defender.commander],owner:defender.owner,men:defender.men,morale:defender.morale,experience:defender.experience,supply:supplyD,commandFactor:commandD,food:s.factions[defender.owner].food,power:Math.round(powerD)},terrain:target.terrain,fort:target.fort,roll,attackerWins,lossA,lossD};
  report.combatEstimate={attacker:[Math.max(0,Math.floor(attacker.men*.7/500)*500),Math.ceil(attacker.men*1.3/500)*500],defender:[Math.max(0,Math.floor(defender.men*.7/500)*500),Math.ceil(defender.men*1.3/500)*500]};
  report.attacker.remaining=Math.max(0,attacker.men-lossA);report.defender.remaining=Math.max(0,defender.men-lossD);
  report.id=`battle-${initializeReports(s).nextBattle++}`;
  (s.battles ||= []).unshift(report);
  for(const observer of [attacker,defender]){const [min,max]=report.combatEstimate[observer===attacker?'defender':'attacker'];(s.militaryRecon||=[]).unshift({owner:observer.owner,armyId:observer.id,regionId:target.id,year:s.year,month:s.month,observationYear:s.year,observationMonth:s.month,arrivalYear:s.year,arrivalMonth:s.month,source:'battle',min,max,confidence:'confirmed',reliability:'high',positions:'battlefield contact',defensive:{fort:target.fort},misinformationRisk:'low'});s.militaryRecon.length=Math.min(80,s.militaryRecon.length)}
  recordBattle(s,report,attacker,defender);
  const previousOwner=target.owner;
  attacker.men-=lossA;defender.men-=lossD;for(const unit of [attacker,defender]){const person=s.world.characters[unit.characterId];if(person?.alive)person.battlesCommanded=(Number.isFinite(person.battlesCommanded)?person.battlesCommanded:0)+1}battlefieldWound(s,attacker);battlefieldWound(s,defender);
  attacker.morale=Math.max(20,attacker.morale+(attackerWins?7:-16));
  defender.morale=Math.max(20,defender.morale+(attackerWins?-16:7));
  if(attackerWins){
    defender.siege=null;
    defender.region=adjacent(target.id,s).map(e=>region(s,e.to)).find(r=>r.owner===defender.owner)?.id||target.id;
    if(defender.region===target.id)defender.men=0;
    const remaining=s.armies.some(other=>other.id!==attacker.id&&other.id!==defender.id&&other.men>0&&other.region===target.id&&!other.move&&isWar(s,attacker.owner,other.owner));
    if(!remaining){attacker.region=target.id;target.owner=attacker.owner;target.loyalty=38;recordControl(s,target,previousOwner,'battle',{armyId:attacker.id,battleId:report.id,attacker:attacker.owner,defender:defender.owner})}
  } else {
    attacker.siege=null;
    attacker.region=adjacent(target.id,s).map(e=>region(s,e.to)).find(r=>r.owner===attacker.owner)?.id||attacker.region;
  }
  attacker.move=null;attacker.experience=Math.min(5,attacker.experience+1);
  attacker.attackIntel=null;
  defender.experience=Math.min(5,defender.experience+1);
  if(attacker.owner===s.player||defender.owner===s.player){const ownLoss=attacker.owner===s.player?lossA:lossD;log(s,`${FACTIONS[attacker.owner].short[0]} ${attackerWins?'won':'lost'} at ${target.name[0]}. Casualties: own ${ownLoss.toLocaleString()}; enemy unknown.`,`${FACTIONS[attacker.owner].short[1]}在${target.name[1]}${attackerWins?'获胜':'战败'}。己方伤亡：${ownLoss.toLocaleString()}；敌方伤亡未知。`)}
  report.ownerAfter=target.owner;
  for(const lost of s.armies.filter(a=>a.men<=0&&a.characterId)){
    const person=s.world.characters[lost.characterId];if(!person||!person.alive)continue;person.location=null;person.missing={origin:target.id,remaining:3,year:s.year,month:s.month};
    if(lost.owner===s.player)log(s,`${CHARACTER_CATALOG[person.id].name[0]}'s location is unknown after the army was destroyed.`,`${CHARACTER_CATALOG[person.id].name[1]}的军队覆灭后，其位置不明。`);
  }
  for(const lost of s.armies.filter(a=>a.men<=0&&a.owner===s.player))recordEvent(s,{type:'armyDestroyed',category:'military',severity:'critical',factionId:lost.owner,regionId:target.id,armyId:lost.id,armyName:[...lost.name],battleId:report.id});
  s.armies=s.armies.filter(a=>a.men>0);
  return attackerWins;
}

function arrive(s,a){
  if(a.move.transportFleetId&&!a.move.transportReady){a.move.remaining=0;return}
  const target=region(s,a.move.to);
  const remainingPath=a.move.path||[];
  if(target.owner!==a.owner&&!isWar(s,a.owner,target.owner)){a.move=null;a.attackIntel=null;return}
  const enemy=s.armies.find(other=>other.id!==a.id&&other.region===target.id&&other.owner!==a.owner&&isWar(s,a.owner,other.owner)&&!other.move);
  if(enemy){resolveBattle(s,a,enemy,target);return}
  if(target.owner!==a.owner&&a.men<500){a.move=null;a.attackIntel=null;if(a.owner===s.player)log(s,`${a.name[0]} lacks the force to occupy ${target.name[0]}.`,`${a.name[1]}兵力不足，无法占领${target.name[1]}。`);return}
  const siegeReduction=localBuildingEffects(region(s,a.region)).siegeReduction||0;
  const from=a.region;a.region=target.id;a.move=null;a.attackIntel=null;recordMovement(s,a,from);
  if(target.owner!==a.owner){
    if(target.fort>0){a.siege={region:target.id,remaining:Math.max(1,target.fort*2-siegeReduction)};recordSiege(s,target,a,'begun');if(a.owner===s.player||target.owner===s.player)log(s,`${a.name[0]} began a siege at ${target.name[0]}.`,`${a.name[1]}开始围攻${target.name[1]}。`)}
    else {const previousOwner=target.owner,witnessed=a.owner===s.player||target.owner===s.player;target.owner=a.owner;target.loyalty=38;recordControl(s,target,previousOwner,'occupation',{armyId:a.id,attacker:a.owner});if(witnessed)log(s,`${FACTIONS[a.owner].short[0]} occupied ${target.name[0]}.`,`${FACTIONS[a.owner].short[1]}占领了${target.name[1]}。`)}
  }
  if(s.grandMap&&remainingPath.length&&!a.siege){
    const [next,...rest]=remainingPath,destination=region(s,next.id);
    if(destination&&(destination.owner===a.owner||isWar(s,a.owner,destination.owner))&&(!next.sea||canEmbark(s,a,region(s,a.region),destination))){
      let transport=null;
      if(next.sea){transport=commitArmyTransport(s,a,region(s,a.region),destination);if(!transport.ok)return;s.factions[a.owner].treasury-=8}
      a.attackIntel=destination.owner!==a.owner?assessment(s,a.id,next.id,{months:next.months,sea:next.sea}):null;
      a.move={to:next.id,remaining:next.months,sea:next.sea,path:rest,final:rest.length?rest.at(-1).id:next.id,...(transport?{transportFleetId:transport.fleetId,transportReady:false}:{})};
    }
  }
}

function economy(s){
  for(const [id,f] of Object.entries(s.factions)){
    const owned=s.regions.filter(r=>r.owner===id),administrativeUnits=s.grandMap?new Set(owned.map(r=>r.macro)).size:owned.length;
    const offices=officeEffects(s,id),effects=id==='rebels'?{}:activeEffects(s,id);
    const buildings=owned.map(r=>({r,e:localBuildingEffects(r)}));
    const troops=s.armies.filter(a=>a.owner===id).reduce((n,a)=>n+a.men,0);
    const rate={low:.65,normal:1,high:1.4}[f.tax];
    f.treasury+=Math.round(owned.reduce((n,r)=>n+r.tax*rate*(r.loyalty/100)*(s.grandMap?Math.max(.65,Math.min(1.35,r.population/(r.initialPopulation||r.population))):1),0)-troops/1100)+offices.treasury+(effects.treasury||0)+buildings.reduce((n,x)=>n+(x.e.treasury||0)-(x.e.upkeep||0),0)-(effects.upkeep||0);
    f.food+=Math.round(owned.reduce((n,r)=>n+r.food,0)-troops/1200-administrativeUnits*2)+offices.food+(effects.food||0)+buildings.reduce((n,x)=>n+(x.e.food||0),0);
    f.stability=Math.max(0,Math.min(100,f.stability+offices.stability+(effects.stability||0)+buildings.reduce((n,x)=>n+(x.e.stability||0),0)));
    f.legitimacy=Math.max(0,Math.min(100,f.legitimacy+buildings.reduce((n,x)=>n+(x.e.legitimacy||0),0)));
    f.manpower+=Math.round(administrativeUnits*170*(s.grandMap?Math.max(.6,Math.min(1.2,owned.reduce((n,r)=>n+(r.civicSatisfaction??60),0)/Math.max(1,owned.length)/60)):1))+(effects.manpower||0);
    if(f.treasury<0){f.stability=Math.max(0,f.stability-3);s.armies.filter(a=>a.owner===id).forEach(a=>a.morale=Math.max(20,a.morale-4))}
    if(f.food<0){f.stability=Math.max(0,f.stability-3);s.armies.filter(a=>a.owner===id).forEach(a=>a.men=Math.max(1,Math.round(a.men*.96)))}
    f.treasury=Math.max(-100,Math.round(f.treasury));
    f.foodCapacity=100+administrativeUnits*25+buildings.reduce((n,x)=>n+(x.e.foodCapacity||0),0);
    f.food=Math.max(-100,Math.min(f.foodCapacity,Math.round(f.food)));
    owned.forEach(r=>{const governor=governorLoyaltyEffect(s,r.id),works=localBuildingEffects(r);if(s.grandMap){r.civicSatisfaction=Math.max(0,Math.min(100,(r.civicSatisfaction??r.loyalty)+({low:2,normal:0,high:-2}[f.tax])+(f.food<0?-3:0)+(works.loyalty||0)+faithSatisfaction(s,r)));r.integration=Math.max(0,Math.min(100,(r.integration??60)+(governor>0?1:0)+(works.stability>0?1:0)));}r.loyalty=Math.max(0,Math.min(100,r.loyalty+({low:1,normal:0,high:-2}[f.tax])+(f.food<0?-2:0)+governor+(effects.loyalty||0)+(works.loyalty||0)+(s.grandMap?(r.civicSatisfaction<30?-1:r.civicSatisfaction>75?1:0)+(r.integration<35?-1:0):0)))});
  }
  advanceDemography(s);
}

function seasonalWaterStress(s){
  if(s.month!==7)return;
  for(const r of s.regions){
    if(!['plain','desert'].includes(r.terrain)||r.owner==='rebels')continue;
    const marker=[...r.id].reduce((n,c)=>n+c.charCodeAt(0),0)+Math.abs(s.year)*7;
    if(marker%9!==0)continue;
    const protection=(r.buildings||[]).includes('dam')?6:(r.buildings||[]).includes('reservoir')?4:(r.buildings||[]).includes('irrigation')?3:0;
    const loss=Math.max(0,8-protection);
    s.factions[r.owner].food=Math.max(-100,s.factions[r.owner].food-loss);
    if(r.owner===s.player)log(s,`Water stress in ${r.name[0]} cost ${loss} food after local works.`,`水源紧张使${r.name[1]}损失${loss}粮食（水利工程已计入）。`);
  }
}

function rebellion(s){
  const candidate=s.regions.find(r=>r.owner!=='rebels'&&r.loyalty<25&&s.factions[r.owner].stability<60&&!s.armies.some(a=>a.region===r.id&&a.owner===r.owner));
  if(!candidate)return;
  const previousOwner=candidate.owner;
  candidate.owner='rebels';candidate.loyalty=45;
  s.armies.push({id:`rebel${s.nextArmy++}`,name:['Provincial uprising','行省起义军'],owner:'rebels',region:candidate.id,men:2400,morale:59,skill:1,experience:0,commander:['Local leaders','地方首领'],move:null,siege:null});
  if(!isWar(s,'rebels',previousOwner))s.wars.push(['rebels',previousOwner]);recordRebellion(s,candidate,previousOwner,s.armies.at(-1).id);recordControl(s,candidate,previousOwner,'rebellion',{armyId:s.armies.at(-1).id});
  log(s,`${candidate.name[0]} has risen in rebellion and formed an armed faction.`,`${candidate.name[1]}爆发叛乱，形成了武装派系。`);
}

function shortestStep(s,start,goal,owner){
  const queue=[[start,null]],seen=new Set([start]);
  while(queue.length){const [id,first]=queue.shift();if(id===goal)return first;
    for(const e of adjacent(id,s)){if(seen.has(e.to))continue;const r=region(s,e.to);if(r.owner!==owner&&!isWar(s,owner,r.owner))continue;seen.add(e.to);queue.push([e.to,first||e.to])}}
  return null;
}

// AI uses its own reports and approximate sightings, never the real enemy roster.
// After two years, a numerical report fades gradually toward an uncertain prior.
export function estimatedStrength(s,observer,target){
 const k=s.knowledge?.[observer]?.[target],now=s.year*12+s.month,age=x=>now-((x.observationYear??x.year)*12+(x.observationMonth??x.month));
 const sightings=Object.values(k?.sightings||{}).filter(x=>age(x)>=0&&age(x)<=24).length,prior=4000+Math.min(5,sightings)*1000;
 const latest=(k?.reports||[]).filter(x=>x.kind==='strength'&&Number.isFinite(x.value)&&age(x)>=0).sort((a,b)=>age(a)-age(b))[0];
 if(!latest)return prior;const weight=Math.max(0,Math.min(1,1-(age(latest)-24)/24));return Math.round(prior+(latest.value-prior)*weight);
}
export function aiTurn(s,owner){
  const f=s.factions[owner],owned=s.regions.filter(r=>r.owner===owner);
  if(!owned.length)return;
  const alert=(s.militaryAlerts||[]).find(a=>a.owner===owner&&a.year*12+a.month>=s.year*12+s.month-1&&region(s,a.regionId)?.owner===owner);
  if(alert&&f.treasury>=40&&f.food>=6&&f.manpower>=3000)recruit(s,alert.regionId,owner);
  if(owner!=='rebels'){
    const d=s.development[owner];
    if(!d.research&&f.treasury>55&&s.month%4===0){
      const idea=IDEAS.find(i=>!d.knownIdeas.includes(i.id)&&['military','economy','culture'].includes(i.category));
      const material=MATERIALS.find(i=>!d.knownMaterial.includes(i.id));
      if(idea&&s.month%8===0)researchInnovation(s,owner,'idea',idea.id);
      else if(material)researchInnovation(s,owner,'material',material.id);
    }
    if(!d.adoption&&f.treasury>30){const idea=IDEAS.find(i=>d.knownIdeas.includes(i.id)&&!d.slots[i.category].includes(i.id)&&d.slots[i.category].some(v=>!v));if(idea)adoptIdea(s,owner,idea.id,d.slots[idea.category].indexOf(null))}
    if(f.treasury>120){for(const kind of ['stone','timber','metal'])if(d.materials[kind]<5)purchaseMaterials(s,owner,kind,5);const project=owned.flatMap(site=>BUILDINGS.map(b=>({site,b}))).find(({site,b})=>constructionCheck(s,owner,site.id,b.id).ok);if(project)startConstruction(s,owner,project.site.id,project.b.id)}
    if(s.month%12===0&&f.treasury>75){const seller=Object.keys(s.development).find(id=>id!==owner&&!isWar(s,owner,id)&&relation(s,owner,id)>=0&&s.development[id].knownMaterial.some(k=>!d.knownMaterial.includes(k)));const item=seller&&s.development[seller].knownMaterial.find(k=>!d.knownMaterial.includes(k));if(item)knowledgeTrade(s,owner,seller,'material',item)}
    if(s.month%12===9){
      let sold=false;
      for(const buyer of Object.keys(s.development)){
        if(buyer===owner||buyer===s.player||buyer==='rebels'||isWar(s,owner,buyer)||relation(s,owner,buyer)<15||s.factions[buyer].treasury<12)continue;
        const recipient=s.development[buyer];
        const offers=[...d.knownMaterial.filter(id=>!recipient.knownMaterial.includes(id)&&!recipient.trade.some(t=>t.branch==='material'&&t.id===id)).map(id=>['material',id]),...d.knownIdeas.filter(id=>!recipient.knownIdeas.includes(id)&&!recipient.trade.some(t=>t.branch==='idea'&&t.id===id)).map(id=>['idea',id])];
        for(const [branch,id] of offers)if(sellKnowledge(s,owner,buyer,branch,id).ok){sold=true;break}
        if(sold)break;
      }
    }
    if(s.year>=-48&&s.month===6&&f.treasury>30){const partner=Object.keys(s.development).find(id=>id!==owner&&!isWar(s,owner,id)&&relation(s,owner,id)>=20&&s.development[id].knownIdeas.some(k=>!d.knownIdeas.includes(k))&&d.knownIdeas.some(k=>!s.development[id].knownIdeas.includes(k)));if(partner){const offer=d.knownIdeas.find(k=>!s.development[partner].knownIdeas.includes(k)),want=s.development[partner].knownIdeas.find(k=>!d.knownIdeas.includes(k));exchangeKnowledge(s,owner,partner,'idea',offer,'idea',want)}}
  }
  const enemies=s.regions.filter(r=>isWar(s,owner,r.owner));
  const available=s.armies.filter(a=>a.owner===owner&&!a.move&&!a.siege&&a.men>1200&&(!alert||a.region!==alert.regionId)).sort((a,b)=>b.men-a.men);
  const protectedJunctions=s.grandMap?supplyBottlenecks(s,owner):new Set(),reservedSupport=new Set();
  for(const a of available){
    if(reservedSupport.has(a.id))continue;
    if(s.grandMap){const local=region(s,a.region);if(armySupply(s,a)<.55){const escape=adjacent(a.region,s).filter(e=>!e.sea&&region(s,e.to).owner===owner).map(e=>({to:e.to,supply:armySupply(s,{...a,region:e.to})})).sort((x,y)=>y.supply-x.supply)[0];if(escape?.supply>armySupply(s,a)+.15){a.region=escape.to;a.morale=Math.max(15,a.morale-4);continue}}if((local.port||local.terrain==='urban'||protectedJunctions.has(local.id))&&adjacent(a.region,s).some(e=>isWar(s,owner,region(s,e.to).owner))){a.stance='hold';a.prepared=Math.min(3,(a.prepared||0)+1);if(a.men<estimatedStrength(s,owner,s.wars.find(w=>w.includes(owner))?.find(x=>x!==owner))*.75)continue}}
    const targets=enemies.map(r=>({r,d:Math.hypot(r.x-region(s,a.region).x,r.y-region(s,a.region).y)-(s.grandMap?(r.port?12:0)+(r.terrain==='urban'?15:0)+(r.road?4:0):0)})).sort((x,y)=>x.d-y.d);
    for(const {r} of targets){const step=shortestStep(s,a.region,r.id,owner);if(step&&step!==a.region){const destination=region(s,step),defenderOwner=destination.owner,report=s.year>=-48&&destination.owner!==owner?latestRecon(s,owner,step):null;
      const reconWindow=s.year>=-48&&s.month%3===0,investigate=((s.seed+owner.length+a.id.length+s.month)%5)!==0;
      if(destination.owner!==owner&&(!report||report.age>5)&&f.treasury>=8&&f.food>=4&&reconWindow&&investigate){if(sendScouts(s,a.id,step,owner).ok)break}
      const prior=isWar(s,owner,defenderOwner)?estimatedStrength(s,owner,defenderOwner)/(s.grandMap?1:Math.max(1,s.regions.filter(x=>x.owner===defenderOwner).length)):0;
      const defenders=report?.min!=null?Math.round((report.min+report.max)/2):prior;
      if(defenders>a.men*1.35||f.food<0||s.grandMap&&destination.owner===owner&&armySupply(s,{...a,region:step})<.45)continue;
      const support=s.grandMap&&destination.owner!==owner?available.find(other=>other.id!==a.id&&!reservedSupport.has(other.id)&&!other.move&&other.region!==a.region&&other.men>=1000&&armySupply(s,other)>=.5&&grandAdjacent(other.region).some(edge=>edge.to===step)):null;
      a.coordinated=!!support;const ordered=moveArmy(s,a.id,step);if(ordered.ok){if(support)reservedSupport.add(support.id);break}a.coordinated=false}}
  }
  if(f.treasury>65&&f.manpower>5500&&s.month%4===0){
    const border=owned.find(r=>adjacent(r.id,s).some(e=>isWar(s,owner,region(s,e.to).owner)));
    if(border)recruit(s,border.id,owner);
  }
  if(f.stability<45&&f.treasury>25){f.treasury-=10;f.stability+=3}
  if(owner!=='rebels' && s.month===8 && f.treasury>=25){const enemy=s.wars.find(w=>w.includes(owner))?.find(x=>x!==owner);if(enemy&&enemy!=='rebels')queueMission(s,owner,enemy,'spy','strength')}
  // Rival Roman commands investigate and act on their own reports, not on the
  // concealed state of the Egyptian court. An old report may lead nowhere.
  if(['caesar','senate'].includes(owner)&&s.month===6&&f.treasury>45)queueMission(s,owner,'egypt','spy','claimants');
  if(['caesar','senate'].includes(owner)&&s.month===9&&f.treasury>45)queueMission(s,owner,'parthia','spy','claimants');
  if(['caesar','senate'].includes(owner)&&s.month===12){for(const court of ['egypt','parthia']){if(f.treasury<=35)break;const claimant=reportedClaimants(s,owner,court)[0];if(claimant)supportClaimant(s,owner,court,claimant)}}
  if(owner!=='rebels' && s.month===12){
    const enemy=s.wars.find(w=>w.includes(owner))?.find(x=>x!==owner);
    if(enemy && (f.food<0||f.treasury<0||f.stability<35) && strength(s,owner)>=estimatedStrength(s,owner,enemy)*.6)diplomacy(s,owner,enemy,'peace');
    if(!enemy && f.treasury>35){const neighbor=owned.flatMap(r=>adjacent(r.id,s).map(e=>region(s,e.to))).find(r=>r.owner!==owner&&r.owner!=='rebels'&&relation(s,owner,r.owner)>=0&&!isAllied(s,owner,r.owner));if(neighbor && rnd(s)<.2)diplomacy(s,owner,neighbor.owner,'improve')}
  }
  if(owner!=='rebels' && s.month%6===0 && f.treasury>40 && f.food>10 && strength(s,owner)>2000){
    const border=owned.flatMap(r=>adjacent(r.id,s).map(e=>region(s,e.to))).find(r=>r.owner!==owner&&r.owner!=='rebels'&&!isWar(s,owner,r.owner)&&!isAllied(s,owner,r.owner)&&strength(s,owner)>estimatedStrength(s,owner,r.owner)*1.5&&relation(s,owner,r.owner)<0);
    if(border&&rnd(s)<.18)diplomacy(s,owner,border.owner,'war');
  }
}

export function tick(s){
  if(initializeAchievements(s).finalized)return s;
  initializeWorld(s);initializeDevelopment(s);initializeFigures(s);linkCommanders(s);relieveIncapacitatedCommanders(s);
  const before=s.briefingBaseline||beginBriefing(s);
  s.month++;if(s.month>12){s.month=1;s.year++;if(s.year===0)s.year=1}
  refreshReportConfidence(s);
  advanceRecon(s);advanceFigures(s);
  advanceOffices(s);advanceDevelopment(s,(en,zh)=>log(s,en,zh));advanceReligion(s);economy(s);advanceNaval(s,log);seasonalWaterStress(s);advanceOperationalState(s);
  // Travel and sieges resolve before new AI orders.
  for(const a of [...s.armies]){
    if(!s.armies.includes(a))continue;
    if(a.move){a.move.remaining--;if(a.move.remaining<=0)arrive(s,a)}
    else if(a.siege){const siegeRegion=region(s,a.siege.region);if(!siegeRegion||a.region!==siegeRegion.id||a.men<500||!isWar(s,a.owner,siegeRegion.owner)){a.siege=null;continue}a.siege.remaining--;if(a.siege.remaining<=0){const r=siegeRegion,previousOwner=r.owner,witnessed=a.owner===s.player||r.owner===s.player;r.owner=a.owner;r.loyalty=36;a.siege=null;recordSiege(s,r,a,'completed');recordControl(s,r,previousOwner,'siege',{armyId:a.id,attacker:a.owner});if(witnessed)log(s,`${r.name[0]} surrendered after a siege.`,`${r.name[1]}在围攻后投降。`)}}
  }
  rebellion(s);
  resolveInquiries(s);advanceOperations(s);advanceAgentRequests(s);advanceCharacters(s);relieveIncapacitatedCommanders(s);advanceMissingCommanders(s);advanceDisputes(s);advanceConspiracies(s);advanceGovernments(s);linkCommanders(s);advancePersonalDiplomacy(s);
  observeArmies(s);
  for(const owner of Object.keys(s.factions).filter(id=>id!==s.player))aiTurn(s,owner);
  s.militaryAlerts=(s.militaryAlerts||[]).filter(a=>a.year*12+a.month>=s.year*12+s.month);
  if(!s.victory&&['caesar','senate'].includes(s.player)&&s.regions.every(r=>r.owner!==(s.player==='caesar'?'senate':'caesar'))){s.victory=true;log(s,s.player==='caesar'?'The Pompeian command has collapsed. The campaign continues.':'The Caesarian command has collapsed. The campaign continues.',s.player==='caesar'?'庞培派势力瓦解。战役仍可继续。':'凯撒派势力瓦解。战役仍可继续。')}
  updateObjectives(s);finishBriefing(s,before);s.briefingBaseline=beginBriefing(s);evaluateAchievements(s);
  const noCommand=!s.regions.some(r=>r.owner===s.player)&&!s.armies.some(a=>a.owner===s.player&&a.men>0);
  if(s.terminalResult==='defeat'||noCommand){s.terminalResult='defeat';endCampaign(s,'defeat')}
  return s;
}
