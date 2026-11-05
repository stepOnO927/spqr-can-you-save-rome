import {initializeWorld,CHARACTER_CATALOG} from './characters.js?v=17';

// These are simulated administrative assignments, not historical magistracies.
export const OFFICE_TYPES=['finance','supply','administration'];
const roman=faction=>faction==='caesar'||faction==='senate';
export function initializeOffices(s){initializeWorld(s);s.world.offices||={};s.world.localGovernors||={};for(const faction of ['caesar','senate'])s.world.offices[faction]||={};return s.world.offices}
export function officeOf(s,faction,id){const national=Object.entries(initializeOffices(s)[faction]||{}).find(([,person])=>person===id)?.[0];if(national)return national;const local=Object.entries(s.world.localGovernors).find(([,post])=>post.faction===faction&&post.person===id);return local?'theater:'+local[0]:null}
export function canHoldOffice(s,faction,id){
 initializeOffices(s);const c=s.world.characters[id];
 return !!(roman(faction)&&CHARACTER_CATALOG[id]&&s.regions.some(r=>r.owner===faction)&&c?.faction===faction&&c.alive&&!c.missing&&!c.travel&&c.loyalty>=40&&!['seriously_ill','dying','deceased'].includes(c.health)&&!(s.world.leadership[faction]||[]).includes(id)&&!s.armies.some(a=>a.characterId===id));
}
export function officeCandidates(s,faction,office){
 initializeOffices(s);if(!OFFICE_TYPES.includes(office))return [];
 return Object.keys(s.world.characters).filter(id=>canHoldOffice(s,faction,id)&&(!officeOf(s,faction,id)||officeOf(s,faction,id)===office));
}
function record(s,en,zh){s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)}
export function appointOffice(s,office,id,actor=s.player){
 const offices=initializeOffices(s);if(!roman(actor)||!OFFICE_TYPES.includes(office)||!s.regions.some(r=>r.owner===actor)||!officeCandidates(s,actor,office).includes(id))return {ok:false,reason:'unavailable'};
 if(offices[actor][office]===id)return {ok:false,reason:'already'};
 if(s.factions[actor].treasury<5)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=5;offices[actor][office]=id;
 if(actor===s.player)record(s,`${CHARACTER_CATALOG[id].name[0]} received a simulated administrative assignment.`,`${CHARACTER_CATALOG[id].name[1]}获得游戏中的行政任命。`);
 return {ok:true,cost:5};
}
export function dismissOffice(s,office){
 const offices=initializeOffices(s),faction=s.player,id=offices[faction]?.[office];if(!OFFICE_TYPES.includes(office)||!id)return {ok:false,reason:'unavailable'};
 delete offices[faction][office];record(s,`${CHARACTER_CATALOG[id]?.name[0]||'An official'} left an administrative assignment.`,`${CHARACTER_CATALOG[id]?.name[1]||'一名官员'}卸下行政职务。`);return {ok:true};
}
// A theater assignment is a game abstraction and does not assert a historical governorship.
export function localGovernor(s,theater){
 initializeOffices(s);const post=s.world.localGovernors[theater],r=s.regions.find(x=>x.id===theater),c=s.world.characters[post?.person];
 return post&&r?.owner===post.faction&&c?.location===theater&&canHoldOffice(s,post.faction,post.person)?post.person:null;
}
export function governorCandidates(s,theater,actor=s.player){
 initializeOffices(s);if(!roman(actor)||!s.regions.some(r=>r.id===theater&&r.owner===actor))return [];
 return Object.keys(s.world.characters).filter(id=>s.world.characters[id].location===theater&&canHoldOffice(s,actor,id)&&(!officeOf(s,actor,id)||officeOf(s,actor,id)==='theater:'+theater));
}
export function appointGovernor(s,theater,id){
 const faction=s.player;initializeOffices(s);if(!governorCandidates(s,theater,faction).includes(id))return {ok:false,reason:'unavailable'};
 if(localGovernor(s,theater)===id)return {ok:false,reason:'already'};if(s.factions[faction].treasury<5)return {ok:false,reason:'treasury'};
 s.factions[faction].treasury-=5;s.world.localGovernors[theater]={faction,person:id};record(s,`${CHARACTER_CATALOG[id].name[0]} received a simulated theater assignment.`,`${CHARACTER_CATALOG[id].name[1]}获得游戏中的战区行政任命。`);return {ok:true,cost:5};
}
export function dismissGovernor(s,theater){
 initializeOffices(s);const post=s.world.localGovernors[theater];if(!post||post.faction!==s.player)return {ok:false,reason:'unavailable'};
 delete s.world.localGovernors[theater];record(s,`${CHARACTER_CATALOG[post.person]?.name[0]||'An official'} left a simulated theater assignment.`,`${CHARACTER_CATALOG[post.person]?.name[1]||'一名官员'}卸下游戏中的战区行政职务。`);return {ok:true};
}
export function governorLoyaltyEffect(s,theater){return s.month%3===0&&localGovernor(s,theater)?1:0}
export function advanceOffices(s){
 const offices=initializeOffices(s);
 for(const [theater,post] of Object.entries(s.world.localGovernors)){if(!localGovernor(s,theater)){delete s.world.localGovernors[theater];if(post.faction===s.player)record(s,'A simulated theater assignment ended because its conditions changed.','因条件变化，一项游戏中的战区行政任命结束。')}}
 for(const faction of ['caesar','senate']){
  for(const office of OFFICE_TYPES){const id=offices[faction][office];if(id&&!canHoldOffice(s,faction,id)){delete offices[faction][office];if(faction===s.player)record(s,`${CHARACTER_CATALOG[id]?.name[0]||'An official'} can no longer hold the assignment.`,`${CHARACTER_CATALOG[id]?.name[1]||'一名官员'}无法继续履行行政职务。`)}}
  // AI uses only its own personnel, and fills at most one vacancy per half-year.
  if(faction!==s.player&&(s.month===1||s.month===7)&&s.factions[faction]?.treasury>=5&&s.regions.some(r=>r.owner===faction)){
   const vacancy=OFFICE_TYPES.find(office=>!offices[faction][office]&&officeCandidates(s,faction,office).length);
   if(vacancy){const id=officeCandidates(s,faction,vacancy).sort((a,b)=>s.world.characters[b].loyalty-s.world.characters[a].loyalty)[0];appointOffice(s,vacancy,id,faction)}
  }
 }
}
export function officeEffects(s,faction){
 const posts=initializeOffices(s)[faction]||{},active=office=>posts[office]&&canHoldOffice(s,faction,posts[office]);
 return {treasury:active('finance')?2:0,food:active('supply')?2:0,stability:active('administration')&&s.month%3===0?1:0};
}
