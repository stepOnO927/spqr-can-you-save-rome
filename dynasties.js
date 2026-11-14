import {CHARACTER_CATALOG} from './characters.js?v=succession-ui-recovery-1';
import {startDynasticWar} from './civil-war.js?v=succession-ui-recovery-1';
import {ROUTES} from './data.js?v=phase-x-1';
import {assignBornPortrait,assignCourtPortrait} from './portrait-registry.js?v=cursus-portraits-1';

// Family records are campaign facts. The encyclopedia remains an independent
// account of documented history. In particular, names never establish kinship.
const roll=s=>{const d=s.world.dynasties;d.seed=(Math.imul(d.seed,1664525)+1013904223)>>>0;return d.seed/4294967296};
export const dynastyRoll=roll;
const note=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh});s.log=s.log.slice(0,80)};
const born=(s,id)=>s.world.characters[id]?.birthYear??CHARACTER_CATALOG[id]?.birth?.[1]??null;
export const personAge=(s,id)=>{const year=born(s,id);return year==null?null:s.year-year};
const eligibleAdult=(s,id)=>{const c=s.world.characters[id],age=personAge(s,id);return !!c?.alive&&!c.missing&&age!==null&&age>=18};
const familyOf=(s,id)=>s.world.dynasties.families[s.world.characters[id]?.familyId];
const pair=(a,b)=>[a,b].sort().join(':');
const record=(s,id,en,zh)=>{(s.world.dynasties.lives[id]||=[]).push({year:s.year,month:s.month,en,zh,simulated:true})};
export function recordLifeEvent(s,id,en,zh){initializeDynasties(s);if(s.world.characters[id])record(s,id,en,zh)}
// The shared catalog also contains historical reference data. Fictional IDs,
// unlike historical IDs, are local to a save and can be reused by another one.
// Rebuild only that namespace when activating a campaign; never invent a name
// for a legacy person whose saved catalog entry is missing or malformed.
function ensureCatalog(s){
 for(const id of Object.keys(CHARACTER_CATALOG))if(/^fictional:\d+$/.test(id))delete CHARACTER_CATALOG[id];
 for(const [id,entry] of Object.entries(s.world.dynasties.catalog))if(/^fictional:\d+$/.test(id)&&entry?.fictional&&Array.isArray(entry.name)&&entry.name.length>=2&&entry.name.every(x=>typeof x==='string'&&x.trim()))CHARACTER_CATALOG[id]=entry;
 for(const [id,person] of Object.entries(s.world.characters))if(/^fictional:\d+$/.test(id)&&!CHARACTER_CATALOG[id])CHARACTER_CATALOG[id]={name:['Unknown simulated person','身份不明的模拟人物'],birth:null,faction:person.faction,role:['Identity not recorded','身份未记录'],culture:['Simulated','模拟'],source:null,fictional:true};
}

export function initializeDynasties(s){
 const d=s.world.dynasties||= {families:{},lives:{},catalog:{},marriages:[],memories:[],rulers:[],seed:220049,nextPerson:1,nextFamily:1};
 d.families||={};d.lives||={};d.catalog||={};d.marriages||=[];d.memories||=[];d.rulers||=[];d.inheritanceDisputes||=[];d.familyLoans||=[];d.marriageOffers||=[];d.asylumRequests||=[];d.familyAccords||=[];d.seed??=220049;d.nextPerson||=1;d.nextFamily||=1;ensureCatalog(s);
 for(const [id,c] of Object.entries(s.world.characters)){
  c.parents||=[];c.adoptiveParents||=[];c.children||=[];c.spouse||=null;c.wealth??=0;
  c.sex||=(['cleopatra','arsinoe'].includes(id)?'female':CHARACTER_CATALOG[id]?.fictional?'unknown':'male');
  c.familyId||=`family:${id}`;
  d.families[c.familyId]||={id:c.familyId,name:CHARACTER_CATALOG[id]?.name||[id,id],wealth:0,reputation:50,influence:20,leader:id,patrons:[]};
  d.lives[id]||=[];
 }
 for(const family of Object.values(d.families)){
  const members=Object.values(s.world.characters).filter(c=>c.familyId===family.id&&c.alive);
  family.leader=members.sort((a,b)=>(b.influence||0)-(a.influence||0))[0]?.id||null;
 }
 // The only opening kinship modeled here is an explicitly documented sibling
 // relationship; all other unknown parents and spouses stay unknown.
 if(!d.historicalSeeded&&s.world.characters.cleopatra&&s.world.characters.arsinoe){
  const family=d.families['family:cleopatra'],oldFamily=d.families['family:arsinoe'];if(oldFamily&&oldFamily!==family&&Number.isFinite(oldFamily.wealth))family.wealth=(Number.isFinite(family.wealth)?family.wealth:0)+oldFamily.wealth;s.world.characters.arsinoe.familyId=family.id;delete d.families['family:arsinoe'];
  d.historicalSeeded=true;
 }
 // Perform recovery after legacy family merging, so a restored remainder is
 // never deposited into a family record that the migration then removes.
 for(const [id,c] of Object.entries(s.world.characters))if(c.alive===false&&c.inheritanceSettled&&Number.isFinite(c.wealth)&&c.wealth>0){const amount=c.wealth,family=d.families[c.familyId];family.wealth=(Number.isFinite(family.wealth)?family.wealth:0)+amount;c.wealth=0;record(s,id,`Recovered ${amount} previously stranded private wealth into the family estate.`,`已将之前滞留的${amount}私人财富转入家族公产。`)}
 for(const [faction,ids] of Object.entries(s.world.leadership||{}))if(s.factions[faction]){
  const current=ids.filter(id=>s.world.characters[id]?.alive).join(':');
  if(d.rulers.filter(r=>r.faction===faction).at(-1)?.current!==current)d.rulers.push({faction,current,year:s.year,month:s.month});
 }
 return d;
}

