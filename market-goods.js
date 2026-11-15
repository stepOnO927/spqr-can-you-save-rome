// Shared measured batches for the Roman campaign and the eastern simulation.
export const COMMODITIES={
 grain:{name:['Grain','谷物'],unit:['100 tons','百吨'],basePrice:2},
 provisions:{name:['Field rations','行军口粮'],unit:['100 tons','百吨'],basePrice:3},
 livestock:{name:['Herd animals','牲畜'],unit:['100 head','百头'],basePrice:3},
 horses:{name:['Horses','马匹'],unit:['100 head','百匹'],basePrice:5},
 iron:{name:['Iron','铁'],unit:['20 tons','二十吨'],basePrice:4},
 weapons:{name:['Weapons and equipment','兵器与装备'],unit:['6,000 sets','六千套'],basePrice:6},
 copper:{name:['Copper','铜'],unit:['20 tons','二十吨'],basePrice:4},
 stone:{name:['Building stone','建筑石材'],unit:['20 tons','二十吨'],basePrice:3},
 timber:{name:['Timber','木材'],unit:['100 logs','百根'],basePrice:3},
 silk:{name:['Silk','丝绸'],unit:['50 bolts','五十匹'],basePrice:8},
 wool:{name:['Woollen textiles','毛织物'],unit:['50 bolts','五十匹'],basePrice:4},
 jade:{name:['Jade','玉石'],unit:['20 pieces','二十件'],basePrice:7},
 papyrus:{name:['Papyrus','纸草'],unit:['100 rolls','百卷'],basePrice:5}
};
const clamp=(n,low,high)=>Math.min(high,Math.max(low,n));
export function marketPrice(market,good){
 const item=market?.goods?.[good],base=COMMODITIES[good]?.basePrice;
 if(!item||!base)return null;
 const desired=Math.max(4,item.consumption*4+item.production*2),pressure=(desired-item.stock)/desired;
 return clamp(Math.round(base*(1+pressure*.7)),Math.max(1,Math.round(base*.5)),base*3);
}

// Finished military goods are produced from measured local inputs. The
// conversion ledger keeps raw-material conservation auditable across saves.
export function produceMarketGood(market,good,potential){
 const input={weapons:'iron',provisions:'grain'}[good];
 if(!input)return potential;
 const source=market?.goods?.[input];if(!source)return 0;
 const quantity=Math.min(potential,source.stock||0);
 source.stock-=quantity;source.usedForManufacture=(source.usedForManufacture||0)+quantity;
 return quantity;
}
