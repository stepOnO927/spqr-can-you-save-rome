import {initializeWorld,CHARACTER_CATALOG} from './characters.js?v=17';

const roman=id=>id==='caesar'||id==='senate';
const random=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const log=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};

// A game-only disposition derived from the stable id, not a historical character judgment.
export function politicalAmbition(s,id){initializeWorld(s);const person=s.world.characters[id];if(!person)return null;if(!Number.isFinite(person.ambition))person.ambition=35+([...id].reduce((v,c)=>(v*31+c.charCodeAt(0))%31,0));return person.ambition}
function currentLeader(s,id){const person=s.world.characters[id];return (s.world.leadership[person?.faction]||[]).find(leader=>leader!==id&&s.world.characters[leader]?.alive)||null}
export function improveLeaderTrust(s,id,amount=5){initializeWorld(s);const leader=currentLeader(s,id);if(!leader)return null;const key=[id,leader].sort().join(':'),relationship=s.world.personalRelations[key]||{trust:0,meetings:0};relationship.trust=Math.max(-100,Math.min(100,(relationship.trust||0)+amount));s.world.personalRelations[key]=relationship;return relationship.trust}
export function plotFormationChance(s,id){const ambition=politicalAmbition(s,id);if(ambition===null)return 0;const leader=currentLeader(s,id),key=leader?[id,leader].sort().join(':'):null,trust=key?(s.world.personalRelations[key]?.trust||0):0;return Math.max(.05,Math.min(.5,.20+ambition*.002-trust*.001))}
// A simulated conspiracy is not a claim about a historical person's intentions.
export function potentialConspirators(s,faction){
 initializeWorld(s);if(!roman(faction))return [];
 return Object.values(s.world.characters).filter(c=>CHARACTER_CATALOG[c.id]&&c.faction===faction&&c.alive&&!c.missing&&!c.travel&&c.loyalty<40&&!['seriously_ill','dying','deceased'].includes(c.health)&&!(s.world.leadership[faction]||[]).includes(c.id)&&!s.armies.some(a=>a.characterId===c.id)).sort((a,b)=>((40-b.loyalty)*2+politicalAmbition(s,b.id))-((40-a.loyalty)*2+politicalAmbition(s,a.id))||a.id.localeCompare(b.id)).map(c=>c.id);
}
export function advanceConspiracies(s){
 initializeWorld(s);s.world.conspiracies||={};
 for(const faction of ['caesar','senate']){
  let plot=s.world.conspiracies[faction];const viable=potentialConspirators(s,faction),hasTerritory=s.regions.some(r=>r.owner===faction),leaders=s.world.leadership[faction]||[];
  if(plot&&(!hasTerritory||!leaders.length||!viable.includes(plot.person))){delete s.world.conspiracies[faction];plot=null}
  if(!plot&&hasTerritory&&leaders.length&&s.month%3===0&&s.factions[faction].stability<45&&viable.length&&random(s)<plotFormationChance(s,viable[0])){plot=s.world.conspiracies[faction]={person:viable[0],remaining:6,year:s.year,month:s.month};continue}
  if(!plot||--plot.remaining>0)continue;
  const person=s.world.characters[plot.person];
  if(random(s)<.35){s.world.leadership[faction]=[plot.person];person.loyalty=60;s.factions[faction].stability=Math.max(0,s.factions[faction].stability-8);if(faction===s.player)log(s,`${CHARACTER_CATALOG[plot.person].name[0]} displaced the faction leadership in a simulated political struggle.`,`${CHARACTER_CATALOG[plot.person].name[1]}在游戏中的政治斗争中取代了派系领导。`)}
  delete s.world.conspiracies[faction];
 }
}
export function reassurePerson(s,id){
 initializeWorld(s);const c=s.world.characters[id],actor=s.player;
 if(!roman(actor)||!c||!CHARACTER_CATALOG[id]||c.faction!==actor||!c.alive||c.missing||c.travel||['seriously_ill','dying','deceased'].includes(c.health)||(s.world.leadership[actor]||[]).includes(id)||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unavailable'};
 if(c.loyalty>=100)return {ok:false,reason:'maximum'};if(s.factions[actor].treasury<8)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=8;c.loyalty=Math.min(100,c.loyalty+15);improveLeaderTrust(s,id);log(s,`${CHARACTER_CATALOG[id].name[0]} received political reassurance in the simulation.`,`${CHARACTER_CATALOG[id].name[1]}在游戏中获得政治安抚。`);return {ok:true,cost:8};
}
