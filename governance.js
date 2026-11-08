import {politicalAmbition,improveLeaderTrust} from './conspiracies.js?v=phase-x-1';
import {initializeWorld,successorFor,CHARACTER_CATALOG,ageRange,successionModel} from './characters.js?v=phase-x-1';
import {recordLifeEvent,dynastyRoll,personAge} from './dynasties.js?v=phase-x-1';
import {FACTIONS} from './data.js?v=phase-x-1';
import {startDynasticWar} from './civil-war.js?v=phase-x-1';

const unable=c=>!c?.alive||!!c.missing||['seriously_ill','dying','deceased'].includes(c.health);
const roman=faction=>faction==='caesar'||faction==='senate';
// Sixteen is a simulation threshold, not a historical claim about when a
// particular court recognized majority. Uncertain ages are not forced into it.
const republican=(s,faction)=>roman(faction)&&successionModel(faction,s)==='republican_command';
const definitelyMinor=(s,faction,id)=>{const age=ageRange(id,s.year);return !republican(s,faction)&&age!==null&&age[1]<16};
// A possible minor is not appointed as a temporary deputy when age is uncertain.
const possiblyMinor=(s,faction,id)=>{const age=ageRange(id,s.year);return !republican(s,faction)&&age!==null&&age[0]<16};
// A deputy must be reachable in a controlled theater. A location stored on a
// marching army is its last theater, not the person's present location.
export const eligibleDeputies=(s,faction)=>successorFor(s,faction).filter(id=>{
 const person=s.world.characters[id],army=s.armies.find(a=>a.characterId===id),location=army?.region??person?.location;
 return !unable(person)&&!possiblyMinor(s,faction,id)&&!person.travel&&
  s.regions.some(r=>r.id===location&&r.owner===faction)&&
  !s.armies.some(a=>a.characterId===id&&a.move)&&
  !(s.world.claimants?.[faction]||[]).includes(id);
});

// This describes the simulated arrangement, not a historical medical or constitutional claim.
export function deriveGovernment(s,faction){
 initializeWorld(s);const nominal=(s.world.leadership[faction]||[]).filter(id=>s.world.characters[id]?.alive&&s.world.characters[id].faction===faction);
 // These are separate kingdoms represented by one campaign faction. Never
 // invent a single shared regency, even if both kings are absent or dead.
 if(faction==='mauretania'){
  const capable=nominal.filter(id=>!unable(s.world.characters[id])&&!definitelyMinor(s,faction,id));
  if(['bocchus','bogud'].some(id=>!nominal.includes(id)))return {kind:'constituent_vacant',nominal,acting:capable};
  if(capable.length<nominal.length)return {kind:'constituent_unavailable',nominal,acting:capable};
  return {kind:'normal',nominal,acting:capable};
 }
 if(!nominal.length)return {kind:'vacant',nominal:[],acting:[]};
 const capable=nominal.filter(id=>!unable(s.world.characters[id])&&!definitelyMinor(s,faction,id));
 if(capable.length===nominal.length)return {kind:'normal',nominal,acting:[...nominal]};
 if(capable.length)return {kind:'co_ruler_acting',nominal,acting:capable};
 const candidates=eligibleDeputies(s,faction),preferred=s.world.appointments?.[faction],guardian=nominal.map(id=>s.world.characters[id]?.guardian).find(id=>candidates.includes(id)),deputy=candidates.includes(preferred)?preferred:guardian||candidates[0];
 return {kind:republican(s,faction)?'acting_command':'regency',nominal,acting:deputy?[deputy]:[]};
}

