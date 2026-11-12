import {ROUTES} from './data.js?v=phase-x-1';
import {activeAgreement} from './agreements.js?v=grand-chessboard-2';
import {ROUTES as EURASIAN_ROUTES,REGIONS as EURASIAN_REGIONS} from './han/data.js?v=han-1';
import {createFictionalPerson,recordLifeEvent} from './dynasties.js?v=faces-empire-2';
import {generateFictionalName} from './fictional-names.js?v=faces-of-empire-1';

// One unit is an economic batch, not a single animal or artifact. Prices use
// the campaign's treasury scale. Production and consumption remain separate
// from the older aggregate food/tax economy until that economy is migrated.
export const COMMODITIES={
 grain:{name:['Grain','谷物'],unit:['100 tons','百吨'],basePrice:2},
 horses:{name:['Horses','马匹'],unit:['100 head','百匹'],basePrice:5},
 iron:{name:['Iron','铁'],unit:['20 tons','二十吨'],basePrice:4},
 timber:{name:['Timber','木材'],unit:['100 logs','百根'],basePrice:3},
 silk:{name:['Silk','丝绸'],unit:['50 bolts','五十匹'],basePrice:8},
 papyrus:{name:['Papyrus','纸草'],unit:['100 rolls','百卷'],basePrice:5}
};
const month=s=>s.year*12+s.month;
const clamp=(n,low,high)=>Math.min(high,Math.max(low,n));
const region=(s,id)=>s.regions.find(r=>r.id===id);
const atWar=(s,a,b)=>a!==b&&s.wars.some(w=>w.includes(a)&&w.includes(b));
// Reuse the existing Han map's roads. Only the endpoints that denote the
// campaign's broader economic theaters are aliased; all other kingdoms keep
// their own transit identities and never become Han or Parthian provinces.
const HAN_MARKETS={changan:'hanGuanzhong',henan:'hanHenan',shu:'hanShu',dunhuang:'hanHexi',shanshan:'shanshanOasis',ecbatana:'media',ctesiphon:'parthia'};
const silkId=id=>HAN_MARKETS[id]||`silk:${id}`;
const silkNodes=new Map(EURASIAN_REGIONS.filter(r=>!HAN_MARKETS[r.id]).map(r=>[silkId(r.id),r]));
const tradeLinks=[...ROUTES.map(([a,b,kind])=>({a,b,kind:kind||'land',months:kind==='sea'||kind==='frontier'?3:null,network:'campaign'})),...EURASIAN_ROUTES.map(r=>({a:silkId(r.a),b:silkId(r.b),kind:r.kind,months:r.months,network:'silk'})).filter(r=>r.a!==r.b)];
const node=(s,id)=>region(s,id)||silkNodes.get(id);
export const tradeRouteName=(s,id)=>node(s,id)?.name||[id,id];
const relationValue=(s,a,b)=>s.relations[[a,b].sort().join(':')]??0;
function permitted(s,owner,buyer,seller,network){
 if(!owner||owner===buyer||owner===seller)return true;
 if(network==='silk')return relationValue(s,owner,buyer)>=-35&&relationValue(s,owner,seller)>=-35;
 return !!(activeAgreement(s,owner,buyer,'trade')&&activeAgreement(s,owner,seller,'trade'));
}

