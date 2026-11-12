// HAN ARMY ORGANIZER 汉军编制 and the steppe military system.
//
// A formation is a mix of components (shares of 100). Its statistics feed real
// systems: battle power by terrain, march speed by route kind, monthly grain
// and fodder, horse requirements, scouting, siege, and recruitment cost. The
// numbers are gameplay abstractions: they do not claim the precision of a
// modern division table.
import {ROUTES,REGIONS} from './data.js?v=han-1';
import {EURASIAN_FACTIONS} from './eurasia-data.js';

const T=(plain,hills,mountain,river,desert,steppe,oasis,urban)=>({plain,hills,mountain,river,desert,steppe,oasis,urban});
const C=(id,culture,name,desc,st)=>({id,culture,name,desc,...st});
// culture: han | xiongnu | wusun | oasis | steppe (Kangju) | qiang
export const COMPONENTS=Object.fromEntries([
 C('caiguan','han',['Infantry (cai guan)','材官步卒'],['Levied foot soldiers with halberds and swords.','征发的步卒，持戟与刀剑。'],{atk:1.0,def:1.15,speed:1.0,recon:0,siege:0.2,grain:1.0,fodder:0,horses:0,cost:1.0,manpower:1.0,terrain:T(1,1,1,1,0.75,0.8,1,1.1)}),
 C('nu','han',['Crossbowmen (qiang nu)','强弩'],['Crossbow units that broke mounted charges on open ground; need iron and trained artisans.','强弩部队，能在开阔地挫败骑兵冲击，依赖铁料与工匠。'],{atk:1.35,def:1.25,speed:0.95,recon:0,siege:0.3,grain:1.0,fodder:0,horses:0,cost:1.4,manpower:1.0,needs:'iron',terrain:T(1.2,1.05,0.85,0.95,0.9,1.15,1,1.1),antiCavalry:0.25}),
 C('gong','han',['Archers','弓手'],['Bowmen supporting the line.','弓箭手，掩护战阵。'],{atk:1.1,def:0.95,speed:1.0,recon:0.1,siege:0.2,grain:0.9,fodder:0,horses:0,cost:1.1,manpower:0.9,terrain:T(1.05,1.05,1,1,0.9,1,1,1)}),
 C('qishi','han',['Cavalry (qi shi)','骑士'],['Mounted troops from the northern and western commanderies; need horses and fodder.','北边与西北诸郡的骑兵，需要马匹与草料。'],{atk:1.3,def:0.9,speed:1.6,recon:0.6,siege:0,grain:1.0,fodder:1.4,horses:1.2,cost:1.9,manpower:0.9,needs:'horses',terrain:T(1.2,0.9,0.6,0.8,0.9,1.2,1,0.7),pursuit:0.3}),
 C('shuzu','han',['Frontier garrison (shu zu)','戍卒'],['Conscripts serving on the walls and beacon towers of the frontier.','服役于边塞烽燧的戍卒。'],{atk:0.7,def:1.5,speed:0.85,recon:0.3,siege:0.1,grain:0.8,fodder:0,horses:0,cost:0.7,manpower:1.0,fortBonus:0.3,terrain:T(1,1.1,1.1,1,1,1,1.1,1.1)}),
 C('houwang','han',['Scouts (hou wang)','候望斥候'],['Watchers and scouts of the beacon network.','烽燧候望与斥候。'],{atk:0.5,def:0.5,speed:1.5,recon:1.4,siege:0,grain:0.6,fodder:0.6,horses:0.6,cost:0.8,manpower:0.4,terrain:T(1,1,1,1,1,1,1,1)}),
 C('jiang','han',['Engineers (jiang zuo)','匠作'],['Builders of roads, palisades and bridges.','修筑道路、营垒与桥梁的工匠。'],{atk:0.4,def:0.7,speed:0.9,recon:0,siege:1.0,grain:0.9,fodder:0,horses:0,cost:1.0,manpower:0.6,roadBonus:0.15,terrain:T(1,1,1,1,1,1,1,1)}),
 C('gongcheng','han',['Siege train','攻城器械'],['Rams, ladders and covered approaches for walled cities.','冲车、云梯与掩体，用于攻城。'],{atk:0.3,def:0.4,speed:0.7,recon:0,siege:2.2,grain:1.0,fodder:0.4,horses:0.2,cost:1.6,manpower:0.6,terrain:T(1,0.8,0.5,0.8,0.6,0.7,1,1.3)}),
 C('zhuanshu','han',['Transport (zhuan shu)','转输'],['Carts and porters carrying grain: extends operations in poor country.','车辆与民夫转运粮草，延长贫瘠地区的作战能力。'],{atk:0.1,def:0.3,speed:0.85,recon:0,siege:0,grain:0.4,fodder:0.6,horses:0.4,cost:0.6,manpower:0.8,carry:1.0,terrain:T(1,1,1,1,1,1,1,1)}),
 // Xiongnu: mounted archery, herd logistics, subordinate tribes
 C('kongxian','xiongnu',['Mounted archers (kong xian)','控弦骑射'],['Every herdsman who can draw a bow fights mounted.','能弯弓者皆为甲骑。'],{atk:1.3,def:0.8,speed:1.9,recon:0.8,siege:0,grain:0.2,fodder:1.0,horses:2.0,cost:0.6,manpower:1.0,herd:true,terrain:T(1.15,0.9,0.6,0.8,1.0,1.3,0.9,0.5),pursuit:0.4,withdraw:true}),
 C('guizu','xiongnu',['Noble retinues','贵种亲骑'],['The chanyu’s and kings’ household horsemen.','单于与诸王的亲骑。'],{atk:1.5,def:1.0,speed:1.7,recon:0.4,siege:0,grain:0.3,fodder:1.2,horses:2.2,cost:1.2,manpower:0.6,herd:true,terrain:T(1.2,0.9,0.6,0.8,1,1.3,0.9,0.5),pursuit:0.3,withdraw:true}),
 C('fuyong','xiongnu',['Subordinate tribal horsemen','附庸部落骑'],['Allied and subject peoples; their loyalty depends on success.','附从与臣属部落，其忠诚取决于胜负。'],{atk:1.1,def:0.7,speed:1.7,recon:0.5,siege:0,grain:0.2,fodder:1.0,horses:1.8,cost:0.4,manpower:1.0,herd:true,tribal:true,terrain:T(1.1,0.9,0.6,0.8,1,1.25,0.9,0.5),withdraw:true}),
 // Wusun: large horse herds, allied with Han by marriage
 C('wusun_qi','wusun',['Wusun horsemen','乌孙骑兵'],['Riders of the Ili and Issyk-Kul pastures.','伊犁与伊塞克湖草原的骑手。'],{atk:1.25,def:0.85,speed:1.8,recon:0.6,siege:0,grain:0.2,fodder:1.0,horses:2.0,cost:0.6,manpower:1.0,herd:true,terrain:T(1.1,0.95,0.7,0.8,0.9,1.25,0.9,0.5),withdraw:true}),
 // Oasis kingdoms: walled towns, small forces
 C('chengguo','oasis',['Town infantry','城郭步兵'],['Militia of walled oasis towns.','绿洲城郭的守城民兵。'],{atk:0.8,def:1.3,speed:1.0,recon:0.1,siege:0.2,grain:0.8,fodder:0,horses:0,cost:0.8,manpower:1.0,fortBonus:0.4,terrain:T(1,1,0.9,1,1,0.8,1.2,1.2)}),
 C('oasis_gong','oasis',['Oasis archers','绿洲弓手'],['Bowmen of the oasis states.','绿洲诸国的弓手。'],{atk:1.0,def:1.0,speed:1.0,recon:0.2,siege:0.1,grain:0.8,fodder:0,horses:0,cost:0.9,manpower:0.9,terrain:T(1,1,0.9,1,1,0.9,1.15,1.1)}),
 C('oasis_qi','oasis',['Oasis cavalry','绿洲骑兵'],['Small mounted contingents.','少量骑兵。'],{atk:1.15,def:0.85,speed:1.6,recon:0.5,siege:0,grain:0.6,fodder:1.0,horses:1.0,cost:1.3,manpower:0.8,terrain:T(1.1,0.9,0.7,0.8,1,1.1,1,0.7)}),
 // Kangju & minor steppe peoples
 C('steppe_qi','steppe',['Steppe horsemen','草原骑兵'],['Horsemen of the Syr Darya and northern pastures.','锡尔河与北方草原的骑手。'],{atk:1.2,def:0.8,speed:1.8,recon:0.6,siege:0,grain:0.2,fodder:1.0,horses:1.8,cost:0.6,manpower:1.0,herd:true,terrain:T(1.1,0.9,0.6,0.8,1,1.25,0.9,0.5),withdraw:true}),
 C('qiang_bu','qiang',['Qiang highland warriors','羌人山地战士'],['Clan fighters of the highlands.','高原诸部战士。'],{atk:1.1,def:1.0,speed:1.2,recon:0.5,siege:0,grain:0.5,fodder:0.3,horses:0.3,cost:0.5,manpower:1.0,terrain:T(0.9,1.2,1.3,0.9,0.9,1,0.9,0.7)})
].map(c=>[c.id,c]));

