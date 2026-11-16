// Derive illustrative land corridors from the bundled modern GSHHG land mask.
// These are gameplay paths, not surveyed Roman roads or ancient shorelines.
import land from '../mediterranean-land.js';
import {GRAND_ROUTES,GRAND_SITES} from '../grand-map-data.js';
import {writeFile} from 'node:fs/promises';

const STEP=.05,WEST=-12,SOUTH=24,EAST=51,NORTH=55;
const XMAX=Math.round((EAST-WEST)/STEP),YMAX=Math.round((NORTH-SOUTH)/STEP);
const rings=land.features.flatMap(feature=>feature.geometry.type==='Polygon'?[feature.geometry.coordinates[0]]:feature.geometry.coordinates.map(polygon=>polygon[0]));
const exactRings=rings.map(points=>({points,bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}));
function exactLandAt(x,y){
 for(const {points,bounds} of exactRings){if(x<bounds[0]||x>bounds[2]||y<bounds[1]||y>bounds[3])continue;
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){const a=points[i],b=points[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside}if(inside)return true;
 }
 return false;
}
const rowCache=new Map();
function intersections(row){
 if(rowCache.has(row))return rowCache.get(row);
 const lat=SOUTH+row*STEP,edges=[];
 for(const ring of rings)for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if((a[1]>lat)!==(b[1]>lat))edges.push(a[0]+(b[0]-a[0])*(lat-a[1])/(b[1]-a[1]));
 }
 edges.sort((a,b)=>a-b);rowCache.set(row,edges);return edges;
}
function landAt(x,y){
 if(x<0||x>XMAX||y<0||y>YMAX)return false;
 const lon=WEST+x*STEP,edges=intersections(y),index=edges.findIndex(value=>value>=lon);
 return (index<0?edges.length:index)%2===1;
}
function nearLand(lon,lat){
 const cx=Math.round((lon-WEST)/STEP),cy=Math.round((lat-SOUTH)/STEP);
 const visible=(x,y)=>landAt(x,y)&&segmentOnLand([lon,lat],[WEST+x*STEP,SOUTH+y*STEP]);
 if(visible(cx,cy))return [cx,cy];
 for(let radius=1;radius<=8;radius++){
  const options=[];
  for(let dx=-radius;dx<=radius;dx++)for(let dy=-radius;dy<=radius;dy++)if(Math.max(Math.abs(dx),Math.abs(dy))===radius&&visible(cx+dx,cy+dy))options.push([cx+dx,cy+dy]);
  if(options.length)return options.sort((a,b)=>(a[0]-cx)**2+(a[1]-cy)**2-(b[0]-cx)**2-(b[1]-cy)**2)[0];
 }
 return null;
}
class Heap{
 constructor(){this.items=[]}
 push(item){const q=this.items;let i=q.length;q.push(item);while(i){const p=(i-1)>>1;if(q[p].score<=item.score)break;q[i]=q[p];i=p}q[i]=item}
 pop(){const q=this.items,top=q[0],last=q.pop();if(q.length){let i=0;while(true){let left=i*2+1;if(left>=q.length)break;let right=left+1,child=right<q.length&&q[right].score<q[left].score?right:left;if(q[child].score>=last.score)break;q[i]=q[child];i=child}q[i]=last}return top}
 get length(){return this.items.length}
}
const key=(x,y)=>y*(XMAX+1)+x;
function pathFind(a,b,margin=80){
 const start=nearLand(...a),end=nearLand(...b);if(!start||!end)return null;
 const [sx,sy]=start,[ex,ey]=end,minX=Math.max(0,Math.min(sx,ex)-margin),maxX=Math.min(XMAX,Math.max(sx,ex)+margin),minY=Math.max(0,Math.min(sy,ey)-margin),maxY=Math.min(YMAX,Math.max(sy,ey)+margin);
 const scale=Math.cos((a[1]+b[1])/2*Math.PI/180),distance=(x,y)=>Math.hypot((ex-x)*scale,ey-y);
 const open=new Heap(),scores=new Map([[key(sx,sy),0]]),previous=new Map();open.push({x:sx,y:sy,score:distance(sx,sy),cost:0});
 const directions=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 while(open.length){
  const node=open.pop(),id=key(node.x,node.y);if(node.cost!==scores.get(id))continue;
  if(node.x===ex&&node.y===ey){const path=[];let at=id;while(at!==undefined){const x=at%(XMAX+1),y=(at-x)/(XMAX+1);path.push([WEST+x*STEP,SOUTH+y*STEP]);at=previous.get(at)}return path.reverse()}
  for(const [dx,dy] of directions){const x=node.x+dx,y=node.y+dy;if(x<minX||x>maxX||y<minY||y>maxY||!landAt(x,y)||!segmentOnLand([WEST+node.x*STEP,SOUTH+node.y*STEP],[WEST+x*STEP,SOUTH+y*STEP]))continue;
   if(dx&&dy&&!landAt(node.x+dx,node.y)&&!landAt(node.x,node.y+dy))continue;
   const next=key(x,y),cost=node.cost+Math.hypot(dx*scale,dy);if(cost>=(scores.get(next)??Infinity))continue;
   scores.set(next,cost);previous.set(next,id);open.push({x,y,cost,score:cost+distance(x,y)});
  }
 }
 return null;
}
function segmentOnLand(a,b){
 const length=Math.hypot((b[0]-a[0])*Math.cos((a[1]+b[1])/2*Math.PI/180),b[1]-a[1])*111.2;
 for(let i=1,steps=Math.max(1,Math.ceil(length/2));i<steps;i++){
  const t=i/steps,x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t;
  if(!exactLandAt(x,y))return false;
 }
 return true;
}
function simplify(path){const result=[path[0]];for(let i=0;i<path.length-1;){let next=i+1;for(let j=path.length-1;j>i+1;j--)if(segmentOnLand(path[i],path[j])){next=j;break}result.push(path[next]);i=next}return result}
function length(path){return path.slice(1).reduce((sum,p,i)=>sum+Math.hypot((p[0]-path[i][0])*Math.cos((p[1]+path[i][1])/2*Math.PI/180),p[1]-path[i][1])*111.2,0)}
const sites=Object.fromEntries(GRAND_SITES.map(site=>[site.id,site]));
const fixes={},failures=[];
for(const [a,b,kind] of GRAND_ROUTES.filter(route=>route[2]!=='sea')){
 if(a==='bosporus'&&b==='t097'||b==='bosporus'&&a==='t097')continue;
 const first=[sites[a].lon,sites[a].lat],last=[sites[b].lon,sites[b].lat],direct=[first,last];
 let offshore=0;for(let segment=0;segment<direct.length-1;segment++){
  const p=direct[segment],q=direct[segment+1],km=length([p,q]),steps=Math.max(1,Math.ceil(km/5));
  for(let i=0;i<steps;i++){const t=(i+.5)/steps,x=p[0]+(q[0]-p[0])*t,y=p[1]+(q[1]-p[1])*t;if(!exactLandAt(x,y))offshore+=km/steps}
 }
 if(offshore<6)continue;
 let path=pathFind(first,last);if(!path)path=pathFind(first,last,160);
 if(!path){failures.push({a,b,offshore:Math.round(offshore)});continue}
 path=simplify(path);
 const points=[first,...path,last];
 const sorted=[a,b].sort(),waypoints=a===sorted[0]?points.slice(1,-1):points.slice(1,-1).reverse();
 fixes[sorted.join(':')]={waypoints:waypoints.map(([x,y])=>[Number(x.toFixed(3)),Number(y.toFixed(3))]),distance:Math.round(length(points)),offshoreBefore:Math.round(offshore)};
 console.log(a,b,Math.round(offshore),fixes[[a,b].sort().join(':')].distance,points.length);
}
console.log('corridors',Object.keys(fixes).length,'failed',failures);
if(failures.length)throw new Error('Could not find a land corridor for every sampled over-water road');
await writeFile(new URL('../land-corridors.js',import.meta.url),`// Derived from the bundled GSHHG modern land mask; operational gameplay paths, not attested Roman roads.\nexport default ${JSON.stringify(fixes)};\n`);
