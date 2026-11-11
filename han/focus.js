// NATIONAL FOCUS — Han tree (branches A–F) and Xiongnu, Wusun, oasis and
// Kangju trees. Completion runs effects through real systems: edicts that
// still need court support, negotiations the other court may refuse,
// protectorate standing, regional works, faction influence. Completion never
// guarantees political success, and no focus can touch the throne directly.
import {issueEdict,recomputeInfluence,startAudit} from './court.js?v=han-1';
import {propose,shiftRelation} from './frontier.js?v=han-1';
import {addClaimant,isLiuClan} from './dynasty.js?v=han-1';
import {OASIS} from './data.js?v=han-1';
import {clamp,log} from './util.js?v=han-1';

const F=(id,branch,en,zh,months,cost,prereq,effects,{exclusive=[],desc=null}={})=>({id,branch,name:[en,zh],months,cost,prereq,effects,exclusive,desc});
export const BRANCHES={A:['Imperial Authority','皇权'],B:['Government & Scholarship','朝政与经学'],C:['Agriculture & State Finance','农政与国计'],D:['The Western Regions','西域经营'],E:['The Northern Frontier','北疆'],F:['Alternate History','架空天命'],X:['Steppe Confederation','草原联盟'],W:['Kunmi Politics','昆弥政治'],O:['Oasis Statecraft','城郭之道'],K:['Kangju Statecraft','康居之道']};

