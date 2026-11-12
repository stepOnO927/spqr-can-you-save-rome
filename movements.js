import {FACTIONS,ROUTES} from './data.js?v=phase-x-1';
import {CHARACTER_CATALOG} from './characters.js?v=newborn-age-1';
import {createFictionalPerson} from './dynasties.js?v=born-portraits-1';
import {hasNationalIdea} from './national-ideas.js?v=grand-chessboard-2';
import {activeAgreement,terminateAgreement} from './agreements.js?v=grand-chessboard-2';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const log=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};
const active=m=>!['settled','collapsed','defeated','victorious'].includes(m.stage);
const war=(s,a,b)=>s.wars.some(w=>w.includes(a)&&w.includes(b));
const capable=c=>!!c?.alive&&!c.missing&&!c.travel&&!['seriously_ill','dying','deceased'].includes(c.health);
export function initializeMovements(s){
 s.world.movements||=[];s.world.movementUnrest||={};s.world.movementUnrestOwner||={};s.world.movementFactionCatalog||={};s.world.movementKnowledge||={};s.world.movementContacts||=[];s.world.movementRecognitions||={};s.world.nextMovementId||=1;
 for(const m of s.world.movements){m.cohesion??=70;m.internalFactions||={moderate:70,hardline:30};m.schismMonths??=0}
 for(const [id,description] of Object.entries(s.world.movementFactionCatalog))FACTIONS[id]=description;
 return s;
}
function grievances(s,r){
 const f=s.factions[r.owner],p=r.population;if(!f||!p)return [];
 const issues=[];
 if(f.tax==='high')issues.push('taxation');if(f.food<0||p.householdWealth<3)issues.push('hardship');
 if(r.loyalty<35)issues.push('provincial');if(p.satisfaction<45)issues.push('exclusion');
 if(f.legitimacy<40)issues.push('legitimacy');if(f.stability<40)issues.push('instability');
 if((s.world.religiousInstitutions||[]).some(o=>o.region===r.id&&(o.relations[r.owner]??0)<-20))issues.push('religious');
 return issues;
}
function objectiveFor(issues){return issues.includes('legitimacy')?'replace_leadership':issues.includes('taxation')?'reduce_tax':issues.includes('religious')?'religious_freedom':'provincial_autonomy'}
function appointLeader(s,m,r){
 const officials=s.world.religiousInstitutions||[],religious=officials.find(o=>o.region===r.id&&(o.relations[m.parent]??0)<-20&&(o.institutionalLoyalty??50)<70&&capable(s.world.characters[o.leader]));
 const candidates=Object.values(s.world.characters).filter(c=>c.faction===m.parent&&capable(c)&&c.location===r.id&&!(s.world.leadership[m.parent]||[]).includes(c.id)&&!s.armies.some(a=>a.characterId===c.id));
 let person=religious&&candidates.find(c=>c.id===religious.leader)||candidates.filter(c=>!c.institutionalOnly&&c.loyalty<60).sort((a,b)=>b.influence-a.influence||a.id.localeCompare(b.id))[0];
 if(!person){const id=createFictionalPerson(s,{name:['Local civic organizer','地方公民组织者'],faction:m.parent,birthYear:s.year-35,location:r.id,wealth:0,role:['Simulated movement organizer','模拟运动组织者']});person=s.world.characters[id];person.loyalty=45}
 m.leader=person.id;m.network=[person.id];
 if(religious&&religious.leader===person.id)m.organizations.push(religious.id);
}
function formMovement(s,r,issues){
 const m={id:`movement:${r.id}:${s.world.nextMovementId++}`,parent:r.owner,region:r.id,stage:'dissatisfaction',objective:objectiveFor(issues),grievances:issues,leader:null,network:[],organizations:[],supporters:Math.min(r.population.total,Math.max(0,Math.floor(r.population.total*.02))),funds:0,radicalism:0,cohesion:70,internalFactions:{moderate:70,hardline:30},schismMonths:0,months:0,negotiations:0,refusals:0,foreignSupport:[],history:[],year:s.year,month:s.month};
 s.world.movements.push(m);if(m.parent===s.player)log(s,`Dissatisfaction in ${r.name[0]} has developed into a public movement.`,`${r.name[1]}的不满已发展为公开政治运动。`);return m;
}
function raiseUprising(s,m,r){
 const government=s.factions[m.parent],leader=s.world.characters[m.leader];
 if(!capable(leader)||leader.faction!==m.parent||!government||r.owner!==m.parent||m.funds<8||m.supporters<3000||r.population.total<3000||s.armies.some(a=>a.owner===m.parent&&a.region===r.id&&a.men>0&&!a.move))return false;
 const id=m.id.replace('movement:','movement_force:'),name=[`${r.name[0]} movement`,`${r.name[1]}运动军`],definition={name,short:name,color:'#8a7365',ruler:CHARACTER_CATALOG[m.leader]?.name||['Local organizer','地方组织者']};
 s.world.movementFactionCatalog[id]=definition;FACTIONS[id]=definition;m.force=id;
 const soldiers=Math.min(3000,m.supporters,r.population.total),food=Math.min(8,Math.max(0,government.food));government.food-=food;r.population.total-=soldiers;m.supporters-=soldiers;m.recruited=soldiers;
 s.factions[id]={treasury:m.funds,food,manpower:0,stability:45,legitimacy:35,tax:'normal',research:0};m.funds=0;
 for(const personId of m.network){const member=s.world.characters[personId];if(member?.alive&&member.faction===m.parent&&!s.armies.some(a=>a.characterId===personId))member.faction=id}
 leader.faction=id;leader.location=r.id;s.world.leadership[id]=[m.leader];r.owner=id;r.loyalty=45;
 s.armies.push({id:`movement_army:${s.nextArmy++}`,name:['Movement militia','运动民兵'],owner:id,region:r.id,men:soldiers,morale:58,skill:1,experience:0,commander:CHARACTER_CATALOG[m.leader]?.name||['Local organizer','地方组织者'],characterId:m.leader,move:null,siege:null});
 if(!war(s,id,m.parent))s.wars.push([id,m.parent]);
 for(const targets of Object.values(s.knowledge))targets[id]||={reportedLeaders:[],reports:[],sightings:{}};
 s.knowledge[id]||=Object.fromEntries(Object.keys(s.factions).map(f=>[f,{reportedLeaders:[],reports:[],sightings:{}}]));
 if(s.controlKnowledge)s.controlKnowledge[id]=structuredClone(s.controlKnowledge[m.parent]||{});
 // Institutional backing for peaceful reform does not imply support for war.
 m.organizations=[];m.stage='armed';m.history.push({event:'armed',year:s.year,month:s.month});
 if(m.parent===s.player)log(s,`An armed movement in ${r.name[0]} has seized the theater.`,`${r.name[1]}的武装运动夺取了当地战区。`);return true;
}
function applyDemand(s,m,{constitutionalReform=false}={}){
 const f=s.factions[m.parent],r=s.regions.find(x=>x.id===m.region);if(!f||!r)return;
 if(m.objective==='reduce_tax'&&f.tax==='high')f.tax='normal';
 if(m.objective==='provincial_autonomy')r.autonomy=clamp((r.autonomy||0)+20,0,80);
 if(m.objective==='religious_freedom')for(const o of s.world.religiousInstitutions||[])if(o.region===r.id)o.relations[m.parent]=clamp((o.relations[m.parent]??0)+15,-100,100);
 if(m.objective==='replace_leadership'&&constitutionalReform){s.world.constitutionalOversight||={};s.world.constitutionalOversight[m.parent]={year:s.year,month:s.month};f.stability=clamp(f.stability+5,0,100)}
 r.loyalty=clamp(r.loyalty+12,0,100);r.population.satisfaction=clamp(r.population.satisfaction+12,0,100);f.legitimacy=clamp(f.legitimacy+3,0,100);
}
function returnFunds(m,r){if(m.funds>0&&r?.population){r.population.householdWealth=(r.population.householdWealth||0)+m.funds;m.funds=0}}
function observeMovements(s){
 for(const viewer of Object.keys(s.factions))for(const m of s.world.movements){
  const own=viewer===m.parent||viewer===m.force,owned=new Set(s.regions.filter(r=>r.owner===viewer).map(r=>r.id)),near=owned.has(m.region)||ROUTES.some(([a,b])=>a===m.region&&owned.has(b)||b===m.region&&owned.has(a));
  if(!own&&(!near||m.stage==='dissatisfaction'))continue;
  const reports=s.world.movementKnowledge[viewer]||={};reports[m.id]={id:m.id,parent:m.parent,region:m.region,stage:m.stage,objective:m.objective,leader:m.leader,supportApprox:Math.round(m.supporters/1000)*1000,year:s.year,month:s.month,source:own?'local':'frontier'};
 }
}
export function reportedMovements(s,viewer){return Object.values(s.world?.movementKnowledge?.[viewer]||{}).map(x=>({...x}))}
export function recognizeMovement(s,actor,id,recognize=true){
 initializeMovements(s);const report=s.world.movementKnowledge[actor]?.[id],f=s.factions[actor],records=s.world.movementRecognitions[actor]||={};
 if(!report||!f||report.parent===actor||recognize&&!active(report))return {ok:false,reason:'unavailable'};
 if(recognize&&records[id]||!recognize&&!records[id])return {ok:false,reason:'existing'};
 if(recognize&&f.treasury<5)return {ok:false,reason:'treasury'};
 if(recognize){f.treasury-=5;records[id]={year:s.year,month:s.month,parent:report.parent};}else delete records[id];
 const k=[actor,report.parent].sort().join(':');s.relations[k]=clamp((s.relations[k]??0)+(recognize?-8:3),-100,100);
 const m=s.world.movements.find(x=>x.id===id);if(m&&active(m)){m.recognizedBy||=[];m.recognizedBy=m.recognizedBy.filter(x=>x!==actor);if(recognize)m.recognizedBy.push(actor)}
 if(actor===s.player||report.parent===s.player){const country=FACTIONS[actor]?.short||[actor,actor];log(s,`${country[0]} ${recognize?'recognized':'withdrew recognition of'} a reported political movement.`,`${country[1]}${recognize?'承认了':'撤回了承认'}一个报告中的政治运动。`)}
 return {ok:true};
}
export function offerMovementSupport(s,actor,id,representative){
 initializeMovements(s);const report=s.world.movementKnowledge[actor]?.[id],person=s.world.characters[representative];
 if(!report||!active(report)||report.parent===actor||!report.leader||!s.factions[actor]||!person?.alive||person.faction!==actor||person.missing||person.travel||(s.world.personalRelations[[representative,report.leader].sort().join(':')]?.trust||0)<=0)return {ok:false,reason:'contact'};
 if(s.world.movementContacts.some(x=>x.actor===actor&&x.movement===id&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<10)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=10;s.world.movementContacts.push({actor,movement:id,reportedLeader:report.leader,representative,remaining:4,status:'pending',year:s.year,month:s.month});return {ok:true,duration:4};
}
function advanceMovementContacts(s){
 for(const op of s.world.movementContacts){
  if(op.status!=='pending'||--op.remaining>0)continue;
  const m=s.world.movements.find(x=>x.id===op.movement),rep=s.world.characters[op.representative],trust=s.world.personalRelations[[op.representative,op.reportedLeader].sort().join(':')]?.trust||0;
  if(!m||!active(m)||m.leader!==op.reportedLeader||!s.world.characters[m.leader]?.alive||!rep?.alive||rep.faction!==op.actor||trust<=0){op.status='no_reply';continue}
  // The movement chooses whether to accept; funding never grants control.
  if(trust>=20&&(m.funds<12||m.radicalism>=10)){if(m.stage==='armed'&&s.factions[m.force])s.factions[m.force].treasury+=8;else m.funds+=8;m.foreignSupport.push({actor:op.actor,amount:8,year:s.year,month:s.month});op.status='accepted'}
  else {if(s.factions[op.actor])s.factions[op.actor].treasury+=8;op.status='declined'}
  op.resolvedYear=s.year;op.resolvedMonth=s.month;
  if(op.actor===s.player)log(s,op.status==='accepted'?'A political movement accepted financial support; it remains independent.':'A political movement declined the proposed support.',op.status==='accepted'?'政治运动接受了资助，但仍独立行动。':'政治运动拒绝了资助提议。');
 }
}
function foldForce(s,m,installLeader,{inheritWars=false}={}){
 const id=m.force,parent=m.parent;if(!id||!s.factions[id]||!s.factions[parent])return false;
 // A settlement cannot silently end or transfer unrelated foreign wars.
 const enemies=s.wars.filter(w=>w.includes(id)&&!w.includes(parent)).map(w=>w.find(x=>x!==id));if(enemies.length&&!inheritWars)return false;
 const government=s.factions[parent],rival=s.factions[id];
 for(const r of s.regions)if(r.owner===id)r.owner=parent;
 for(const a of s.armies)if(a.owner===id){a.owner=parent;a.move=null;a.siege=null;a.order=null}
 government.treasury+=rival.treasury;government.food+=rival.food;government.manpower+=rival.manpower;
 for(const c of Object.values(s.world.characters))if(c.faction===id)c.faction=parent;
 if(installLeader&&s.world.characters[m.leader]?.alive)s.world.leadership[parent]=[m.leader];
 s.wars=s.wars.filter(w=>!w.includes(id));s.alliances=s.alliances.filter(a=>!a.includes(id));
 for(const enemy of enemies){
  const wasAllied=s.alliances.some(a=>a.includes(parent)&&a.includes(enemy));if(wasAllied){s.alliances=s.alliances.filter(a=>!(a.includes(parent)&&a.includes(enemy)));const key=[parent,enemy].sort().join(':');s.relations[key]=Math.max(-100,(s.relations[key]??0)-20)}
  const pact=activeAgreement(s,parent,enemy,'non_aggression');if(pact)terminateAgreement(s,pact.id,parent);
  if(!war(s,parent,enemy))s.wars.push([parent,enemy]);
 }
 delete s.factions[id];delete s.world.leadership[id];delete s.world.governments?.[id];return true;
}
export function respondToMovement(s,actor,id,action){
 initializeMovements(s);const m=s.world.movements.find(x=>x.id===id&&active(x));if(!m||m.parent!==actor||!s.factions[actor])return {ok:false,reason:'unavailable'};
 const f=s.factions[actor],r=s.regions.find(x=>x.id===m.region);if(!r||(!m.force&&r.owner!==actor))return {ok:false,reason:'unavailable'};
 const costs={negotiate:8,reform:18,refuse:0,transfer:0},cost=costs[action];if(cost===undefined||f.treasury<cost)return {ok:false,reason:'resources'};
 if(action==='transfer'&&(m.objective!=='replace_leadership'||!s.world.characters[m.leader]?.alive||![actor,m.force].includes(s.world.characters[m.leader].faction)||!['crisis','armed'].includes(m.stage)))return {ok:false,reason:'unavailable'};
 if(action==='reform'&&m.stage==='armed')return {ok:false,reason:'armed'};
 if(m.stage==='armed'&&['negotiate','transfer'].includes(action)&&!s.factions[m.force])return {ok:false,reason:'unavailable'};
 if(m.stage==='armed'&&['negotiate','transfer'].includes(action)&&s.wars.some(w=>w.includes(m.force)&&!w.includes(actor)))return {ok:false,reason:'foreign_war'};
 f.treasury-=cost;
 if(action==='refuse'){m.refusals++;m.radicalism=clamp(m.radicalism+5,0,100);r.population.satisfaction=clamp(r.population.satisfaction-2,0,100);return {ok:true,settled:false}}
 if(action==='transfer'){if(m.force&&!foldForce(s,m,true))return {ok:false,reason:'unavailable'};if(!m.force)s.world.leadership[actor]=[m.leader];applyDemand(s,m);returnFunds(m,r);m.stage='settled';m.outcome='transfer';return {ok:true,settled:true}}
 if(action==='negotiate'){
  m.negotiations++;m.radicalism=Math.max(0,m.radicalism-4);
  if(m.stage==='armed'&&m.radicalism<20){if(!foldForce(s,m,false))return {ok:false,reason:'unavailable'};applyDemand(s,m);m.stage='settled';m.outcome='negotiated';return {ok:true,settled:true}}
  if(m.stage!=='armed'){r.population.satisfaction=clamp(r.population.satisfaction+5,0,100);m.supporters=Math.floor(m.supporters*.8);if(m.radicalism<10&&m.supporters<r.population.total*.06){returnFunds(m,r);m.stage='settled';m.outcome='negotiated';return {ok:true,settled:true}}}
  return {ok:true,settled:false};
 }
 applyDemand(s,m,{constitutionalReform:true});m.supporters=Math.floor(m.supporters*.5);m.radicalism=Math.max(0,m.radicalism-10);if(m.radicalism>=10){m.history.push({event:'reform_contested',year:s.year,month:s.month});return {ok:true,settled:false}}returnFunds(m,r);m.stage='settled';m.outcome='reform';return {ok:true,settled:true};
}
function resolveArmedMovement(s,m){
 const id=m.force,parent=m.parent;if(!s.factions[id]){m.stage='defeated';return}
 const rebelAlive=s.regions.some(r=>r.owner===id)||s.armies.some(a=>a.owner===id&&a.men>0),governmentAlive=s.regions.some(r=>r.owner===parent)||s.armies.some(a=>a.owner===parent&&a.men>0);
 if(rebelAlive&&!s.world.characters[m.leader]?.alive){
  let successor=m.network.find(person=>s.world.characters[person]?.alive&&s.world.characters[person].faction===id);
  if(!successor){const place=s.regions.find(r=>r.owner===id)?.id||s.armies.find(a=>a.owner===id&&a.men>0)?.region;successor=createFictionalPerson(s,{name:['Movement representative','运动代表'],faction:id,birthYear:s.year-30,location:place,wealth:0,role:['Simulated movement representative','模拟运动代表']});m.network.push(successor)}
  m.leader=successor;s.world.leadership[id]=[successor];
 }
 if(rebelAlive&&governmentAlive)return;
 if(!rebelAlive){if(foldForce(s,m,false)){m.stage='defeated';m.outcome='military_defeat'}return}
 if(!governmentAlive&&foldForce(s,m,true,{inheritWars:true})){applyDemand(s,m);m.stage='victorious';m.outcome='government_change';if(parent===s.player)log(s,'A movement won the civil war and established a new government.','政治运动赢得内战并建立了新政府。')}
}
export function advanceMovements(s,{autoplayPlayer=false}={}){
 initializeMovements(s);
 advanceMovementContacts(s);
 for(const m of s.world.movements.filter(x=>x.stage==='armed'))resolveArmedMovement(s,m);
 for(const m of s.world.movements.filter(x=>active(x)&&x.stage!=='armed')){const r=s.regions.find(x=>x.id===m.region);if(!r||r.owner!==m.parent||!s.factions[m.parent]){returnFunds(m,r);m.stage='collapsed';m.outcome='control_changed'}}
 for(const r of s.regions){
  if(!s.factions[r.owner]||r.owner==='rebels'||r.owner.startsWith('movement_force:')||!r.population)continue;
  if(s.world.movementUnrestOwner[r.id]!==r.owner){s.world.movementUnrestOwner[r.id]=r.owner;s.world.movementUnrest[r.id]=0}
  const issues=grievances(s,r),pressure=issues.length*15,existing=s.world.movements.find(x=>x.region===r.id&&x.parent===r.owner&&active(x));
  if(!existing){const local=issues.some(x=>['hardship','provincial','exclusion','religious'].includes(x));s.world.movementUnrest[r.id]=issues.length>=3&&local?(s.world.movementUnrest[r.id]||0)+1:Math.max(0,(s.world.movementUnrest[r.id]||0)-1);if(s.world.movementUnrest[r.id]>=3){formMovement(s,r,issues);s.world.movementUnrest[r.id]=0}continue}
  const m=existing;if(m.stage==='armed')continue;m.months++;m.grievances=issues;
  const hardlineTarget=clamp(30+m.radicalism*2,10,80);m.internalFactions.hardline=clamp(m.internalFactions.hardline+Math.sign(hardlineTarget-m.internalFactions.hardline),0,100);m.internalFactions.moderate=100-m.internalFactions.hardline;
  if(m.negotiations>0&&m.radicalism>=12&&pressure>=60)m.cohesion=Math.max(0,m.cohesion-5);else if(pressure<45)m.cohesion=Math.min(100,m.cohesion+1);
  m.schismMonths=m.cohesion<25?m.schismMonths+1:0;
  if(m.schismMonths>=3&&m.supporters>=2000){const departed=Math.floor(m.supporters*.2),returned=Math.floor(m.funds*.2);m.supporters-=departed;m.funds-=returned;r.population.householdWealth+=returned;m.history.push({event:'fragmented',supporters:departed,returned,year:s.year,month:s.month});m.cohesion=35;m.schismMonths=0;if(m.parent===s.player)log(s,'A public movement fractured as its factions disagreed over strategy.','一场公开运动因内部路线分歧出现分裂。')}
  if(pressure>=45){const diplomatic=1+Math.min(2,(m.recognizedBy||[]).length)*.1,compromise=hasNationalIdea(s,m.parent,'civic_compromise')?.9:1;m.supporters=Math.min(r.population.total,m.supporters+Math.floor(r.population.total*Math.min(pressure,120)*diplomatic*compromise/25000))}else m.supporters=Math.max(0,m.supporters-Math.max(100,Math.floor(r.population.total*.003)));
  const share=m.supporters/Math.max(1,r.population.total);
  if(!m.leader&&share>=.03)appointLeader(s,m,r);
  if(m.leader&&(!capable(s.world.characters[m.leader])||s.world.characters[m.leader].faction!==m.parent)){m.leader=m.network.find(id=>capable(s.world.characters[id])&&s.world.characters[id].faction===m.parent)||null;if(!m.leader&&share>=.03)appointLeader(s,m,r)}
  if(s.month%3===0&&m.leader&&m.supporters>=1000){
   const donation=Math.min(2,r.population.householdWealth||0);r.population.householdWealth-=donation;m.funds+=donation;
   for(const o of s.world.religiousInstitutions||[])if(o.region===r.id&&(o.relations[m.parent]??0)<-20&&(o.institutionalLoyalty??50)<70&&o.legitimacy>=40&&!m.organizations.includes(o.id))m.organizations.push(o.id);
   m.organizations=m.organizations.filter(id=>{const o=(s.world.religiousInstitutions||[]).find(x=>x.id===id);return o&&o.region===r.id&&(o.relations[m.parent]??0)<0&&(o.institutionalLoyalty??50)<70});
   for(const id of m.organizations){const o=s.world.religiousInstitutions.find(x=>x.id===id);if(o&&o.wealth>6){o.wealth--;m.funds++}}
   const person=Object.values(s.world.characters).filter(c=>c.faction===m.parent&&capable(c)&&c.location===r.id&&c.loyalty<65&&!m.network.includes(c.id)&&!(s.world.leadership[m.parent]||[]).includes(c.id)&&!s.armies.some(a=>a.characterId===c.id)).sort((a,b)=>b.influence-a.influence||a.id.localeCompare(b.id))[0];
   if(person&&m.funds>=1&&m.network.length<5){m.funds--;m.network.push(person.id)}
   else if(!person&&m.funds>=2&&m.network.length<2&&m.supporters>=5000){const id=createFictionalPerson(s,{name:['Movement organizer','运动组织者'],faction:m.parent,birthYear:s.year-30,location:r.id,wealth:0,role:['Simulated movement organizer','模拟运动组织者']});s.world.characters[id].loyalty=40;m.funds-=2;m.network.push(id)}
  }
  m.stage=share>=.12?'crisis':share>=.08?'negotiation':share>=.05?'network':share>=.03?'organized':'dissatisfaction';
  if(pressure>=75&&r.population.satisfaction<20)m.radicalism=clamp(m.radicalism+1,0,100);else if(pressure<45)m.radicalism=Math.max(0,m.radicalism-1);
  if(m.months>=12&&m.supporters<Math.max(300,Math.floor(r.population.total*.005))){returnFunds(m,r);m.stage='collapsed';m.outcome='lost_support';continue}
  if(m.stage==='crisis'&&pressure>=75&&m.radicalism>=5&&m.leader)raiseUprising(s,m,r);
  if((autoplayPlayer||m.parent!==s.player)&&active(m)&&m.stage!=='armed'&&s.month%6===0&&s.factions[m.parent].treasury>35&&share>=.05)respondToMovement(s,m.parent,m.id,'reform');
 }
 observeMovements(s);
}
