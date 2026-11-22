import {reportedDiplomacy} from '../diplomatic-knowledge.js?v=world-kings-command-age-1';

// A nonmember sees only a dated diplomatic report. A member may inspect its
// own current charter even before the monthly report cycle runs.
export function knownOrganizations(state,viewer){
 const records=new Map(reportedDiplomacy(state,viewer).filter(x=>x.kind==='coalition').map(x=>[x.id,{...x,own:x.parties.includes(viewer)}]));
 for(const record of records.values())if(record.own&&!state.coalitions?.some(c=>c.id===record.id&&c.status==='active'&&c.parties.includes(viewer)))record.status='ended';
 for(const c of state.coalitions||[])if(c.status==='active'&&c.parties.includes(viewer))records.set(c.id,{id:c.id,kind:'coalition',type:c.kind||'defensive',name:c.name||`Defensive Coalition ${c.id.split(':').pop()}`,parties:[...c.parties],leader:c.leader,target:c.target,status:'active',year:state.year,month:state.month,source:'participant',own:true,cohesion:c.cohesion,start:c.start,charter:c.charter});
 return [...records.values()].sort((a,b)=>a.id.localeCompare(b.id,undefined,{numeric:true}));
}

export function organizationMapColor(owners,organization){
 if(owners.length!==1)return '#b39757';
 const owner=owners[0];
 if(!owner||owner==='shared')return '#777b76';
 if(!organization)return '#65756d';
 return organization.parties.includes(owner)?'#9673b6':'#65756d';
}

export function organizationsForOwner(organizations,owner){
 return owner&&owner!=='shared'?organizations.filter(x=>x.parties.includes(owner)):[];
}