function profile(r,good){
 const east=r.id.startsWith('han'),egypt=r.id.startsWith('egypt');
 const production={
  grain:Math.max(1,Math.floor((r.food||0)/2)),
  horses:['parthia','media','armenia','numidia','mauretania','shanshanOasis','hanHexi'].includes(r.id)?3:0,
  iron:['media','armenia','galatia','hanShu','hanHenan','cisalpine'].includes(r.id)?2:r.terrain==='hills'?1:0,
  timber:r.terrain==='forest'?4:r.terrain==='hills'?2:1,
  silk:east?2:0,
  papyrus:egypt?3:0
 }[good];
 const consumption={grain:Math.max(1,Math.floor((r.supply||8)/6)),horses:1,iron:1,timber:1,silk:0,papyrus:0}[good];
 return {production,consumption,stock:Math.max(0,production*4+2-consumption),price:COMMODITIES[good].basePrice};
}
export function initializeMarkets(s){
 const markets=s.markets||={regions:{},shipments:[],transactions:[],nextShipment:1,tariffs:{},lastTick:null,transportSpent:0,transitTreasury:{},merchants:{},merchantFees:0};
 markets.regions||={};markets.shipments||=[];markets.transactions||=[];markets.tariffs||={};markets.nextShipment||=1;markets.transportSpent??=0;markets.transitTreasury||={};
 markets.merchants||={};markets.merchantFees??=0;
 for(const [buyer,ids] of Object.entries(markets.merchants))if(!Array.isArray(ids))markets.merchants[buyer]=ids?[ids]:[];
 for(const r of s.regions){
  const market=markets.regions[r.id]||={id:r.id,goods:{},disruption:0};market.goods||={};
  for(const good of Object.keys(COMMODITIES))market.goods[good]||=profile(r,good);
  markets.regions[r.id]=market;
 }
 // Earlier in-flight orders had no named carrier. Assign one once, while
 // retaining the original inventory reservation and escrow unchanged.
 for(const shipment of markets.shipments)if(['traveling','blocked'].includes(shipment.status)&&!shipment.merchantId&&s.factions[shipment.buyer])shipment.merchantId=merchantFor(s,shipment.buyer,shipment.origin);
 return markets;
}

function merchantFor(s,buyer,location){
 const markets=s.markets,previous=markets.merchants[buyer]||[],available=previous.find(id=>s.world.characters[id]?.alive&&!markets.shipments.some(x=>x.merchantId===id&&['traveling','blocked'].includes(x.status)));
 if(available)return available;
 const identity=generateFictionalName(s,{originFaction:buyer,location});
 const id=createFictionalPerson(s,{...identity,faction:buyer,birthYear:s.year-35,location,sex:'unknown',role:['Fictional merchant','虚构商人'],wealth:0});
 const person=s.world.characters[id];person.institutionalOnly=true;person.profession='merchant';person.title=['Caravan merchant','商队商人'];
 markets.merchants[buyer]=[...previous,id];
 recordLifeEvent(s,id,'Entered the campaign market network.','加入战役商贸网络。');
 return id;
}

export function marketPrice(market,good){
 const item=market?.goods?.[good],base=COMMODITIES[good]?.basePrice;
 if(!item||!base)return null;
 const desired=Math.max(4,item.consumption*4+item.production*2),pressure=(desired-item.stock)/desired;
 return clamp(Math.round(base*(1+pressure*.7)),Math.max(1,Math.round(base*.5)),base*3);
}

function routeFor(s,origin,destination,buyer,seller){
 const queue=[{id:origin,cost:0,path:[origin],legs:[]}],seen=new Map();
 while(queue.length){
  queue.sort((a,b)=>a.cost-b.cost);const current=queue.shift();
  if(current.id===destination)return current;
  if(seen.has(current.id)&&seen.get(current.id)<=current.cost)continue;seen.set(current.id,current.cost);
  for(const link of tradeLinks){
   const next=link.a===current.id?link.b:link.b===current.id?link.a:null,r=next&&node(s,next);
   if(!r||!permitted(s,r.owner,buyer,seller,link.network)||atWar(s,r.owner,buyer)||atWar(s,r.owner,seller)||current.path.includes(next))continue;
   const duration=link.months??(r.terrain==='desert'?2:1);
   queue.push({id:next,cost:current.cost+duration,path:[...current.path,next],legs:[...current.legs,{from:current.id,to:next,kind:link.kind,network:link.network,months:duration}]});
  }
 }
 return null;
}

