// MANDATE OF HEAVEN inside the Roman campaign.
//
// The Han world is a complete NPC simulation (court, Liu succession, Xiongnu,
// Western Regions, Wusun, Kangju, Silk Road) advancing month by month with the
// Roman calendar. The player is always Roman and never controls a Chinese
// power. Rome learns about the East only through merchant reports carried
// along the Silk Road and through Parthia: every report is years old when it
// arrives, and Rome starts with nothing but an old account.
import {newHanGame,tick as hanTick,loadHanSave} from './engine.js?v=faces-name-disagreement-1';
import {REGIONS,FACTIONS} from './data.js?v=han-1';
import {isLiuClan} from './dynasty.js?v=han-1';
import {initializeMarkets,marketCarrierRoute,marketCarrierRouteOpen} from '../trade-markets.js?v=faces-import-passage-1';
import {COMMODITIES,marketPrice} from '../market-goods.js?v=faces-wheels-1';

export const DLC_KEY='hanWorld';
const mi=(y,m)=>y*12+m;
const PUBLIC_KINDS=new Set(['throne','war','disaster','frontier']);
// Months for news to reach a Roman eastern port. With Han goods already moving
// to Parthia, merchants carry reports along that chain; otherwise only steppe
// hearsay passes, slowly.
export const RELAY_MONTHS={trade:26,hearsay:40};
const EAST_PORTS=['syria','egypt','anatolia','achaia'];
// The exchange is in the Syrian theater. Final legs use the same access,
// terrain, roads and sea lanes as ordinary Roman market caravans.
const importQuote=(s,cargo,port,owner,{planFor=null,routeCache=null}={})=>{if(!EAST_PORTS.includes(port))return null;const key=`${owner}:${port}:${planFor||''}`;let route=routeCache?.get(key);if(route===undefined){route=marketCarrierRoute(s,'syria',port,owner,{planFor});routeCache?.set(key,route||null)}if(!route)return null;const months=route.cost,transport=Math.ceil(months*cargo.quantity/2);return {months,path:route.path,legs:route.legs,transport,total:cargo.price+transport}};
const EASTERN_RELAY_MARKETS={parthia:'ctesiphon',media:'ecbatana'};
const historicalRomanExports=s=>Object.fromEntries((s.markets?.transactions||[]).filter(tx=>tx.shipment&&['caesar','senate'].includes(tx.seller)&&tx.buyer==='parthia'&&EASTERN_RELAY_MARKETS[tx.destination]).map(tx=>[tx.shipment,{status:'legacy'}]));
const PLAYER_IMPORT_PRIORITY_MONTHS=3;
const campaignClosed=s=>!!(s.defeat||s.victory||s.peacefulVictory);

export const hanWorld=s=>s.world?.[DLC_KEY]||null;
export function attachHanWorld(s,{seed=null}={}){
 if(hanWorld(s))return hanWorld(s);
 const state=newHanGame(null,{start:'roman',seed:seed??((s.seed||Date.now())%2147483647)});
 // The attached eastern simulation has its own buyers and finite markets.
 // Roman courts do not control their orders or see them without a report.
 state.tradeMarkets.embeddedRoman=true;
 state.tradeMarkets.autonomousEnabled=true;
 state.year=s.year;state.month=s.month;
 // An old merchant account already circulating in the eastern ports (51 BCE).
 const snapshot={year:-51,month:6,via:'old',owners:Object.fromEntries(state.regions.map(r=>[r.id,r.owner])),emperor:'liu-xun',emperorName:state.persons['liu-xun'].name,dynasty:['Han','汉'],dynastyOrthodox:true};
 s.world[DLC_KEY]={state,queue:[],known:{snapshot,dispatches:[],firstLive:null,silkCargoes:0},embassy:null,lastDeliveries:0,bridge:{settled:{},romanExports:historicalRomanExports(s)}};
 return s.world[DLC_KEY];
}
const fill=(h,e,lang)=>{const n=id=>h.persons[id]?.name?.[lang]||id;const f=id=>FACTIONS[id]?.name?.[lang]||id;const reg=id=>REGIONS.find(r=>r.id===id)?.name?.[lang]||id;
 return String(e.text[lang]).replace('%NAME2%',n(e.who2)).replace('%NAME%',n(e.who)).replace('%REGION%',e.region?reg(e.region):'').replace('%FACTION2%',f(e.faction2)).replace('%FACTION%',f(e.faction))};
