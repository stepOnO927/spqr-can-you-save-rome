import {COMMODITIES,marketPrice} from '../market-goods.js?v=faces-of-empire-1';
import {REGIONS,ROUTES} from './data.js?v=han-1';
import {atWar,propose,relation,shiftRelation,treaty} from './frontier.js?v=han-1';
import {legOpen,tradePath} from './silk-road.js?v=han-1';
import {createMarketMerchant} from './field-identities.js';
import {roll} from './util.js?v=han-1';

const month=s=>s.year*12+s.month;
const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const region=(s,id)=>s.regions.find(r=>r.id===id);
const route=(a,b)=>ROUTES.find(r=>r.a===a&&r.b===b||r.a===b&&r.b===a);
const tradeTreaty=(s,a,b)=>a===b||!!(treaty(s,'market',a,b)||treaty(s,'caravan',a,b));
export const TARIFF_POLICIES=Object.freeze({low:.02,standard:.05,high:.15});
const initialOwner=new Map(REGIONS.map(r=>[r.id,r.owner]));
const network=new Map(REGIONS.map(r=>[r.id,[]]));
for(const link of ROUTES){network.get(link.a)?.push({next:link.b,months:link.months});network.get(link.b)?.push({next:link.a,months:link.months})}

// AI route estimates use its dated control reports and the opening map where
// no report exists. Hidden enemy armies can still stop the actual shipment.
function projectedPath(s,from,to,buyer){
 const distances=new Map([[from,0]]),previous=new Map([[from,null]]),open=new Set([from]),done=new Set();
 while(open.size){let current=null;for(const id of open)if(current===null||distances.get(id)<distances.get(current))current=id;open.delete(current);done.add(current);if(current===to)break;
  for(const link of network.get(current)||[]){const {next}=link;if(done.has(next))continue;
   const owner=s.intel?.[buyer]?.[next]?.owner??initialOwner.get(next);
   if(owner&&owner!==buyer&&(atWar(s,buyer,owner)||relation(s,buyer,owner)<-35&&!tradeTreaty(s,buyer,owner)))continue;
   const distance=distances.get(current)+Math.max(1,link.months);
   if(distance<(distances.get(next)??Infinity)){distances.set(next,distance);previous.set(next,current);open.add(next)}
  }
 }
 if(!previous.has(to))return null;const path=[];for(let id=to;id;id=previous.get(id))path.unshift(id);return path;
}

function profile(r,good){
 const production={
  grain:Math.max(0,Math.round((r.grain||0)/2)),
  horses:r.horses?3:r.terrain==='steppe'?2:0,
  iron:r.iron||r.arsenal?2:r.terrain==='mountain'?1:0,
  timber:r.terrain==='forest'?4:['hills','mountain'].includes(r.terrain)?2:1,
  silk:r.silk?3:r.owner==='han'&&r.kind==='capital'?1:0,
  papyrus:0
 }[good];
 const consumption={grain:Math.max(1,Math.ceil((r.pop||4)/12)),horses:1,iron:1,timber:1,silk:0,papyrus:0}[good];
 return {production,consumption,stock:Math.max(0,production*4+2-consumption),price:COMMODITIES[good].basePrice};
}

export function initializeEasternMarkets(s){
 const markets=s.tradeMarkets||={regions:{},offers:[],saleOrders:[],shipments:[],transactions:[],supplyContracts:[],nextSupplyContract:1,nextSaleOrder:1,nextShipment:1,merchants:{},tariffs:{},exportRestrictions:{},transitTreasury:{},transportSpent:0,merchantFees:0,diplomacy:{attempts:[],nextAt:{}},lastTick:null};
 markets.regions||={};markets.offers||=[];if(!Array.isArray(markets.saleOrders))markets.saleOrders=[];markets.shipments||=[];markets.transactions||=[];markets.merchants||={};markets.tariffs||={};markets.exportRestrictions||={};markets.transitTreasury||={};markets.diplomacy||={attempts:[],nextAt:{}};
 markets.diplomacy.attempts||=[];markets.diplomacy.nextAt||={};if(!Number.isSafeInteger(markets.nextSaleOrder)||markets.nextSaleOrder<1)markets.nextSaleOrder=1;markets.nextShipment||=1;markets.transportSpent??=0;markets.merchantFees??=0;markets.merchantPrivileges||={};markets.merchantPrivilegeFees??=0;
 if(!Array.isArray(markets.supplyContracts))markets.supplyContracts=[];
 if(!Number.isSafeInteger(markets.nextSupplyContract)||markets.nextSupplyContract<1)markets.nextSupplyContract=1;
 while(markets.supplyContracts.some(contract=>contract.id===`eastern-supply:${markets.nextSupplyContract}`))markets.nextSupplyContract++;
 markets.externalTreasury??=10000;
 markets.lostGoods||={};
 for(const [owner,rate] of Object.entries(markets.tariffs))markets.tariffs[owner]=Number.isFinite(rate)?clamp(rate,0,.3):TARIFF_POLICIES.standard;
 for(const [owner,goods] of Object.entries(markets.exportRestrictions))markets.exportRestrictions[owner]=Array.isArray(goods)?[...new Set(goods.filter(good=>Object.hasOwn(COMMODITIES,good)))]:[];
 for(const [faction,ids] of Object.entries(markets.merchants))if(!Array.isArray(ids))markets.merchants[faction]=ids?[ids]:[];
 for(const r of s.regions){const market=markets.regions[r.id]||={id:r.id,goods:{}};market.goods||={};for(const good of Object.keys(COMMODITIES)){const item=market.goods[good]||=profile(r,good);item.consumed??=0;item.surplusDiscarded??=0}markets.regions[r.id]=market}
 return markets;
}

