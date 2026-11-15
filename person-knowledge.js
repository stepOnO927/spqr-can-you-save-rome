import {CHARACTER_CATALOG} from './characters.js?v=faces-reported-names-1';

export const namedReportSubjects=r=>['leaders','claimants'].includes(r.kind)?r.leaders||[]:r.kind==='authority'&&r.value&&typeof r.value==='object'?r.value.actors||[]:r.kind?.startsWith('office_')||r.kind==='succession'?[r.value]:[];
const reportAge=(s,r)=>(s.year-(r.observationYear??r.year))*12+s.month-(r.observationMonth??r.month);
const validName=name=>Array.isArray(name)&&name.length===2&&name.every(x=>typeof x==='string'&&x.length>0);
export function reportedPersonName(s,actor,target,id){
 const reports=s.knowledge?.[actor]?.[target]?.reports||[];
 const found=reports.filter(r=>reportAge(s,r)>=0&&namedReportSubjects(r).includes(id)&&validName(r.peopleNames?.[id])).sort((a,b)=>reportAge(s,a)-reportAge(s,b))[0];
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
