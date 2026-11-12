// FRONTIER AFFAIRS — the Western Regions Protectorate, the two Xiongnu
// courts, the Wusun kunmi, Kangju and the oasis kingdoms.
//
// Han authority in the Western Regions is layered: each oasis kingdom keeps
// its own ruler and internal autonomy while its standing toward Han and
// toward the Xiongnu shifts. Standing has real effects: route access and
// supply for armies and caravans, tribute, levies, and intelligence.
//
// Every AI decision uses the deciding faction's own intelligence picture
// (s.intel[faction]); nobody reads the true map.
import {OASIS,STEPPE,FACTIONS,PLAYABLE} from './data.js?v=han-1';
import {neighbours,templateStats,routeBetween,marchMonths} from './military.js?v=han-1';
import {roll,clamp,log,monthIndex} from './util.js?v=han-1';
import {rulerMilitaryJudgment} from './rulers.js';

const key=(a,b)=>[a,b].sort().join(':');
export const relation=(s,a,b)=>a===b?100:(s.relations[key(a,b)]??0);
export function setRelation(s,a,b,v){s.relations[key(a,b)]=Math.round(clamp(v,-100,100))}
export const shiftRelation=(s,a,b,d)=>setRelation(s,a,b,relation(s,a,b)+d);
export const atWar=(s,a,b)=>a!==b&&s.wars.some(w=>w.includes(a)&&w.includes(b));
export const treaty=(s,type,a,b)=>s.treaties.find(t=>t.type===type&&t.parties.includes(a)&&t.parties.includes(b));
// Access: may a's armies and caravans use b's territory?
export function access(s,a,b){if(!b||a===b)return true;if(atWar(s,a,b))return false;
 if(treaty(s,'alliance',a,b)||treaty(s,'tributary',a,b)||treaty(s,'protection',a,b)||treaty(s,'caravan',a,b))return true;
 if(a==='han'&&OASIS.includes(b))return (s.protectorate.oasis[b]?.han||0)>=50;
 return relation(s,a,b)>=40}

// ---------- intelligence & fog of war ----------
export function initIntel(s){s.intel={};for(const f of Object.keys(s.factions))s.intel[f]={};observe(s)}
export function observe(s){
 const m=monthIndex(s);
 for(const f of Object.keys(s.factions)){
  const intel=s.intel[f]||={};
  const seen=new Set();
  for(const r of s.regions)if(r.owner===f){seen.add(r.id);for(const n of neighbours(r.id))if(fortWatch(s,r))seen.add(n)}
  for(const a of s.armies)if(a.owner===f&&a.men>0){seen.add(a.region);const recon=templateStats(a.template).recon;if(recon>0.2)for(const n of neighbours(a.region))seen.add(n)}
  // the Protectorate watches oases that stand with Han
  if(f==='han')for(const o of OASIS)if((s.protectorate.oasis[o]?.han||0)>=60)for(const r of s.regions.filter(x=>x.owner===o))seen.add(r.id);
  for(const id of seen){const r=s.regions.find(x=>x.id===id);intel[id]={month:m,owner:r.owner,armies:s.armies.filter(a=>a.region===id&&a.men>0).map(a=>({owner:a.owner,men:Math.round(a.men/500)*500}))}}
 }
}
const fortWatch=(s,r)=>r.fort>=2||r.frontier||r.kind==='capital';
export function knownStrength(s,viewer,regionId,{hostileTo=viewer}={}){
 const i=s.intel[viewer]?.[regionId];if(!i)return null;
 return {age:monthIndex(s)-i.month,men:i.armies.filter(a=>a.owner!==hostileTo&&atWar(s,hostileTo,a.owner)).reduce((x,a)=>x+a.men,0),owner:i.owner};
}