export function setEasternTariffPolicy(s,faction,policy){
 if(faction!==s.player||s.finalized||!s.regions.some(r=>r.owner===faction)||!Object.hasOwn(TARIFF_POLICIES,policy))return {ok:false,reason:'invalid'};
 const markets=initializeEasternMarkets(s);
 markets.tariffs[faction]=TARIFF_POLICIES[policy];
 return {ok:true,policy,rate:markets.tariffs[faction]};
}

export function setEasternExportRestriction(s,faction,commodity,restricted){
 if(faction!==s.player||s.finalized||!s.regions.some(r=>r.owner===faction)||!Object.hasOwn(COMMODITIES,commodity)||typeof restricted!=='boolean')return {ok:false,reason:'invalid'};
 const markets=initializeEasternMarkets(s),goods=markets.exportRestrictions[faction]||[];
 markets.exportRestrictions[faction]=restricted?[...new Set([...goods,commodity])]:goods.filter(good=>good!==commodity);
 publishOffers(s);
 return {ok:true,commodity,restricted};
}

export function postEasternSale(s,{origin,commodity,quantity,unitPrice}){
 const markets=initializeEasternMarkets(s),from=region(s,origin),item=markets.regions[origin]?.goods?.[commodity];
 if(s.finalized||!s.player||from?.owner!==s.player||!Object.hasOwn(COMMODITIES,commodity)||!Number.isSafeInteger(quantity)||quantity<1||quantity>50||!Number.isSafeInteger(unitPrice)||unitPrice<1||unitPrice>1000)return {ok:false,reason:'invalid'};
 if(item.stock<quantity)return {ok:false,reason:'unavailable'};
 item.stock-=quantity;
 let id;do{id=`eastern-sale:${markets.nextSaleOrder++}`}while(markets.saleOrders.some(order=>order.id===id));
 const order={id,seller:s.player,origin,commodity,available:quantity,unitPrice,status:'open',year:s.year,month:s.month};
 markets.saleOrders.push(order);publishOffers(s);return {ok:true,order};
}

export function cancelEasternSale(s,id){
 const markets=initializeEasternMarkets(s),order=markets.saleOrders.find(x=>x.id===id&&x.seller===s.player&&x.status==='open');
 if(s.finalized||!order||region(s,order.origin)?.owner!==s.player)return {ok:false,reason:'invalid'};
 markets.regions[order.origin].goods[order.commodity].stock+=order.available;
 order.available=0;order.status='cancelled';publishOffers(s);return {ok:true,order};
}

function legsFor(path){return path.slice(1).map((to,i)=>{const from=path[i],link=route(from,to);return {from,to,months:Math.max(1,link.months),kind:link.kind}})}
function travelQuote(s,path,quantity,price,buyer,seller){
 const legs=legsFor(path),months=legs.reduce((n,l)=>n+l.months,0),transport=Math.max(1,Math.ceil(months*quantity/5));
 const owners=[...new Set(path.slice(1,-1).map(id=>region(s,id)?.owner).filter(owner=>owner&&owner!==buyer&&owner!==seller))];
 const tariffs=owners.map(owner=>({owner,amount:Math.ceil(price*clamp(s.tradeMarkets.tariffs[owner]??.05,0,.3))}));
 return {legs,months,transport,tariffs,total:price+transport+tariffs.reduce((n,t)=>n+t.amount,0)};
}