export function quoteTrade(s,{seller,buyer,origin,destination,commodity,quantity}){
 const markets=initializeMarkets(s),from=region(s,origin),to=region(s,destination),stock=markets.regions[origin]?.goods?.[commodity];
 if(!COMMODITIES[commodity]||!Number.isSafeInteger(quantity)||quantity<1||quantity>20||!from||!to||!s.factions[seller]||!s.factions[buyer]||from.owner!==seller||to.owner!==buyer||origin===destination)return {ok:false,reason:'invalid'};
 if(atWar(s,seller,buyer)||seller!==buyer&&!activeAgreement(s,seller,buyer,'trade'))return {ok:false,reason:'access'};
 if(stock.stock<quantity)return {ok:false,reason:'unavailable'};
 const route=routeFor(s,origin,destination,buyer,seller);if(!route)return {ok:false,reason:'route'};
 const unitPrice=marketPrice(markets.regions[origin],commodity),price=unitPrice*quantity;
 const transport=Math.max(1,Math.ceil(route.cost*quantity/5));
 const customs=[...new Set(route.path.slice(1,-1).map(id=>node(s,id)?.owner).filter(owner=>owner&&owner!==seller&&owner!==buyer))];
 const tariffs=customs.map(owner=>({owner,amount:Math.ceil(price*clamp(markets.tariffs[owner]??.05,0,.3))}));
 const total=price+transport+tariffs.reduce((sum,t)=>sum+t.amount,0);
 if(s.factions[buyer].treasury<total)return {ok:false,reason:'treasury'};
 return {ok:true,unitPrice,price,transport,tariffs,total,route:route.path,legs:route.legs,months:route.cost};
}

export function placeTradeOrder(s,request){
 const quote=quoteTrade(s,request);if(!quote.ok)return quote;
 if(request.maxTotal!=null&&(!Number.isFinite(request.maxTotal)||quote.total>request.maxTotal))return {ok:false,reason:'price'};
 const markets=s.markets,source=markets.regions[request.origin].goods[request.commodity];
 const merchantId=merchantFor(s,request.buyer,request.origin);
 source.stock-=request.quantity;s.factions[request.buyer].treasury-=quote.total;
 const shipment={id:`shipment:${markets.nextShipment++}`,seller:request.seller,buyer:request.buyer,merchantId,origin:request.origin,destination:request.destination,commodity:request.commodity,quantity:request.quantity,price:quote.price,transport:quote.transport,tariffs:quote.tariffs,escrow:quote.total,route:quote.route,legs:quote.legs,leg:0,remaining:quote.legs[0].months,status:'traveling',year:s.year,month:s.month};
 markets.shipments.push(shipment);return {ok:true,shipment,quote};
}

export function advanceMarkets(s){
 const markets=initializeMarkets(s),current=month(s);if(markets.lastTick===current)return markets;
 markets.lastTick=current;
 for(const r of s.regions)for(const [good,item] of Object.entries(markets.regions[r.id].goods)){
  item.stock+=item.production;
  const used=Math.min(item.stock,item.consumption);item.stock-=used;
  item.shortage=item.consumption-used;
  const warehouseLimit=Math.max(80,item.production*24);
  if(item.stock>warehouseLimit){item.surplusDiscarded=(item.surplusDiscarded||0)+item.stock-warehouseLimit;item.stock=warehouseLimit}
  item.price=marketPrice(markets.regions[r.id],good);
 }
 for(const shipment of markets.shipments.filter(x=>x.status==='traveling'||x.status==='blocked')){
  const leg=shipment.legs[shipment.leg],next=node(s,leg?.to);
  if(!leg||!next||!permitted(s,next.owner,shipment.buyer,shipment.seller,leg.network)||atWar(s,next.owner,shipment.buyer)||atWar(s,next.owner,shipment.seller)){shipment.status='blocked';continue}
  shipment.status='traveling';shipment.remaining--;if(shipment.remaining>0)continue;
  shipment.leg++;
  if(shipment.leg<shipment.legs.length){shipment.remaining=shipment.legs[shipment.leg].months;continue}
  const destination=region(s,shipment.destination);
  if(destination?.owner!==shipment.buyer){shipment.status='blocked';shipment.leg--;shipment.remaining=1;continue}
  markets.regions[shipment.destination].goods[shipment.commodity].stock+=shipment.quantity;
  s.factions[shipment.seller].treasury+=shipment.price;
  for(const tariff of shipment.tariffs)if(s.factions[tariff.owner])s.factions[tariff.owner].treasury+=tariff.amount;else markets.transitTreasury[tariff.owner]=(markets.transitTreasury[tariff.owner]||0)+tariff.amount;
  const merchant=shipment.merchantId&&s.world.characters[shipment.merchantId],fee=merchant?.alive?Math.min(shipment.transport,Math.ceil(shipment.transport/4)):0;
  if(merchant?.alive){merchant.wealth=(merchant.wealth||0)+fee;merchant.location=shipment.destination;recordLifeEvent(s,merchant.id,`Delivered ${shipment.quantity} batches of ${shipment.commodity} to ${destination.name[0]}.`,`向${destination.name[1]}运抵${shipment.quantity}批${COMMODITIES[shipment.commodity].name[1]}。`)}
  markets.transportSpent+=shipment.transport-fee;markets.merchantFees+=fee;
  shipment.escrow=0;shipment.status='delivered';shipment.deliveredYear=s.year;shipment.deliveredMonth=s.month;
  markets.transactions.push({shipment:shipment.id,seller:shipment.seller,buyer:shipment.buyer,merchantId:shipment.merchantId||null,merchantFee:fee,commodity:shipment.commodity,quantity:shipment.quantity,price:shipment.price,transport:shipment.transport,tariffs:shipment.tariffs,year:s.year,month:s.month});
  if(markets.transactions.length>200)markets.transactions.shift();
  if(shipment.seller===s.player||shipment.buyer===s.player){const item=COMMODITIES[shipment.commodity].name;s.log.unshift({year:s.year,month:s.month,en:`${shipment.quantity} ${item[0]} trade batches reached ${destination.name[0]}.`,zh:`${shipment.quantity}批${item[1]}运抵${destination.name[1]}。`});s.log=s.log.slice(0,80)}
 }
 if(markets.shipments.length>300){const completed=markets.shipments.filter(x=>x.status==='delivered');const excess=markets.shipments.length-300;const remove=new Set(completed.slice(0,excess).map(x=>x.id));markets.shipments=markets.shipments.filter(x=>!remove.has(x.id))}
 return markets;
}

