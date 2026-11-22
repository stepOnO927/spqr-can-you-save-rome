// Foreign courts in the Han campaign. Unrecorded names are explicitly game fiction.
import {FACTIONS} from './data.js?v=han-1';
import {EURASIAN_RULERS} from './eurasia-data.js';
import {recordBirth} from './dynasty.js?v=han-1';
import {CULTURAL_NAME_POOLS,fieldCulture} from './field-identities.js';
import {clamp,log} from './util.js?v=han-1';

const TITLES={huhanye:['Chanyu','单于'],zhizhi:['Chanyu','单于'],wusun:['Greater Kunmi','大昆弥'],wusun_lesser:['Lesser Kunmi','小昆弥'],kangju:['King of Kangju','康居王'],dayuan:['King of Dayuan','大宛王'],parthia:['King of Kings','万王之王'],armenia:['King of Armenia','亚美尼亚王'],commagene:['King of Commagene','科马吉尼王']};
const culture=f=>{const c=FACTIONS[f]?.culture||'oasis';return ['xiongnu','wusun','qiang'].includes(c)?'steppe':c};
export function rulerTitle(f,person=null){
 const base=TITLES[f]||(FACTIONS[f]?.state==='yuezhi_chiefdom'?['Xihou chief','翕侯']:FACTIONS[f]?.state==='urban_community'?['Council head','城邦首领']:FACTIONS[f]?.state==='confederation'?['High chief','联盟首领']:['steppe','saka','yuezhi'].includes(culture(f))?['Chief','首领']:['King','国王']);
 if(person?.sex!=='f')return base;
 // These are gameplay descriptions of alternate-history rulers, not claims
 // that a specific female sovereign bore a documented ancient title.
 if(f==='parthia')return ['Ruling queen of Parthia','安息女王'];
 if(base[0]==='King')return ['Queen','女王'];
 if(base[0].startsWith('King of '))return [base[0].replace('King of ','Queen of '),base[1].replace(/王$/, '女王')];
 return base;
}
const hash=x=>{let h=2166136261;for(const c of x)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h>>>0};
function makeRuler(s,f,predecessor=null,{role='ruler',minimumAge=18}={}){
 let n=s.nextRuler||0,id;do{id=`sim-${role}-${f}-${++n}`}while(s.persons[id]);s.nextRuler=n;
 const pool=CULTURAL_NAME_POOLS[fieldCulture(f)]||CULTURAL_NAME_POOLS.oasis,names=pool.names;
 const start=hash(`${s.seed}:${f}:${n}`)%names.length,used=new Set(Object.values(s.persons).filter(p=>p.alive).map(p=>p.name?.[0]));
 let name=names.slice(start).concat(names.slice(0,start)).find(pair=>!used.has(pair[0]));
 if(!name){const court=FACTIONS[f]?.name||[f,f],base=names[start];name=[`${base[0]} of ${court[0]}`,`${court[1]}的${base[1]}`];for(let suffix=2;used.has(name[0]);suffix++)name=[`${base[0]} of ${court[0]} (${suffix})`,`${court[1]}的${base[1]}（${suffix}）`]}
 const sex=hash(`${id}:sex`)%7===0?'f':'m',birth=s.year-minimumAge-hash(`${id}:age`)%16;
 const kin=predecessor?.birth!=null&&s.genealogy[predecessor.id]&&birth-predecessor.birth>=14;
 const homeland=s.regions.find(r=>r.owner===f)?.id||null;
 const p={id,name:[...name],surname:null,birthSurname:null,sex,birth,death:null,father:kin&&predecessor.sex==='m'?predecessor.id:null,mother:kin&&predecessor.sex==='f'?predecessor.id:null,politicalPredecessor:predecessor?.id||null,
  faction:f,role,record:'fictional',culture:[...pool.culture],homeland,location:homeland,profession:role,title:role==='regent'?['Court regent','宫廷摄政']:rulerTitle(f,{sex}),spouse:[],history:[],alive:true,ambition:30+hash(`${id}:ambition`)%61,competence:35+hash(`${id}:competence`)%51,military:35+hash(`${id}:military`)%56,loyalty:100,portraitSeed:hash(`${s.seed}:${id}:portrait`),
  note:['Original character created for this campaign; no historical personal name is asserted.','本战役原创人物，不作为史载国王名讳。']};
 s.persons[id]=p;recordBirth(s,{id,father:p.father,mother:p.mother,birthSurname:null,birth:p.birth,sex});return p;
}
const isMinor=(s,p)=>Number.isFinite(p?.birth)&&s.year-p.birth<18;
function ensureRegency(s,f){
 const r=s.rulers[f],p=s.persons[r?.personId];if(!r||!p?.alive)return;
 if(!isMinor(s,p)){
  if(r.regentId){const former=s.persons[r.regentId];if(former?.regentFor===p.id)delete former.regentFor;delete r.regentId;
   if(f===s.player)log(s,[`${p.name[0]} comes of age and takes personal rule.`,`${p.name[1]}成年并亲自执政。`],{kind:'regency',faction:f,who:p.id});}
  return;
 }
 const seated=s.persons[r.regentId];
 if(seated?.alive&&seated.faction===f&&seated.regentFor===p.id&&!isMinor(s,seated))return;
 if(seated?.regentFor===p.id)delete seated.regentFor;
 const regent=makeRuler(s,f,p,{role:'regent',minimumAge:35});regent.regentFor=p.id;regent.title=['Court regent','宫廷摄政'];
 regent.history.push({year:s.year,month:s.month,kind:'regency',for:p.id});
 r.regentId=regent.id;
 if(f===s.player)log(s,[`${regent.name[0]} governs ${FACTIONS[f]?.name?.[0]||f} as regent for the minor ${p.name[0]}.`,`${regent.name[1]}为年幼的${p.name[1]}摄政，治理${FACTIONS[f]?.name?.[1]||f}。`],{kind:'regency',faction:f,who:regent.id});
}
function makeTitleOnlyRuler(s,f){
 const court=FACTIONS[f];let id=`unrecorded-ruler-${f}`,suffix=1;while(s.persons[id])id=`unrecorded-ruler-${f}-${++suffix}`;
 const name=[`Unnamed ruler of ${court.name[0]}`,`${court.name[1]}未载名的统治者`];
 const pool=CULTURAL_NAME_POOLS[fieldCulture(f)]||CULTURAL_NAME_POOLS.oasis;
 const p={id,name,faction:f,role:'ruler',profession:'ruler',title:rulerTitle(f),record:'reconstruction',titleOnly:true,source:court.source||null,culture:[...pool.culture],homeland:null,location:null,sex:null,birth:null,death:null,alive:true,simulatedAge:50,ageBaseYear:s.year,
  ambition:50,competence:50,military:50,loyalty:100,portraitSeed:hash(`${s.seed}:${id}:portrait`),note:['The polity is documented, but no contemporary personal name is asserted.','政体见于史料，不推定此时统治者的姓名。']};
 s.persons[id]=p;return p;
}
function seat(s,f,p,old=null){
 if(old?.regentId&&s.persons[old.regentId]?.regentFor===old.personId)delete s.persons[old.regentId].regentFor;
 if(old&&(p.record==='fictional'||p.record==='simulated'))(p.history||=[]).push({year:s.year,month:s.month,kind:'succession',predecessor:old.id});
 const title=rulerTitle(f,p);
 if(['fictional','simulated'].includes(p.record))p.title=[...title];
 s.rulers[f]={id:p.id,personId:p.id,name:[...p.name],title,faction:f,record:p.record,titleOnly:!!p.titleOnly,attested:p.record==='historical'&&!p.titleOnly,source:p.source||null,sex:p.sex??null,birth:p.birth??null,culture:Array.isArray(p.culture)?[...p.culture]:null,homeland:p.homeland??null,portraitSeed:p.portraitSeed??hash(`${s.seed}:${p.id}:portrait`),since:{year:s.year,month:s.month},predecessor:old?.id||null};
 if(old){const stability=s.factions[f]?.stability;if(stability!=null)s.factions[f].stability=clamp(stability-(p.father===old.id||p.mother===old.id?2:5));
  if(f===s.player)log(s,[`${p.name[0]} succeeds ${old.name[0]} as ${title[0]}.`,`${p.name[1]}继${old.name[1]}为${title[1]}。`],{kind:'succession',faction:f,who:p.id});}
 return s.rulers[f];
}
export function ensureForeignRulers(s){
 s.rulers||={};s.nextRuler||=0;
 // Older saves may contain a generated monarch for the temporary rebel army.
 // Keep the person for recorded history, but stop presenting a rebel kingdom.
 delete s.rulers.rebels;
 for(const [f,realm] of Object.entries(s.factions)){
  // A peasant rising is an armed faction, not a new foreign monarchy.
  if(f==='han'||f==='han_loyalist'||f==='rival_court'||f==='rebels'||realm.defeated)continue;
  const saved=s.rulers[f];
  if(saved){
   const id=saved.personId||saved.id;
   if(!s.persons[id]){
    const attested=EURASIAN_RULERS.find(r=>r.id===id),lineage=s.genealogy?.[id],pool=CULTURAL_NAME_POOLS[fieldCulture(f)]||CULTURAL_NAME_POOLS.oasis;
    const sex=['m','f'].includes(lineage?.sex)?lineage.sex:['m','f'].includes(saved.sex)?saved.sex:attested?'m':/^(Queen|Ruling queen)/i.test(saved.title?.[0]||'')?'f':null;
    const birth=Number.isFinite(lineage?.birth)?lineage.birth:Number.isFinite(saved.birth)?saved.birth:null;
    const homeland=saved.homeland??null;
    s.persons[id]={id,name:[...(saved.name||attested?.name||[id,id])],faction:f,role:'ruler',profession:'ruler',record:saved.record||attested?.record||'fictional',titleOnly:!!saved.titleOnly||saved.record==='reconstruction',title:[...(saved.title||rulerTitle(f,{sex}))],source:saved.source||attested?.source||null,sex,birth,father:lineage?.father??null,mother:lineage?.mother??null,culture:Array.isArray(saved.culture)?[...saved.culture]:[...pool.culture],homeland,location:homeland,death:null,alive:true,...(birth==null?{simulatedAge:50,ageBaseYear:s.year}:{}),ambition:50,competence:55,military:55,portraitSeed:saved.portraitSeed??hash(`${s.seed}:${id}:portrait`)};
   }
   const person=s.persons[id],former=rulerTitle(f),current=rulerTitle(f,person);
   // A historical artwork belongs to the recorded person, not merely a
   // reused throne ID. Preserve a saved custom portrait and altered identity.
   const attested=EURASIAN_RULERS.find(r=>r.id===id&&r.faction===f);
   if(attested?.portrait&&person.record==='historical'&&person.name?.[0]===attested.name[0])person.portrait??=attested.portrait;
   if(person.titleOnly||saved.titleOnly){person.culture??=[...(CULTURAL_NAME_POOLS[fieldCulture(f)]||CULTURAL_NAME_POOLS.oasis).culture];person.profession??='ruler';person.homeland??=null;person.location??=null}
   saved.personId=id;if(!saved.title||person.sex==='f'&&JSON.stringify(saved.title)===JSON.stringify(former))saved.title=[...current];
   if(person.sex==='f'&&['fictional','simulated'].includes(person.record)&&(!person.title||JSON.stringify(person.title)===JSON.stringify(former)))person.title=[...current];
   saved.sex=person.sex??null;saved.birth=person.birth??null;saved.culture=Array.isArray(person.culture)?[...person.culture]:null;saved.homeland=person.homeland??null;
   saved.titleOnly??=!!person.titleOnly;saved.portraitSeed??=person.portraitSeed??hash(`${s.seed}:${id}:portrait`);ensureRegency(s,f);continue;
  }
  const p=Object.values(s.persons).find(x=>x.faction===f&&x.role==='ruler'&&x.alive)||(()=>{const historical=EURASIAN_RULERS.find(r=>r.faction===f);if(!historical)return !FACTIONS[f]||FACTIONS[f].dynamic?makeRuler(s,f):makeTitleOnlyRuler(s,f);const person={...historical,name:[...historical.name],role:'ruler',sex:'m',birth:null,death:null,alive:true,simulatedAge:50,ageBaseYear:s.year,ambition:55,competence:60,military:60,portraitSeed:hash(`${s.seed}:${historical.id}:portrait`)};s.persons[person.id]=person;return person})();
  seat(s,f,p);ensureRegency(s,f);
 }
}
export function advanceForeignRulers(s){
 ensureForeignRulers(s);
 for(const [f,r] of Object.entries(s.rulers)){
  if(!s.factions[f]||s.factions[f].defeated||s.persons[r.personId||r.id]?.alive)continue;
  const old=s.persons[r.personId||r.id];
  const heirs=Object.values(s.persons).filter(p=>p.faction===f&&p.alive&&p.role!=='ruler'&&(p.father===old?.id||p.mother===old?.id));
  const successor=heirs.sort((a,b)=>(b.competence||0)-(a.competence||0))[0]||makeRuler(s,f,old);
  successor.role='ruler';seat(s,f,successor,r);ensureRegency(s,f);
 }
}
export function foreignRegent(s,f){const r=s.rulers?.[f],ruler=s.persons[r?.personId],regent=s.persons[r?.regentId];return ruler?.alive&&isMinor(s,ruler)&&regent?.alive?regent:null}
const governingPerson=(s,f)=>foreignRegent(s,f)||s.persons[s.rulers?.[f]?.personId];
export function rulerMilitaryJudgment(s,f){const p=governingPerson(s,f);return p?.alive?Math.max(0.65,Math.min(1.05,0.65+(p.military??50)/300)):0.8}
export function rulerGovernanceFactor(s,f){const p=governingPerson(s,f);return p?.alive?0.9+clamp(p.competence??50)/500:1}
function portraitFor(s,f,p,v){
 if(!p)return null;
 if(p.portrait)return `../assets/portraits/${p.portrait}-128.jpg`;
 const skin=['#af805c','#c39a70','#956b4f','#c6a17e'][v%4],robe=FACTIONS[f]?.color||'#655340',hair=(v&1)?'#392c27':'#514034';
 const crown=['parthian','western'].includes(culture(f))?'<path d="M19 26 L25 13 L35 21 L44 12 L53 20 L61 13 L65 26" fill="#a79059" stroke="#3a3024" stroke-width="2"/>':culture(f)==='steppe'?'<path d="M18 30 Q40 4 62 30 L56 23 Q40 13 24 23 Z" fill="#76634b"/>':'<path d="M19 28 Q40 17 61 28" fill="none" stroke="#b6a16b" stroke-width="4"/>';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#302c25"/><path d="M3 80 Q9 56 31 55 H49 Q71 56 77 80" fill="${robe}"/><path d="M29 56 Q40 68 51 56" fill="${skin}"/><ellipse cx="40" cy="38" rx="${17+(v>>>5)%5}" ry="${21+(v>>>9)%5}" fill="${skin}"/><path d="M20 34 Q18 13 40 14 Q62 13 60 34 L55 24 Q40 19 25 27 Z" fill="${hair}"/>${crown}<path d="M28 37 h7 m10 0 h7 M39 41 l-2 10 h5 M34 55 q6 3 12 0" fill="none" stroke="#46352e" stroke-width="1.5"/><path d="M${27+(v>>>13)%8} 76 l6 -8 m${9+(v>>>17)%7} 8 l-6 -8" stroke="#d1b787" stroke-width="2"/><path d="M20 80 H60" stroke="#d1b787" stroke-width="3"/></svg>`;
 return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
export function rulerPortrait(s,f){const r=s.rulers?.[f];return r?portraitFor(s,f,s.persons[r.personId],r.portraitSeed??0):null}
export function regentPortrait(s,f){const p=foreignRegent(s,f);return p?portraitFor(s,f,p,p.portraitSeed??0):null}