export const CULTURE_OF={han:'han',han_loyalist:'han',rival_court:'han',huhanye:'xiongnu',zhizhi:'xiongnu',wusun:'wusun',wusun_lesser:'wusun',kangju:'steppe',wujie:'steppe',jiankun:'steppe',dayuan:'oasis',qiang:'qiang'};
for(const f of ['shanshan','jushi','yanqi','qiuci','yutian','shache','shule'])CULTURE_OF[f]='oasis';
for(const f of Object.values(EURASIAN_FACTIONS))CULTURE_OF[f.id]=['parthian','yuezhi','saka','sogdian'].includes(f.culture)?'steppe':'oasis';
export const cultureOf=f=>CULTURE_OF[f]||(f?.startsWith('usurper')?'han':'oasis');

// Preset templates. Requirements are enforced by recruit().
const tpl=(id,culture,name,mix,req={})=>({id,culture,name,mix,req,preset:true});
export const PRESETS={
 field:tpl('field','han',['Imperial Field Army','朝廷野战军'],{caiguan:40,nu:30,qishi:20,houwang:5,zhuanshu:5}),
 garrison:tpl('garrison','han',['Frontier Garrison','边郡戍军'],{shuzu:55,nu:25,houwang:15,zhuanshu:5},{frontier:true}),
 cavalry:tpl('cavalry','han',['Mobile Cavalry Force','机动骑军'],{qishi:80,houwang:15,zhuanshu:5},{horses:true}),
 siege:tpl('siege','han',['Siege Expedition','攻城军'],{caiguan:40,nu:15,jiang:15,gongcheng:15,zhuanshu:15},{arsenal:true}),
 chanyu:tpl('chanyu','xiongnu',['Chanyu’s Host','单于本部'],{guizu:30,kongxian:60,fuyong:10}),
 raiders:tpl('raiders','xiongnu',['Raiding Horsemen','游骑'],{kongxian:85,fuyong:15}),
 tribal:tpl('tribal','xiongnu',['Subject Tribes','附庸部众'],{fuyong:80,kongxian:20}),
 wusun_host:tpl('wusun_host','wusun',['Kunmi’s Horsemen','昆弥骑众'],{wusun_qi:100}),
 town:tpl('town','oasis',['Town Levy','城郭兵'],{chengguo:55,oasis_gong:35,oasis_qi:10}),
 kangju_host:tpl('kangju_host','steppe',['Kangju Horsemen','康居骑众'],{steppe_qi:100}),
 qiang_band:tpl('qiang_band','qiang',['Highland War Band','羌部战士'],{qiang_bu:100})
};

