// A paid merchant can report a quoted price and broad availability at the
// market where the order begins. Never include the foreign warehouse total.
export function merchantMarketObservation(market,good,{reserved=0,unitPrice,year,month}={}){
 const item=market?.goods?.[good];if(!item)return null;
 const desired=Math.max(4,item.consumption*4+item.production*2);
 const available=item.stock+reserved;
 const supply=available<desired?'scarce':available>desired*2?'surplus':'adequate';
 return {unitPrice,supply,year,month};
}

export function ownMarketIntelligence(markets,player){
 const own=(markets?.shipments||[]).filter(x=>x.buyer===player||x.seller===player);
 const observations=own.filter(x=>x.buyer===player&&x.seller!==player&&x.marketObservation)
  .map(x=>({shipment:x.id,seller:x.seller,origin:x.origin,commodity:x.commodity,...x.marketObservation}))
  .sort((a,b)=>(b.year*12+b.month)-(a.year*12+a.month)).slice(0,8);
 const disruptions=[];
 for(const shipment of own){
  const recorded=shipment.routeDisruptions||[];
  for(const event of recorded){
   const year=Math.floor((event.at-1)/12);
   disruptions.push({shipment:shipment.id,kind:'blocked',location:event.location,year,month:event.at-year*12});
  }
  if(!recorded.length&&['blocked','stranded'].includes(shipment.status)&&Number.isInteger(shipment.blockedAt)){
   const year=Math.floor((shipment.blockedAt-1)/12);
   disruptions.push({shipment:shipment.id,kind:'blocked',location:shipment.legs?.[shipment.leg]?.from||shipment.origin,year,month:shipment.blockedAt-year*12});
  }
  for(const reroute of shipment.reroutes||[]){
   const year=Math.floor((reroute.at-1)/12);
   disruptions.push({shipment:shipment.id,kind:'rerouted',location:reroute.from,year,month:reroute.at-year*12});
  }
 }
 disruptions.sort((a,b)=>(b.year*12+b.month)-(a.year*12+a.month));
 return {observations,disruptions:disruptions.slice(0,8)};
}
