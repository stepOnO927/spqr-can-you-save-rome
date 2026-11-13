import {initializeWorld} from './characters.js?v=succession-ui-recovery-1';
import {politicalAmbition} from './conspiracies.js?v=succession-ui-recovery-1';
const random=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const pair=(a,b)=>[a,b].sort().join(':');
const current=s=>s.year*12+s.month;
const notify=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};

// The sender must have heard a name and have an actual personal relationship;
// neither the current location nor the person's true loyalty is checked here.
export function offerPoliticalContact(s,actor,target,person,representative){
 initializeWorld(s);s.world.politicalContacts||=[];
 const k=s.knowledge?.[actor]?.[target],known=[...(k?.reportedLeaders||[]),...Object.values(k?.sightings||{}).map(x=>x.commanderId),...(k?.commanderReports||[]).map(x=>x.commanderId),...(k?.reports||[]).flatMap(r=>[r.character,...(r.leaders||[])])];
 if(actor===target||target==='rebels'||!s.factions[actor]||!s.factions[target]||!known.includes(person))return {ok:false,reason:'unavailable'};
 const own=s.world.characters[representative],trust=s.world.personalRelations[pair(person,representative)]?.trust||0;
 if(!own?.alive||own.faction!==actor||own.missing||own.travel||trust<=0)return {ok:false,reason:'contact'};
 if(s.world.politicalContacts.some(x=>x.actor===actor&&x.person===person&&['pending','channel_open'].includes(x.status)))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<12)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=12;s.world.politicalContacts.push({actor,target,person,representative,remaining:4,status:'pending',year:s.year,month:s.month});return {ok:true,duration:4};
}
export function advancePoliticalContacts(s,addReport){
 initializeWorld(s);s.world.politicalContacts||=[];s.world.doubleAgents||=[];
 for(const offer of s.world.politicalContacts){
  if(offer.status!=='pending'||--offer.remaining>0)continue;
  const person=s.world.characters[offer.person],rep=s.world.characters[offer.representative],trust=s.world.personalRelations[pair(offer.person,offer.representative)]?.trust||0;
  if(!person?.alive||person.faction!==offer.target||person.missing||person.travel||!rep?.alive||rep.faction!==offer.actor||trust<=0||random(s)<.25){offer.status='no_reply';continue}
  offer.status='channel_open';offer.resolvedYear=s.year;offer.resolvedMonth=s.month;
  // An open channel is not evidence that its reports are honest.
  const willingness=Math.max(.1,Math.min(.8,.55-(person.loyalty??0)*.006+politicalAmbition(s,person.id)*.002+trust*.002));
  s.world.doubleAgents.push({actor:offer.actor,target:offer.target,person:offer.person,allegiance:random(s)<willingness?'sponsor':'home',status:'active',nextReport:current(s)+3,reassessAt:current(s)+12,history:[]});
  if(offer.actor===s.player)notify(s,'A political contact has opened a channel; its loyalty and reports are uncertain.','一名政治联系人建立了渠道；其忠诚与报告均不确定。');
 }
 for(const agent of s.world.doubleAgents){
  if(agent.status!=='active'||current(s)<agent.nextReport)continue;
  agent.nextReport=current(s)+6;const person=s.world.characters[agent.person];
  if(!person?.alive||person.faction!==agent.target||person.missing||!s.factions[agent.actor]){agent.status='inactive';const offer=s.world.politicalContacts.find(x=>x.actor===agent.actor&&x.target===agent.target&&x.person===agent.person&&x.status==='channel_open');if(offer)offer.status='lost_contact';continue}
  agent.reassessAt??=current(s)+12;agent.history||=[];
  if(current(s)>=agent.reassessAt){
   agent.reassessAt=current(s)+12;const offer=s.world.politicalContacts.find(x=>x.actor===agent.actor&&x.target===agent.target&&x.person===agent.person),trust=offer?(s.world.personalRelations[pair(agent.person,offer.representative)]?.trust||0):0;
   const canTurn=agent.allegiance==='home'&&person.loyalty<=30&&politicalAmbition(s,person.id)>=75&&trust>=20,canReturn=agent.allegiance==='sponsor'&&person.loyalty>=80;
   if((canTurn||canReturn)&&random(s)<.3){agent.allegiance=canTurn?'sponsor':'home';agent.history.push({year:s.year,month:s.month,allegiance:agent.allegiance});agent.history=agent.history.slice(-12)}
  }
  const watch=s.world.securityWatches?.[agent.target],watched=watch&&current(s)>=watch.start&&current(s)<=watch.end;
  if(watched&&random(s)<.22){agent.status='compromised';const offer=s.world.politicalContacts.find(x=>x.actor===agent.actor&&x.target===agent.target&&x.person===agent.person&&x.status==='channel_open');if(offer)offer.status='lost_contact';if(agent.target===s.player)notify(s,'A counterintelligence watch uncovered a political contact; investigate the evidence before acting.','反间谍警戒发现了一名政治联系人；采取行动前应调查证据。');continue}
  const network=s.world.conspiracies?.[agent.target];let suspect=null;
  if(agent.allegiance==='sponsor'&&network?.participants?.includes(agent.person))suspect=network.person;
  else if(agent.allegiance==='home'){
   // A false lead is chosen from the observer's own known names, not the
   // hidden political network or an undiscovered person.
   const known=s.knowledge[agent.actor]?.[agent.target]?.reportedLeaders||[];suspect=known.find(id=>id!==agent.person)||null;
  }
  addReport(s,agent.actor,agent.target,{kind:'conspiracy',character:suspect,value:suspect?'suspected':'unknown',source:'spy',confidence:'unverified',reliability:'low'});
 }
}
