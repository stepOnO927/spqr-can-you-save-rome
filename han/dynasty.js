// HAN DYNASTIC VALIDATION — the single authority on who may be the
// orthodox Han emperor (汉室正统皇帝).
//
// ABSOLUTE RULE: only a verified member of the Liu imperial clan, carrying the
// Liu surname from birth, with an eligible claim, raised through a recognised
// succession process, can hold `orthodox_han_emperor`.
//
// Lineage is computed only from the agnatic chain of birth records
// (s.genealogy). Surname changes, imperial grants of the surname, marriage,
// and adoption never create lineage. Every write to s.throne.orthodox goes
// through crown(), and enforceDynasticInvariants() re-validates the throne on
// every tick and on every load, so a save edit cannot smuggle a non-Liu in.
import {PERSON} from './people.js?v=han-1';

export const STATUSES=['orthodox_han_emperor','disputed_liu_claimant','regent','de_facto_ruler','non_liu_usurper','new_dynasty_founder'];
export const STATUS_NAMES={
 orthodox_han_emperor:['Orthodox Han Emperor','汉室正统皇帝'],
 disputed_liu_claimant:['Disputed Liu Claimant','刘氏争位者'],
 regent:['Regent','摄政者'],
 de_facto_ruler:['De Facto Ruler','实际掌权者'],
 non_liu_usurper:['Non-Liu Usurper','非刘氏篡位者'],
 new_dynasty_founder:['Founder of Another Dynasty','新朝建立者']
};
// Processes that can raise an orthodox emperor. National focuses, government
// reforms, purchases of Mandate, save migration and raw military victory are
// deliberately absent.
export const PROCESSES=['accession','designation','court_selection','regency_installation','restoration','loyalist_proclamation','civil_war_settlement'];
const ROOT='liu-taigong',GAOZU='liu-bang',SALT='han-genealogy-v1';

// ---------- birth records ----------
function fnv(text){let h=2166136261>>>0;for(const c of text)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h.toString(36)}
export function sealFor(s,rec){return fnv([rec.id,rec.father||'',rec.mother||'',rec.birthSurname||'',rec.birth,rec.sex,s.seed,SALT].join('|'))}
export function recordBirth(s,{id,father=null,mother=null,birthSurname,birth,sex}){
 if(s.genealogy[id])return {ok:false,reason:'exists'};
 const rec={id,father,mother,birthSurname,birth,sex};rec.seal=sealFor(s,rec);s.genealogy[id]=rec;return {ok:true,record:rec};
}
// Historical entries are checked against the static record in people.js;
// generated births against their seal and the parents' circumstances.
export function birthRecordValid(s,id){
 const rec=s.genealogy[id];if(!rec)return false;
 const stat=PERSON[id];
 if(stat)return rec.father===stat.father&&rec.birthSurname===stat.birthSurname&&rec.sex===stat.sex&&rec.birth===stat.birth;
 if(rec.seal!==sealFor(s,rec))return false;
 if(rec.father){const f=s.genealogy[rec.father],fp=s.persons[rec.father];if(!f||f.sex!=='m')return false;
  const death=fp?.death??PERSON[rec.father]?.death;if(death!=null&&death<rec.birth-1)return false;
  const fb=f.birth;if(rec.birth-fb<14)return false}
 return true;
}

// ---------- lineage ----------
export function agnaticChain(s,id){
 const chain=[],seen=new Set();let cur=id;
 while(cur&&!seen.has(cur)){seen.add(cur);const rec=s.genealogy[cur];if(!rec)return {chain,complete:false};chain.push(cur);if(cur===ROOT)return {chain,complete:true};cur=rec.father}
 return {chain,complete:false};
}
export function isLiuClan(s,id){
 const {chain,complete}=agnaticChain(s,id);if(!complete)return false;
 return chain.every(x=>{const r=s.genealogy[x];return r.birthSurname==='Liu'&&r.sex==='m'&&birthRecordValid(s,x)});
}
export function isGaozuLine(s,id){return isLiuClan(s,id)&&agnaticChain(s,id).chain.includes(GAOZU)}
const alive=(s,id)=>!!s.persons[id]&&s.persons[id].alive;
const ageOf=(s,id)=>{const b=s.genealogy[id]?.birth??s.persons[id]?.birth;return b==null?0:yearsBetween(b,s.year)};
export function yearsBetween(a,b){let d=b-a;if(a<0&&b>0)d-=1;return d} // no year zero