export function quoteEasternTrade(s,{seller,buyer,origin,destination,commodity,quantity,saleOrderId,contractId,bidPremium=0}){
 const markets=initializeEasternMarkets(s),from=region(s,origin),to=region(s,destination),stock=markets.regions[origin]?.goods?.[commodity];
 const external=buyer==='external'&&seller==='han'&&destination==='mediterranean_gate'&&to?.owner==null;
 if(!COMMODITIES[commodity]||!Number.isSafeInteger(quantity)||quantity<1||quantity>20||!Number.isSafeInteger(bidPremium)||bidPremium<0||bidPremium>Math.ceil(COMMODITIES[commodity].basePrice*.5)||!from||!to||from.owner!==seller||!s.factions[seller]||!external&&(to.owner!==buyer||!s.factions[buyer])||origin===destination)return {ok:false,reason:'invalid'};
 const sale=saleOrderId?markets.saleOrders.find(x=>x.id===saleOrderId):null;
 const contract=contractId?markets.supplyContracts.find(x=>x.id===contractId):null;
 if(contractId&&(!contract||contract.status!=='active'||month(s)<contract.nextDueAt||month(s)>=contract.expiresAt||saleOrderId||bidPremium||['seller','buyer','origin','destination','commodity','quantity'].some(key=>contract[key]!==({seller,buyer,origin,destination,commodity,quantity})[key])))return {ok:false,reason:'contract'};
 if(saleOrderId&&(!sale||sale.status!=='open'||sale.seller!==seller||sale.origin!==origin||sale.commodity!==commodity||sale.available<quantity))return {ok:false,reason:'unavailable'};
 if(buyer!==seller&&markets.exportRestrictions[seller]?.includes(commodity))return {ok:false,reason:'export_restricted'};
 if(!external&&(atWar(s,buyer,seller)||!tradeTreaty(s,buyer,seller)))return {ok:false,reason:'access'};
 if(!sale&&stock.stock<quantity)return {ok:false,reason:'unavailable'};
 const path=tradePath(s,origin,destination,external?seller:buyer);if(!path)return {ok:false,reason:'route'};
 const unitPrice=(contract?.unitPrice??sale?.unitPrice??marketPrice(markets.regions[origin],commodity))+bidPremium,price=unitPrice*quantity,travel=travelQuote(s,path,quantity,price,buyer,seller);
 const carrier=availableMerchant(s,external?seller:buyer,origin),discount=carrier&&activeEasternMerchantPrivilege(s,carrier,external?seller:buyer)?markets.merchantPrivileges[carrier].transportDiscount:0;
 if(discount){travel.transport=Math.max(1,Math.ceil(travel.transport*(1-discount)));travel.total=price+travel.transport+travel.tariffs.reduce((n,t)=>n+t.amount,0)}
 if((external?markets.externalTreasury:s.factions[buyer].treasury)<travel.total)return {ok:false,reason:'treasury'};
 return {ok:true,unitPrice,price,path,...travel,merchantId:carrier,merchantPrivilege:!!discount};
}

function availableMerchant(s,buyer,location){
 const markets=s.tradeMarkets,ids=markets.merchants[buyer]||[],free=ids.filter(id=>{const person=s.persons[id];return person?.alive&&person.location===location&&!person.marketReturn&&!markets.shipments.some(x=>x.merchantId===id&&['traveling','blocked'].includes(x.status))});
 return free.find(id=>activeEasternMerchantPrivilege(s,id,buyer))||free[0]||null;
}

export function activeEasternMerchantPrivilege(s,id,faction){
 const privilege=s.tradeMarkets?.merchantPrivileges?.[id],person=s.persons?.[id];
 return !!(privilege&&person?.alive&&person.faction===faction&&privilege.faction===faction&&(privilege.status==='pending'||month(s)<privilege.expiresAt));
}

export function grantEasternMerchantPrivilege(s,id,duration=12){
 const markets=initializeEasternMarkets(s),person=s.persons?.[id],faction=s.player,fee=5;
 if(s.finalized||!faction||!person?.alive||person.faction!==faction||!(markets.merchants[faction]||[]).includes(id)||![12,24].includes(duration)||activeEasternMerchantPrivilege(s,id,faction))return {ok:false,reason:'invalid'};
 if(s.factions[faction].treasury<fee)return {ok:false,reason:'treasury'};
 s.factions[faction].treasury-=fee;person.wealth=(person.wealth||0)+fee;markets.merchantPrivilegeFees+=fee;
 const privilege={merchantId:id,faction,createdAt:month(s),startsAt:null,expiresAt:null,status:'pending',duration,fee,transportDiscount:.2};
 markets.merchantPrivileges[id]=privilege;
 (person.history||=[]).push({year:s.year,month:s.month,kind:'market_privilege',duration});
 return {ok:true,privilege};
}

