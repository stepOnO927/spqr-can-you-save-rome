import {officeEffects} from './office-system.js';
import {activeEffects,localBuildingEffects,taxReviewExpense} from './development.js?v=28';
import {fleetUpkeepDue} from './naval.js?v=26';
import {productiveEstateRegion} from './local-society.js?v=4';

// These six small playable kingdoms have a home-domain reserve outside the
// regional tax/harvest cells. This is a balance abstraction, not a documented
// revenue figure for 49 BCE. It ends if their home theater is lost.
const HOME_DOMAINS=new Set(['numidia','mauretania','armenia','parthia','galatia','bosporus']);

export function nationalBudget(s,id){
 const f=s.factions[id],owned=s.regions.filter(r=>r.owner===id),units=s.grandMap?new Set(owned.map(r=>r.macro)).size:owned.length;
 const hasHomeDomain=s.grandMap&&HOME_DOMAINS.has(id)&&owned.some(r=>r.id===id),homeIncome=hasHomeDomain?2:0,homeFood=hasHomeDomain?2:0;
 const offices=officeEffects(s,id),effects=id==='rebels'?{}:activeEffects(s,id),buildings=owned.map(r=>localBuildingEffects(r));
 const troops=s.armies.filter(a=>a.owner===id).reduce((n,a)=>n+a.men,0),rate={low:.65,normal:1,high:1.4}[f.tax]||1;
 const tax=owned.reduce((n,r)=>n+r.tax*rate*r.loyalty/100*(s.grandMap?Math.max(.65,Math.min(1.35,r.population/(r.initialPopulation||r.population))):1),0);
 const armyUpkeep=troops/1100,officeIncome=offices.treasury,ideaIncome=effects.treasury||0;
 const buildingIncome=buildings.reduce((n,e)=>n+(e.treasury||0),0),buildingUpkeep=buildings.reduce((n,e)=>n+(e.upkeep||0),0),ideaUpkeep=effects.upkeep||0;
 const landNet=Math.round(tax-armyUpkeep)+homeIncome+officeIncome+ideaIncome+buildingIncome-buildingUpkeep-ideaUpkeep;
 const navyUpkeep=(s.naval?.fleets||[]).filter(v=>v.owner===id&&Object.values(v.ships||{}).some(Boolean)).reduce((n,v)=>n+fleetUpkeepDue(v),0);
 const navalJobs=(s.naval?.jobs||[]).filter(v=>v.owner===id&&v.remaining<=0).length;
 const administrationExpense=Object.values(s.development?.[id]?.slots||{}).reduce((n,slots)=>n+Math.max(0,slots.length-1),0),reviewExpense=id==='rebels'?0:taxReviewExpense(s,id);
 const policy=s.religion?.[id],religiousExpense=(policy?.policy==='civic-patronage'||policy?.transition?.policy==='civic-patronage'&&policy.transition.remaining<=1)&&f.treasury>0?1:0;
 const estateFood=effects.estateLabor?Math.min(4,owned.filter(productiveEstateRegion).length):0;
 const tenantFood=effects.tenantShares?Math.min(3,owned.filter(productiveEstateRegion).length):0;
 const foodProduction=owned.reduce((n,r)=>n+r.food,0)+estateFood,foodConsumption=troops/1200+units*2;
 const foodNet=Math.round(foodProduction-foodConsumption-tenantFood)+homeFood+offices.food+(effects.food||0)+buildings.reduce((n,e)=>n+(e.food||0),0);
 const manpowerNet=Math.round(units*170*(s.grandMap?Math.max(.6,Math.min(1.2,owned.reduce((n,r)=>n+(r.civicSatisfaction??60),0)/Math.max(1,owned.length)/60)):1))+(effects.manpower||0);
 return {tax,armyUpkeep,homeIncome,homeFood,officeIncome,ideaIncome,buildingIncome,buildingUpkeep,ideaUpkeep,landNet,navyUpkeep,navalJobs,administrationExpense,reviewExpense,religiousExpense,projectedNet:landNet-navyUpkeep-navalJobs-administrationExpense-reviewExpense-religiousExpense,foodProduction,estateFood,tenantFood,foodConsumption,foodNet,manpowerNet,stability:offices.stability+(effects.stability||0)+buildings.reduce((n,e)=>n+(e.stability||0),0),legitimacy:buildings.reduce((n,e)=>n+(e.legitimacy||0),0),foodCapacity:100+units*25+buildings.reduce((n,e)=>n+(e.foodCapacity||0),0)};
}