export function validateMix(culture,mix){
 const errors=[];let total=0;
 for(const [k,v] of Object.entries(mix)){const c=COMPONENTS[k];if(!c)errors.push('unknown:'+k);else if(c.culture!==culture)errors.push('culture:'+k);if(!(v>0))errors.push('share:'+k);total+=v}
 if(total!==100)errors.push('total:'+total);return errors;
}
export function templateStats(t){
 const st={atk:0,def:0,speed:0,recon:0,siege:0,grain:0,fodder:0,horses:0,cost:0,manpower:0,antiCavalry:0,pursuit:0,fortBonus:0,carry:0,roadBonus:0,herd:0,tribal:0,withdraw:0,terrain:{}};
 for(const [k,v] of Object.entries(t.mix)){const c=COMPONENTS[k],w=v/100;
  for(const key of ['atk','def','speed','recon','siege','grain','fodder','horses','cost','manpower','antiCavalry','pursuit','fortBonus','carry','roadBonus'])st[key]+=(c[key]||0)*w;
  if(c.herd)st.herd+=w;if(c.tribal)st.tribal+=w;if(c.withdraw)st.withdraw+=w;
  for(const [tk,tv] of Object.entries(c.terrain))st.terrain[tk]=(st.terrain[tk]||0)+tv*w}
 // speed is limited by the slowest significant element
 const slow=Math.min(...Object.entries(t.mix).filter(([,v])=>v>=10).map(([k])=>COMPONENTS[k].speed));st.speed=Math.min(st.speed,slow+0.25);
 st.cavalryShare=Object.entries(t.mix).reduce((a,[k,v])=>a+((COMPONENTS[k].horses||0)>=1?v:0),0)/100;
 st.needs=[...new Set(Object.keys(t.mix).map(k=>COMPONENTS[k].needs).filter(Boolean))];
 return st;
}
export function templatesFor(s,owner){const culture=cultureOf(owner);return [...Object.values(PRESETS).filter(p=>p.culture===culture),...Object.values(s.templates||{}).filter(t=>t.owner===owner)]}
export function templateById(s,owner,id){return PRESETS[id]&&PRESETS[id].culture===cultureOf(owner)?PRESETS[id]:(s.templates?.[id]?.owner===owner?s.templates[id]:null)}
export function saveTemplate(s,owner,{name,mix}){
 const culture=cultureOf(owner),errors=validateMix(culture,mix);if(errors.length)return {ok:false,errors};
 s.templates||={};const id=`t${s.nextTemplate=(s.nextTemplate||1)+1}`;
 s.templates[id]={id,owner,culture,name:[String(name||'Custom').slice(0,40),String(name||'自定义编制').slice(0,40)],mix:{...mix},preset:false};return {ok:true,id};
}

