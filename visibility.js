import {reportedArmies} from './character-system.js?v=trade-intelligence-1';

// UI projections only: the simulation and local saves still contain the true state.
export function visibleArmyForPlayer(state,player,id){
 return state.armies.find(a=>a.id===id&&a.owner===player&&a.men>0)
  || reportedArmies(state,player).find(a=>a.id===id) || null;
}
export function battleSideForPlayer(battle,player,side){
 const unit=battle[side];if(unit.owner!==player)return {owner:unit.owner,unknown:true};
 return {...unit,casualties:side==='attacker'?battle.lossA:battle.lossD,unknown:false};
}
export function visibleLogText(event,language){
 if(event.legacyUnverified)return language==='zh'?'旧记录的情报来源无法确认，内容已隐藏。':'An older record has an unknown intelligence source; its contents are hidden.';
 const value=language==='zh'?event.zh:event.en;
 return String(value??'').replace(/Casualties: [\d,]+ \/ [\d,]+\./g,'Casualties: details unverified.').replace(/伤亡：[\d,]+ \/ [\d,]+。/g,'伤亡：详情未核实。');
}

// Summaries written before the knowledge projection may contain hidden world
// changes. Keep them in the save, but do not infer their provenance.
export function visibleSummaryEvidence(summary,viewer){
 if(summary.knowledgeViewer!==viewer)return {changes:[],events:[],legacy:true};
 return {changes:summary.changes||[],events:summary.events||[],legacy:false};
}
