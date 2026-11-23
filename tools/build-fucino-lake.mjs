// Reconstruct an illustrative pre-drainage Lacus Fucinus from the bundled
// modern DEM. The 660 m level is a published Roman-era drainage estimate, not a
// surveyed 49 BCE shoreline; the result must be labelled approximate.
import {readFile,writeFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {resolve,join} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const size=256,zoom=9,firstX=274,lastX=276,firstY=189,lastY=191,level=660;
const columns=(lastX-firstX+1)*size,rows=(lastY-firstY+1)*size;
function decodePng(bytes){
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG');
 let width=0,height=0,depth=0,color=0,interlace=0;const chunks=[];
 for(let p=8;p<bytes.length;){const length=bytes.readUInt32BE(p),kind=bytes.toString('ascii',p+4,p+8),body=bytes.subarray(p+8,p+8+length);p+=12+length;
  if(kind==='IHDR'){width=body.readUInt32BE(0);height=body.readUInt32BE(4);depth=body[8];color=body[9];interlace=body[12]}
  if(kind==='IDAT')chunks.push(body);
  if(kind==='IEND')break;
 }
 if(width!==size||height!==size||depth!==8||color!==2||interlace!==0)throw Error('Unexpected Terrarium PNG format');
 const raw=inflateSync(Buffer.concat(chunks)),stride=size*3,pixels=new Uint8Array(size*stride);let source=0;
 for(let y=0;y<size;y++){const filter=raw[source++],row=y*stride,prior=row-stride;
  for(let x=0;x<stride;x++){const a=x>=3?pixels[row+x-3]:0,b=y?pixels[prior+x]:0,c=y&&x>=3?pixels[prior+x-3]:0;
   const guess=a+b-c,pa=Math.abs(guess-a),pb=Math.abs(guess-b),pc=Math.abs(guess-c),paeth=pa<=pb&&pa<=pc?a:pb<=pc?b:c;
   const predictor=[0,a,b,Math.floor((a+b)/2),paeth][filter];
   if(predictor===undefined)throw Error(`Unsupported PNG filter ${filter}`);
   pixels[row+x]=(raw[source++]+predictor)&255;
  }
 }
 return pixels;
}
const tiles=new Map();
for(let x=firstX;x<=lastX;x++)for(let y=firstY;y<=lastY;y++)tiles.set(`${x}:${y}`,decodePng(await readFile(join(root,'map-lab','terrain',String(zoom),String(x),`${y}.png`))));
const elevation=new Float32Array(columns*rows);
for(let y=0;y<rows;y++)for(let x=0;x<columns;x++){
 const tx=firstX+Math.floor(x/size),ty=firstY+Math.floor(y/size),i=((y%size)*size+x%size)*3,b=tiles.get(`${tx}:${ty}`);
 elevation[y*columns+x]=b[i]*256+b[i+1]+b[i+2]/256-32768;
}
// A three-pixel neighborhood removes isolated drainage-channel pixels left
// by the modern reclaimed farmland while preserving the basin outline.
const smooth=new Float32Array(elevation);
for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
 let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=elevation[(y+dy)*columns+x+dx]*(dx===0?2:1)*(dy===0?2:1);
 smooth[y*columns+x]=sum/16;
}
const pixel=(lon,lat)=>[
 Math.round(((lon+180)/360*2**zoom-firstX)*size),
 Math.round(((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**zoom-firstY)*size)
];
const [seedX,seedY]=pixel(13.547222,41.995),seed=seedY*columns+seedX;
if(smooth[seed]>level)throw Error('Published lake center lies above the selected level');
const mask=new Uint8Array(elevation.length),queue=[seed];mask[seed]=1;
for(let i=0;i<queue.length;i++){
 const p=queue[i],x=p%columns,y=Math.floor(p/columns);
 for(const n of [p-1,p+1,p-columns,p+columns]){
  if(n<0||n>=mask.length||mask[n]||smooth[n]>level)continue;
  const nx=n%columns,ny=Math.floor(n/columns);
  if(Math.abs(nx-x)+Math.abs(ny-y)!==1)continue;
  mask[n]=1;queue.push(n);
 }
}
const inside=(x,y)=>x>=0&&x<columns&&y>=0&&y<rows&&mask[y*columns+x];
const edges=[],outgoing=new Map();
const key=([x,y])=>`${x}:${y}`;
function edge(from,to){const index=edges.length;edges.push({from,to,used:false});const k=key(from);if(!outgoing.has(k))outgoing.set(k,[]);outgoing.get(k).push(index)}
for(const p of queue){const x=p%columns,y=Math.floor(p/columns);
 if(!inside(x,y-1))edge([x,y],[x+1,y]);
 if(!inside(x+1,y))edge([x+1,y],[x+1,y+1]);
 if(!inside(x,y+1))edge([x+1,y+1],[x,y+1]);
 if(!inside(x-1,y))edge([x,y+1],[x,y]);
}
const rings=[];
for(let start=0;start<edges.length;start++){
 if(edges[start].used)continue;
 const points=[edges[start].from],first=key(edges[start].from);let current=start;
 for(let guard=0;guard<edges.length+1;guard++){
  const e=edges[current];if(e.used)throw Error('Boundary edge was reused');e.used=true;points.push(e.to);
  if(key(e.to)===first)break;
  const choices=(outgoing.get(key(e.to))||[]).filter(i=>!edges[i].used);
  if(!choices.length)throw Error('Open Fucino boundary');
  const [dx,dy]=[e.to[0]-e.from[0],e.to[1]-e.from[1]];
  // Keep the filled cell to the right at a diagonal contact.
  const rank=i=>{const n=edges[i],nx=n.to[0]-n.from[0],ny=n.to[1]-n.from[1],cross=dx*ny-dy*nx,dot=dx*nx+dy*ny;return cross>0?0:dot>0?1:cross<0?2:3};
  current=choices.sort((a,b)=>rank(a)-rank(b))[0];
 }
 if(key(points.at(-1))!==first)throw Error('Fucino boundary did not close');
 rings.push(points.slice(0,-1));
}
const ringArea=points=>points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p[0]*q[1]-q[0]*p[1]},0)/2;
rings.sort((a,b)=>Math.abs(ringArea(b))-Math.abs(ringArea(a)));
if(!rings.length)throw Error('No Fucino polygon');
const simplify=points=>{
 const open=[...points,points[0]],keep=new Uint8Array(open.length),stack=[[0,open.length-1]];keep[0]=keep[open.length-1]=1;
 while(stack.length){const [start,end]=stack.pop(),a=open[start],b=open[end],dx=b[0]-a[0],dy=b[1]-a[1],span=dx*dx+dy*dy;let far=0,index=-1;
  for(let i=start+1;i<end;i++){const p=open[i],t=span?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/span)):0,d=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(d>far){far=d;index=i}}
  if(index>=0&&far>.8**2){keep[index]=1;stack.push([start,index],[index,end])}
 }
 return open.filter((_,i)=>keep[i]);
};
const coordinate=([x,y])=>{const px=firstX*size+x-.5,py=firstY*size+y-.5,scale=size*2**zoom;return [Number((px/scale*360-180).toFixed(5)),Number((Math.atan(Math.sinh(Math.PI*(1-2*py/scale)))*180/Math.PI).toFixed(5))]};
const simplifiedRings=[];
const coordinates=rings.filter((ring,i)=>i===0||Math.abs(ringArea(ring))>=8).map(ring=>{
 const filtered=ring.map((p,i,all)=>{const a=all[(i+all.length-1)%all.length],b=all[(i+1)%all.length];return [a[0]*.2+p[0]*.6+b[0]*.2,a[1]*.2+p[1]*.6+b[1]*.2]});
 const simplified=simplify(filtered);simplifiedRings.push(simplified.slice(0,-1));
 const simple=simplified.map(coordinate);if(simple.length<4)throw Error('Degenerate Fucino ring');return simple;
});
const cellLength=111.32*Math.cos(41.995*Math.PI/180)*360/(size*2**zoom);
const areaKm2=Number((queue.length*cellLength**2).toFixed(1));
const outlinedCells=Math.abs(simplifiedRings.reduce((sum,ring)=>sum+ringArea(ring),0));
if(Math.abs(outlinedCells-queue.length)/queue.length>.03)throw Error('Simplified Fucino shoreline changed the model area too much');
if(areaKm2<100||areaKm2>200)throw Error(`Implausible Fucino basin area ${areaKm2} km²`);
const collection={type:'FeatureCollection',features:[{type:'Feature',properties:{name:'Lacus Fucinus',kind:'approximate historical lake',referenceLevelMeters:level,approximateAreaKm2:areaKm2},geometry:{type:'Polygon',coordinates}}]};
await writeFile(join(root,'map-lab','fucino-lake.js'),`// Approximate pre-drainage Lacus Fucinus. Generated by tools/build-fucino-lake.mjs from bundled modern Mapzen Terrarium tiles and a published 660 m Roman drainage level; not a surveyed 49 BCE shoreline.\nexport default ${JSON.stringify(collection)};\n`);
console.log(`Fucino: ${queue.length} DEM cells, ${areaKm2} km², ${coordinates.length} rings, ${coordinates[0].length} outer vertices`);
