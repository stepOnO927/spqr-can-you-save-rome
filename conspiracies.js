import {initializeWorld,CHARACTER_CATALOG} from './characters.js?v=faces-empire-2';
import {startPoliticalWar} from './civil-war.js?v=faces-empire-3';
import {personalMemoryAdjustment} from './political-memory.js?v=grand-chessboard-2';
import {hasNationalIdea} from './national-ideas.js?v=grand-chessboard-2';

const random=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const log=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};

// A game-only disposition derived from the stable id, not a historical character judgment.
function ambitionOf(person){if(!Number.isFinite(person.ambition))person.ambition=35+([...person.id].reduce((v,c)=>(v*31+c.charCodeAt(0))%31,0));return person.ambition}
export function politicalAmbition(s,id){initializeWorld(s);const person=s.world.characters[id];return person?ambitionOf(person):null}
function currentLeader(s,id){const person=s.world.characters[id];return (s.world.leadership[person?.faction]||[]).find(leader=>leader!==id&&s.world.characters[leader]?.alive)||null}
export function improveLeaderTrust(s,id,amount=5){initializeWorld(s);const leader=currentLeader(s,id);if(!leader)return null;const key=[id,leader].sort().join(':'),relationship=s.world.personalRelations[key]||{trust:0,meetings:0};relationship.trust=Math.max(-100,Math.min(100,(relationship.trust||0)+amount));s.world.personalRelations[key]=relationship;return relationship.trust}
export function plotFormationChance(s,id){const ambition=politicalAmbition(s,id);if(ambition===null)return 0;const leader=currentLeader(s,id),key=leader?[id,leader].sort().join(':'):null,trust=key?(s.world.personalRelations[key]?.trust||0):0,faction=s.world.characters[id].faction,oversight=!!s.world.constitutionalOversight?.[faction],memory=personalMemoryAdjustment(s,id,faction);return Math.max(.05,Math.min(.5,.20+ambition*.002-trust*.001-memory*.002-(oversight ? .05 : 0)-(hasNationalIdea(s,faction,'oversight')?.03:0)))}
// A simulated conspiracy is not a claim about a historical person's intentions.
function findCandidates(s,faction){
 if(!s.factions[faction]||faction==='rebels')return [];
 return Object.values(s.world.characters).filter(c=>CHARACTER_CATALOG[c.id]&&c.faction===faction&&c.alive&&!c.missing&&!c.travel&&!['seriously_ill','dying','deceased'].includes(c.health)&&!(s.world.leadership[faction]||[]).includes(c.id)&&(c.loyalty<40||(c.loyalty<65&&ambitionOf(c)>=75&&s.factions[faction].stability<50))).sort((a,b)=>((65-b.loyalty)*2+ambitionOf(b))-((65-a.loyalty)*2+ambitionOf(a))||a.id.localeCompare(b.id)).map(c=>c.id);
}
export function potentialConspirators(s,faction){initializeWorld(s);return findCandidates(s,faction)}
const available=(c,faction)=>c?.faction===faction&&c.alive&&!c.missing&&!c.travel&&!['seriously_ill','dying','deceased'].includes(c.health);
const personPlace=(s,c)=>{const unit=s.armies.find(a=>a.characterId===c.id);return unit?(unit.move?null:unit.region):c.location};
function contact(s,lead,c){
 const trust=s.world.personalRelations[[lead.id,c.id].sort().join(':')]?.trust||0;
 const family=lead.familyId&&lead.familyId===c.familyId,place=personPlace(s,lead);
 return trust>=15||family||!!place&&place===personPlace(s,c);
}
function migratePlot(plot){
 // Older saves contain only a suspect and a countdown. They retain the lead,
 // but cannot turn an unsupported countdown into an automatic government change.
 plot.participants||=[plot.person];plot.funds??=0;plot.progress??=0;plot.months??=0;plot.idle??=0;plot.phase||='organizing';
}
function finishPlot(s,faction,outcome){
 const p=s.world.conspiracies[faction];if(!p)return;const person=s.world.characters[p.person],remainder=Math.max(0,p.funds||0);
 if(person?.alive)person.wealth=(person.wealth||0)+remainder;
 s.world.politicalNetworkHistory||=[];s.world.politicalNetworkHistory.unshift({faction,person:p.person,participants:[...(p.participants||[p.person])],outcome,progress:p.progress||0,year:s.year,month:s.month});s.world.politicalNetworkHistory=s.world.politicalNetworkHistory.slice(0,100);
 delete s.world.conspiracies[faction];
}
export function advanceConspiracies(s){
 initializeWorld(s);s.world.conspiracies||={};
 for(const faction of Object.keys(s.factions).filter(id=>id!=='rebels'&&!id.endsWith('_claimant'))){
  let plot=s.world.conspiracies[faction];const viable=findCandidates(s,faction),hasTerritory=s.regions.some(r=>r.owner===faction),leaders=s.world.leadership[faction]||[];
  if(plot&&(!hasTerritory||!leaders.length||!viable.includes(plot.person))){finishPlot(s,faction,'abandoned');plot=null}
  if(!plot&&hasTerritory&&leaders.length&&s.month%3===0&&s.factions[faction].stability<45&&viable.length&&random(s)<plotFormationChance(s,viable[0])){plot=s.world.conspiracies[faction]={person:viable[0],year:s.year,month:s.month};migratePlot(plot);continue}
  if(!plot)continue;migratePlot(plot);plot.months++;
  const person=s.world.characters[plot.person];
  plot.participants=plot.participants.filter(id=>id===plot.person||available(s.world.characters[id],faction)&&s.world.characters[id].loyalty<60);
  // The organizer transfers personal wealth into the network; no money is
  // created or silently removed from the state's treasury.
  const contribution=Math.min(2,Math.max(0,person.wealth||0),Math.max(0,12-plot.funds));person.wealth=(person.wealth||0)-contribution;plot.funds+=contribution;
  if(s.month%3===0&&plot.funds>=2&&plot.participants.length<5){
   const candidate=Object.values(s.world.characters).filter(c=>c.id!==plot.person&&!plot.participants.includes(c.id)&&available(c,faction)&&!(leaders||[]).includes(c.id)&&c.loyalty<60&&contact(s,person,c)).sort((a,b)=>a.loyalty-b.loyalty||(b.influence||0)-(a.influence||0)||a.id.localeCompare(b.id))[0];
   if(candidate){plot.participants.push(candidate.id);plot.funds-=2}
  }
  if(s.month%3===0&&plot.participants.length>=2&&plot.funds>=1){
   plot.funds--;const influence=plot.participants.reduce((n,id)=>n+(s.world.characters[id]?.influence||0),0);plot.progress=Math.min(100,plot.progress+8+Math.floor(influence/40));plot.idle=0;plot.phase='planning';
  }else if(s.month%3===0)plot.idle+=3;
  plot.remaining=Math.max(0,Math.ceil((60-plot.progress)/10)*3);
  if(plot.idle>=24||s.factions[faction].stability>=70){finishPlot(s,faction,'abandoned');continue}
  if(plot.progress<60||plot.participants.length<3||plot.funds<3||s.factions[faction].stability>=30)continue;
  const influence=plot.participants.reduce((n,id)=>n+(s.world.characters[id]?.influence||0),0),loyalInfluence=Object.values(s.world.characters).filter(c=>available(c,faction)&&!plot.participants.includes(c.id)&&(leaders.includes(c.id)||c.loyalty>=60)).reduce((n,c)=>n+(c.influence||0)*(leaders.includes(c.id)?1:.5),0);
  if(influence<loyalInfluence*.75){plot.phase='waiting';continue}
  if(s.world.disputes?.[faction]){plot.phase='waiting';continue}
  if(s.armies.some(a=>a.owner===faction&&a.characterId===plot.person&&a.men>0)){
   if(!startPoliticalWar(s,faction,plot)){plot.phase='waiting';continue}
   if(faction===s.player)log(s,`${CHARACTER_CATALOG[plot.person].name[0]} has broken with the government, taking an existing command into civil war.`,`${CHARACTER_CATALOG[plot.person].name[1]}与政府决裂，其原有军队卷入内战。`);
   finishPlot(s,faction,'civil_war');continue;
  }
  plot.funds-=3;s.world.leadership[faction]=[plot.person];person.loyalty=60;s.factions[faction].stability=Math.max(0,s.factions[faction].stability-8);
  if(faction===s.player)log(s,`${CHARACTER_CATALOG[plot.person].name[0]} and an organized political network displaced the leadership.`,`${CHARACTER_CATALOG[plot.person].name[1]}与有组织的政治网络取代了原领导层。`);
  finishPlot(s,faction,'leadership_change');
 }
}
export function reassurePerson(s,id){
 initializeWorld(s);const c=s.world.characters[id],actor=s.player;
 if(!s.factions[actor]||actor==='rebels'||!c||!CHARACTER_CATALOG[id]||c.faction!==actor||!c.alive||c.missing||c.travel||['seriously_ill','dying','deceased'].includes(c.health)||(s.world.leadership[actor]||[]).includes(id)||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unavailable'};
 if(c.loyalty>=100)return {ok:false,reason:'maximum'};if(s.factions[actor].treasury<8)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=8;c.loyalty=Math.min(100,c.loyalty+15);improveLeaderTrust(s,id);log(s,`${CHARACTER_CATALOG[id].name[0]} received political reassurance in the simulation.`,`${CHARACTER_CATALOG[id].name[1]}在游戏中获得政治安抚。`);return {ok:true,cost:8};
}