// ---------- the Protectorate ----------
export function initProtectorate(s){
 const base={shanshan:[70,15],jushi:[55,35],yanqi:[50,30],qiuci:[65,20],yutian:[50,15],shache:[60,15],shule:[50,20]};
 s.protectorate={seat:'wulei',oasis:Object.fromEntries(OASIS.map(o=>[o,{han:(base[o]||[45,15])[0],xiongnu:(base[o]||[45,15])[1],autonomy:80,hostage:o==='shanshan'||o==='qiuci',tribute:0,levy:0,concern:0,lastAct:null}]))};
}
export const PROTECTORATE_ACTIONS={
 envoy:{name:['Send an envoy with gifts','遣使赠礼'],cost:{treasury:10},effect:(st)=>{st.han+=8}},
 hostage:{name:['Request a hostage prince','请遣质子'],cost:{},effect:(st)=>{st.hostage=true;st.han+=3;st.concern+=8}},
 levy:{name:['Call up oasis troops','征发城郭兵'],cost:{},effect:(st)=>{st.levy=2;st.concern+=12;st.han-=4}},
 garrison:{name:['Station a garrison','驻屯戍卒'],cost:{treasury:25},effect:(st)=>{st.han+=6;st.concern+=15;st.autonomy-=5}},
 market:{name:['Grant market privileges','许以互市'],cost:{treasury:5},effect:(st)=>{st.han+=6;st.trade=(st.trade||0)+1}}
};
export function protectorateAction(s,oasis,action,{owner='han'}={}){
 const st=s.protectorate.oasis[oasis],a=PROTECTORATE_ACTIONS[action];if(!st||!a)return {ok:false,reason:'unknown'};
 if(!s.regions.some(r=>r.owner==='han'&&r.id===s.protectorate.seat))return {ok:false,reason:'no_protectorate'};
 if((a.cost.treasury||0)>s.factions[owner].treasury)return {ok:false,reason:'cost'};
 s.factions[owner].treasury-=a.cost.treasury||0;
 const protector=s.court.offices.duhu&&s.persons[s.court.offices.duhu]?.alive?s.persons[s.court.offices.duhu]:null;
 const before=st.han;a.effect(st);st.han+=protector?Math.round((protector.competence||50)/25):-2;
 st.han=clamp(st.han);st.autonomy=clamp(st.autonomy);st.concern=clamp(st.concern);
 log(s,[a.name[0]+' — %REGION%.',a.name[1]+'——%REGION%。'],{region:s.regions.find(r=>r.owner===oasis)?.id,kind:'frontier'});
 return {ok:true,change:st.han-before};
}
// An oasis ruler decides on his own each month.
function oasisDecides(s,o){
 const st=s.protectorate.oasis[o];if(!st||!s.regions.some(r=>r.owner===o))return;
 const hanSeat=s.regions.find(r=>r.id==='wulei');const hanHere=hanSeat?.owner==='han';
 const hanForce=(s.intel[o]?.wulei?.armies||[]).filter(a=>a.owner==='han').reduce((x,a)=>x+a.men,0);
 const zhizhiNear=s.regions.some(r=>r.owner==='zhizhi'&&neighbours(r.id).some(n=>s.regions.find(x=>x.id===n)?.owner===o));
 const protector=s.court.offices.duhu&&s.persons[s.court.offices.duhu]?.alive;
 let drift=(hanHere?1:-3)+(protector?1:-1)+(hanForce>3000?1:0)-(st.concern>40?2:0)+(st.trade?1:0)-(zhizhiNear?1:0);
 st.han=clamp(st.han+drift*0.5);st.xiongnu=clamp(st.xiongnu+(zhizhiNear?1:-0.5)+(st.concern>50?1:0));
 st.concern=clamp(st.concern-1.5);if(st.levy>0)st.levy--;
 // concrete acts
 const r=roll(s,'oasis'+o);
 if(st.han>=60&&r<0.15){st.tribute+=1;s.factions.han.treasury+=2;st.lastAct='tribute'}
 else if(st.han<35&&st.xiongnu>45&&r<0.2){st.lastAct='courts_xiongnu';shiftRelation(s,o,'zhizhi',8);shiftRelation(s,o,'han',-6);log(s,['%FACTION% opens talks with Zhizhi.','%FACTION%与郅支单于暗通款曲。'],{faction:o,kind:'frontier'})}
 else if(st.concern>55&&r<0.2){st.lastAct='refuses_levy';st.levy=0;st.han=clamp(st.han-5);log(s,['%FACTION% refuses the Protectorate’s levy, citing its autonomy.','%FACTION%以自治为由拒绝都护征发。'],{faction:o,kind:'frontier'})}
 else if(zhizhiNear&&st.han>50&&r<0.15&&!treaty(s,'protection','han',o)){propose(s,o,'han','protection')}
}

