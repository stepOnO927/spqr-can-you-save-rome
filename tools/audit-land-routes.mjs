// Flag gameplay land routes that cut through the bundled modern sea mask.
// Modern coast is a cartographic screen, not proof of a 49 BCE shoreline.
import land from '../mediterranean-land.js';
import {GRAND_ROUTES,GRAND_SITES,grandRouteCoordinates} from '../grand-map-data.js';

const sites=Object.fromEntries(GRAND_SITES.map(site=>[site.id,site]));
const rings=land.features.flatMap(feature=>feature.geometry.type==='Polygon'?[feature.geometry.coordinates[0]]:feature.geometry.coordinates.map(polygon=>polygon[0])).map(points=>({points,bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}));
function inside(ring,x,y){let result=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])result=!result}return result}
function onLand(x,y){return rings.some(({points,bounds})=>x>=bounds[0]&&x<=bounds[2]&&y>=bounds[1]&&y<=bounds[3]&&inside(points,x,y))}
const result=[];
for(const [a,b,kind,meta] of GRAND_ROUTES.filter(route=>route[2]!=='sea')){
 const path=grandRouteCoordinates(a,b);let offshore=0,maxRun=0,run=0;
 for(let segment=0;segment<path.length-1;segment++){
  const [x1,y1]=path[segment],[x2,y2]=path[segment+1],length=Math.hypot((x2-x1)*Math.cos((y1+y2)/2*Math.PI/180),y2-y1)*111.2,steps=Math.max(1,Math.ceil(length/5));
  for(let i=0;i<steps;i++){
   const t=(i+.5)/steps,x=x1+(x2-x1)*t,y=y1+(y2-y1)*t,sample=length/steps;
   if(!onLand(x,y)){offshore+=sample;run+=sample;maxRun=Math.max(maxRun,run)}else run=0;
  }
 }
 if(offshore>5)result.push({a,b,from:sites[a].site[0],to:sites[b].site[0],offshoreKm:Math.round(offshore),longestSeaKm:Math.round(maxRun),distance:meta.distance});
}
result.sort((a,b)=>b.offshoreKm-a.offshoreKm);
console.log(JSON.stringify({landRoutes:GRAND_ROUTES.filter(route=>route[2]!=='sea').length,offshoreRoutes:result.length,result},null,2));
if(result.length)throw new Error('One or more land routes cross more than 5 km of modern sea.');