// ---------- claims ----------
// Strength of a Liu claim relative to the reigning (or last) orthodox line.
export function claimStrength(s,id){
 if(!isLiuClan(s,id))return 0;
 const ref=s.throne.orthodox||s.throne.lastOrthodox;const p=s.persons[id]||{};
 let claim=isGaozuLine(s,id)?12:4;
 if(ref&&ref!==id){
  const rf=s.genealogy[ref]?.father,mine=s.genealogy[id]?.father;
  if(mine===ref)claim=60;                      // son
  else if(mine&&s.genealogy[mine]?.father===ref)claim=42; // grandson
  else if(rf&&mine===rf)claim=34;              // brother
  else if(rf&&mine&&s.genealogy[mine]?.father===rf)claim=24; // nephew
 }
 if(!s.throne.orthodox&&s.throne.lastOrthodox===id)claim=70; // a displaced emperor keeps his claim
 if(s.throne.heir===id)claim+=30;
 if(p.mother&&s.persons[p.mother]?.empress)claim+=8;
 if(p.legalHeirOf&&isLiuClan(s,p.legalHeirOf)&&p.legalHeirOf===ref)claim+=10; // adopted as heir *within* the clan
 if(s.throne.deposed?.includes(id))claim-=20;
 if(p.barred)claim=0;
 return Math.max(0,Math.min(100,claim));
}
export function eligibility(s,id){
 const reasons=[];const p=s.persons[id];
 if(!p)reasons.push('unknown');
 else{
  if(!p.alive)reasons.push('deceased');
  if(s.genealogy[id]?.sex!=='m')reasons.push('not_male_line');
  if(s.genealogy[id]?.birthSurname!=='Liu')reasons.push('not_born_liu');
  if(p.surname!=='Liu')reasons.push('surname');
  if(!isLiuClan(s,id))reasons.push('lineage_unverified');
  if(p.barred)reasons.push('removed_from_clan_register');
  if(reasons.length===0&&claimStrength(s,id)<=0)reasons.push('no_claim');
 }
 return {ok:reasons.length===0,reasons};
}
export function recognition(s,id){
 // Court recognition: weighted support of court factions, 0–100.
 const sup=s.throne.support?.[id]||{};let total=0,weight=0;
 for(const [f,v] of Object.entries(s.court.factions)){weight+=v.influence;total+=v.influence*(sup[f]||0)}
 return weight?Math.round(total/weight):0;
}

// ---------- status ----------
export function statusOf(s,id){
 const t=s.throne;
 if(t.orthodox===id&&eligibility(s,id).ok)return 'orthodox_han_emperor';
 if(t.dynasty&&!t.dynasty.orthodox&&t.dynasty.founder===id)return 'new_dynasty_founder';
 if(t.occupant===id&&!isLiuClan(s,id))return 'non_liu_usurper';
 if(t.claimants.some(c=>c.id===id)&&isLiuClan(s,id))return 'disputed_liu_claimant';
 if(t.regent===id)return 'regent';
 if(t.deFacto===id)return 'de_facto_ruler';
 return null;
}
export const isOrthodox=(s,id)=>statusOf(s,id)==='orthodox_han_emperor';