function relayDelay(h){return h.silk.contact.anxi.level==='trade'?RELAY_MONTHS.trade:RELAY_MONTHS.hearsay}
function snapshotOf(h){const e=h.throne.orthodox||h.throne.occupant;return {year:h.year,month:h.month,owners:Object.fromEntries(h.regions.map(r=>[r.id,r.owner])),emperor:e,emperorName:e?h.persons[e]?.name:null,dynasty:h.throne.dynasty.name,dynastyOrthodox:!!h.throne.dynasty.orthodox,orthodoxIsLiu:!h.throne.orthodox||isLiuClan(h,h.throne.orthodox)}}
function embassyReturnText(h){
 const id=h.throne.occupant||h.throne.orthodox,person=h.persons[id];
 if(person?.alive&&person.name?.[0]&&person.name?.[1]&&h.throne.orthodox===id&&isLiuClan(h,id))return {en:`Our envoys reached the court of the Seres, ruled by ${person.name[0]}. They report an emperor of the house of Liu.`,zh:`我方使者抵达赛里斯朝廷，其君为${person.name[1]}。使者回报皇帝出自刘氏。`};
 if(person?.alive&&person.name?.[0]&&person.name?.[1])return {en:`Our envoys reached the court of the Seres, now held by ${person.name[0]}. They could not verify an orthodox Liu emperor.`,zh:`我方使者抵达赛里斯朝廷，现由${person.name[1]}掌权。使者未能确认有正统刘氏皇帝在位。`};
 return {en:'Our envoys reached the court of the Seres but could not verify who rules it.',zh:'我方使者抵达赛里斯朝廷，但未能确认当前统治者。'};
}

