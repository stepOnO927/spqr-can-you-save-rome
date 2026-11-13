import {initializeWorld,CHARACTER_CATALOG} from './characters.js?v=newborn-age-1';
import {createFictionalPerson} from './dynasties.js?v=fort-intel-1';
import {initializeOffices} from './office-system.js?v=fort-intel-1';

const ROMAN=new Set(['caesar','senate']);
const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
const date=s=>s.year*12+s.month;
const roll=s=>{s.world.intelSeed=(Math.imul(s.world.intelSeed,1664525)+1013904223)>>>0;return s.world.intelSeed/4294967296};
const note=(s,en,zh)=>{s.log.unshift({year:s.year,month:s.month,en,zh,kind:'political'});s.log=s.log.slice(0,80)};
export const MAGISTRACIES={
 consul:{name:['Consul','执政官'],seats:2,month:10,body:'centuriate',age:42,previous:'praetor'},
 praetor:{name:['Praetor','裁判官'],seats:2,month:11,body:'centuriate',age:39,previous:'quaestor'},
 quaestor:{name:['Quaestor','财务官'],seats:2,month:12,body:'tribal',age:30},
 aedile:{name:['Aedile','营造官'],seats:1,month:12,body:'tribal',age:36},
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
 const first=['Lucius','Publius','Aulus','Gaius','Marcus','Titus'][index%6];
 const family=['Varro','Cassianus','Varenus','Marcellinus','Fabius','Valerius'][index%6];
 const zhFirst=['卢基乌斯','普布利乌斯','奥卢斯','盖乌斯','马尔库斯','提图斯'][index%6];
 const zhFamily=['瓦罗','卡西亚努斯','瓦雷努斯','马尔凯利努斯','法比乌斯','瓦莱里乌斯'][index%6];
 const id=createFictionalPerson(s,{name:[first+' '+family,zhFirst+'·'+zhFamily],faction,birthYear:s.year-45-index%9,location:s.regions.find(r=>r.owner===faction)?.id||null,sex:'male',role:['Simulated political candidate','模拟政治候选人']});
 const p=person(s,id);p.education=65+index%5*5;p.influence=42+index%4*8;p.loyalty=50+index%5*7;p.wealth=14+index%4*5;
 const c=s.world.cursus;c.careers[id]=[{office:'quaestor',year:s.year-11,simulated:true},{office:'praetor',year:s.year-4,simulated:true}];
 c.obedience[id]={value:clamp(45+p.loyalty/3-(p.ambition||40)/6),history:[{year:s.year,month:s.month,cause:'initial',delta:0}]};
 c.applicants.push({id,year:s.year,office:kind,status:'eligible',faction,statement:'simulated',support:0,opposition:0,promises:[]});
 return id;
}
export function initializeCursus(s){
 initializeWorld(s);initializeOffices(s);
 if(!s.world.cursus)s.world.cursus={version:1,seeded:false,year:s.year,magistrates:Object.fromEntries(Object.keys(MAGISTRACIES).map(k=>[k,[]])),pendingTerms:[],careers:{},obedience:{},applicants:[],elections:[],endorsements:[],senate:{caesar:42,senate:58},assemblies:{centuriate:50,tribal:50,plebeian:50},foreignPosts:{},intel:{},contacts:[],offers:[],networks:{},reforms:[]};
 const c=s.world.cursus;
 for(const key of ['magistrates','careers','obedience','senate','assemblies','foreignPosts','intel','networks'])c[key]||={};
 for(const key of ['pendingTerms','applicants','elections','endorsements','contacts','offers','reforms'])c[key]||=[];
 for(const key of Object.keys(MAGISTRACIES))c.magistrates[key]||=[];
 if(!c.seeded){
  c.seeded=true;
  // These people and prior offices are explicit alternate-history simulations.
  for(const faction of ['caesar','senate'])for(let i=0;i<4;i++){const id=addFictional(s,faction,'consul',i+(faction==='senate'?0:2));if(faction==='senate'&&i===0)c.varroId=id}
  for(const faction of ['parthia','egypt']){
   const id=createFictionalPerson(s,{name:faction==='parthia'?['Artabanus of Media','米底的阿尔塔巴努斯']:['Dionysios of Alexandria','亚历山大里亚的狄奥尼西奥斯'],faction,birthYear:s.year-40,location:faction,sex:'male',role:['Simulated court administrator','模拟宫廷行政官']});
   person(s,id).education=78;person(s,id).loyalty=58;c.foreignPosts[faction]={administration:id};
  }
 }
 return c;
}
export function officeEligibility(s,id,office){
 const c=initializeCursus(s),o=MAGISTRACIES[office],p=person(s,id);
 if(!o||office==='dictator'||!p||!ROMAN.has(p.faction)||!present(s,id))return {ok:false,reason:'unavailable'};
 const a=age(s,id);if(a==null||a<o.age)return {ok:false,reason:'age'};
 if(o.previous&&!c.careers[id]?.some(x=>x.office===o.previous))return {ok:false,reason:'career'};
 if(c.magistrates[office].some(x=>x.id===id)||c.pendingTerms.some(x=>x.id===id))return {ok:false,reason:'incumbent'};
 return {ok:true};
}
export function obedience(s,id){const c=initializeCursus(s),p=person(s,id);if(!p)return null;if(!c.obedience[id])c.obedience[id]={value:clamp(45+(p.loyalty||50)/3-(p.ambition||40)/6),history:[]};return c.obedience[id].value}
export function changeObedience(s,id,delta,cause){const c=initializeCursus(s),p=person(s,id);if(!p||!cause)return {ok:false};const entry=c.obedience[id]||{value:obedience(s,id),history:[]};entry.value=clamp(entry.value+delta);entry.history.push({year:s.year,month:s.month,cause,delta});entry.history=entry.history.slice(-24);c.obedience[id]=entry;return {ok:true,value:entry.value}}
export function institutionalBalance(s,faction=s.player){
 const c=initializeCursus(s),posts=initializeOffices(s)[faction]||{},holders=Object.values(posts).filter(id=>present(s,id));
 const magistrate=holders.length?clamp(holders.reduce((n,id)=>n+obedience(s,id),0)/holders.length):40;
 const senate=clamp(c.senate[faction]??50),assembly=clamp((c.assemblies.centuriate+c.assemblies.tribal+c.assemblies.plebeian)/3);
 return {magistrate,senate,assembly,administrative:clamp((magistrate*2+(s.factions[faction]?.stability||50))/3),reform:clamp((senate+assembly)/2)};
}
export function annualApplicants(s){
 const c=initializeCursus(s);if(c.year===s.year)return c.applicants.filter(x=>x.year===s.year);
 c.year=s.year;c.applicants=c.applicants.filter(x=>x.year>=s.year-2);
 for(const old of c.applicants.filter(x=>x.year===s.year-1&&x.status==='lost'&&present(s,x.id)&&officeEligibility(s,x.id,x.office).ok))c.applicants.push({...old,year:s.year,status:'eligible',support:0,opposition:0,promises:[]});
 for(const faction of ['caesar','senate'])if(s.factions[faction]&&s.regions.some(r=>r.owner===faction)){
  for(let i=0;i<2;i++)addFictional(s,faction,i?'praetor':'consul',s.year*2+i+(faction==='senate'?0:3));
 }
 note(s,'Annual office applications have opened; candidates remain independent political actors.','年度官员申请已开放；候选人仍是独立的政治人物。');
 return c.applicants.filter(x=>x.year===s.year);
}
export function campaignFor(s,id){return initializeCursus(s).applicants.find(x=>x.id===id&&x.year===s.year)}
export function supportCandidate(s,id,action='support',actor=s.player){
 const c=initializeCursus(s),candidate=campaignFor(s,id),p=person(s,id),controller=factionOfRome(s);
 if(!ROMAN.has(actor)||!candidate||!p||!present(s,id)||!officeEligibility(s,id,candidate.office).ok)return {ok:false,reason:'candidate'};
 if(controller!==actor)return {ok:false,reason:'rome'};
 if(!['support','oppose','canvass','promise'].includes(action))return {ok:false,reason:'action'};
 const cost={support:8,oppose:6,canvass:5,promise:3}[action];if(s.factions[actor].treasury<cost)return {ok:false,reason:'treasury',cost};
 // A candidate may decline a sponsor whose program conflicts with their priorities.
 if(action==='support'&&p.faction!==actor&&obedience(s,id)<55)return {ok:false,reason:'refused'};
 s.factions[actor].treasury-=cost;
 if(action==='oppose'){candidate.opposition+=8;changeObedience(s,id,-6,'public opposition')}
 else if(action==='promise'){candidate.promises.push({by:actor,year:s.year,month:s.month,fulfilled:false});candidate.support+=3;changeObedience(s,id,2,'campaign promise')}
 else {candidate.support+=action==='support'?12:7;changeObedience(s,id,action==='support'?4:2,'campaign support')}
 c.senate[actor]=clamp((c.senate[actor]||50)+(action==='oppose'?-2:1));
 return {ok:true,cost,candidate:id,action};
}
function score(s,candidate,body){
 const p=person(s,candidate.id),career=initializeCursus(s).careers[candidate.id]||[],rome=factionOfRome(s),support=initializeCursus(s).senate[candidate.faction]||45;
 const merit=(p.education||50)*.35+career.length*5+(p.influence||40)*.25+(p.wealth||0)*.12;
 const patronage=candidate.support-candidate.opposition+support*.18+(candidate.faction===rome?8:-10);
 const groups=body==='centuriate'?[['senior',.48],['middle',.32],['other',.20]]:body==='plebeian'?[['urban',.42],['rural',.58]]:[['urban',.30],['rural',.70]];
 return {total:Math.round(groups.reduce((n,[group,weight])=>n+weight*(merit+patronage+(group==='senior'?(p.wealth||0)*.25:group==='urban'?(p.influence||0)*.1:(p.loyalty||50)*.08)+roll(s)*16),0)),groups:groups.map(([group,weight])=>({group,weight}))};
}
export function resolveElection(s,office='consul'){
 const c=initializeCursus(s),o=MAGISTRACIES[office],controller=factionOfRome(s);
 if(!o?.body||!ROMAN.has(controller)||o.cycle&&Math.abs(s.year)%o.cycle!==0)return {ok:false,reason:'procedure'};
 if(c.elections.some(x=>x.year===s.year&&x.office===office))return {ok:false,reason:'complete'};
 const candidates=c.applicants.filter(x=>x.year===s.year&&x.office===office&&officeEligibility(s,x.id,office).ok&&x.faction===controller);
 const entries=candidates.map(x=>({id:x.id,score:score(s,x,o.body).total})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const elected=entries.slice(0,o.seats).map(x=>x.id);
 const result={year:s.year,month:s.month,office,body:o.body,controller,candidates:entries,elected,termYear:officeYear(s),status:elected.length===o.seats?'complete':'incomplete'};
 c.elections.push(result);c.elections=c.elections.slice(-80);
 for(const id of elected){c.pendingTerms.push({id,office,year:officeYear(s),faction:controller});changeObedience(s,id,3,'election victory')}
 for(const x of candidates){x.status=elected.includes(x.id)?'elected':'lost';if(!elected.includes(x.id))changeObedience(s,x.id,-2,'election defeat')}
 if(elected.length)note(s,'The '+ASSEMBLIES[o.body][0]+' elected '+elected.map(id=>name(id)).join(' and ')+' as '+o.name[0]+' for the next term.','由'+ASSEMBLIES[o.body][1]+'选出'+elected.map(id=>name(id,1)).join('与')+'担任下届'+o.name[1]+'。');
 return {ok:true,result};
}
function startTerms(s){
 const c=initializeCursus(s);
 for(const office of Object.keys(MAGISTRACIES)){const current=c.magistrates[office]||[];c.magistrates[office]=current.filter(x=>x.endYear>=s.year&&present(s,x.id));}
 for(const term of c.pendingTerms.filter(x=>x.year===s.year&&present(s,x.id))){
  c.magistrates[term.office].push({id:term.id,startYear:s.year,endYear:s.year,faction:term.faction});
  c.careers[term.id]||=[];c.careers[term.id].push({office:term.office,year:s.year,simulated:true});
 }
 c.pendingTerms=c.pendingTerms.filter(x=>x.year>s.year);
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
 return !!(r?.reports?.some(x=>x.people?.includes(id))||s.knowledge?.[actor]?.[target]?.reportedLeaders?.includes(id));
}
export function contactOfficial(s,target,id,route='formal',actor=s.player){
 const c=initializeCursus(s),routes={formal:{cost:10,months:3},merchant:{cost:7,months:5},introduction:{cost:5,months:2}},spec=routes[route],p=person(s,id);
 if(!spec||actor===target||!p||p.faction!==target||!knownForeignOfficial(s,target,id,actor))return {ok:false,reason:'unknown'};
 if(route==='introduction'&&!Object.values(c.networks).some(ids=>ids.includes(id)))return {ok:false,reason:'introduction'};
 if(c.contacts.some(x=>x.actor===actor&&x.id===id&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<spec.cost)return {ok:false,reason:'treasury',cost:spec.cost};
 s.factions[actor].treasury-=spec.cost;c.contacts.push({actor,target,id,route,cost:spec.cost,remaining:spec.months,status:'pending',sent:{year:s.year,month:s.month}});
 return {ok:true,...spec};
}
export function offerEmployment(s,target,id,actor=s.player){
 const c=initializeCursus(s),p=person(s,id),contact=c.contacts.find(x=>x.actor===actor&&x.id===id&&x.status==='open');
 if(!contact||!p||p.faction!==target||s.world.leadership[target]?.includes(id)||s.armies.some(a=>a.characterId===id))return {ok:false,reason:'eligibility'};
 if(c.offers.some(x=>x.id===id&&['pending','accepted'].includes(x.status)))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<18)return {ok:false,reason:'treasury',cost:18};
 s.factions[actor].treasury-=18;c.offers.push({actor,target,id,remaining:3,status:'pending',cost:18,year:s.year,month:s.month});
 return {ok:true,cost:18,months:3};
}
function advanceIntel(s,c){
 for(const [actor,targets] of Object.entries(c.intel))for(const [target,report] of Object.entries(targets)){
  if(!report.pending||--report.pending.remaining>0)continue;
  const stage=report.pending.stage;report.stage=stage;delete report.pending;
  const people=stage>=3?Object.values(c.foreignPosts[target]||{}).filter(id=>person(s,id)?.faction===target):stage>=1?(s.world.leadership[target]||[]):[];
  report.reports.push({stage,source:'investigation',observed:{year:s.year,month:s.month},delivered:{year:s.year,month:s.month},confidence:stage>=3?'estimate':'public',people});
  if(actor===s.player)note(s,'A dated foreign government report has arrived; offices and people may change.','一份注明日期的外国官制报告已经送达；职务与人物可能变化。');
 }
}
function advanceContacts(s,c){
 for(const x of c.contacts.filter(x=>x.status==='pending')){
  if(--x.remaining>0)continue;
  const p=person(s,x.id),chance=x.route==='formal'?0.72:x.route==='merchant'?0.52:0.78;
  x.status=p?.alive&&p.faction===x.target&&roll(s)<chance?'open':'refused';
  x.resolved={year:s.year,month:s.month};
  if(x.actor===s.player)note(s,x.status==='open'?'A named official accepted contact; no allegiance has changed.':'A contact request received no usable reply.',x.status==='open'?'一名具名官员同意接触；其政治归属尚未改变。':'接触请求未获有效答复。');
 }
 for(const x of c.offers.filter(x=>x.status==='pending')){
  if(--x.remaining>0)continue;const p=person(s,x.id);
  if(!p?.alive||p.faction!==x.target){x.status='lapsed';continue}
  const chance=Math.max(.05,Math.min(.7,.28+(p.ambition||40)/300-(p.loyalty||60)/250+(p.education||50)/500));
  if(roll(s)>=chance){x.status='refused';if(x.actor===s.player)note(s,'A foreign official refused the employment proposal.','一名外国官员拒绝了任职提议。');continue}
  x.status='accepted';delete c.foreignPosts[x.target]?.administration;p.faction=x.actor;p.location=s.regions.find(r=>r.owner===x.actor)?.id||null;p.loyalty=clamp((p.loyalty||50)*.7);changeObedience(s,x.id,-10,'foreign employment');
  c.careers[x.id]||=[];c.careers[x.id].push({office:'foreign_administrator',year:s.year,from:x.target,to:x.actor,simulated:true});
  c.networks[x.id]=Object.values(c.foreignPosts[x.target]||{}).filter(id=>id!==x.id);
  if(x.actor===s.player)note(s,name(x.id)+' accepted an administrative offer; no troops or territory changed hands.',name(x.id,1)+'接受行政任职；军队和领土均未转移。');
 }
}
export function advanceCursus(s){
 const c=initializeCursus(s);
 if(s.month===1){startTerms(s);annualApplicants(s)}
 advanceIntel(s,c);advanceContacts(s,c);
 if(ROMAN.has(factionOfRome(s)))for(const [office,o] of Object.entries(MAGISTRACIES))if(o.month===s.month&&(!o.cycle||Math.abs(s.year)%o.cycle===0))resolveElection(s,office);
}
