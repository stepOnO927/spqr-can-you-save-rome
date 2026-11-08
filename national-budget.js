import {officeEffects} from './office-system.js';
import {activeEffects,localBuildingEffects} from './development.js';
import {fleetUpkeepDue} from './naval.js';

export function nationalBudget(s,id){
 const f=s.factions[id],owned=s.regions.filter(r=>r.owner===id),units=s.grandMap?new Set(owned.map(r=>r.macro)).size:owned.length;
 const offices=officeEffects(s,id),effects=id==='rebels'?{}:activeEffects(s,id),buildings=owned.map(r=>localBuildingEffects(r));
 const troops=s.armies.filter(a=>a.owner===id).reduce((n,a)=>n+a.men,0),rate={low:.65,normal:1,high:1.4}[f.tax]||1;
 const tax=owned.reduce((n,r)=>n+r.tax*rate*r.loyalty/100*(s.grandMap?Math.max(.65,Math.min(1.35,r.population/(r.initialPopulation||r.population))):1),0);
 const armyUpkeep=troops/1100,officeIncome=offices.treasury,ideaIncome=effects.treasury||0;
 const buildingIncome=buildings.reduce((n,e)=>n+(e.treasury||0),0),buildingUpkeep=buildings.reduce((n,e)=>n+(e.upkeep||0),0),ideaUpkeep=effects.upkeep||0;
 const landNet=Math.round(tax-armyUpkeep)+officeIncome+ideaIncome+buildingIncome-buildingUpkeep-ideaUpkeep;
 const navyUpkeep=(s.naval?.fleets||[]).filter(v=>v.owner===id&&Object.values(v.ships||{}).some(Boolean)).reduce((n,v)=>n+fleetUpkeepDue(v),0);
 const navalJobs=(s.naval?.jobs||[]).filter(v=>v.owner===id&&v.remaining<=0).length;
 const administrationExpense=Object.values(s.development?.[id]?.slots||{}).reduce((n,slots)=>n+Math.max(0,slots.length-1),0);
 const policy=s.religion?.[id],religiousExpense=(policy?.policy==='civic-patronage'||policy?.transition?.policy==='civic-patronage'&&policy.transition.remaining<=1)&&f.treasury>0?1:0;
 const foodProduction=owned.reduce((n,r)=>n+r.food,0),foodConsumption=troops/1200+units*2;
 const foodNet=Math.round(foodProduction-foodConsumption)+offices.food+(effects.food||0)+buildings.reduce((n,e)=>n+(e.food||0),0);
 const manpowerNet=Math.round(units*170*(s.grandMap?Math.max(.6,Math.min(1.2,owned.reduce((n,r)=>n+(r.civicSatisfaction??60),0)/Math.max(1,owned.length)/60)):1))+(effects.manpower||0);
 return {tax,armyUpkeep,officeIncome,ideaIncome,buildingIncome,buildingUpkeep,ideaUpkeep,landNet,navyUpkeep,navalJobs,administrationExpense,religiousExpense,projectedNet:landNet-navyUpkeep-navalJobs-administrationExpense-religiousExpense,foodProduction,foodConsumption,foodNet,manpowerNet,stability:offices.stability+(effects.stability||0)+buildings.reduce((n,e)=>n+(e.stability||0),0),legitimacy:buildings.reduce((n,e)=>n+(e.legitimacy||0),0),foodCapacity:100+units*25+buildings.reduce((n,e)=>n+(e.foodCapacity||0),0)};
}