export function createFictionalPerson(s,{name,faction,birthYear=s.year,familyId,parents=[],adoptiveParents=[],wealth=0,location=null,sex='unknown',role=['Court member','宫廷成员'],origin='birth'}){
 const d=initializeDynasties(s);
 // Reserve identities mentioned anywhere in older saves, including reports
 // and relationships whose original person or family is no longer present.
 const snapshot=JSON.stringify({state:s,parents,adoptiveParents,familyId}),people=new Set([...snapshot.matchAll(/(?:^|[^A-Za-z0-9_:])fictional:(\d+)(?!\d)/g)].map(m=>m[1])),families=new Set([...snapshot.matchAll(/family:fictional:(\d+)(?!\d)/g)].map(m=>m[1]));
 const nextFree=(start,used)=>{let n=Number.isSafeInteger(start)&&start>0&&start<Number.MAX_SAFE_INTEGER?start:1;while(used.has(String(n))){n++;if(n>=Number.MAX_SAFE_INTEGER)n=1}return n};
 const personNo=nextFree(d.nextPerson,people);d.nextPerson=personNo+1;const id=`fictional:${personNo}`;
 let family=familyId;if(!family){const familyNo=nextFree(d.nextFamily,families);d.nextFamily=familyNo+1;family=`family:fictional:${familyNo}`}
 if(!d.families[family])d.families[family]={id:family,name:Array.isArray(name)?name:[name,name],wealth:0,reputation:50,influence:20,leader:id,patrons:[]};
 d.catalog[id]={name:Array.isArray(name)?name:[name,name],birth:[birthYear,birthYear],faction,role,culture:['Simulated','模拟'],source:null,fictional:true};
 CHARACTER_CATALOG[id]=d.catalog[id];
 s.world.characters[id]={id,faction,health:'healthy',location,alive:true,loyalty:65,influence:20,wealth,parents:[...parents],adoptiveParents:[...adoptiveParents],children:[],spouse:null,familyId:family,birthYear,sex,education:0,ambition:Math.floor(20+roll(s)*60),personalitySeed:Math.floor(roll(s)*0xffffffff),wounds:0,illnessEpisodes:0};
 for(const parent of [...parents,...adoptiveParents])if(s.world.characters[parent])s.world.characters[parent].children.push(id);
 if(origin==='court_nominee')record(s,id,'Entered this campaign as a fictional court nominee; no historical identity or family relationship is asserted.','作为虚构宫廷人选进入本次战役；不代表历史人物或历史亲属关系。');
 else record(s,id,'Born in the simulated campaign.','出生于模拟战役。');
 if(origin==='birth'&&birthYear===s.year)assignBornPortrait(s,id);if(origin==='court_nominee')assignCourtPortrait(s,id);return id;
}

export function seedOpeningFictionalHouseholds(s){
 const d=initializeDynasties(s);if(d.openingFictionalSeeded)return;
 for(const [name,faction,sex,birthYear,location] of [
  [['Publius Varenus','普布利乌斯·瓦雷努斯'],'caesar','male',-77,'cisalpine'],
  [['Livia Marcia','莉维娅·玛尔基娅'],'caesar','female',-74,'cisalpine'],
  [['Aulus Cassianus','奥卢斯·卡西亚努斯'],'senate','male',-79,'roma'],
  [['Marcia Valeria','玛尔基娅·瓦莱里娅'],'senate','female',-76,'roma']
 ])createFictionalPerson(s,{name,faction,sex,birthYear,location,wealth:8});
 d.openingFictionalSeeded=true;
}

export function proposeMarriage(s,aId,bId){
 initializeDynasties(s);const a=s.world.characters[aId],b=s.world.characters[bId];
 if(!eligibleAdult(s,aId)||!eligibleAdult(s,bId)||aId===bId||a.spouse||b.spouse)return {ok:false,reason:'eligibility'};
 if(a.sex!=='unknown'&&b.sex!=='unknown'&&a.sex===b.sex)return {ok:false,reason:'legal_status'};
 if(a.familyId===b.familyId||a.parents.includes(bId)||b.parents.includes(aId)||a.adoptiveParents.includes(bId)||b.adoptiveParents.includes(aId)||a.parents.some(id=>b.parents.includes(id))||a.adoptiveParents.some(id=>b.adoptiveParents.includes(id)))return {ok:false,reason:'kinship'};
 if(a.faction!==b.faction&&((s.relations[[a.faction,b.faction].sort().join(':')]??0)<0||s.wars.some(w=>w.includes(a.faction)&&w.includes(b.faction))))return {ok:false,reason:'diplomacy'};
 const chance=Math.max(.15,Math.min(.85,.5+(a.loyalty+b.loyalty-130)/400+(familyOf(s,aId).reputation+familyOf(s,bId).reputation-100)/500));
 if(roll(s)>=chance){record(s,aId,`A marriage proposal to ${CHARACTER_CATALOG[bId].name[0]} was declined.`,`与${CHARACTER_CATALOG[bId].name[1]}的婚事遭到拒绝。`);return {ok:false,reason:'declined'}}
 a.spouse=bId;b.spouse=aId;s.world.dynasties.marriages.push({a:aId,b:bId,year:s.year,month:s.month,simulated:true});
 for(const id of [aId,bId])record(s,id,`Married ${CHARACTER_CATALOG[id===aId?bId:aId].name[0]}.`,`与${CHARACTER_CATALOG[id===aId?bId:aId].name[1]}结婚。`);
 familyOf(s,aId).influence=Math.min(100,familyOf(s,aId).influence+3);familyOf(s,bId).influence=Math.min(100,familyOf(s,bId).influence+3);
 if(a.faction!==b.faction){const key=pair(a.faction,b.faction);s.relations[key]=Math.min(100,(s.relations[key]||0)+4)}
 if(a.faction===s.player||b.faction===s.player)note(s,`${CHARACTER_CATALOG[aId].name[0]} and ${CHARACTER_CATALOG[bId].name[0]} married in the simulation.`,`模拟战役中，${CHARACTER_CATALOG[aId].name[1]}与${CHARACTER_CATALOG[bId].name[1]}结婚。`);
 return {ok:true};
}

// These are dated diplomatic leads. No live foreign character state is read
// while listing contacts or accepting the player's decision to send an offer.
export function reportedDynasticContacts(s,viewer=s.player){
 initializeDynasties(s);const contacts=[];
 for(const [faction,k] of Object.entries(s.knowledge?.[viewer]||{})){
  if(faction===viewer||faction==='rebels')continue;
  const ids=[...(k.reportedLeaders||[]),...(k.reports||[]).flatMap(r=>['leaders','claimants'].includes(r.kind)?r.leaders||[]:['age','health','location'].includes(r.kind)&&r.character?[r.character]:[])];
  for(const id of new Set(ids))if(CHARACTER_CATALOG[id])contacts.push({id,faction});
 }
 return contacts;
}