function merchantFor(s,buyer,location){
 const markets=s.tradeMarkets,ids=markets.merchants[buyer]||[],free=availableMerchant(s,buyer,location);
 if(free){s.persons[free].marketHome=location;return free}
 const id=createMarketMerchant(s,buyer,location);s.persons[id].marketHome=location;markets.merchants[buyer]=[...ids,id];return id;
}

function releaseMerchant(s,shipment,location){
 const person=s.persons[shipment.merchantId];if(!person?.alive)return;
 person.location=location;
 const home=person.marketHome||shipment.origin;
 if(location===home)delete person.marketReturn;
 else {const months=shipment.legs.reduce((sum,leg)=>sum+leg.months,0);person.marketReturn={to:home,months,arrive:month(s)+months}}
}

function advanceMerchantReturns(s,now){
 for(const [faction,ids] of Object.entries(s.tradeMarkets.merchants))for(const id of ids){
  const person=s.persons[id],trip=person?.marketReturn;
  if(!person?.alive||!trip||now<trip.arrive)continue;
  if(!tradePath(s,person.location,trip.to,faction)){trip.arrive=now+Math.max(1,trip.months||1);continue}
  person.location=trip.to;delete person.marketReturn;
 }
}

export function placeEasternTrade(s,request){
 const quote=quoteEasternTrade(s,request);if(!quote.ok)return quote;
 if(request.maxTotal!=null&&quote.total>request.maxTotal)return {ok:false,reason:'price'};
 const markets=s.tradeMarkets,external=request.buyer==='external',merchantId=merchantFor(s,external?request.seller:request.buyer,request.origin);
 const privilege=markets.merchantPrivileges[merchantId];
 if(privilege?.status==='pending'&&activeEasternMerchantPrivilege(s,merchantId,external?request.seller:request.buyer)){privilege.status='active';privilege.startsAt=month(s);privilege.expiresAt=month(s)+privilege.duration}
 if(request.saleOrderId){const sale=markets.saleOrders.find(x=>x.id===request.saleOrderId);sale.available-=request.quantity;if(sale.available===0)sale.status='filled'}
 else markets.regions[request.origin].goods[request.commodity].stock-=request.quantity;
 if(external)markets.externalTreasury-=quote.total;else s.factions[request.buyer].treasury-=quote.total;
 const shipment={id:`eastern-shipment:${markets.nextShipment++}`,seller:request.seller,buyer:request.buyer,sponsor:external?request.seller:request.buyer,merchantId,saleOrderId:request.saleOrderId||null,contractId:request.contractId||null,origin:request.origin,destination:request.destination,commodity:request.commodity,quantity:request.quantity,price:quote.price,transport:quote.transport,tariffs:quote.tariffs,escrow:quote.total,path:quote.path,legs:quote.legs,leg:0,remaining:quote.legs[0].months,status:'traveling',year:s.year,month:s.month};
 markets.shipments.push(shipment);
 if(request.contractId){const contract=markets.supplyContracts.find(x=>x.id===request.contractId);contract.shipments.push(shipment.id);contract.dispatched++;contract.consecutiveMisses=0;contract.nextDueAt=month(s)+contract.interval;contract.lastOutcome='dispatched'}
 return {ok:true,shipment,quote};
}

export function proposeEasternSupplyContract(s,{actor=s.player,seller,buyer,origin,destination,commodity,quantity,interval=3,duration=12}={}){
 const markets=initializeEasternMarkets(s),now=month(s),fee=2;
 if(s.finalized||actor!==s.player||![seller,buyer].includes(actor)||seller===buyer||![3,6,12].includes(interval)||![6,12,24,36].includes(duration)||interval>duration||markets.supplyContracts.some(x=>x.status==='active'&&x.seller===seller&&x.buyer===buyer&&x.origin===origin&&x.destination===destination&&x.commodity===commodity))return {ok:false,reason:'invalid'};
 const quote=quoteEasternTrade(s,{seller,buyer,origin,destination,commodity,quantity});if(!quote.ok)return quote;
 if(s.factions[actor].treasury<fee+(actor===buyer?quote.total:0))return {ok:false,reason:'treasury'};
 const recipient=actor===buyer?seller:buyer,source=markets.regions[origin].goods[commodity],need=markets.regions[destination].goods[commodity];
 if(relation(s,actor,recipient)<20||actor===buyer&&source.production<1||actor===seller&&need.stock>=Math.max(4,need.consumption*3+need.production))return {ok:false,reason:'declined'};
 let id;do{id=`eastern-supply:${markets.nextSupplyContract++}`}while(markets.supplyContracts.some(x=>x.id===id));
 const contract={id,actor,seller,buyer,origin,destination,commodity,quantity,unitPrice:quote.unitPrice,interval,duration,createdAt:now,nextDueAt:now,expiresAt:now+duration,negotiationCost:fee,obligations:['dispatch_on_schedule','prepay_each_shipment','honor_trade_access'],termination:'expiry, war, lost market, treaty loss, withdrawal, or repeated breach',breachPenalty:8,status:'active',consecutiveMisses:0,missed:0,dispatched:0,shipments:[],lastOutcome:null};
 markets.supplyContracts.push(contract);
 const first=placeEasternTrade(s,{seller,buyer,origin,destination,commodity,quantity,contractId:id,maxTotal:quote.total});
 if(!first.ok){markets.supplyContracts.pop();return first}
 s.factions[actor].treasury-=fee;
 return {ok:true,contract,shipment:first.shipment,quote:first.quote};
}

