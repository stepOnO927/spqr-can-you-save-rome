import {createFictionalPerson,initializeDynasties} from './dynasties.js?v=faces-name-disagreement-1';
import {NAME_POOLS,generateFictionalName} from './fictional-names.js?v=faces-wheels-1';
import {CHARACTER_CATALOG} from './characters.js?v=faces-name-disagreement-1';
import {hasNationalIdea} from './national-ideas.js?v=grand-chessboard-2';
import {ROUTES} from './data.js?v=phase-x-1';
import {buildingModifiers} from './inventions.js?v=mission-discount-1';
import {startingTraditions,traditionDiversity,transferTraditions} from './religious-demographics.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const log=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};
const rand=s=>{s.world.religionSeed=(Math.imul(s.world.religionSeed,1664525)+1013904223)>>>0;return s.world.religionSeed/4294967296};
const templates=[
 {id:'roman_college',region:'roma',name:['Public priestly college','公共祭司团'],description:['A simulated public priestly college rooted in Roman civic religion.','植根于罗马公民宗教的模拟公共祭司团。'],kind:'public_college',names:[['Aulus Fabius','奥卢斯·法比乌斯'],['Claudia Flavia','克劳狄娅·弗拉维娅']]},
 {id:'theban_temples',region:'egyptUpper',name:['Theban temple network','底比斯神庙网络'],description:['A simulated network of Egyptian temple communities.','埃及神庙共同体的模拟网络。'],kind:'temple_network',culture:NAME_POOLS.egyptian.culture,names:[['Psenamun','普塞纳蒙'],['Taimhotep','塔伊姆霍特普']]},
 {id:'syrian_association',region:'syria',name:['Syrian civic association','叙利亚公民协会'],description:['A simulated local religious and charitable association.','当地宗教与慈善协会的模拟组织。'],kind:'local_association',names:[['Maron','马隆'],['Helena of Antioch','安条克的海伦娜']]}
];
const policyNames={
 recognize:['recognized','承认'],sponsor:['funded','资助'],negotiate:['negotiated with','协商'],privilege:['granted privileges to','授予特权'],revoke:['revoked privileges from','撤销特权'],restrict:['restricted','限制'],tolerance:['adopted toleration toward','宽容'],investigate:['opened an inquiry into','调查']
};

