import {initializeWorld,CHARACTER_CATALOG} from './characters.js?v=14';

// These are simulated administrative assignments, not historical magistracies.
export const OFFICE_TYPES=['finance','supply','administration'];
const roman=faction=>faction==='caesar'||faction==='senate';
export function initializeOffices(s){initializeWorld(s);s.world.offices||={};for(const faction of ['caesar','senate'])s.world.offices[faction]||={};return s.world.offices}
export function officeOf(s,faction,id){return Object.entries(initializeOffices(s)[faction]||{}).find(([,person])=>person===id)?.[0]||null}
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
export function advanceOffices(s){
 const offices=initializeOffices(s);
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
