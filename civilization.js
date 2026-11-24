import {CHARACTER_CATALOG,initializeWorld} from './characters.js?v=faces-name-disagreement-1';
import {reportedPeople,visiblePersonName} from './person-knowledge.js?v=faces-name-disagreement-1';
import {personTravelRoute} from './person-travel-route.js';

const pair=(a,b)=>[a,b].sort().join(':');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const namedRoles={antony:['military'],labienus:['military'],scipio:['military','statesman'],cicero:['statesman','scholar'],cato:['statesman'],lepidus:['statesman'],varro:['military','scholar']};
const note=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};
const offerName=offer=>offer.name||(!CHARACTER_CATALOG[offer.id]?.fictional?CHARACTER_CATALOG[offer.id]?.name:null)||['Unrecorded name','姓名未记录'];

export function initializeCivilization(s){
 initializeWorld(s);s.civilization||={prestige:{},patronage:{},recruitment:[],seed:49049};
 const c=s.civilization;c.prestige||={};c.patronage||={};c.recruitment||=[];c.seed??=49049;
 for(const id of Object.keys(s.factions||{}))if(id!=='rebels'&&!Number.isFinite(c.prestige[id]))c.prestige[id]=0;
 return c;
}
export function specialistRoles(s,id){
 const p=s.world?.characters?.[id];if(!p?.alive||p.missing||p.health==='deceased')return [];
 if(namedRoles[id])return namedRoles[id];
 if(!CHARACTER_CATALOG[id]?.fictional)return [];
 const roles=[];
 if((p.education||0)>=65)roles.push('scholar');
 if((p.education||0)>=45)roles.push('engineer');
 if((p.influence||0)>=55)roles.push('statesman');
 if((p.battlesCommanded||0)>=2)roles.push('military');
 if(p.institutionalOnly)roles.push('religious');
 return roles;
}
export function specialistBonus(s,owner,role){
 return Object.entries(s.world?.characters||{}).some(([id,p])=>p.faction===owner&&!p.travel&&p.alive&&!p.missing&&specialistRoles(s,id).includes(role))?1:0;
}
export function commissionCulturalEvent(s,owner){
 const c=initializeCivilization(s),f=s.factions[owner],now=s.year*12+s.month;
 if(!f||!s.regions.some(r=>r.owner===owner))return {ok:false,reason:'owner'};
 if(f.treasury<16)return {ok:false,reason:'treasury'};
 if((c.patronage[owner]??-Infinity)+6>now)return {ok:false,reason:'cooldown'};
 f.treasury-=16;c.prestige[owner]+=4;c.patronage[owner]=now;
 if(owner===s.player)note(s,'A public cultural event earned 4 Cultural Prestige at a cost of 16 treasury.','公共文化活动耗费16国库，获得4文化声望。');
 return {ok:true,prestige:c.prestige[owner]};
}
export function fundEducation(s,owner){
 const c=initializeCivilization(s),f=s.factions[owner],x=s.inventions?.[owner];
 if(!f||!x)return {ok:false,reason:'owner'};
 if(c.prestige[owner]<6)return {ok:false,reason:'prestige'};
 if(f.treasury<10)return {ok:false,reason:'treasury'};
 c.prestige[owner]-=6;f.treasury-=10;x.scholarVisits=(x.scholarVisits||0)+1;
 if(owner===s.player)note(s,'Education patronage spent 6 Cultural Prestige and 10 treasury; the next research project will be faster.','教育赞助消耗6文化声望和10国库；下个研究项目将加快。');
 return {ok:true};
}
export function knownForeignSpecialists(s,owner){
 initializeCivilization(s);
 // A reported fictional person may be invited without exposing private
 // education or employment. Their suitability is resolved when they reply.
 const seen=new Set();return Object.keys(s.factions||{}).filter(target=>target!==owner&&target!=='rebels').flatMap(target=>reportedPeople(s,owner,target).filter(id=>(namedRoles[id]||CHARACTER_CATALOG[id]?.fictional)&&!seen.has(id)&&seen.add(id)).map(id=>({id,target,name:visiblePersonName(s,owner,id)})));
}
export function inviteForeignSpecialist(s,owner,id){
 const c=initializeCivilization(s),lead=knownForeignSpecialists(s,owner).find(x=>x.id===id),target=lead?.target,f=s.factions[owner];
 if(!f||!lead||!target||target===owner||!s.factions[target])return {ok:false,reason:'unknown'};
 if(s.wars?.some(w=>w.includes(owner)&&w.includes(target)))return {ok:false,reason:'war'};
 if((s.relations?.[pair(owner,target)]||0)<0)return {ok:false,reason:'relations'};
 if(c.recruitment.some(x=>x.id===id&&['pending','travel'].includes(x.status)))return {ok:false,reason:'busy'};
 if(c.prestige[owner]<8)return {ok:false,reason:'prestige'};
 if(f.treasury<20)return {ok:false,reason:'treasury'};
 c.prestige[owner]-=8;f.treasury-=20;
 const name=[...lead.name];c.recruitment.push({id,owner,target,name,remaining:3,status:'pending',year:s.year,month:s.month});
 if(owner===s.player)note(s,`A paid invitation was sent to ${name[0]}; a reply will take three months.`,`已向${name[1]}发出有偿邀约；约三个月后收到答复。`);
 return {ok:true,remaining:3};
}
export function advanceCivilization(s){
 const c=initializeCivilization(s);
 if(s.month%3===0)for(const owner of Object.keys(c.prestige)){
  const monuments=s.regions.filter(r=>r.owner===owner&&(r.buildings||[]).includes('inscriptions')).length;
  const culturalIdeas=(s.inventions?.[owner]?.active?.culture||[]).filter(id=>['rhetorical_education','philosophical_patronage'].includes(id)).length;
  c.prestige[owner]=clamp(c.prestige[owner]+Math.min(3,monuments+culturalIdeas+specialistBonus(s,owner,'scholar')),0,200);
 }
 for(const offer of c.recruitment.filter(x=>x.status==='pending')){
  if(--offer.remaining>0)continue;
  const p=s.world.characters[offer.id];
  const available=p?.alive&&!p.missing&&p.faction===offer.target&&!p.travel&&specialistRoles(s,offer.id).length>0&&!s.wars.some(w=>w.includes(offer.owner)&&w.includes(offer.target))&&!(s.world.leadership?.[offer.target]||[]).includes(offer.id)&&!(s.world.claimants?.[offer.target]||[]).includes(offer.id)&&!s.armies.some(a=>a.characterId===offer.id)&&!Object.values(s.world.offices?.[offer.target]||{}).includes(offer.id)&&!Object.values(s.world.localGovernors||{}).some(post=>post.faction===offer.target&&post.person===offer.id);
  const relation=s.relations?.[pair(offer.owner,offer.target)]||0;
  const ambition=p?.ambition??40,loyalty=p?.loyalty??75;
  const chance=clamp(.32+relation/250+ambition/400-loyalty/250,0,.8);
  c.seed=(Math.imul(c.seed,1664525)+1013904223)>>>0;
  const name=offerName(offer);
  if(!available||c.seed/4294967296>=chance){offer.status='refused';if(offer.owner===s.player)note(s,`${name[0]} declined or could not travel; the invitation cost was spent.`,`${name[1]}拒绝或无法成行；邀约费用已经支付。`);continue}
  const routes=s.regions.filter(r=>r.owner===offer.owner).map(r=>({destination:r,route:personTravelRoute(s,p,offer.target,r.id)})).filter(x=>x.route).sort((a,b)=>a.route.months-b.route.months||a.destination.id.localeCompare(b.destination.id));
  const selected=routes[0];
  if(!selected||s.factions[offer.owner].treasury<selected.route.cost){offer.status='refused';if(offer.owner===s.player)note(s,`The journey for ${name[0]} could not be funded or routed.`,`无法为${name[1]}安排或支付行程。`);continue}
  s.factions[offer.owner].treasury-=selected.route.cost;
  offer.status='travel';offer.destination=selected.destination.id;offer.travelCost=selected.route.cost;offer.remaining=selected.route.months;
  p.travel={destination:offer.destination,legs:selected.route.legs,remaining:selected.route.legs[0].months+1};
  if(offer.owner===s.player)note(s,`${name[0]} accepted and began the journey.`,`${name[1]}接受邀约，正在旅途中。`);
 }
 if(c.recruitment.length>60){const active=c.recruitment.filter(x=>['pending','travel'].includes(x.status)),history=c.recruitment.filter(x=>!['pending','travel'].includes(x.status));c.recruitment=[...history.slice(-60),...active]}
 return c;
}
export function settleRecruitmentTravel(s){
 const c=initializeCivilization(s);
 for(const offer of c.recruitment.filter(x=>x.status==='travel')){
  const p=s.world.characters[offer.id],travel=p?.travel;
  if(travel){offer.remaining=travel.remaining+travel.legs.slice(1).reduce((n,leg)=>n+leg.months,0);continue}
  const destination=s.regions.find(r=>r.id===offer.destination),employed=s.armies.some(a=>a.characterId===offer.id)||Object.values(s.world.offices?.[offer.target]||{}).includes(offer.id);
  const name=offerName(offer);
  if(!p?.alive||p.missing||p.faction!==offer.target||p.location!==offer.destination||destination?.owner!==offer.owner||employed||s.wars.some(w=>w.includes(offer.owner)&&w.includes(offer.target))){offer.status='lost';if(offer.owner===s.player)note(s,`The journey of ${name[0]} did not complete the appointment.`,`未能完成${name[1]}的聘任行程。`);continue}
  p.faction=offer.owner;p.loyalty=clamp(Math.round((p.loyalty||60)*.55),30,70);offer.status='arrived';offer.remaining=0;
  if(offer.owner===s.player||offer.target===s.player)note(s,`${name[0]} arrived and joined ${offer.owner}.`,`${name[1]}抵达并加入${offer.owner}。`);
 }
 return c;
}
export function aiCivilization(s,owner){
 const c=initializeCivilization(s),f=s.factions[owner];if(!f||owner===s.player||owner==='rebels')return;
 // Wartime courts only patronize culture after keeping a substantial reserve.
 if(s.wars?.some(w=>w.includes(owner))&&f.treasury<150)return;
 if(f.treasury>85&&c.prestige[owner]<8)commissionCulturalEvent(s,owner);
 if(f.treasury>95&&c.prestige[owner]>=8&&!c.recruitment.some(x=>x.owner===owner&&['pending','travel'].includes(x.status))){
  const now=s.year*12+s.month,recent=new Set(c.recruitment.filter(x=>x.owner===owner&&(x.status==='arrived'||Number.isInteger(x.year)&&Number.isInteger(x.month)&&now-(x.year*12+x.month)<12)).map(x=>x.id));
  const candidate=knownForeignSpecialists(s,owner).find(x=>!recent.has(x.id));
  if(candidate)inviteForeignSpecialist(s,owner,candidate.id);
 }
 if(f.treasury>75&&c.prestige[owner]>=6&&s.inventions?.[owner]?.research==null&&s.inventions[owner].scholarVisits===0)fundEducation(s,owner);
}
