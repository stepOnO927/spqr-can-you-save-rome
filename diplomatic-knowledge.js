import {ROUTES,FACTIONS} from './data.js?v=phase-x-1';

// Public announcements are learned by participants and adjacent observers.
// Snapshots are not live links: an observer who loses contact keeps old news.
export function initializeDiplomaticKnowledge(s){s.world.diplomaticKnowledge||={};return s}
function hasContact(s,viewer,parties){
 if(parties.includes(viewer))return true;
 const owned=new Set(s.regions.filter(r=>r.owner===viewer).map(r=>r.id)),reports=s.controlKnowledge?.[viewer]||{};
 return ROUTES.some(([a,b])=>owned.has(a)&&parties.includes(reports[b]?.owner)||owned.has(b)&&parties.includes(reports[a]?.owner));
}
function currentDocuments(s,viewer){
 const result=[];
 for(const war of s.wars||[]){const parties=war.slice(0,2);if(parties.length===2)result.push({id:'war:'+parties.slice().sort().join('|'),kind:'war',type:'war',parties})}
 for(const pair of s.alliances||[]){const parties=pair.slice(0,2),id='alliance:'+parties.slice().sort().join('|');result.push({id,kind:'alliance',type:'full',parties})}
 for(const t of s.agreements||[])if(t.status==='active'&&s.year*12+s.month<t.expiresAt&&!s.wars.some(w=>t.parties.every(p=>w.includes(p)))&&(!t.secret||t.parties.includes(viewer)))result.push({id:t.id,kind:'agreement',type:t.type,parties:[...t.parties],secret:!!t.secret});
 for(const c of s.coalitions||[])if(c.status==='active'&&s.year*12+s.month<c.expiresAt)result.push({id:c.id,kind:'coalition',type:'defensive',parties:[...c.parties],leader:c.leader,target:c.target});
 return result;
}
export function observeDiplomacy(s){
 initializeDiplomaticKnowledge(s);
 for(const viewer of Object.keys(s.factions)){
  const records=s.world.diplomaticKnowledge[viewer]||={},seen=new Set();
  for(const doc of currentDocuments(s,viewer)){
   if(!hasContact(s,viewer,doc.parties))continue;seen.add(doc.id);
   if(viewer===s.player&&doc.kind==='war'&&!doc.parties.includes(viewer)&&records[doc.id]?.status!=='active'){
    const [a,b]=doc.parties.map(id=>FACTIONS[id]?.short||[id,id]);
    s.log.unshift({year:s.year,month:s.month,en:`Frontier reports a war between ${a[0]} and ${b[0]}; the report may become outdated.`,zh:`边境报告${a[1]}与${b[1]}发生战争；消息可能过时。`});s.log=s.log.slice(0,80);
   }
   records[doc.id]={...doc,status:'active',year:s.year,month:s.month,source:doc.parties.includes(viewer)?'participant':'frontier'};
  }
  for(const report of Object.values(records))if(report.status==='active'&&!seen.has(report.id)&&hasContact(s,viewer,report.parties)){
   report.status='ended';report.year=s.year;report.month=s.month;
   if(viewer===s.player&&report.kind==='war'&&!report.parties.includes(viewer)){const [a,b]=report.parties.map(id=>FACTIONS[id]?.short||[id,id]);s.log.unshift({year:s.year,month:s.month,en:`Frontier reports that the war between ${a[0]} and ${b[0]} has ended; the report may become outdated.`,zh:`边境报告${a[1]}与${b[1]}的战争已经结束；消息可能过时。`});s.log=s.log.slice(0,80)}
  }
  const entries=Object.values(records).sort((a,b)=>(b.year*12+b.month)-(a.year*12+a.month));for(const stale of entries.slice(100))delete records[stale.id];
 }
}
export function reportedDiplomacy(s,viewer){return Object.values(s.world?.diplomaticKnowledge?.[viewer]||{}).map(r=>({...r,parties:[...r.parties]}))}
