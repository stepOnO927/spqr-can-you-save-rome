// Compare modern coastline geometry with the game's approximate site anchors.
// An offshore result is a review lead, not proof an ancient port was misplaced.
import land from '../mediterranean-land.js';
import {GRAND_SITES} from '../grand-map-data.js';

const rings=land.features.flatMap(feature=>feature.geometry.type==='Polygon'?[feature.geometry.coordinates[0]]:feature.geometry.coordinates.map(polygon=>polygon[0]));
const inside=(ring,lon,lat)=>{
 let result=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>lat)!==(b[1]>lat)&&lon<(b[0]-a[0])*(lat-a[1])/(b[1]-a[1])+a[0])result=!result;
 }
 return result;
};
const segmentKm=(a,b,lon,lat)=>{
 const xScale=111.2*Math.cos(lat*Math.PI/180),yScale=111.2;
 const ax=(a[0]-lon)*xScale,ay=(a[1]-lat)*yScale,bx=(b[0]-lon)*xScale,by=(b[1]-lat)*yScale;
 const dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,-(ax*dx+ay*dy)/(dx*dx+dy*dy||1)));
 return Math.hypot(ax+t*dx,ay+t*dy);
};
const results=[];
for(const site of GRAND_SITES){
 if(rings.some(ring=>inside(ring,site.lon,site.lat)))continue;
 let distance=Infinity;
 for(const ring of rings)for(let i=1;i<ring.length;i++)distance=Math.min(distance,segmentKm(ring[i-1],ring[i],site.lon,site.lat));
 results.push({id:site.id,site:site.site[0],lon:site.lon,lat:site.lat,modernCoastKm:Math.round(distance*10)/10});
}
results.sort((a,b)=>b.modernCoastKm-a.modernCoastKm);
console.log(JSON.stringify({sites:GRAND_SITES.length,offModernLand:results.length,results},null,2));
if(results.some(site=>site.modernCoastKm>2))throw new Error('A settlement anchor is more than 2 km offshore from the modern coastline; review its source coordinates.');
