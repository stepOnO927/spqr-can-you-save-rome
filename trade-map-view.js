import {ROUTES} from './data.js?v=faces-wheels-1';
import {REGIONS as EASTERN_REGIONS} from './han/data.js?v=faces-wheels-1';
import {marketPrice} from './market-goods.js?v=faces-wheels-1';

const easternPoints=new Map(EASTERN_REGIONS.filter(r=>Number.isFinite(r.lon)&&Number.isFinite(r.lat)).map(r=>[r.id,[r.lon,r.lat]]));
const visibleStatus=new Set(['traveling','blocked']);
const pointFor=(id,points)=>points[id]||easternPoints.get(id?.startsWith('silk:')?id.slice(5):id)||null;
const feature=(from,to,properties)=>({type:'Feature',properties,geometry:{type:'LineString',coordinates:[from,to]}});

// This is a projection of public roads, owned markets and the player's own
// paid shipments. It never reads or returns a foreign market's inventory.
export function buildTradeMapView(s,viewer,points){
 const owned=new Set(s.regions.filter(r=>r.owner===viewer).map(r=>r.id));
 const corridors=ROUTES.filter(([from,to])=>(owned.has(from)||owned.has(to))&&pointFor(from,points)&&pointFor(to,points)).map(([from,to,kind])=>feature(pointFor(from,points),pointFor(to,points),{from,to,kind:kind||'land'}));
 const markets=[...owned].filter(id=>pointFor(id,points)&&s.markets?.regions?.[id]?.goods?.grain).map(id=>{
  const grain=s.markets.regions[id].goods.grain;
  return {id,point:pointFor(id,points),stock:grain.stock,price:marketPrice(s.markets.regions[id],'grain'),production:grain.production,consumption:grain.consumption,disrupted:!!grain.warDisrupted,restricted:(s.markets.exportRestrictions?.[viewer]||[]).length>0};
 });
 const routes=[],shipments=[];
 for(const cargo of s.markets?.shipments||[]){
  if(!visibleStatus.has(cargo.status)||cargo.buyer!==viewer&&cargo.seller!==viewer)continue;
  const legs=cargo.legs||[];
  for(const [index,leg] of legs.entries()){
   const from=pointFor(leg.from,points),to=pointFor(leg.to,points);
   if(from&&to)routes.push(feature(from,to,{shipment:cargo.id,leg:index,blocked:cargo.status==='blocked'}));
  }
  const leg=legs[cargo.leg]||legs.at(-1),from=pointFor(leg?.from,points),to=pointFor(leg?.to,points);
  if(!from||!to)continue;
  const fraction=cargo.status==='blocked'?0:Math.max(0,Math.min(1,1-(cargo.remaining||0)/Math.max(1,leg.months||1)));
  const point=[from[0]+(to[0]-from[0])*fraction,from[1]+(to[1]-from[1])*fraction];
  shipments.push({id:cargo.id,point,status:cargo.status,origin:cargo.origin,destination:cargo.destination,commodity:cargo.commodity,quantity:cargo.quantity,remaining:cargo.remaining||0});
 }
 return {corridors:{type:'FeatureCollection',features:corridors},routes:{type:'FeatureCollection',features:routes},markets,shipments};
}
