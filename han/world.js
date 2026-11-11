// MANDATE OF HEAVEN inside the Roman campaign.
//
// The Han world is a complete NPC simulation (court, Liu succession, Xiongnu,
// Western Regions, Wusun, Kangju, Silk Road) advancing month by month with the
// Roman calendar. The player is always Roman and never controls a Chinese
// power. Rome learns about the East only through merchant reports carried
// along the Silk Road and through Parthia: every report is years old when it
// arrives, and Rome starts with nothing but an old account.
import {newHanGame,tick as hanTick,loadHanSave} from './engine.js?v=han-1';
import {REGIONS,FACTIONS} from './data.js?v=han-1';
import {isLiuClan} from './dynasty.js?v=han-1';

export const DLC_KEY='hanWorld';
const mi=(y,m)=>y*12+m;
const PUBLIC_KINDS=new Set(['throne','war','disaster','frontier']);
// Months for news to reach a Roman eastern port. With Han goods already moving
// to Parthia, merchants carry reports along that chain; otherwise only steppe
// hearsay passes, slowly.
export const RELAY_MONTHS={trade:26,hearsay:40};
const EAST_PORTS=['syria','egypt','anatolia','achaia'];

export const hanWorld=s=>s.world?.[DLC_KEY]||null;
export function attachHanWorld(s,{seed=null}={}){
 if(hanWorld(s))return hanWorld(s);
 const state=newHanGame(null,{start:'roman',seed:seed??((s.seed||Date.now())%2147483647)});
 state.year=s.year;state.month=s.month;
 // An old merchant account already circulating in the eastern ports (51 BCE).
 const snapshot={year:-51,month:6,via:'old',owners:Object.fromEntries(state.regions.map(r=>[r.id,r.owner])),emperor:'liu-xun',emperorName:state.persons['liu-xun'].name,dynasty:['Han','汉'],dynastyOrthodox:true};
 s.world[DLC_KEY]={state,queue:[],known:{snapshot,dispatches:[],firstLive:null,silkCargoes:0},embassy:null,lastDeliveries:0};
 return s.world[DLC_KEY];
}
const fill=(h,e,lang)=>{const n=id=>h.persons[id]?.name?.[lang]||id;const f=id=>FACTIONS[id]?.name?.[lang]||id;const reg=id=>REGIONS.find(r=>r.id===id)?.name?.[lang]||id;
 return String(e.text[lang]).replace('%NAME2%',n(e.who2)).replace('%NAME%',n(e.who)).replace('%REGION%',e.region?reg(e.region):'').replace('%FACTION2%',f(e.faction2)).replace('%FACTION%',f(e.faction))};
function relayDelay(h){return h.silk.contact.anxi.level==='trade'?RELAY_MONTHS.trade:RELAY_MONTHS.hearsay}
function snapshotOf(h){const e=h.throne.orthodox||h.throne.occupant;return {year:h.year,month:h.month,owners:Object.fromEntries(h.regions.map(r=>[r.id,r.owner])),emperor:e,emperorName:e?h.persons[e]?.name:null,dynasty:h.throne.dynasty.name,dynastyOrthodox:!!h.throne.dynasty.orthodox,orthodoxIsLiu:!h.throne.orthodox||isLiuClan(h,h.throne.orthodox)}}