// ---------- treaties & proposals ----------
export const TREATY_TYPES={
 peace:['Peace','和约'],alliance:['Alliance','结盟'],tributary:['Tributary submission','称臣朝贡'],marriage:['Marriage alliance (heqin)','和亲'],
 hostage:['Hostage exchange','遣质子'],caravan:['Caravan agreement','商队协议'],market:['Frontier markets','关市互市'],protection:['Protection','请求保护'],recognition:['Recognition of a ruler','承认君位']
};
export function propose(s,from,to,type,{terms={}}={}){
 if(!TREATY_TYPES[type]||from===to)return {ok:false,reason:'invalid'};
 if(treaty(s,type,from,to))return {ok:false,reason:'exists'};
 const p={id:s.nextProposal=(s.nextProposal||1)+1,from,to,type,terms,month:monthIndex(s),status:'pending'};s.proposals.push(p);
 if(to!==s.player)decideProposal(s,p);
 return {ok:true,proposal:p};
}
// The receiving court decides from its own interests and intelligence.
export function proposalScore(s,p){
 const {from,to,type}=p;let v=relation(s,from,to)*0.5;
 const threat=threatTo(s,to);const theirPower=estimatedPower(s,to,from),myPower=estimatedPower(s,to,to);
 switch(type){
  case 'peace':v+=atWar(s,from,to)?(theirPower>myPower?30:5)+(s.factions[to].treasury<40?15:0):-100;break;
  case 'alliance':v+=threat*0.6-15+(OASIS.includes(to)&&from==='han'?10:0);break;
  case 'tributary':v+=to==='han'?40:(theirPower>myPower*1.5?20:-40);break;
  case 'marriage':v+=15;break;case 'hostage':v+=from==='han'?-10:5;break;
  case 'caravan':case 'market':v+=20+(OASIS.includes(to)?10:0);break;
  case 'protection':v+=to==='han'?(threat>20?25:5):10;break;
  case 'recognition':v+=20;break;
 }
 if(to==='zhizhi'&&from==='han'&&['tributary','hostage'].includes(type))v-=40;
 return Math.round(v);
}
export function decideProposal(s,p){
 const score=proposalScore(s,p);p.score=score;
 if(score>=20){acceptProposal(s,p);return true}
 p.status='rejected';shiftRelation(s,p.from,p.to,-2);
 log(s,['%FACTION% declines the proposal ('+TREATY_TYPES[p.type][0]+').','%FACTION%拒绝提议（'+TREATY_TYPES[p.type][1]+'）。'],{faction:p.to,kind:'diplomacy'});return false;
}
export function acceptProposal(s,p){
 p.status='accepted';
 if(p.type==='peace'){s.wars=s.wars.filter(w=>!(w.includes(p.from)&&w.includes(p.to)))}
 else s.treaties.push({type:p.type,parties:[p.from,p.to],since:monthIndex(s)});
 shiftRelation(s,p.from,p.to,p.type==='marriage'?20:10);
 if(OASIS.includes(p.to)&&['han'].includes(p.from)){const st=s.protectorate.oasis[p.to];st.han=clamp(st.han+8)}
 if(OASIS.includes(p.from)&&p.to==='han'){const st=s.protectorate.oasis[p.from];st.han=clamp(st.han+10)}
 log(s,['%FACTION% accepts: '+TREATY_TYPES[p.type][0]+'.','%FACTION%接受：'+TREATY_TYPES[p.type][1]+'。'],{faction:p.to,kind:'diplomacy'});
}
export function answerProposal(s,id,accept){const p=s.proposals.find(x=>x.id===id&&x.status==='pending');if(!p)return {ok:false};if(accept)acceptProposal(s,p);else{p.status='rejected';shiftRelation(s,p.from,p.to,-3)}return {ok:true}}
export function declareWar(s,a,b){if(atWar(s,a,b)||a===b)return {ok:false};s.wars.push([a,b]);s.treaties=s.treaties.filter(t=>!(t.parties.includes(a)&&t.parties.includes(b)));setRelation(s,a,b,Math.min(-40,relation(s,a,b)-40));
 // defensive coalitions: oasis states rally against an aggressor that attacks one of them
 if(OASIS.includes(b))for(const o of OASIS)if(o!==b&&o!==a&&relation(s,o,b)>20&&relation(s,o,a)<10&&roll(s,'coal'+o+a)<0.5){if(!s.coalitions.some(c=>c.against===a&&c.members.includes(o))){const c=s.coalitions.find(c=>c.against===a)||(s.coalitions.push({against:a,members:[b]}),s.coalitions[s.coalitions.length-1]);c.members.push(o);shiftRelation(s,o,a,-15)}}
 log(s,['%FACTION% declares war on %FACTION2%.','%FACTION%向%FACTION2%宣战。'],{faction:a,faction2:b,kind:'war'});return {ok:true}}

