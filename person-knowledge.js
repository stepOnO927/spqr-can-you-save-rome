import {CHARACTER_CATALOG} from './characters.js?v=dossier-archive-1';

export const namedReportSubjects=r=>['leaders','claimants'].includes(r.kind)?r.leaders||[]:r.kind==='authority'&&r.value&&typeof r.value==='object'?r.value.actors||[]:r.kind==='conspiracy'&&r.value==='suspected'&&typeof r.character==='string'?[r.character]:r.kind?.startsWith('office_')||r.kind==='succession'?[r.value]:[];
const reportAge=(s,r)=>(s.year-(r.observationYear??r.year))*12+s.month-(r.observationMonth??r.month);
const validName=name=>Array.isArray(name)&&name.length===2&&name.every(x=>typeof x==='string'&&x.length>0);
const nameDate=r=>Number.isFinite(r.year)&&Number.isInteger(r.month)?r.year*12+r.month:null;
// A dated observation outranks an undated lead. Conflicting names from the
// same latest month have no established order; preserve the disagreement.
function selectName(records){const dated=records.filter(r=>nameDate(r)!=null).sort((a,b)=>nameDate(b)-nameDate(a));if(dated.length){const newest=dated.filter(r=>nameDate(r)===nameDate(dated[0]));return new Set(newest.map(r=>JSON.stringify(r.name))).size>1?{disputed:true}:newest[0]}return new Set(records.map(r=>JSON.stringify(r.name))).size===1?records[0]:null}
// Undated legacy entries were already present in the player's records. A
// dated entry, however, cannot be delivered or observed in the future.
export function isDeliveredReport(s,r){
 const now=s.year*12+s.month,check=(year,month)=>year==null&&month==null?true:Number.isFinite(year)&&Number.isInteger(month)&&month>=1&&month<=12&&year*12+month<=now;
 return !!r&&check(r.year,r.month)&&check(r.observationYear??r.year,r.observationMonth??r.month)&&check(r.receivedYear,r.receivedMonth);
}
// Sightings retain when a force was observed, even when a report arrives later.
export function sightingAge(s,r){return s.year*12+s.month-((r.observationYear??r.year)*12+(r.observationMonth??r.month))}
export function isCompletedMeeting(s,m){const year=m?.resolvedYear??m?.year,month=m?.resolvedMonth??m?.month;return m?.status==='met'&&Number.isFinite(year)&&Number.isInteger(month)&&month>=1&&month<=12&&year*12+month<=s.year*12+s.month}
// Archived reports can provide historical leads, never current authority or
// corroboration. Cache a per-court index for the current month so AI and UI
// lookups do not rescan a long history on every decision. Archive entries are
// immutable once recorded; additions change the array length.
const archiveIndexes=new WeakMap();
function archivedPersonIndex(s,knowledge){
 const archive=knowledge?.reportArchive;if(!Array.isArray(archive))return {leads:[],names:new Map()};
 const now=s.year*12+s.month,old=archiveIndexes.get(knowledge);if(old&&old.archive===archive&&old.length===archive.length&&old.now===now)return old;
 const leads=[],seen=new Set(),names=new Map();
 for(let i=archive.length-1;i>=0;i--){const r=archive[i];if(!isDeliveredReport(s,r))continue;const named=namedReportSubjects(r),related=[...named,...(['health','age','location','conspiracy'].includes(r.kind)?[r.character]:[])];
  for(const id of related)if(typeof id==='string'&&!seen.has(id)){seen.add(id);leads.push(id)}
  const observed=new Set([...named,...(r.identityObserved===true&&['health','age','location'].includes(r.kind)?[r.character]:[])]);
  for(const id of observed)if(typeof id==='string'&&validName(r.peopleNames?.[id])){const records=names.get(id)||[];records.push({name:r.peopleNames[id],year:r.observationYear??r.year,month:r.observationMonth??r.month});names.set(id,records)}
 }
 const index={archive,length:archive.length,now,leads,names};archiveIndexes.set(knowledge,index);return index;
}
// Names in delivered reports and observations are leads, not proof of current
// office, allegiance, health or willingness to answer a diplomatic letter.
export function reportedPeople(s,actor,target){
 const knowledge=s.knowledge?.[actor]?.[target],reports=knowledge?.reports||[];
 const meetings=(s.meetings||[]).filter(m=>isCompletedMeeting(s,m)&&((m.actor===actor&&m.targetFaction===target)||(m.targetFaction===actor&&m.actor===target))).map(m=>m.actor===actor?m.target:m.person);
 const leads=reports.filter(r=>isDeliveredReport(s,r)).flatMap(r=>[...namedReportSubjects(r),...(['health','age','location','conspiracy'].includes(r.kind)?[r.character]:[])]);
 return [...new Set([...(knowledge?.reportedLeaders||[]),...Object.values(knowledge?.sightings||{}).filter(x=>isDeliveredReport(s,x)).map(x=>x.commanderId),...(knowledge?.commanderReports||[]).filter(x=>isDeliveredReport(s,x)).map(x=>x.commanderId),...leads,...meetings,...archivedPersonIndex(s,knowledge).leads].filter(id=>CHARACTER_CATALOG[id]))];
}
// A contact can be used by either participant's faction. Never reconstruct
// a foreign relationship from its live trust value: older meetings without a
// saved estimate retain one conservative contact point.
export function reportedPersonalContacts(s,actor,other){
 const latest=new Map();
 for(const m of s.meetings||[]){
  const sender=m.actor===actor&&m.target===other,recipient=m.targetFaction===actor&&m.person===other,own=sender?m.person:recipient?m.target:null;
  if(!own||!isCompletedMeeting(s,m))continue;
  const year=m.resolvedYear??m.year,month=m.resolvedMonth??m.month,date=year*12+month,credit=Number.isFinite(m.contactCredit)?Math.max(0,Math.min(10,Math.floor(m.contactCredit))):1,previous=latest.get(own);
  if(!previous||date>previous.date)latest.set(own,{year,month,date,credit});
 }
 return latest;
}
export const reportedPersonalContact=(s,actor,own,other)=>reportedPersonalContacts(s,actor,other).get(own)||null;
function personNameRecords(s,actor,target,id){
 const reports=s.knowledge?.[actor]?.[target]?.reports||[];
 // A named health/location report may merely repeat the name used when the
 // mission was sent. Only an actual identity observation establishes a new
 // dated name; old reports without that provenance stay conservative.
 const observedSubject=r=>r.identityObserved===true&&['health','age','location'].includes(r.kind)&&r.character===id;
 const records=reports.filter(r=>isDeliveredReport(s,r)&&(!Number.isFinite(reportAge(s,r))||reportAge(s,r)>=0)&&(namedReportSubjects(r).includes(id)||observedSubject(r))&&validName(r.peopleNames?.[id])).map(r=>({name:r.peopleNames[id],year:r.observationYear??r.year,month:r.observationMonth??r.month}));
 records.push(...(archivedPersonIndex(s,s.knowledge?.[actor]?.[target]).names.get(id)||[]));
 // A commander identification is a dated observer-owned snapshot. Older
 // sightings lacking a saved name cannot be filled from the live catalog.
 const k=s.knowledge?.[actor]?.[target];for(const r of [...Object.values(k?.sightings||{}),...(k?.commanderReports||[])])if(isDeliveredReport(s,r)&&r.commanderId===id&&validName(r.commanderName))records.push({name:r.commanderName,year:r.observationYear??r.year,month:r.observationMonth??r.month});
 // Only a completed meeting's own observation can supersede a dated report.
 // Legacy reportedName is the name used to address the request, not a new observation.
 for(const m of s.meetings||[]){if(!isCompletedMeeting(s,m))continue;const name=m.actor===actor&&m.targetFaction===target&&m.target===id?m.observedName:m.targetFaction===actor&&m.actor===target&&m.person===id?m.observedPersonName:null;if(validName(name))records.push({name,year:m.resolvedYear??m.year,month:m.resolvedMonth??m.month})}
 return records;
}
export function reportedPersonName(s,actor,target,id){
 const found=selectName(personNameRecords(s,actor,target,id));
 return found&&!found.disputed?{name:[...found.name],year:found.year,month:found.month}:null;
}
export function hasReportedNameConflict(s,actor,id){
 const records=Object.keys(s.knowledge?.[actor]||{}).flatMap(target=>personNameRecords(s,actor,target,id));return selectName(records)?.disputed===true;
}
export function visiblePersonName(s,actor,id){
 const person=CHARACTER_CATALOG[id];if(!person)return null;
 if(!person.fictional||s.world.characters[id]?.faction===actor)return person.name;
 const records=Object.keys(s.knowledge?.[actor]||{}).flatMap(target=>personNameRecords(s,actor,target,id));
 const selection=selectName(records);if(selection?.disputed)return ['Name reports differ','姓名报告不一致'];
 return selection?.name||s.meetings?.filter(m=>m.actor===actor&&m.target===id&&isCompletedMeeting(s,m)&&validName(m.reportedName)).sort((a,b)=>((b.resolvedYear??b.year)-(a.resolvedYear??a.year))*12+(b.resolvedMonth??b.month)-(a.resolvedMonth??a.month))[0]?.reportedName||['Unrecorded name','姓名未记录'];
}
// Old foreign letters never acquire a fictional person's later or hidden name.
export function storedCorrespondentName(id,snapshot){
 if(validName(snapshot))return [...snapshot];
 const person=CHARACTER_CATALOG[id];return person&&!person.fictional&&validName(person.name)?[...person.name]:['Unrecorded name','姓名未记录'];
}
