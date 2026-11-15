import {CHARACTER_CATALOG} from './characters.js?v=guardian-age-1';

export const namedReportSubjects=r=>['leaders','claimants'].includes(r.kind)?r.leaders||[]:r.kind==='authority'&&r.value&&typeof r.value==='object'?r.value.actors||[]:r.kind==='conspiracy'&&r.value==='suspected'&&typeof r.character==='string'?[r.character]:r.kind?.startsWith('office_')||r.kind==='succession'?[r.value]:[];
const reportAge=(s,r)=>(s.year-(r.observationYear??r.year))*12+s.month-(r.observationMonth??r.month);
const validName=name=>Array.isArray(name)&&name.length===2&&name.every(x=>typeof x==='string'&&x.length>0);
const nameDate=r=>Number.isFinite(r.year)&&Number.isInteger(r.month)?r.year*12+r.month:null;
// A dated observation outranks an undated lead. Conflicting undated names
// have no known chronological order and cannot identify a single name.
function selectName(records){const dated=records.filter(r=>nameDate(r)!=null).sort((a,b)=>nameDate(b)-nameDate(a));if(dated.length)return dated[0];return new Set(records.map(r=>JSON.stringify(r.name))).size===1?records[0]:null}
// Undated legacy entries were already present in the player's records. A
// dated entry, however, cannot be delivered or observed in the future.
export function isDeliveredReport(s,r){
 const now=s.year*12+s.month,check=(year,month)=>year==null&&month==null?true:Number.isFinite(year)&&Number.isInteger(month)&&month>=1&&month<=12&&year*12+month<=now;
 return !!r&&check(r.year,r.month)&&check(r.observationYear??r.year,r.observationMonth??r.month)&&check(r.receivedYear,r.receivedMonth);
}
// Sightings retain when a force was observed, even when a report arrives later.
export function sightingAge(s,r){return s.year*12+s.month-((r.observationYear??r.year)*12+(r.observationMonth??r.month))}
export function isCompletedMeeting(s,m){const year=m?.resolvedYear??m?.year,month=m?.resolvedMonth??m?.month;return m?.status==='met'&&Number.isFinite(year)&&Number.isInteger(month)&&month>=1&&month<=12&&year*12+month<=s.year*12+s.month}
function personNameRecords(s,actor,target,id){
 const reports=s.knowledge?.[actor]?.[target]?.reports||[];
 const records=reports.filter(r=>isDeliveredReport(s,r)&&(!Number.isFinite(reportAge(s,r))||reportAge(s,r)>=0)&&namedReportSubjects(r).includes(id)&&validName(r.peopleNames?.[id])).map(r=>({name:r.peopleNames[id],year:r.observationYear??r.year,month:r.observationMonth??r.month}));
 // Only a completed meeting's own observation can supersede a dated report.
 // Legacy reportedName is the name used to address the request, not a new observation.
 for(const m of s.meetings||[])if(m.actor===actor&&m.targetFaction===target&&m.target===id&&isCompletedMeeting(s,m)&&validName(m.observedName))records.push({name:m.observedName,year:m.resolvedYear??m.year,month:m.resolvedMonth??m.month});
 return records;
}
export function reportedPersonName(s,actor,target,id){
 const found=selectName(personNameRecords(s,actor,target,id));
 return found?{name:[...found.name],year:found.year,month:found.month}:null;
}
export function visiblePersonName(s,actor,id){
 const person=CHARACTER_CATALOG[id];if(!person)return null;
 if(!person.fictional||s.world.characters[id]?.faction===actor)return person.name;
 const records=Object.keys(s.knowledge?.[actor]||{}).flatMap(target=>personNameRecords(s,actor,target,id));
 return selectName(records)?.name||s.meetings?.filter(m=>m.actor===actor&&m.target===id&&isCompletedMeeting(s,m)&&validName(m.reportedName)).sort((a,b)=>((b.resolvedYear??b.year)-(a.resolvedYear??a.year))*12+(b.resolvedMonth??b.month)-(a.resolvedMonth??a.month))[0]?.reportedName||['Unrecorded name','姓名未记录'];
}
// Old foreign letters never acquire a fictional person's later or hidden name.
export function storedCorrespondentName(id,snapshot){
 if(validName(snapshot))return [...snapshot];
 const person=CHARACTER_CATALOG[id];return person&&!person.fictional&&validName(person.name)?[...person.name]:['Unrecorded name','姓名未记录'];
}