// Recruitment: real costs and real requirements.
export function recruitQuote(s,owner,regionId,templateId,men=5000){
 const t=templateById(s,owner,templateId),r=s.regions.find(x=>x.id===regionId),f=s.factions[owner];
 if(!t||!r||!f)return {ok:false,reason:'unknown'};
 const st=templateStats(t),k=men/1000;
 const q={treasury:Math.round(st.cost*k*4),grain:Math.round(st.grain*k*2),manpower:men,horses:Math.round(st.horses*k*300),months:t.culture==='han'?2:1};
 const problems=[];
 if(r.owner!==owner)problems.push('not_owner');
 if(f.treasury<q.treasury)problems.push('treasury');if(f.grain<q.grain)problems.push('grain');if(f.manpower<men)problems.push('manpower');if((f.horses||0)<q.horses)problems.push('horses');
 if(st.needs.includes('iron')&&!s.regions.some(x=>x.owner===owner&&(x.iron||x.arsenal)))problems.push('iron');
 if(t.req.frontier&&!r.frontier&&r.kind!=='protectorate')problems.push('frontier_only');
 if(t.req.arsenal&&!s.regions.some(x=>x.owner===owner&&x.arsenal))problems.push('arsenal');
 if(t.req.horses&&!s.regions.some(x=>x.owner===owner&&x.horses)&&cultureOf(owner)==='han')problems.push('horse_country');
 return {ok:!problems.length,problems,quote:q,stats:st};
}
export function recruit(s,owner,regionId,templateId,{men=5000,commander=null,log=()=>{}}={}){
 const q=recruitQuote(s,owner,regionId,templateId,men);if(!q.ok)return q;
 const f=s.factions[owner],t=templateById(s,owner,templateId);
 f.treasury-=q.quote.treasury;f.grain-=q.quote.grain;f.manpower-=men;f.horses=(f.horses||0)-q.quote.horses;
 const id=`a${s.nextArmy=(s.nextArmy||100)+1}`;
 s.armies.push({id,owner,region:regionId,men,morale:60,training:30,supply:100,template:{id:t.id,name:t.name,mix:{...t.mix}},commander,move:null,forming:q.quote.months});
 log(['New formation raised in %REGION%.','于%REGION%新编一军。'],{region:regionId,owner});return {ok:true,id};
}

