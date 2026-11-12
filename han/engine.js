// MANDATE OF HEAVEN — campaign engine. Independent of the Roman engine: the
// Roman campaign, its saves and its modules are untouched. Han saves use
// their own storage keys and carry dlc:'mandate-of-heaven'.
import {START,REGIONS,FACTIONS,PLAYABLE,OASIS} from './data.js?v=han-1';
import {EURASIAN_FACTIONS,EURASIAN_RULERS} from './eurasia-data.js';
import {initDependencies,advanceDependencies,changeDependency} from './dependencies.js';
import {PEOPLE,PERSON,SURNAMES,GIVEN} from './people.js?v=han-1';
import {recordBirth,crown,enforceDynasticInvariants,isLiuClan,eligibility,statusOf,yearsBetween,claimStrength} from './dynasty.js?v=han-1';
import {initCourt,advanceCourt,resolveSuccession,computeMandate,recomputeInfluence,appoint,issueEdict,EDICTS,adminCapacity,emperorAuthority} from './court.js?v=han-1';
import {initIntel,initProtectorate,advanceFrontier,atWar,relation,setRelation,access,observe} from './frontier.js?v=han-1';
import {initSilk,advanceSilk} from './silk-road.js?v=han-1';
import {initializeEasternMarkets,advanceEasternMarkets} from './markets.js?v=faces-of-empire-1';
import {advanceFocus,focusState} from './focus.js?v=han-1';
import {PRESETS,marchMonths,routeBetween,supplyFor,resolveBattle,templateStats,cultureOf,recruit,recruitQuote,neighbours} from './military.js?v=han-1';
import {roll,clamp,log,advanceDate,monthIndex} from './util.js?v=han-1';
import {ensureFieldCommanders} from './field-identities.js';
import {ensureForeignRulers,advanceForeignRulers} from './rulers.js';

export const DLC_ID='mandate-of-heaven',SAVE_VERSION='han-1';
export const SCENARIOS={
 historical:{name:['49 BCE — Emperor Xuan and the Western Regions','公元前49年 — 宣帝西域'],note:['January 49 BCE: Emperor Xuan reigns; Liu Shi is crown prince.','公元前49年正月：汉宣帝在位，刘奭为太子。'],alternate:false},
 usurper:{name:['Alternate: The Grand Marshal’s Shadow','架空：大司马之影'],note:['Alternate history. The fictional Pang Chong dominates the inner court.','架空历史。虚构人物庞崇把持中朝。'],alternate:true},
 disputed:{name:['Alternate: The Huaiyang Question','架空：淮阳之争'],note:['Alternate history. Emperor Xuan dies without a settled heir; Liu Shi and Liu Qin dispute the throne.','架空历史。宣帝崩而储位未定，刘奭与刘钦争位。'],alternate:true}
};

const STARTING_OFFICES={chengxiang:'yu-dingguo',yushi:'chen-wannian',dasima:'shi-gao',qianjiangjun:'xiao-wangzhi',zhongshu:'hong-gong',dasinong:null,zongzheng:'liu-xiang',duhu:null,hexi:'fictional-zhao-lie',jingzhao:null};
const RES={han:{treasury:600,grain:500,manpower:60000,horses:20000,stability:62},huhanye:{treasury:40,grain:40,manpower:30000,horses:60000,stability:55},zhizhi:{treasury:60,grain:60,manpower:40000,horses:80000,stability:60},wusun:{treasury:40,grain:50,manpower:25000,horses:60000,stability:50},wusun_lesser:{treasury:30,grain:40,manpower:18000,horses:40000,stability:55},kangju:{treasury:60,grain:60,manpower:30000,horses:50000,stability:55},dayuan:{treasury:70,grain:90,manpower:20000,horses:30000,stability:60}};
const ARMY=(owner,region,template,men,commander=null)=>({owner,region,template,men,commander});
const OPENING_ARMIES=[
 ARMY('han','changan','field',20000,'feng-fengshi'),ARMY('han','henan','field',12000),ARMY('han','shuofang','garrison',8000),ARMY('han','yunzhong','garrison',6000),
 ARMY('han','wuwei','garrison',6000,'fictional-zhao-lie'),ARMY('han','dunhuang','garrison',4000),ARMY('han','wulei','garrison',3000,'gan-yanshou'),ARMY('han','beidi','cavalry',6000),ARMY('han','yanmen','garrison',5000),
 ARMY('huhanye','monan','chanyu',20000),ARMY('zhizhi','mobei','chanyu',30000),ARMY('zhizhi','mobei','raiders',10000),
 ARMY('wusun','wusun','wusun_host',18000),ARMY('wusun_lesser','wusun_lesser','wusun_host',12000),ARMY('kangju','kangju','kangju_host',20000),ARMY('dayuan','dayuan','town',12000),
 ...OASIS.map(o=>ARMY(o,REGIONS.find(r=>r.owner===o).id,'town',o==='qiuci'?5000:2500)),
 ARMY('wujie','wujie','raiders',5000),ARMY('jiankun','jiankun','raiders',8000),ARMY('qiang','qiang','qiang_band',8000)
];

