// Check transport-level reachability of the cited development catalog pages.
// A successful HTTP response does not verify that a page supports its card.
import {MATERIALS,IDEAS} from '../development.js';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const references=new Map();
for(const item of [...MATERIALS,...IDEAS]){
 const url=item.source?.url;
 if(!url)throw Error(`Missing source URL for ${item.id}`);
 if(!references.has(url))references.set(url,[]);
 references.get(url).push(item.id);
}
const work=[...references].map(([url,ids])=>({url,ids})),results=[];
async function check({url,ids}){
 for(const method of ['HEAD','GET']){
  try{
   const response=await fetch(url,{method,redirect:'follow',signal:AbortSignal.timeout(15000)});
   await response.body?.cancel();
   if(method==='HEAD'&&[403,405,406,501].includes(response.status))continue;
   return {url,ids,status:response.status,method,finalUrl:response.url};
  }catch(error){
   if(method==='HEAD')continue;
   return {url,ids,status:null,error:String(error?.cause?.code||error?.name||error)};
  }
 }
}
const next=()=>work.shift();
await Promise.all(Array.from({length:4},async()=>{for(let item;item=next();){const result=await check(item);results.push(result);console.log(`${result.status??result.error} ${item.ids.join(',')}`)}}));
results.sort((a,b)=>a.url.localeCompare(b.url));
const target=fileURLToPath(new URL('../outputs/development-link-audit.json',import.meta.url));
await mkdir(fileURLToPath(new URL('../outputs/',import.meta.url)),{recursive:true});
await writeFile(target,JSON.stringify({checkedAt:new Date().toISOString(),results},null,2));
console.log(JSON.stringify({total:results.length,ok:results.filter(item=>item.status>=200&&item.status<400).length,other:results.filter(item=>!(item.status>=200&&item.status<400)).map(item=>({ids:item.ids,status:item.status,error:item.error,url:item.url})),output:target},null,2));