// These are optional, explicitly simulated postwar constitutional paths.
export function reformRomanGovernment(s,target){
 initializeGovernments(s);const faction=s.player,current=successionModel(faction,s),f=s.factions[faction];
 if(!roman(faction)||!s.victory||!s.regions.some(r=>r.id==='roma'&&r.owner===faction))return {ok:false,reason:'authority'};
 if(target==='roman_principate'&&current!=='republican_command'||target==='later_empire'&&(current!=='roman_principate'||s.year<235)||!['roman_principate','later_empire'].includes(target))return {ok:false,reason:'era'};
 if(f.stability<50||f.legitimacy<50)return {ok:false,reason:'stability'};
 const cost=target==='roman_principate'?35:45;if(f.treasury<cost)return {ok:false,reason:'treasury'};
 f.treasury-=cost;f.stability=Math.max(0,f.stability-5);s.world.romanRegimes||={};s.world.romanRegimes[faction]=target;
 s.world.romanReforms||=[];s.world.romanReforms.push({faction,target,year:s.year,month:s.month,simulated:true});
 s.log.unshift({year:s.year,month:s.month,en:target==='roman_principate'?'A postwar constitutional settlement established a simulated Principate. Dynastic claims now matter alongside appointments, army backing and recognition.':'A later imperial reform established co-emperor appointments and rival court succession in this alternate campaign.',zh:target==='roman_principate'?'战后宪制和解在架空战役中建立元首制。王朝主张与任命、军队支持及承认共同影响继任。':'架空战役中的后期帝国改革允许任命共治皇帝，并可能出现竞争宫廷。'});s.log=s.log.slice(0,80);
 return {ok:true,cost};
}

export function appointCoEmperor(s,id){
 initializeGovernments(s);const faction=s.player,person=s.world.characters[id],model=successionModel(faction,s);
 if(model!=='later_empire'||!successorFor(s,faction).includes(id)||!person?.alive||personAge(s,id)<18)return {ok:false,reason:'eligibility'};
 if(s.world.coEmperors?.[faction]===id)return {ok:false,reason:'already'};
 if(s.factions[faction].treasury<12)return {ok:false,reason:'treasury'};
 s.factions[faction].treasury-=12;s.world.coEmperors||={};s.world.coEmperors[faction]=id;
 if(!s.world.leadership[faction].includes(id))s.world.leadership[faction].push(id);
 s.world.governments[faction]=deriveGovernment(s,faction);
 recordLifeEvent(s,id,'Appointed co-emperor in the simulated later empire.','在模拟的后期帝国中被任命为共治皇帝。');
 return {ok:true,cost:12};
}

export function initializeGovernments(s){
 initializeWorld(s);s.world.appointments||={};s.world.successionPlans||={};s.world.governments||={};for(const faction of Object.keys(s.factions).filter(x=>x!=='rebels'))if(!s.world.governments[faction])s.world.governments[faction]=deriveGovernment(s,faction);return s;
}

export function successionCandidates(s,faction){
 const candidates=successorFor(s,faction);
 if(!['roman_principate','later_empire'].includes(successionModel(faction,s)))return candidates;
 const children=(s.world.leadership[faction]||[]).flatMap(id=>s.world.characters[id]?.children||[]).filter(id=>s.world.characters[id]?.alive&&s.world.characters[id].faction===faction&&!s.world.characters[id].missing&&!s.world.characters[id].asylumHost);
 return [...new Set([...children,...candidates])];
}

// A stored nomination can become temporarily invalid without being erased.
export function validSuccessionPlan(s,faction){
 initializeWorld(s);const id=s.world.successionPlans?.[faction];return id&&successionCandidates(s,faction).includes(id)?id:null;
}

export function withdrawSuccessionPlan(s){
 initializeGovernments(s);const faction=s.player;if(!s.world.successionPlans[faction])return {ok:false,reason:'unavailable'};
 delete s.world.successionPlans[faction];s.log.unshift({year:s.year,month:s.month,en:'The succession designation was withdrawn. Its cost was not refunded.',zh:'继任安排已撤回，已付费用不予退还。'});s.log=s.log.slice(0,80);return {ok:true};
}

export function planSuccession(s,id){
 initializeGovernments(s);const faction=s.player;if(!(s.world.leadership[faction]||[]).some(cid=>s.world.characters[cid]?.alive)||!successionCandidates(s,faction).includes(id))return {ok:false,reason:'unavailable'};
 if(s.world.successionPlans[faction]===id)return {ok:false,reason:'already'};if(s.factions[faction].treasury<5)return {ok:false,reason:'treasury'};
 s.factions[faction].treasury-=5;s.world.successionPlans[faction]=id;recordLifeEvent(s,id,'Designated as a possible successor; succession remains uncertain.','被指定为可能继任者；最终继任仍未确定。');s.log.unshift({year:s.year,month:s.month,en:`${CHARACTER_CATALOG[id].name[0]} was designated as a possible successor in the simulation.`,zh:`${CHARACTER_CATALOG[id].name[1]}在游戏中被指定为可能的继任者。`});s.log=s.log.slice(0,80);return {ok:true,cost:5};
}

