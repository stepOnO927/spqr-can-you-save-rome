// Extract modern Apennine contours from the same bundled Terrarium DEM that
// colors the close atlas. These lines are cartographic, not ancient data.
import {readFile,writeFile} from 'node:fs/promises';
import {inflateSync} from 'node:zlib';
import {resolve,join} from 'node:path';

const root=resolve(import.meta.dirname,'..'),zoom=9,firstX=268,lastX=279,firstY=181,lastY=192,step=4;
const tileSize=256,columns=(lastX-firstX+1)*tileSize/step+1,rows=(lastY-firstY+1)*tileSize/step+1;
function decodePng(bytes){
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('Invalid PNG');
 let width=0,height=0,depth=0,color=0,interlace=0;const chunks=[];
 for(let p=8;p<bytes.length;){const length=bytes.readUInt32BE(p),kind=bytes.toString('ascii',p+4,p+8),body=bytes.subarray(p+8,p+8+length);p+=12+length;
  if(kind==='IHDR'){width=body.readUInt32BE(0);height=body.readUInt32BE(4);depth=body[8];color=body[9];interlace=body[12]}
  if(kind==='IDAT')chunks.push(body);
  if(kind==='IEND')break;
 }
 if(width!==tileSize||height!==tileSize||depth!==8||color!==2||interlace!==0)throw Error('Unexpected Terrarium PNG format');
 const raw=inflateSync(Buffer.concat(chunks)),stride=width*3,pixels=new Uint8Array(height*stride),bpp=3;let source=0;
 for(let y=0;y<height;y++){const filter=raw[source++],row=y*stride,prior=row-stride;
  for(let x=0;x<stride;x++){const a=x>=bpp?pixels[row+x-bpp]:0,b=y?pixels[prior+x]:0,c=y&&x>=bpp?pixels[prior+x-bpp]:0;
   const predictor=a+b-c,pa=Math.abs(predictor-a),pb=Math.abs(predictor-b),pc=Math.abs(predictor-c),paeth=pa<=pb&&pa<=pc?a:pb<=pc?b:c;
   const value=filter===0?0:filter===1?a:filter===2?b:filter===3?Math.floor((a+b)/2):filter===4?paeth:null;
   if(value===null)throw Error(`Unsupported PNG filter ${filter}`);
   pixels[row+x]=(raw[source++]+value)&255;
  }
 }
 return pixels;
}
const tiles=new Map();for(let x=firstX;x<=lastX;x++)for(let y=firstY;y<=lastY;y++)tiles.set(`${x}:${y}`,decodePng(await readFile(join(root,'map-lab','terrain',String(zoom),String(x),`${y}.png`))));
const elevation=new Float32Array(columns*rows);
for(let gy=0;gy<rows;gy++)for(let gx=0;gx<columns;gx++){
 const tx=Math.min(lastX,firstX+Math.floor(gx*step/tileSize)),ty=Math.min(lastY,firstY+Math.floor(gy*step/tileSize));
 const px=Math.min(255,gx*step-(tx-firstX)*tileSize),py=Math.min(255,gy*step-(ty-firstY)*tileSize),i=(py*tileSize+px)*3,bytes=tiles.get(`${tx}:${ty}`);
 elevation[gy*columns+gx]=bytes[i]*256+bytes[i+1]+bytes[i+2]/256-32768;
}
// Generalize the DEM at approximately one-kilometre sample spacing before
// tracing it. This removes isolated tile/pixel noise without adding terrain.
const generalized=new Float32Array(elevation);
for(let y=1;y<rows-1;y++)for(let x=1;x<columns-1;x++){
 let sum=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)sum+=elevation[(y+dy)*columns+x+dx]*(dx===0?2:1)*(dy===0?2:1);
 generalized[y*columns+x]=sum/16;
}
elevation.set(generalized);
function coordinate([x,y]){
 const scale=tileSize*2**zoom,pixelX=firstX*tileSize+x*step,pixelY=firstY*tileSize+y*step;
 const lon=pixelX/scale*360-180,lat=Math.atan(Math.sinh(Math.PI*(1-2*pixelY/scale)))*180/Math.PI;
 return [Number(lon.toFixed(4)),Number(lat.toFixed(4))];
}
// Keep bends visible at zoom 9 without shipping each sampled DEM point.
function simplify(points){
 if(points.length<=2)return points;
 const keep=new Uint8Array(points.length),stack=[[0,points.length-1]];keep[0]=keep[points.length-1]=1;
 while(stack.length){const [start,end]=stack.pop(),a=points[start],b=points[end],dx=b[0]-a[0],dy=b[1]-a[1],span=dx*dx+dy*dy;let far=0,index=-1;
  for(let i=start+1;i<end;i++){const p=points[i],t=span?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/span)):0,distance=(p[0]-a[0]-t*dx)**2+(p[1]-a[1]-t*dy)**2;if(distance>far){far=distance;index=i}}
  if(index>=0&&far>.004**2){keep[index]=1;stack.push([start,index],[index,end])}
 }
 return points.filter((_,i)=>keep[i]);
}
function contour(level){
 const segments=[];
 for(let y=0;y<rows-1;y++)for(let x=0;x<columns-1;x++){
  const a=elevation[y*columns+x],b=elevation[y*columns+x+1],c=elevation[(y+1)*columns+x+1],d=elevation[(y+1)*columns+x];
  const edges=[];
  const cross=(v,w,p,q)=>{if((v>=level)===(w>=level))return;const t=(level-v)/(w-v);edges.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])])};
  cross(a,b,[x,y],[x+1,y]);cross(b,c,[x+1,y],[x+1,y+1]);cross(c,d,[x+1,y+1],[x,y+1]);cross(d,a,[x,y+1],[x,y]);
  if(edges.length===2)segments.push(edges);
  else if(edges.length===4){segments.push([edges[0],edges[1]],[edges[2],edges[3]])}
 }
 const key=p=>`${Math.round(p[0]*1000)}:${Math.round(p[1]*1000)}`,index=new Map(),used=new Uint8Array(segments.length);
 for(let i=0;i<segments.length;i++)for(const p of segments[i]){const k=key(p);if(!index.has(k))index.set(k,[]);index.get(k).push(i)}
 const lines=[];
 for(let i=0;i<segments.length;i++){
  if(used[i])continue;used[i]=1;const line=[segments[i][0],segments[i][1]];
  for(const side of [0,1])for(;;){const endpoint=side?line.at(-1):line[0],next=(index.get(key(endpoint))||[]).find(j=>!used[j]);if(next===undefined)break;used[next]=1;const [p,q]=segments[next],other=key(p)===key(endpoint)?q:p;if(side)line.push(other);else line.unshift(other)}
  if(line.length<3)continue;
  const length=line.slice(1).reduce((distance,p,j)=>distance+Math.hypot(p[0]-line[j][0],p[1]-line[j][1]),0);
  if(length<22)continue;
  // Rounding at source resolution keeps the bundled GeoJSON compact.
  const coords=simplify(line.map(coordinate).filter((p,j,all)=>j===0||p[0]!==all[j-1][0]||p[1]!==all[j-1][1]));
  if(coords.length>=3)lines.push({type:'Feature',properties:{height:level},geometry:{type:'LineString',coordinates:coords}});
 }
 return lines;
}
const features=[500,1000,1500].flatMap(contour);
const collection={type:'FeatureCollection',features};
await writeFile(join(root,'map-lab','italy-contours.js'),`// Modern Mapzen Terrarium elevation contours across the central and northern Apennines, generated by tools/build-italy-contours.mjs.\nexport default ${JSON.stringify(collection)};\n`);
console.log(`Italy contours: ${features.length} lines, ${Math.round(JSON.stringify(collection).length/1024)} KiB`);
