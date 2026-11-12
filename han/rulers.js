// Foreign courts in the Han campaign. Unrecorded names are explicitly game fiction.
import {FACTIONS} from './data.js?v=han-1';
import {EURASIAN_RULERS} from './eurasia-data.js';
import {recordBirth} from './dynasty.js?v=han-1';
import {clamp,log} from './util.js?v=han-1';

const TITLES={huhanye:['Chanyu','单于'],zhizhi:['Chanyu','单于'],wusun:['Greater Kunmi','大昆弥'],wusun_lesser:['Lesser Kunmi','小昆弥'],kangju:['King of Kangju','康居王'],dayuan:['King of Dayuan','大宛王'],parthia:['King of Kings','万王之王'],armenia:['King of Armenia','亚美尼亚王'],commagene:['King of Commagene','科马吉尼王']};
const POOLS={
 parthian:[['Vardanes','瓦尔达内斯'],['Phraates','弗拉特斯'],['Artabanus','阿尔塔巴努斯'],['Pacorus','帕科鲁斯']],
 western:[['Aram','阿拉姆'],['Tigranes','提格兰'],['Artaxias','阿尔塔克西亚斯'],['Mithridates','米特里达梯']],
 steppe:[['Tulan','图兰'],['Boru','博鲁'],['Yazgan','亚兹干'],['Kulan','库兰']],
 yuezhi:[['Vima','维玛'],['Kada','迦达'],['Yasa','亚萨'],['Mora','莫拉']],
 saka:[['Mauka','毛迦'],['Ranu','拉努'],['Saka','塞迦'],['Vara','瓦拉']],
 sogdian:[['Varkhuman','瓦尔库曼'],['Nana','娜娜'],['Roxan','罗珊'],['Bagha','巴伽']],
 oasis:[['Yana','耶那'],['Vira','毗罗'],['Nanda','难陀'],['Mitra','密多']]
};
const culture=f=>{const c=FACTIONS[f]?.culture||'oasis';return ['xiongnu','wusun','qiang'].includes(c)?'steppe':c};
export const rulerTitle=f=>TITLES[f]||(FACTIONS[f]?.state==='yuezhi_chiefdom'?['Xihou chief','翕侯']:FACTIONS[f]?.state==='urban_community'?['Council head','城邦首领']:FACTIONS[f]?.state==='confederation'?['High chief','联盟首领']:['steppe','saka','yuezhi'].includes(culture(f))?['Chief','首领']:['King','国王']);
const hash=x=>{let h=2166136261;for(const c of x)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h>>>0};
function makeRuler(s,f,predecessor=null){
 const n=(s.nextRuler=(s.nextRuler||0)+1),id=`sim-ruler-${f}-${n}`,pool=POOLS[culture(f)]||POOLS.oasis;
 const name=pool[hash(`${s.seed}:${f}:${n}`)%pool.length],sex=hash(`${id}:sex`)%7===0?'f':'m',birth=s.year-18-hash(`${id}:age`)%16;
 const kin=predecessor?.birth!=null&&s.genealogy[predecessor.id]&&birth-predecessor.birth>=14;
 const p={id,name:[...name],surname:null,birthSurname:null,sex,birth,death:null,father:kin&&predecessor.sex==='m'?predecessor.id:null,mother:kin&&predecessor.sex==='f'?predecessor.id:null,politicalPredecessor:predecessor?.id||null,
  faction:f,role:'ruler',record:'fictional',alive:true,ambition:30+hash(`${id}:ambition`)%61,competence:35+hash(`${id}:competence`)%51,military:35+hash(`${id}:military`)%56,loyalty:100,portraitSeed:hash(`${s.seed}:${id}:portrait`),
  note:['Original character created for this campaign; no historical personal name is asserted.','本战役原创人物，不作为史载国王名讳。']};
 s.persons[id]=p;recordBirth(s,{id,father:p.father,mother:p.mother,birthSurname:null,birth:p.birth,sex});return p;
}
function seat(s,f,p,old=null){
 s.rulers[f]={id:p.id,personId:p.id,name:[...p.name],title:rulerTitle(f),faction:f,record:p.record,attested:p.record==='historical'&&!p.titleOnly,source:p.source||null,portraitSeed:p.portraitSeed??hash(`${s.seed}:${p.id}:portrait`),since:{year:s.year,month:s.month},predecessor:old?.id||null};
 if(old){const stability=s.factions[f]?.stability;if(stability!=null)s.factions[f].stability=clamp(stability-(p.father===old.id||p.mother===old.id?2:5));
  log(s,[`${p.name[0]} succeeds ${old.name[0]} as ${rulerTitle(f)[0]}.`,`${p.name[1]}继${old.name[1]}为${rulerTitle(f)[1]}。`],{kind:'succession',faction:f,who:p.id});}
 return s.rulers[f];
}
export function ensureForeignRulers(s){
 s.rulers||={};s.nextRuler||=0;
 for(const [f,realm] of Object.entries(s.factions)){
  if(f==='han'||f==='han_loyalist'||f==='rival_court'||realm.defeated)continue;
  const saved=s.rulers[f];
  if(saved){
   const id=saved.personId||saved.id;
   if(!s.persons[id]){const attested=EURASIAN_RULERS.find(r=>r.id===id);s.persons[id]={id,name:[...(saved.name||attested?.name||[id,id])],faction:f,role:'ruler',record:saved.record||attested?.record||'fictional',source:saved.source||attested?.source||null,sex:'m',birth:null,death:null,alive:true,simulatedAge:50,ageBaseYear:s.year,ambition:50,competence:55,military:55,portraitSeed:saved.portraitSeed??hash(`${s.seed}:${id}:portrait`)}}
   saved.personId=id;saved.title||=rulerTitle(f);saved.portraitSeed??=s.persons[id].portraitSeed??hash(`${s.seed}:${id}:portrait`);continue;
  }
  const p=Object.values(s.persons).find(x=>x.faction===f&&x.role==='ruler'&&x.alive)||(()=>{const historical=EURASIAN_RULERS.find(r=>r.faction===f);if(!historical)return makeRuler(s,f);const person={...historical,name:[...historical.name],role:'ruler',sex:'m',birth:null,death:null,alive:true,simulatedAge:50,ageBaseYear:s.year,ambition:55,competence:60,military:60,portraitSeed:hash(`${s.seed}:${historical.id}:portrait`)};s.persons[person.id]=person;return person})();
  seat(s,f,p);
 }
}
export function advanceForeignRulers(s){
 ensureForeignRulers(s);
 for(const [f,r] of Object.entries(s.rulers)){
  if(!s.factions[f]||s.factions[f].defeated||s.persons[r.personId||r.id]?.alive)continue;
  const old=s.persons[r.personId||r.id];
  const heirs=Object.values(s.persons).filter(p=>p.faction===f&&p.alive&&p.role!=='ruler'&&(p.father===old?.id||p.mother===old?.id));
  const successor=heirs.sort((a,b)=>(b.competence||0)-(a.competence||0))[0]||makeRuler(s,f,old);
  successor.role='ruler';seat(s,f,successor,r);
 }
}
export function rulerMilitaryJudgment(s,f){const p=s.persons[s.rulers?.[f]?.personId];return p?.alive?Math.max(0.65,Math.min(1.05,0.65+(p.military??50)/300)):0.8}
export function rulerGovernanceFactor(s,f){const p=s.persons[s.rulers?.[f]?.personId];return p?.alive?0.9+clamp(p.competence??50)/500:1}
export function rulerPortrait(s,f){
 const r=s.rulers?.[f],p=s.persons[r?.personId];if(!r||!p)return null;
 if(p.portrait)return `../assets/portraits/${p.portrait}-128.jpg`;
 const v=r.portraitSeed??0,skin=['#af805c','#c39a70','#956b4f','#c6a17e'][v%4],robe=FACTIONS[f]?.color||'#655340',hair=(v&1)?'#392c27':'#514034';
 const crown=['parthian','western'].includes(culture(f))?'<path d="M19 26 L25 13 L35 21 L44 12 L53 20 L61 13 L65 26" fill="#a79059" stroke="#3a3024" stroke-width="2"/>':culture(f)==='steppe'?'<path d="M18 30 Q40 4 62 30 L56 23 Q40 13 24 23 Z" fill="#76634b"/>':'<path d="M19 28 Q40 17 61 28" fill="none" stroke="#b6a16b" stroke-width="4"/>';
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#302c25"/><path d="M3 80 Q9 56 31 55 H49 Q71 56 77 80" fill="${robe}"/><path d="M29 56 Q40 68 51 56" fill="${skin}"/><ellipse cx="40" cy="38" rx="${17+(v>>>5)%5}" ry="${21+(v>>>9)%5}" fill="${skin}"/><path d="M20 34 Q18 13 40 14 Q62 13 60 34 L55 24 Q40 19 25 27 Z" fill="${hair}"/>${crown}<path d="M28 37 h7 m10 0 h7 M39 41 l-2 10 h5 M34 55 q6 3 12 0" fill="none" stroke="#46352e" stroke-width="1.5"/><path d="M${27+(v>>>13)%8} 76 l6 -8 m${9+(v>>>17)%7} 8 l-6 -8" stroke="#d1b787" stroke-width="2"/><path d="M20 80 H60" stroke="#d1b787" stroke-width="3"/></svg>`;
 return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
