import {upgradeSave} from './engine.js';

export const SAVE_FORMAT='spqr-campaign-v2';
function legacySaveId(source){const raw=JSON.stringify(source);let hash=2166136261;for(let i=0;i<raw.length;i++)hash=Math.imul(hash^raw.charCodeAt(i),16777619);return `legacy-import-${(hash>>>0).toString(16)}`}
export function importCampaign(text){
 const parsed=JSON.parse(text),candidate=parsed?.format===SAVE_FORMAT?parsed.campaign:parsed;
 if(!candidate||typeof candidate!=='object'||!Array.isArray(candidate.regions)||!Array.isArray(candidate.armies)||!candidate.factions||!['caesar','senate'].includes(candidate.player))throw Error('Invalid SPQR campaign');
 if(candidate.regions.length<20||candidate.regions.length>300||candidate.armies.length>1000)throw Error('Invalid campaign size');
 const state=upgradeSave(candidate);
 if(!Array.isArray(state.regions)||!state.regions.some(r=>r.id==='roma')||!state.regions.some(r=>r.id==='cisalpine'))throw Error('Missing campaign territories');
 if(!state.legacyRunId)state.legacyRunId=legacySaveId(candidate);
 if(state.startYear==null)state.startYear=-49;if(state.startMonth==null)state.startMonth=1;
 return state;
}
export function exportCampaign(state){return JSON.stringify({format:SAVE_FORMAT,exportedAt:new Date().toISOString(),campaign:state},null,2)}
export function downloadCampaign(state){const name=`spqr-${Math.abs(state.year)}bce-${String(state.month).padStart(2,'0')}-${state.player}.json`,url=URL.createObjectURL(new Blob([exportCampaign(state)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