// player:null runs every Han, steppe and oasis power as an NPC (the mode used
// inside the Roman campaign). start:'roman' opens in January 49 BCE, before
// Emperor Xuan's recorded death, to share the Roman calendar.
export function newHanGame(player='han',{scenario='historical',difficulty='standard',seed=null,start='roman'}={}){
 if(player!==null&&!PLAYABLE.includes(player))throw new Error('Unplayable faction '+player);
 const startYear=start==='roman'?-49:START.year,startMonth=start==='roman'?1:START.month;
 const s={dlc:DLC_ID,version:SAVE_VERSION,scenario,difficulty,player,seed:seed??(Date.now()%2147483647),year:startYear,month:startMonth,startMode:start,scheduled:[],
  regions:REGIONS.map(r=>({...r,name:[...r.name]})),factions:{},armies:[],persons:{},genealogy:{},
  throne:{orthodox:null,lastOrthodox:'liu-xun',occupant:null,regent:null,deFacto:null,heir:null,puppet:null,claimants:[],deposed:[],support:{},history:[],dynasty:{id:'han',name:['Han','汉'],orthodox:true,founder:'liu-bang'},restorations:0,usurpations:0,displaced:false},
  relations:{},treaties:[],wars:[],proposals:[],pendingRequests:[],coalitions:[],focus:{},templates:{},log:[],taxLevel:'normal',militaryRecord:0,crises:[],stats:{provenAudits:0,battlesWon:0,startMonth:0},finalized:null};
 s.stats.startMonth=monthIndex(s);
 for(const id of Object.keys(FACTIONS))if(!FACTIONS[id].dynamic)s.factions[id]={id,...(RES[id]||{treasury:20,grain:30,manpower:6000,horses:3000,stability:55})};
 // people and their birth records (historical records come from people.js)
 for(const p of PEOPLE){
  // anyone with a recorded death in or before January 48 BCE is dead at the start
  s.persons[p.id]={...p,name:[...p.name],alive:p.death==null||p.death>startYear,spouse:[...(p.spouse||[])]};
  recordBirth(s,{id:p.id,father:p.father,mother:p.mother,birthSurname:p.birthSurname,birth:p.birth,sex:p.sex});
 }
 for(const f of ['liu-shi','liu-xun'])s.throne.support[f]=Object.fromEntries(['waiqi','ru','huanguan','frontier','haoqiang'].map(k=>[k,80]));
 if(start==='roman'){
  // January 49 BCE: Emperor Xuan reigns; Liu Shi is crown prince. Xuan's death
  // on 10 January 48 BCE and his deathbed appointment of regents are recorded
  // events and happen on schedule; what follows is simulated.
  initCourt(s,{...STARTING_OFFICES,dasima:null,qianjiangjun:null});
  s.persons['shi-gao'].office=null;s.persons['xiao-wangzhi'].office=null;
  s.persons['liu-xun'].scheduledDeath=true;s.persons['liu-shi'].role='prince';
  crown(s,'liu-xun','accession',{force:true});s.throne.history[0]={id:'liu-xun',year:-74,month:9,process:'accession',status:'orthodox_han_emperor',note:'10 September 74 BCE'};
  s.throne.heir='liu-shi';
  s.scheduled.push({year:-48,month:1,kind:'death',id:'liu-xun'},{year:-48,month:1,kind:'deathbed_regents'});
 }else{
  initCourt(s,STARTING_OFFICES);
  // the reigning emperor: Liu Shi, enthroned 29 January 48 BCE
  crown(s,'liu-shi','accession',{log:(t,m)=>log(s,t,{...m,kind:'throne'})});
  s.throne.history[0]={...s.throne.history[0],year:-48,month:1,note:'29 January 48 BCE'};
  s.persons['wang-zhengjun'].empress=false;s.pendingEmpress='wang-zhengjun';
 }
 s.court.offices.dasinong=null;
 for(const a of OPENING_ARMIES){const t=PRESETS[a.template];s.armies.push({id:`a${s.armies.length+1}`,owner:a.owner,region:a.region,men:a.men,morale:70,training:50,supply:100,template:{id:t.id,name:t.name,mix:{...t.mix}},commander:a.commander,move:null})}
 s.nextArmy=s.armies.length+1;
 // Regional forces and diplomacy use local resources; undated rulers are not invented.
 for(const f of Object.values(EURASIAN_FACTIONS)){const r=s.regions.find(x=>x.owner===f.id);if(!r||s.armies.some(a=>a.owner===f.id))continue;const t=PRESETS[['parthian','yuezhi','saka','sogdian'].includes(f.culture)?'kangju_host':'town'];s.armies.push({id:`a${s.armies.length+1}`,owner:f.id,region:r.id,men:f.id==='parthia'?7000:Math.min(3200,Math.max(600,Math.floor(s.factions[f.id].manpower/4))),morale:65,training:45,supply:90,template:{id:t.id,name:t.name,mix:{...t.mix}},commander:null,move:null})}
 s.nextArmy=s.armies.length+1;
 s.rulers=Object.fromEntries(EURASIAN_RULERS.map(p=>[p.faction,{...p,attested:true}]));
 ensureForeignRulers(s);
 initDependencies(s);
 // relations at the start of 49 BCE
 const R=(a,b,v)=>setRelation(s,a,b,v);
 R('han','huhanye',65);R('han','zhizhi',-30);R('huhanye','zhizhi',-70);R('han','wusun',60);R('han','wusun_lesser',30);R('wusun','wusun_lesser',10);
 R('han','kangju',0);R('zhizhi','kangju',10);R('kangju','wusun',-20);R('han','dayuan',25);R('han','qiang',-10);R('zhizhi','wujie',-20);R('zhizhi','jiankun',-20);
 for(const o of OASIS){R('han',o,45);R('zhizhi',o,0)}
 s.treaties.push({type:'tributary',parties:['huhanye','han'],since:monthIndex(s)-36,note:'51 BCE'},{type:'marriage',parties:['wusun','han'],since:monthIndex(s)-600,note:'Princess Jieyou'});
 initProtectorate(s);initSilk(s);initIntel(s);initializeEasternMarkets(s);
 if(scenario==='usurper')applyUsurperScenario(s);
 if(scenario==='disputed')applyDisputedScenario(s);
 if(difficulty==='beginner'&&player)s.factions[player].treasury+=100;
 ensureFieldCommanders(s);computeMandate(s);recomputeInfluence(s);observe(s);
 if(start!=='roman')log(s,['Liu Shi has taken the throne. The court looks to the regents named by Emperor Xuan.','刘奭已即位，朝廷仰赖宣帝遗诏所命辅政大臣。'],{kind:'throne'});
 return s;
}
function applyUsurperScenario(s){
 s.persons['fictional-pang-chong'].office=null;appoint(s,'dasima','fictional-pang-chong');s.court.favor['fictional-pang-chong']=60;
 s.persons['shi-gao'].alive=false;s.persons['shi-gao'].death=-49;
 s.persons['liu-shi'].health=35;s.persons['fictional-su-heng'].empress=false;
 s.court.factions.haoqiang.influence=45;s.court.factions.waiqi.influence=35;recomputeInfluence(s);
 log(s,['Alternate history: Pang Chong holds the seal of the Grand Marshal.','架空历史：庞崇执大司马印。'],{kind:'throne'});
}
function applyDisputedScenario(s){
 s.throne.orthodox=null;s.throne.occupant=null;s.throne.history=[];s.throne.claimants=[{id:'liu-shi',since:{year:s.year,month:s.month}},{id:'liu-qin',since:{year:s.year,month:s.month}}];
 s.throne.support={'liu-shi':{ru:80,waiqi:70,huanguan:40,frontier:40,haoqiang:30},'liu-qin':{ru:30,waiqi:30,huanguan:60,frontier:60,haoqiang:70}};s.throne.paralysis=4;
 log(s,['Alternate history: no heir is confirmed; Liu Shi and Liu Qin each claim the throne.','架空历史：储位未定，刘奭与刘钦各自争位。'],{kind:'throne'});
}

