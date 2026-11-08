import {CHARACTER_CATALOG,initializeWorld} from './characters.js?v=grand-chessboard-1';
import {officeOf} from './office-system.js?v=grand-chessboard-1';
import {recordLifeEvent} from './dynasties.js?v=grand-chessboard-1';

// Theater-level appointments are simulated, not claims about historical commands.
export function availableCommanders(s,armyId){
 initializeWorld(s);const unit=s.armies.find(a=>a.id===armyId);
 if(!unit||unit.owner!==s.player||unit.men<=0||unit.move||unit.siege)return [];
 return Object.values(s.world.characters).filter(c=>c.faction===s.player&&(c.birthYear==null||s.year-c.birthYear>=20)&&c.alive&&c.location===unit.region&&!c.travel&&!c.missing&&!officeOf(s,s.player,c.id)&&!['seriously_ill','dying','deceased'].includes(c.health)&&!s.armies.some(a=>a.characterId===c.id)).map(c=>c.id);
}
export function appointCommander(s,armyId,id){
 if(!availableCommanders(s,armyId).includes(id))return {ok:false,reason:'unavailable'};
 const unit=s.armies.find(a=>a.id===armyId),person=CHARACTER_CATALOG[id];
 if(!person)return {ok:false,reason:'unavailable'};
 const former=s.world.characters[unit.characterId];if(former)former.location=unit.region;
 unit.characterId=id;unit.commander=[...person.name];
 recordLifeEvent(s,id,`Appointed commander of ${unit.name[0]}.`,`获任${unit.name[1]}的指挥官。`);
 // The army's pre-existing command rating stays unchanged; health still affects combat.
 s.log.unshift({year:s.year,month:s.month,en:`${person.name[0]} was assigned to ${unit.name[0]} in the simulation.`,zh:`${person.name[1]}在游戏中被任命指挥${unit.name[1]}。`});s.log=s.log.slice(0,80);
 return {ok:true};
}
export function releaseCommander(s,armyId){
 initializeWorld(s);const unit=s.armies.find(a=>a.id===armyId),person=unit&&s.world.characters[unit.characterId];
 if(!unit||unit.owner!==s.player||unit.men<=0||unit.move||unit.siege||!person)return {ok:false,reason:'unavailable'};
 person.location=unit.region;unit.characterId=null;unit.commander=['Unnamed officer','未具名军官'];
 recordLifeEvent(s,person.id,`Relieved of command of ${unit.name[0]}.`,`卸任${unit.name[1]}指挥官。`);
 s.log.unshift({year:s.year,month:s.month,en:`${CHARACTER_CATALOG[person.id].name[0]} was relieved of army command in the simulation.`,zh:`${CHARACTER_CATALOG[person.id].name[1]}在游戏中卸任军队指挥。`});s.log=s.log.slice(0,80);
 return {ok:true};
}
