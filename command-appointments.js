import {CHARACTER_CATALOG,initializeWorld} from './characters.js?v=9';

// Theater-level appointments are simulated, not claims about historical commands.
export function availableCommanders(s,armyId){
 initializeWorld(s);const unit=s.armies.find(a=>a.id===armyId);
 if(!unit||unit.owner!==s.player||unit.men<=0||unit.move||unit.siege||unit.characterId)return [];
 return Object.values(s.world.characters).filter(c=>c.faction===s.player&&c.alive&&c.location===unit.region&&!c.travel&&!['seriously_ill','dying','deceased'].includes(c.health)&&!s.armies.some(a=>a.characterId===c.id)).map(c=>c.id);
}
export function appointCommander(s,armyId,id){
 if(!availableCommanders(s,armyId).includes(id))return {ok:false,reason:'unavailable'};
 const unit=s.armies.find(a=>a.id===armyId),person=CHARACTER_CATALOG[id];
 if(!person)return {ok:false,reason:'unavailable'};
 unit.characterId=id;unit.commander=[...person.name];
 // The army's pre-existing command rating stays unchanged; health still affects combat.
 s.log.unshift({year:s.year,month:s.month,en:`${person.name[0]} was assigned to ${unit.name[0]} in the simulation.`,zh:`${person.name[1]}在游戏中被任命指挥${unit.name[1]}。`});s.log=s.log.slice(0,80);
 return {ok:true};
}
