import {initializeWorld,CHARACTER_CATALOG} from './characters.js?v=succession-ui-recovery-1';
import {createFictionalPerson} from './dynasties.js?v=succession-ui-recovery-1';
import {initializeOffices} from './office-system.js?v=succession-ui-recovery-1';

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
 const first=['Lucius','Publius','Aulus','Gaius','Marcus','Titus'][((index%6)+6)%6];
 const family=['Varro','Cassianus','Varenus','Marcellinus','Fabius','Valerius'][((Math.floor(index/6)%6)+6)%6];
 const zhFirst=['卢基乌斯','普布利乌斯','奥卢斯','盖乌斯','马尔库斯','提图斯'][((index%6)+6)%6];
 const zhFamily=['瓦罗','卡西亚努斯','瓦雷努斯','马尔凯利努斯','法比乌斯','瓦莱里乌斯'][((Math.floor(index/6)%6)+6)%6];
 const id=createFictionalPerson(s,{name:[first+' '+family,zhFirst+'·'+zhFamily],faction,birthYear:s.year-({quaestor:33,aedile:38,tribune:35,praetor:41,consul:45,censor:50}[kind]||40)-((index%4+4)%4),location:s.regions.find(r=>r.owner===faction)?.id||null,sex:'male',role:['Simulated political candidate','模拟政治候选人']});
 const p=person(s,id);p.education=65+index%5*5;p.influence=42+index%4*8;p.loyalty=50+index%5*7;p.wealth=14+index%4*5;
 const c=s.world.cursus;c.careers[id]=kind==='consul'?[{office:'quaestor',year:s.year-11,simulated:true},{office:'praetor',year:s.year-4,simulated:true}]:kind==='praetor'||kind==='aedile'?[{office:'quaestor',year:s.year-5,simulated:true}]:[];
 c.obedience[id]={value:clamp(45+p.loyalty/3-(p.ambition||40)/6),history:[{year:s.year,month:s.month,cause:'initial',delta:0}]};
 c.applicants.push({id,year:s.year,office:kind,status:'eligible',faction,statement:'simulated',support:0,opposition:0,promises:[]});
 return id;
}
export function initializeCursus(s){
 initializeWorld(s);initializeOffices(s);
 if(!s.world.cursus)s.world.cursus={version:1,seeded:false,year:s.year,magistrates:Object.fromEntries(Object.keys(MAGISTRACIES).map(k=>[k,[]])),pendingTerms:[],careers:{},obedience:{},applicants:[],elections:[],endorsements:[],senate:{caesar:42,senate:58},assemblies:{centuriate:50,tribal:50,plebeian:50},foreignPosts:{},intel:{},contacts:[],offers:[],advisers:[],investigations:[],networks:{},referrals:{},reforms:[],proposals:[]};
 const c=s.world.cursus;
 for(const key of ['magistrates','careers','obedience','senate','assemblies','foreignPosts','intel','networks','referrals'])c[key]||={};
 for(const key of ['pendingTerms','applicants','elections','endorsements','contacts','offers','advisers','investigations','reforms','proposals'])c[key]||=[];
 for(const offer of c.offers.filter(x=>x.status==='accepted'&&person(s,x.id)?.faction===x.actor))if(!c.advisers.some(a=>a.id===offer.id))c.advisers.push({id:offer.id,actor:offer.actor,formerFaction:offer.target,year:offer.year,month:offer.month});
 for(const key of Object.keys(MAGISTRACIES))c.magistrates[key]||=[];
 if(!c.seeded){
  c.seeded=true;
  // These people and prior offices are explicit alternate-history simulations.
  for(const faction of ['caesar','senate']){const offset=faction==='senate'?0:12;for(let i=0;i<4;i++){const id=addFictional(s,faction,'consul',offset+i);if(faction==='senate'&&i===0)c.varroId=id}for(const office of ['praetor','quaestor','aedile','tribune'])for(let i=0;i<MAGISTRACIES[office].seats+1;i++)addFictional(s,faction,office,offset+4+i+Object.keys(MAGISTRACIES).indexOf(office)*4)}
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
 const advisers=(c.advisers||[]).filter(x=>x.actor===faction&&person(s,x.id)?.faction===faction&&present(s,x.id)).length;
 return {magistrate,senate,assembly,administrative:clamp((magistrate*2+(s.factions[faction]?.stability||50))/3+Math.min(10,advisers*3)),reform:clamp((senate+assembly)/2)};
}
export function annualApplicants(s){
 const c=initializeCursus(s);if(c.year===s.year)return c.applicants.filter(x=>x.year===s.year);
 c.year=s.year;c.applicants=c.applicants.filter(x=>x.year>=s.year-2);
 for(const old of c.applicants.filter(x=>x.year===s.year-1&&x.status==='lost'&&present(s,x.id)&&officeEligibility(s,x.id,x.office).ok))c.applicants.push({...old,year:s.year,status:'eligible',support:0,opposition:0,promises:[]});
 for(const faction of ['caesar','senate'])if(s.factions[faction]&&s.regions.some(r=>r.owner===faction)){
  for(const office of ['consul','praetor','quaestor','aedile','tribune'])addFictional(s,faction,office,Math.abs(s.year)*13+Object.keys(MAGISTRACIES).indexOf(office)*3+(faction==='senate'?0:1));
  for(const id of Object.keys(c.careers))if(c.careers[id]?.some(x=>x.office==='consul')&&person(s,id)?.faction===faction&&officeEligibility(s,id,'censor').ok&&Math.abs(s.year)%5===0)c.applicants.push({id,year:s.year,office:'censor',status:'eligible',faction,support:0,opposition:0,promises:[]});
 }
 note(s,'Annual office applications have opened; candidates remain independent political actors.','年度官员申请已开放；候选人仍是独立的政治人物。');
 return c.applicants.filter(x=>x.year===s.year);
}
export function campaignFor(s,id){return initializeCursus(s).applicants.find(x=>x.id===id&&x.year===s.year)}
export function supportCandidate(s,id,action='support',actor=s.player){
 const c=initializeCursus(s),candidate=campaignFor(s,id),p=person(s,id),controller=factionOfRome(s);
 if(!ROMAN.has(actor)||!candidate||candidate.status==='disqualified'||!p||!present(s,id)||!officeEligibility(s,id,candidate.office).ok)return {ok:false,reason:'candidate'};
 if(controller!==actor)return {ok:false,reason:'rome'};
 if(!['support','oppose','canvass','promise','improper'].includes(action))return {ok:false,reason:'action'};
 const cost={support:8,oppose:6,canvass:5,promise:3,improper:14}[action];if(s.factions[actor].treasury<cost)return {ok:false,reason:'treasury',cost};
 // A candidate may decline a sponsor whose program conflicts with their priorities.
 if(action==='support'&&p.faction!==actor&&obedience(s,id)<55)return {ok:false,reason:'refused'};
 s.factions[actor].treasury-=cost;
 if(action==='oppose'){candidate.opposition+=8;changeObedience(s,id,-6,'public opposition');if(roll(s)<.25)candidate.allegation={public:true,source:'opposition',year:s.year,month:s.month}}
 else if(action==='improper'){candidate.support+=roll(s)<.55?12:3;candidate.irregularity={actor,evidence:35+Math.round(roll(s)*50),public:roll(s)<.35,year:s.year,month:s.month};if(candidate.irregularity.public)candidate.allegation={public:true,source:'witness',year:s.year,month:s.month}}
 else if(action==='promise'){candidate.promises.push({id:`promise:${id}:${s.year}:${s.month}:${candidate.promises.length+1}`,by:actor,year:s.year,month:s.month,kind:'public_works',beneficiary:actor,body:'tribal',requiredAction:'public_works',public:true,benefit:3,cost:8,deadlineYear:s.year+1,status:'offered'});candidate.support+=3;changeObedience(s,id,2,'campaign promise')}
 else {candidate.support+=action==='support'?12:7;changeObedience(s,id,action==='support'?4:2,'campaign support')}
 c.senate[actor]=clamp((c.senate[actor]||50)+(action==='oppose'?-2:1));
 return {ok:true,cost,candidate:id,action};
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
 const patronage=candidate.support-candidate.opposition+support*.18+(candidate.faction===rome?8:-10);
 const groups=body==='centuriate'?[['senior',.48],['middle',.32],['other',.20]]:body==='plebeian'?[['urban',.42],['rural',.58]]:[['urban',.30],['rural',.70]];
 return {total:Math.round(groups.reduce((n,[group,weight])=>n+weight*(merit+patronage+(group==='senior'?(p.wealth||0)*.25:group==='urban'?(p.influence||0)*.1:(p.loyalty||50)*.08)+roll(s)*16),0)),groups:groups.map(([group,weight])=>({group,weight}))};
}
export function resolveElection(s,office='consul'){
 const c=initializeCursus(s),o=MAGISTRACIES[office],controller=factionOfRome(s);
 if(!o?.body||!ROMAN.has(controller)||o.cycle&&Math.abs(s.year)%o.cycle!==0)return {ok:false,reason:'procedure'};
 if(c.elections.some(x=>x.year===s.year&&x.office===office))return {ok:false,reason:'complete'};
 const candidates=c.applicants.filter(x=>x.year===s.year&&x.office===office&&x.status!=='disqualified'&&officeEligibility(s,x.id,office).ok&&x.faction===controller);
 const entries=candidates.map(x=>({id:x.id,score:score(s,x,o.body).total})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const elected=entries.slice(0,o.seats).map(x=>x.id);
 const result={year:s.year,month:s.month,office,body:o.body,controller,candidates:entries,elected,termYear:officeYear(s),status:elected.length===o.seats?'complete':'incomplete'};
 c.elections.push(result);c.elections=c.elections.slice(-80);
 for(const id of elected){c.pendingTerms.push({id,office,year:officeYear(s),faction:controller});changeObedience(s,id,3,'election victory')}
 for(const x of candidates){x.status=elected.includes(x.id)?'elected':'lost';for(const promise of x.promises||[])if(promise.status==='offered')promise.status=elected.includes(x.id)?'pending':'void';if(!elected.includes(x.id))changeObedience(s,x.id,-2,'election defeat')}
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
 return !!(r?.reports?.some(x=>x.people?.includes(id))||s.knowledge?.[actor]?.[target]?.reportedLeaders?.includes(id)||initializeCursus(s).referrals[actor]?.includes(id));
}
export function contactOfficial(s,target,id,route='formal',actor=s.player){
 const c=initializeCursus(s),routes={formal:{cost:10,months:3,chance:.72},merchant:{cost:7,months:5,chance:.52},introduction:{cost:5,months:2,chance:.78},embassy:{cost:12,months:2,chance:.70},scholarly:{cost:6,months:4,chance:.68},professional:{cost:8,months:3,chance:.64},intelligence:{cost:9,months:3,chance:.60}},spec=routes[route],p=person(s,id),report=c.intel[actor]?.[target];
 if(!spec||actor===target||!p||p.faction!==target||!knownForeignOfficial(s,target,id,actor))return {ok:false,reason:'unknown'};
 if(!present(s,id))return {ok:false,reason:'unavailable'};
 if(route==='introduction'&&!Object.entries(c.networks).some(([source,ids])=>person(s,source)?.faction===actor&&present(s,source)&&ids.includes(id)))return {ok:false,reason:'introduction'};
 if(route==='embassy'&&(report?.stage||0)<2)return {ok:false,reason:'intelligence'};
 if(['scholarly','professional'].includes(route)&&c.foreignPosts[target]?.scholar!==id)return {ok:false,reason:'profession'};
 if(['scholarly','professional','intelligence'].includes(route)&&(report?.stage||0)<4)return {ok:false,reason:'intelligence'};
 if(route==='professional'&&!Object.values(s.world.offices?.[actor]||{}).some(holder=>person(s,holder)?.education>=70&&present(s,holder)))return {ok:false,reason:'representative'};
 if(c.contacts.some(x=>x.actor===actor&&x.id===id&&x.status==='pending'))return {ok:false,reason:'pending'};
 if(s.factions[actor].treasury<spec.cost)return {ok:false,reason:'treasury',cost:spec.cost};
 s.factions[actor].treasury-=spec.cost;c.contacts.push({actor,target,id,route,cost:spec.cost,remaining:spec.months,status:'pending',sent:{year:s.year,month:s.month}});
 return {ok:true,cost:spec.cost,months:spec.months};
}
export function cultivateOfficial(s,target,id,actor=s.player){
 const c=initializeCursus(s),p=person(s,id),contact=c.contacts.findLast(x=>x.actor===actor&&x.id===id&&x.status==='open');
 if(!contact||!p||p.faction!==target||!present(s,id))return {ok:false,reason:'contact'};
 if(contact.lastCultivated===date(s))return {ok:false,reason:'cooldown'};
 if((contact.trust||0)>=80)return {ok:false,reason:'trust'};
 const cost=6;if(s.factions[actor].treasury<cost)return {ok:false,reason:'treasury',cost};
 s.factions[actor].treasury-=cost;contact.lastCultivated=date(s);
 const watch=s.world.securityWatches?.[target],watched=watch&&date(s)>=watch.start&&date(s)<=watch.end;
 if(watched&&roll(s)<.18){contact.status='compromised';contact.trust=0;contact.history||=[];contact.history.push({year:s.year,month:s.month,outcome:'compromised'});return {ok:true,cost,outcome:'compromised'}}
 const gain=4+Math.floor(roll(s)*7);contact.trust=Math.min(80,(contact.trust||0)+gain);
 contact.history||=[];contact.history.push({year:s.year,month:s.month,outcome:'cultivated',gain,trust:contact.trust});
 return {ok:true,cost,outcome:'cultivated',gain,trust:contact.trust};
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
  const posts=ROMAN.has(target)?(s.world.offices?.[target]||{}):(c.foreignPosts[target]||{});
  const people=stage>=4?Object.values(posts).filter(id=>person(s,id)?.faction===target):stage>=3?[posts.administration||posts.finance||posts.supply].filter(id=>person(s,id)?.faction===target):stage>=1?(s.world.leadership[target]||[]):[];
  const offices=stage>=2?(ROMAN.has(target)?['administration','finance','supply']:Object.keys(posts)):[];
  const links=stage>=4?people.flatMap(id=>(c.networks[id]||[]).filter(other=>people.includes(other)).map(other=>({from:id,to:other,confidence:'low'}))):[];
  report.reports.push({stage,source:'investigation',observed:{year:s.year,month:s.month},delivered:{year:s.year,month:s.month},confidence:stage>=4?'unverified':stage>=3?'estimate':'public',people,offices,links,possibleContradictions:[],access:stage>=5?['formal','merchant','introduction']:[]});
  if(actor===s.player)note(s,'A dated foreign government report has arrived; offices and people may change.','一份注明日期的外国官制报告已经送达；职务与人物可能变化。');
 }
}
function advanceContacts(s,c){
 for(const x of c.contacts.filter(x=>x.status==='pending')){
  if(--x.remaining>0)continue;
  const p=person(s,x.id),chance={formal:.72,merchant:.52,introduction:.78,embassy:.70,scholarly:.68,professional:.64,intelligence:.60}[x.route]||.5,watch=s.world.securityWatches?.[x.target],watched=watch&&date(s)>=watch.start&&date(s)<=watch.end;
  x.status=p?.alive&&p.faction===x.target&&roll(s)<chance*(watched?(x.route==='intelligence'?.4:.75):1)?'open':'refused';if(x.status==='open')x.trust=Math.min(55,Math.round(15+(p.education||50)/10+roll(s)*20));if(watched&&roll(s)<(x.route==='intelligence'?.3:.12)){x.status='compromised';if(x.target===s.player)note(s,'A watched foreign approach to an official was detected; the source remains uncertain.','反间谍警戒发现有人接近官员；来者身份仍不确定。')}
  x.resolved={year:s.year,month:s.month};
  if(x.actor===s.player)note(s,x.status==='open'?'A named official accepted contact; no allegiance has changed.':'A contact request received no usable reply.',x.status==='open'?'一名具名官员同意接触；其政治归属尚未改变。':'接触请求未获有效答复。');
 }
 for(const x of c.offers.filter(x=>x.status==='pending')){
  if(--x.remaining>0)continue;const p=person(s,x.id);
  if(!p?.alive||p.faction!==x.target){x.status='lapsed';continue}
  const chance=Math.max(.05,Math.min(.7,.28+(p.ambition||40)/300-(p.loyalty||60)/250+(p.education||50)/500+(c.contacts.find(y=>y.actor===x.actor&&y.id===x.id&&y.status==='open')?.trust||0)/300));
  if(roll(s)>=chance){x.status='refused';if(x.actor===s.player)note(s,'A foreign official refused the employment proposal.','一名外国官员拒绝了任职提议。');continue}
  x.status='accepted';const formerColleagues=[...(c.networks[x.id]||[])];for(const [role,holder] of Object.entries(c.foreignPosts[x.target]||{}))if(holder===x.id)delete c.foreignPosts[x.target][role];p.faction=x.actor;p.location=s.regions.find(r=>r.owner===x.actor)?.id||null;p.loyalty=clamp((p.loyalty||50)*.7);changeObedience(s,x.id,-10,'foreign employment');
  c.careers[x.id]||=[];c.careers[x.id].push({office:'foreign_adviser',year:s.year,from:x.target,to:x.actor,simulated:true});c.advisers||=[];if(!c.advisers.some(a=>a.id===x.id))c.advisers.push({id:x.id,actor:x.actor,formerFaction:x.target,year:s.year,month:s.month});
  if(ROMAN.has(x.target))for(const [office,holder] of Object.entries(s.world.offices?.[x.target]||{}))if(holder===x.id)delete s.world.offices[x.target][office];
  const relationKey=[x.actor,x.target].sort().join(':');s.relations[relationKey]=Math.max(-100,(s.relations[relationKey]||0)-6);if(x.target===s.player)note(s,'A domestic official accepted foreign employment; relations deteriorated.','本国官员接受外国任职；两国关系恶化。');
  c.networks[x.id]=formerColleagues.filter(id=>person(s,id)?.alive);c.referrals[x.actor]||=[];for(const id of c.networks[x.id])if(!c.referrals[x.actor].includes(id))c.referrals[x.actor].push(id);
  if(x.actor===s.player)note(s,name(x.id)+' accepted an administrative offer; no troops or territory changed hands.',name(x.id,1)+'接受行政任职；军队和领土均未转移。');
 }
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
   if((c.senate[p.actor]||0)<40){p.status='opposed';if(p.actor===s.player)note(s,'The Senate opposed a proposed measure; no assembly vote followed.','元老院反对一项提案；公民大会未进行表决。');continue}
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
function advancePromises(s,c){for(const application of c.applicants)for(const promise of application.promises||[])if(promise.status==='pending'&&s.year>promise.deadlineYear){promise.status='abandoned';promise.resolved={year:s.year,month:s.month};changeObedience(s,application.id,-8,'unmet public promise');c.senate[application.faction]=clamp((c.senate[application.faction]||50)-4);if(promise.by===s.player)note(s,'An elected candidate failed to pursue a public works promise by its deadline.','一位当选者未在期限内兑现公共工程承诺。')}
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
  const report=c.intel[actor]?.[target];
  const named=(report?.reports||[]).flatMap(x=>x.people||[]).find(id=>person(s,id)?.faction===target&&!s.world.leadership[target]?.includes(id));
  const observed=report?.reports?.at(-1)?.observed,stale=observed&&date(s)-(observed.year*12+observed.month)>=12;
  if(s.month===1&&(!report||report.stage<4||!named&&stale)&&!report?.pending&&s.factions[actor].treasury>=24){investigateGovernment(s,target,actor);continue}
  if(!named)continue;
  if(s.month===7&&!c.contacts.some(x=>x.actor===actor&&x.id===named&&['pending','open'].includes(x.status))&&s.factions[actor].treasury>=10)contactOfficial(s,target,named,'formal',actor);
  if(s.month===11&&c.contacts.some(x=>x.actor===actor&&x.id===named&&x.status==='open')&&!c.offers.some(x=>x.actor===actor&&x.id===named)&&s.factions[actor].treasury>=18)offerEmployment(s,target,named,actor);
 }
}
export function advanceCursus(s){
 const c=initializeCursus(s);
 if(s.month===1){startTerms(s);annualApplicants(s);const controller=factionOfRome(s),f=s.factions[controller],rome=s.regions.find(r=>r.id==='roma');if(f&&rome)for(const body of ['centuriate','tribal','plebeian'])c.assemblies[body]=clamp((c.assemblies[body]*3+f.stability+rome.loyalty)/5)}
 advanceIntel(s,c);advanceContacts(s,c);advanceMeasures(s,c);advancePromises(s,c);advanceInvestigations(s,c);
 aiPolitical(s,c);
 if(ROMAN.has(factionOfRome(s)))for(const [office,o] of Object.entries(MAGISTRACIES))if(o.month===s.month&&(!o.cycle||Math.abs(s.year)%o.cycle===0))resolveElection(s,office);
}
