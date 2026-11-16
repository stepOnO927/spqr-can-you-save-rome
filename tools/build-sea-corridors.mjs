// Derive illustrative sea corridors from the bundled modern GSHHG land mask.
// Port anchors can lie a few kilometres inland. These are gameplay paths,
// not a reconstruction of 49 BCE sailing instructions or coastlines.
import land from '../mediterranean-land.js';
import {GRAND_ROUTES,GRAND_SITES} from '../grand-map-data.js';
import {writeFile} from 'node:fs/promises';

const STEP=.05,WEST=-12,SOUTH=24,EAST=51,NORTH=55;
const XMAX=Math.round((EAST-WEST)/STEP),YMAX=Math.round((NORTH-SOUTH)/STEP);
const rings=land.features.flatMap(feature=>feature.geometry.type==='Polygon'?[feature.geometry.coordinates[0]]:feature.geometry.coordinates.map(polygon=>polygon[0]));
const bounded=rings.map(points=>({points,bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}));
function landAtExact(x,y){
 for(const {points,bounds} of bounded){if(x<bounds[0]||x>bounds[2]||y<bounds[1]||y>bounds[3])continue;
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}if(inside)return true;
 }
 return false;
}
const rowCache=new Map();
function intersections(row){
 if(rowCache.has(row))return rowCache.get(row);
 const lat=SOUTH+row*STEP,edges=[];
 for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];if((a[1]>lat)!==(b[1]>lat))edges.push(a[0]+(b[0]-a[0])*(lat-a[1])/(b[1]-a[1]));
 }
 edges.sort((a,b)=>a-b);rowCache.set(row,edges);return edges;
}
function seaAt(x,y){
 if(x<0||x>XMAX||y<0||y>YMAX)return false;
 const lon=WEST+x*STEP,edges=intersections(y),index=edges.findIndex(value=>value>=lon);
 return (index<0?edges.length:index)%2===0;
}
function segmentInlandKm(a,b){
 const distance=length([a,b]),steps=Math.max(1,Math.ceil(distance/2));let inland=0;
 for(let i=0;i<steps;i++){const t=(i+.5)/steps;if(landAtExact(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))inland+=distance/steps}
 return inland;
}
function length(path){return path.slice(1).reduce((sum,p,i)=>sum+Math.hypot((p[0]-path[i][0])*Math.cos((p[1]+path[i][1])/2*Math.PI/180),p[1]-path[i][1])*111.2,0)}
function nearSea(point,maxInland=8){
 const cx=Math.round((point[0]-WEST)/STEP),cy=Math.round((point[1]-SOUTH)/STEP),options=[];
 for(let radius=0;radius<=12;radius++){
  for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++){
   if(Math.max(Math.abs(dx),Math.abs(dy))!==radius||!seaAt(cx+dx,cy+dy))continue;
   const candidate=[WEST+(cx+dx)*STEP,SOUTH+(cy+dy)*STEP];
   if(landAtExact(...candidate))continue;
   const distance=length([point,candidate]),inland=segmentInlandKm(point,candidate);
   options.push({x:cx+dx,y:cy+dy,score:distance+inland*8,inland});
  }
 }
 options.sort((a,b)=>a.score-b.score);
 return options.filter(option=>option.inland<=maxInland);
}
class Heap{
 constructor(){this.items=[]}
 push(item){const q=this.items;let i=q.length;q.push(item);while(i){const p=(i-1)>>1;if(q[p].score<=item.score)break;q[i]=q[p];i=p}q[i]=item}
 pop(){const q=this.items,top=q[0],last=q.pop();if(q.length){let i=0;while(true){let left=i*2+1;if(left>=q.length)break;let right=left+1,child=right<q.length&&q[right].score<q[left].score?right:left;if(q[child].score>=last.score)break;q[i]=q[child];i=child}q[i]=last}return top}
 get length(){return this.items.length}
}
const key=(x,y)=>y*(XMAX+1)+x;
function pathFind(a,b,margin,startLimit=8){
 const start=nearSea(a,startLimit)[0],endOptions=nearSea(b);if(!start||!endOptions.length)return null;
 const targetX=Math.round((b[0]-WEST)/STEP),targetY=Math.round((b[1]-SOUTH)/STEP);
 const minX=Math.max(0,Math.min(start.x,targetX)-margin),maxX=Math.min(XMAX,Math.max(start.x,targetX)+margin),minY=Math.max(0,Math.min(start.y,targetY)-margin),maxY=Math.min(YMAX,Math.max(start.y,targetY)+margin);
 const scale=Math.cos((a[1]+b[1])/2*Math.PI/180),distance=(x,y)=>Math.hypot((targetX-x)*scale,targetY-y);
 const goals=new Set(endOptions.map(option=>key(option.x,option.y)));
 const open=new Heap(),scores=new Map([[key(start.x,start.y),0]]),previous=new Map();open.push({x:start.x,y:start.y,cost:0,score:distance(start.x,start.y)});
 const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 while(open.length){
  const node=open.pop(),id=key(node.x,node.y);if(node.cost!==scores.get(id))continue;
  if(goals.has(id)){const path=[];let at=id;while(at!==undefined){const x=at%(XMAX+1),y=(at-x)/(XMAX+1);path.push([WEST+x*STEP,SOUTH+y*STEP]);at=previous.get(at)}return path.reverse()}
  for(const [dx,dy] of directions){const x=node.x+dx,y=node.y+dy;if(x<minX||x>maxX||y<minY||y>maxY||!seaAt(x,y))continue;
   if(!segmentAtSea([WEST+node.x*STEP,SOUTH+node.y*STEP],[WEST+x*STEP,SOUTH+y*STEP]))continue;
   if(dx&&dy&&!seaAt(node.x+dx,node.y)&&!seaAt(node.x,node.y+dy))continue;
   const next=key(x,y),cost=node.cost+Math.hypot(dx*scale,dy);if(cost>=(scores.get(next)??Infinity))continue;
   scores.set(next,cost);previous.set(next,id);open.push({x,y,cost,score:cost+distance(x,y)});
  }
 }
 return null;
}
function segmentAtSea(a,b){return segmentInlandKm(a,b)<=1}
function simplify(path){
 const result=[path[0]];for(let i=0;i<path.length-1;){let next=i+1;for(let j=path.length-1;j>i+1;j--)if(segmentAtSea(path[i],path[j])){next=j;break}result.push(path[next]);i=next}return result;
}
const sites=Object.fromEntries(GRAND_SITES.map(site=>[site.id,site]));
const fixes={},failures=[];
const only=process.argv[2];
for(const [a,b] of GRAND_ROUTES.filter(route=>route[2]==='sea')){
 if(only&&a!==only)continue;
 const first=[sites[a].lon,sites[a].lat],last=[sites[b].lon,sites[b].lat],directInland=segmentInlandKm(first,last);
 if(directInland<=5)continue;
 // Ancient Utica's harbor is buried under the modern Mejerda delta; the
 // archaeological site is roughly 10 km from today's sea. Preserve its
 // settlement anchor and allow a longer first approach through modern land.
 const startLimit=a==='africa'?20:8;
 let path=pathFind(first,last,80,startLimit);if(!path)path=pathFind(first,last,160,startLimit);
 if(!path){failures.push({a,b,directInland:Math.round(directInland),start:nearSea(first,startLimit)[0],end:nearSea(last)[0]});continue}
 path=simplify(path);
 const points=[first,...path,last],sorted=[a,b].sort(),waypoints=a===sorted[0]?path:[...path].reverse();
 fixes[sorted.join(':')]={waypoints:waypoints.map(([x,y])=>[Number(x.toFixed(3)),Number(y.toFixed(3))]),distance:Math.round(length(points)),inlandBefore:Math.round(directInland)};
 console.log(a,b,Math.round(directInland),fixes[sorted.join(':')].distance,points.length);
}
console.log('sea corridors',Object.keys(fixes).length,'failed',failures);
if(failures.length)throw new Error('Could not find a water corridor for every sampled over-land sea route');
if(!only)await writeFile(new URL('../sea-corridors.js',import.meta.url),`// Derived from the bundled GSHHG modern land mask; operational gameplay paths, not ancient sailing instructions.\nexport default ${JSON.stringify(fixes)};\n`);