// ---------- orders ----------
export function moveArmy(s,armyId,to,{owner=s.player}={}){
 const a=s.armies.find(x=>x.id===armyId);if(!a||a.owner!==owner||a.men<=0)return {ok:false,reason:'invalid'};
 if(a.forming)return {ok:false,reason:'forming'};
 const link=routeBetween(a.region,to);if(!link)return {ok:false,reason:'not_adjacent'};
 const dest=s.regions.find(r=>r.id===to);
 if(dest.owner&&dest.owner!==owner&&!atWar(s,owner,dest.owner)&&!access(s,owner,dest.owner))return {ok:false,reason:'no_access'};
 a.move={to,months:marchMonths(s,a,to),from:a.region};return {ok:true,months:a.move.months};
}
export function setTaxLevel(s,level){if(!['low','normal','high'].includes(level))return {ok:false};s.taxLevel=level;return {ok:true}}
export function designateHeir(s,id){
 if(s.player!=='han'&&s.player!=='han_loyalist')return {ok:false,reason:'not_han'};
 const e=eligibility(s,id);if(!e.ok)return {ok:false,reason:e.reasons[0]};
 s.throne.heir=id;s.throne.support[id]||={};for(const f of Object.keys(s.court.factions))s.throne.support[id][f]=Math.max(s.throne.support[id][f]||0,55);
 log(s,['%NAME% is named heir apparent.','立%NAME%为皇太子。'],{who:id,kind:'throne'});return {ok:true};
}
export function elevateEmpress(s,id){const p=s.persons[id];if(!p||p.sex!=='f'||!p.alive)return {ok:false};for(const q of Object.values(s.persons))q.empress=false;p.empress=true;s.pendingEmpress=null;s.court.factions.waiqi.influence+=5;log(s,['%NAME% is made empress.','立%NAME%为皇后。'],{who:id,kind:'court'});return {ok:true}}

