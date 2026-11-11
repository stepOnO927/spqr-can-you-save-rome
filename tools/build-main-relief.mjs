import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

// Project the already bundled Mapzen/AWS Terrarium elevation into the SVG
// campaign map's equirectangular frame. Regenerate after replacing DEM tiles.
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',args:['--no-sandbox']});
const page=await browser.newPage();
page.route('http://spqr.test/**',async route=>{
 const pathname=new URL(route.request().url()).pathname;
 if(pathname==='/generate')return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'});
 const file=resolve(root,'.'+pathname);
 if(!file.startsWith(root+sep)||!pathname.startsWith('/map-lab/terrain/'))return route.abort();
 try{await route.fulfill({contentType:'image/png',body:await readFile(file)})}catch{await route.fulfill({status:404,body:'Missing bundled elevation tile'})}
});
try{
 await page.goto('http://spqr.test/generate');
 const result=await page.evaluate(async()=>{
  const width=2400,height=1300,zoom=7,n=2**zoom,values=new Float32Array(width*height),tiles=new Map();let fallbackCount=0;
  const palette=[[0,[225,214,183]],[100,[211,202,166]],[300,[181,188,151]],[700,[143,164,132]],[1200,[119,143,121]],[1900,[130,139,125]],[2700,[169,168,148]],[3600,[223,218,197]]];
  const tileFor=async(x,y)=>{
   const key=`${x}/${y}`;if(tiles.has(key))return tiles.get(key);
   let response=await fetch(`/map-lab/terrain/${zoom}/${x}/${y}.png`),fallback=false;
   if(!response.ok){response=await fetch(`/map-lab/terrain/6/${Math.floor(x/2)}/${Math.floor(y/2)}.png`);fallback=true;fallbackCount++}
   if(!response.ok)throw Error(`Missing DEM tile ${key} and its zoom-6 parent`);
   const bitmap=await createImageBitmap(await response.blob()),canvas=document.createElement('canvas');canvas.width=canvas.height=256;
   const context=canvas.getContext('2d',{willReadFrequently:true});
   if(fallback)context.drawImage(bitmap,(x%2)*128,(y%2)*128,128,128,0,0,256,256);else context.drawImage(bitmap,0,0);
   bitmap.close();
   const data=context.getImageData(0,0,256,256).data;tiles.set(key,data);return data;
  };
  const rows=[];
  for(let y=0;y<height;y++){
   const lat=(55-31*(y+.5)/height)*Math.PI/180;
   const tileY=(1-Math.asinh(Math.tan(lat))/Math.PI)/2*n;
   const row=[];
   for(let x=0;x<width;x++){
   const lon=-12+62*(x+.5)/width,tileX=(lon+180)/360*n;
    row.push({tx:Math.floor(tileX),ty:Math.floor(tileY),px:Math.min(255,Math.floor((tileX%1)*256)),py:Math.min(255,Math.floor((tileY%1)*256))});
   }
   rows.push(row);
  }
  const required=new Set(rows.flatMap(row=>row.map(p=>`${p.tx}/${p.ty}`)));
  await Promise.all([...required].map(key=>{const [x,y]=key.split('/').map(Number);return tileFor(x,y)}));
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const p=rows[y][x],data=tiles.get(`${p.tx}/${p.ty}`),offset=(p.py*256+p.px)*4;
   values[y*width+x]=data[offset]*256+data[offset+1]+data[offset+2]/256-32768;
  }
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d'),image=context.createImageData(width,height),pixels=image.data;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const index=y*width+x,elevation=Math.max(0,values[index]);
   let upper=palette.findIndex(stop=>stop[0]>=elevation);if(upper<1)upper=elevation<=0?1:palette.length-1;
   const lower=palette[upper-1],high=palette[upper],mix=Math.max(0,Math.min(1,(elevation-lower[0])/(high[0]-lower[0])));
   const west=Math.max(0,values[y*width+Math.max(0,x-1)]),east=Math.max(0,values[y*width+Math.min(width-1,x+1)]);
   const north=Math.max(0,values[Math.max(0,y-1)*width+x]),south=Math.max(0,values[Math.min(height-1,y+1)*width+x]);
   const light=Math.max(.73,Math.min(1.15,.96+(west-east)*.00028+(south-north)*.00022));
   for(let c=0;c<3;c++)pixels[index*4+c]=Math.round((lower[1][c]+(high[1][c]-lower[1][c])*mix)*light);
   pixels[index*4+3]=255;
  }
  context.putImageData(image,0,0);
  return {png:canvas.toDataURL('image/png').split(',')[1],tiles:required.size,fallbacks:fallbackCount};
 });
 const file=resolve(root,'assets/mediterranean-relief-main.png');
 await writeFile(file,Buffer.from(result.png,'base64'));
 console.log(`Wrote ${file} from ${result.tiles} bundled zoom-7 DEM tiles (${result.fallbacks} used zoom-6 parents).`);
}finally{await browser.close()}
