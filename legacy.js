import {syncChronicleDispatches} from './chronicle.js?v=dynasty-id-3';
import {CHARACTER_CATALOG} from './characters.js?v=dynasty-id-3';
import {initializeDynasties} from './dynasties.js?v=dynasty-id-3';

export function canFinalizeCampaign(s){return !!(s.victory||s.peacefulVictory||s.world?.dynasties?.scenario?.stage==='resolved')}

// Older ruler histories use ':' between IDs, while simulated IDs themselves
// contain a colon. Keep their existing save format and recover complete IDs.
const rulerIds=current=>String(current||'').match(/fictional:\d+|[^:]+/g)||[];

// The archive is produced only at finalization. It is never computed or shown
// to the player while the campaign is active.
export function finalizeCampaign(s){
 if(!canFinalizeCampaign(s))return {ok:false,reason:'unfinished'};
 syncChronicleDispatches(s);
 const d=initializeDynasties(s);if(d.finalized)return {ok:false,reason:'already'};
 const own=new Set(Object.values(s.world.characters).filter(c=>c.faction===s.player).map(c=>c.id));
 for(const ruler of d.rulers.filter(r=>r.faction===s.player))for(const id of rulerIds(ruler.current))own.add(id);
 for(const defection of s.world.defections||[])if(defection.from===s.player||defection.to===s.player)own.add(defection.id);
 const familyIds=[...new Set([...own].map(id=>s.world.characters[id]?.familyId).filter(Boolean))];
 const archive={id:`${s.player}-${Math.abs(s.year)}-${s.month}-${s.seed}`,faction:s.player,year:s.year,month:s.month,simulated:true,
  rulers:d.rulers.filter(r=>r.faction===s.player).map(r=>({...r,names:rulerIds(r.current).map(id=>CHARACTER_CATALOG[id]?.name||[id,id])})),
  families:familyIds.map(id=>({id,name:d.families[id]?.name||[id,id],members:[...own].filter(person=>s.world.characters[person]?.familyId===id).map(person=>({id:person,name:CHARACTER_CATALOG[person]?.name||[person,person],alive:s.world.characters[person].alive}))})),
  marriages:d.marriages.filter(m=>own.has(m.a)||own.has(m.b)).map(m=>({...m,names:[CHARACTER_CATALOG[m.a]?.name,CHARACTER_CATALOG[m.b]?.name]})),
  crises:(s.world.disputeHistory||[]).filter(e=>e.faction===s.player||e.faction==='egypt'&&d.scenario).map(e=>({...e})),
  lifeEvents:Object.fromEntries([...own].map(id=>[id,(d.lives[id]||[]).map(e=>({...e}))])),
  generals:[...own].filter(id=>(s.world.characters[id]?.battlesCommanded||0)>0).map(id=>({name:CHARACTER_CATALOG[id]?.name||[id,id],battles:s.world.characters[id].battlesCommanded})),
  betrayals:(s.world.defections||[]).filter(e=>e.from===s.player||e.to===s.player).map(e=>({...e,name:CHARACTER_CATALOG[e.id]?.name||[e.id,e.id]})),
  heirs:[...own].filter(id=>(s.world.characters[id]?.adoptiveParents||[]).length>0).map(id=>({name:CHARACTER_CATALOG[id]?.name||[id,id],adoptiveParents:[...s.world.characters[id].adoptiveParents]})),
  inheritanceCases:(d.inheritanceDisputes||[]).filter(x=>x.faction===s.player).map(x=>({...x,deceasedName:CHARACTER_CATALOG[x.deceased]?.name||[x.deceased,x.deceased],beneficiaryName:CHARACTER_CATALOG[x.beneficiary]?.name||[x.beneficiary,x.beneficiary]})),
  marriageOffers:(d.marriageOffers||[]).filter(x=>own.has(x.own)).map(x=>({...x,ownName:CHARACTER_CATALOG[x.own]?.name||[x.own,x.own],foreignName:CHARACTER_CATALOG[x.foreign]?.name||[x.foreign,x.foreign]})),
  asylumRequests:(d.asylumRequests||[]).filter(x=>x.host===s.player).map(x=>({...x,claimantName:CHARACTER_CATALOG[x.claimant]?.name||[x.claimant,x.claimant]})),
  familyAccords:(d.familyAccords||[]).filter(x=>x.host===s.player).map(x=>({...x,contactName:CHARACTER_CATALOG[x.contact]?.name||[x.contact,x.contact],childName:x.child?CHARACTER_CATALOG[x.child]?.name||[x.child,x.child]:null})),
  constitutionalReforms:(s.world.romanReforms||[]).filter(x=>x.faction===s.player).map(x=>({...x})),
  familyLoans:(d.familyLoans||[]).filter(x=>x.faction===s.player).map(x=>({...x,familyName:d.families[x.familyId]?.name||[x.familyId,x.familyId]})),
  regency:s.world.regencies?.[s.player]?{...s.world.regencies[s.player],regentName:CHARACTER_CATALOG[s.world.regencies[s.player].regent]?.name||null,wardName:CHARACTER_CATALOG[s.world.regencies[s.player].ward]?.name||null}:null,
  memories:(d.memories||[]).filter(x=>familyIds.includes(x.familyId)).map(x=>({...x})),
  chronicle:(s.chronicle?.entries||[]).map(e=>({...e})),
  monthlyReports:(s.chronicle?.monthly||[]).map(x=>({...x})),
  annualReviews:(s.chronicle?.annual||[]).map(x=>({...x})),
  victory:!!s.victory,peacefulVictory:!!s.peacefulVictory,scenario:d.scenario?{...d.scenario}:null};
 // Compute and reveal earned distinctions only after an official finalization.
 // They are archival recognition, with no permanent gameplay reward to duplicate.
 archive.achievements=[];
 if((s.agreements||[]).some(t=>t.parties?.includes(s.player))||(s.alliances||[]).some(a=>a.includes(s.player))||(s.world.allianceHistory||[]).some(a=>a.parties.includes(s.player)))archive.achievements.push({id:'diplomatic_table',name:['At the Diplomatic Table','外交谈判桌']});
 if((s.coalitions||[]).some(c=>c.parties?.includes(s.player)||(c.departures||[]).some(x=>x.actor===s.player)))archive.achievements.push({id:'common_cause',name:['A Common Cause','共同事业']});
 if((s.world.movements||[]).some(m=>m.parent===s.player&&m.stage==='settled'&&['negotiated','reform','transfer'].includes(m.outcome)))archive.achievements.push({id:'peaceful_settlement',name:['A Peaceful Settlement','和平和解']});
 if((s.world.religiousInstitutions||[]).some(o=>(o.history||[]).some(h=>h.actor===s.player&&['negotiate','tolerance'].includes(h.action))))archive.achievements.push({id:'civic_dialogue',name:['Civic Dialogue','公民对话']});
 // IMPERIUM distinctions: computed only here, at official finalization; never shown before.
 const focus=s.world.nationalFocus?.[s.player],templates=s.world.formations?.templates||{};
 if((focus?.completed?.length||0)>=6)archive.achievements.push({id:'national_will',name:['National Will','国家意志']});
 if(s.armies.some(a=>a.owner===s.player&&a.formation&&templates[a.formation.templateId]&&!templates[a.formation.templateId].preset))archive.achievements.push({id:'legion_reformer',name:['Reformer of the Legions','军团改革者']});
 if((s.world.battlePlans||[]).some(p=>p.owner===s.player&&p.status==='completed'&&p.roles.length>=3))archive.achievements.push({id:'grand_operation',name:['A Grand Operation','宏大战役']});
 archive.achievements=archive.achievements.filter((a,i,list)=>list.findIndex(x=>x.id===a.id)===i);
 d.finalized=archive;return {ok:true,archive};
}
