// A planning range based only on dated sightings, never the hidden enemy roster.
export function estimateAttackLosses({attacker,food,originSupply,destination,sightings,year,month}){
 const usable=(sightings||[]).filter(x=>Array.isArray(x.strengthBand)&&x.strengthBand.length===2&&Number.isFinite(x.year)&&Number.isFinite(x.month)).map(x=>({...x,age:(year-x.year)*12+month-x.month})).filter(x=>x.age>=0&&x.age<=6);
 if(!attacker?.men||!usable.length)return {available:false};
 const enemyLow=usable.reduce((n,x)=>n+Math.max(0,x.strengthBand[0]),0),enemyHigh=usable.reduce((n,x)=>n+Math.max(0,x.strengthBand[1]),0);
 const age=Math.max(...usable.map(x=>x.age)),terrain={plain:1,hills:1.2,forest:1.12,urban:1.25,desert:1.06}[destination.terrain]||1,fort=1+Math.max(0,destination.fort||0)*.12;
 const quality=.65+(attacker.morale||50)/200+(attacker.skill||0)*.055+(attacker.experience||0)*.025;
 const ownSupply=Math.min(1,Math.max(.65,food/20))*Math.min(1,Math.max(.7,originSupply*1000/attacker.men));
 const ownPower=Math.max(1,attacker.men*quality*ownSupply);
 const defenseLow=Math.max(1,enemyLow*.7*terrain*fort*.65*.85),defenseHigh=Math.max(1,enemyHigh*1.15*terrain*fort*1.3*1.22);
 const low=Math.max(0,Math.floor(Math.min(attacker.men,enemyLow*.19*(defenseLow/(ownPower*1.25))**.25)/100)*100);
 const high=Math.min(attacker.men,Math.max(low,Math.ceil(enemyHigh*.31*(defenseHigh/(ownPower*.75))**.25/100)*100));
 return {available:true,low,high,enemyLow,enemyHigh,age,confidence:age<=1?'recent':'stale'};
}