// ---------- the only path to the orthodox throne ----------
const THRESHOLD={accession:35,designation:35,court_selection:50,regency_installation:40,restoration:40,loyalist_proclamation:30,civil_war_settlement:45};
export function crown(s,id,process,{log=()=>{},force=false}={}){
 if(!PROCESSES.includes(process))return {ok:false,reason:'invalid_process'};
 const e=eligibility(s,id);if(!e.ok)return {ok:false,reason:e.reasons[0],reasons:e.reasons};
 if(process==='restoration'&&!(s.throne.dynasty&&!s.throne.dynasty.orthodox)&&!s.throne.displaced)return {ok:false,reason:'nothing_to_restore'};
 const rec=recognition(s,id);if(!force&&rec<THRESHOLD[process])return {ok:false,reason:'insufficient_recognition',recognition:rec};
 const prev=s.throne.orthodox;
 if(prev&&prev!==id&&alive(s,prev)){s.throne.deposed=[...new Set([...(s.throne.deposed||[]),prev])];s.persons[prev].deposed=true}
 const wasInterrupted=!!(s.throne.dynasty&&!s.throne.dynasty.orthodox)||s.throne.displaced;
 s.throne.orthodox=id;s.throne.lastOrthodox=id;s.throne.occupant=id;s.throne.displaced=false;
 s.throne.claimants=s.throne.claimants.filter(c=>c.id!==id);if(s.throne.heir===id)s.throne.heir=null;
 if(wasInterrupted){s.throne.restorations=(s.throne.restorations||0)+1;s.throne.dynasty={id:'han',name:['Han','汉'],orthodox:true,founder:GAOZU};}
 s.persons[id].reignStart={year:s.year,month:s.month};
 s.throne.history.push({id,year:s.year,month:s.month,process,status:'orthodox_han_emperor',restored:wasInterrupted});
 if(ageOf(s,id)<15&&!s.throne.regent){const regent=pickRegent(s,id);if(regent)s.throne.regent=regent}
 log(['%NAME% is enthroned as orthodox Han emperor ('+process.replace(/_/g,' ')+').','%NAME%以正统汉帝身份即位。'],{who:id});
 return {ok:true,restored:wasInterrupted};
}
function pickRegent(s,ward){
 const holder=s.court.offices.dasima;if(holder&&alive(s,holder))return holder;
 const dowager=Object.values(s.persons).find(p=>p.alive&&p.role==='dowager');return dowager?.id||null;
}

// ---------- non-Liu power ----------
export function establishRegency(s,regentId,{log=()=>{}}={}){
 const ward=s.throne.orthodox;if(!ward)return {ok:false,reason:'no_emperor'};
 if(!alive(s,regentId))return {ok:false,reason:'deceased'};
 const control=s.court.control?.[regentId]||0;if(control<45&&ageOf(s,ward)>=15)return {ok:false,reason:'insufficient_control'};
 s.throne.regent=regentId;s.throne.deFacto=regentId;s.persons[regentId].regent=true;
 log(['%NAME% becomes regent; the Liu emperor keeps the throne.','%NAME%出任摄政，刘氏皇帝仍在位。'],{who:regentId});return {ok:true};
}
// A powerful minister replaces one Liu ruler with another Liu (Huo Guang deposed
// Liu He in 74 BCE by this route). The replacement is crowned through crown().
export function deposeAndReplace(s,actorId,replacementId,{log=()=>{}}={}){
 const control=s.court.control?.[actorId]||0;if(control<60)return {ok:false,reason:'insufficient_control'};
 const old=s.throne.orthodox;if(!old)return {ok:false,reason:'no_emperor'};
 if(replacementId===old)return {ok:false,reason:'same'};
 // The actor's faction swings behind the replacement; others follow his control.
 s.throne.support[replacementId]=Object.fromEntries(Object.keys(s.court.factions).map(f=>[f,Math.min(100,control+(s.persons[actorId]?.courtFaction===f?20:0))]));
 const r=crown(s,replacementId,'regency_installation',{log});if(!r.ok)return r;
 s.throne.regent=actorId;s.throne.deFacto=actorId;s.throne.puppet=replacementId;
 log(['%NAME% deposes the emperor and installs another Liu.','%NAME%废立天子，另立刘氏。'],{who:actorId});
 return {ok:true,deposed:old};
}
// Seizing the throne. A non-Liu can occupy it and found a dynasty but is
// classified as usurper/founder; the orthodox title is left with the
// displaced Liu (or vacant), never transferred.
export function seizeThrone(s,actorId,{dynastyName=null,log=()=>{}}={}){
 if(!alive(s,actorId))return {ok:false,reason:'deceased'};
 if(isLiuClan(s,actorId))return {ok:false,reason:'liu_must_claim'}; // a Liu contests through claims
 const control=s.court.control?.[actorId]||0;if(control<70)return {ok:false,reason:'insufficient_control'};
 const displaced=s.throne.orthodox;
 if(displaced){s.throne.displaced=true;if(s.persons[displaced])s.persons[displaced].displaced=true}
 s.throne.lastOrthodox=displaced||s.throne.lastOrthodox;s.throne.orthodox=null;s.throne.occupant=actorId;s.throne.regent=null;s.throne.puppet=null;s.throne.deFacto=actorId;
 const name=dynastyName||['New dynasty of '+(s.persons[actorId].name?.[0]||actorId),(s.persons[actorId].name?.[1]||actorId)+'新朝'];
 s.throne.dynasty={id:'usurper-'+actorId,name,orthodox:false,founder:actorId,founded:{year:s.year,month:s.month}};
 s.throne.usurpations=(s.throne.usurpations||0)+1;
 s.throne.history.push({id:actorId,year:s.year,month:s.month,process:'usurpation',status:'new_dynasty_founder'});
 if(displaced&&alive(s,displaced)&&!s.throne.claimants.some(c=>c.id===displaced))s.throne.claimants.push({id:displaced,since:{year:s.year,month:s.month},loyalist:true});
 log(['%NAME% proclaims a new dynasty. This is usurpation, not Han succession.','%NAME%篡位建立新朝。此为篡位，并非汉室继承。'],{who:actorId});
 return {ok:true,displaced};
}
export function addClaimant(s,id,{loyalist=false}={}){
 if(!isLiuClan(s,id)||!alive(s,id))return {ok:false,reason:'not_liu'};
 if(s.throne.orthodox===id||s.throne.claimants.some(c=>c.id===id))return {ok:false,reason:'already'};
 s.throne.claimants.push({id,since:{year:s.year,month:s.month},loyalist});return {ok:true};
}

