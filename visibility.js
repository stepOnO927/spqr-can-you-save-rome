// UI projections only: the simulation and local saves still contain the true state.
export function battleSideForPlayer(battle,player,side){
 const unit=battle[side];if(unit.owner!==player)return {owner:unit.owner,unknown:true};
 return {...unit,casualties:side==='attacker'?battle.lossA:battle.lossD,unknown:false};
}
export function visibleLogText(event,language){
 const value=language==='zh'?event.zh:event.en;
 return String(value??'').replace(/Casualties: [\d,]+ \/ [\d,]+\./g,'Casualties: details unverified.').replace(/伤亡：[\d,]+ \/ [\d,]+。/g,'伤亡：详情未核实。');
}
