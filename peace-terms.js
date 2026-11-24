import {REGIONS,ROUTES} from './data.js?v=phase-x-1';
import {reportedControl} from './control-intelligence.js?v=dossier-archive-1';

const pair=(a,b)=>[a,b].sort().join(':');
const neighbors=id=>ROUTES.filter(r=>r[0]===id||r[1]===id).map(r=>r[0]===id?r[1]:r[0]);
const core=id=>({caesar:'cisalpine',senate:'roma',egypt_claimant:'egypt',parthia_claimant:'parthia'}[id]||id);
const protectedRegion=(owner,id)=>id==='roma'||id===core(owner);
const war=(s,a,b)=>(s.wars||[]).some(w=>w.includes(a)&&w.includes(b));
export function peaceWarIsCurrent(s,letter){
 if(!war(s,letter.actor,letter.target))return false;
 const generation=letter.peaceTerms?.warGeneration??letter.peaceWarGeneration;
 // Old term-free letters did not record a conflict identity. Preserve their
 // legacy behavior rather than inventing a past war number from today's state.
 return generation==null||Number.isInteger(generation)&&generation>=0&&(s.world.warGenerations?.[pair(letter.actor,letter.target)]||0)===generation;
}
export function peaceOfferRegions(s,actor,target){
 const own=s.regions.filter(r=>r.owner===actor);
 if(own.length<2||!war(s,actor,target))return [];
 return own.filter(r=>!protectedRegion(actor,r.id)&&neighbors(r.id).some(id=>reportedControl(s,actor,id)?.owner===target));
}
export function makePeaceTerms(s,actor,target,regionId){
 if(!peaceOfferRegions(s,actor,target).some(r=>r.id===regionId))return null;
 return {version:1,region:regionId,from:actor,to:target,warGeneration:s.world.warGenerations?.[pair(actor,target)]||0,fromGeneration:s.world.dynasticGenerations?.[actor]||0,toGeneration:s.world.dynasticGenerations?.[target]||0};
}
const shape=(letter)=>{
 const t=letter.peaceTerms;
 return letter.subject==='peace'&&t?.version===1&&t.from===letter.actor&&t.to===letter.target&&Number.isInteger(t.warGeneration)&&t.warGeneration>=0&&REGIONS.some(r=>r.id===t.region)&&!protectedRegion(t.from,t.region);
};
// The recipient knows its own frontier. The offered control is a statement in
// the letter, not permission to inspect the sender's present ownership or army.
export function peaceConcessionCredit(s,letter){
 if(!shape(letter))return 0;
 const t=letter.peaceTerms;
 if(!neighbors(t.region).some(id=>s.regions.some(r=>r.id===id&&r.owner===letter.target)))return 0;
 const baseline=REGIONS.find(r=>r.id===t.region);
 return Math.min(.2,Math.max(.05,((baseline.tax||0)+(baseline.food||0))/60));
}
export function peaceTermsText(letter,language='en'){
 if(!letter.peaceTerms)return language==='zh'?'维持当前控制，不附带领土移交。':'Current control is retained; no territorial transfer is offered.';
 const name=REGIONS.find(r=>r.id===letter.peaceTerms.region)?.name?.[language==='zh'?1:0]||(language==='zh'?'未知战区':'an unrecorded theater');
 return language==='zh'?`提议由发信方移交${name}的控制权，以换取和平；有效回信送达前不移交。`:`The sender offers control of ${name} in return for peace; no transfer occurs before a valid acceptance is delivered.`;
}
// Enforce the actual contract only at settlement. No decision or UI uses these
// private revalidation details to infer a foreign change before delivery.
export function canSettlePeaceTerms(s,letter){
 if(!peaceWarIsCurrent(s,letter))return false;
 if(!letter.peaceTerms)return true;
 if(!shape(letter)||!war(s,letter.actor,letter.target))return false;
 const t=letter.peaceTerms;
 return (s.world.warGenerations?.[pair(t.from,t.to)]||0)===t.warGeneration&&(s.world.dynasticGenerations?.[t.from]||0)===(t.fromGeneration||0)&&(s.world.dynasticGenerations?.[t.to]||0)===(t.toGeneration||0)&&s.regions.some(r=>r.id===t.region&&r.owner===t.from)&&
  s.regions.filter(r=>r.owner===t.from).length>1&&neighbors(t.region).some(id=>s.regions.some(r=>r.id===id&&r.owner===t.to));
}
export function applyPeaceTransfer(s,letter){
 const t=letter.peaceTerms;if(!t)return null;
 const r=s.regions.find(r=>r.id===t.region);r.owner=t.to;
 if(s.world.localGovernors?.[r.id]?.faction!==t.to&&s.world.localGovernors?.[r.id])delete s.world.localGovernors[r.id];
 for(const a of s.armies)if(a.siege?.region===r.id&&(a.owner===t.to||!war(s,a.owner,t.to))){a.siege=null;a.order=null}
 letter.peaceTransfer={region:r.id,from:t.from,to:t.to,year:s.year,month:s.month};
 return r;
}