// ---------- surname, marriage, adoption ----------
// None of these touch genealogy.
export function changeSurname(s,id,surname,{granted=false}={}){
 const p=s.persons[id];if(!p)return {ok:false};p.surname=surname;if(granted)p.grantedSurname=true;return {ok:true,lineage:isLiuClan(s,id)};
}
export function marry(s,a,b){
 const pa=s.persons[a],pb=s.persons[b];if(!pa||!pb||!pa.alive||!pb.alive)return {ok:false};
 pa.spouse=[...new Set([...(pa.spouse||[]),b])];pb.spouse=[...new Set([...(pb.spouse||[]),a])];return {ok:true};
}
// Han practice allowed a clan member to be made heir (为后) of another clan
// branch. Adoption of an outsider is recorded as a legal relationship only.
export function adopt(s,adopter,adoptee){
 const child=s.persons[adoptee];if(!child||!s.persons[adopter])return {ok:false};
 child.legalFather=adopter;
 const within=isLiuClan(s,adopter)&&isLiuClan(s,adoptee);
 if(within)child.legalHeirOf=adopter;
 return {ok:true,withinClan:within};
}
export function barFromRegister(s,id){const p=s.persons[id];if(!p)return {ok:false};p.barred=true;return {ok:true}}

// ---------- invariant enforcement (tick + load) ----------
export function enforceDynasticInvariants(s,{log=()=>{}}={}){
 const t=s.throne,fixes=[];
 t.claimants=(t.claimants||[]).filter(c=>{const ok=isLiuClan(s,c.id)&&alive(s,c.id)&&!s.persons[c.id]?.barred;if(!ok)fixes.push('claimant:'+c.id);return ok});
 if(t.orthodox&&!eligibility(s,t.orthodox).ok){
  const bad=t.orthodox,liu=isLiuClan(s,bad);fixes.push('orthodox:'+bad);t.orthodox=null;
  if(!liu&&alive(s,bad)){t.occupant=bad;t.deFacto=bad;if(!t.dynasty||t.dynasty.orthodox)t.dynasty={id:'usurper-'+bad,name:[`Unrecognised regime of ${s.persons[bad]?.name?.[0]||bad}`,`${s.persons[bad]?.name?.[1]||bad}之伪政权`],orthodox:false,founder:bad,founded:{year:s.year,month:s.month}};
   log(['A non-Liu ruler cannot be orthodox; the court record classifies %NAME% as a usurper.','非刘氏者不得为正统；史官将%NAME%记为篡位者。'],{who:bad})}
 }
 if(t.heir&&!isLiuClan(s,t.heir)){fixes.push('heir:'+t.heir);t.heir=null}
 if(t.dynasty?.orthodox&&t.dynasty.founder!==GAOZU){fixes.push('dynasty');t.dynasty={...t.dynasty,orthodox:false}}
 if(t.puppet&&t.puppet!==t.orthodox)t.puppet=null;
 return fixes;
}
export function dynasticSummary(s){
 const t=s.throne;return {orthodox:t.orthodox,occupant:t.occupant,regent:t.regent,deFacto:t.deFacto,dynasty:t.dynasty,claimants:t.claimants.map(c=>c.id),orthodoxIsLiu:!t.orthodox||isLiuClan(s,t.orthodox)};
}
