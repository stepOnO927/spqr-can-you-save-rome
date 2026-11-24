// Screen operational sea routes against the bundled modern GSHHG land mask.
// Ports can sit inland on the modern coast, notably ancient Utica.
import land from '../mediterranean-land.js';
import {GRAND_ROUTES, GRAND_SITES, grandRouteCoordinates} from '../grand-map-data.js';

const sites=Object.fromEntries(GRAND_SITES.map(site=>[site.id,site]));
const rings=land.features.flatMap(feature=>feature.geometry.type==='Polygon'?[feature.geometry.coordinates[0]]:feature.geometry.coordinates.map(polygon=>polygon[0])).map(points=>({points,bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}));
function onLand(x,y){for(const {points,bounds} of rings){if(x<bounds[0]||x>bounds[2]||y<bounds[1]||y>bounds[3])continue;let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}if(inside)return true}return false}
const result=[];
for(const [a,b,kind,meta] of GRAND_ROUTES.filter(route=>route[2]==='sea')){
 const path=grandRouteCoordinates(a,b);let inland=0,maximum=0,run=0;const segments=[];
 for(let segment=0;segment<path.length-1;segment++){
  const [x1,y1]=path[segment],[x2,y2]=path[segment+1],length=Math.hypot((x2-x1)*Math.cos((y1+y2)/2*Math.PI/180),y2-y1)*111.2,steps=Math.max(1,Math.ceil(length/2));
  let segmentInland=0;
  for(let i=0;i<steps;i++){const t=(i+.5)/steps,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t,sample=length/steps;if(onLand(x,y)){inland+=sample;segmentInland+=sample;run+=sample;maximum=Math.max(maximum,run)}else run=0}
  segments.push({from:path[segment],to:path[segment+1],inlandKm:Number(segmentInland.toFixed(1))});
 }
 // The source-backed Utica site is inland under the modern Mejerda delta.
 // Our modern mask and grid require up to 20 km on its final port approach;
 // this exception never applies to an open-water or other harbor segment.
 const interior=segments.slice(1,-1).filter(item=>item.inlandKm>2);
 const approaches=path.length>2?[segments[0],segments.at(-1)]:segments;
 const limits=path.length>2?[a==='africa'?21:9,b==='africa'?21:9]:[a==='africa'||b==='africa'?21:9];
 if(interior.length||approaches.some((item,i)=>item.inlandKm>limits[i]))result.push({a,b,from:sites[a].site[0],to:sites[b].site[0],inlandKm:Math.round(inland),longestRunKm:Math.round(maximum),distance:meta.distance,interior,approaches});
}
console.log(JSON.stringify({seaRoutes:GRAND_ROUTES.filter(route=>route[2]==='sea').length,invalidRoutes:result.length,result},null,2));
if(result.length)throw new Error('One or more sea routes cross modern land outside a short port approach.');
