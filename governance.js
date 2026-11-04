import {politicalAmbition,improveLeaderTrust} from './conspiracies.js?v=5';
import {initializeWorld,successorFor,CHARACTER_CATALOG} from './characters.js?v=13';

const unable=c=>!c?.alive||!!c.missing||['seriously_ill','dying','deceased'].includes(c.health);
const roman=faction=>faction==='caesar'||faction==='senate';
export const eligibleDeputies=(s,faction)=>successorFor(s,faction).filter(id=>!unable(s.world.characters[id])&&!s.world.characters[id].travel&&!(s.world.claimants?.[faction]||[]).includes(id));

// This describes the simulated arrangement, not a historical medical or constitutional claim.
export function deriveGovernment(s,faction){
 initializeWorld(s);const nominal=(s.world.leadership[faction]||[]).filter(id=>s.world.characters[id]?.alive&&s.world.characters[id].faction===faction);
 if(!nominal.length)return {kind:'vacant',nominal:[],acting:[]};
 const capable=nominal.filter(id=>!unable(s.world.characters[id]));
 if(capable.length===nominal.length)return {kind:'normal',nominal,acting:[...nominal]};
 if(capable.length)return {kind:faction==='mauretania'?'constituent_unavailable':'co_ruler_acting',nominal,acting:capable};
 const candidates=eligibleDeputies(s,faction),preferred=s.world.appointments?.[faction],deputy=candidates.includes(preferred)?preferred:candidates[0];
 return {kind:roman(faction)?'acting_command':'regency',nominal,acting:deputy?[deputy]:[]};
}

export function initializeGovernments(s){
 initializeWorld(s);s.world.appointments||={};s.world.successionPlans||={};s.world.governments||={};for(const faction of Object.keys(s.factions).filter(x=>x!=='rebels'))if(!s.world.governments[faction])s.world.governments[faction]=deriveGovernment(s,faction);return s;
}

export function planSuccession(s,id){
 initializeGovernments(s);const faction=s.player;if(!(s.world.leadership[faction]||[]).some(cid=>s.world.characters[cid]?.alive)||!successorFor(s,faction).includes(id))return {ok:false,reason:'unavailable'};
 if(s.world.successionPlans[faction]===id)return {ok:false,reason:'already'};if(s.factions[faction].treasury<5)return {ok:false,reason:'treasury'};
 s.factions[faction].treasury-=5;s.world.successionPlans[faction]=id;s.log.unshift({year:s.year,month:s.month,en:`${CHARACTER_CATALOG[id].name[0]} was designated as a possible successor in the simulation.`,zh:`${CHARACTER_CATALOG[id].name[1]}在游戏中被指定为可能的继任者。`});s.log=s.log.slice(0,80);return {ok:true,cost:5};
}

// Influence is a game abstraction, not a claim about a historical person's power.
export function supportSuccessor(s,id){
 initializeGovernments(s);const faction=s.player,candidates=successorFor(s,faction),person=s.world.characters[id];
 if(!candidates.includes(id)||!(s.world.leadership[faction]||[]).some(cid=>s.world.characters[cid]?.alive))return {ok:false,reason:'unavailable'};
 if(person.influence>=100)return {ok:false,reason:'maximum'};if(s.factions[faction].treasury<8)return {ok:false,reason:'treasury'};
 s.factions[faction].treasury-=8;person.influence=Math.min(100,person.influence+15);person.ambition=Math.min(100,politicalAmbition(s,id)+5);improveLeaderTrust(s,id);
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
 s.factions[faction].treasury-=cost;s.world.appointments[faction]=id;s.world.governments[faction]=deriveGovernment(s,faction);
 s.log.unshift({year:s.year,month:s.month,en:`${CHARACTER_CATALOG[id].name[0]} was appointed as acting authority in the simulation.`,zh:`${CHARACTER_CATALOG[id].name[1]}在游戏中被任命暂时代行政务。`});s.log=s.log.slice(0,80);
 return {ok:true,cost};
}

export function advanceGovernments(s){
 initializeGovernments(s);for(const faction of Object.keys(s.world.governments)){
  if(!s.factions[faction]||!s.regions.some(r=>r.owner===faction))continue;
  const before=s.world.governments[faction],after=deriveGovernment(s,faction);s.world.governments[faction]=after;
  // NPC preparations are internal game state, not an announcement to the player.
  if(faction!==s.player&&s.month%6===0){
   const candidates=successorFor(s,faction),current=s.world.successionPlans[faction],leaders=after.nominal.map(id=>s.world.characters[id]);
   if(current&&!candidates.includes(current))delete s.world.successionPlans[faction];
   const concern=s.factions[faction].stability<45||leaders.some(c=>c.missing||['frail','seriously_ill','dying'].includes(c.health));
   if(concern&&leaders.length&&candidates.length&&!s.world.successionPlans[faction]&&s.factions[faction].treasury>=5){s.factions[faction].treasury-=5;s.world.successionPlans[faction]=candidates[0]}
  }
  if(faction===s.player&&(before.kind!==after.kind||before.acting.join(':')!==after.acting.join(':'))){
   const name=after.acting.map(id=>CHARACTER_CATALOG[id]?.name).filter(Boolean),en=name.map(x=>x[0]).join(', ')||'an unnamed authority',zh=name.map(x=>x[1]).join('、')||'未具名临时官员';
   const text=after.kind==='normal'?['The normal leadership arrangement resumed.','正常领导安排已恢复。']:after.kind==='vacant'?['Leadership is vacant; an unnamed authority administers the government.','领导职位空缺，由未具名临时官员维持政府运作。']:after.kind==='constituent_unavailable'?['One Mauretanian ruler is unable to govern; the separate kingdoms remain distinct.','一位毛里塔尼亚统治者无法履职；两个王国仍各自独立。']:after.kind==='co_ruler_acting'?[`${en} assumes the duties of an incapacitated co-ruler.`,`${zh}代行无法履职的共同统治者职责。`]:after.kind==='acting_command'?[`${en} temporarily assumes the political command.`,`${zh}暂时代行政治指挥职责。`]:[`${en} exercises temporary authority during the ruler’s incapacity.`,`${zh}在统治者无法履职期间暂时代行政务。`];
   s.log.unshift({year:s.year,month:s.month,en:text[0],zh:text[1]});s.log=s.log.slice(0,80);
  }
  if(after.kind!=='normal'&&s.month%3===0)s.factions[faction].stability=Math.max(0,s.factions[faction].stability-1);
 }
}