const HAN=[
 F('han_a1','A','Consolidate Court Authority','巩固朝廷权威',4,{treasury:20},[],[{court:{ru:3,waiqi:-2}},{favorBase:4}]),
 F('han_a2','A','Review Senior Appointments','考课公卿',4,{treasury:15},['han_a1'],[{reveal:'offices'},{audit:'most_powerful'}]),
 F('han_a3','A','Strengthen Central Administration','强化中枢',5,{treasury:40},['han_a2'],[{reform:1},{edict:'curb_secretariat'}]),
 F('han_a4','A','Manage Imperial Relatives','约束外戚',4,{treasury:10},['han_a2'],[{court:{waiqi:-8,ru:3}},{enmityFaction:'waiqi'}]),
 F('han_a5','A','Secure the Succession','定储位',5,{treasury:20},['han_a3'],[{heirSupport:20}]),
 F('han_a6','A','Preserve the Liu Dynasty','保全刘氏宗庙',6,{treasury:40},['han_a5','han_a4'],[{clanRegister:true},{mandate:4},{court:{ru:2}}]),
 F('han_b1','B','Strengthen Classical Scholarship','崇经学',4,{treasury:20},[],[{court:{ru:5}},{mandate:2}]),
 F('han_b2','B','Reform Official Appointments','改革选举',6,{treasury:20},['han_b1'],[{edict:'appointment_reform'}]),
 F('han_b3','B','Improve Administrative Reporting','完善上计',4,{treasury:25},['han_b1'],[{reform:1},{reveal:'regions'}]),
 F('han_b4','B','Negotiate Court Reforms','议朝政改革',5,{treasury:15},['han_b2'],[{debate:'court_reform'}]),
 F('han_b5','B','Review Regional Government','巡行郡国',5,{treasury:30},['han_b3'],[{regions:{filter:'han',loyalty:4}},{audit:'random_governor'}]),
 F('han_b6','B','Promote Competent Officials','擢拔贤能',5,{treasury:30},['han_b4','han_b5'],[{competence:6}]),
 F('han_c1','C','Repair Irrigation Works','修水利',6,{treasury:40},[],[{edict:'irrigation'}]),
 F('han_c2','C','Improve Grain Transport','漕运整顿',5,{treasury:35},['han_c1'],[{regions:{filter:'river',supply:1}},{res:{grain:40}}]),
 F('han_c3','C','Strengthen Agricultural Administration','劝农桑',5,{treasury:25},['han_c1'],[{regions:{filter:'plain',grain:1}}]),
 F('han_c4','C','Review Salt and Iron Policies','议盐铁',6,{treasury:20},['han_c2'],[{edict:'salt_iron_review'}]),
 F('han_c5','C','Develop Strategic Granaries','建常平仓',6,{treasury:50},['han_c3'],[{edict:'granary'}]),
 F('han_c6','C','Stabilize Imperial Finances','整理国用',6,{treasury:10},['han_c4','han_c5'],[{res:{treasury:120}},{court:{haoqiang:-4}},{taxMod:0.05}]),
 F('han_d1','D','Strengthen Hexi Garrisons','增河西戍卒',4,{treasury:40},[],[{regions:{filter:'hexi',fort:1}},{res:{manpower:3000}}]),
 F('han_d2','D','Support Western Regions Diplomacy','厚结西域',5,{treasury:40},['han_d1'],[{oasis:{all:6}}]),
 F('han_d3','D','Secure Oasis Routes','保护绿洲道',5,{treasury:30},['han_d2'],[{silkSecurity:2},{regions:{filter:'protectorate',fort:1}}]),
 F('han_d4','D','Negotiate With Wusun','与乌孙议',4,{treasury:20},['han_d2'],[{propose:{to:'wusun',type:'alliance'}},{relation:{wusun:8,wusun_lesser:5}}]),
 F('han_d5','D','Maintain the Protectorate','维持都护',6,{treasury:50},['han_d3'],[{oasis:{all:4}},{tuntian:true}]),
 F('han_d6','D','Expand Frontier Intelligence','广斥候',4,{treasury:25},['han_d4','han_d5'],[{intelMod:1}]),
 F('han_e1','E','Negotiate With Huhanye','与呼韩邪议',3,{treasury:20},[],[{propose:{to:'huhanye',type:'market'}},{relation:{huhanye:6}}]),
 F('han_e2','E','Observe Zhizhi’s Ambitions','察郅支之志',3,{treasury:15},['han_e1'],[{reveal:'zhizhi'}]),
 F('han_e3','E','Reinforce Border Commands','增边郡兵',5,{treasury:45},['han_e1'],[{regions:{filter:'frontier',fort:1}},{edict:'frontier_levy'}]),
 F('han_e4','E','Improve Cavalry Logistics','整骑兵转输',5,{treasury:35},['han_e3'],[{res:{horses:2500}},{cavalrySupply:1}]),
 F('han_e5','E','Protect Frontier Settlements','护边民',5,{treasury:30},['han_e3'],[{regions:{filter:'frontier',loyalty:6}}]),
 F('han_e6','E','Develop a Long-Term Steppe Policy','定长久御边之策',6,{treasury:30},['han_e2','han_e4'],[{propose:{to:'huhanye',type:'tributary'}},{debate:'steppe_policy'}]),
 F('han_f1','F','Reorganize the Imperial Government','重整朝廷',6,{treasury:50,stability:5},['han_a3','han_b4'],[{reform:2},{court:{waiqi:-5,huanguan:-5,ru:4}}],{exclusive:['han_f2']}),
 F('han_f2','F','Create New Court Coalitions','新结朝中联盟',5,{treasury:30},['han_a2','han_b1'],[{court:{waiqi:4,ru:4,huanguan:-6}},{favorBase:3}],{exclusive:['han_f1']}),
 F('han_f3','F','Reform Regional Authority','改革郡国之制',7,{treasury:60,stability:5},['han_b5'],[{kingdomsToCommanderies:1},{court:{haoqiang:-6}}]),
 F('han_f4','F','Reshape Frontier Relationships','重塑边疆格局',5,{treasury:30},['han_d5','han_e6'],[{relation:{huhanye:8,wusun:6,kangju:6,zhizhi:-6}},{oasis:{all:3}}]),
 F('han_f5','F','Pursue an Ambitious Eurasian Trade Strategy','经营欧亚商路',8,{treasury:80},['han_d3'],[{silkSecurity:2},{propose:{to:'kangju',type:'caravan'}},{propose:{to:'dayuan',type:'caravan'}}]),
 F('han_f6','F','Confront a Major Dynastic Crisis','直面宗室大变',4,{treasury:20,stability:5},['han_a6'],[{dynasticCrisis:true}])
];
const STEPPE_TREE=pre=>[
 F(pre+'_x1','X','Gather the Assembly','召集部众大会',3,{treasury:5},[],[{res:{manpower:3000}},{stability:4}]),
 F(pre+'_x2','X','Secure the Herds','保护畜群',4,{treasury:5},[pre+'_x1'],[{res:{grain:40,horses:3000}}]),
 F(pre+'_x3','X','Bind the Subject Peoples','羁縻附庸',4,{treasury:10},[pre+'_x1'],[{tribalLoyalty:10}]),
 F(pre+'_x4','X','Seek a Patron or Partner','择交援国',4,{treasury:10},[pre+'_x2'],[{propose:pre==='huhanye'?{to:'han',type:'market'}:{to:'kangju',type:'alliance'}}]),
 F(pre+'_x5','X','Move to New Pastures','迁徙新牧场',5,{treasury:5},[pre+'_x3'],[{res:{grain:30}},{stability:-2}]),
 F(pre+'_x6',"X",pre==='huhanye'?'Return to the Northern Court':'Strike the Northern Peoples',pre==='huhanye'?'北归单于庭':'西击诸部',6,{treasury:15},[pre+'_x4',pre+'_x5'],pre==='huhanye'?[{relation:{han:4,zhizhi:-8}},{res:{manpower:4000}}]:[{war:'wujie'}])
];
const WUSUN_TREE=pre=>[
 F(pre+'_w1','W','Hold the Kunmi’s Council','召开昆弥议事',3,{treasury:5},[],[{stability:4}]),
 F(pre+'_w2','W','Honor the Han Marriage Ties','重汉家姻亲',4,{treasury:5},[pre+'_w1'],[{relation:{han:8}}]),
 F(pre+'_w3','W','Breed the Ili Horses','繁育伊犁良马',4,{treasury:5},[pre+'_w1'],[{res:{horses:3000}}]),
 F(pre+'_w4','W','Settle with the Other Kunmi','与另一昆弥修好',5,{treasury:10},[pre+'_w2'],[{relation:{[pre==='wusun'?'wusun_lesser':'wusun']:12}}]),
 F(pre+'_w5','W','Weigh the Xiongnu Offer','权衡匈奴之约',4,{treasury:5},[pre+'_w3'],[{relation:{zhizhi:6,han:-3}}])
];
const OASIS_TREE=pre=>[
 F(pre+'_o1','O','Repair the Town Walls','修缮城郭',3,{treasury:5},[],[{regions:{filter:'own',fort:1}}]),
 F(pre+'_o2','O','Tax the Caravans','征商队税',4,{treasury:5},[pre+'_o1'],[{tollMod:1}]),
 F(pre+'_o3','O','Send Tribute to the Protector','向都护纳贡',3,{treasury:10},[pre+'_o1'],[{oasisSelf:{han:10}}],{exclusive:[pre+'_o4']}),
 F(pre+'_o4','O','Guard Our Autonomy','守自主',3,{treasury:5},[pre+'_o1'],[{oasisSelf:{autonomy:10,han:-4}}],{exclusive:[pre+'_o3']}),
 F(pre+'_o5','O','Seek a Neighbour’s Alliance','结邻国之盟',4,{treasury:5},[pre+'_o2'],[{proposeNeighbour:'alliance'}])
];
const KANGJU_TREE=[
 F('kangju_k1','K','Rule from Beitian','治卑阗',3,{treasury:5},[],[{stability:4}]),
 F('kangju_k2','K','Host the Caravans','招徕商旅',4,{treasury:5},['kangju_k1'],[{tollMod:1},{propose:{to:'han',type:'caravan'}}]),
 F('kangju_k3','K','Contest the Wusun Pastures','争乌孙牧地',5,{treasury:10},['kangju_k1'],[{relation:{wusun:-10,zhizhi:5}}]),
 F('kangju_k4','K','Open the Road to Anxi','通往安息之路',5,{treasury:10},['kangju_k2'],[{res:{treasury:30}}])
];
export const TREES={han:HAN,han_loyalist:HAN.filter(f=>['A','B'].includes(f.branch)),huhanye:STEPPE_TREE('huhanye'),zhizhi:STEPPE_TREE('zhizhi'),wusun:WUSUN_TREE('wusun'),wusun_lesser:WUSUN_TREE('wusun_lesser'),kangju:KANGJU_TREE};
for(const o of [...OASIS,'dayuan'])TREES[o]=OASIS_TREE(o);
export const treeFor=f=>TREES[f]||[];
export const focusById=(f,id)=>treeFor(f).find(x=>x.id===id);