export function offerForeignMarriage(s,ownId,foreignId,reportedFaction){
 const d=initializeDynasties(s),own=s.world.characters[ownId];
 if(!own||own.faction!==s.player||!eligibleAdult(s,ownId)||own.spouse)return {ok:false,reason:'eligibility'};
 if(!reportedDynasticContacts(s).some(x=>x.id===foreignId&&x.faction===reportedFaction))return {ok:false,reason:'unknown'};
 if(s.wars.some(w=>w.includes(s.player)&&w.includes(reportedFaction))||(s.relations[pair(s.player,reportedFaction)]??0)<0)return {ok:false,reason:'diplomacy'};
 if(d.marriageOffers.some(x=>x.status==='pending'&&(x.own===ownId||x.foreign===foreignId)))return {ok:false,reason:'pending'};
 if(s.factions[s.player].treasury<4)return {ok:false,reason:'treasury'};
 s.factions[s.player].treasury-=4;
 const offer={id:`marriage:${d.marriageOffers.length+1}`,own:ownId,foreign:foreignId,reportedFaction,status:'pending',months:3,year:s.year,month:s.month};d.marriageOffers.push(offer);
 record(s,ownId,`A marriage envoy was sent concerning ${CHARACTER_CATALOG[foreignId].name[0]}; the report may be outdated.`,`已派使者商议与${CHARACTER_CATALOG[foreignId].name[1]}的婚事；情报可能过时。`);
 return {ok:true,cost:4,offer};
}

function advanceMarriageOffers(s){
 const d=s.world.dynasties;for(const offer of d.marriageOffers.filter(x=>x.status==='pending')){
  if(--offer.months>0)continue;
  const own=s.world.characters[offer.own],foreign=s.world.characters[offer.foreign];
  const valid=own?.alive&&foreign?.alive&&!own.spouse&&!foreign.spouse&&foreign.faction===offer.reportedFaction&&!s.wars.some(w=>w.includes(s.player)&&w.includes(foreign.faction));
  const result=valid?proposeMarriage(s,offer.own,offer.foreign):{ok:false,reason:'no_reply'};
  offer.status=result.ok?'accepted':result.reason==='declined'?'declined':'no_reply';offer.resolvedYear=s.year;offer.resolvedMonth=s.month;
  if(offer.status!=='accepted')note(s,offer.status==='declined'?'The foreign court declined the marriage proposal.':'No marriage agreement was reached; the original report may have been outdated.',offer.status==='declined'?'外国宫廷拒绝了婚事。':'未达成婚姻协议；原情报可能已经过时。');
 }
}

