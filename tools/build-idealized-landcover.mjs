// Offline Natural Earth II land-cover tiles. Run with a local NE2_LR_LC.tif
// from https://www.naturalearthdata.com/downloads/10m-raster-data/10m-natural-earth-2/
// after installing sharp for this build step.
import sharp from 'sharp';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';

const input=process.argv[2];
if(!input)throw Error('Usage: node tools/build-idealized-landcover.mjs NE2_LR_LC.tif');
const metadata=await sharp(input).metadata();
if(metadata.width!==16200||metadata.height!==8100||metadata.channels<3)throw Error('Expected the 16200 × 8100 Natural Earth II medium raster');
const bounds={west:-30,east:65,south:10,north:65};
const left=Math.floor((bounds.west+180)/360*metadata.width)-1;
const top=Math.floor((90-bounds.north)/180*metadata.height)-1;
const right=Math.ceil((bounds.east+180)/360*metadata.width)+1;
const bottom=Math.ceil((90-bounds.south)/180*metadata.height)+1;
const {data,info}=await sharp(input).extract({left,top,width:right-left,height:bottom-top}).removeAlpha().raw().toBuffer({resolveWithObject:true});
const nlat=y=>Math.atan(Math.sinh(Math.PI*(1-2*y)))*180/Math.PI;
const ty=(lat,z)=>(1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*(2**z);
const sample=(lon,lat,out,index)=>{
 const sx=(lon+180)/360*metadata.width-left-.5,sy=(90-lat)/180*metadata.height-top-.5;
 if(sx<0||sy<0||sx>=info.width-1||sy>=info.height-1){out[index]=out[index+1]=out[index+2]=255;return}
 const x=Math.floor(sx),y=Math.floor(sy),dx=sx-x,dy=sy-y,row=info.width*info.channels;
 const a=y*row+x*info.channels,b=a+info.channels,c=a+row,d=c+info.channels;
 for(let channel=0;channel<3;channel++)out[index+channel]=Math.round(data[a+channel]*(1-dx)*(1-dy)+data[b+channel]*dx*(1-dy)+data[c+channel]*(1-dx)*dy+data[d+channel]*dx*dy);
};
let count=0,bytes=0;
for(const z of [4,5,6]){
 const scale=2**z,x0=Math.floor((bounds.west+180)/360*scale),x1=Math.floor((bounds.east+180)/360*scale),y0=Math.floor(ty(bounds.north,z)),y1=Math.floor(ty(bounds.south,z));
 for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
  const rgb=Buffer.alloc(256*256*3),latitudes=Array.from({length:256},(_,py)=>nlat((y+(py+.5)/256)/scale));
  for(let px=0;px<256;px++){const lon=(x+(px+.5)/256)/scale*360-180;for(let py=0;py<256;py++)sample(lon,latitudes[py],rgb,(py*256+px)*3)}
  const dir=path.join('map-lab','landcover',String(z),String(x));await mkdir(dir,{recursive:true});
  const output=await sharp(rgb,{raw:{width:256,height:256,channels:3}}).png({compressionLevel:9}).toBuffer();
  await writeFile(path.join(dir,`${y}.png`),output);count++;bytes+=output.length;
 }
}
console.log(JSON.stringify({tiles:count,bytes,bounds,source:path.basename(input)}));
