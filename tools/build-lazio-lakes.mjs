// Preserve a dated OSM shoreline snapshot and simplify only below the
// displayed zoom-9 pixel size. These are modern lakes, not 49 BCE surveys.
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const source=JSON.parse(await readFile(join(root,'map-lab','source','osm-lazio-lakes.geojson'),'utf8'));
const tolerance=.00025;
const distance=(p,a,b)=>{
 const c=Math.cos(42*Math.PI/180),ax=a[0]*c,ay=a[1],bx=b[0]*c,by=b[1],px=p[0]*c,py=p[1],dx=bx-ax,dy=by-ay;
 const t=dx||dy?Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy))):0;
 return Math.hypot(px-ax-t*dx,py-ay-t*dy);
};
function simplifyPath(points){
 if(points.length<=2)return points;
 const keep=new Uint8Array(points.length),stack=[[0,points.length-1]];keep[0]=keep[points.length-1]=1;
 while(stack.length){const [start,end]=stack.pop();let far=0,index=-1;for(let i=start+1;i<end;i++){const d=distance(points[i],points[start],points[end]);if(d>far){far=d;index=i}}if(far>tolerance&&index>0){keep[index]=1;stack.push([start,index],[index,end])}}
 return points.filter((_,i)=>keep[i]);
}
function simplifyRing(ring){
 const closed=ring[0][0]===ring.at(-1)[0]&&ring[0][1]===ring.at(-1)[1],points=closed?ring.slice(0,-1):ring;
 let split=1,far=0;for(let i=1;i<points.length;i++){const d=Math.hypot((points[i][0]-points[0][0])*.74,points[i][1]-points[0][1]);if(d>far){far=d;split=i}}
 const first=simplifyPath(points.slice(0,split+1)),second=simplifyPath([...points.slice(split),points[0]]),out=[...first,...second.slice(1)].map(([lon,lat])=>[+lon.toFixed(5),+lat.toFixed(5)]);
 return out.length>=4?out:ring.map(([lon,lat])=>[+lon.toFixed(5),+lat.toFixed(5)]);
}
const features=source.features.map(feature=>{
 if(feature.geometry.type!=='Polygon'||!['Lago di Bracciano','Lago Albano','Lago di Nemi','Lago di Vico','Lago di Martignano'].includes(feature.properties.name))throw Error('Unexpected lake source');
 return {...feature,geometry:{...feature.geometry,coordinates:feature.geometry.coordinates.map(simplifyRing)}};
});
if(features.length!==5)throw Error('Missing Lazio lake');
const result={type:'FeatureCollection',features};
await writeFile(join(root,'map-lab','lazio-lakes.js'),`// Modern Lazio lake shorelines: OpenStreetMap contributors, ODbL 1.0.\n// Dated source snapshot: map-lab/source/osm-lazio-lakes.geojson (2026-11-22).\nexport default ${JSON.stringify(result)};\n`);
console.log(`Lazio lakes: ${features.length} polygons, ${features.reduce((n,f)=>n+f.geometry.coordinates.reduce((m,r)=>m+r.length,0),0)} vertices`);