export function cancelEasternSupplyContract(s,id,actor=s.player){
 const contract=initializeEasternMarkets(s).supplyContracts.find(x=>x.id===id);
 if(!contract||contract.status!=='active'||actor!==s.player||![contract.buyer,contract.seller].includes(actor))return {ok:false,reason:'unavailable'};
 contract.status='withdrawn';contract.endedAt=month(s);contract.endedReason='withdrawal';shiftRelation(s,actor,actor===contract.buyer?contract.seller:contract.buyer,-contract.breachPenalty);
 return {ok:true,contract};
}

function advanceEasternSupplyContracts(s,now){
 for(const contract of s.tradeMarkets.supplyContracts){
  if(contract.status!=='active')continue;
  if(now>=contract.expiresAt){contract.status='completed';contract.endedAt=now;continue}
  if(region(s,contract.origin)?.owner!==contract.seller||region(s,contract.destination)?.owner!==contract.buyer||!tradeTreaty(s,contract.seller,contract.buyer)||atWar(s,contract.seller,contract.buyer)){
   contract.status='terminated';contract.endedAt=now;contract.endedReason='access_lost';continue;
  }
  if(now<contract.nextDueAt)continue;
  const request={seller:contract.seller,buyer:contract.buyer,origin:contract.origin,destination:contract.destination,commodity:contract.commodity,quantity:contract.quantity,contractId:contract.id};
  const result=placeEasternTrade(s,request);if(result.ok)continue;
  contract.missed++;contract.nextDueAt=now+contract.interval;contract.lastOutcome=result.reason;
  const responsible=result.reason==='treasury'?contract.buyer:['unavailable','export_restricted'].includes(result.reason)?contract.seller:null;
  contract.consecutiveMisses=responsible?contract.consecutiveMisses+1:0;
  if(responsible)shiftRelation(s,responsible,responsible===contract.buyer?contract.seller:contract.buyer,-2);
  if(responsible&&contract.consecutiveMisses>=2){contract.status='breached';contract.endedAt=now;contract.endedReason=result.reason;shiftRelation(s,responsible,responsible===contract.buyer?contract.seller:contract.buyer,-contract.breachPenalty)}
 }
}

function publishOffers(s){
 const markets=s.tradeMarkets,offers=[];
 for(const r of s.regions){if(!r.owner||!s.factions[r.owner]||r.owner===s.player)continue;const market=markets.regions[r.id];
  for(const [good,item] of Object.entries(market.goods)){
   if(markets.exportRestrictions[r.owner]?.includes(good))continue;
   // A non-producing market can resell a physically imported surplus. Its
   // opening buffer is two units; local consumption keeps priority over export.
   const reserve=item.production>0?Math.max(4,item.production*2):Math.max(2,item.consumption*3);
   const available=Math.max(0,item.stock-reserve);
   if(available>0)offers.push({seller:r.owner,origin:r.id,commodity:good,available,price:marketPrice(market,good),resale:item.production===0});
  }}
 for(const sale of markets.saleOrders)if(sale.status==='open'&&sale.available>0&&region(s,sale.origin)?.owner===sale.seller&&!markets.exportRestrictions[sale.seller]?.includes(sale.commodity))offers.push({seller:sale.seller,origin:sale.origin,commodity:sale.commodity,available:sale.available,price:sale.unitPrice,saleOrderId:sale.id});
 markets.offers=offers;return offers;
}

export function easternMarketOffers(s){initializeEasternMarkets(s);return publishOffers(s)}

