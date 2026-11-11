// Bundle Mapzen/AWS Terrarium relief for the Aegean and western Anatolia.
// The western overlap joins the existing Italy detail tiles; safe to rerun.
import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../map-lab/terrain/',import.meta.url));
const extent={west:21.9,east:31,south:34,north:43};
const tileY=(lat,z)=>Math.floor((1-Math.asinh(Math.tan(lat*Math.PI/180))/Math.PI)/2*(2**z));
const jobs=[];
for(const z of [8,9]){
 const x0=Math.floor((extent.west+180)/360*(2**z));
 const x1=Math.floor((extent.east+180)/360*(2**z));
 for(let x=x0;x<=x1;x++)for(let y=tileY(extent.north,z);y<=tileY(extent.south,z);y++)jobs.push({z,x,y});
}
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const valid=bytes=>bytes.length>100&&bytes.subarray(0,8).equals(signature);
let next=0,downloaded=0,verified=0;
const failures=[];
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
   const partial=target+'.part';await writeFile(partial,bytes);await rename(partial,target);
   verified++;downloaded++;return;
  }catch(error){await rm(target+'.part',{force:true});if(attempt===3)throw new Error(`${z}/${x}/${y}: ${error.message}`)}
 }
}
await Promise.all(Array.from({length:12},async ()=>{
 while(next<jobs.length){const job=jobs[next++];
  try{await processTile(job)}catch(error){failures.push(error.message)}
  if(verified%100===0&&verified>0)console.log(`Verified ${verified}/${jobs.length} tiles`);
 }
}));
console.log(`Downloaded ${downloaded}; verified ${verified}/${jobs.length} Aegean terrain tiles.`);
if(failures.length)throw new Error(`Terrain tile failures: ${failures.slice(0,10).join(', ')}${failures.length>10?'…':''}`);