export function estimatedPower(s,viewer,target){
 // own forces are known; others only from intelligence
 if(viewer===target)return s.armies.filter(a=>a.owner===target&&a.men>0).reduce((x,a)=>x+a.men,0);
 return Object.values(s.intel[viewer]||{}).reduce((x,i)=>x+i.armies.filter(a=>a.owner===target).reduce((y,a)=>y+a.men,0),0);
}
export function threatTo(s,f){
 let t=0;for(const r of s.regions.filter(x=>x.owner===f))for(const n of neighbours(r.id)){const k=knownStrength(s,f,n);if(k&&k.owner!==f&&relation(s,f,k.owner)<0)t+=k.men/1000}
 return Math.round(t);
}

// ---------- steppe politics ----------
function steppeDecides(s,f){
 if(!s.regions.some(r=>r.owner===f)||f===s.player)return;
 const r=roll(s,'steppe'+f);
 if(f==='huhanye'){
  // a dependent ally: needs grain; may ask Han for aid, may drift if neglected
  if(s.factions.huhanye.grain<30&&r<0.2&&!s.pendingRequests.some(x=>x.from==='huhanye')){s.pendingRequests.push({id:s.nextProposal=(s.nextProposal||1)+1,from:'huhanye',to:'han',kind:'grain_aid',amount:40,deadline:3});const ruler=s.rulers?.huhanye?.name||['The allied chanyu','归附单于'];log(s,[`${ruler[0]} asks the Han court for grain.`,`${ruler[1]}请汉廷赐粮。`],{faction:'huhanye',kind:'diplomacy'})}
  if(relation(s,'huhanye','han')<20&&r<0.05)shiftRelation(s,'huhanye','zhizhi',5);
 }
 if(f==='zhizhi'){
  // westward ambitions against the northern peoples (no fixed script)
  const target=['wujie','jiankun'].find(t=>s.regions.some(x=>x.owner===t)&&!atWar(s,'zhizhi',t));
  if(target&&r<0.06)declareWar(s,'zhizhi',target);
  if(r>0.95&&!treaty(s,'alliance','zhizhi','kangju'))propose(s,'zhizhi','kangju','alliance');
  // court oasis kings who resent Han garrisons
  for(const o of OASIS){const st=s.protectorate.oasis[o];if(st.concern>45&&roll(s,'zz'+o)<0.1){st.xiongnu=clamp(st.xiongnu+6);const ruler=s.rulers?.zhizhi?.name||['The northern chanyu','北部单于'];log(s,[`${ruler[0]} offers support to %FACTION%.`,`${ruler[1]}向%FACTION%示好，许以援助。`],{faction:o,kind:'frontier'});s.westernCrisis={oasis:o,month:monthIndex(s)}}}
 }
 if(f==='wusun'||f==='wusun_lesser'){
  // the kunmi weigh the balance between Han and the Xiongnu
  const hanStanding=Object.values(s.protectorate.oasis).reduce((a,x)=>a+x.han,0)/OASIS.length;
  shiftRelation(s,f,'han',hanStanding>55?0.5:-0.5);
  if(s.westernCrisis&&monthIndex(s)-s.westernCrisis.month<3&&r<0.3){shiftRelation(s,f,'zhizhi',hanStanding>55?-4:3);s.westernCrisis.wusun=(hanStanding>55?'leans_han':'hedges')}
 }
 if(f==='kangju'&&r<0.03&&relation(s,'kangju','wusun')<0)shiftRelation(s,'kangju','zhizhi',3);
}
export function answerRequest(s,id,accept){
 const q=s.pendingRequests.find(x=>x.id===id);if(!q)return {ok:false};
 if(accept&&s.factions.han.grain>=q.amount){s.factions.han.grain-=q.amount;s.factions[q.from].grain+=q.amount;shiftRelation(s,q.from,'han',12)}else shiftRelation(s,q.from,'han',-8);
 s.pendingRequests=s.pendingRequests.filter(x=>x.id!==id);return {ok:true};
}