function advanceShipments(s){
 const markets=s.tradeMarkets;
 for(const shipment of markets.shipments.filter(x=>['traveling','blocked'].includes(x.status))){
  const leg=shipment.legs[shipment.leg];
  if(!leg||!legOpen(s,leg.from,leg.to,shipment.sponsor||shipment.buyer).ok||atWar(s,shipment.sponsor||shipment.buyer,shipment.seller)){
   shipment.status='blocked';shipment.blockedAt??=month(s);
   if(month(s)-shipment.blockedAt>=12)settleStrandedShipment(s,shipment);
   continue;
  }
  shipment.status='traveling';shipment.blockedAt=null;shipment.remaining--;if(shipment.remaining>0)continue;
  const next=region(s,leg.to),guarded=s.armies.some(x=>x.region===leg.to&&x.owner===shipment.sponsor&&x.men>0)||next.fort>=2;
  const protection=shipment.sponsor==='han'?(s.silk?.security||0):0;
  const risk=Math.max(0,(next.unrest?.06:0)+(guarded?0:.02)-protection*.01);
  if(roll(s,`market-bandit:${shipment.id}:${leg.to}`)<risk){settleLostShipment(s,shipment,leg.to);continue}
  shipment.leg++;if(shipment.leg<shipment.legs.length){shipment.remaining=shipment.legs[shipment.leg].months;continue}
  const dest=region(s,shipment.destination);if(shipment.buyer==='external'?dest?.owner!=null:dest?.owner!==shipment.buyer){shipment.status='blocked';shipment.leg--;shipment.remaining=1;shipment.blockedAt??=month(s);continue}
  markets.regions[shipment.destination].goods[shipment.commodity].stock+=shipment.quantity;
  s.factions[shipment.seller].treasury+=shipment.price;
  for(const tariff of shipment.tariffs){if(s.factions[tariff.owner])s.factions[tariff.owner].treasury+=tariff.amount;else markets.transitTreasury[tariff.owner]=(markets.transitTreasury[tariff.owner]||0)+tariff.amount}
  const merchant=s.persons[shipment.merchantId],fee=merchant?.alive?Math.min(shipment.transport,Math.ceil(shipment.transport/4)):0;
  if(merchant?.alive){merchant.wealth=(merchant.wealth||0)+fee;releaseMerchant(s,shipment,shipment.destination);(merchant.history||=[]).push({year:s.year,month:s.month,kind:'trade_delivery',shipment:shipment.id})}
  markets.transportSpent+=shipment.transport-fee;markets.merchantFees+=fee;shipment.escrow=0;shipment.status='delivered';shipment.deliveredAt=month(s);
  markets.transactions.push({shipment:shipment.id,seller:shipment.seller,buyer:shipment.buyer,origin:shipment.origin,destination:shipment.destination,merchantId:shipment.merchantId,merchantFee:fee,commodity:shipment.commodity,quantity:shipment.quantity,price:shipment.price,transport:shipment.transport,tariffs:shipment.tariffs,year:s.year,month:s.month});
  if(markets.transactions.length>300)markets.transactions.shift();
 }
}

function settleLostShipment(s,shipment,location){
 const markets=s.tradeMarkets,refund=shipment.price+shipment.tariffs.reduce((sum,t)=>sum+t.amount,0);
 if(shipment.buyer==='external')markets.externalTreasury+=refund;else s.factions[shipment.buyer].treasury+=refund;
 markets.lostGoods[shipment.commodity]=(markets.lostGoods[shipment.commodity]||0)+shipment.quantity;
 const merchant=s.persons[shipment.merchantId],fee=merchant?.alive?Math.min(shipment.transport,Math.ceil(shipment.transport/4)):0;
 if(merchant?.alive){merchant.wealth=(merchant.wealth||0)+fee;releaseMerchant(s,shipment,location)}
 markets.transportSpent+=shipment.transport-fee;markets.merchantFees+=fee;
 shipment.escrow=0;shipment.status='lost';shipment.lostAt=month(s);shipment.lostNear=location;
 markets.transactions.push({shipment:shipment.id,seller:shipment.seller,buyer:shipment.buyer,origin:shipment.origin,destination:location,merchantId:shipment.merchantId,merchantFee:fee,commodity:shipment.commodity,quantity:shipment.quantity,price:0,transport:shipment.transport,tariffs:[],refund,status:'lost',year:s.year,month:s.month});
 if(markets.transactions.length>300)markets.transactions.shift();
}

