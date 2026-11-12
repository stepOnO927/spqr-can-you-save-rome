// A participant can assess losses after a battle without knowing exact enemy rolls.
// The interval is deliberately coarse and never includes enemy starting strength.
export function enemyBattleLossEstimate(battle,player){
 if(!battle||!player||battle.attacker?.owner!==player&&battle.defender?.owner!==player)return null;
 const loss=battle.attacker.owner===player?battle.lossD:battle.lossA;
 if(!Number.isFinite(loss)||loss<0)return null;
 const step=loss<500?50:100;
 const low=Math.max(0,Math.floor(loss*.7/step)*step);
 const high=Math.max(low+step,Math.ceil(loss*1.3/step)*step);
 return {low,high,source:'battlefield_observation'};
}