// ---------- monthly simulation ----------
function economy(s){
 const capacity=s.court?adminCapacity(s)/100:0.6;
 for(const [id,f] of Object.entries(s.factions)){
  if(f.defeated)continue;const own=s.regions.filter(r=>r.owner===id);if(!own.length)continue;
  const taxRate=id==='han'||id==='han_loyalist'||id==='rival_court'?{low:0.7,normal:1,high:1.3}[s.taxLevel]*(s.taxRelief>0?0.6:1)+(focusState(s,id).mod.tax||0):1;
  const loyaltyF=r=>0.4+r.loyalty/150;
  const income=own.reduce((a,r)=>a+r.tax*loyaltyF(r),0)*0.12*(id==='han'?0.5+capacity:1)*taxRate*(s.throne.paralysis>0&&id==='han'?0.6:1);
  const grain=own.reduce((a,r)=>a+(r.grain+(r.irrigation||0))*loyaltyF(r),0)*0.27;
  const armies=s.armies.filter(a=>a.owner===id&&a.men>0);
  const upkeep=armies.reduce((a,x)=>a+x.men/1000*templateStats(x.template).cost*0.22,0);
  const eat=armies.reduce((a,x)=>a+x.men/1000*templateStats(x.template).grain*0.3,0);
  f.treasury=Math.round(f.treasury+income-upkeep);f.grain=Math.round(f.grain+grain-eat-own.reduce((a,r)=>a+r.pop*0.02,0));
  f.manpower=Math.round(Math.min(own.reduce((a,r)=>a+r.pop*1500,0),f.manpower+own.reduce((a,r)=>a+r.pop*4,0)));f.horses=Math.round((f.horses||0)+own.filter(r=>r.horses).length*150);
  if(id==='han'&&s.taxLevel==='high')for(const r of own)r.loyalty=clamp(r.loyalty-0.6);
  if(id==='han'&&s.taxLevel==='low')for(const r of own)r.loyalty=clamp(r.loyalty+0.4);
  if(f.treasury<0)f.stability=clamp(f.stability-1);if(f.grain<0)f.stability=clamp(f.stability-2);
 }
}
function movement(s){
 for(const a of s.armies.filter(x=>x.move&&x.men>0)){
  a.move.months--;
  if(a.move.months<=0){const dest=s.regions.find(r=>r.id===a.move.to);
   if(dest.owner&&dest.owner!==a.owner&&!atWar(s,a.owner,dest.owner)&&!access(s,a.owner,dest.owner)){a.move=null;continue}
   a.region=a.move.to;a.move=null;}
 }
 for(const a of s.armies)if(a.forming>0)a.forming--;
}
function supply(s){
 for(const a of s.armies.filter(x=>x.men>0)){
  const sp=supplyFor(s,a,{access:(x,y)=>access(s,x,y)});
  let att=sp.attrition;if(sp.fodderShort&&!(focusState(s,a.owner).mod.cavalrySupply))att+=0.01;
  if(att>0){a.men=Math.max(0,Math.round(a.men*(1-att)));a.supply=clamp(a.supply-10)}else a.supply=clamp(a.supply+10);
  a.training=clamp((a.training||0)+(a.move?0:1));a.morale=clamp(a.morale+(a.supply>60?1:-2));
 }
}
const skill=s=>a=>a.commander&&s.persons[a.commander]?.alive?(s.persons[a.commander].military||s.persons[a.commander].competence||50):45;
function battles(s){
 const regions=[...new Set(s.armies.filter(a=>a.men>0).map(a=>a.region))];
 for(const rid of regions){
  const here=s.armies.filter(a=>a.region===rid&&a.men>0&&!a.move);
  const owners=[...new Set(here.map(a=>a.owner))];
  for(let i=0;i<owners.length;i++)for(let j=i+1;j<owners.length;j++){
   const A=owners[i],B=owners[j];if(!atWar(s,A,B))continue;
   const region=s.regions.find(r=>r.id===rid);
   const defender=region.owner===B?B:region.owner===A?A:B,attacker=defender===A?B:A;
   const att=here.filter(a=>a.owner===attacker&&a.men>0),def=here.filter(a=>a.owner===defender&&a.men>0);if(!att.length||!def.length)continue;
   const result=resolveBattle(s,att,def,rid,{skill:skill(s),rand:()=>roll(s,'battle'+rid+A+B)});
   const winner=result.outcome==='attacker_won'||result.outcome==='defender_withdrew'?attacker:defender;
   if(winner===s.player)s.stats.battlesWon++;
   if(winner==='han')s.militaryRecord=clamp((s.militaryRecord||0)+1,-10,10);else if(attacker==='han'||defender==='han')s.militaryRecord=clamp((s.militaryRecord||0)-1,-10,10);
   if(result.outcome.endsWith('withdrew'))for(const x of (result.outcome==='defender_withdrew'?def:att)){const back=neighbourFor(s,x);if(back)x.region=back}
   else if(result.outcome==='attacker_won')for(const x of def){const back=neighbourFor(s,x);if(back)x.region=back;else x.men=Math.round(x.men*0.5)}
   else for(const x of att){const back=neighbourFor(s,x);if(back)x.region=back}
   s.lastBattle={region:rid,attacker,defender,outcome:result.outcome,losses:result.losses,month:monthIndex(s)};
   log(s,['Battle at %REGION%: '+result.outcome.replace(/_/g,' ')+'.','%REGION%之战：'+({attacker_won:'攻方胜',defender_won:'守方胜',defender_withdrew:'守方撤走',attacker_withdrew:'攻方撤走'}[result.outcome])+'。'],{region:rid,kind:'war',parties:[attacker,defender]});
  }
 }
 s.armies=s.armies.filter(a=>a.men>200);
}
function neighbourFor(s,a){const opts=s.regions.filter(r=>routeBetween(a.region,r.id)&&(r.owner===a.owner||access(s,a.owner,r.owner)));return opts[0]?.id||null}
function sieges(s){
 for(const r of s.regions){
  const occupiers=s.armies.filter(a=>a.region===r.id&&a.men>0&&!a.move&&r.owner&&a.owner!==r.owner&&atWar(s,a.owner,r.owner));
  const defenders=s.armies.filter(a=>a.region===r.id&&a.owner===r.owner&&a.men>0);
  if(!occupiers.length||defenders.length){r.siege=null;continue}
  const siegeSkill=occupiers.reduce((x,a)=>x+templateStats(a.template).siege*a.men/1000,0);
  const need=Math.max(1,Math.round(1+r.fort*1.5-siegeSkill*0.15));
  r.siege=r.siege&&r.siege.by===occupiers[0].owner?{...r.siege,months:r.siege.months+1,need}:{by:occupiers[0].owner,months:1,need};
  if(r.siege.months>=need){
   const prev=r.owner,taker=r.siege.by;r.owner=taker;r.loyalty=30;r.siege=null;
   if(OASIS.includes(prev)&&taker==='han'){for(const o of OASIS){const st=s.protectorate.oasis[o];st.concern=clamp(st.concern+20);st.han=clamp(st.han-8)}log(s,['Direct annexation of an oasis alarms every Western Regions ruler.','直接吞并城郭之国，令西域诸王震恐。'],{kind:'frontier'})}
   log(s,['%REGION% falls to %FACTION%.','%REGION%为%FACTION%所得。'],{region:r.id,faction:taker,kind:'war'});
   if(!s.regions.some(x=>x.owner===prev)&&s.factions[prev]){s.factions[prev].defeated=true;s.wars=s.wars.filter(w=>!w.includes(prev))}
  }
 }
}
// lives: deaths, vacated offices, the emperor's death and births
function mortality(age,health=60){const base=age<30?0.0006:age<45?0.0015:age<55?0.003:age<65?0.006:age<75?0.012:0.025;return base*(1.6-health/100)}
function lives(s){
 for(const p of Object.values(s.persons).filter(p=>p.alive&&(p.birth!=null||p.simulatedAge!=null)&&!p.scheduledDeath)){
  const age=p.birth!=null?yearsBetween(p.birth,s.year):p.simulatedAge+s.year-p.ageBaseYear;
  if(roll(s,'death'+p.id)<mortality(age,p.health??60)){
   p.alive=false;p.death=s.year;p.deathMonth=s.month;
   if(p.office&&s.court){s.court.offices[p.office]=null;p.office=null}
   log(s,['%NAME% dies.','%NAME%去世。'],{who:p.id,kind:'life'});
   if(s.throne.orthodox===p.id){s.throne.lastOrthodox=p.id;s.throne.orthodox=null;s.throne.regent=null;s.throne.puppet=null;s.crises.push({kind:'succession',year:s.year,month:s.month});resolveSuccession(s)}
   if(s.throne.occupant===p.id&&!isLiuClan(s,p.id)){s.throne.occupant=null}
  }
 }
 // births to the reigning emperor and his consorts (simulated, not historical)
 const e=s.throne.orthodox;if(e){const ep=s.persons[e],age=yearsBetween(ep.birth,s.year);
  const consort=Object.values(s.persons).find(p=>p.alive&&p.sex==='f'&&(p.spouse||[]).includes(e)&&yearsBetween(p.birth,s.year)<42);
  if(consort&&age>=16&&age<=55&&roll(s,'birth'+e)<0.012){
   const sex=roll(s,'sex'+e)<0.5?'m':'f',given=GIVEN[Math.floor(roll(s,'gn'+e)*GIVEN.length)];
   const id=`sim-liu-${monthIndex(s)}-${Math.floor(roll(s,'id'+e)*1e6)}`;
   const rb=recordBirth(s,{id,father:e,mother:consort.id,birthSurname:'Liu',birth:s.year,sex});
   if(rb.ok){s.persons[id]={id,name:[`Liu ${given[0]}`,`刘${given[1]}`],surname:'Liu',birthSurname:'Liu',sex,birth:s.year,death:null,father:e,mother:consort.id,record:'simulated',faction:ep.faction,role:sex==='m'?'prince':'princess',alive:true,ambition:Math.floor(roll(s,'amb'+id)*70),competence:Math.floor(30+roll(s,'cmp'+id)*50),loyalty:80,spouse:[]};
    log(s,['A child is born to the emperor: %NAME%.','皇帝得子女：%NAME%。'],{who:id,kind:'life'})}
  }}
 // vacant offices draw new officials from the empire’s gentry (never Liu unless clan office)
 if(s.court&&s.month%3===0){for(const [office,holder] of Object.entries(s.court.offices)){if(holder)continue;if(s.player==='han'&&office!=='zongzheng')continue;
  const cand=office==='zongzheng'?Object.values(s.persons).find(p=>p.alive&&p.faction==='han'&&isLiuClan(s,p.id)&&!p.office&&s.throne.orthodox!==p.id&&p.role!=='prince'):generateOfficial(s,office);
  if(cand)appoint(s,office,cand.id)}}
}
export function generateOfficial(s,office){
 const sn=SURNAMES[Math.floor(roll(s,'sn'+office)*SURNAMES.length)],gv=GIVEN[Math.floor(roll(s,'gv'+office)*GIVEN.length)];
 const id=`gen-${monthIndex(s)}-${office}`;if(s.persons[id])return s.persons[id];
 const birth=s.year-30-Math.floor(roll(s,'age'+office)*20);
 recordBirth(s,{id,father:null,mother:null,birthSurname:sn[0],birth,sex:'m'});
 const factions=['ru','waiqi','frontier','haoqiang'];
 s.persons[id]={id,name:[`${sn[0]} ${gv[0]}`,`${sn[1]}${gv[1]}`],surname:sn[0],birthSurname:sn[0],sex:'m',birth,death:null,father:null,mother:null,record:'fictional',faction:'han',role:office==='duhu'||office==='hexi'?'general':'official',courtFaction:factions[Math.floor(roll(s,'cf'+id)*factions.length)],alive:true,ambition:Math.floor(20+roll(s,'a'+id)*70),competence:Math.floor(35+roll(s,'c'+id)*50),loyalty:Math.floor(40+roll(s,'l'+id)*50),corruption:Math.floor(roll(s,'k'+id)*60),military:Math.floor(30+roll(s,'m'+id)*50),spouse:[]};
 return s.persons[id];
}
// Recorded events at fixed dates (only the opening succession of 48 BCE).
function scheduledEvents(s){
 for(const e of (s.scheduled||[]).filter(e=>!e.done&&e.year===s.year&&e.month===s.month)){
  e.done=true;
  if(e.kind==='death'){const p=s.persons[e.id];if(p?.alive){p.alive=false;p.death=s.year;p.deathMonth=s.month;p.scheduledDeath=false;log(s,['%NAME% dies (10 January 48 BCE).','%NAME%崩（公元前48年1月10日）。'],{who:p.id,kind:'throne'});
   if(s.throne.orthodox===p.id){s.throne.lastOrthodox=p.id;s.throne.orthodox=null;resolveSuccession(s)}}}
  if(e.kind==='deathbed_regents'){for(const [office,id] of [['dasima','shi-gao'],['qianjiangjun','xiao-wangzhi']])if(s.persons[id]?.alive)appoint(s,office,id);
   if(s.persons['liu-shi']?.alive&&s.throne.orthodox==='liu-shi'){s.persons['liu-shi'].role='emperor';s.pendingEmpress='wang-zhengjun'}
   log(s,['By Emperor Xuan’s testament Shi Gao, Xiao Wangzhi and Zhou Kan assist the new emperor.','宣帝遗诏，史高、萧望之、周堪辅政。'],{kind:'throne'})}
 }
}
function hanAI(s){
 if(s.player==='han')return;
 if(s.pendingEmpress&&s.month>=5)elevateEmpress(s,s.pendingEmpress);
 if(!s.throne.heir&&s.throne.orthodox){const sons=Object.values(s.persons).filter(p=>p.alive&&p.father===s.throne.orthodox&&eligibility(s,p.id).ok);if(sons[0])s.throne.heir=sons[0].id}
 if(s.month===3&&s.court&&roll(s,'hanEdict')<0.4){const types=Object.keys(EDICTS).filter(t=>!s.court.edicts.some(e=>e.type===t&&e.status!=='stalled'));const t=types[Math.floor(roll(s,'et')*types.length)];if(t)issueEdict(s,t)}
}