// When Han strengthens the western garrisons, neighbours notice.
function garrisonWatch(s){
 const wr=new Set(['wulei',...s.regions.filter(r=>OASIS.includes(r.owner)).map(r=>r.id)]);
 const men=s.armies.filter(a=>a.owner==='han'&&wr.has(a.region)).reduce((x,a)=>x+a.men,0);
 const prev=s.protectorate.lastGarrison||0;s.protectorate.lastGarrison=men;
 if(men>prev+4000){for(const o of OASIS){const st=s.protectorate.oasis[o];st.concern=clamp(st.concern+10)}
  s.court.debates.push({id:s.court.nextId++,kind:'western_garrison',options:['reassure','press'],deadline:2});
  log(s,['Han reinforcements reach the Western Regions; oasis rulers worry for their autonomy.','汉军增援西域，诸国忧其自主。'],{kind:'frontier'})}
}

// ---------- AI military ----------
export function aiMilitary(s,f,{issueMove}){
 if(f===s.player)return;
 for(const a of s.armies.filter(x=>x.owner===f&&x.men>0&&!x.move&&!x.forming)){
  if(a.withdrawing){const back=neighbours(a.region).find(n=>{const r=s.regions.find(x=>x.id===n);return r.owner===f||access(s,f,r.owner)});if(back)issueMove(a,back);a.withdrawing=false;continue}
  const mine=a.men;
  const options=neighbours(a.region).map(n=>{const r=s.regions.find(x=>x.id===n),k=knownStrength(s,f,n);return {n,r,k}})
   .filter(o=>o.r.owner&&atWar(s,f,o.r.owner)&&o.k&&o.k.age<=6);
  // The reigning ruler's military judgment changes risk tolerance. Only
  // dated observations in knownStrength may inform the target choice.
  const target=options.filter(o=>o.k.men<mine*rulerMilitaryJudgment(s,f)).sort((x,y)=>x.k.men-y.k.men)[0];
  if(target)issueMove(a,target.n);
 }
}

export function advanceFrontier(s,{issueMove}){
 observe(s);
 for(const o of OASIS)if(o!==s.player)oasisDecides(s,o);
 for(const f of STEPPE)steppeDecides(s,f);
 garrisonWatch(s);
 for(const q of [...s.pendingRequests])if(--q.deadline<=0)answerRequest(s,q.id,s.player!=='han'&&s.factions.han.grain>q.amount*2);
 for(const p of s.proposals.filter(x=>x.status==='pending'&&monthIndex(s)-x.month>=3)){p.status='expired'}
 for(const f of Object.keys(s.factions))if(f!==s.player&&!s.factions[f].defeated)aiMilitary(s,f,{issueMove});
}
export {FACTIONS,PLAYABLE};
