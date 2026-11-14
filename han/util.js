// Shared helpers for the Han DLC: deterministic randomness, dates, logging.
export const monthIndex=s=>s.year*12+s.month;
export function roll(s,key,salt=0){let h=(s.seed^(monthIndex(s)*977)^salt)>>>0;for(const c of String(key))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;h^=h>>>16;h=Math.imul(h,0x45d9f3b)>>>0;h^=h>>>16;return (h>>>0)/4294967296}
export const clamp=(v,lo=0,hi=100)=>Math.max(lo,Math.min(hi,v));
export const name=(s,id,lang=0)=>s.persons[id]?.name?.[lang]||id;
export function log(s,text,meta={}){
 const entry={year:s.year,month:s.month,text,...meta};s.log.push(entry);if(s.log.length>400)s.log.splice(0,s.log.length-400);
 for(const id of new Set([meta.who,meta.who2])){
  const career=s.persons?.[id]?.career;if(!Array.isArray(career))continue;
  career.push({...entry});if(career.length>80)career.splice(1,career.length-80);
 }
 return entry;
}
export function dateLabel(y,m,lang=0){const ce=y>0;return lang?`${ce?'公元':'公元前'}${Math.abs(y)}年${m}月`:`${m}/${Math.abs(y)} ${ce?'CE':'BCE'}`}
export function advanceDate(s){s.month++;if(s.month>12){s.month=1;s.year++;if(s.year===0)s.year=1}}
export const isLiuName=p=>p?.surname==='Liu';
