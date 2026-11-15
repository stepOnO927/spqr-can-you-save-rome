// Farming is disrupted in a theater under siege or hostile occupation.
// A war elsewhere does not reduce an unrelated province's harvest.
import {COMMODITIES,marketPrice} from './market-goods.js?v=guardian-age-1';

// Armies buy provisions from their own realm's markets. A force abroad uses
// the average owned-market quote, never a foreign warehouse's live price.
export function grainProvisionFactor(s,owner,location,ledger){
 const owned=s.regions.filter(r=>r.owner===owner&&ledger?.regions?.[r.id]?.goods?.grain);
 if(!owned.length)return 1;
 const prices=owned.map(r=>marketPrice(ledger.regions[r.id],'grain'));
 const local=owned.findIndex(r=>r.id===location);
 const price=local>=0?prices[local]:prices.reduce((sum,value)=>sum+value,0)/prices.length;
 return 1+Math.max(0,price/COMMODITIES.grain.basePrice-1)*.25;
}

export function agriculturalDisruption(s,region){
 if(!region?.owner)return false;
 const hostile=owner=>owner&&owner!==region.owner&&(s.wars||[]).some(w=>w.includes(owner)&&w.includes(region.owner));
 return (s.armies||[]).some(army=>army.men>0&&hostile(army.owner)&&(
  army.siege?.region===region.id||army.region===region.id&&!army.move
 ));
}

export function agriculturalProduction(s,region,base){
 return agriculturalDisruption(s,region)?Math.floor(Math.max(0,base)/2):base;
}
