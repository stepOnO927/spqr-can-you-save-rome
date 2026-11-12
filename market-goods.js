// Shared measured batches for the Roman campaign and the eastern simulation.
export const COMMODITIES={
 grain:{name:['Grain','谷物'],unit:['100 tons','百吨'],basePrice:2},
 horses:{name:['Horses','马匹'],unit:['100 head','百匹'],basePrice:5},
 iron:{name:['Iron','铁'],unit:['20 tons','二十吨'],basePrice:4},
 timber:{name:['Timber','木材'],unit:['100 logs','百根'],basePrice:3},
 silk:{name:['Silk','丝绸'],unit:['50 bolts','五十匹'],basePrice:8},
 papyrus:{name:['Papyrus','纸草'],unit:['100 rolls','百卷'],basePrice:5}
};
const clamp=(n,low,high)=>Math.min(high,Math.max(low,n));
export function marketPrice(market,good){
 const item=market?.goods?.[good],base=COMMODITIES[good]?.basePrice;
 if(!item||!base)return null;
 const desired=Math.max(4,item.consumption*4+item.production*2),pressure=(desired-item.stock)/desired;
 return clamp(Math.round(base*(1+pressure*.7)),Math.max(1,Math.round(base*.5)),base*3);
}
