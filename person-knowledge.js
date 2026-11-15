import {CHARACTER_CATALOG} from './characters.js?v=succession-ui-recovery-1';

export const namedReportSubjects=r=>['leaders','claimants'].includes(r.kind)?r.leaders||[]:r.kind==='authority'&&r.value&&typeof r.value==='object'?r.value.actors||[]:r.kind?.startsWith('office_')||r.kind==='succession'?[r.value]:[];
const reportAge=(s,r)=>(s.year-(r.observationYear??r.year))*12+s.month-(r.observationMonth??r.month);
const validName=name=>Array.isArray(name)&&name.length===2&&name.every(x=>typeof x==='string'&&x.length>0);
// Undated legacy entries were already present in the player's records. A
// dated entry, however, cannot be delivered or observed in the future.
export function isDeliveredReport(s,r){
 const now=s.year*12+s.month,check=(year,month)=>year==null&&month==null?true:Number.isFinite(year)&&Number.isInteger(month)&&month>=1&&month<=12&&year*12+month<=now;
 return !!r&&check(r.year,r.month)&&check(r.observationYear??r.year,r.observationMonth??r.month);
}
export function reportedPersonName(s,actor,target,id){
 const reports=s.knowledge?.[actor]?.[target]?.reports||[];
 const found=reports.filter(r=>isDeliveredReport(s,r)&&reportAge(s,r)>=0&&namedReportSubjects(r).includes(id)&&validName(r.peopleNames?.[id])).sort((a,b)=>reportAge(s,a)-reportAge(s,b))[0];
 return found?{name:[...found.peopleNames[id]],year:found.observationYear??found.year,month:found.observationMonth??found.month}:null;
}
export function visiblePersonName(s,actor,id){
 const person=CHARACTER_CATALOG[id];if(!person)return null;
 if(!person.fictional||s.world.characters[id]?.faction===actor)return person.name;
 const records=Object.keys(s.knowledge?.[actor]||{}).map(target=>reportedPersonName(s,actor,target,id)).filter(Boolean).sort((a,b)=>(b.year-a.year)*12+b.month-a.month);
 return records[0]?.name||s.meetings?.find(m=>m.actor===actor&&m.target===id&&validName(m.reportedName))?.reportedName||['Unrecorded name','姓名未记录'];
}
// Old foreign letters never acquire a fictional person's later or hidden name.
export function storedCorrespondentName(id,snapshot){
 if(validName(snapshot))return [...snapshot];
 const person=CHARACTER_CATALOG[id];return person&&!person.fictional&&validName(person.name)?[...person.name]:['Unrecorded name','姓名未记录'];
}
