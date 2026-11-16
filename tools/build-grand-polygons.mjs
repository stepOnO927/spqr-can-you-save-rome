import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import historical from '../historical-territories.js';
import land from '../land.js';
import {GRAND_SITES} from '../grand-map-data.js';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const xScale=Math.cos(42*Math.PI/180);
function signedDistance(p,a,b){const x=p[0]*xScale,y=p[1],ax=a.lon*xScale,ay=a.lat,bx=b.lon*xScale,by=b.lat;return (x-ax)**2+(y-ay)**2-(x-bx)**2-(y-by)**2}
function clip(ring,a,b){let output=[];for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],fp=signedDistance(p,a,b),fq=signedDistance(q,a,b),insideP=fp<=1e-10,insideQ=fq<=1e-10;if(insideP)output.push(p);if(insideP!==insideQ){const t=fp/(fp-fq);output.push([Number((p[0]+(q[0]-p[0])*t).toFixed(5)),Number((p[1]+(q[1]-p[1])*t).toFixed(5))])}}return output}
function insideRing([x,y],ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
 const [xi,yi]=ring[i],[xj,yj]=ring[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)inside=!inside;
}return inside}
function nearOutline(site,polygons){
 const point=[site.lon,site.lat],scale=Math.cos(site.lat*Math.PI/180),x=site.lon*scale,y=site.lat;
 let distance=Infinity;
 for(const rings of polygons){
  if(insideRing(point,rings[0])&&!rings.slice(1).some(ring=>insideRing(point,ring)))return true;
  for(const ring of rings){for(let i=0;i<ring.length-1;i++){
   const [ax,ay]=ring[i],[bx,by]=ring[i+1],dx=(bx-ax)*scale,dy=by-ay,t=Math.max(0,Math.min(1,((x-ax*scale)*dx+(y-ay)*dy)/(dx*dx+dy*dy||1)));
   distance=Math.min(distance,Math.hypot(x-(ax*scale+t*dx),y-(ay+t*dy))*111);
  }}
 }
 return distance<=100;
}
const features=[];
for(const feature of historical.features){if(!feature.properties.regions?.length)continue;
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 // A disconnected historical outline can span several provinces. Do not
 // assign a remote lobe to the nearest city from another lobe: Leptis Magna
 // was previously drawn over Cyrenaica, more than 500 km from its anchor.
 const sites=GRAND_SITES.filter(x=>feature.properties.regions.includes(x.macro)&&nearOutline(x,polygons));
 for(const site of sites){const parts=[];for(const polygon of polygons){let ring=polygon[0].slice(0,-1);for(const other of sites){if(other===site||ring.length<3)continue;ring=clip(ring,site,other)}if(ring.length<3)continue;ring.push(ring[0]);parts.push([ring])}
  if(parts.length)features.push({type:'Feature',properties:{id:site.id,macro:site.macro,site:site.site[0],source:feature.properties.source,boundary:'approximate gameplay partition from settlement anchors; not an ancient administrative border'},geometry:{type:'MultiPolygon',coordinates:parts}})
 }
}
// The source set intentionally omits Illyricum, Galatia and the Bosporus.
// Use small, land-clipped operational catchments around their settlement
// anchors and flag the lower geographic confidence in the data itself.
function clipLine(ring,a,b){const side=p=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);const out=[];for(let i=0;i<ring.length;i++){const p=ring[i],q=ring[(i+1)%ring.length],fp=side(p),fq=side(q),ip=fp>=-1e-10,iq=fq>=-1e-10;if(ip)out.push(p);if(ip!==iq){const t=fp/(fp-fq);out.push([Number((p[0]+(q[0]-p[0])*t).toFixed(5)),Number((p[1]+(q[1]-p[1])*t).toFixed(5))])}}return out}
for(const site of GRAND_SITES.filter(x=>!features.some(f=>f.properties.id===x.id))){const radius=site.macro==='hispaniaS'?1.05:site.macro==='illyricum'?.85:.65,circle=Array.from({length:16},(_,i)=>{const angle=i*2*Math.PI/16;return [site.lon+Math.cos(angle)*radius/xScale,site.lat+Math.sin(angle)*radius]}),parts=[];
 for(const feature of land.features){const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;for(const polygon of polygons){let ring=polygon[0].slice(0,-1);for(let i=0;i<circle.length&&ring.length>=3;i++)ring=clipLine(ring,circle[i],circle[(i+1)%circle.length]);for(const other of GRAND_SITES.filter(x=>x.macro===site.macro&&x.id!==site.id)){if(ring.length<3)break;ring=clip(ring,site,other)}if(ring.length>=3){ring.push(ring[0]);parts.push([ring])}}}
 if(parts.length)features.push({type:'Feature',properties:{id:site.id,macro:site.macro,site:site.site[0],source:'Natural Earth land + approximate settlement catchment',boundary:'uncertain gameplay catchment, not an ancient administrative border'},geometry:{type:'MultiPolygon',coordinates:parts}})
}
const output={type:'FeatureCollection',features};
await writeFile(resolve(root,'grand-territory-polygons.js'),`// Derived from the existing AWMC / Cliopatria historical outlines.\n// Internal lines are approximate gameplay partitions from settlement anchors.\nexport default ${JSON.stringify(output)};\n`);
console.log('territory polygons',features.length,'bytes',JSON.stringify(output).length);
