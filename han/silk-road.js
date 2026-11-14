// SILK ROAD SYSTEM 丝绸之路 — caravans over real routes, through intermediaries.
//
// Caravans move hop by hop along the route graph. Each hop requires political
// access, water (desert legs need an accessible oasis at the far end) and
// security; owners levy tolls. Beyond Kangju the goods pass to Parthian
// intermediaries off-map. Nothing travels faster than the relay: goods and
// rumours take years to reach the far west and as long to come back.
// There is no state-to-state contact between Han and Rome at the start.
import {ROUTES,FAR_WEST,OASIS} from './data.js?v=han-1';
import {access,atWar,relation,treaty} from './frontier.js?v=han-1';
import {placeEasternTrade} from './markets.js?v=faces-horse-remounts-1';
// Merchants pass where armies may not: peace and a tolerable relationship
// suffice, or a caravan/market agreement; oasis rulers must not be estranged.
export function tradeAccess(s,sponsor,owner){if(!owner||owner===sponsor)return true;if(atWar(s,sponsor,owner))return false;if(treaty(s,'caravan',sponsor,owner)||treaty(s,'market',sponsor,owner)||access(s,sponsor,owner))return true;if(OASIS.includes(owner))return (s.protectorate.oasis[owner]?.han||0)>=35;return relation(s,sponsor,owner)>=-35}
import {roll,clamp,log,monthIndex} from './util.js?v=han-1';

export const TRADE_HEAD='changan',TRADE_END='mediterranean_gate';
export function initSilk(s){
 s.silk={caravans:[],relays:[],nextId:1,income:{},functionalMonths:0,lastPath:null,blocked:null,
  contact:{lijian:{level:'unknown',heardAt:null},anxi:{level:'hearsay',heardAt:null}},
  farWestKnows:{seres:false,at:null},embassy:null,security:0,tolls:{}};
}
// Can a caravan sponsored by `sponsor` use the leg a→b?
export function legOpen(s,a,b,sponsor='han'){
 const link=ROUTES.find(r=>(r.a===a&&r.b===b)||(r.a===b&&r.b===a));if(!link)return {ok:false,reason:'no_route'};
 const rb=s.regions.find(x=>x.id===b);if(!rb)return {ok:false,reason:'no_region'};
 if(!tradeAccess(s,sponsor,rb.owner))return {ok:false,reason:'no_access',owner:rb.owner};
 if(link.kind==='desert'&&!(rb.terrain==='oasis'||rb.kind==='oasis'||rb.terrain==='desert'&&tradeAccess(s,sponsor,rb.owner)))return {ok:false,reason:'no_water'};
 if(s.armies.some(x=>x.region===b&&x.men>0&&atWar(s,sponsor,x.owner)))return {ok:false,reason:'fighting'};
 return {ok:true,link};
}
// Cheapest open path: merchants prefer watered oasis roads to open steppe and
// friendly hosts to doubtful ones (Dijkstra over open legs).
const LEG_COST={road:1,river:1,oasis:1,pass:2,desert:2.5,steppe:4};
export function tradePath(s,from=TRADE_HEAD,to=TRADE_END,sponsor='han'){
 const dist={[from]:0},prev={[from]:null},open=new Set([from]),done=new Set();
 while(open.size){let cur=null;for(const n of open)if(cur===null||dist[n]<dist[cur])cur=n;open.delete(cur);done.add(cur);if(cur===to)break;
  for(const l of ROUTES){const nxt=l.a===cur?l.b:l.b===cur?l.a:null;if(!nxt||done.has(nxt))continue;if(!legOpen(s,cur,nxt,sponsor).ok)continue;
   const owner=s.regions.find(r=>r.id===nxt).owner;const d=dist[cur]+LEG_COST[l.kind]*l.months+(owner&&owner!==sponsor&&relation(s,sponsor,owner)<30?2:0);
   if(dist[nxt]===undefined||d<dist[nxt]){dist[nxt]=d;prev[nxt]=cur;open.add(nxt)}}}
 if(!(to in prev))return null;const path=[];for(let c=to;c;c=prev[c])path.unshift(c);return path;
}
export function intermediaries(s,path){return [...new Set((path||[]).map(id=>s.regions.find(r=>r.id===id)?.owner).filter(o=>o&&o!=='han'))]}

