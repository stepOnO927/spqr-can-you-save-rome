import {initializeWorld,CHARACTER_CATALOG} from './characters.js?v=succession-ui-recovery-1';
import {createFictionalPerson} from './dynasties.js?v=succession-ui-recovery-1';
import {initializeOffices,appointOffice} from './office-system.js?v=succession-ui-recovery-1';

const ROMAN=new Set(['caesar','senate']);
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const date=s=>s.year*12+s.month;
const roll=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const note=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh,kind:'political'});s.log=s.log.slice(0,80)};
export const MAGISTRACIES={
 consul:{name:['Consul','执政官'],seats:2,month:10,body:'centuriate',age:42,previous:'praetor'},
 praetor:{name:['Praetor','裁判官'],seats:2,month:11,body:'centuriate',age:39,previous:'quaestor'},
 quaestor:{name:['Quaestor','财务官'],seats:2,month:12,body:'tribal',age:30},
 aedile:{name:['Curule Aedile','高级营造官'],seats:2,month:12,body:'tribal',age:36},
 plebeian_aedile:{name:['Plebeian Aedile','平民营造官'],seats:2,month:12,body:'plebeian',age:36},
 tribune:{name:['Tribune of the Plebs','保民官'],seats:2,month:12,body:'plebeian',age:30},
 censor:{name:['Censor','监察官'],seats:2,month:10,body:'centuriate',age:42,previous:'consul',cycle:5},
 dictator:{name:['Dictator','独裁官'],seats:1,body:'exceptional'}
};
export const ASSEMBLIES={centuriate:['Comitia Centuriata','百人队大会'],tribal:['Comitia Tributa','部族大会'],plebeian:['Concilium Plebis','平民会议'],curiate:['Comitia Curiata','库里亚大会']};
const person=(s,id)=>s.world.characters[id];
const name=(id,i=0)=>CHARACTER_CATALOG[id]?.name?.[i]||id;
const age=(s,id)=>Number.isFinite(person(s,id)?.birthYear)?s.year-person(s,id).birthYear:null;
const present=(s,id)=>{const p=person(s,id);return !!(p?.alive&&!p.missing&&!p.travel&&!['seriously_ill','dying','deceased'].includes(p.health))};
const factionOfRome=s=>s.regions.find(r=>r.id==='roma')?.owner;
const officeYear=s=>s.year+1;
function addFictional(s,faction,kind,index){
 const first=['Lucius','Publius','Aulus','Gaius','Marcus','Titus'][((index%6)+6)%6];
 const family=['Varro','Cassianus','Varenus','Marcellinus','Fabius','Valerius'][((Math.floor(index/6)%6)+6)%6];
 const zhFirst=['卢基乌斯','普布利乌斯','奥卢斯','盖乌斯','马尔库斯','提图斯'][((index%6)+6)%6];
 const zhFamily=['瓦罗','卡西亚努斯','瓦雷努斯','马尔凯利努斯','法比乌斯','瓦莱里乌斯'][((Math.floor(index/6)%6)+6)%6];
 const id=createFictionalPerson(s,{name:[first+' '+family,zhFirst+'·'+zhFamily],faction,birthYear:s.year-({quaestor:33,aedile:38,plebeian_aedile:38,tribune:35,praetor:41,consul:45,censor:50}[kind]||40)-((index%4+4)%4),location:s.regions.find(r=>r.owner===faction)?.id||null,sex:'male',role:['Simulated political candidate','模拟政治候选人']});
 const p=person(s,id);p.education=65+index%5*5;p.influence=42+index%4*8;p.loyalty=50+index%5*7;p.wealth=14+index%4*5;
 const c=s.world.cursus;c.careers[id]=kind==='consul'?[{office:'quaestor',year:s.year-11,simulated:true},{office:'praetor',year:s.year-4,simulated:true}]:kind==='praetor'||kind==='aedile'?[{office:'quaestor',year:s.year-5,simulated:true}]:[];
 c.obedience[id]={value:clamp(45+p.loyalty/3-(p.ambition||40)/6),history:[{year:s.year,month:s.month,cause:'initial',delta:0}]};
 c.applicants.push({id,year:s.year,office:kind,status:'eligible',faction,statement:'simulated',platform:['administration','finance','war','reform','law'][Math.abs(index)%5],senatorialSupport:clamp(38+(p.influence||40)/3),support:0,opposition:0,campaignExpense:0,promises:[]});
 return id;
}
function seedSenators(s,c){
 if(c.senators.length)return;
 const houses=[
  [['Publius Lentulus','普布利乌斯·伦图卢斯'],'aristocratic','finance'],
  [['Aulus Domitius','奥卢斯·多米提乌斯'],'military','war'],
  [['Gaius Calpurnius','盖乌斯·卡尔普尔尼乌斯'],'provincial','administration'],
  [['Marcus Aemilius','马尔库斯·埃米利乌斯'],'reform','reform'],
  [['Titus Licinius','提图斯·李锡尼乌斯'],'aristocratic','law'],
  [['Quintus Sulpicius','昆图斯·苏尔皮基乌斯'],'military','war'],
  [['Lucius Cassius','卢基乌斯·卡西乌斯'],'reform','reform'],
  [['Gnaeus Valerius','格奈乌斯·瓦莱里乌斯'],'provincial','administration'],
  [['Sextus Fabius','塞克斯图斯·法比乌斯'],'aristocratic','finance'],
  [['Decimus Junius','德基穆斯·尤尼乌斯'],'military','war'],
  [['Servius Claudius','塞尔维乌斯·克劳狄乌斯'],'reform','law'],
  [['Appius Cornelius','阿庇乌斯·科尔内利乌斯'],'provincial','administration']
 ];
 for(let i=0;i<houses.length;i++){
  const faction=i<6?'senate':'caesar',[names,network,interest]=houses[i];
  const id=createFictionalPerson(s,{name:names,faction,birthYear:s.year-49-(i%9),location:s.regions.find(r=>r.owner===faction)?.id||null,sex:'male',role:['Simulated senator','模拟元老']});
  const p=person(s,id);p.education=62+(i*7)%28;p.influence=50+(i*9)%38;p.wealth=20+(i*5)%24;p.loyalty=45+(i*7)%35;
  c.senators.push({id,faction,network,interest,influence:p.influence,publicPosition:faction,joined:{year:s.year,month:s.month}});
  c.careers[id]=[{office:'quaestor',year:s.year-17-i%5,simulated:true}];
  c.obedience[id]={value:clamp(38+p.loyalty/3),history:[{year:s.year,month:s.month,cause:'initial',delta:0}]};
 }
 for(const a of c.senators)for(const b of c.senators)if(a.id!==b.id&&a.network===b.network){c.networks[a.id]||=[];if(!c.networks[a.id].includes(b.id))c.networks[a.id].push(b.id)}
}
export function initializeCursus(s){
 initializeWorld(s);initializeOffices(s);
 if(!s.world.cursus)s.world.cursus={version:1,seeded:false,year:s.year,magistrates:Object.fromEntries(Object.keys(MAGISTRACIES).map(k=>[k,[]])),pendingTerms:[],careers:{},obedience:{},applicants:[],elections:[],endorsements:[],senate:{caesar:42,senate:58},assemblies:{centuriate:50,tribal:50,plebeian:50,curiate:50},foreignPosts:{},intel:{},contacts:[],offers:[],advisers:[],investigations:[],networks:{},referrals:{},reforms:[],proposals:[],senators:[],senatorTies:{},campaignActions:[],politicalReviews:[],retirements:[],retired:{},referralSources:{},termHistory:[],talentSearches:[],talents:[],cooperations:[],institutionalResponses:[],recommendations:[],appointmentHistory:[],officeLastSeen:{},applicationHistory:[],applicationReviews:[],applicationDecisions:{},curiateFormalities:[]};
 const c=s.world.cursus;
 for(const key of ['magistrates','careers','obedience','senate','assemblies','foreignPosts','intel','networks','referrals','senatorTies','retired','referralSources','officeLastSeen','applicationDecisions'])c[key]||={};
 for(const key of ['pendingTerms','applicants','elections','endorsements','contacts','offers','advisers','investigations','reforms','proposals','senators','campaignActions','politicalReviews','retirements','termHistory','talentSearches','talents','cooperations','institutionalResponses','recommendations','appointmentHistory','applicationHistory','applicationReviews','curiateFormalities'])c[key]||=[];
 if(!Object.keys(c.officeLastSeen).length)c.officeLastSeen=Object.fromEntries(Object.entries(s.world.offices||{}).map(([faction,posts])=>[faction,{...posts}]));
 for(const [actor,ids] of Object.entries(c.referrals)){c.referralSources[actor]||=[];for(const id of ids){if(c.referralSources[actor].some(x=>x.id===id))continue;const offer=c.offers.findLast(x=>x.actor===actor&&x.status==='accepted');if(offer)c.referralSources[actor].push({id,target:offer.target,from:offer.id,observed:{year:offer.year,month:offer.month},confidence:'legacy'})}}
 for(const contact of c.contacts){if(contact.status==='open'){contact.relationship||={familiarity:clamp((contact.trust||20)+10),trust:contact.trust||20,respect:clamp(30+(person(s,contact.id)?.education||50)/5),professional:20,alignment:30,obligation:0,rivalry:0,willingness:25};contact.trust=contact.relationship.trust}}
 for(const offer of c.offers.filter(x=>x.status==='accepted'&&person(s,x.id)?.faction===x.actor))if(!c.advisers.some(a=>a.id===offer.id))c.advisers.push({id:offer.id,actor:offer.actor,formerFaction:offer.target,year:offer.year,month:offer.month});
 c.assemblies.curiate??=50;
 for(const key of Object.keys(MAGISTRACIES))c.magistrates[key]||=[];
 if(!c.seeded){
  c.seeded=true;
  // These people and prior offices are explicit alternate-history simulations.
  for(const faction of ['caesar','senate']){const offset=faction==='senate'?0:12;for(let i=0;i<4;i++){const id=addFictional(s,faction,'consul',offset+i);if(faction==='senate'&&i===0){c.varroId=id;const varro=person(s,id);varro.education=96;varro.influence=86;varro.wealth=36;varro.ambition=100;varro.eloquence=92;c.applicants.find(x=>x.id===id).senatorialSupport=80;c.obedience[id].value=34}}for(const office of ['praetor','quaestor','aedile','plebeian_aedile','tribune'])for(let i=0;i<MAGISTRACIES[office].seats+1;i++)addFictional(s,faction,office,offset+4+i+Object.keys(MAGISTRACIES).indexOf(office)*4)}
  for(const [faction,administrator,scholar] of [
   ['parthia',['Artabanus of Media','米底的阿尔塔巴努斯'],['Mithradates the Scholar','学者米特拉达梯']],
   ['egypt',['Dionysios of Alexandria','亚历山大里亚的狄奥尼西奥斯'],['Herakleides the Scholar','学者赫拉克利德']],
   ['numidia',['Adherbal of Cirta','基尔塔的阿德尔巴尔'],['Tazlar the Scribe','书记官塔兹拉尔']],
   ['mauretania',['Masten of Iol','伊奥尔的马斯滕'],['Iarbas the Scribe','书记官伊阿尔巴斯']],
   ['armenia',['Aram of Artaxata','阿尔塔克萨塔的阿拉姆'],['Vahan the Scholar','学者瓦罕']],
   ['galatia',['Brogitarus of Ancyra','安基拉的布罗吉塔鲁斯'],['Adiatunnus the Scribe','书记官阿迪阿图努斯']],
   ['bosporus',['Mithridates of Panticapaeum','潘提卡帕伊翁的米特里达梯'],['Leucon the Scholar','学者列乌孔']]
  ]){
   if(!s.factions[faction]||!s.regions.some(r=>r.owner===faction))continue;
   const location=s.regions.find(r=>r.owner===faction)?.id||null;
   const id=createFictionalPerson(s,{name:administrator,faction,birthYear:s.year-40,location,sex:'male',role:['Simulated court administrator','模拟宫廷行政官']});
   person(s,id).education=78;person(s,id).loyalty=58;
   const scholarId=createFictionalPerson(s,{name:scholar,faction,birthYear:s.year-36,location,sex:'male',role:['Simulated court scholar','模拟宫廷学者']});
   person(s,scholarId).education=83;person(s,scholarId).loyalty=49;
   c.foreignPosts[faction]={administration:id,scholar:scholarId};c.networks[id]=[scholarId];c.networks[scholarId]=[id];
  }
 }
 seedSenators(s,c);
 for(const applicant of c.applicants)if(!Number.isFinite(applicant.senatorialSupport))applicant.senatorialSupport=applicant.id===c.varroId?80:clamp(38+(person(s,applicant.id)?.influence||40)/3);
 return c;
}
export function officeEligibility(s,id,office){
 const c=initializeCursus(s),o=MAGISTRACIES[office],p=person(s,id);
 if(!o||office==='dictator'||!p||!ROMAN.has(p.faction)||!present(s,id)||c.retired[id])return {ok:false,reason:'unavailable'};
 const a=age(s,id);if(a==null||a<o.age)return {ok:false,reason:'age'};
 if(o.previous&&!c.careers[id]?.some(x=>x.office===o.previous))return {ok:false,reason:'career'};
 if(c.magistrates[office].some(x=>x.id===id)||c.pendingTerms.some(x=>x.id===id))return {ok:false,reason:'incumbent'};
 return {ok:true};
}
export function obedience(s,id){const c=initializeCursus(s),p=person(s,id);if(!p)return null;if(!c.obedience[id])c.obedience[id]={value:clamp(45+(p.loyalty||50)/3-(p.ambition||40)/6),history:[]};return c.obedience[id].value}
export function changeObedience(s,id,delta,cause){const c=initializeCursus(s),p=person(s,id);if(!p||!cause)return {ok:false};const entry=c.obedience[id]||{value:obedience(s,id),history:[]};entry.value=clamp(entry.value+delta);entry.history.push({year:s.year,month:s.month,cause,delta});entry.history=entry.history.slice(-24);c.obedience[id]=entry;return {ok:true,value:entry.value}}
export function campaignPhase(s,office='consul'){
 const electionMonth=MAGISTRACIES[office]?.month||10;
 if(s.month<=2)return 'registration';
 if(s.month<=4)return 'alliances';
 if(s.month<=Math.max(5,electionMonth-3))return 'public';
 if(s.month<electionMonth)return 'negotiations';
 if(s.month===electionMonth)return 'election';
 return 'transition';
}
export function senateAssessment(s,actor=s.player,issue='general'){
 const c=initializeCursus(s),senators=c.senators.filter(x=>present(s,x.id)&&!c.retired[x.id]);
 if(!senators.length)return {support:clamp(c.senate[actor]??50),votes:[]};
 const votes=senators.map(x=>{
  const p=person(s,x.id),tie=c.senatorTies[x.id]?.[actor]||0;
  const value=clamp((c.senate[actor]??50)*.65+(x.faction===actor?25:0)+6+tie*.3+(x.interest===issue?6:0)+(p.loyalty||50)/20-3);
  return {id:x.id,actor,issue,support:value,position:value>=50?'support':'oppose',network:x.network};
 });
 const total=votes.reduce((n,x)=>n+x.support,0),support=clamp(total/votes.length);
 return {support,votes,for:votes.filter(x=>x.position==='support').length,against:votes.filter(x=>x.position==='oppose').length};
}
export function seekSenatorEndorsement(s,senatorId,candidateId,actor=s.player){
 const c=initializeCursus(s),senator=c.senators.find(x=>x.id===senatorId),candidate=campaignFor(s,candidateId),p=person(s,candidateId);
 if(!senator||!present(s,senatorId)||!candidate||!p||!present(s,candidateId)||candidate.status!=='eligible'||!officeEligibility(s,candidateId,candidate.office).ok)return {ok:false,reason:'candidate'};
 if(factionOfRome(s)!==actor||!ROMAN.has(actor))return {ok:false,reason:'rome'};
 if(s.month>=MAGISTRACIES[candidate.office].month)return {ok:false,reason:'closed'};
 if(c.endorsements.some(x=>x.senatorId===senatorId&&x.candidateId===candidateId&&x.year===s.year&&['pending','accepted'].includes(x.status)))return {ok:false,reason:'pending'};
 const cost=5;if(s.factions[actor].treasury<cost)return {ok:false,reason:'treasury',cost};
 s.factions[actor].treasury-=cost;
 const item={senatorId,candidateId,actor,year:s.year,month:s.month,remaining:2,status:'pending',cost};
 c.endorsements.push(item);return {ok:true,cost,months:2};
}
function advanceEndorsements(s,c){
 for(const item of c.endorsements.filter(x=>x.status==='pending')){
  if(--item.remaining>0)continue;
  const senator=c.senators.find(x=>x.id===item.senatorId),candidate=c.applicants.find(x=>x.id===item.candidateId&&x.year===item.year),p=person(s,item.candidateId);
  if(!senator||!present(s,item.senatorId)||!candidate||!p||candidate.status!=='eligible'||s.month>=MAGISTRACIES[candidate.office].month){item.status='lapsed';continue}
  const chance=Math.max(.12,Math.min(.88,.3+(p.influence||40)/250+(senator.faction===p.faction ? .12 : -.16)+(senator.interest===candidate.platform ? .12 : 0)+(c.senatorTies[senator.id]?.[p.faction]||0)/500));
  item.status=roll(s)<chance?'accepted':'refused';item.resolved={year:s.year,month:s.month};
  c.senatorTies[senator.id]||={};c.senatorTies[senator.id][p.faction]=clamp((c.senatorTies[senator.id][p.faction]||0)+(item.status==='accepted'?8:-3));
  if(candidate)candidate.senatorialSupport=clamp((candidate.senatorialSupport||50)+(item.status==='accepted'?4:-2));
  if(item.status==='accepted'){c.networks[senator.id]||=[];if(!c.networks[senator.id].includes(item.candidateId))c.networks[senator.id].push(item.candidateId);senator.publicPosition=item.candidateId}
  if(item.actor===s.player)note(s,item.status==='accepted'?'A named senator endorsed a candidate; the assembly remains free to choose.':'A named senator declined to endorse a candidate.',item.status==='accepted'?'一位具名元老支持候选人；公民大会仍独立表决。':'一位具名元老拒绝为候选人背书。');
 }
}
export function institutionalBalance(s,faction=s.player){
 const c=initializeCursus(s),posts=initializeOffices(s)[faction]||{},holders=Object.values(posts).filter(id=>present(s,id));
 const magistrate=holders.length?clamp(holders.reduce((n,id)=>n+obedience(s,id),0)/holders.length):40;
 const senate=senateAssessment(s,faction).support,assembly=clamp((c.assemblies.centuriate+c.assemblies.tribal+c.assemblies.plebeian)/3);
 const advisers=(c.advisers||[]).filter(x=>x.actor===faction&&person(s,x.id)?.faction===faction&&present(s,x.id)).length;
 return {magistrate,senate,assembly,administrative:clamp((magistrate*2+(s.factions[faction]?.stability||50))/3+Math.min(10,advisers*3)),reform:clamp((senate+assembly)/2)};
}
export function annualApplicants(s){
 const c=initializeCursus(s);if(c.year===s.year)return c.applicants.filter(x=>x.year===s.year);
 c.year=s.year;const retained=x=>x.year>=s.year-1||x.promises?.some(p=>['pending','delayed'].includes(p.status));for(const old of c.applicants.filter(x=>!retained(x)))if(!c.applicationHistory.some(x=>x.id===old.id&&x.year===old.year&&x.office===old.office))c.applicationHistory.push({...old,promises:(old.promises||[]).map(p=>({...p}))});c.applicants=c.applicants.filter(retained);
 const renewed=new Set();for(const old of c.applicants.filter(x=>x.year===s.year-1&&x.status==='lost'&&present(s,x.id)&&!c.retired[x.id]&&officeEligibility(s,x.id,x.office).ok).sort((a,b)=>b.support-a.support)){const key=old.faction+':'+old.office;if(renewed.has(key))continue;renewed.add(key);c.applicants.push({...old,year:s.year,status:'eligible',support:0,opposition:0,campaignExpense:0,promises:[]})}
 for(const [id,history] of Object.entries(c.careers)){
  if(!present(s,id)||c.retired[id]||!history?.some(x=>x.source==='election'))continue;
  const last=[...history].reverse().find(x=>x.source==='election'),next=last?.office==='quaestor'?'praetor':last?.office==='praetor'?'consul':null;
  if(next&&officeEligibility(s,id,next).ok&&!c.applicants.some(x=>x.id===id&&x.year===s.year&&x.office===next)&&c.applicants.filter(x=>x.year===s.year&&x.office===next&&x.faction===person(s,id).faction).length<2)c.applicants.push({id,year:s.year,office:next,status:'eligible',faction:person(s,id).faction,statement:'career promotion',platform:'administration',support:0,opposition:0,campaignExpense:0,promises:[]});
 }
 for(const faction of ['caesar','senate'])if(s.factions[faction]&&s.regions.some(r=>r.owner===faction)){
  for(const office of ['consul','praetor','quaestor','aedile','plebeian_aedile','tribune'])addFictional(s,faction,office,Math.abs(s.year)*13+Object.keys(MAGISTRACIES).indexOf(office)*3+(faction==='senate'?0:1));
  for(const id of Object.keys(c.careers))if(c.careers[id]?.some(x=>x.office==='consul')&&person(s,id)?.faction===faction&&officeEligibility(s,id,'censor').ok&&Math.abs(s.year)%5===0)c.applicants.push({id,year:s.year,office:'censor',status:'eligible',faction,support:0,opposition:0,promises:[]});
 }
 note(s,'Annual office applications have opened; candidates remain independent political actors.','年度官员申请已开放；候选人仍是独立的政治人物。');
 return c.applicants.filter(x=>x.year===s.year);
}
export function campaignFor(s,id){return initializeCursus(s).applicants.find(x=>x.id===id&&x.year===s.year)}
export function campaignEstimate(s,id){
 const c=initializeCursus(s),candidate=campaignFor(s,id);
 if(!candidate||candidate.status!=='eligible')return {tier:'unavailable',certainty:'low'};
 const field=c.applicants.filter(x=>x.year===s.year&&x.office===candidate.office&&x.faction===candidate.faction&&x.status==='eligible');
 const publicScore=x=>{const p=person(s,x.id),endorsements=c.endorsements.filter(e=>e.candidateId===x.id&&e.year===s.year&&e.status==='accepted').length;return (x.support||0)-(x.opposition||0)+(p?.influence||50)*.2+(p?.wealth||0)*.08+(p?.education||50)*.12+endorsements*3+(x.senatorialSupport||50)*.08+(c.senate[x.faction]||50)*.04};
 const ranked=field.map(x=>({id:x.id,score:publicScore(x)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)),position=ranked.findIndex(x=>x.id===id),seats=MAGISTRACIES[candidate.office]?.seats||1,cutoff=ranked[Math.min(seats,ranked.length)-1]?.score??0,gap=publicScore(candidate)-cutoff;
 return {tier:ranked.length<=seats?'uncertain':position<seats?(gap>12?'strong_lead':gap>3?'narrow_lead':'competitive'):gap< -15?'trailing':'competitive',certainty:Math.abs(gap)<8?'low':'moderate',observed:{year:s.year,month:s.month}};
}
export function supportCandidate(s,id,action='support',actor=s.player,detail=null){
 const c=initializeCursus(s),candidate=campaignFor(s,id),p=person(s,id),controller=factionOfRome(s);
 if(!ROMAN.has(actor)||!candidate||candidate.status!=='eligible'||!p||!present(s,id)||!officeEligibility(s,id,candidate.office).ok)return {ok:false,reason:'candidate'};
 if(controller!==actor)return {ok:false,reason:'rome'};
 const costs={support:8,oppose:6,canvass:5,speech:4,family:7,games:12,debate:5,negotiate:4,withdraw:3,promise:3,improper:14};
 if(!(action in costs))return {ok:false,reason:'action'};
 if(s.month>=MAGISTRACIES[candidate.office].month)return {ok:false,reason:'closed'};
 if(action==='games'&&!['aedile','plebeian_aedile'].includes(candidate.office)&&!c.careers[id]?.some(x=>['aedile','plebeian_aedile'].includes(x.office)))return {ok:false,reason:'authority'};
 if(action==='family'&&!c.senators.some(x=>x.faction===actor&&present(s,x.id)))return {ok:false,reason:'unavailable'};
 if(action==='debate'&&!c.applicants.some(x=>x.year===s.year&&x.office===candidate.office&&x.id!==id&&x.status==='eligible'))return {ok:false,reason:'unavailable'};
 if(c.campaignActions.some(x=>x.id===id&&x.action===action&&x.actor===actor&&x.year===s.year&&x.month===s.month))return {ok:false,reason:'cooldown'};
 const cost=costs[action];if(s.factions[actor].treasury<cost)return {ok:false,reason:'treasury',cost};
 if(action==='support'&&p.faction!==actor&&obedience(s,id)<55)return {ok:false,reason:'refused'};
 s.factions[actor].treasury-=cost;candidate.campaignExpense=(candidate.campaignExpense||0)+cost;
 const record={id,actor,action,cost,year:s.year,month:s.month,phase:campaignPhase(s,candidate.office),outcome:'completed'};
 c.campaignActions.push(record);
 if(action==='oppose'){candidate.senatorialSupport=clamp((candidate.senatorialSupport||50)-4);candidate.opposition+=8;changeObedience(s,id,-6,'public opposition');if(roll(s)<.25)candidate.allegation={public:true,source:'opposition',year:s.year,month:s.month}}
 else if(action==='improper'){candidate.support+=roll(s)<.55?12:3;candidate.irregularity={actor,evidence:35+Math.round(roll(s)*50),public:roll(s)<.35,year:s.year,month:s.month};if(candidate.irregularity.public)candidate.allegation={public:true,source:'witness',year:s.year,month:s.month}}
 else if(action==='promise'){
  const kind=['public_works','grain_relief'].includes(detail)?detail:'public_works';
  candidate.promises.push({id:`promise:${id}:${s.year}:${s.month}:${candidate.promises.length+1}`,by:actor,year:s.year,month:s.month,kind,beneficiary:kind==='grain_relief'?'plebs':actor,body:kind==='grain_relief'?'plebeian':'tribal',requiredAction:kind,public:true,benefit:3,cost:kind==='grain_relief'?10:8,deadlineYear:s.year+1,status:'offered'});
  candidate.support+=3;changeObedience(s,id,2,'campaign promise');
 }
 else if(action==='speech'){const gain=Math.max(1,Math.round(((p.eloquence||p.influence||50)+(p.reputation||50))/35+roll(s)*4-2));candidate.support+=gain;record.gain=gain}
 else if(action==='family'){candidate.senatorialSupport=clamp((candidate.senatorialSupport||50)+3);const senator=c.senators.filter(x=>x.faction===actor&&present(s,x.id)).sort((x,y)=>y.influence-x.influence)[0];if(senator){c.networks[id]||=[];if(!c.networks[id].includes(senator.id))c.networks[id].push(senator.id);candidate.support+=5;candidate.promises.push({id:`family:${id}:${s.year}:${s.month}`,by:id,year:s.year,month:s.month,kind:'patronage',beneficiary:senator.id,body:'senate',requiredAction:'consultation',public:false,benefit:5,cost:4,deadlineYear:s.year+1,status:'offered'})}else record.outcome='no_patron'}
 else if(action==='games'){const gain=4+Math.floor(roll(s)*5);candidate.support+=gain;record.gain=gain}
 else if(action==='debate'){const rival=c.applicants.filter(x=>x.year===s.year&&x.office===candidate.office&&x.id!==id&&x.status==='eligible').sort((x,y)=>y.support-x.support)[0];if(rival){const won=(p.eloquence||p.influence||50)+roll(s)*35>(person(s,rival.id)?.eloquence||person(s,rival.id)?.influence||50)+roll(s)*35;candidate.support+=won?5:0;candidate.opposition+=won?0:3;rival.opposition+=won?3:0;record.outcome=won?'won':'lost';record.rivalId=rival.id}else record.outcome='no_rival'}
 else if(action==='negotiate'){const accepts=roll(s)<Math.max(.15,Math.min(.8,.32+obedience(s,id)/250-(p.ambition||50)/500));if(accepts){candidate.support+=6;changeObedience(s,id,3,'conditional support');candidate.promises.push({id:`agreement:${id}:${s.year}:${s.month}`,by:id,year:s.year,month:s.month,kind:'consultation',beneficiary:actor,body:'senate',requiredAction:'consultation',public:false,benefit:6,cost:0,deadlineYear:s.year+1,status:'offered'})}else{changeObedience(s,id,-2,'rejected conditions');record.outcome='refused'}}
 else if(action==='withdraw'){const accepts=roll(s)<Math.max(.05,Math.min(.75,.12+(candidate.opposition-candidate.support)/100+obedience(s,id)/300));if(accepts){candidate.status='withdrawn';record.outcome='withdrawn'}else{changeObedience(s,id,-3,'withdrawal pressure');record.outcome='refused'}}
 else{candidate.senatorialSupport=clamp((candidate.senatorialSupport||50)+(action==='support'?2:1));candidate.support+=action==='support'?12:7;changeObedience(s,id,action==='support'?4:2,'campaign support')}
 c.senate[actor]=clamp((c.senate[actor]||50)+(action==='oppose'?-2:action==='withdraw'&&record.outcome==='refused'?-1:1));
 return {ok:true,cost,candidate:id,action,outcome:record.outcome};
}
export function investigateCandidate(s,id,actor=s.player){
 const c=initializeCursus(s),candidate=campaignFor(s,id),office=MAGISTRACIES[candidate?.office];
 if(!candidate||!candidate.allegation?.public)return {ok:false,reason:'evidence'};
 if(!office?.body||s.month>office.month-2||c.elections.some(e=>e.year===s.year&&e.office===candidate.office))return {ok:false,reason:'closed'};
 if(factionOfRome(s)!==actor||(c.senate[actor]||0)<35)return {ok:false,reason:'authority'};
 if(c.investigations.some(x=>x.id===id&&x.year===s.year&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<8)return {ok:false,reason:'treasury',cost:8};
 s.factions[actor].treasury-=8;c.investigations.push({id,actor,year:s.year,month:s.month,remaining:2,status:'pending',source:candidate.allegation.source});
 return {ok:true,cost:8,months:2};
}
function advanceInvestigations(s,c){
 c.investigations=c.investigations.filter(x=>x.year>=s.year-5);
 for(const inquiry of c.investigations.filter(x=>x.status==='pending')){
  if(--inquiry.remaining>0)continue;
  const candidate=c.applicants.find(x=>x.id===inquiry.id&&x.year===inquiry.year),evidence=candidate?.irregularity?.evidence||0;
  const proved=evidence>0&&roll(s)<Math.min(.9,evidence/100);
  inquiry.status=proved?'proved':'unproven';inquiry.resolved={year:s.year,month:s.month};
  if(proved){candidate.status='disqualified';changeObedience(s,inquiry.id,-10,'electoral inquiry');c.senate[candidate.faction]=clamp((c.senate[candidate.faction]||50)-5)}
  else if(candidate?.irregularity==null){c.senate[inquiry.actor]=clamp((c.senate[inquiry.actor]||50)-3)}
  if(inquiry.actor===s.player)note(s,proved?'An inquiry proved improper electoral influence; the candidate was disqualified.':'The inquiry did not establish misconduct.',proved?'调查证实不当竞选影响；候选人被取消资格。':'调查未能证实违规。');
 }
}
function score(s,candidate,body){
 const p=person(s,candidate.id),career=initializeCursus(s).careers[candidate.id]||[],rome=factionOfRome(s),support=initializeCursus(s).senate[candidate.faction]||45;
 const merit=(p.education||50)*.35+career.length*5+(p.influence||40)*.25+(p.wealth||0)*.12;
 const backers=initializeCursus(s).endorsements.filter(x=>x.candidateId===candidate.id&&x.year===s.year&&x.status==='accepted');
 const endorsement=Math.min(18,backers.reduce((n,x)=>n+(initializeCursus(s).senators.find(y=>y.id===x.senatorId)?.influence||50)/25,0));
 const patronage=candidate.support-candidate.opposition+support*.18+(candidate.senatorialSupport||50)*.09+endorsement+(candidate.faction===rome?8:-10);
 const groups=body==='centuriate'?[['senior',.48],['middle',.32],['other',.20]]:body==='plebeian'?[['urban',.42],['rural',.58]]:[['urban',.30],['rural',.70]];
 return {total:Math.round(groups.reduce((n,[group,weight])=>n+weight*(merit+patronage+(group==='senior'?(p.wealth||0)*.25:group==='urban'?(p.influence||0)*.1:(p.loyalty||50)*.08)+roll(s)*16),0)),groups:groups.map(([group,weight])=>({group,weight}))};
}
export function resolveElection(s,office='consul'){
 const c=initializeCursus(s),o=MAGISTRACIES[office],controller=factionOfRome(s);
 if(!o?.body||!ROMAN.has(controller)||o.cycle&&Math.abs(s.year)%o.cycle!==0)return {ok:false,reason:'procedure'};
 if(c.elections.some(x=>x.year===s.year&&x.office===office))return {ok:false,reason:'complete'};
 const candidates=c.applicants.filter(x=>x.year===s.year&&x.office===office&&x.status==='eligible'&&officeEligibility(s,x.id,office).ok&&x.faction===controller);
 const entries=candidates.map(x=>({id:x.id,score:score(s,x,o.body).total,votes:0}));
 const groups=o.body==='centuriate'?[['equites',18],['first',80],['second',20],['third',20],['fourth',20],['fifth',30],['unarmed',5]]:o.body==='plebeian'?[['urban',4],['rural',4]]:[['urban',3],['rural',5]];
 const ballots=[],elected=[];
 for(let seat=0;seat<o.seats;seat++){
  const standing=entries.filter(x=>!elected.includes(x.id));if(!standing.length)break;
  const tally=new Map(standing.map(x=>[x.id,0]));
  for(const [group,count] of groups)for(let unit=0;unit<count;unit++){
   const ranked=standing.map(x=>{const p=person(s,x.id),classRank={equites:1.1,first:1,second:.72,third:.5,fourth:.3,fifth:.15,unarmed:0}[group],elite=classRank===undefined?0:(p.wealth||0)*classRank*.18,publicWeight=classRank===undefined?1:1-classRank*.45,bias=elite+(p.influence||0)*publicWeight*.09+(p.loyalty||50)*(1-classRank*.25)*.06;return {id:x.id,value:x.score+bias+roll(s)*25}}).sort((a,b)=>b.value-a.value||a.id.localeCompare(b.id));
   const chosen=ranked[0].id;tally.set(chosen,tally.get(chosen)+1);ballots.push({seat:seat+1,group,unit:unit+1,candidateId:chosen});
  }
  const winner=[...tally].sort((a,b)=>b[1]-a[1]||(entries.find(x=>x.id===b[0])?.score||0)-(entries.find(x=>x.id===a[0])?.score||0)||a[0].localeCompare(b[0]))[0][0];
  elected.push(winner);for(const x of entries)x.votes+=tally.get(x.id)||0;
 }
 entries.sort((a,b)=>b.votes-a.votes||b.score-a.score||a.id.localeCompare(b.id));
 const result={year:s.year,month:s.month,office,body:o.body,controller,candidates:entries,ballots,elected,termYear:officeYear(s),status:elected.length===o.seats?'complete':'incomplete'};
 c.elections.push(result);c.elections=c.elections.slice(-240);
 for(const id of elected){c.pendingTerms.push({id,office,year:officeYear(s),faction:controller});changeObedience(s,id,3,'election victory')}
 for(const x of candidates){x.status=elected.includes(x.id)?'elected':'lost';for(const promise of x.promises||[])if(promise.status==='offered')promise.status=elected.includes(x.id)?'pending':'void';if(!elected.includes(x.id)){x.senatorialSupport=clamp((x.senatorialSupport||50)-3);changeObedience(s,x.id,-2,'election defeat')}}
 if(elected.length)note(s,'The '+ASSEMBLIES[o.body][0]+' elected '+elected.map(id=>name(id)).join(' and ')+' as '+o.name[0]+' for the next term.','由'+ASSEMBLIES[o.body][1]+'选出'+elected.map(id=>name(id,1)).join('与')+'担任下届'+o.name[1]+'。');
 return {ok:true,result};
}
function startTerms(s){
 const c=initializeCursus(s);
 for(const office of Object.keys(MAGISTRACIES)){const current=c.magistrates[office]||[];for(const term of current.filter(x=>x.endYear<s.year||!present(s,x.id)||c.retired[x.id]))c.termHistory.push({...term,office,ended:{year:s.year,month:s.month},reason:!present(s,term.id)?'incapacitated':c.retired[term.id]?'retired':'term completed'});c.magistrates[office]=current.filter(x=>x.endYear>=s.year&&present(s,x.id)&&!c.retired[x.id]);}
 c.termHistory=c.termHistory.slice(-240);
 for(const id of Object.keys(c.careers))if(!c.retired[id]&&present(s,id)&&age(s,id)>=68&&roll(s)<.16){c.retired[id]={year:s.year,month:s.month,reason:'age'};c.retirements.push({id,year:s.year,month:s.month,reason:'age'});if(person(s,id)?.faction===s.player)note(s,name(id)+' retired from political applications.',name(id,1)+'退出官员申请。')}
 for(const term of c.pendingTerms.filter(x=>x.year===s.year&&present(s,x.id))){
  c.magistrates[term.office].push({id:term.id,startYear:s.year,endYear:s.year,faction:term.faction});
  c.careers[term.id]||=[];c.careers[term.id].push({office:term.office,year:s.year,source:'election',simulated:true});
  if(['consul','praetor'].includes(term.office)&&!c.curiateFormalities.some(x=>x.id===term.id&&x.office===term.office&&x.year===s.year))c.curiateFormalities.push({id:term.id,office:term.office,faction:term.faction,year:s.year,status:'pending'});
 }
 c.pendingTerms=c.pendingTerms.filter(x=>x.year>s.year);
}
function advanceCuriateFormalities(s,c){
 if(s.month!==2)return;
 const controller=factionOfRome(s);
 for(const record of c.curiateFormalities.filter(x=>x.year===s.year&&x.status==='pending')){
  record.status=controller!==record.faction?'unavailable':c.assemblies.curiate>=40?'confirmed':'contested';
  record.resolved={year:s.year,month:s.month};
  if(record.status==='contested'){c.senate[record.faction]=clamp((c.senate[record.faction]||50)-2);if(record.faction===s.player)note(s,'The Curiate Assembly contested a formal grant of imperium; the election itself stands.','库里亚大会对正式授予统帅权提出争议；选举结果本身仍有效。')}
 }
 c.curiateFormalities=c.curiateFormalities.slice(-120);
}
export function investigateGovernment(s,target,actor=s.player){
 const c=initializeCursus(s),f=s.factions[actor];
 if(actor===target||!f||!s.factions[target]||target==='rebels')return {ok:false,reason:'target'};
 const intel=c.intel[actor]||={};c.intel[actor]=intel;
 if(intel[target]?.pending)return {ok:false,reason:'pending'};
 const stage=Math.min(5,(intel[target]?.stage||0)+1),cost=5+stage*3;
 if(f.treasury<cost)return {ok:false,reason:'treasury',cost};
 f.treasury-=cost;intel[target]||={stage:0,reports:[]};intel[target].pending={remaining:2+stage,cost,stage};
 return {ok:true,cost,months:2+stage,stage};
}
export function governmentReport(s,target,actor=s.player){return initializeCursus(s).intel[actor]?.[target]||null}
export function knownForeignOfficial(s,target,id,actor=s.player){
 const r=governmentReport(s,target,actor);
 return !!(r?.reports?.some(x=>x.people?.includes(id))||s.knowledge?.[actor]?.[target]?.reportedLeaders?.includes(id)||initializeCursus(s).referralSources[actor]?.some(x=>x.id===id&&x.target===target));
}
export function officialKnowledge(s,target,id,actor=s.player){
 const c=initializeCursus(s),report=c.intel[actor]?.[target],named=(report?.reports||[]).filter(x=>x.people?.includes(id)),latest=named.at(-1),contact=c.contacts.findLast(x=>x.actor===actor&&x.id===id&&x.status==='open');
 if(!latest&&!contact&&!c.referralSources[actor]?.some(x=>x.id===id&&x.target===target)&&!s.knowledge?.[actor]?.[target]?.reportedLeaders?.includes(id))return {level:'unknown',observed:null,confidence:null};
 const trust=contact?.relationship?.trust??contact?.trust??0,familiarity=contact?.relationship?.familiarity??0,bestStage=Math.max(0,...named.map(x=>x.stage||0));
 const level=trust>=60&&familiarity>=60?'trusted_contact':bestStage>=5?'well_known':contact?'connected':bestStage>=4?'profiled':'identified';
 return {level,observed:latest?.observed||contact?.resolved||null,confidence:latest?.confidence||'unverified',trust:contact?trust:null};
}
export function contactOfficial(s,target,id,route='formal',actor=s.player){
 const c=initializeCursus(s),routes={formal:{cost:10,months:3,chance:.72},merchant:{cost:7,months:5,chance:.52},introduction:{cost:5,months:2,chance:.78},embassy:{cost:12,months:2,chance:.70},scholarly:{cost:6,months:4,chance:.68},professional:{cost:8,months:3,chance:.64},intelligence:{cost:9,months:3,chance:.60},banquet:{cost:11,months:3,chance:.68},senatorial:{cost:8,months:2,chance:.72},provincial_visit:{cost:9,months:4,chance:.63},military_visit:{cost:10,months:3,chance:.60},family:{cost:6,months:3,chance:.70},ceremony:{cost:6,months:4,chance:.58}},spec=routes[route],p=person(s,id),report=c.intel[actor]?.[target];
 if(!spec||actor===target||!p||!knownForeignOfficial(s,target,id,actor))return {ok:false,reason:'unknown'};
 // A dated foreign report may be stale; a failed approach resolves after time and cost.
 if(route==='introduction'&&!Object.entries(c.networks).some(([source,ids])=>person(s,source)?.faction===actor&&present(s,source)&&ids.includes(id)))return {ok:false,reason:'introduction'};
 if(route==='family'&&!Object.entries(c.networks).some(([source,ids])=>person(s,source)?.faction===actor&&present(s,source)&&ids.includes(id)))return {ok:false,reason:'introduction'};
 if(route==='senatorial'&&(!ROMAN.has(target)||!c.senators.some(x=>x.id===id)))return {ok:false,reason:'profession'};
 if(['banquet','ceremony','provincial_visit','military_visit'].includes(route)&&(report?.stage||0)<3)return {ok:false,reason:'intelligence'};
 if(route==='provincial_visit'&&!report?.reports?.some(r=>Object.values(r.officeholders||{}).includes(id)))return {ok:false,reason:'profession'};
 if(route==='military_visit'&&!report?.reports?.some(r=>r.commanders?.includes(id)))return {ok:false,reason:'profession'};
 if(route==='embassy'&&(report?.stage||0)<2)return {ok:false,reason:'intelligence'};
 if(['scholarly','professional'].includes(route)&&!report?.reports?.some(r=>r.officeholders?.scholar===id))return {ok:false,reason:'intelligence'};
 if(['scholarly','professional','intelligence'].includes(route)&&(report?.stage||0)<4)return {ok:false,reason:'intelligence'};
 if(route==='professional'&&!Object.values(s.world.offices?.[actor]||{}).some(holder=>person(s,holder)?.education>=70&&present(s,holder)))return {ok:false,reason:'representative'};
 if(c.contacts.some(x=>x.actor===actor&&x.id===id&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<spec.cost)return {ok:false,reason:'treasury',cost:spec.cost};
 s.factions[actor].treasury-=spec.cost;c.contacts.push({actor,target,id,route,chance:spec.chance,cost:spec.cost,remaining:spec.months,status:'pending',sent:{year:s.year,month:s.month}});
 return {ok:true,cost:spec.cost,months:spec.months};
}
export function cultivateOfficial(s,target,id,actor=s.player,approach='professional'){
 const c=initializeCursus(s),p=person(s,id),contact=c.contacts.findLast(x=>x.actor===actor&&x.id===id&&x.status==='open');
 if(!contact||!p||p.faction!==target||!present(s,id))return {ok:false,reason:'contact'};
 if(contact.lastCultivated===date(s))return {ok:false,reason:'cooldown'};
 if(!['professional','personal','political','favour'].includes(approach))return {ok:false,reason:'approach'};
 if((contact.trust||0)>=80)return {ok:false,reason:'trust'};
 const cost=approach==='favour'?9:6;if(s.factions[actor].treasury<cost)return {ok:false,reason:'treasury',cost};
 s.factions[actor].treasury-=cost;contact.lastCultivated=date(s);
 const watch=s.world.securityWatches?.[target],watched=watch&&date(s)>=watch.start&&date(s)<=watch.end;
 if(watched&&roll(s)<.18){contact.status='compromised';contact.trust=0;if(contact.relationship)contact.relationship.trust=0;contact.history||=[];contact.history.push({year:s.year,month:s.month,outcome:'compromised'});return {ok:true,cost,outcome:'compromised'}}
 const relation=contact.relationship||={familiarity:contact.trust||20,trust:contact.trust||20,respect:30,professional:20,alignment:30,obligation:0,rivalry:0,willingness:25};
 const gain=4+Math.floor(roll(s)*7);
 relation.familiarity=clamp(relation.familiarity+gain);
 relation.trust=Math.min(80,clamp(relation.trust+(approach==='personal'?gain:Math.max(2,Math.floor(gain/2)))));
 if(approach==='professional'){relation.professional=clamp(relation.professional+gain);relation.respect=clamp(relation.respect+Math.max(2,Math.floor(gain/2)))}
 if(approach==='political'){relation.alignment=clamp(relation.alignment+gain);relation.rivalry=clamp(relation.rivalry+(p.loyalty>75?2:0))}
 if(approach==='favour'){relation.obligation=clamp(relation.obligation+gain);relation.willingness=clamp(relation.willingness+Math.floor(gain/2))}
 contact.trust=relation.trust;
 contact.history||=[];contact.history.push({year:s.year,month:s.month,outcome:'cultivated',approach,gain,trust:contact.trust});
 return {ok:true,cost,outcome:'cultivated',gain,trust:contact.trust,approach};
}
export function retainOfficial(s,id,actor=s.player){
 const c=initializeCursus(s),p=person(s,id);
 if(!p||p.faction!==actor||!present(s,id)||s.world.leadership[actor]?.includes(id))return {ok:false,reason:'eligibility'};
 if(c.institutionalResponses.some(x=>x.kind==='retention'&&x.faction===actor&&x.id===id&&x.year===s.year))return {ok:false,reason:'annual_limit'};
 const cost=6;if(s.factions[actor].treasury<cost)return {ok:false,reason:'treasury',cost};
 s.factions[actor].treasury-=cost;p.loyalty=clamp((p.loyalty||50)+4);changeObedience(s,id,2,'working conditions');
 c.institutionalResponses.push({kind:'retention',faction:actor,id,strength:12,until:date(s)+12,year:s.year,month:s.month,cost});
 return {ok:true,cost,months:12};
}
export function searchTalent(s,regionId,field='provincial',actor=s.player){
 const c=initializeCursus(s),r=s.regions.find(x=>x.id===regionId&&x.owner===actor),options={provincial:{cost:10,months:3},scholarly:{cost:12,months:4},merchant:{cost:8,months:3},military:{cost:11,months:3}},spec=options[field];
 if(!r||!spec||!s.factions[actor])return {ok:false,reason:'region'};
 if(c.talentSearches.filter(x=>x.actor===actor&&x.year===s.year).length>=2||c.talentSearches.some(x=>x.actor===actor&&x.regionId===regionId&&x.year===s.year))return {ok:false,reason:'annual_limit'};
 if(s.factions[actor].treasury<spec.cost)return {ok:false,reason:'treasury',cost:spec.cost};
 s.factions[actor].treasury-=spec.cost;
 const item={actor,regionId,field,cost:spec.cost,remaining:spec.months,year:s.year,month:s.month,status:'pending'};
 c.talentSearches.push(item);return {ok:true,cost:spec.cost,months:spec.months};
}
export function appointmentApplicationStatus(s,id,actor=s.player){
 const c=initializeCursus(s),decision=c.applicationDecisions[actor+':'+id];
 if(decision?.status==='rejected'&&decision.year===s.year)return {ok:false,reason:'rejected',untilYear:s.year+1};
 if(decision?.status==='postponed'&&date(s)<decision.until)return {ok:false,reason:'postponed',until:decision.until};
 return {ok:true};
}
export function reviewApplicant(s,id,action,actor=s.player){
 const c=initializeCursus(s),p=person(s,id),talent=c.talents.find(x=>x.actor===actor&&x.id===id);
 if(!talent||!p||p.faction!==actor||!present(s,id)||!['interview','references','investigate','reject','postpone'].includes(action))return {ok:false,reason:'candidate'};
 if(c.applicationReviews.some(x=>x.actor===actor&&x.id===id&&x.year===s.year&&x.month===s.month))return {ok:false,reason:'cooldown'};
 const decision=appointmentApplicationStatus(s,id,actor);
 if(!decision.ok&&action!=='interview'&&action!=='references'&&action!=='investigate')return {ok:false,reason:decision.reason};
 const options={interview:{cost:3,months:1},references:{cost:4,months:2},investigate:{cost:8,months:3},reject:{cost:0,months:0},postpone:{cost:0,months:3}},spec=options[action];
 if(s.factions[actor].treasury<spec.cost)return {ok:false,reason:'treasury',cost:spec.cost};
 s.factions[actor].treasury-=spec.cost;
 const record={actor,id,action,cost:spec.cost,remaining:spec.months,status:spec.months?'pending':'complete',year:s.year,month:s.month};
 c.applicationReviews.push(record);
 if(action==='reject'){c.applicationDecisions[actor+':'+id]={status:'rejected',year:s.year,month:s.month};changeObedience(s,id,-3,'application rejected');record.outcome='rejected'}
 if(action==='postpone'){c.applicationDecisions[actor+':'+id]={status:'postponed',year:s.year,month:s.month,until:date(s)+3};changeObedience(s,id,-1,'application postponed');record.outcome='postponed'}
 return {ok:true,cost:spec.cost,months:spec.months,outcome:record.outcome||'pending'};
}
function advanceApplicantReviews(s,c){
 for(const x of c.applicationReviews.filter(x=>x.status==='pending')){
  if(--x.remaining>0)continue;
  const p=person(s,x.id);if(!p?.alive||p.faction!==x.actor){x.status='lapsed';continue}
  const q=roll(s),estimated=Math.max(0,Math.min(100,(p.education||50)+Math.round((q-.5)*20)));
  x.report={observed:{year:s.year,month:s.month},source:x.action,confidence:x.action==='investigate'?'moderate':'estimate',qualification:estimated>=80?'strong':estimated>=60?'credible':'uncertain',references:x.action==='references'?(c.networks[x.id]||[]).filter(id=>person(s,id)?.faction===x.actor).slice(0,3):[],concern:x.action==='investigate'?(q<Math.max(.15,Math.min(.7,(60-(p.integrity||50))/100))?'possible':'unsubstantiated'):null};
  x.status='complete';x.resolved={year:s.year,month:s.month};
 }
 c.applicationReviews=c.applicationReviews.slice(-240);
}
export function requestRecommendation(s,sourceId,actor=s.player){
 const c=initializeCursus(s),source=person(s,sourceId);
 if(!source||source.faction!==actor||!present(s,sourceId))return {ok:false,reason:'source'};
 const candidates=(c.networks[sourceId]||[]).filter(id=>person(s,id)?.alive&&person(s,id).faction!==actor&&!c.referrals[actor]?.includes(id));
 if(!candidates.length)return {ok:false,reason:'network'};
 if(c.recommendations.some(x=>x.actor===actor&&x.sourceId===sourceId&&x.status==='pending'))return {ok:false,reason:'pending'};
 const cost=4;if(s.factions[actor].treasury<cost)return {ok:false,reason:'treasury',cost};
 s.factions[actor].treasury-=cost;c.recommendations.push({actor,sourceId,targetId:candidates[0],remaining:1,status:'pending',cost,year:s.year,month:s.month});
 return {ok:true,cost,months:1};
}
function advanceTalentSearches(s,c){
 for(const q of c.talentSearches.filter(x=>x.status==='pending')){
  if(--q.remaining>0)continue;
  const r=s.regions.find(x=>x.id===q.regionId),cooperating=c.cooperations.some(x=>x.actor===q.actor&&x.kind==='professional'&&x.status==='active'),chance=Math.min(.9,.55+(r?.loyalty||50)/300+(cooperating ? .08 : 0));
  if(r?.owner!==q.actor||roll(s)>=chance){q.status='no_candidate';q.resolved={year:s.year,month:s.month};continue}
  const n=c.talents.length+1,first=['Aulus','Gaius','Marcus','Titus','Publius','Lucius'][n%6],family=['Varenus','Marcellinus','Cassianus','Valerius','Fabius','Sennius'][Math.floor(n/6)%6];
  const eastern=['Aram','Nikanor','Mithradates','Dionysios','Vahan','Leucon'][n%6];
  const roman=ROMAN.has(q.actor),namePair=roman?[first+' '+family+' of '+(r.city||r.name[0]),['奥卢斯','盖乌斯','马尔库斯','提图斯','普布利乌斯','卢基乌斯'][n%6]+'·'+['瓦雷努斯','马尔凯利努斯','卡西亚努斯','瓦莱里乌斯','法比乌斯','森尼乌斯'][Math.floor(n/6)%6]+'（'+r.name[1]+'）']:[eastern+' of '+(r.city||r.name[0]),['阿拉姆','尼卡诺尔','米特拉达梯','狄奥尼西奥斯','瓦罕','列乌孔'][n%6]+'（'+r.name[1]+'）'];
  const id=createFictionalPerson(s,{name:namePair,faction:q.actor,birthYear:s.year-27-n%20,location:r.id,sex:n%5===0?'female':'male',role:['Simulated '+q.field+' talent','模拟'+({provincial:'地方',scholarly:'学术',merchant:'商贸',military:'军务'}[q.field])+'人才']});
  const p=person(s,id);p.education=58+Math.floor(roll(s)*31);p.influence=35+Math.floor(roll(s)*35);p.loyalty=45+Math.floor(roll(s)*35);p.ambition=30+Math.floor(roll(s)*55);
  c.talents.push({id,actor:q.actor,regionId:r.id,field:q.field,found:{year:s.year,month:s.month},source:'talent search'});
  q.status='found';q.id=id;q.resolved={year:s.year,month:s.month};
  if(q.actor===s.player)note(s,'A dated regional search found '+namePair[0]+' in '+r.name[0]+'.','注明日期的地方调查在'+r.name[1]+'发现'+namePair[1]+'。');
 }
 for(const q of c.recommendations.filter(x=>x.status==='pending')){
  if(--q.remaining>0)continue;
  if(!present(s,q.sourceId)||!person(s,q.targetId)?.alive){q.status='lapsed';continue}
  c.referrals[q.actor]||=[];if(!c.referrals[q.actor].includes(q.targetId))c.referrals[q.actor].push(q.targetId);c.referralSources[q.actor]||=[];if(!c.referralSources[q.actor].some(x=>x.id===q.targetId))c.referralSources[q.actor].push({id:q.targetId,target:person(s,q.targetId).faction,from:q.sourceId,observed:{year:s.year,month:s.month},confidence:'reported'});
  q.status='delivered';q.resolved={year:s.year,month:s.month};
  if(q.actor===s.player)note(s,'An official introduced a named professional contact; no employment was promised.','一位官员引荐了具名的专业联系人；任职尚未获保证。');
 }
}
export function proposeCooperation(s,target,id,kind='professional',actor=s.player){
 const c=initializeCursus(s),p=person(s,id),contact=c.contacts.findLast(x=>x.actor===actor&&x.id===id&&x.status==='open');
 const options={professional:{cost:7,months:2},diplomatic:{cost:8,months:3},information:{cost:9,months:3},political:{cost:8,months:3}},spec=options[kind];
 if(!spec||!contact||!p||p.faction!==target||!present(s,id))return {ok:false,reason:'contact'};
 if(c.cooperations.some(x=>x.actor===actor&&x.id===id&&x.kind===kind&&['pending','active'].includes(x.status)))return {ok:false,reason:'pending'};
 if(kind==='political'&&!ROMAN.has(actor))return {ok:false,reason:'authority'};
 if(s.factions[actor].treasury<spec.cost)return {ok:false,reason:'treasury',cost:spec.cost};
 s.factions[actor].treasury-=spec.cost;c.cooperations.push({actor,target,id,kind,cost:spec.cost,remaining:spec.months,status:'pending',year:s.year,month:s.month});
 return {ok:true,cost:spec.cost,months:spec.months};
}
function advanceCooperations(s,c){
 for(const x of c.cooperations.filter(x=>x.status==='active'))if(date(s)>=x.endsAt)x.status='ended';
 for(const x of c.cooperations.filter(x=>x.status==='pending')){
  if(--x.remaining>0)continue;
  const p=person(s,x.id),contact=c.contacts.findLast(y=>y.actor===x.actor&&y.id===x.id&&y.status==='open');
  if(!p?.alive||p.faction!==x.target||!contact){x.status='lapsed';continue}
  const r=contact.relationship||{},basis=x.kind==='professional'?r.professional:x.kind==='political'?r.alignment:x.kind==='information'?r.trust:r.respect;
  const chance=Math.max(.12,Math.min(.82,.32+(basis||30)/180-(p.loyalty||50)/500));
  x.status=roll(s)<chance?'active':'refused';x.resolved={year:s.year,month:s.month};
  if(x.status==='active'){
   x.endsAt=date(s)+6;
   const key=[x.actor,x.target].sort().join(':');
   if(x.kind==='diplomatic')s.relations[key]=Math.min(100,(s.relations[key]||0)+3);
   if(x.kind==='political')c.senate[x.actor]=clamp((c.senate[x.actor]||50)+2);
   if(x.kind==='information'){
    c.intel[x.actor]||={};c.intel[x.actor][x.target]||={stage:0,reports:[]};
    c.intel[x.actor][x.target].reports.push({stage:0,source:'public professional exchange',observed:{year:s.year,month:s.month},delivered:{year:s.year,month:s.month},confidence:'public',people:[x.id],offices:[],links:[],possibleContradictions:[]});
   }
  }
  if(x.actor===s.player)note(s,x.status==='active'?'A named official agreed to limited cooperation without changing allegiance.':'A named official declined a cooperation proposal.',x.status==='active'?'一位具名官员同意有限合作，政治归属未变。':'一位具名官员拒绝合作提议。');
 }
 c.cooperations=c.cooperations.filter(x=>x.status==='pending'||x.status==='active'||date(s)-(x.resolved?.year*12+x.resolved?.month||date(s))<60);
}
export function offerEmployment(s,target,id,actor=s.player,mode='administrative'){
 const c=initializeCursus(s),p=person(s,id),contact=c.contacts.find(x=>x.actor===actor&&x.id===id&&x.status==='open');
 if(!contact||!p||p.faction===actor||!['administrative','military'].includes(mode)||!s.factions[actor]||!s.factions[target])return {ok:false,reason:'eligibility'};
 if(mode==='military'&&!c.intel[actor]?.[target]?.reports?.some(r=>r.commanders?.includes(id)))return {ok:false,reason:'intelligence'};
 if(c.offers.some(x=>x.id===id&&x.actor===actor&&['pending','accepted'].includes(x.status)))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<18)return {ok:false,reason:'treasury',cost:18};
 s.factions[actor].treasury-=18;c.offers.push({actor,target,id,mode,remaining:3,status:'pending',cost:18,year:s.year,month:s.month});
 return {ok:true,cost:18,months:3};
}
function reconcileForeignPosts(s,c){
 for(const [faction,posts] of Object.entries(c.foreignPosts))for(const [role,id] of Object.entries(posts)){
  const incumbent=person(s,id);if(!incumbent?.alive||incumbent.faction!==faction||incumbent.health==='deceased')delete posts[role];
 }
}
function advanceIntel(s,c){
 for(const [actor,targets] of Object.entries(c.intel))for(const [target,report] of Object.entries(targets)){
  if(!report.pending||--report.pending.remaining>0)continue;
  const stage=report.pending.stage;report.stage=stage;delete report.pending;
  const posts=ROMAN.has(target)?(s.world.offices?.[target]||{}):(c.foreignPosts[target]||{});
  const knownPosts=stage>=4?Object.entries(posts):stage>=3?Object.entries(posts).filter(([role])=>['administration','finance','supply'].includes(role)):[];
  const officeholders=Object.fromEntries(knownPosts.filter(([,id])=>person(s,id)?.faction===target));
  const commanders=stage>=3?s.armies.filter(a=>a.owner===target&&a.characterId&&person(s,a.characterId)?.faction===target).slice(0,2).map(a=>a.characterId):[];
  const senators=stage>=3&&ROMAN.has(target)?c.senators.filter(x=>person(s,x.id)?.faction===target&&present(s,x.id)).slice(0,stage>=4?6:2).map(x=>x.id):[];
  const people=stage>=3?[...new Set([...(s.world.leadership[target]||[]),...Object.values(officeholders),...commanders,...senators])]:stage>=1?(s.world.leadership[target]||[]):[];
  const offices=stage>=2?(ROMAN.has(target)?['administration','finance','supply','senate']:Object.keys(posts)) : [];
  const links=stage>=4?people.flatMap(id=>(c.networks[id]||[]).filter(other=>people.includes(other)).map(other=>({from:id,to:other,confidence:'low'}))):[];
  report.reports.push({stage,source:'investigation',observed:{year:s.year,month:s.month},delivered:{year:s.year,month:s.month},confidence:stage>=4?'unverified':stage>=3?'estimate':'public',people,offices,officeholders,commanders,senators,links,possibleContradictions:[],access:stage>=5?['formal','merchant','introduction']:[]});
  if(actor===s.player)note(s,'A dated foreign government report has arrived; offices and people may change.','一份注明日期的外国官制报告已经送达；职务与人物可能变化。');
 }
}
function advanceContacts(s,c){
 for(const x of c.contacts.filter(x=>x.status==='pending')){
  if(--x.remaining>0)continue;
  const p=person(s,x.id),chance=x.chance??{formal:.72,merchant:.52,introduction:.78,embassy:.70,scholarly:.68,professional:.64,intelligence:.60}[x.route]??.5,watch=s.world.securityWatches?.[x.target],watched=watch&&date(s)>=watch.start&&date(s)<=watch.end;
  x.status=p?.alive&&p.faction===x.target&&roll(s)<chance*(watched?(x.route==='intelligence'?.4:.75):1)*(['scholarly','professional'].includes(x.route)&&c.foreignPosts[x.target]?.scholar!==x.id ? .5 : 1)?'open':'refused';if(x.status==='open'){x.trust=Math.min(55,Math.round(15+(p.education||50)/10+roll(s)*20));x.relationship={familiarity:clamp(x.trust+10),trust:x.trust,respect:clamp(30+(p.education||50)/5),professional:20,alignment:30,obligation:0,rivalry:0,willingness:25}}if(watched&&roll(s)<(x.route==='intelligence'?.3:.12)){x.status='compromised';if(x.target===s.player)note(s,'A watched foreign approach to an official was detected; the source remains uncertain.','反间谍警戒发现有人接近官员；来者身份仍不确定。')}
  x.resolved={year:s.year,month:s.month};
  if(x.actor===s.player)note(s,x.status==='open'?'A named official accepted contact; no allegiance has changed.':'A contact request received no usable reply.',x.status==='open'?'一名具名官员同意接触；其政治归属尚未改变。':'接触请求未获有效答复。');
 }
 const ready=new Map();
 for(const x of c.offers.filter(x=>x.status==='pending')){
  if(--x.remaining>0)continue;
  if(!ready.has(x.id))ready.set(x.id,[]);ready.get(x.id).push(x);
 }
 for(const [id,offers] of ready){
  const p=person(s,id),eligible=offers.filter(x=>p?.alive&&p.faction===x.target&&present(s,id)&&!s.world.leadership[x.target]?.includes(id));
  for(const x of offers.filter(x=>!eligible.includes(x))){x.status='lapsed';x.resolved={year:s.year,month:s.month}}
  const interested=[];
  for(const x of eligible){
   const contact=c.contacts.findLast(y=>y.actor===x.actor&&y.id===id&&y.status==='open'),r=contact?.relationship||{};
   if(!contact){x.status='lapsed';continue}
   const retain=c.institutionalResponses.findLast(y=>y.kind==='retention'&&y.faction===x.target&&y.id===id&&y.until>=date(s));
   const chance=Math.max(.05,Math.min(.72,.25+(p.ambition||40)/300-(p.loyalty||60)/250+(p.education||50)/500+(r.willingness||25)/350+(r.trust||contact.trust||0)/500-(retain?.strength||0)/200));
   if(roll(s)<chance)interested.push({x,score:chance+(s.factions[x.actor]?.stability||50)/1000+roll(s)*.15});
   else{x.status='refused';x.resolved={year:s.year,month:s.month}}
  }
  if(!interested.length)continue;
  interested.sort((a,b)=>b.score-a.score||a.x.actor.localeCompare(b.x.actor));
  const winner=interested[0].x,formerFaction=p.faction,formerColleagues=[...(c.networks[id]||[])],formerPosts=[];
  for(const other of interested.slice(1)){other.x.status='outbid';other.x.resolved={year:s.year,month:s.month}}
  for(const [role,holder] of Object.entries(c.foreignPosts[formerFaction]||{}))if(holder===id){delete c.foreignPosts[formerFaction][role];formerPosts.push(role)}
  if(ROMAN.has(formerFaction))for(const [office,holder] of Object.entries(s.world.offices?.[formerFaction]||{}))if(holder===id){delete s.world.offices[formerFaction][office];formerPosts.push(office)}
  for(const army of s.armies.filter(a=>a.owner===formerFaction&&a.characterId===id)){army.characterId=null;army.commander=['Unassigned command','指挥官空缺']}
  p.faction=winner.actor;p.location=s.regions.find(r=>r.owner===winner.actor)?.id||null;p.loyalty=clamp((p.loyalty||50)*.7);changeObedience(s,id,-10,'foreign employment');
  winner.status='accepted';winner.resolved={year:s.year,month:s.month};
  c.careers[id]||=[];c.careers[id].push({office:winner.mode==='military'?'military_defector':'foreign_adviser',year:s.year,from:formerFaction,to:winner.actor,simulated:true});
  if(winner.mode!=='military'&&!c.advisers.some(a=>a.id===id))c.advisers.push({id,actor:winner.actor,formerFaction,year:s.year,month:s.month});
  const relationKey=[winner.actor,formerFaction].sort().join(':');s.relations[relationKey]=Math.max(-100,(s.relations[relationKey]||0)-6);
  c.institutionalResponses.push({kind:'defection',faction:formerFaction,id,to:winner.actor,formerPosts,year:s.year,month:s.month});
  c.networks[id]=formerColleagues.filter(other=>person(s,other)?.alive);c.referrals[winner.actor]||=[];for(const other of c.networks[id]){if(!c.referrals[winner.actor].includes(other))c.referrals[winner.actor].push(other);c.referralSources[winner.actor]||=[];if(!c.referralSources[winner.actor].some(x=>x.id===other))c.referralSources[winner.actor].push({id:other,target:person(s,other).faction,from:id,observed:{year:s.year,month:s.month},confidence:'reported'})}
  if(formerFaction===s.player)note(s,'A named official accepted foreign employment; government posts may be vacant and relations worsened.','一位具名官员接受外国任职；政府职位可能空缺，外交关系恶化。');
  if(winner.actor===s.player)note(s,name(id)+' accepted a negotiated offer; no troops or territory changed hands.',name(id,1)+'接受谈判任职；军队和领土均未转移。');
 }
 for(const x of c.offers.filter(x=>['refused','outbid'].includes(x.status)&&x.resolved?.year===s.year&&x.resolved?.month===s.month&&x.actor===s.player))note(s,x.status==='outbid'?'The official preferred another proposal; its source remains uncertain.':'The official declined the employment proposal.',x.status==='outbid'?'该官员选择了另一项提议；来源仍不确定。':'该官员拒绝任职提议。');

}
export function proposeMeasure(s,kind,actor=s.player){
 const c=initializeCursus(s),options={public_works:{cost:8,body:'tribal'},grain_relief:{cost:10,body:'plebeian'}},option=options[kind];
 if(!option||factionOfRome(s)!==actor)return {ok:false,reason:'rome'};
 if(!c.magistrates.consul.some(x=>x.faction===actor&&present(s,x.id))&&!c.magistrates.tribune.some(x=>x.faction===actor&&present(s,x.id)))return {ok:false,reason:'authority'};
 if(c.proposals.some(x=>x.actor===actor&&x.kind===kind&&['consulting','voting','implementing'].includes(x.status)))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<option.cost)return {ok:false,reason:'treasury',cost:option.cost};
 s.factions[actor].treasury-=option.cost;c.proposals.push({actor,kind,body:option.body,cost:option.cost,status:'consulting',remaining:1,year:s.year,month:s.month});
 return {ok:true,cost:option.cost};
}
function advanceMeasures(s,c){
 for(const p of c.proposals.filter(x=>['consulting','voting','implementing'].includes(x.status))){
  if(--p.remaining>0)continue;
  if(p.status==='consulting'){
   p.senateRoll=senateAssessment(s,p.actor,p.kind);for(const application of c.applicants)if(application.faction===p.actor&&application.status==='elected')for(const promise of application.promises||[])if(['pending','delayed'].includes(promise.status)&&promise.requiredAction==='consultation'){promise.status='fulfilled';promise.fulfilled={year:s.year,month:s.month};changeObedience(s,application.id,2,'honored consultation')}if(p.senateRoll.support<40||p.senateRoll.for<=p.senateRoll.against){p.status='opposed';if(p.actor===s.player)note(s,'The Senate opposed a proposed measure; no assembly vote followed.','元老院反对一项提案；公民大会未进行表决。');continue}
   p.status='voting';p.remaining=1;continue;
  }
  if(p.status==='voting'){
   const tribuneVeto=c.magistrates.tribune.some(x=>present(s,x.id)&&x.faction!==p.actor&&obedience(s,x.id)<25);
   const support=c.assemblies[p.body]||0;
   if(tribuneVeto||support<45){p.status=tribuneVeto?'vetoed':'rejected';if(p.actor===s.player)note(s,tribuneVeto?'A tribune blocked the proposal within the assembly procedure.':'The assembly rejected the proposal.',tribuneVeto?'一名保民官在相应程序中阻止提案。':'公民大会否决了提案。');continue}
   p.status='implementing';p.remaining=institutionalBalance(s,p.actor).magistrate<40?2:1;continue;
  }
  if(p.kind==='public_works'){for(const r of s.regions.filter(r=>r.owner===p.actor))r.loyalty=clamp(r.loyalty+2);s.factions[p.actor].stability=clamp(s.factions[p.actor].stability+2)}
  if(p.kind==='grain_relief'){s.factions[p.actor].food+=8;s.factions[p.actor].stability=clamp(s.factions[p.actor].stability+1)}
  p.status='implemented';p.completed={year:s.year,month:s.month};for(const application of c.applicants)if(application.faction===p.actor&&application.status==='elected')for(const promise of application.promises||[])if(promise.status==='pending'&&promise.requiredAction===p.kind){promise.status='fulfilled';promise.fulfilled={year:s.year,month:s.month};changeObedience(s,application.id,3,'fulfilled public promise')}if(p.actor===s.player)note(s,'A measure passed the Senate consultation and assembly vote, then entered administration.','一项提案经过元老院咨询与公民大会表决，现已落实。');
 }
}
function advancePromises(s,c){
 for(const application of c.applicants)for(const promise of application.promises||[]){
  if(!['pending','delayed'].includes(promise.status)||s.year<=promise.deadlineYear)continue;
  const proposals=c.proposals.filter(x=>x.actor===application.faction&&x.kind===promise.requiredAction&&x.year>=promise.year);
  const blocked=proposals.findLast(x=>['opposed','rejected','vetoed'].includes(x.status));
  const progressing=proposals.some(x=>['consulting','voting','implementing'].includes(x.status));
  if(!person(s,application.id)?.alive)promise.status='impossible';
  else if(blocked)promise.status='blocked';
  else if(progressing&&!promise.delayCount){promise.status='delayed';promise.delayCount=1;promise.deadlineYear++;promise.resolved={year:s.year,month:s.month,reason:'institutional procedure'};continue}
  else promise.status='abandoned';
  promise.resolved={year:s.year,month:s.month,reason:promise.status};
  if(promise.status==='abandoned'){application.senatorialSupport=clamp((application.senatorialSupport||50)-4);changeObedience(s,application.id,-8,'unmet public promise');c.senate[application.faction]=clamp((c.senate[application.faction]||50)-4)}
  else if(promise.status==='blocked'){application.senatorialSupport=clamp((application.senatorialSupport||50)-1);changeObedience(s,application.id,-2,'blocked public promise')}
  if(promise.by===s.player)note(s,promise.status==='blocked'?'A campaign commitment was blocked by an institution.':promise.status==='impossible'?'A campaign commitment became impossible after the candidate died.':'A campaign commitment was abandoned after its deadline.',promise.status==='blocked'?'一项竞选承诺受到制度阻碍。':promise.status==='impossible'?'候选人去世后，一项竞选承诺无法履行。':'一项竞选承诺在期限后被放弃。');
 }
}
function aiPolitical(s,c){
 const controller=factionOfRome(s);
 if(ROMAN.has(controller)&&controller!==s.player){
  if(s.month===5){const candidate=c.applicants.filter(x=>x.year===s.year&&x.office==='consul'&&x.faction===controller&&officeEligibility(s,x.id,'consul').ok).sort((a,b)=>(person(s,b.id)?.education||0)-(person(s,a.id)?.education||0))[0];if(candidate)supportCandidate(s,candidate.id,'support',controller)}
  if(s.month===3&&c.magistrates.consul.some(x=>x.faction===controller)&&s.factions[controller].stability<60)proposeMeasure(s,'grain_relief',controller);
 }
 const targets={caesar:'senate',senate:'caesar',egypt:'parthia',parthia:'egypt',armenia:'parthia',numidia:'egypt',mauretania:'egypt',galatia:'parthia',bosporus:'parthia'};
 for(const [actor,target] of Object.entries(targets)){
  if(actor===s.player||!s.factions[actor]||!s.factions[target]||!s.regions.some(r=>r.owner===actor))continue;
  if(s.month===2&&Math.abs(s.year)%3===0&&s.factions[actor].treasury>=12){const home=s.regions.find(r=>r.owner===actor);if(home)searchTalent(s,home.id,'provincial',actor)}
  if(s.month===9){
   const available=c.talents.filter(x=>x.actor===actor&&person(s,x.id)?.faction===actor&&present(s,x.id)).sort((a,b)=>(person(s,b.id)?.education||0)-(person(s,a.id)?.education||0));
   if(ROMAN.has(actor)){for(const office of ['finance','administration','supply'])if(!s.world.offices?.[actor]?.[office]){const candidate=available.find(x=>!Object.values(s.world.offices?.[actor]||{}).includes(x.id));if(candidate&&s.factions[actor].treasury>=5)appointOffice(s,office,candidate.id,actor)}}
   else{c.foreignPosts[actor]||={};for(const role of ['administration','scholar'])if(!c.foreignPosts[actor][role]){const candidate=available.find(x=>!Object.values(c.foreignPosts[actor]).includes(x.id));if(candidate)c.foreignPosts[actor][role]=candidate.id}}
  }
  const report=c.intel[actor]?.[target];
  const named=(report?.reports||[]).flatMap(x=>[...Object.values(x.officeholders||{}),...(x.commanders||[])]).find(Boolean);
  const observed=report?.reports?.at(-1)?.observed,stale=observed&&date(s)-(observed.year*12+observed.month)>=12;
  if(s.month===1&&(!report||report.stage<4||stale)&&!report?.pending&&s.factions[actor].treasury>=24){investigateGovernment(s,target,actor);continue}
  if(!named)continue;
  if(s.month===7&&!c.contacts.some(x=>x.actor===actor&&x.id===named&&['pending','open'].includes(x.status))&&s.factions[actor].treasury>=10)contactOfficial(s,target,named,'formal',actor);
  if(s.month===11&&c.contacts.some(x=>x.actor===actor&&x.id===named&&x.status==='open')&&!c.offers.some(x=>x.actor===actor&&x.id===named)&&s.factions[actor].treasury>=18)offerEmployment(s,target,named,actor);
 }
}
function autonomousCampaign(s,c){
 const controller=factionOfRome(s);if(!ROMAN.has(controller))return;
 if([4,7,9].includes(s.month)){
  const pool=c.applicants.filter(x=>x.year===s.year&&x.faction===controller&&x.office==='consul'&&x.status==='eligible'&&officeEligibility(s,x.id,x.office).ok&&person(s,x.id)?.wealth>=3);
  const choice=pool.sort((a,b)=>(person(s,b.id)?.ambition||50)-(person(s,a.id)?.ambition||50)||a.id.localeCompare(b.id))[0];
  if(choice){const p=person(s,choice.id),spent=3;p.wealth-=spent;choice.support+=Math.max(2,Math.round((p.eloquence||p.influence||50)/25));choice.campaignExpense=(choice.campaignExpense||0)+spent;c.campaignActions.push({id:choice.id,actor:choice.id,action:'independent canvass',cost:spent,year:s.year,month:s.month,phase:campaignPhase(s,choice.office)});}
 }
 if(s.month===6)for(const senator of c.senators.filter(x=>present(s,x.id)&&!c.retired[x.id])){
  const pool=c.applicants.filter(x=>x.year===s.year&&x.faction===controller&&x.office==='consul'&&x.status==='eligible'&&x.platform===senator.interest);
  if(!pool.length||roll(s)>.45)continue;
  const chosen=pool.sort((a,b)=>(person(s,b.id)?.influence||0)-(person(s,a.id)?.influence||0))[0];
  if(!c.endorsements.some(x=>x.year===s.year&&x.senatorId===senator.id&&x.candidateId===chosen.id)){c.endorsements.push({senatorId:senator.id,candidateId:chosen.id,actor:senator.id,year:s.year,month:s.month,status:'accepted',cost:0,reason:'shared issue'});chosen.senatorialSupport=clamp((chosen.senatorialSupport||50)+3);senator.publicPosition=chosen.id;c.networks[senator.id]||=[];if(!c.networks[senator.id].includes(chosen.id))c.networks[senator.id].push(chosen.id)}
 }
}
function recordOfficeChanges(s,c){
 for(const [faction,posts] of Object.entries(s.world.offices||{})){
  const previous=c.officeLastSeen[faction]||{};
  for(const [office,id] of Object.entries(posts||{}))if(id&&previous[office]!==id)c.appointmentHistory.push({faction,office,id,previousId:previous[office]||null,year:s.year,month:s.month});
  c.officeLastSeen[faction]={...posts};
 }
 c.appointmentHistory=c.appointmentHistory.slice(-240);
}
function recordPoliticalYear(s,c){
 if(c.politicalReviews.some(x=>x.year===s.year))return;
 const elections=c.elections.filter(x=>x.year===s.year);
 const review={year:s.year,month:s.month,elected:elections.flatMap(x=>x.elected.map(id=>({id,office:x.office}))),failed:c.applicants.filter(x=>x.year===s.year&&x.status==='lost').map(x=>({id:x.id,office:x.office})),appointed:c.appointmentHistory.filter(x=>x.year===s.year).map(x=>({faction:x.faction,id:x.id,office:x.office,previousId:x.previousId})),outgoing:c.termHistory.filter(x=>x.ended?.year===s.year).map(x=>({id:x.id,office:x.office,reason:x.reason})),retired:c.retirements.filter(x=>x.year===s.year).map(x=>x.id),disputes:c.proposals.filter(x=>x.year===s.year&&['opposed','rejected','vetoed'].includes(x.status)).map(x=>({kind:x.kind,status:x.status})),support:{...c.senate},endorsements:c.endorsements.filter(x=>x.year===s.year&&x.status==='accepted').map(x=>({senatorId:x.senatorId,candidateId:x.candidateId}))};
 c.politicalReviews.push(review);c.politicalReviews=c.politicalReviews.slice(-30);
 if(elections.length)note(s,'The annual political review records '+review.elected.length+' elected magistrates and '+review.failed.length+' unsuccessful candidates.','年度政治回顾记载'+review.elected.length+'位当选官员及'+review.failed.length+'位落选者。');
}
export function advanceCursus(s){
 const c=initializeCursus(s);
 if(s.month===1){startTerms(s);annualApplicants(s);const controller=factionOfRome(s),f=s.factions[controller],rome=s.regions.find(r=>r.id==='roma');if(f&&rome)for(const body of ['centuriate','tribal','plebeian','curiate'])c.assemblies[body]=clamp((c.assemblies[body]*3+f.stability+rome.loyalty)/5)}
 advanceCuriateFormalities(s,c);recordOfficeChanges(s,c);reconcileForeignPosts(s,c);advanceIntel(s,c);advanceContacts(s,c);advanceCooperations(s,c);advanceTalentSearches(s,c);advanceApplicantReviews(s,c);advanceEndorsements(s,c);advanceMeasures(s,c);advancePromises(s,c);advanceInvestigations(s,c);
 aiPolitical(s,c);autonomousCampaign(s,c);
 if(ROMAN.has(factionOfRome(s)))for(const [office,o] of Object.entries(MAGISTRACIES))if(o.month===s.month&&(!o.cycle||Math.abs(s.year)%o.cycle===0))resolveElection(s,office);
 if(s.month===12)recordPoliticalYear(s,c);
}