// Demographic values are gameplay estimates, not historical census figures.
// Existing saved populations and institutions are never reset.
export function initializeReligion(s){
 if(!s.world.dynasties)initializeDynasties(s);
 for(const r of s.regions){
  if(!r.population||typeof r.population!=='object'){const prior=Number.isFinite(r.population)?Math.max(0,r.population):null;r.population={total:prior??Math.max(30000,Math.round(((r.tax||0)+(r.food||0))*15000)),satisfaction:clamp(r.loyalty??60,0,100)}}
  if(!Number.isFinite(r.population.total))r.population.total=Math.max(30000,Math.round(((r.tax||0)+(r.food||0))*15000));
  if(!Number.isFinite(r.population.baseline))r.population.baseline=Math.max(1,r.population.total);
  if(!Number.isFinite(r.population.satisfaction))r.population.satisfaction=clamp(r.loyalty??60,0,100);
  if(!Number.isFinite(r.population.householdWealth))r.population.householdWealth=Math.max(0,Math.floor(r.population.total/5000));
  r.population.traditions||=startingTraditions(r.id);
 }
 s.world.religiousInstitutions||=[];s.world.religionInvestigations||=[];s.world.religionReports||={};s.world.religionSeed??=720049;
 if(!s.world.religionSeeded){
  // Institution seeding has its own random stream and must not perturb the
  // pre-existing household simulation's deterministic sequence.
  const householdSeed=s.world.dynasties.seed;
  for(const t of templates){
   if(s.world.religiousInstitutions.some(o=>o.id===t.id))continue;
   const r=s.regions.find(x=>x.id===t.region),faction=r?.owner;if(!r||!s.factions[faction]||faction==='rebels')continue;
   const council=t.names.map((name,i)=>{const id=createFictionalPerson(s,{name,faction,birthYear:s.year-(i?34:48),location:r.id,sex:i?'female':'male',role:['Simulated religious official','模拟宗教人士'],...(t.culture?{culture:t.culture}:{})});s.world.characters[id].institutionalOnly=true;s.world.characters[id].ambition=Math.floor(20+rand(s)*60);return id});
   s.world.religiousInstitutions.push({id:t.id,name:t.name,description:t.description,kind:t.kind,region:r.id,followers:Math.floor(r.population.total*.08),wealth:12,leader:council[0],council,influence:25,legitimacy:60,relations:{[faction]:15},recognizedBy:[],privilegedBy:[],factions:{traditional:50,civic:50},dispute:0,corruption:t.id==='roman_college'?25:t.id==='theban_temples'?35:15,history:[]});
  }
  s.world.dynasties.seed=householdSeed;
  s.world.religionSeeded=true;
 }
 // Existing temple records establish a local Egyptian affiliation. Correct
 // only the old generic or Greek-court default; retain any explicit culture.
 const temple=s.world.religiousInstitutions.find(o=>o.id==='theban_temples');
 for(const id of temple?.council||[]){const entry=s.world.dynasties.catalog[id],prior=entry?.culture?.[0];if(entry?.fictional&&(prior==='Simulated'||prior===NAME_POOLS.greek_egyptian.culture[0])){entry.culture=[...NAME_POOLS.egyptian.culture];if(CHARACTER_CATALOG[id])CHARACTER_CATALOG[id].culture=[...entry.culture]}}
 // Priorities are institutional tendencies, not moral judgments about a
 // religion. Old saves receive defaults without changing their finances.
 for(const o of s.world.religiousInstitutions){o.priorities||=(o.kind==='temple_network'?['relief','infrastructure']:o.kind==='public_college'?['relief','education']:['education','relief']);o.institutionalLoyalty??=50;o.works??=0}
 for(const r of s.regions){const local=localInstitutions(s,r.id),total=local.reduce((n,o)=>n+o.followers,0);if(total>r.population.total)for(const o of local)o.followers=Math.floor(o.followers*r.population.total/total)}
 return s;
}
export function localInstitutions(s,region){return (s.world?.religiousInstitutions||[]).filter(o=>o.region===region)}
export function populationFactor(r){return r.population?clamp(r.population.total/Math.max(1,r.population.baseline),.7,1.2):1}
export function religiousTaxCost(s,faction){return (s.world?.religiousInstitutions||[]).filter(o=>o.privilegedBy.includes(faction)&&s.regions.some(r=>r.id===o.region&&r.owner===faction)).length}
function workingAuthority(s,o,actor){
 const person=s.world.characters[o.leader];
 return person?.alive&&person.faction===actor&&person.location===o.region&&!person.travel&&(person.religiousWorks||0)>=2?person:null;
}
function recordInstitutionWork(s,o,action,extra={}){
 const person=s.world.characters[o.leader];
 if(person?.alive&&person.location===o.region){person.religiousWorks=(person.religiousWorks||0)+1;person.influence=clamp((person.influence||0)+2,0,100)}
 o.history.push({action,...extra,...(person?.alive?{authority:person.id}:{}),year:s.year,month:s.month});
 o.history=o.history.slice(-30);
}
function migratePopulation(s){
 const regions=new Map(s.regions.map(r=>[r.id,r])),plans=[];
 for(const from of s.regions){
  const people=from.population;
  if(!people||people.total<1000||people.satisfaction>=45||!s.factions[from.owner]||from.owner==='rebels')continue;
  const neighbors=ROUTES.filter(([a,b,kind])=>kind!=='sea'&&(a===from.id||b===from.id)).map(([a,b])=>regions.get(a===from.id?b:a)).filter(to=>to?.owner===from.owner&&to.population?.satisfaction>=Math.max(55,people.satisfaction+20));
  neighbors.sort((a,b)=>b.population.satisfaction-a.population.satisfaction||a.id.localeCompare(b.id));
  const to=neighbors[0];if(!to)continue;
  const count=Math.min(800,Math.floor(people.total*(45-people.satisfaction)/35*.0025));
  if(count>0)plans.push({from:from.id,to:to.id,count,owner:from.owner});
 }
 for(const move of plans){
  const from=regions.get(move.from),to=regions.get(move.to),count=Math.min(move.count,Math.max(0,from.population.total-1));
  if(!count||to.owner!==move.owner)continue;
  const wealth=Math.min(from.population.householdWealth||0,Math.floor((from.population.householdWealth||0)*count/from.population.total));
  transferTraditions(from,to,count);from.population.total-=count;to.population.total+=count;from.population.householdWealth-=wealth;to.population.householdWealth+=wealth;
  const record={from:from.id,to:to.id,count,year:s.year,month:s.month};(s.world.populationMigrations||=[]).push(record);s.world.populationMigrations=s.world.populationMigrations.slice(-80);
  if(move.owner===s.player)log(s,`${count.toLocaleString('en-US')} people moved from ${from.name[0]} to ${to.name[0]} after local hardship.`,`因当地生活困难，${count.toLocaleString('zh-CN')}人从${from.name[1]}迁往${to.name[1]}。`);
 }
}
export function religiousPolicy(s,actor,id,action){
 initializeReligion(s);const o=s.world.religiousInstitutions.find(x=>x.id===id),r=o&&s.regions.find(x=>x.id===o.region),f=s.factions[actor];
 if(!o||!r||r.owner!==actor||!f)return {ok:false,reason:'unavailable'};
 const costs={recognize:5,sponsor:10,negotiate:6,privilege:8,revoke:0,restrict:5,tolerance:6,investigate:8},cost=costs[action];
 if(cost===undefined)return {ok:false,reason:'invalid'};
 if(action==='recognize'&&o.recognizedBy.includes(actor)||action==='privilege'&&o.privilegedBy.includes(actor))return {ok:false,reason:'existing'};
 if(action==='revoke'&&!o.privilegedBy.includes(actor))return {ok:false,reason:'unavailable'};
 if(action==='investigate'&&s.world.religionInvestigations.some(x=>x.actor===actor&&x.id===id&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(f.treasury<cost)return {ok:false,reason:'treasury'};
 f.treasury-=cost;const relation=o.relations[actor]??0,share=o.followers/Math.max(1,r.population.total),authority=workingAuthority(s,o,actor);
 if(action==='recognize'){o.recognizedBy.push(actor);o.relations[actor]=clamp(relation+12,-100,100);f.legitimacy=clamp(f.legitimacy+2,0,100)}
 if(action==='sponsor'){o.wealth+=10;o.relations[actor]=clamp(relation+12,-100,100);o.legitimacy=clamp(o.legitimacy+2,0,100)}
 if(action==='negotiate'){o.relations[actor]=clamp(relation+8+(authority?2:0),-100,100);if(relation>-40){r.population.satisfaction=clamp(r.population.satisfaction+2+(authority?1:0),0,100);r.loyalty=clamp(r.loyalty+1,0,100)}}
 if(action==='privilege'){o.privilegedBy.push(actor);o.relations[actor]=clamp(relation+15,-100,100)}
 if(action==='revoke'){o.privilegedBy=o.privilegedBy.filter(id=>id!==actor);o.relations[actor]=clamp(relation-8,-100,100)}
 if(action==='restrict'){o.relations[actor]=clamp(relation-20,-100,100);r.population.satisfaction=clamp(r.population.satisfaction-Math.ceil(share*20)*(o.legitimacy>50?2:1),0,100);f.stability=clamp(f.stability+1,0,100)}
 if(action==='tolerance'){o.relations[actor]=clamp(relation+8,-100,100);r.population.satisfaction=clamp(r.population.satisfaction+1+Math.round(traditionDiversity(r.population)*4)+(buildingModifiers(r).satisfaction||0),0,100);f.legitimacy=clamp(f.legitimacy+1,0,100)}
 if(['negotiate','tolerance'].includes(action)&&hasNationalIdea(s,actor,'tolerance'))o.relations[actor]=clamp(o.relations[actor]+2,-100,100);
 if(action==='investigate')s.world.religionInvestigations.push({actor,id,status:'pending',remaining:3,year:s.year,month:s.month});
 const loyaltyChange={recognize:4,sponsor:3,negotiate:2,privilege:4,revoke:-3,restrict:-10,tolerance:3,investigate:0}[action];o.institutionalLoyalty=clamp(o.institutionalLoyalty+loyaltyChange,0,100);
 o.history.push({action,actor,...(action==='negotiate'&&authority?{authority:authority.id}:{}),year:s.year,month:s.month});o.history=o.history.slice(-30);
 if(actor===s.player){
  const official=o.leader&&s.world.characters[o.leader]?.alive?s.world.dynasties.catalog[o.leader]?.name:null;
  const subject=official?`${o.name[0]} (led by ${official[0]})`:o.name[0],subjectZh=official?`${o.name[1]}（主持者：${official[1]}）`:o.name[1];
  const namedAuthority=action==='negotiate'&&authority?s.world.dynasties.catalog[authority.id]?.name:null;
  log(s,namedAuthority?`${namedAuthority[0]} helped negotiate with ${subject} in ${r.name[0]}.`:`Your government ${policyNames[action][0]} ${subject} in ${r.name[0]}${cost?`; ${cost} treasury spent`:''}.`,namedAuthority?`${namedAuthority[1]}协助商谈与${subjectZh}在${r.name[1]}的关系。`:`本方在${r.name[1]}：${subjectZh} · ${policyNames[action][1]}${cost?`；支出国库${cost}`:''}。`);
 }
 return {ok:true,cost};
}
export function advanceReligion(s){
 initializeReligion(s);
 for(const op of s.world.religionInvestigations){
  if(op.status!=='pending'||--op.remaining>0)continue;const o=s.world.religiousInstitutions.find(x=>x.id===op.id);op.status='complete';
  const q=rand(s),value=o&&q<(o.corruption||0)/140?'suspected':'no_evidence';(s.world.religionReports[op.actor]||=[]).unshift({id:op.id,value,year:s.year,month:s.month,confidence:'unverified'});
  if(op.actor===s.player)log(s,'An inquiry into an institution returned an unverified report.','对机构的调查已返回一份未经核实的报告。');
 }
 for(const o of s.world.religiousInstitutions){
  const r=s.regions.find(x=>x.id===o.region),government=r&&s.factions[r.owner];if(!r||!government)continue;
  if(!s.world.characters[o.leader]?.alive)o.leader=o.council.find(id=>s.world.characters[id]?.alive)||null;
  if(o.id==='theban_temples'){
   const now=s.year*12+s.month,vacancy=o.council.findIndex(id=>!s.world.characters[id]?.alive);
   if(vacancy<0)delete o.vacancySince;
   else{o.vacancySince??=now;
    // A replacement needs a recorded vacancy and the temple's own funds.
    // One appointment per January leaves real succession gaps in the record.
    if(s.month===1&&now>o.vacancySince&&o.wealth>=6&&r.owner!=='rebels'){
     const sex=vacancy===1?'female':'male',identity=generateFictionalName(s,{originFaction:r.owner,location:r.id,cultureStyle:'egyptian',sex});
     const id=createFictionalPerson(s,{...identity,faction:r.owner,birthYear:s.year-35,location:r.id,sex,role:['Simulated temple official','模拟神庙人员'],origin:'institution_recruit'});
     s.world.characters[id].institutionalOnly=true;o.wealth-=6;o.council[vacancy]=id;if(!o.leader)o.leader=id;
     o.history.push({action:'appointment',person:id,cost:6,year:s.year,month:s.month});o.history=o.history.slice(-30);o.vacancySince=now;
    }
   }
  }
  const relation=o.relations[r.owner]??0;
  if(s.month===1)o.institutionalLoyalty=clamp(o.institutionalLoyalty+Math.sign(relation),0,100);
  if(o.privilegedBy.includes(r.owner))o.wealth++;
  if(s.month%6!==0)continue;
  const other=localInstitutions(s,r.id).filter(x=>x!==o).reduce((n,x)=>n+x.followers,0),capacity=Math.max(0,r.population.total-other);
  const change=Math.round(o.followers*(o.legitimacy>=50&&relation>=-20?.02:-.02));o.followers=clamp(o.followers+change,0,capacity);
  o.wealth+=Math.min(3,Math.floor(o.followers/10000));o.influence=clamp(Math.round(o.followers/Math.max(1,r.population.total)*100+o.legitimacy*.25),0,100);
  if(government.tax==='high'&&o.followers>r.population.total*.04){o.relations[r.owner]=clamp(relation-2,-100,100);r.population.satisfaction=clamp(r.population.satisfaction-1,0,100)}
  if(o.wealth>=8&&r.population.satisfaction<55&&relation>=-20){o.wealth-=5;r.population.satisfaction=clamp(r.population.satisfaction+3,0,100);r.loyalty=clamp(r.loyalty+1,0,100);recordInstitutionWork(s,o,'relief')}
  // Annual projects spend the institution's own money and affect existing
  // theater capacity or a real local person's education, never a free army.
  if(s.month===12&&relation>=10&&o.priorities.includes('infrastructure')&&o.wealth>=20&&o.works<2){o.wealth-=12;o.works++;r.supply++;recordInstitutionWork(s,o,'infrastructure')}
  else if(s.month===12&&relation>=0&&o.priorities.includes('education')&&o.wealth>=14){const pupil=Object.values(s.world.characters).find(c=>c.alive&&c.faction===r.owner&&c.location===r.id&&!c.institutionalOnly&&c.birthYear!=null&&s.year-c.birthYear>=0&&s.year-c.birthYear<25&&(c.education||0)<75);if(pupil){o.wealth-=6;pupil.education=Math.min(100,(pupil.education||0)+6);recordInstitutionWork(s,o,'education',{person:pupil.id})}}
  // Competing civic and traditional priorities can displace the current
  // leader, but neither faction is inherently violent or conspiratorial.
  const direction=relation<0?2:-1;o.factions.civic=clamp(o.factions.civic+direction,0,100);o.factions.traditional=100-o.factions.civic;o.dispute=Math.abs(o.factions.civic-50)*2;
  const prefer=o.factions.civic>65?o.council[1]:o.factions.civic<35?o.council[0]:o.leader;
  if(prefer&&s.world.characters[prefer]?.alive)o.leader=prefer;
 }
 if(s.month===12){for(const r of s.regions){const f=s.factions[r.owner],p=r.population;if(!f||!p)continue;const hardship=(f.food<0?-0.008:0)+(p.satisfaction<35?-0.004:0),growth=0.002+hardship;p.total=Math.max(0,Math.round(p.total*(1+growth)));p.satisfaction=clamp(p.satisfaction+(f.tax==='high'?-2:f.tax==='low'?1:0)+(f.food<0?-2:0)+(buildingModifiers(r).satisfaction||0),0,100);p.householdWealth=Math.max(0,p.householdWealth+Math.floor(r.food/2)-(f.tax==='high'?2:0));const local=localInstitutions(s,r.id),total=local.reduce((n,o)=>n+o.followers,0);if(total>p.total)for(const o of local)o.followers=Math.floor(o.followers*p.total/total)}migratePopulation(s)}
}
