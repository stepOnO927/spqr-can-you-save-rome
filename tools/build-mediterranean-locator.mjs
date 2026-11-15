// Generate a small geographic locator from the same bundled GSHHG land mask as the atlas.
import land from '../mediterranean-land.js';
import {writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const box={west:-20,east:60,south:18,north:58},width=190,height=130;
const project=([lon,lat])=>[(lon-box.west)/(box.east-box.west)*width,(box.north-lat)/(box.north-box.south)*height];
function clip(points,edge,intersect){
 const out=[];
 for(let i=0;i<points.length;i++){
  const start=points[i],end=points[(i+1)%points.length],a=edge(start),b=edge(end);
  if(a&&b)out.push(end);
  else if(a&&!b)out.push(intersect(start,end));
  else if(!a&&b)out.push(intersect(start,end),end);
 }
 return out;
}
function clipRing(ring){
 let points=ring.slice(0,-1);
 const cuts=[
  [p=>p[0]>=box.west,(a,b)=>[box.west,a[1]+(b[1]-a[1])*(box.west-a[0])/(b[0]-a[0])]],
  [p=>p[0]<=box.east,(a,b)=>[box.east,a[1]+(b[1]-a[1])*(box.east-a[0])/(b[0]-a[0])]],
  [p=>p[1]>=box.south,(a,b)=>[a[0]+(b[0]-a[0])*(box.south-a[1])/(b[1]-a[1])]],
  [p=>p[1]<=box.north,(a,b)=>[a[0]+(b[0]-a[0])*(box.north-a[1])/(b[1]-a[1])]]
 ];
 for(const [inside,intersection] of cuts){points=clip(points,inside,intersection);if(points.length<3)return []}
 return points;
}
function simplify(points,tolerance=.25){
 if(points.length<=3)return points;
 const first=points[0],last=points.at(-1),dx=last[0]-first[0],dy=last[1]-first[1],span=dx*dx+dy*dy;
 let index=-1,maximum=0;
 for(let i=1;i<points.length-1;i++){
  const p=points[i],t=span?Math.max(0,Math.min(1,((p[0]-first[0])*dx+(p[1]-first[1])*dy)/span)):0;
  const distance=(p[0]-first[0]-t*dx)**2+(p[1]-first[1]-t*dy)**2;
  if(distance>maximum){maximum=distance;index=i}
 }
 if(maximum<=tolerance*tolerance)return [first,last];
 return [...simplify(points.slice(0,index+1),tolerance).slice(0,-1),...simplify(points.slice(index),tolerance)];
}
const paths=[];
for(const feature of land.features){
 const polygons=feature.geometry.type==='Polygon'?[feature.geometry.coordinates]:feature.geometry.coordinates;
 for(const rings of polygons)for(const ring of rings){
  const bounds={west:Math.min(...ring.map(p=>p[0])),east:Math.max(...ring.map(p=>p[0])),south:Math.min(...ring.map(p=>p[1])),north:Math.max(...ring.map(p=>p[1]))};
  if(bounds.east<box.west||bounds.west>box.east||bounds.north<box.south||bounds.south>box.north)continue;
  const clipped=clipRing(ring);if(clipped.length<3)continue;
  const points=simplify(clipped.map(project));
  paths.push('M'+points.map(([x,y])=>`${x.toFixed(1)} ${y.toFixed(1)}`).join('L')+'Z');
 }
}
const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Mediterranean and neighboring lands, modern coastline">
<rect width="${width}" height="${height}" fill="#285b68"/>
<path d="${paths.join('')}" fill="#d7c9a7" fill-rule="evenodd" stroke="#f0dfb8" stroke-width=".45" stroke-linejoin="round"/>
<text x="68" y="78" fill="#c3d9d1" font-family="Georgia,serif" font-size="5" font-style="italic" letter-spacing=".4">MARE MEDITERRANEUM</text>
</svg>`;
const output=resolve(import.meta.dirname,'../map-lab/mediterranean-locator.svg');
await writeFile(output,svg+'\n');
console.log(`Wrote ${output} with ${paths.length} coastline rings`);