// Influence is a game abstraction, not a claim about a historical person's power.
export function supportSuccessor(s,id){
 initializeGovernments(s);const faction=s.player,candidates=successorFor(s,faction),person=s.world.characters[id];
 if(!candidates.includes(id)||!(s.world.leadership[faction]||[]).some(cid=>s.world.characters[cid]?.alive))return {ok:false,reason:'unavailable'};
 if(person.influence>=100)return {ok:false,reason:'maximum'};if(s.factions[faction].treasury<8)return {ok:false,reason:'treasury'};
 s.factions[faction].treasury-=8;person.influence=Math.min(100,person.influence+15);person.ambition=Math.min(100,politicalAmbition(s,id)+5);improveLeaderTrust(s,id);recordLifeEvent(s,id,'Received political backing in the simulated campaign.','在模拟战役中获得政治支持。');
 for(const other of candidates.filter(candidate=>candidate!==id)){const rival=s.world.characters[other];rival.loyalty=Math.max(0,rival.loyalty-3)}
 s.log.unshift({year:s.year,month:s.month,en:`${CHARACTER_CATALOG[id].name[0]} gained political influence in the simulation.`,zh:`${CHARACTER_CATALOG[id].name[1]}在游戏中的政治影响力提高。`});s.log=s.log.slice(0,80);
 return {ok:true,cost:8};
}

// This is a temporary game appointment, not an election to a historical magistracy.
export function appointDeputy(s,id){
 initializeGovernments(s);const faction=s.player,g=deriveGovernment(s,faction);
 if(!['acting_command','regency'].includes(g.kind)||!eligibleDeputies(s,faction).includes(id))return {ok:false,reason:'unavailable'};
 if(s.world.appointments[faction]===id)return {ok:false,reason:'already'};
 const cost=g.acting[0]===id?0:5;if(s.factions[faction].treasury<cost)return {ok:false,reason:'treasury'};
 s.factions[faction].treasury-=cost;s.world.appointments[faction]=id;s.world.governments[faction]=deriveGovernment(s,faction);recordLifeEvent(s,id,'Appointed as temporary acting authority.','获任临时代行政务。');
 s.log.unshift({year:s.year,month:s.month,en:`${CHARACTER_CATALOG[id].name[0]} was appointed as acting authority in the simulation.`,zh:`${CHARACTER_CATALOG[id].name[1]}在游戏中被任命暂时代行政务。`});s.log=s.log.slice(0,80);
 return {ok:true,cost};
}

export function secureRegency(s){
 initializeGovernments(s);const faction=s.player,g=deriveGovernment(s,faction),regent=s.world.characters[g.acting[0]];
 if(g.kind!=='regency'||!regent)return {ok:false,reason:'unavailable'};
 if(s.factions[faction].treasury<8)return {ok:false,reason:'treasury'};
 s.factions[faction].treasury-=8;s.factions[faction].stability=Math.min(100,s.factions[faction].stability+2);
 regent.loyalty=Math.min(100,(regent.loyalty??50)+5);regent.ambition=Math.max(0,(regent.ambition??30)-8);regent.influence=Math.max(0,(regent.influence??20)-3);
 recordLifeEvent(s,regent.id,'A funded court council supervised the regency; its authority remained temporary.','宫廷会议获得经费并监督摄政；其权力仍属临时。');
 return {ok:true,cost:8};
}

