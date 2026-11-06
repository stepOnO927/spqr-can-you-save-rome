import {CHARACTER_CATALOG} from './characters.js?v=20-xxiib';
import {startDynasticWar} from './civil-war.js?v=7-xxiib';

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
const ensureCatalog=s=>{for(const [id,entry] of Object.entries(s.world.dynasties.catalog))CHARACTER_CATALOG[id]=entry};

export function initializeDynasties(s){
 const d=s.world.dynasties||= {families:{},lives:{},catalog:{},marriages:[],memories:[],rulers:[],seed:220049,nextPerson:1,nextFamily:1};
 d.families||={};d.lives||={};d.catalog||={};d.marriages||=[];d.memories||=[];d.rulers||=[];d.inheritanceDisputes||=[];d.seed??=220049;d.nextPerson||=1;d.nextFamily||=1;ensureCatalog(s);
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
  const family=d.families['family:cleopatra'];s.world.characters.arsinoe.familyId=family.id;delete d.families['family:arsinoe'];
  d.historicalSeeded=true;
 }
 for(const [faction,ids] of Object.entries(s.world.leadership||{}))if(s.factions[faction]){
  const current=ids.filter(id=>s.world.characters[id]?.alive).join(':');
  if(d.rulers.filter(r=>r.faction===faction).at(-1)?.current!==current)d.rulers.push({faction,current,year:s.year,month:s.month});
 }
 return d;
}

export function createFictionalPerson(s,{name,faction,birthYear=s.year,familyId,parents=[],adoptiveParents=[],wealth=0,location=null,sex='unknown',role=['Court member','宫廷成员']}){
 const d=initializeDynasties(s),id=`fictional:${d.nextPerson++}`;
 const family=familyId||`family:fictional:${d.nextFamily++}`;
 if(!d.families[family])d.families[family]={id:family,name:Array.isArray(name)?name:[name,name],wealth:0,reputation:50,influence:20,leader:id,patrons:[]};
 d.catalog[id]={name:Array.isArray(name)?name:[name,name],birth:[birthYear,birthYear],faction,role,culture:['Simulated','模拟'],source:null,fictional:true};
 CHARACTER_CATALOG[id]=d.catalog[id];
 s.world.characters[id]={id,faction,health:'healthy',location,alive:true,loyalty:65,influence:20,wealth,parents:[...parents],adoptiveParents:[...adoptiveParents],children:[],spouse:null,familyId:family,birthYear,sex,education:0,ambition:Math.floor(20+roll(s)*60),personalitySeed:Math.floor(roll(s)*0xffffffff),wounds:0,illnessEpisodes:0};
 for(const parent of [...parents,...adoptiveParents])if(s.world.characters[parent])s.world.characters[parent].children.push(id);
 record(s,id,'Born in the simulated campaign.','出生于模拟战役。');return id;
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
 if(!eligibleAdult(s,id)||!heir?.alive||id===beneficiary||c.faction!==heir.faction||share<=0||share>1)return {ok:false,reason:'eligibility'};
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
 if(eligibleWill&&heirs.length&&!heirs.includes(eligibleWill)&&wealth>0){
  d.inheritanceDisputes.push({id:`estate:${id}`,deceased:id,faction:c.faction,beneficiary:eligibleWill,heirs:[...heirs],estate:wealth,share:c.will.share,status:'pending',year:s.year,month:s.month});
  c.wealth=0;record(s,id,'Died; the contested private estate is held pending a ruling.','去世；有争议的私人遗产待裁决。');
  note(s,`The private estate of ${CHARACTER_CATALOG[id].name[0]} is disputed; the court may uphold the will, divide it, or favor the children.`,` ${CHARACTER_CATALOG[id].name[1]}的私人遗产发生争议；宫廷可维持遗嘱、分割遗产或支持子女。`);
  return;
 }
 if(eligibleWill){const amount=Math.floor(wealth*c.will.share);s.world.characters[eligibleWill].wealth+=amount;c.wealth-=amount;record(s,eligibleWill,`Inherited ${amount} private wealth from ${CHARACTER_CATALOG[id].name[0]}.`,`从${CHARACTER_CATALOG[id].name[1]}继承${amount}私人财富。`)}
 const remaining=Math.max(0,Math.floor(c.wealth||0));if(heirs.length){for(const heir of heirs)s.world.characters[heir].wealth+=Math.floor(remaining/heirs.length);c.wealth=remaining%heirs.length}else{familyOf(s,id).wealth+=remaining;c.wealth=0}
 record(s,id,'Died; private property was settled separately from the state treasury.','去世；私人财产与国库分别结算。');
}

