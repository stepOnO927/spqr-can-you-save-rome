// Bundle the highest zoom used by the playable atlas from the same credited
// Mapzen/AWS Terrarium source as zooms 4–8. Safe to rerun after interruption.
import {mkdir,readFile,rename,rm,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root=fileURLToPath(new URL('../map-lab/terrain/9/',import.meta.url));
const jobs=[];
for(let x=262;x<=287;x++)for(let y=176;y<=203;y++)jobs.push({x,y});
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
const valid=bytes=>bytes.length>100&&bytes.subarray(0,8).equals(signature);
let next=0,downloaded=0,verified=0;
const failures=[];
async function processTile({x,y}){
 const directory=path.join(root,String(x)),target=path.join(directory,`${y}.png`);
 try{if(valid(await readFile(target))){verified++;return}}catch{}
 await mkdir(directory,{recursive:true});
 const uri=`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/9/${x}/${y}.png`;
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(uri,{signal:AbortSignal.timeout(25000)});
   if(!response.ok)throw new Error(`HTTP ${response.status}`);
   const bytes=Buffer.from(await response.arrayBuffer());
   if(!valid(bytes))throw new Error('invalid PNG');
   const partial=target+'.part';await writeFile(partial,bytes);await rename(partial,target);
   verified++;downloaded++;return;
  }catch(error){await rm(target+'.part',{force:true});if(attempt===3)throw new Error(`${x}/${y}: ${error.message}`)}
 }
}
await Promise.all(Array.from({length:12},async ()=>{
 while(next<jobs.length){const job=jobs[next++];
  try{await processTile(job)}catch(error){failures.push(error.message)}
  if(verified%100===0&&verified>0)console.log(`Verified ${verified}/${jobs.length} tiles`);
 }
}));
console.log(`Downloaded ${downloaded}; verified ${verified}/${jobs.length}.`);
if(failures.length)throw new Error(`Terrain tile failures: ${failures.slice(0,10).join(', ')}${failures.length>10?'…':''}`);