function regionalAI(s){
 for(const id of Object.keys(EURASIAN_FACTIONS)){
  if(id===s.player)continue;
  const own=s.regions.filter(r=>r.owner===id),f=s.factions[id];
  if(!own.length||!f||f.defeated)continue;
  const fronts=[...new Set(own.flatMap(r=>neighbours(r.id)))].map(rid=>s.regions.find(r=>r.id===rid)).filter(r=>r?.owner&&atWar(s,id,r.owner));
  if(!fronts.length)continue;
  const forces=s.armies.filter(a=>a.owner===id&&a.men>0);
  if(forces.length<Math.max(1,Math.ceil(own.length/3))&&s.month%3===0){
   const home=own.find(r=>fronts.some(t=>neighbours(r.id).includes(t.id)))||own[0];
   const t=cultureOf(id)==='steppe'?'kangju_host':'town';
   if(recruitQuote(s,id,home.id,t,600).ok)recruit(s,id,home.id,t,{men:600,log:(msg,meta)=>log(s,msg,{...meta,kind:'recruit'})});
  }
  if(s.month%2!==0)continue;
  for(const a of forces.filter(a=>!a.move&&!a.forming)){
   const adjacent=neighbours(a.region).map(rid=>s.regions.find(r=>r.id===rid)).filter(r=>r&&r.owner!==id&&atWar(s,id,r.owner));
   // Decisions use bordering provinces and observed local forces only.
   const viable=adjacent.find(r=>a.men>=(s.armies.filter(e=>e.region===r.id&&e.owner===r.owner).reduce((n,e)=>n+e.men,0)*1.3||500));
   if(viable){moveArmy(s,a.id,viable.id,{owner:id});break}
  }
 }
}
export function tick(s){
 if(s.finalized)return s;
 advanceDate(s);
 scheduledEvents(s);movement(s);battles(s);sieges(s);supply(s);economy(s);lives(s);advanceForeignRulers(s);
 hanAI(s);advanceCourt(s);
 advanceFrontier(s,{issueMove:(a,to)=>moveArmy(s,a.id,to,{owner:a.owner})});
 advanceEasternMarkets(s);advanceSilk(s);advanceDependencies(s);advanceFocus(s);ensureFieldCommanders(s);
 if(s.throne.dynasty&&!s.throne.dynasty.orthodox)s.usurperMonths=(s.usurperMonths||0)+1;
 if(s.throne.orthodox&&s.throne.dynasty?.orthodox)s.orthodoxMonths=(s.orthodoxMonths||0)+1;
 if(!s.wars.length)s.peaceMonths=(s.peaceMonths||0)+1;else s.peaceMonths=0;
 return s;
}