function settleStrandedShipment(s,shipment){
 const markets=s.tradeMarkets,location=shipment.legs[shipment.leg]?.from||shipment.origin;
 markets.regions[location].goods[shipment.commodity].stock+=shipment.quantity;
 const refund=shipment.price+shipment.tariffs.reduce((sum,t)=>sum+t.amount,0);
 if(shipment.buyer==='external')markets.externalTreasury+=refund;else s.factions[shipment.buyer].treasury+=refund;
 const merchant=s.persons[shipment.merchantId],fee=merchant?.alive?Math.min(shipment.transport,Math.ceil(shipment.transport/4)):0;
 if(merchant?.alive){merchant.wealth=(merchant.wealth||0)+fee;releaseMerchant(s,shipment,location)}
 markets.transportSpent+=shipment.transport-fee;markets.merchantFees+=fee;
 shipment.escrow=0;shipment.status='stranded';shipment.settledAt=month(s);
 markets.transactions.push({shipment:shipment.id,seller:shipment.seller,buyer:shipment.buyer,origin:shipment.origin,destination:location,merchantId:shipment.merchantId,merchantFee:fee,commodity:shipment.commodity,quantity:shipment.quantity,price:0,transport:shipment.transport,tariffs:[],refund,status:'stranded',year:s.year,month:s.month});
 if(markets.transactions.length>300)markets.transactions.shift();
}