function ensureBridge(w){
 if(w.bridge?.settled)return w.bridge;
 // Older saves already counted deliveries under the former customs rule.
 // Silk alone could have been counted by the former customs rule. Other
 // delivered goods were never imported and may still be bought from the gate.
 const settled={};for(const x of w.state.tradeMarkets?.shipments||[])if(x.buyer==='external'&&x.destination==='mediterranean_gate'&&x.commodity==='silk'&&x.status==='delivered')settled[x.id]={status:'legacy'};
 w.bridge={settled};return w.bridge;
}
function ensureRomanExportBridge(s,w){
 const bridge=ensureBridge(w);
 if(bridge.romanExports)return bridge.romanExports;
 // Older attached saves already settled these Roman market deliveries. Do
 // not move their historical destination stock into the East on upgrade.
 const exports=historicalRomanExports(s);
 bridge.romanExports=exports;return exports;
}
function relayRomanExports(s,w){
 const exports=ensureRomanExportBridge(s,w);
 const pending=(s.markets?.transactions||[]).filter(tx=>tx.shipment&&!exports[tx.shipment]&&['caesar','senate'].includes(tx.seller)&&tx.buyer==='parthia'&&EASTERN_RELAY_MARKETS[tx.destination]&&COMMODITIES[tx.commodity]&&Number.isSafeInteger(tx.quantity)&&tx.quantity>=1&&tx.quantity<=20&&Number.isSafeInteger(tx.price)&&tx.price>=0&&(!tx.status||tx.status==='delivered'));
 if(!pending.length)return;
 const roman=initializeMarkets(s),eastern=w.state.tradeMarkets;
 for(const tx of pending){
  const eastId=EASTERN_RELAY_MARKETS[tx.destination],romanRegion=s.regions.find(r=>r.id===tx.destination),eastRegion=w.state.regions.find(r=>r.id===eastId);
  const source=roman.regions[tx.destination]?.goods?.[tx.commodity],target=eastern?.regions?.[eastId]?.goods?.[tx.commodity];
  if(romanRegion?.owner!=='parthia'||eastRegion?.owner!=='parthia'||!source||!target||!Number.isSafeInteger(source.stock)||source.stock<tx.quantity||!Number.isSafeInteger(target.stock)||target.stock<0){exports[tx.shipment]={status:'unavailable'};continue}
  // Seleucia/Ctesiphon and the Median/Ecbatana labels describe the same
  // broad local market across the two campaign projections. The Roman trade
  // buyer has already prepaid; only its delivered stock crosses this ledger.
  source.stock-=tx.quantity;source.price=marketPrice(roman.regions[tx.destination],tx.commodity);
  target.stock+=tx.quantity;target.price=marketPrice(eastern.regions[eastId],tx.commodity);
  exports[tx.shipment]={status:'transferred',romanShipment:tx.shipment,seller:tx.seller,broker:'parthia',origin:tx.origin,destination:eastId,commodity:tx.commodity,quantity:tx.quantity,price:tx.price,merchantId:tx.merchantId||null,year:s.year,month:s.month};
 }
}
function importAtPort(s,w,cargo,port){
 const h=w.state,bridge=ensureBridge(w),roman=initializeMarkets(s),gate=h.tradeMarkets?.regions?.mediterranean_gate?.goods?.[cargo.commodity];
 const price=cargo.price,quantity=cargo.quantity,quote=port&&importQuote(s,cargo,port.id,port.owner,{planFor:port.owner===s.player?s.player:null});
 if(cargo.buyer!=='external'||cargo.destination!=='mediterranean_gate'||cargo.status!=='delivered'||bridge.settled[cargo.id]&&bridge.settled[cargo.id].status!=='returned'||!['caesar','senate'].includes(port?.owner)||!COMMODITIES[cargo.commodity]||!gate||!roman.regions[port.id]?.goods?.[cargo.commodity]||!Number.isSafeInteger(quantity)||quantity<1||!Number.isSafeInteger(price)||price<0||gate.stock<quantity)return {ok:false,reason:'unavailable'};
 if(!quote||!marketCarrierRouteOpen(s,quote,port.owner))return {ok:false,reason:'route'};
 if(s.factions[port.owner]?.treasury<quote.total)return {ok:false,reason:'treasury'};
 // The external buyer paid Han at the gate. This court buys the same finite
 // cargo from that buyer; the price stays in escrow during the final leg.
 gate.stock-=quantity;s.factions[port.owner].treasury-=quote.total;roman.transportSpent+=quote.transport;
 const receipt={status:quote.months?'in_transit':'delivered',hanShipment:cargo.id,merchantId:cargo.merchantId||null,port:port.id,owner:port.owner,commodity:cargo.commodity,quantity,price,transport:quote.transport,path:quote.path,legs:quote.legs,arrivalAt:mi(s.year,s.month)+quote.months,blockedMonths:0,year:s.year,month:s.month};
 bridge.settled[cargo.id]=receipt;
 if(!quote.months){roman.regions[port.id].goods[cargo.commodity].stock+=quantity;h.tradeMarkets.externalTreasury+=price;if(port.owner===s.player&&cargo.commodity==='silk')w.known.silkCargoes=(w.known.silkCargoes||0)+quantity}
 roman.transactions.push({shipment:`han-import:${cargo.id}`,linkedHanShipment:cargo.id,merchantId:cargo.merchantId||null,seller:'external',buyer:port.owner,origin:'mediterranean_gate',destination:port.id,commodity:cargo.commodity,quantity,price,transport:quote.transport,tariffs:[],status:quote.months?'in_transit':'imported',year:s.year,month:s.month});
 if(roman.transactions.length>200)roman.transactions.shift();
 if(port.owner===s.player){const name=COMMODITIES[cargo.commodity].name;romanLog(s,quote.months?`${name[0]} was purchased at the eastern exchange for ${price} treasury; transport to ${port.name[0]} takes ${quote.months} months and costs ${quote.transport}.`:`${name[0]} reached ${port.name[0]} through eastern merchants. The court bought ${quantity} batch${quantity===1?'':'es'} for ${price} treasury.`,quote.months?`朝廷在东方交易口以${price}国库购入${name[1]}，再花${quote.transport}国库运输，预计${quote.months}个月抵达${port.name[1]}。`:`东方商人将${name[1]}运抵${port.name[1]}。朝廷花费${price}国库购入${quantity}批。`)}
 return {ok:true,receipt};
}
function advanceRomanImportTransits(s,w){
 const bridge=ensureBridge(w),roman=initializeMarkets(s),now=mi(s.year,s.month);
 for(const receipt of Object.values(bridge.settled)){
  if(receipt.status!=='in_transit')continue;
  const port=s.regions.find(r=>r.id===receipt.port),tx=roman.transactions.find(x=>x.linkedHanShipment===receipt.hanShipment&&x.status==='in_transit');
  if(port?.owner!==receipt.owner){
   returnRomanImport(s,w,receipt,tx,now);
   if(receipt.owner===s.player)romanLog(s,`The route to ${port?.name?.[0]||receipt.port} closed before the eastern cargo arrived. Its purchase price was refunded; transport was spent.`,`东方货物抵达前，通往${port?.name?.[1]||receipt.port}的路线中断。货款已退，运费不返。`);
   continue;
  }
  if(!marketCarrierRouteOpen(s,receipt,receipt.owner)){
   receipt.blockedMonths=(receipt.blockedMonths||0)+1;receipt.arrivalAt=Math.max(receipt.arrivalAt+1,now+1);
   if(receipt.blockedMonths>=12){returnRomanImport(s,w,receipt,tx,now);if(receipt.owner===s.player)romanLog(s,'The eastern cargo returned to the exchange after a year without passage. Its goods price was refunded; transport was spent.','东方货物因通路封闭一年而退回交易口。货款已退，运费不返。')}
   else if(receipt.blockedMonths===1&&receipt.owner===s.player)romanLog(s,'Eastern cargo is delayed because its planned route is closed.','东方货物因原定路线封闭而延误。');
   continue;
  }
  receipt.blockedMonths=0;
  if(receipt.arrivalAt>now)continue;
  roman.regions[receipt.port].goods[receipt.commodity].stock+=receipt.quantity;
  w.state.tradeMarkets.externalTreasury+=receipt.price;receipt.status='delivered';if(tx)tx.status='imported';
  if(receipt.owner===s.player){if(receipt.commodity==='silk')w.known.silkCargoes=(w.known.silkCargoes||0)+receipt.quantity;romanLog(s,`${COMMODITIES[receipt.commodity].name[0]} reached ${port.name[0]} after its final journey.`,`东方货物${COMMODITIES[receipt.commodity].name[1]}经末程运输抵达${port.name[1]}。`)}
 }
}
function returnRomanImport(s,w,receipt,tx,now){
 w.state.tradeMarkets.regions.mediterranean_gate.goods[receipt.commodity].stock+=receipt.quantity;
 s.factions[receipt.owner].treasury+=receipt.price;
 const cargo=w.state.tradeMarkets.shipments.find(x=>x.id===receipt.hanShipment);if(cargo)cargo.deliveredAt=now;
 receipt.status='returned';if(tx)tx.status='returned';
}
export function buyEasternImport(s,shipmentId,portId){
 if(campaignClosed(s))return {ok:false,reason:'finalized'};
 const w=hanWorld(s),port=s.regions.find(r=>r.id===portId);
 if(!w||!port||port.owner!==s.player)return {ok:false,reason:'port'};
 const cargo=w.state.tradeMarkets?.shipments?.find(x=>x.id===shipmentId);
 if(!cargo)return {ok:false,reason:'unavailable'};
 return importAtPort(s,w,cargo,port);
}
function settleRomanImports(s,w){
 // The player's treasury is spent only on an explicit purchase. A rival Roman
 // court buys immediately if the player has no eastern port. Otherwise the
 // player gets three months before a rival court may compete for the cargo.
 const settled=ensureBridge(w).settled;
 const available=(w.state.tradeMarkets?.shipments||[]).filter(cargo=>cargo.buyer==='external'&&cargo.destination==='mediterranean_gate'&&cargo.status==='delivered'&&(!settled[cargo.id]||settled[cargo.id].status==='returned'));
 if(!available.length)return;
 const ports=EAST_PORTS.map(id=>s.regions.find(r=>r.id===id)).filter(Boolean),routeCache=new Map();
 const playerHasPort=ports.some(r=>r.owner===s.player&&importQuote(s,available[0],r.id,s.player,{planFor:s.player,routeCache}));
 for(const cargo of available){
  if(playerHasPort&&(!Number.isSafeInteger(cargo.deliveredAt)||mi(s.year,s.month)-cargo.deliveredAt<PLAYER_IMPORT_PRIORITY_MONTHS))continue;
  const port=ports.find(r=>r.owner!==s.player&&['caesar','senate'].includes(r.owner)&&s.factions[r.owner]?.treasury>=importQuote(s,cargo,r.id,r.owner,{routeCache})?.total);
  if(port){const bought=importAtPort(s,w,cargo,port);if(bought.ok&&playerHasPort)romanLog(s,`Eastern merchants sold their ${COMMODITIES[cargo.commodity].name[0]} cargo to the rival court before we bought it.`,`东方商人已将${COMMODITIES[cargo.commodity].name[1]}货批售予敌对朝廷，我方未能购入。`)}
 }
}