// ---------- saves ----------
export const SAVE_KEY=n=>`spqr-han-save-${n}`;
export function serialize(s){return JSON.stringify(s)}
export function loadHanSave(raw){
 const s=typeof raw==='string'?JSON.parse(raw):raw;
 if(!s||s.dlc!==DLC_ID)throw new Error('Not a Mandate of Heaven save');
 // canonical historical birth records always come from the static record
 for(const p of PEOPLE){const rec=s.genealogy[p.id];if(rec&&(rec.father!==p.father||rec.birthSurname!==p.birthSurname||rec.sex!==p.sex||rec.birth!==p.birth)){delete s.genealogy[p.id];recordBirth(s,{id:p.id,father:p.father,mother:p.mother,birthSurname:p.birthSurname,birth:p.birth,sex:p.sex})}
  if(s.persons[p.id]){s.persons[p.id].birthSurname=p.birthSurname;if(p.portrait&&!s.persons[p.id].portrait&&s.persons[p.id].birth===p.birth&&s.persons[p.id].name?.[0]===p.name[0])s.persons[p.id].portrait=p.portrait}}
 for(const r of REGIONS)if(!s.regions.some(x=>x.id===r.id))s.regions.push({...r,siege:null,unrest:0});
 for(const [id,f] of Object.entries(FACTIONS))if(!f.dynamic&&!s.factions[id])s.factions[id]={id,treasury:20,grain:30,manpower:6000,horses:3000,stability:55};
 s.rulers||=Object.fromEntries(EURASIAN_RULERS.map(p=>[p.faction,{...p,attested:true}]));
 ensureForeignRulers(s);
 initDependencies(s);
 // Older saves did not date opening appointments. Begin the observation clock
 // at load instead of exposing a guessed historical tenure or private skill.
 for(const [office,id] of Object.entries(s.court?.offices||{}))if(id&&s.persons[id]?.alive&&s.persons[id].office===office)s.persons[id].officeSince??={year:s.year,month:s.month};
 s.version=SAVE_VERSION;s.throne.claimants||=[];s.throne.support||={};s.throne.history||=[];
 const fixes=enforceDynasticInvariants(s,{log:(t,m)=>log(s,t,{...m,kind:'throne'})});
 s.loadFixes=fixes;initializeEasternMarkets(s);ensureFieldCommanders(s);computeMandate(s);return s;
}
export {statusOf,eligibility,claimStrength,emperorAuthority,adminCapacity};