function spawnCaravan(s){
 const path=tradePath(s);s.silk.lastPath=path;
 if(!path){s.silk.functionalMonths=0;s.silk.blocked=firstBlock(s);return null}
 s.silk.functionalMonths++;s.silk.blocked=null;
 if(s.silk.caravans.filter(c=>c.shipmentId&&c.status==='travelling').length>=3)return null;
 const order=placeEasternTrade(s,{seller:'han',buyer:'external',origin:TRADE_HEAD,destination:TRADE_END,commodity:'silk',quantity:1});
 if(!order.ok)return null;
 const c={id:s.silk.nextId++,path:order.shipment.path,pos:0,wait:0,goods:['silk'],value:order.shipment.price,start:monthIndex(s),tolls:0,status:'travelling',shipmentId:order.shipment.id,merchantId:order.shipment.merchantId};
 s.silk.caravans.push(c);return c;
}
function firstBlock(s){
 // report the first closed leg on the nominal northern route, for the panel
 const nominal=['changan','tianshui','jincheng','wuwei','zhangye','jiuquan','dunhuang','shanshan','wulei','qiuci','shule','pamir','bactra','margiana','aria','parthia','ecbatana','ctesiphon','hatraregion','osrhoene','commagene','mediterranean_gate'];
 for(let i=0;i<nominal.length-1;i++){const r=legOpen(s,nominal[i],nominal[i+1]);if(!r.ok)return {from:nominal[i],to:nominal[i+1],reason:r.reason,owner:r.owner||null}}
 return null;
}
function moveCaravans(s){
 for(const c of s.silk.caravans.filter(x=>x.status==='travelling')){
  if(c.shipmentId){
   const shipment=s.tradeMarkets?.shipments.find(x=>x.id===c.shipmentId);
   if(!shipment){c.status='turned_back';c.settledAt=monthIndex(s);continue}
   c.pos=Math.min(shipment.leg,c.path.length-1);c.wait=shipment.remaining;
   const here=s.regions.find(x=>x.id===c.path[c.pos]);
   if(here?.owner==='parthia'&&s.silk.contact.anxi.level==='hearsay')s.silk.contact.anxi={level:'trade',heardAt:monthIndex(s)};
   if(shipment.status==='delivered'){c.tolls=shipment.tariffs.reduce((sum,t)=>sum+t.amount,0);arrive(s,c)}
   else if(shipment.status==='stranded'){c.status='turned_back';c.settledAt=monthIndex(s);log(s,['A caravan turns back at %REGION%: the road is closed.','商队在%REGION%受阻折返。'],{region:here?.id||c.path[0],kind:'silk'})}
   else if(shipment.status==='lost'){c.status='lost';c.settledAt=monthIndex(s);log(s,['A caravan is plundered near %REGION%.','商队在%REGION%遭劫。'],{region:shipment.lostNear||here?.id||c.path[0],kind:'silk'})}
   continue;
  }
  if(c.wait>0){c.wait--;continue}
  const a=c.path[c.pos],b=c.path[c.pos+1];
  if(!b){arrive(s,c);continue}
  const leg=legOpen(s,a,b);if(!leg.ok){c.status='turned_back';log(s,['A caravan turns back at %REGION%: the road is closed.','商队在%REGION%受阻折返。'],{region:a,kind:'silk'});continue}
  // bandits where order is weak and no garrison watches the road
  const r=s.regions.find(x=>x.id===b),guarded=s.armies.some(x=>x.region===b&&x.owner==='han'&&x.men>0)||r.fort>=2;
  const risk=(r.unrest?0.06:0)+(guarded?0:0.02)-(s.silk.security||0)*0.01;
  if(roll(s,'bandit'+c.id+b)<risk){c.status='lost';log(s,['A caravan is plundered near %REGION%.','商队在%REGION%遭劫。'],{region:b,kind:'silk'});continue}
  if(owner==='parthia'&&s.silk.contact.anxi.level==='hearsay')s.silk.contact.anxi={level:'trade',heardAt:monthIndex(s)};
  // Older saved caravans have no prepaid buyer or cargo ledger. They still
  // carry delayed reports, but may not mint new toll or sale income.
  c.pos++;c.wait=Math.max(0,leg.link.months-1);
 }
 s.silk.caravans=s.silk.caravans.filter(x=>x.status==='travelling'||monthIndex(s)-(x.settledAt??x.start)<24);
}
function arrive(s,c){
 c.status='arrived';c.settledAt=monthIndex(s);
 if(c.shipmentId){s.silk.income.han=(s.silk.income.han||0)+c.value;for(const tariff of s.tradeMarkets.shipments.find(x=>x.id===c.shipmentId)?.tariffs||[])s.silk.tolls[tariff.owner]=(s.silk.tolls[tariff.owner]||0)+tariff.amount}
 if(c.path.at(-1)==='mediterranean_gate'){
  if(c.shipmentId)s.silk.farWestDeliveries=(s.silk.farWestDeliveries||0)+1;
  s.silk.farWestKnows={seres:true,at:monthIndex(s)};
  s.silk.relays.push({kind:'rumour',node:'han',arrive:monthIndex(s)+18});
  log(s,c.shipmentId?['A caravan reaches the eastern Mediterranean after crossing Central Asia and Parthia.','商队穿越中亚与安息，抵达东地中海。']:['An older caravan report reaches the eastern Mediterranean.','旧商队的行程报告抵达东地中海。'],{kind:'silk',region:'mediterranean_gate'});
 }else{
  // Compatibility with older saves whose caravans still end at Kangju.
  s.silk.relays.push({kind:'goods',node:'anxi',arrive:monthIndex(s)+FAR_WEST[0].months});
  log(s,['An older caravan report reaches Kangju; news continues west by relay.','旧商队的行程报告抵达康居，消息由驿路继续西传。'],{kind:'silk',region:'kangju'});
 }
}
function advanceRelays(s){
 const now=monthIndex(s);
 for(const r of s.silk.relays.filter(x=>!x.done&&x.arrive<=now)){
  r.done=true;
  if(r.kind==='goods'&&r.node==='anxi'){s.silk.contact.anxi.level='trade';s.silk.relays.push({kind:'goods',node:'lijian',arrive:now+FAR_WEST[1].months})}
  else if(r.kind==='goods'&&r.node==='lijian'){if(!s.silk.farWestKnows.seres){s.silk.farWestKnows={seres:true,at:now}}
   // a rumour of the far west starts back along the same chain
   s.silk.relays.push({kind:'rumour',node:'han',arrive:now+FAR_WEST[1].months+FAR_WEST[0].months})}
  else if(r.kind==='rumour'&&r.node==='han'){if(s.silk.contact.lijian.level==='unknown'){s.silk.contact.lijian={level:'rumour',heardAt:now};log(s,['Merchants from Kangju repeat tales of Lijian, a land far beyond Anxi.','康居商人转述安息以西有犁靬之国的传闻。'],{kind:'silk'})}}
  else if(r.kind==='embassy'){s.silk.contact.lijian={level:'embassy',heardAt:now};s.silk.embassy.status='arrived';log(s,['The Han trade embassy reaches the far west after years on the road (alternate history).','汉朝通商使团历经数年抵达极西之地（架空历史）。'],{kind:'silk'})}
 }
 s.silk.relays=s.silk.relays.filter(x=>!x.done||now-x.arrive<6);
}
// An embassy to the far west is possible only once rumours have come back,
// the road has stayed open for three years and the intermediaries agree.
export function embassyConditions(s){
 const c={rumour:s.silk.contact.lijian.level!=='unknown',road:s.silk.functionalMonths>=36,kangju:relation(s,'han','kangju')>=20,treasury:s.factions.han.treasury>=150,idle:!s.silk.embassy};
 return {...c,ok:Object.values(c).every(Boolean)};
}
export function sendTradeEmbassy(s){
 const c=embassyConditions(s);if(!c.ok)return {ok:false,conditions:c};
 s.factions.han.treasury-=150;s.silk.embassy={status:'travelling',sent:monthIndex(s)};
 s.silk.relays.push({kind:'embassy',node:'lijian',arrive:monthIndex(s)+FAR_WEST[0].months+FAR_WEST[1].months+6});
 log(s,['A trade embassy sets out for the far west.','通商使团启程前往极西之地。'],{kind:'silk'});return {ok:true};
}
export function protectRoute(s,amount=20){if(s.factions.han.treasury<amount)return {ok:false};s.factions.han.treasury-=amount;s.silk.security=clamp((s.silk.security||0)+1,0,5);return {ok:true}}
export function advanceSilk(s){
 if(s.month%2===0)spawnCaravan(s);else{const p=tradePath(s);s.silk.lastPath=p;if(p)s.silk.functionalMonths++;else{s.silk.functionalMonths=0;s.silk.blocked=firstBlock(s)}}
 moveCaravans(s);advanceRelays(s);
 if(s.month===1)s.silk.security=Math.max(0,(s.silk.security||0)-1);
}
export {OASIS};