// ---------- movement and supply ----------
export const routeBetween=(a,b)=>ROUTES.find(r=>(r.a===a&&r.b===b)||(r.a===b&&r.b===a));
export const neighbours=id=>ROUTES.filter(r=>r.a===id||r.b===id).map(r=>r.a===id?r.b:r.a);
export function marchMonths(s,army,to){
 const link=routeBetween(army.region,to);if(!link)return null;
 const st=templateStats(army.template);let m=link.months/Math.max(0.5,st.speed);
 if(link.kind==='steppe'&&st.herd<0.5)m*=1.4;      // infantry in open steppe
 if(link.kind==='desert')m*=st.carry>0.08?1:1.2;   // without transport, desert marches drag
 if(link.kind==='road'&&st.roadBonus)m*=1-st.roadBonus;
 if(['pass'].includes(link.kind)&&st.cavalryShare>0.6)m*=1.15;
 if(isWinter(s)&&['steppe','pass','desert'].includes(link.kind))m*=1.3;
 return Math.max(1,Math.round(m));
}
export const isWinter=s=>[11,12,1,2].includes(s.month);
// Monthly supply for an army in a region. Desert and steppe without herds,
// allied oases or transport cause attrition; horses need fodder.
export function supplyFor(s,army,{access=()=>true}={}){
 const r=s.regions.find(x=>x.id===army.region),st=templateStats(army.template);
 const friendly=r.owner===army.owner||access(army.owner,r.owner);
 let capacity=r.supply*(friendly?1:0.4)*(1+(r.granary||0)*0.15);
 if(r.terrain==='steppe'&&st.herd>0.5)capacity+=4;           // herds feed the host
 if(r.terrain==='desert'&&st.herd<0.5)capacity*=0.5;
 capacity+=st.carry*2;
 const need=army.men/1000*(st.grain+st.fodder*0.5);
 let attrition=0;
 if(need>capacity*2.5)attrition+=Math.min(0.08,(need/(capacity*2.5)-1)*0.04);
 if(r.terrain==='desert'&&st.carry<0.08&&!(friendly&&r.kind==='oasis'))attrition+=0.03;
 if(isWinter(s)&&r.terrain==='steppe'&&st.herd>0.5)attrition+=0.01; // herds lean in winter
 if(isWinter(s)&&['steppe','mountain'].includes(r.terrain)&&st.herd<0.5)attrition+=0.02;
 return {capacity:Math.round(capacity*10)/10,need:Math.round(need*10)/10,attrition:Math.round(attrition*1000)/1000,fodderShort:st.fodder>0.5&&!['steppe','oasis'].includes(r.terrain)&&!friendly};
}

