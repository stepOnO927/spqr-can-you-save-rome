import {strategicPersonality} from './strategic-planning.js?v=grand-chessboard-1';
// Personal political plans belong to actual commanders and spend their private
// resources. Ambition is a tendency, never an automatic order to rebel.
const pair=(a,b)=>[a,b].sort().join(':');
const now=s=>s.year*12+s.month;
export function advancePersonalPlans(s){
 if(s.month%3!==0)return;s.world.personalPlans||={};s.world.personalities||={};
 for(const person of Object.values(s.world.characters||{})){
  if(!person?.id)continue;
  s.world.personalities[person.id]||=strategicPersonality(person);
  const faction=person.faction,government=s.factions[faction],army=s.armies.find(a=>a.owner===faction&&a.characterId===person.id&&a.men>0);
  if(!government||!army||!person.alive||person.missing||person.travel||person.institutionalOnly||(person.ambition??0)<75||(s.world.leadership[faction]||[]).includes(person.id))continue;
  let plan=s.world.personalPlans[person.id];const current=now(s);
  if(!plan||current-plan.reviewed>=6){const focus=person.loyalty<65&&government.stability<50?'build_network':person.loyalty>=60?'cultivate_influence':'protect_position';plan=s.world.personalPlans[person.id]={focus,started:plan?.started??current,reviewed:current,resourcesSpent:plan?.resourcesSpent||0,contactsMade:plan?.contactsMade||0}}
  if((person.wealth||0)<1)continue;
  if(plan.focus==='cultivate_influence'&&(person.influence||0)<100){person.wealth--;person.influence=Math.min(100,(person.influence||0)+1);plan.resourcesSpent++}
  if((plan.focus==='build_network'||plan.focus==='cultivate_influence'&&['diplomat','schemer'].includes(s.world.personalities[person.id]))&&s.month%6===0&&(person.wealth||0)>=1){
   const candidate=Object.values(s.world.characters).filter(c=>c.id!==person.id&&c.faction===faction&&c.alive&&!c.missing&&!c.travel&&!c.institutionalOnly&&((s.world.personalRelations?.[pair(c.id,person.id)]?.trust||0)>0||c.location===army.region)).sort((a,b)=>(b.influence||0)-(a.influence||0)||a.id.localeCompare(b.id))[0];
   if(candidate){person.wealth--;plan.resourcesSpent++;const key=pair(person.id,candidate.id),relation=s.world.personalRelations[key]||{trust:0,meetings:0};relation.trust=Math.min(100,(relation.trust||0)+3);relation.meetings=(relation.meetings||0)+1;s.world.personalRelations[key]=relation;plan.contactsMade++}
  }
 }
}
