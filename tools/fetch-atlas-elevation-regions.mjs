// Bundle remaining close-zoom campaign regions from the credited Mapzen/AWS
// Terrarium source. Run with a region name or "all"; existing tiles are reused.
import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const extents={
 gaul:{west:-1,east:6,south:44,north:51},
 pontic:{west:30,east:38,south:38,north:47},
 armenia:{west:39,east:46,south:36,north:42},
 syria:{west:34,east:40,south:32,north:38},
 parthia:{west:42,east:51,south:30,north:38},
 leptis:{west:12,east:16,south:31,north:34}
};
const region=process.argv[2];
if(!region||region!=='all'&&!extents[region])throw new Error(`Choose ${Object.keys(extents).join(', ')} or all`);
const root=fileURLToPath(new URL('../map-lab/terrain/',import.meta.url));
const tileY=(lat,z)=>Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*2**z);
const jobs=new Map();
for(const extent of (region==='all'?Object.values(extents):[extents[region]]))for(const z of [8,9]){
 const west=Math.floor((extent.west+180)/360*2**z),east=Math.floor((extent.east+180)/360*2**z);
 for(let x=west;x<=east;x++)for(let y=tileY(extent.north,z);y<=tileY(extent.south,z);y++)jobs.set(`${z}/${x}/${y}`,{z,x,y});
}
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const valid=bytes=>bytes.length>100&&bytes.subarray(0,8).equals(signature);
let next=0,downloaded=0,verified=0;
const failures=[],queue=[...jobs.values()];
async function processTile({z,x,y}){
 const directory=path.join(root,String(z),String(x)),target=path.join(directory,`${y}.png`);
 try{if(valid(await readFile(target))){verified++;return}}catch{}
 await mkdir(directory,{recursive:true});
 const uri=`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(uri,{signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const bytes=Buffer.from(await response.arrayBuffer());
   if(!valid(bytes))throw new Error('invalid PNG');
   await writeFile(target+'.part',bytes);await rename(target+'.part',target);
   verified++;downloaded++;return;
  }catch(error){await rm(target+'.part',{force:true});if(attempt===3)throw new Error(`${z}/${x}/${y}: ${error.message}`)}
 }
}
await Promise.all(Array.from({length:12},async()=>{
 while(next<queue.length){
  const job=queue[next++];
  try{await processTile(job)}catch(error){failures.push(error.message)}
  if(verified>0&&verified%100===0)console.log(`Verified ${verified}/${queue.length} terrain tiles`);
 }
}));
console.log(`Downloaded ${downloaded}; verified ${verified}/${queue.length} ${region} terrain tiles.`);
if(failures.length)throw new Error(`Terrain tile failures: ${failures.slice(0,10).join(', ')}${failures.length>10?'…':''}`);