// ---------- battle ----------
export function power(s,army,terrain,{defending=false,fort=0,commanderSkill=50}={}){
 const st=templateStats(army.template),t=st.terrain[terrain]||1;
 const base=army.men/1000*(defending?st.def:st.atk)*t;
 const morale=0.55+army.morale/200,training=0.8+(army.training||0)/250,supply=0.6+Math.min(100,army.supply)/250;
 const cmd=0.85+commanderSkill/333;
 const fortF=defending?1+fort*(0.12+st.fortBonus*0.2):1;
 return base*morale*training*supply*cmd*fortF;
}
// Resolve a battle between attacker and defender armies (arrays of one side each).
// Steppe hosts that judge the odds poor withdraw instead of standing.
export function resolveBattle(s,attackers,defenders,regionId,{skill=()=>50,rand=Math.random}={}){
 const r=s.regions.find(x=>x.id===regionId);
 const side=(list,def)=>list.reduce((a,x)=>a+power(s,x,r.terrain,{defending:def,fort:def&&r.owner===x.owner?r.fort:0,commanderSkill:skill(x)}),0);
 let A=side(attackers,false),D=side(defenders,true);
 // crossbows blunt cavalry-heavy opponents
 const cav=list=>list.reduce((a,x)=>a+templateStats(x.template).cavalryShare*x.men,0)/Math.max(1,list.reduce((a,x)=>a+x.men,0));
 const anti=list=>list.reduce((a,x)=>a+templateStats(x.template).antiCavalry*x.men,0)/Math.max(1,list.reduce((a,x)=>a+x.men,0));
 A*=1-anti(defenders)*cav(attackers);D*=1-anti(attackers)*cav(defenders);
 const withdrawn=[];
 const wantsOut=(list,mine,theirs)=>list.length&&list.every(x=>templateStats(x.template).withdraw>0.6)&&mine/theirs<0.85;
 if(wantsOut(defenders,D,A)){for(const x of defenders){x.withdrawing=true;withdrawn.push(x.id)}return {outcome:'defender_withdrew',withdrawn,A,D,losses:{attacker:0,defender:defenders.reduce((a,x)=>a+Math.round(x.men*0.03),0)}}}
 if(wantsOut(attackers,A,D)){for(const x of attackers){x.withdrawing=true;withdrawn.push(x.id)}return {outcome:'attacker_withdrew',withdrawn,A,D,losses:{attacker:attackers.reduce((a,x)=>a+Math.round(x.men*0.03),0),defender:0}}}
 const luck=0.85+rand()*0.3,ratio=A*luck/Math.max(1,D),attackerWins=ratio>1;
 const loserRate=Math.min(0.45,0.12+Math.abs(ratio-1)*0.15),winnerRate=Math.max(0.04,0.1-Math.abs(ratio-1)*0.03);
 const winners=attackerWins?attackers:defenders,losers=attackerWins?defenders:attackers;
 const pursuit=winners.reduce((a,x)=>a+templateStats(x.template).pursuit*x.men,0)/Math.max(1,winners.reduce((a,x)=>a+x.men,0));
 const losses={attacker:0,defender:0};
 for(const x of winners){const l=Math.round(x.men*winnerRate);x.men-=l;x.morale=Math.min(100,x.morale+8);losses[attackerWins?'attacker':'defender']+=l}
 for(const x of losers){const l=Math.round(x.men*(loserRate+pursuit*0.3));x.men-=l;x.morale=Math.max(5,x.morale-25);losses[attackerWins?'defender':'attacker']+=l;
  // subordinate tribes desert a beaten host
  const trib=templateStats(x.template).tribal;if(trib>0.1){const d=Math.round(x.men*trib*0.25);x.men-=d;losses.tribalDesertion=(losses.tribalDesertion||0)+d}}
 return {outcome:attackerWins?'attacker_won':'defender_won',A,D,ratio,losses};
}
export {REGIONS};