// Called from the Roman monthly tick.
export function advanceHanWorld(s){
 const w=hanWorld(s);if(!w)return;
 const h=w.state,before=h.log.length?h.log[h.log.length-1]:null;
 (h.tradeMarkets||={}).embeddedRoman=true;
 h.year=s.year;h.month=s.month;h.month--;if(h.month<1){h.month=12;h.year--}
 hanTick(h); // advances to the Roman date
 const now=mi(s.year,s.month),delay=relayDelay(h);
 // public events start their long journey west
 // The Han Chronicle drops its oldest entries at 400. A length-based slice
 // would silently lose all new dispatches once that limit is reached.
 const lastIndex=before?h.log.indexOf(before):-1;
 const newEntries=lastIndex>=0?h.log.slice(lastIndex+1):h.log.filter(e=>e.year===s.year&&e.month===s.month);
 const fresh=newEntries.filter(e=>PUBLIC_KINDS.has(e.kind)).slice(0,4);
 for(const e of fresh)w.queue.push({arrive:now+delay,kind:'event',origin:{year:e.year,month:e.month},en:fill(h,e,0),zh:fill(h,e,1),eventKind:e.kind});
 if(s.month===7)w.queue.push({arrive:now+delay,kind:'snapshot',snapshot:snapshotOf(h)});
 // Physically transfer paid cargo from the Han gate to a Roman market.
 w.lastDeliveries=h.silk.farWestDeliveries||w.lastDeliveries;
 relayRomanExports(s,w);
 advanceRomanImportTransits(s,w);
 settleRomanImports(s,w);
 // the Roman embassy, if any
 if(w.embassy?.status==='travelling'&&now>=w.embassy.arrive){w.embassy.status='arrived';h.silk.contact.lijian={level:'embassy',heardAt:mi(h.year,h.month)};
  const ruler=h.persons[h.throne.occupant||h.throne.orthodox];w.embassy.reception=ruler?.alive?'received':'unclear';
  h.log.push({year:h.year,month:h.month,text:['Envoys from Lijian in the far west reach the Han court (alternate history).','极西犁靬之国使者抵达汉廷（架空历史）。'],kind:'frontier'});
  w.queue.push({arrive:now+delay,kind:'embassy_return',...embassyReturnText(h),origin:{year:h.year,month:h.month}})}
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
 const c={active:!campaignClosed(s),reports:!!w.known.firstLive,parthia:parthia&&!atWar,treasury:(s.factions[s.player]?.treasury||0)>=EMBASSY_COST,idle:!w.embassy};
 return {...c,ok:Object.values(c).every(Boolean)};
}
export function sendEmbassyToSeres(s){
 const c=embassyConditions(s);if(!c.ok)return {ok:false,conditions:c};
 s.factions[s.player].treasury-=EMBASSY_COST;hanWorld(s).embassy={status:'travelling',sent:{year:s.year,month:s.month},arrive:mi(s.year,s.month)+EMBASSY_MONTHS,by:s.player};
 romanLog(s,'Envoys leave for the land of the Seres by way of Parthia. The journey will take years.','使者经安息启程前往赛里斯之国，此行将历时数年。');return {ok:true};
}
export function upgradeHanWorld(s){const w=hanWorld(s);if(!w)return;w.state=loadHanSave(w.state);w.state.tradeMarkets.autonomousEnabled=true;w.queue||=[];w.known||={snapshot:null,dispatches:[]};w.known.silkCargoes??=0;ensureBridge(w);ensureRomanExportBridge(s,w)}
// What the Roman player knows, never the live Han state.
export function romanView(s){const w=hanWorld(s);if(!w)return null;
 const ports=EAST_PORTS.filter(id=>s.regions.find(r=>r.id===id)?.owner===s.player),goods=w.state.tradeMarkets?.regions?.mediterranean_gate?.goods||{};
 const availableImports=ports.length&&!campaignClosed(s)?(w.state.tradeMarkets?.shipments||[]).filter(x=>x.buyer==='external'&&x.destination==='mediterranean_gate'&&x.status==='delivered'&&(!ensureBridge(w).settled[x.id]||ensureBridge(w).settled[x.id].status==='returned')&&COMMODITIES[x.commodity]&&Number.isSafeInteger(x.quantity)&&x.quantity>0&&Number.isSafeInteger(x.price)&&x.price>=0&&goods[x.commodity]?.stock>=x.quantity).map(x=>{const portQuotes=Object.fromEntries(ports.map(port=>[port,importQuote(s,x,port,s.player,{planFor:s.player})]).filter(([,quote])=>quote)),rivalPort=EAST_PORTS.some(id=>{const owner=s.regions.find(r=>r.id===id)?.owner;return owner&&owner!==s.player&&['caesar','senate'].includes(owner)&&importQuote(s,x,id,owner)});return {id:x.id,commodity:x.commodity,quantity:x.quantity,price:x.price,merchantId:x.merchantId||null,merchantName:w.state.persons?.[x.merchantId]?.name||null,rivalBidIn:rivalPort&&Number.isSafeInteger(x.deliveredAt)?Math.max(0,PLAYER_IMPORT_PRIORITY_MONTHS-(mi(s.year,s.month)-x.deliveredAt)):null,ports:Object.keys(portQuotes),portQuotes}}).filter(x=>x.ports.length):[];
 return {snapshot:w.known.snapshot,dispatches:w.known.dispatches,silkCargoes:w.known.silkCargoes,imports:Object.values(w.bridge?.settled||{}).filter(x=>x.status==='delivered'&&x.owner===s.player).slice(-8).reverse(),pendingImports:Object.values(w.bridge?.settled||{}).filter(x=>x.status==='in_transit'&&x.owner===s.player).slice(-8).reverse(),exports:Object.values(w.bridge?.romanExports||{}).filter(x=>x.status==='transferred'&&x.seller===s.player).slice(-8).reverse(),availableImports,embassy:w.embassy?{...w.embassy}:null,conditions:embassyConditions(s)};
}