export function resolveInheritanceDispute(s,disputeId,choice){
 const d=initializeDynasties(s),caseFile=d.inheritanceDisputes.find(x=>x.id===disputeId&&x.status==='pending');
 if(!caseFile)return {ok:false,reason:'unavailable'};
 if(!['will','compromise','heirs'].includes(choice))return {ok:false,reason:'choice'};
 const faction=s.factions[caseFile.faction],beneficiary=s.world.characters[caseFile.beneficiary],heirs=caseFile.heirs.map(id=>s.world.characters[id]).filter(c=>c?.alive);
 if(!beneficiary?.alive&&!heirs.length)return {ok:false,reason:'no_heirs'};
 if(choice==='compromise'&&faction?.treasury<6)return {ok:false,reason:'treasury'};
 const willAmount=beneficiary?.alive?(choice==='will'?Math.floor(caseFile.estate*caseFile.share):choice==='compromise'?Math.floor(caseFile.estate*.5):0):0;
 if(beneficiary)beneficiary.wealth+=willAmount;
 const rest=caseFile.estate-willAmount;
 if(heirs.length){const portion=Math.floor(rest/heirs.length);for(const heir of heirs)heir.wealth+=portion;d.families[s.world.characters[caseFile.deceased].familyId].wealth+=rest-portion*heirs.length}
 else if(beneficiary)beneficiary.wealth+=rest;
 else d.families[s.world.characters[caseFile.deceased].familyId].wealth+=rest;
 if(choice==='compromise'){faction.treasury-=6;faction.stability=Math.min(100,faction.stability+2)}
 if(choice==='will'){for(const heir of heirs)heir.loyalty=Math.max(0,heir.loyalty-8);if(faction)faction.stability=Math.max(0,faction.stability-2)}
 if(choice==='heirs'&&beneficiary){beneficiary.loyalty=Math.max(0,beneficiary.loyalty-10);if(faction)faction.stability=Math.max(0,faction.stability-1)}
 d.memories.push({familyId:s.world.characters[caseFile.deceased].familyId,targetFamilyId:beneficiary?.familyId,kind:`inheritance_${choice}`,year:s.year,month:s.month,weight:choice==='compromise'?2:-6});
 caseFile.status='resolved';caseFile.choice=choice;caseFile.resolvedYear=s.year;caseFile.resolvedMonth=s.month;
 const labels={will:['will upheld','维持遗嘱'],compromise:['estate divided','分割遗产'],heirs:['children favored','支持子女']};
 record(s,caseFile.deceased,`Inheritance ruling: ${labels[choice][0]}.`,`继承裁决：${labels[choice][1]}。`);
 if(caseFile.faction===s.player)note(s,`Inheritance ruling: ${labels[choice][0]}.`,`继承裁决：${labels[choice][1]}。`);
 return {ok:true};
}

export function advanceDynasties(s){
 const d=initializeDynasties(s);
 for(const dispute of d.inheritanceDisputes.filter(x=>x.status==='pending')){
  const age=(s.year-dispute.year)*12+s.month-dispute.month;
  if((dispute.faction!==s.player&&age>=3)||age>=12){const choice=s.factions[dispute.faction]?.treasury>=6?'compromise':'heirs';resolveInheritanceDispute(s,dispute.id,choice)}
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
  if(roll(s)>=.12)continue;const candidates=Object.values(s.world.characters).filter(c=>c.faction===faction&&CHARACTER_CATALOG[c.id]?.fictional&&eligibleAdult(s,c.id)&&!c.spouse).sort((a,b)=>b.influence-a.influence);
  const first=candidates[0],second=candidates.find(c=>c.id!==first?.id&&c.familyId!==first?.familyId);if(first&&second)proposeMarriage(s,first.id,second.id);
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