// A request is based on dated reports. Acceptance is checked only when the
// messenger arrives, so the interface does not reveal hidden court changes.
export function requestClaimantAsylum(s,claimantId,reportedFaction){
 const d=initializeDynasties(s),actor=s.player;
 const reports=s.knowledge?.[actor]?.[reportedFaction]?.reports||[];
 const known=reports.some(r=>r.kind==='claimants'&&(r.leaders||[]).includes(claimantId));
 if(!known||!['egypt','parthia'].includes(reportedFaction)||!['caesar','senate'].includes(actor)||!s.regions.some(r=>r.owner===actor))return {ok:false,reason:'unknown'};
 if(s.wars.some(w=>w.includes(actor)&&w.includes(reportedFaction)))return {ok:false,reason:'war'};
 if(d.asylumRequests.some(x=>x.claimant===claimantId&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(d.asylumRequests.some(x=>x.claimant===claimantId&&x.status==='accepted'))return {ok:false,reason:'already'};
 if(s.factions[actor].treasury<6)return {ok:false,reason:'treasury'};
 s.factions[actor].treasury-=6;
 const request={id:`asylum:${d.asylumRequests.length+1}`,claimant:claimantId,reportedFaction,host:actor,months:3,status:'pending',year:s.year,month:s.month};d.asylumRequests.push(request);
 note(s,'A claimant was offered refuge. A reply may take three months; the report may be outdated.','已向一位竞争者提出庇护。回信可能需要三个月；原情报可能过时。');
 return {ok:true,cost:6,request};
}

function advanceAsylumRequests(s){
 for(const request of s.world.dynasties.asylumRequests.filter(x=>x.status==='pending')){
  if(--request.months>0)continue;
  const person=s.world.characters[request.claimant],home=request.reportedFaction,host=request.host;
  const eligible=person?.alive&&!person.missing&&!person.travel&&person.faction===home&&(s.world.claimants?.[home]||[]).includes(request.claimant)&&!s.armies.some(a=>a.characterId===request.claimant)&&!s.wars.some(w=>w.includes(host)&&w.includes(home));
  const refuge=s.regions.find(r=>r.owner===host);
  if(eligible&&refuge&&roll(s)<.75){
   person.asylumHost=host;person.location=refuge.id;person.travel=null;request.status='accepted';
   const key=pair(host,home);s.relations[key]=Math.max(-100,(s.relations[key]||0)-6);
   if(s.factions[home])s.factions[home].stability=Math.max(0,s.factions[home].stability-2);
   record(s,person.id,`Received asylum in ${host}; this granted no throne or army.`,`获得${host}庇护；未获王位或军队。`);
   if(host===s.player)note(s,'The claimant arrived under protection. The foreign court protested; no throne or alliance was granted.','竞争者抵达并获得保护。外国宫廷提出抗议；此举不授予王位或同盟。');
  }else{request.status='no_reply';if(host===s.player)note(s,'No asylum agreement was reached; the original report may have been outdated.','未达成庇护协议；原情报可能已经过时。')}
  request.resolvedYear=s.year;request.resolvedMonth=s.month;
 }
}

const courtTheater={caesar:'cisalpine',senate:'roma',egypt:'egypt',parthia:'parthia',numidia:'numidia',mauretania:'mauretania',armenia:'armenia',galatia:'galatia',bosporus:'bosporus'};
// These broad court categories are diplomatic game abstractions, not claims
// about any named person's private religion or cultural identity.
const courtProfile={caesar:['roman','civic'],senate:['roman','civic'],egypt:['hellenistic','mixed'],parthia:['iranian','mixed'],numidia:['north_african','mixed'],mauretania:['north_african','mixed'],armenia:['armenian','mixed'],galatia:['anatolian','mixed'],bosporus:['hellenistic','mixed']};
function courtDistance(a,b){
 const start=courtTheater[a],goal=courtTheater[b];if(!start||!goal)return 6;
 const queue=[[start,0]],seen=new Set([start]);while(queue.length){const [at,d]=queue.shift();if(at===goal)return d;for(const [x,y] of ROUTES){const next=x===at?y:y===at?x:null;if(next&&!seen.has(next)){seen.add(next);queue.push([next,d+1])}}}return 6;
}

// A pledge exchanges guarantees, not literal captive units. Wardship records
// an educational relationship and never transfers sovereignty or legal custody.
export function offerFamilyAccord(s,kind,contactId,reportedFaction,childId=null){
 const d=initializeDynasties(s),host=s.player,cost=kind==='wardship'?8:6;
 if(!['pledge','wardship'].includes(kind)||!reportedDynasticContacts(s).some(x=>x.id===contactId&&x.faction===reportedFaction)||host===reportedFaction)return {ok:false,reason:'unknown'};
 if(kind==='wardship'&&(!s.world.characters[childId]?.alive||s.world.characters[childId].faction!==host||personAge(s,childId)>=16||personAge(s,childId)<0))return {ok:false,reason:'child'};
 if(s.wars.some(w=>w.includes(host)&&w.includes(reportedFaction))||(s.relations[pair(host,reportedFaction)]??0)<0)return {ok:false,reason:'diplomacy'};
 if(d.familyAccords.some(x=>x.host===host&&x.target===reportedFaction&&x.kind===kind&&['pending','active'].includes(x.status)))return {ok:false,reason:'commitment'};
 if(kind==='wardship'&&d.familyAccords.some(x=>x.child===childId&&['pending','active'].includes(x.status)))return {ok:false,reason:'commitment'};
 if(s.factions[host].treasury<cost)return {ok:false,reason:'treasury'};
 s.factions[host].treasury-=cost;const accord={id:`accord:${d.familyAccords.length+1}`,kind,host,target:reportedFaction,contact:contactId,child:childId,status:'pending',months:4,year:s.year,month:s.month};d.familyAccords.push(accord);
 note(s,kind==='pledge'?'An envoy proposed mutual family guarantees; a reply may take four months.':'An envoy proposed diplomatic wardship; a reply may take four months.',kind==='pledge'?'使者提议互保家族保证；回信可能需要四个月。':'使者提议外交监护；回信可能需要四个月。');return {ok:true,cost,accord};
}

function advanceFamilyAccords(s){
 const d=s.world.dynasties,now=s.year*12+s.month;
 for(const a of d.familyAccords){
  const war=s.wars.some(w=>w.includes(a.host)&&w.includes(a.target));
  if(a.status==='pending'){
   if(--a.months>0)continue;
   const contact=s.world.characters[a.contact],child=s.world.characters[a.child],valid=contact?.alive&&!contact.missing&&contact.faction===a.target&&s.factions[a.target]&&!war&&(!a.child||child?.alive&&child.faction===a.host&&personAge(s,a.child)<16)&&(!a.child||personAge(s,a.contact)>=18);
   if(!valid){a.status='no_reply';if(a.host===s.player)note(s,'No family accord was reached; the original contact report may have been outdated.','未达成家族协定；原联系人情报可能已经过时。')}
   else{
    const relation=s.relations[pair(a.host,a.target)]??0,distance=courtDistance(a.host,a.target),[culture,faith]=courtProfile[a.host]||[],[otherCulture,otherFaith]=courtProfile[a.target]||[];
    const chance=Math.max(.12,Math.min(.82,.55+relation/250-distance*.025+(s.factions[a.target].stability<35?-.12:0)+(s.factions[a.host].legitimacy<40?-.08:0)+(culture!==otherCulture?-.05:0)+(faith!==otherFaith?-.03:0)));
    a.status=roll(s)<chance?'active':'declined';
    if(a.status==='active'){
     a.expiresAt=now+(a.kind==='pledge'?24:60);s.relations[pair(a.host,a.target)]=Math.min(100,relation+(a.kind==='pledge'?8:6));
     s.factions[a.host].stability=Math.min(100,s.factions[a.host].stability+1);
     if(a.kind==='wardship'){child.diplomaticGuardian=a.contact;child.education=Math.min(100,(child.education||0)+8);record(s,child.id,`A diplomatic wardship with ${CHARACTER_CATALOG[a.contact].name[0]} began; legal custody stayed local.`,`与${CHARACTER_CATALOG[a.contact].name[1]}的外交监护开始；法定监护仍留在本地。`)}
     else{const head=Object.values(s.world.characters).find(c=>c.faction===a.host&&c.alive),family=head&&familyOf(s,head.id);if(family)family.reputation=Math.min(100,(family.reputation||50)+2)}
     if(a.host===s.player)note(s,a.kind==='pledge'?'Mutual family guarantees were accepted for two years; no alliance was created.':'Diplomatic wardship was accepted; the child gained education, not a foreign office.',a.kind==='pledge'?'互保家族保证获接受，期限两年；没有自动建立同盟。':'外交监护获接受；子女增加教育，不获得外国职务。');
    }else if(a.host===s.player)note(s,'The foreign court declined the family agreement.','外国宫廷拒绝了家族协定。');
   }
   a.resolvedYear=s.year;a.resolvedMonth=s.month;
  }else if(a.status==='active'&&(war||now>=a.expiresAt||a.child&&personAge(s,a.child)>=16)){
   a.status=war?'broken':'expired';if(a.child&&s.world.characters[a.child]?.diplomaticGuardian===a.contact)delete s.world.characters[a.child].diplomaticGuardian;
   if(war){s.relations[pair(a.host,a.target)]=Math.max(-100,(s.relations[pair(a.host,a.target)]||0)-12);s.factions[a.host].stability=Math.max(0,s.factions[a.host].stability-2)}
   if(a.host===s.player)note(s,war?'War broke the family agreement; relations and stability fell.':'The family agreement ended on its stated terms.',war?'战争使家族协定破裂；关系与稳定度下降。':'家族协定按约终止。');
  }
  if(a.status==='active'&&a.kind==='wardship'&&s.month===1&&a.child&&s.world.characters[a.child]?.alive)s.world.characters[a.child].education=Math.min(100,(s.world.characters[a.child].education||0)+2);
 }
}

export function adoptHeir(s,parentId,childId){
 initializeDynasties(s);const parent=s.world.characters[parentId],child=s.world.characters[childId];
 if(!eligibleAdult(s,parentId)||!child?.alive||childId===parentId||parent.faction!==child.faction||parent.children.includes(childId)||child.parents.includes(parentId)||child.adoptiveParents.length)return {ok:false,reason:'eligibility'};
 const age=personAge(s,childId),senior=personAge(s,parentId);if(age===null||senior===null||senior-age<16)return {ok:false,reason:'age'};
 child.adoptiveParents.push(parentId);parent.children.push(childId);child.familyId=parent.familyId;
 record(s,childId,`Adopted by ${CHARACTER_CATALOG[parentId].name[0]}; this did not confer office.`,`由${CHARACTER_CATALOG[parentId].name[1]}收养；收养不授予官职。`);
 record(s,parentId,`Adopted ${CHARACTER_CATALOG[childId].name[0]}.`,`收养了${CHARACTER_CATALOG[childId].name[1]}。`);
 return {ok:true};
}

export function makeWill(s,id,beneficiary,share=1){
 initializeDynasties(s);const c=s.world.characters[id],heir=s.world.characters[beneficiary];
 if(!eligibleAdult(s,id)||!heir?.alive||id===beneficiary||share<=0||share>1)return {ok:false,reason:'eligibility'};
 if(c.faction!==heir.faction){if(c.spouse!==beneficiary&&!c.children.includes(beneficiary))return {ok:false,reason:'foreign_heir'};if(s.wars.some(w=>w.includes(c.faction)&&w.includes(heir.faction))||(s.relations[pair(c.faction,heir.faction)]??0)<0)return {ok:false,reason:'diplomacy'}}
 c.will={beneficiary,share};record(s,id,`Named ${CHARACTER_CATALOG[beneficiary].name[0]} in a personal will.`,`在个人遗嘱中指定${CHARACTER_CATALOG[beneficiary].name[1]}。`);return {ok:true};
}

export function nominateGuardian(s,parentId,childId,guardianId){
 initializeDynasties(s);const parent=s.world.characters[parentId],child=s.world.characters[childId],guardian=s.world.characters[guardianId];
 if(!eligibleAdult(s,parentId)||!child?.alive||!eligibleAdult(s,guardianId)||parentId===guardianId||childId===guardianId||parent.faction!==child.faction||child.faction!==guardian.faction||!child.parents.includes(parentId)&&!child.adoptiveParents.includes(parentId))return {ok:false,reason:'eligibility'};
 const age=personAge(s,childId);if(age===null||age>=16)return {ok:false,reason:'age'};
 child.guardianNominee=guardianId;record(s,parentId,`Nominated ${CHARACTER_CATALOG[guardianId].name[0]} as guardian of ${CHARACTER_CATALOG[childId].name[0]}; this conferred no office.`,`提名${CHARACTER_CATALOG[guardianId].name[1]}为${CHARACTER_CATALOG[childId].name[1]}的监护人；这不授予官职。`);
 return {ok:true};
}

function activateGuardianships(s,id){
 const parent=s.world.characters[id];for(const childId of parent.children){
  const child=s.world.characters[childId],guardian=s.world.characters[child?.guardianNominee];
  if(!child?.alive||personAge(s,childId)>=16||!guardian?.alive||guardian.missing||guardian.faction!==child.faction)continue;
  if([...child.parents,...child.adoptiveParents].some(pid=>pid!==id&&eligibleAdult(s,pid)))continue;
  child.guardian=guardian.id;record(s,childId,`${CHARACTER_CATALOG[guardian.id].name[0]} became guardian; no political office was inherited.`,`${CHARACTER_CATALOG[guardian.id].name[1]}成为监护人；没有继承政治职务。`);
 }
}

export function settleInheritance(s,id){
 const d=initializeDynasties(s),c=s.world.characters[id];if(!c||c.inheritanceSettled)return;
 activateGuardianships(s,id);
 c.inheritanceSettled=true;const heirs=c.children.filter(x=>s.world.characters[x]?.alive),will=c.will?.beneficiary;
 const eligibleWill=will&&s.world.characters[will]?.alive?will:null,wealth=Math.max(0,Math.floor(c.wealth||0));
 if(eligibleWill&&heirs.some(x=>x!==eligibleWill)&&(!heirs.includes(eligibleWill)||s.world.characters[eligibleWill].faction!==c.faction)&&wealth>0){
  d.inheritanceDisputes.push({id:`estate:${id}`,deceased:id,faction:c.faction,beneficiary:eligibleWill,heirs:heirs.filter(x=>x!==eligibleWill),estate:wealth,share:c.will.share,status:'pending',year:s.year,month:s.month});
  c.wealth=0;record(s,id,'Died; the contested private estate is held pending a ruling.','去世；有争议的私人遗产待裁决。');
  note(s,`The private estate of ${CHARACTER_CATALOG[id].name[0]} is disputed; the court may uphold the will, divide it, or favor the children.`,` ${CHARACTER_CATALOG[id].name[1]}的私人遗产发生争议；宫廷可维持遗嘱、分割遗产或支持子女。`);
  return;
 }
 if(eligibleWill){const amount=Math.floor(wealth*c.will.share);s.world.characters[eligibleWill].wealth+=amount;c.wealth-=amount;record(s,eligibleWill,`Inherited ${amount} private wealth from ${CHARACTER_CATALOG[id].name[0]}.`,`从${CHARACTER_CATALOG[id].name[1]}继承${amount}私人财富。`)}
 const remaining=Math.max(0,Math.floor(c.wealth||0));if(heirs.length){for(const heir of heirs)s.world.characters[heir].wealth+=Math.floor(remaining/heirs.length);familyOf(s,id).wealth+=remaining%heirs.length}else familyOf(s,id).wealth+=remaining;c.wealth=0;
 record(s,id,'Died; private property was settled separately from the state treasury.','去世；私人财产与国库分别结算。');
}

export function resolveInheritanceDispute(s,disputeId,choice){
 const d=initializeDynasties(s),caseFile=d.inheritanceDisputes.find(x=>x.id===disputeId&&x.status==='pending');
 if(!caseFile)return {ok:false,reason:'unavailable'};
 if(!['will','compromise','heirs'].includes(choice))return {ok:false,reason:'choice'};
 const faction=s.factions[caseFile.faction],beneficiary=s.world.characters[caseFile.beneficiary],heirs=caseFile.heirs.map(id=>s.world.characters[id]).filter(c=>c?.alive);
 if(!beneficiary?.alive&&!heirs.length){
  const family=d.families[s.world.characters[caseFile.deceased].familyId];family.wealth+=caseFile.estate;caseFile.status='resolved';caseFile.choice='family';caseFile.resolvedYear=s.year;caseFile.resolvedMonth=s.month;
  record(s,caseFile.deceased,'No claimant received the estate; it passed to the family estate.','无人领取的遗产已转入家族公产。');if(caseFile.faction===s.player)note(s,'The unclaimed private estate passed to the family estate.','无人领取的私人遗产已转入家族公产。');return {ok:true,outcome:'family'};
 }
 if(!beneficiary?.alive&&choice!=='heirs')return {ok:false,reason:'unavailable'};
 if(choice==='compromise'&&faction?.treasury<6)return {ok:false,reason:'treasury'};
 const willAmount=beneficiary?.alive?(choice==='will'?Math.floor(caseFile.estate*caseFile.share):choice==='compromise'?Math.floor(caseFile.estate*.5):0):0;
 if(beneficiary?.alive)beneficiary.wealth+=willAmount;
 const rest=caseFile.estate-willAmount;
 if(heirs.length){const portion=Math.floor(rest/heirs.length);for(const heir of heirs)heir.wealth+=portion;d.families[s.world.characters[caseFile.deceased].familyId].wealth+=rest-portion*heirs.length}
 else if(beneficiary?.alive)beneficiary.wealth+=rest;
 else d.families[s.world.characters[caseFile.deceased].familyId].wealth+=rest;
 if(choice==='compromise'){faction.treasury-=6;faction.stability=Math.min(100,faction.stability+2)}
 if(choice==='will'){for(const heir of heirs)heir.loyalty=Math.max(0,heir.loyalty-8);if(faction)faction.stability=Math.max(0,faction.stability-2)}
 if(choice==='heirs'&&beneficiary?.alive){beneficiary.loyalty=Math.max(0,beneficiary.loyalty-10);if(faction)faction.stability=Math.max(0,faction.stability-1)}
 if(beneficiary?.alive&&beneficiary.faction!==caseFile.faction){const key=pair(beneficiary.faction,caseFile.faction);s.relations[key]=Math.max(-100,Math.min(100,(s.relations[key]||0)+(choice==='heirs'?-4:2)))}
 d.memories.push({familyId:s.world.characters[caseFile.deceased].familyId,targetFamilyId:beneficiary?.familyId,kind:`inheritance_${choice}`,year:s.year,month:s.month,weight:choice==='compromise'?2:-6});
 caseFile.status='resolved';caseFile.choice=choice;caseFile.resolvedYear=s.year;caseFile.resolvedMonth=s.month;
 const labels={will:['will upheld','维持遗嘱'],compromise:['estate divided','分割遗产'],heirs:['children favored','支持子女']};
 record(s,caseFile.deceased,`Inheritance ruling: ${labels[choice][0]}.`,`继承裁决：${labels[choice][1]}。`);
 if(caseFile.faction===s.player)note(s,`Inheritance ruling: ${labels[choice][0]}.`,`继承裁决：${labels[choice][1]}。`);
 return {ok:true};
}

export function requestFamilyResources(s,familyId,choice){
 const d=initializeDynasties(s),family=d.families[familyId],faction=s.player,government=s.factions[faction];
 if(!family||!government||!['donation','loan','levy'].includes(choice))return {ok:false,reason:'unavailable'};
 const members=Object.values(s.world.characters).filter(c=>c.alive&&c.faction===faction&&c.familyId===familyId).sort((a,b)=>(b.wealth||0)-(a.wealth||0));
 if(!members.length)return {ok:false,reason:'unavailable'};
 const monthIndex=s.year*12+s.month;if((family.lastResourceRequest??-Infinity)+6>monthIndex)return {ok:false,reason:'cooldown'};
 const available=(family.wealth||0)+members.reduce((sum,c)=>sum+Math.max(0,Math.floor(c.wealth||0)),0);
 const amount=Math.min(choice==='loan'?12:8,available);if(amount<4)return {ok:false,reason:'wealth'};
 const leader=s.world.characters[family.leader]||members[0];
 if(choice==='donation'&&roll(s)>=Math.max(.2,Math.min(.85,.35+(leader.loyalty||50)/250+(family.reputation||50)/500))){family.lastResourceRequest=monthIndex;record(s,leader.id,'The family declined a request for a voluntary contribution.','家族拒绝了自愿捐助请求。');return {ok:false,reason:'declined'}}
 if(choice==='loan'&&((leader.loyalty||50)<25||d.familyLoans.some(x=>x.familyId===familyId&&x.remaining>0)))return {ok:false,reason:'terms'};
 let rest=amount,pooled=Math.min(rest,family.wealth||0);family.wealth-=pooled;rest-=pooled;
 for(const person of members){const taken=Math.min(rest,Math.max(0,Math.floor(person.wealth||0)));person.wealth-=taken;rest-=taken;if(!rest)break}
 government.treasury+=amount;family.lastResourceRequest=monthIndex;
 if(choice==='donation'){family.influence=Math.min(100,(family.influence||20)+3);family.reputation=Math.min(100,(family.reputation||50)+2);leader.loyalty=Math.min(100,(leader.loyalty||50)+2)}
 if(choice==='loan'){d.familyLoans.push({familyId,faction,principal:amount,remaining:amount+2,year:s.year,month:s.month});family.influence=Math.min(100,(family.influence||20)+2)}
 if(choice==='levy'){government.stability=Math.max(0,government.stability-4);family.reputation=Math.max(0,(family.reputation||50)-5);for(const member of members)member.loyalty=Math.max(0,(member.loyalty||50)-8);d.memories.push({familyId,kind:'forced_levy',year:s.year,month:s.month,weight:-10})}
 const labels={donation:['voluntary contribution','自愿捐助'],loan:['family loan','家族借款'],levy:['compulsory levy','强制征收']};
 record(s,leader.id,`The family provided ${amount} to the treasury as a ${labels[choice][0]}.`,`家族以${labels[choice][1]}形式向国库提供${amount}。`);
 note(s,`A ${labels[choice][0]} transferred ${amount} private wealth to the treasury.`,`一笔${labels[choice][1]}将${amount}私人财富转入国库。`);
 return {ok:true,amount};
}

export function advanceDynasties(s){
 const d=initializeDynasties(s);
 // Old saves keep their existing identities. Allocate only to identifiable
 // campaign-born children with a recorded birth and known parents, once.
 if((d.bornPortraitPoolVersion||0)<2){d.bornPortraitClaims||={};for(const id of Object.keys(s.world.characters).sort((a,b)=>(Number(a.split(':')[1])||0)-(Number(b.split(':')[1])||0)))if((d.lives[id]||[]).some(event=>event.simulated&&event.en==='Born in the simulated campaign.'))assignBornPortrait(s,id);d.bornPortraitPoolVersion=2}
 if(!d.courtPortraitPoolVersion){for(const id of Object.keys(s.world.characters).sort((a,b)=>(Number(a.split(':')[1])||0)-(Number(b.split(':')[1])||0)))assignCourtPortrait(s,id);d.courtPortraitPoolVersion=1}
 advanceMarriageOffers(s);
 advanceAsylumRequests(s);
 advanceFamilyAccords(s);
 for(const loan of d.familyLoans.filter(x=>x.remaining>0)){
  const treasury=s.factions[loan.faction]?.treasury||0;if(treasury<1)continue;
  s.factions[loan.faction].treasury--;d.families[loan.familyId].wealth++;loan.remaining--;
  if(!loan.remaining&&loan.faction===s.player)note(s,'A family loan was repaid in full.','一笔家族借款已全额偿还。');
 }
 for(const dispute of d.inheritanceDisputes.filter(x=>x.status==='pending')){
  const age=(s.year-dispute.year)*12+s.month-dispute.month;
  const beneficiaryAlive=!!s.world.characters[dispute.beneficiary]?.alive,anyHeir=dispute.heirs.some(id=>s.world.characters[id]?.alive);
  if(!beneficiaryAlive&&!anyHeir||(dispute.faction!==s.player&&age>=3)||age>=12){const choice=beneficiaryAlive&&s.factions[dispute.faction]?.treasury>=6?'compromise':'heirs';resolveInheritanceDispute(s,dispute.id,choice)}
 }
 const crisis=d.scenario,months=crisis?(s.year-crisis.startedYear)*12+s.month-crisis.startedMonth:0;
 if(crisis?.concessionMonths>0&&s.factions.egypt&&s.factions.numidia){s.factions.egypt.treasury-=1;s.factions.numidia.treasury+=1;crisis.concessionMonths--}
 if(crisis?.stage==='war'&&!s.world.disputes?.egypt?.war&&!s.factions.egypt_claimant){crisis.stage='resolved';note(s,'The succession civil war ended; its political consequences remain.','继承内战已经结束，但政治后果仍然存在。')}
 if(crisis?.stage==='chosen'&&months>=3&&!s.world.disputes?.egypt?.war&&s.world.claimants?.egypt?.length&&s.factions.egypt?.stability<45){
  const claimant=s.world.claimants.egypt[0],support=s.world.disputes.egypt.support?.[claimant]||0;
  if(roll(s)<Math.min(.8,.25+support/100)&&startDynasticWar(s,'egypt',claimant)){
   crisis.stage='war';const general=s.world.characters[crisis.general],army=s.armies.find(a=>a.owner==='egypt_claimant'&&a.characterId===claimant);
   if(general?.alive&&army&&claimant===crisis.son){general.faction='egypt_claimant';general.location=army.region;army.characterId=general.id;army.commander=[...CHARACTER_CATALOG[general.id].name]}
   note(s,claimant===crisis.son?'A rival court seized Upper Egypt and raised an army under its supporting general.':'A rival court seized Upper Egypt and raised an army.',claimant===crisis.son?'竞争宫廷夺取上埃及，并由支持它的将领统率军队。':'竞争宫廷夺取上埃及，并组建军队。');
  }
 }
 if(s.month===1)for(const [id,c] of Object.entries(s.world.characters)){
  if(!c.alive)continue;const age=personAge(s,id);if(age===null)continue;
  if(age>=7&&age<25)c.education=Math.min(100,(c.education||0)+Math.round(1+roll(s)*4));
  if(age===18){c.influence=Math.max(c.influence,10+Math.floor((c.education||0)/4));record(s,id,'Reached adulthood in the campaign.','在战役中成年。')}
  if(c.sex!=='female'||age<18||age>42||!c.spouse||!s.world.characters[c.spouse]?.alive||s.world.characters[c.spouse].sex!=='male')continue;
  if(roll(s)<.24){const names=[['Aulus','奥卢斯','male'],['Lucius','卢基乌斯','male'],['Marcia','玛尔基娅','female'],['Livia','莉维娅','female']];const given=names[Math.floor(roll(s)*names.length)],familyId=["caesar","senate"].includes(c.faction)?s.world.characters[c.spouse].familyId:c.familyId,family=d.families[familyId].name;const child=createFictionalPerson(s,{name:[`${given[0]} ${family[0]}`,`${family[1]}·${given[1]}`],faction:c.faction,birthYear:s.year,familyId,parents:[id,c.spouse],location:c.location,sex:given[2]});record(s,id,`Child ${CHARACTER_CATALOG[child].name[0]} was born.`,`子女${CHARACTER_CATALOG[child].name[1]}出生。`)}
 }
 // Family memory has a small, fading effect. Personal choices can override it.
 if(s.month===6)for(const memory of d.memories){const age=s.year-memory.year;if(age>60)continue;const members=Object.values(s.world.characters).filter(c=>c.alive&&c.familyId===memory.familyId&&personAge(s,c.id)>=18);for(const c of members)if(roll(s)<.08)c.loyalty=Math.max(0,Math.min(100,c.loyalty+Math.sign(memory.weight)))}
 if(s.month===1)for(const faction of Object.keys(s.factions).filter(id=>id!==s.player&&id!=='rebels')){
  if(roll(s)>=.12)continue;const candidates=Object.values(s.world.characters).filter(c=>c.faction===faction&&CHARACTER_CATALOG[c.id]?.fictional&&!c.institutionalOnly&&eligibleAdult(s,c.id)&&!c.spouse).sort((a,b)=>b.influence-a.influence);
  const first=candidates[0],second=candidates.find(c=>c.id!==first?.id&&c.familyId!==first?.familyId);if(first&&second)proposeMarriage(s,first.id,second.id);
 }
 // NPC households pursue modest, state-dependent interests without spending
 // the player's treasury or granting an office through kinship alone.
 if(s.month===7)for(const faction of Object.keys(s.factions).filter(id=>id!==s.player&&id!=='rebels'&&!id.endsWith('_claimant'))){
  const adults=Object.values(s.world.characters).filter(c=>c.alive&&!c.institutionalOnly&&c.faction===faction&&eligibleAdult(s,c.id));
  const houses=[...new Set(adults.map(c=>c.familyId))].map(id=>d.families[id]).filter(Boolean);
  for(const family of houses){
   const members=adults.filter(c=>c.familyId===family.id).sort((a,b)=>(b.influence||0)-(a.influence||0));
   const head=members[0];if(!head||roll(s)>.16)continue;
   const action=roll(s);
   if(action<.38&&head.wealth>=5){const gift=Math.min(4,Math.floor(head.wealth/3));head.wealth-=gift;family.wealth+=gift;family.influence=Math.min(100,(family.influence||20)+1);record(s,head.id,`Contributed ${gift} private wealth to the family network.`,`向家族关系网贡献${gift}私人财富。`)}
   else if(action<.68&&family.wealth>=3&&members.length>1){const protege=members.at(-1),gift=Math.min(3,family.wealth);family.wealth-=gift;protege.wealth+=gift;protege.influence=Math.min(100,(protege.influence||20)+2);record(s,protege.id,`Received ${gift} private wealth and family patronage.`,`获得${gift}私人财富及家族扶持。`)}
   else if(action<.82){const ward=adults.find(c=>c.familyId!==family.id&&!c.adoptiveParents.length&&personAge(s,head.id)-personAge(s,c.id)>=16&&c.influence>=25);if(ward)adoptHeir(s,head.id,ward.id)}
   else {const hurt=members.find(c=>c.loyalty<55);if(hurt&&family.wealth>=2){family.wealth-=2;hurt.wealth+=2;hurt.loyalty=Math.min(100,hurt.loyalty+4);record(s,hurt.id,'The family offered a private reconciliation gift.','家族以私人赠礼尝试和解。')}}
  }
 }
}

export function createDisputedHeirScenario(s){
 initializeDynasties(s);const faction='egypt';if(s.player!==faction)return {ok:false,reason:'faction'};
 const parent=createFictionalPerson(s,{name:['Nikon of Alexandria','亚历山大里亚的尼孔'],faction,birthYear:-90,location:'egypt',wealth:40,sex:'male'});
 const adopted=createFictionalPerson(s,{name:['Demetrios of Alexandria','亚历山大里亚的德米特里奥斯'],faction,birthYear:-68,location:'egypt',wealth:8,sex:'male'});
 const son=createFictionalPerson(s,{name:['Leontios of Alexandria','亚历山大里亚的莱昂提奥斯'],faction,birthYear:-70,location:'egypt',parents:[parent],wealth:5,sex:'male'});
 const general=createFictionalPerson(s,{name:['Straton of Thebes','底比斯的斯特拉顿'],faction,birthYear:-78,location:'egypt',wealth:10,sex:'male'});
 adoptHeir(s,parent,adopted);makeWill(s,parent,adopted,1);s.world.leadership.egypt=[parent];s.world.successionPlans.egypt=adopted;
 s.world.characters[parent].alive=false;s.world.characters[parent].health='deceased';s.world.characters[parent].deathYear=s.year;s.world.characters[parent].deathMonth=s.month;settleInheritance(s,parent);
 s.world.leadership.egypt=[adopted];s.world.characters[adopted].influence=55;s.world.characters[son].influence=48;s.world.characters[general].influence=65;
 s.world.claimants.egypt=[son];s.world.disputes.egypt={months:0,duration:0,support:{[son]:18},militaryAid:{[son]:500}};
 s.factions.egypt.stability=39;s.factions.egypt.legitimacy=42;
 dScenario(s,{parent,adopted,son,general});note(s,'A fictional succession crisis begins: an adopted heir holds the court, while the ruler’s son and a general contest his authority.','虚构继承危机开始：养子掌握宫廷，君主的亲生儿子和一位将军质疑其权威。');
 return {ok:true,parent,adopted,son,general};
}
function dScenario(s,ids){s.world.dynasties.scenario={...ids,stage:'disputed',startedYear:s.year,startedMonth:s.month}}

export function decideDisputedHeir(s,choice){
 const scenario=s.world.dynasties?.scenario,dispute=s.world.disputes?.egypt;if(!scenario||!dispute||scenario.stage!=='disputed'||s.player!=='egypt')return {ok:false,reason:'unavailable'};
 const son=s.world.characters[scenario.son],adopted=s.world.characters[scenario.adopted];
 if(choice==='appointed'){adopted.influence+=12;son.loyalty-=12;dispute.support[scenario.son]+=12;s.factions.egypt.stability-=5}
 else if(choice==='rival'){s.world.leadership.egypt=[scenario.son];s.world.claimants.egypt=[scenario.adopted];son.influence+=12;adopted.loyalty-=15;s.factions.egypt.stability-=8;dispute.support={[scenario.adopted]:20};dispute.militaryAid={[scenario.adopted]:500}}
 else if(choice==='compromise'){if(s.factions.egypt.treasury<18)return {ok:false,reason:'treasury'};s.factions.egypt.treasury-=18;s.factions.egypt.stability=Math.min(100,s.factions.egypt.stability+12);son.loyalty+=15;dispute.support[scenario.son]=Math.max(0,dispute.support[scenario.son]-15);dispute.months=0}
 else if(choice==='institution'){s.world.leadership.egypt=[];s.factions.egypt.stability=Math.max(0,s.factions.egypt.stability-4);dispute.months=5}
 else if(choice==='foreign'){
  if(s.factions.egypt.treasury<10)return {ok:false,reason:'treasury'};s.factions.egypt.treasury-=10;
  const key=pair('egypt','numidia'),neighbor=s.factions.numidia,terms=(s.relations[key]||0)>=-20&&neighbor?.treasury>=12;
  if(terms&&roll(s)<.55){neighbor.treasury-=12;s.factions.egypt.treasury+=12;s.relations[key]=(s.relations[key]||0)+15;s.factions.egypt.legitimacy=Math.min(100,s.factions.egypt.legitimacy+4);scenario.concessionMonths=24;note(s,'Numidia recognized the court and advanced 12 treasury; commercial privileges will cost 1 per month for two years.','努米底亚承认宫廷并提供12国库；商业特权使未来两年每月支出1国库。')}
  else note(s,'Numidia declined recognition after the envoy incurred its cost.','努米底亚拒绝承认，派遣使者的费用仍已支付。');
  s.factions.egypt.stability=Math.max(0,s.factions.egypt.stability-2);
 }
 else return {ok:false,reason:'choice'};
 const labels={appointed:'supporting the adopted heir',rival:'supporting the biological son',compromise:'compromise',institution:'court selection',foreign:'foreign recognition'},zhLabels={appointed:'支持养子',rival:'支持亲子',compromise:'协商妥协',institution:'宫廷裁决',foreign:'寻求外国承认'};
 scenario.stage='chosen';scenario.choice=choice;record(s,scenario.adopted,`The court chose ${labels[choice]} in the succession dispute.`,`宫廷在继承争议中选择了${zhLabels[choice]}。`);note(s,`The succession council chose ${labels[choice]}; the outcome remains uncertain.`,`继承会议选择了${zhLabels[choice]}，结果仍未确定。`);return {ok:true};
}