function advanceEasternMarketAI(s){
 const markets=s.tradeMarkets,now=month(s),orders=[],plans=new Map(),pathCache=new Map();
 const pathFor=(origin,destination,buyer)=>{
  const key=`${buyer}:${origin}:${destination}`;
  if(!pathCache.has(key))pathCache.set(key,projectedPath(s,origin,destination,buyer));
  return pathCache.get(key);
 };
 const oasis=id=>s.regions.some(r=>r.owner===id&&r.kind?.startsWith('oasis'));
 const reserve=(id,good)=>id==='han'?100:oasis(id)?good==='silk'?2:12:12;
 const buyers=Object.keys(s.factions).filter(id=>id!==s.player&&s.regions.some(r=>r.owner===id&&((r.pop||0)>=8||r.kind?.startsWith('oasis'))));
 for(const buyer of buyers){
  if(s.factions[buyer].treasury<2+COMMODITIES.grain.basePrice)continue;
  const active=markets.shipments.filter(x=>x.buyer===buyer&&['traveling','blocked'].includes(x.status));
  if(active.some(x=>x.status==='traveling')||active.some(x=>x.status==='blocked'&&now-(x.blockedAt??now)<3))continue;
  const candidates=[];
  for(const destination of s.regions.filter(r=>r.owner===buyer&&((r.pop||0)>=8||r.kind?.startsWith('oasis'))))for(const [good,item] of Object.entries(markets.regions[destination.id].goods)){
   const target=Math.max(4,item.consumption*3+item.production),deficit=target-item.stock;if(deficit<=0)continue;
   const nearby=markets.offers.filter(x=>x.commodity===good&&x.seller!==buyer&&(x.seller!==s.player||x.saleOrderId))
    .sort((a,b)=>{const sourceA=region(s,a.origin),sourceB=region(s,b.origin);
     const costA=a.price+Math.abs(sourceA.lon-destination.lon)*.15+Math.abs(sourceA.lat-destination.lat)*.15;
     const costB=b.price+Math.abs(sourceB.lon-destination.lon)*.15+Math.abs(sourceB.lat-destination.lat)*.15;
     return costA-costB}).slice(0,4);
   for(const offer of nearby){
    if(atWar(s,buyer,offer.seller)||active.some(x=>x.seller===offer.seller&&x.commodity===good))continue;
    const path=pathFor(offer.origin,destination.id,buyer);if(!path)continue;
    // Small intermediary courts can fund one batch when a larger lot would
    // exceed their treasury reserve. Every size still uses the real route.
    for(let quantity=Math.min(3,deficit,offer.available);quantity>=1;quantity--){
     const price=offer.price*quantity,travel=travelQuote(s,path,quantity,price,buyer,offer.seller);
     const utility=marketPrice(markets.regions[destination.id],good)*quantity+(item.stock===0?COMMODITIES[good].basePrice*quantity:0)-travel.total;
     if(utility<0||s.factions[buyer].treasury-travel.total<reserve(buyer,good))continue;
     candidates.push({request:{seller:offer.seller,buyer,origin:offer.origin,destination:destination.id,commodity:good,quantity,saleOrderId:offer.saleOrderId},utility,path:travel.months,route:path,unitPrice:offer.price,value:utility+travel.total});break;
    }
   }
  }
  candidates.sort((a,b)=>b.utility-a.utility||a.path-b.path||a.request.seller.localeCompare(b.request.seller));
  if(candidates.length)plans.set(buyer,candidates);
 }
 // A listed lot and ordinary regional stock are separate finite supplies.
 const available=request=>{
  if(request.saleOrderId)return markets.saleOrders.find(x=>x.id===request.saleOrderId&&x.status==='open')?.available??0;
  const item=markets.regions[request.origin].goods[request.commodity];
  const reserve=item.production>0?Math.max(4,item.production*2):Math.max(2,item.consumption*3);
  return Math.max(0,item.stock-reserve);
 };
 while(plans.size){
  const groups=new Map();
  for(const [buyer,candidates] of plans){
   while(candidates.length&&(candidates[0].request.quantity>available(candidates[0].request)||atWar(s,buyer,candidates[0].request.seller)))candidates.shift();
   if(!candidates.length){plans.delete(buyer);continue}
   const candidate=candidates[0],r=candidate.request,key=r.saleOrderId||`${r.origin}:${r.commodity}`;
   if(!groups.has(key))groups.set(key,[]);groups.get(key).push(candidate);
  }
  if(!groups.size)break;
  for(const group of groups.values()){
   const scarce=group.reduce((sum,c)=>sum+c.request.quantity,0)>available(group[0].request);
   const bids=group.map(candidate=>{
    const {request,route,value}=candidate,minCash=reserve(request.buyer,request.commodity);
    for(let premium=scarce?Math.ceil(COMMODITIES[request.commodity].basePrice*.5):0;premium>=0;premium--){
     const unitPrice=candidate.unitPrice+premium,price=unitPrice*request.quantity;
     const travel=travelQuote(s,route,request.quantity,price,request.buyer,request.seller);
     if(travel.total<=value&&s.factions[request.buyer].treasury-travel.total>=minCash)return {candidate,premium,unitPrice};
    }
    return null;
   }).filter(Boolean);
   bids.sort((a,b)=>b.unitPrice-a.unitPrice||relation(s,b.candidate.request.seller,b.candidate.request.buyer)-relation(s,a.candidate.request.seller,a.candidate.request.buyer)||a.candidate.path-b.candidate.path||a.candidate.request.buyer.localeCompare(b.candidate.request.buyer));
   const winner=bids[0];
   if(!winner){for(const candidate of group)plans.get(candidate.request.buyer)?.shift();continue}
   const {request,value}=winner.candidate,{buyer,seller}=request,key=[buyer,seller].sort().join(':');
   if(!tradeTreaty(s,buyer,seller)){
    if(now<(markets.diplomacy.nextAt[key]||-Infinity)){plans.get(buyer)?.shift();continue}
    const result=propose(s,buyer,seller,'market');markets.diplomacy.nextAt[key]=now+(result.proposal?.status==='accepted'?36:12);
    markets.diplomacy.attempts.push({year:s.year,month:s.month,buyer,seller,status:result.proposal?.status||result.reason});
    if(markets.diplomacy.attempts.length>150)markets.diplomacy.attempts.shift();
    if(!tradeTreaty(s,buyer,seller)){plans.get(buyer)?.shift();continue}
   }
   const bid={...request,bidPremium:winner.premium},quote=quoteEasternTrade(s,bid),minCash=reserve(buyer,request.commodity);
   const placed=quote.ok&&quote.total<=value&&s.factions[buyer].treasury-quote.total>=minCash?placeEasternTrade(s,bid):{ok:false,reason:quote.reason||'price'};
   if(placed.ok){orders.push(placed.shipment);plans.delete(buyer)}
   else {plans.get(buyer)?.shift();if(placed.reason==='route'){markets.diplomacy.attempts.push({year:s.year,month:s.month,buyer,seller,status:'route_blocked'});markets.diplomacy.nextAt[key]=now+3}}
  }
 }
 return orders;
}

export function advanceEasternMarkets(s){
 const markets=initializeEasternMarkets(s),now=month(s);if(markets.lastTick===now)return markets;
 markets.lastTick=now;
 for(const sale of markets.saleOrders)if(sale.status==='open'&&region(s,sale.origin)?.owner!==sale.seller){markets.regions[sale.origin].goods[sale.commodity].stock+=sale.available;sale.available=0;sale.status='seized'}
 advanceMerchantReturns(s,now);
 for(const r of s.regions)for(const [good,item] of Object.entries(markets.regions[r.id].goods)){
  item.stock+=item.production;const used=Math.min(item.stock,item.consumption);item.stock-=used;item.consumed+=used;item.shortage=item.consumption-used;
  const limit=Math.max(80,item.production*24);if(item.stock>limit){item.surplusDiscarded=(item.surplusDiscarded||0)+item.stock-limit;item.stock=limit}
  item.price=marketPrice(markets.regions[r.id],good);
 }
 advanceShipments(s);publishOffers(s);advanceEasternSupplyContracts(s,now);
 if(!markets.embeddedRoman&&s.month%3===0){advanceEasternMarketAI(s);publishOffers(s)}
 return markets;
}
