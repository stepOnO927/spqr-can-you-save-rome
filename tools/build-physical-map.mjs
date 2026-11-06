// Convert Natural Earth 1:10m GeoJSON into a compact Mediterranean basemap.
// Inputs: cartography-work/land.geojson and cartography-work/ocean.geojson
// Source: https://github.com/nvkelso/natural-earth-vector (public domain).
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const bounds=[-20,18,60,58],tolerance=.0015;
const nearly=(a,b)=>Math.abs(a-b)<1e-9;
function clip(ring){
 let points=ring.slice(0,-1);
 for(const [axis,limit,keep] of [[0,bounds[0],1],[0,bounds[2],-1],[1,bounds[1],1],[1,bounds[3],-1]]){
  const inside=p=>keep*(p[axis]-limit)>=-1e-9;
  const intersect=(a,b)=>{const ratio=(limit-a[axis])/(b[axis]-a[axis]);return [a[0]+ratio*(b[0]-a[0]),a[1]+ratio*(b[1]-a[1])]};
  const output=[];for(let i=0;i<points.length;i++){const a=points[(i+points.length-1)%points.length],b=points[i],ai=inside(a),bi=inside(b);if(ai!==bi)output.push(intersect(a,b));if(bi)output.push(b)}points=output;if(!points.length)return [];
 }
 const compact=points.filter((p,i)=>i===0||!nearly(p[0],points[i-1][0])||!nearly(p[1],points[i-1][1]));
 if(compact.length<3)return [];compact.push([...compact[0]]);return compact;
}
function simplify(ring){
 if(ring.length<5)return ring;const sq=tolerance*tolerance,keep=new Uint8Array(ring.length);keep[0]=keep[ring.length-1]=1;
 function visit(start,end){let best=sq,index=-1;const a=ring[start],b=ring[end],dx=b[0]-a[0],dy=b[1]-a[1],length=dx*dx+dy*dy;for(let i=start+1;i<end;i++){const p=ring[i],t=length?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length)):0,x=a[0]+t*dx,y=a[1]+t*dy,d=(p[0]-x)**2+(p[1]-y)**2;if(d>best){best=d;index=i}}if(index>=0){keep[index]=1;visit(start,index);visit(index,end)}}
 visit(0,ring.length-1);const result=ring.filter((_,i)=>keep[i]);return result.length>=4?result:ring;
}
function extract(data){const polygons=[];for(const feature of data.features){const geometry=feature.geometry;for(const polygon of geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates){const outer=clip(polygon[0]);if(!outer.length)continue;const rings=[simplify(outer)];for(const hole of polygon.slice(1)){const clipped=clip(hole);if(clipped.length)rings.push(simplify(clipped))}polygons.push(rings)}}return {type:'FeatureCollection',features:polygons.map((coordinates,i)=>({type:'Feature',properties:{id:i},geometry:{type:'Polygon',coordinates}}))}}
for(const name of ['land','ocean']){const original=JSON.parse(await readFile(path.join(root,'cartography-work',`${name}.geojson`),'utf8')),map=extract(original);const target=path.join(root,`mediterranean-${name}.js`);await writeFile(target,`// Natural Earth 1:10m physical vectors, public domain; cropped to the campaign region.\nexport default ${JSON.stringify(map)};\n`);console.log(name,map.features.length,Math.round((await readFile(target)).length/1024)+' KiB')}