// Called from the Roman monthly tick.
export function advanceHanWorld(s){
 const w=hanWorld(s);if(!w)return;
 const h=w.state,before=h.log.length?h.log[h.log.length-1]:null;
 const startIndex=h.log.length;
 h.year=s.year;h.month=s.month;h.month--;if(h.month<1){h.month=12;h.year--}
 hanTick(h); // advances to the Roman date
 const now=mi(s.year,s.month),delay=relayDelay(h);
 // public events start their long journey west
 const fresh=h.log.slice(startIndex).filter(e=>PUBLIC_KINDS.has(e.kind)).slice(0,4);
 for(const e of fresh)w.queue.push({arrive:now+delay,kind:'event',origin:{year:e.year,month:e.month},en:fill(h,e,0),zh:fill(h,e,1),eventKind:e.kind});
 if(s.month===7)w.queue.push({arrive:now+delay,kind:'snapshot',snapshot:snapshotOf(h)});
 // silk carried through Parthia reaches the Roman east
 const deliveries=h.silk.farWestDeliveries||0;
 if(deliveries>w.lastDeliveries){w.lastDeliveries=deliveries;const holder=EAST_PORTS.map(id=>s.regions.find(r=>r.id===id)).find(r=>r&&['caesar','senate'].includes(r.owner));
  if(holder&&s.factions[holder.owner]){s.factions[holder.owner].treasury+=4;w.known.silkCargoes++;
   if(holder.owner===s.player)romanLog(s,`Seric silk arrives through Parthian merchants and is sold in ${holder.name[0]}; customs bring 4 treasury.`,`赛里斯丝绸经安息商人运抵${holder.name[1]}，关税收入4。`)}}
 // the Roman embassy, if any
 if(w.embassy?.status==='travelling'&&now>=w.embassy.arrive){w.embassy.status='arrived';h.silk.contact.lijian={level:'embassy',heardAt:mi(h.year,h.month)};
  const e=h.throne.orthodox;const welcome=h.relations&&e;w.embassy.reception=welcome?'received':'unclear';
  h.log.push({year:h.year,month:h.month,text:['Envoys from Lijian in the far west reach the Han court (alternate history).','极西犁靬之国使者抵达汉廷（架空历史）。'],kind:'frontier'});
  w.queue.push({arrive:now+delay,kind:'embassy_return',en:`Our envoys reached the court of the Seres${e?`, ruled by ${h.persons[e].name[0]}`:''}. They report a vast realm and an emperor of the house of Liu.`,zh:`我方使者已抵达赛里斯朝廷${e?`，其君为${h.persons[e].name[1]}`:''}。使者回报其国广大，皇帝出自刘氏。`,origin:{year:h.year,month:h.month}})}
 // reports arrive
 for(const item of w.queue.filter(x=>x.arrive<=now)){
  if(item.kind==='snapshot'){w.known.snapshot={...item.snapshot,via:'merchants',received:{year:s.year,month:s.month}};continue}
  const d={received:{year:s.year,month:s.month},origin:item.origin,en:item.en,zh:item.zh,kind:item.kind};w.known.dispatches.unshift(d);w.known.dispatches=w.known.dispatches.slice(0,60);
  if(!w.known.firstLive)w.known.firstLive={year:s.year,month:s.month};
  if(item.kind==='embassy_return'){w.embassy.status='returned';w.embassy.returned={year:s.year,month:s.month}}
  romanLog(s,`Merchant report from the Seres (events of ${Math.abs(item.origin.year)} BCE): ${item.en}`,`赛里斯传闻（公元前${Math.abs(item.origin.year)}年之事）：${item.zh}`);
 }
 w.queue=w.queue.filter(x=>x.arrive>now);
}
function romanLog(s,en,zh){s.log.unshift({month:s.month,year:s.year,en,zh,eastern:true});s.log=s.log.slice(0,80)}

// The Roman player can send an embassy east once news flows, Parthia lets
// envoys pass and the treasury allows it. It takes years each way.
export const EMBASSY_COST=80,EMBASSY_MONTHS=30;
export function embassyConditions(s){
 const w=hanWorld(s);if(!w)return {ok:false};
 const parthia=s.regions.some(r=>r.owner==='parthia');const atWar=(s.wars||[]).some(x=>x.includes(s.player)&&x.includes('parthia'));
 const c={reports:!!w.known.firstLive,parthia:parthia&&!atWar,treasury:(s.factions[s.player]?.treasury||0)>=EMBASSY_COST,idle:!w.embassy};
 return {...c,ok:Object.values(c).every(Boolean)};
}
export function sendEmbassyToSeres(s){
 const c=embassyConditions(s);if(!c.ok)return {ok:false,conditions:c};
 s.factions[s.player].treasury-=EMBASSY_COST;hanWorld(s).embassy={status:'travelling',sent:{year:s.year,month:s.month},arrive:mi(s.year,s.month)+EMBASSY_MONTHS,by:s.player};
 romanLog(s,'Envoys leave for the land of the Seres by way of Parthia. The journey will take years.','使者经安息启程前往赛里斯之国，此行将历时数年。');return {ok:true};
}
export function upgradeHanWorld(s){const w=hanWorld(s);if(!w)return;w.state=loadHanSave(w.state);w.queue||=[];w.known||={snapshot:null,dispatches:[]}}
// What the Roman player knows, never the live Han state.
export function romanView(s){const w=hanWorld(s);if(!w)return null;return {snapshot:w.known.snapshot,dispatches:w.known.dispatches,silkCargoes:w.known.silkCargoes,embassy:w.embassy?{...w.embassy}:null,conditions:embassyConditions(s)}}