export function validateTrees(){
 const errors=[];
 for(const [f,tree] of Object.entries(TREES)){const ids=new Set(tree.map(x=>x.id));
  for(const x of tree){for(const p of x.prereq)if(!ids.has(p))errors.push(`${f}:${x.id} prereq ${p}`);for(const e of x.exclusive){const o=tree.find(y=>y.id===e);if(!o||!o.exclusive.includes(x.id))errors.push(`${f}:${x.id} exclusive ${e}`)}
   if(!x.effects.length)errors.push(`${f}:${x.id} no effects`);if(!(x.months>0))errors.push(`${f}:${x.id} months`);
   for(const e of x.effects){const k=Object.keys(e)[0];if(!EFFECTS[k])errors.push(`${f}:${x.id} effect ${k}`)}}}
 return errors;
}
export function focusState(s,f){s.focus[f]||={current:null,done:[],mod:{}};return s.focus[f]}
export function focusStatus(s,f,id){
 const st=focusState(s,f),x=focusById(f,id);if(!x)return 'unknown';
 if(st.done.includes(id))return 'done';if(st.current?.id===id)return 'active';
 if(x.exclusive.some(e=>st.done.includes(e)||st.current?.id===e))return 'excluded';
 if(!x.prereq.every(p=>st.done.includes(p)))return 'locked';return 'available';
}
export function startFocus(s,f,id){
 const st=focusState(s,f),x=focusById(f,id),fac=s.factions[f];
 if(focusStatus(s,f,id)!=='available')return {ok:false,reason:focusStatus(s,f,id)};
 if(st.current)return {ok:false,reason:'busy'};
 if((x.cost.treasury||0)>fac.treasury)return {ok:false,reason:'treasury'};
 fac.treasury-=x.cost.treasury||0;fac.stability=clamp(fac.stability-(x.cost.stability||0));
 st.current={id,progress:0};return {ok:true};
}
// ---------- effects ----------
const hanRegions=(s,f,filter)=>s.regions.filter(r=>r.owner===f&&(filter==='han'||filter==='own'||r[filter]||r.kind===filter||r.terrain===filter));
const EFFECTS={
 court:(s,f,v)=>{if(!s.court)return;for(const [k,d] of Object.entries(v))s.court.factions[k].influence=Math.max(5,s.court.factions[k].influence+d);recomputeInfluence(s)},
 favorBase:(s,f,v)=>{if(s.court)s.court.favorBase=(s.court.favorBase||0)+v},
 reveal:(s,f,v)=>{if(v==='offices'&&s.court)for(const id of Object.values(s.court.offices).filter(Boolean))s.persons[id].historicalReputation=true;
  if(v==='zhizhi'){for(const r of s.regions.filter(x=>x.owner==='zhizhi'))s.intel[f][r.id]={month:s.year*12+s.month,owner:'zhizhi',armies:s.armies.filter(a=>a.region===r.id).map(a=>({owner:a.owner,men:Math.round(a.men/1000)*1000}))}}
  if(v==='regions')s.reportingImproved=true},
 audit:(s,f,v)=>{if(!s.court)return;const cands=Object.values(s.persons).filter(p=>p.alive&&p.faction===f&&p.office&&p.id!==s.throne.orthodox);
  const target=v==='most_powerful'?cands.sort((a,b)=>(s.court.control[b.id]||0)-(s.court.control[a.id]||0))[0]:cands[Math.floor((s.year*7+s.month)%Math.max(1,cands.length))];
  if(target){s.factions[f].treasury+=15;startAudit(s,target.id,{owner:f})}},
 reform:(s,f,v)=>{if(s.court)s.court.reformLevel=(s.court.reformLevel||0)+v},
 edict:(s,f,v)=>{if(s.court){const cost=0;issueEdict(s,v,{owner:f})}},
 enmityFaction:(s,f,v)=>{for(const p of Object.values(s.persons).filter(p=>p.alive&&p.courtFaction===v))s.court.enmity[p.id]=(s.court.enmity[p.id]||0)+10},
 heirSupport:(s,f,v)=>{const h=s.throne.heir;if(!h)return;s.throne.support[h]||={};for(const k of Object.keys(s.court.factions))s.throne.support[h][k]=clamp((s.throne.support[h][k]||40)+v)},
 clanRegister:(s,f)=>{s.clanRegisterAudited=true},
 mandate:(s,f,v)=>{s.mandateRitual=(s.mandateRitual||0)+v},
 debate:(s,f,v)=>{if(s.court)s.court.debates.push({id:s.court.nextId++,kind:v,options:v==='court_reform'?['enact','shelve']:v==='steppe_policy'?['accommodation','pressure']:['reform','suppress'],deadline:3,region:s.regions.find(r=>r.id==='changan').id})},
 regions:(s,f,v)=>{for(const r of hanRegions(s,f,v.filter))for(const [k,d] of Object.entries(v))if(k!=='filter')r[k]=k==='loyalty'?clamp(r[k]+d):Math.min(k==='fort'?5:12,(r[k]||0)+d)},
 audit_governor:()=>{},
 competence:(s,f,v)=>{for(const id of Object.values(s.court?.offices||{}).filter(Boolean))s.persons[id].competence=clamp((s.persons[id].competence||40)+v)},
 res:(s,f,v)=>{const fac=s.factions[f];for(const [k,d] of Object.entries(v))fac[k]=(fac[k]||0)+d},
 stability:(s,f,v)=>{s.factions[f].stability=clamp(s.factions[f].stability+v)},
 taxMod:(s,f,v)=>{focusState(s,f).mod.tax=(focusState(s,f).mod.tax||0)+v},
 oasis:(s,f,v)=>{for(const o of OASIS){const st=s.protectorate.oasis[o];st.han=clamp(st.han+(v.all||v[o]||0))}},
 silkSecurity:(s,f,v)=>{s.silk.security=clamp((s.silk.security||0)+v,0,5)},
 propose:(s,f,v)=>{propose(s,f,v.to,v.type)},
 relation:(s,f,v)=>{for(const [k,d] of Object.entries(v))shiftRelation(s,f,k,d)},
 tuntian:(s,f)=>{const r=s.regions.find(x=>x.id==='wulei');if(r&&r.owner===f){r.grain+=1;r.supply+=1}},
 intelMod:(s,f,v)=>{focusState(s,f).mod.intel=(focusState(s,f).mod.intel||0)+v},
 cavalrySupply:(s,f,v)=>{focusState(s,f).mod.cavalrySupply=(focusState(s,f).mod.cavalrySupply||0)+v},
 kingdomsToCommanderies:(s,f)=>{const k=s.regions.find(r=>r.owner===f&&r.kind==='kingdom'&&r.loyalty>=60);if(k){k.kind='commandery';k.tax+=1;k.loyalty=clamp(k.loyalty-10);log(s,['%REGION% is placed under a commandery administrator.','%REGION%改置郡守。'],{region:k.id,kind:'court'})}},
 dynasticCrisis:(s,f)=>{const c=s.persons['fictional-liu-shang'];if(c?.alive&&isLiuClan(s,c.id)){addClaimant(s,c.id);log(s,['%NAME% presses a claim as a son of the deposed Liu He.','%NAME%以废帝刘贺之子身份争位。'],{who:c.id,kind:'throne'})}},
 tribalLoyalty:(s,f,v)=>{focusState(s,f).mod.tribal=(focusState(s,f).mod.tribal||0)+v},
 war:(s,f,v)=>{if(s.regions.some(r=>r.owner===v)&&!s.wars.some(w=>w.includes(f)&&w.includes(v)))s.wars.push([f,v])},
 tollMod:(s,f,v)=>{focusState(s,f).mod.toll=(focusState(s,f).mod.toll||0)+v},
 oasisSelf:(s,f,v)=>{const st=s.protectorate.oasis[f];if(st)for(const [k,d] of Object.entries(v))st[k]=clamp(st[k]+d)},
 proposeNeighbour:(s,f,v)=>{const n=OASIS.find(o=>o!==f&&s.regions.some(r=>r.owner===o));if(n)propose(s,f,n,v)}
};
export function applyEffects(s,f,x){for(const e of x.effects){const [k,v]=Object.entries(e)[0];EFFECTS[k](s,f,v)}}

