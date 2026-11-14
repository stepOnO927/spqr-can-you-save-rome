import {CHARACTER_CATALOG} from './characters.js';

// These are attested people. Their appointments, journeys and effects are
// campaign abstractions, not claims about where they served in 49 BCE.
export const FIGURE_ROLES={military:{name:['Military leadership','军事统帅'],candidates:['antony','labienus']},statesman:{name:['Statesmanship','政治家'],candidates:['lepidus','cato']},engineer:{name:['Engineering','工程专家'],candidates:['mamurra']},scholar:{name:['Scholarship','学者'],candidates:['varro']},religious:{name:['Civic religion','宗教公职'],candidates:['cicero']}};
export function initializeFigures(state){
 state.greatFigures||={assignments:{},journeys:[],invitations:[]};
 const records=state.greatFigures;
 records.assignments||={};records.journeys||=[];records.invitations||=[];
 for(const owner of Object.keys(state.factions))records.assignments[owner]||={};
 return records;
}
const roleFor=id=>Object.keys(FIGURE_ROLES).find(role=>FIGURE_ROLES[role].candidates.includes(id));
function occupied(state,id){return Object.values(state.world.leadership||{}).some(list=>list.includes(id))||state.armies.some(a=>a.characterId===id)||Object.values(state.world.offices||{}).some(office=>Object.values(office).includes(id))||Object.values(state.world.localGovernors||{}).some(post=>post.person===id)}
function destinationFor(state,owner){return state.regions.find(r=>r.id===(owner==='senate'?'roma':'cisalpine')&&r.owner===owner)||state.regions.find(r=>r.owner===owner&&r.terrain==='urban')||state.regions.find(r=>r.owner===owner)}
function startJourney(state,owner,id,role,destination){
 const person=state.world.characters[id],origin=state.regions.find(r=>r.id===person.location),distance=origin?Math.hypot(origin.x-destination.x,origin.y-destination.y):200,foreign=person.faction!==owner;
 const months=Math.max(2,Math.min(6,Math.ceil(distance/160)+(foreign?1:0)));
 person.specialistJourney={owner,destination:destination.id,remaining:months};
 initializeFigures(state).journeys.push({id,owner,role,destination:destination.id,remaining:months});
 return months;
}
export function figureStatus(state,owner,id){
 const entry=CHARACTER_CATALOG[id],person=state.world?.characters?.[id],role=roleFor(id);if(!entry||!person||!role)return {ok:false,reason:'unknown'};
 const records=initializeFigures(state);
 if(records.assignments[owner][role]||records.journeys.some(j=>j.id===id)||records.invitations.some(i=>i.id===id)||Object.values(records.assignments).some(a=>Object.values(a).includes(id)))return {ok:false,reason:'assigned'};
 if(!person.alive||person.missing||person.travel||person.specialistJourney||person.health==='dying'||person.loyalty<55)return {ok:false,reason:'unavailable'};
 if(occupied(state,id))return {ok:false,reason:'in-office'};
 const foreign=person.faction!==owner;
 if(foreign){const pair=[owner,person.faction].sort().join(':');if(state.wars.some(w=>w.includes(owner)&&w.includes(person.faction))||(state.relations[pair]||0)<30)return {ok:false,reason:'diplomacy'}}
 if(state.factions[owner]?.treasury<(foreign?35:20))return {ok:false,reason:'treasury'};
 return {ok:true,role,foreign,cost:foreign?35:20};
}
export function recruitFigure(state,owner,id){
 const status=figureStatus(state,owner,id);if(!status.ok)return status;
 const destination=destinationFor(state,owner);if(!destination)return {ok:false,reason:'territory'};
 if(status.foreign){
  state.factions[owner].treasury-=5;
  initializeFigures(state).invitations.push({id,owner,source:state.world.characters[id].faction,role:status.role,destination:destination.id,remaining:1,sentYear:state.year,sentMonth:state.month});
  return {ok:true,pending:true,months:1,cost:5,remainingCost:30};
 }
 state.factions[owner].treasury-=status.cost;
 return {ok:true,months:startJourney(state,owner,id,status.role,destination),cost:status.cost};
}
function invitationConsent(state,invite){
 const person=state.world.characters[invite.id],destination=state.regions.find(r=>r.id===invite.destination),relation=state.relations[[invite.owner,invite.source].sort().join(':')]||0;
 if(!person?.alive||person.missing||person.travel||person.specialistJourney||person.faction!==invite.source||person.health==='dying'||person.loyalty<55||occupied(state,invite.id)||destination?.owner!==invite.owner||state.wars.some(w=>w.includes(invite.owner)&&w.includes(invite.source))||relation<30||state.factions[invite.owner]?.treasury<30)return false;
 // Private willingness is deliberately uncertain to the inviting ruler.
 const chance=Math.max(.1,Math.min(.85,.45+(relation-30)/100-(person.loyalty-60)/150));
 state.seed=(Math.imul(state.seed??1,1664525)+1013904223)>>>0;
 return state.seed/4294967296<chance;
}
export function advanceFigures(state,log=()=>{}){
 const records=initializeFigures(state);
 for(const journey of [...records.journeys]){
  const person=state.world.characters[journey.id];
  if(!person?.alive||person.missing||!state.regions.some(r=>r.id===journey.destination&&r.owner===journey.owner)){records.journeys.splice(records.journeys.indexOf(journey),1);if(person)delete person.specialistJourney;continue}
  journey.remaining--;person.specialistJourney.remaining=journey.remaining;
  if(journey.remaining>0)continue;
  records.assignments[journey.owner][journey.role]=journey.id;person.faction=journey.owner;person.location=journey.destination;delete person.specialistJourney;records.journeys.splice(records.journeys.indexOf(journey),1);
 }
 for(const invite of [...records.invitations]){
  if(--invite.remaining>0)continue;
  records.invitations.splice(records.invitations.indexOf(invite),1);
  const person=state.world.characters[invite.id],name=CHARACTER_CATALOG[invite.id]?.name||[invite.id,invite.id];
  if(!invitationConsent(state,invite)){
   if(invite.owner===state.player)log(`The invitation to ${name[0]} was declined or could not proceed. The 5-treasury courier fee was spent.`,`致${name[1]}的邀请遭拒或已无法成行。已支出5国库信使费用。`);
   continue;
  }
  state.factions[invite.owner].treasury-=30;
  const months=startJourney(state,invite.owner,invite.id,invite.role,state.regions.find(r=>r.id===invite.destination));
  if(invite.owner===state.player)log(`${name[0]} accepted the assignment and began a ${months}-month journey. The remaining 30 treasury was paid.`,`${name[1]}接受任命，开始${months}个月的行程。已支付余下30国库。`);
 }
}
export function figureActive(state,owner,role){const id=initializeFigures(state).assignments[owner]?.[role],person=state.world?.characters?.[id];return !!(id&&person?.alive&&!person.missing&&!person.travel&&person.faction===owner&&state.regions.some(r=>r.id===person.location&&r.owner===owner))}