export function advanceGovernments(s){
 initializeGovernments(s);s.world.regencies||={};for(const faction of Object.keys(s.world.governments)){
  if(!s.factions[faction]||!s.regions.some(r=>r.owner===faction))continue;
  const before=s.world.governments[faction],after=deriveGovernment(s,faction);s.world.governments[faction]=after;
  if(after.kind==='regency'&&after.acting.length){
   const regent=s.world.characters[after.acting[0]],ward=after.nominal[0],previous=s.world.regencies[faction];
   const tenure=previous?.regent===regent.id&&previous.ward===ward?previous:{regent:regent.id,ward,months:0,startedYear:s.year,startedMonth:s.month};
   tenure.months++;s.world.regencies[faction]=tenure;
   if(tenure.months%3===0){regent.influence=Math.min(100,(regent.influence??20)+1);regent.ambition=Math.min(100,(regent.ambition??30)+1)}
   if((['egypt','parthia'].includes(faction)||['roman_principate','later_empire'].includes(successionModel(faction,s)))&&personAge(s,ward)!==null&&personAge(s,ward)<16&&tenure.months>=6&&(regent.ambition??0)>=75&&s.factions[faction].stability<35&&dynastyRoll(s)<.12){
    s.world.claimants[faction]||=[];if(!s.world.claimants[faction].includes(regent.id))s.world.claimants[faction].push(regent.id);
    s.world.disputes[faction]||={months:0,support:{}};s.world.disputes[faction].support||={};s.world.disputes[faction].support[regent.id]=Math.max(30,s.world.disputes[faction].support[regent.id]||0);
    if(startDynasticWar(s,faction,regent.id)){tenure.usurpation=true;if(faction===s.player)s.log.unshift({year:s.year,month:s.month,en:'The regent raised a rival court and seized a province with an army.',zh:'摄政者另立宫廷，率军夺取一处行省。'})}
   }
  }else if(s.world.regencies[faction]&&!s.world.regencies[faction].endedYear){s.world.regencies[faction].endedYear=s.year;s.world.regencies[faction].endedMonth=s.month}
  for(const id of after.nominal.filter(id=>!before.nominal.includes(id)))recordLifeEvent(s,id,`Assumed political leadership of ${FACTIONS[faction]?.short[0]||faction} in the simulation.`,`在模拟中成为${FACTIONS[faction]?.short[1]||faction}的政治领袖。`);
  // NPC preparations are internal game state, not an announcement to the player.
  if(faction!==s.player&&s.month%6===0){
   const candidates=successionCandidates(s,faction),current=s.world.successionPlans[faction],leaders=after.nominal.map(id=>s.world.characters[id]);
   if(current&&!candidates.includes(current))delete s.world.successionPlans[faction];
   const concern=s.factions[faction].stability<45||leaders.some(c=>c.missing||['frail','seriously_ill','dying'].includes(c.health));
   if(concern&&leaders.length&&candidates.length&&!s.world.successionPlans[faction]&&s.factions[faction].treasury>=5){s.factions[faction].treasury-=5;s.world.successionPlans[faction]=candidates[0]}
  }
  if(faction===s.player&&(before.kind!==after.kind||before.acting.join(':')!==after.acting.join(':'))){
   const name=after.acting.map(id=>CHARACTER_CATALOG[id]?.name).filter(Boolean),en=name.map(x=>x[0]).join(', ')||'an unnamed authority',zh=name.map(x=>x[1]).join('、')||'未具名临时官员';
   const text=after.kind==='normal'?['The normal leadership arrangement resumed.','正常领导安排已恢复。']:after.kind==='vacant'?['Leadership is vacant; an unnamed authority administers the government.','领导职位空缺，由未具名临时官员维持政府运作。']:after.kind==='constituent_vacant'?['At least one Mauretanian kingdom has no named ruler; unnamed authorities administer vacant kingdoms separately.','至少一个毛里塔尼亚王国没有具名统治者；空缺王国分别由未具名官员维持政务。']:after.kind==='constituent_unavailable'?['At least one Mauretanian ruler is unable to govern; the separate kingdoms remain distinct.','至少一位毛里塔尼亚统治者无法履职；两个王国仍各自独立。']:after.kind==='co_ruler_acting'?[`${en} exercises authority while the other co-ruler requires assistance.`,`${zh}在另一位共同统治者需要辅政时行使政务。`]:after.kind==='acting_command'?[`${en} temporarily assumes the political command.`,`${zh}暂时代行政治指挥职责。`]:[`${en} exercises temporary authority while the ruler requires assistance.`,`${zh}在统治者需要辅政时暂时代行政务。`];
   s.log.unshift({year:s.year,month:s.month,en:text[0],zh:text[1]});s.log=s.log.slice(0,80);
  }
  if(after.kind!=='normal'&&s.month%3===0)s.factions[faction].stability=Math.max(0,s.factions[faction].stability-1);
 }
}