// AI scoring: each court looks at its own needs.
function score(s,f,x){
 let v=10-x.months;const fac=s.factions[f];
 const need={A:s.court&&f==='han'?100-(s.court?emperorAuth(s):50):0,B:s.court?60-(s.court.reformLevel||0)*10:0,C:fac.grain<150?40:15,D:f==='han'?(80-avgOasis(s)):0,E:f==='han'?(s.wars.some(w=>w.includes('han'))?40:20):0,F:-10,X:30,W:30,O:30,K:30};
 v+=(need[x.branch]||0)*0.5;if((x.cost.treasury||0)>fac.treasury*0.6)v-=30;
 return v;
}
const avgOasis=s=>OASIS.reduce((a,o)=>a+(s.protectorate.oasis[o]?.han||0),0)/OASIS.length;
const emperorAuth=s=>s.throne.orthodox?50:0;
export function aiChooseFocus(s,f){
 const st=focusState(s,f);if(st.current)return null;
 const avail=treeFor(f).filter(x=>focusStatus(s,f,x.id)==='available').sort((a,b)=>score(s,f,b)-score(s,f,a));
 const pick=avail[0];if(pick&&startFocus(s,f,pick.id).ok)return pick.id;return null;
}
export function advanceFocus(s){
 for(const f of Object.keys(TREES)){
  if(!s.factions[f]||s.factions[f].defeated||!s.regions.some(r=>r.owner===f))continue;
  const st=focusState(s,f);
  if(!st.current&&f!==s.player)aiChooseFocus(s,f);
  if(!st.current)continue;
  st.current.progress++;const x=focusById(f,st.current.id);
  if(st.current.progress>=x.months){st.done.push(x.id);st.current=null;applyEffects(s,f,x);
   log(s,['%FACTION% completes the focus “'+x.name[0]+'”.','%FACTION%完成国策“'+x.name[1]+'”。'],{faction:f,kind:'focus'})}
 }
}