// Quarterly market participation is bounded to one order per AI country.
// Treaty partners expose a trading price, not an army/intelligence report.
// Validation still uses the same stock, route and escrow rules as a player.
export function advanceMarketAI(s,{autoplayPlayer=false}={}){
 if(s.month%3!==0)return [];
 const markets=initializeMarkets(s),orders=[];
 for(const buyer of Object.keys(s.factions).filter(id=>id!=='rebels'&&(autoplayPlayer||id!==s.player))){
  if(markets.shipments.some(x=>x.buyer===buyer&&['traveling','blocked'].includes(x.status)))continue;
  const candidates=[];
  for(const destination of s.regions.filter(r=>r.owner===buyer)){
   const treatyMarkets=s.regions.filter(r=>r.owner!==buyer&&r.owner!=='rebels'&&(autoplayPlayer||r.owner!==s.player)&&!!activeAgreement(s,buyer,r.owner,'trade'));
   for(const origin of treatyMarkets){
    const seller=origin.owner;if(seller===buyer||seller===s.player&&!autoplayPlayer||!s.factions[seller]||!activeAgreement(s,seller,buyer,'trade'))continue;
    for(const commodity of Object.keys(COMMODITIES)){
     const need=markets.regions[destination.id].goods[commodity],supply=markets.regions[origin.id].goods[commodity];
     const target=Math.max(4,need.consumption*3+need.production),available=supply.stock-Math.max(4,supply.production*2);
     if(need.stock>=target||available<1)continue;
     const quantity=Math.min(3,target-need.stock,available),request={seller,buyer,origin:origin.id,destination:destination.id,commodity,quantity},quote=quoteTrade(s,request);
     if(!quote.ok||s.factions[buyer].treasury-quote.total<(buyer==='han'?100:20))continue;
     const gain=marketPrice(markets.regions[destination.id],commodity)*quantity-quote.total;
     if(gain<0)continue;
     candidates.push({request,gain});
    }
   }
  }
  candidates.sort((a,b)=>b.gain-a.gain||a.request.destination.localeCompare(b.request.destination)||a.request.commodity.localeCompare(b.request.commodity));
  if(candidates.length){const result=placeTradeOrder(s,candidates[0].request);if(result.ok)orders.push(result.shipment)}
 }
 return orders;
}
