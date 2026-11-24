import {claimReward} from './legacy-core.js?v=21';

export const HARBOR_ROUTES={
 tyre:{name:['Tyre','推罗'],cost:25,cargo:['Dyed textile sample','染色织物样本'],report:['A merchant claims a dyed textile lot is available. The Harbor Office has not checked a manifest or its origin.','商人声称可供一批染色织物；港务局尚未核实货单及产地。']},
 alexandria:{name:['Alexandria','亚历山大里亚'],cost:25,cargo:['Grain consignment','谷物货运'],report:['A broker reports a possible grain consignment. Quantity and arrival are unverified.','经纪人报告可能有一船谷物；数量与抵港时间均未核实。']},
 massalia:{name:['Massalia','马赛利亚'],cost:25,cargo:['Coastal pottery cargo','沿海陶器货运'],report:['A captain describes pottery cargo on a coastal route. The entry is testimony, not a confirmed delivery.','船长称沿海航线有一批陶器；这只是证词，尚非已核实的交货。']}
};
export const HARBOR_EVENT_COSTS={audit:20,broker:10};
export const GRAIN_CONTRACT_COSTS={audit:20,ratify:5,defer:0};
const grainContractEffects={audit:{people:4,aristocrats:-2,corruption:-4,reputation:3},ratify:{people:-4,aristocrats:5,corruption:5},defer:{people:-2,senate:2,reputation:-2}};
const clamp=value=>Math.max(0,Math.min(100,value));
const ready=profile=>profile?.buildings?.includes('harbor');
const reports=profile=>Array.isArray(profile.harborTradeReports)?profile.harborTradeReports:profile.harborTradeReports=[];
const events=profile=>Array.isArray(profile.harborEvents)?profile.harborEvents:profile.harborEvents=[];

export function commissionMerchantReport(profile,route,now=new Date()){
 const item=HARBOR_ROUTES[route];if(!ready(profile)||!item||reports(profile).some(record=>record.route===route)||profile.coins<item.cost)return {ok:false,reason:'unavailable'};
 profile.coins-=item.cost;const record={route,at:now.toISOString(),source:'merchant-testimony',verified:false};reports(profile).push(record);return {ok:true,record};
}
export function acquireTyrianCloth(profile,now=new Date()){
 if(!ready(profile)||!reports(profile).some(record=>record.route==='tyre')||profile.collectibles.includes('purple-cloth')||profile.coins<80)return {ok:false,reason:'unavailable'};
 profile.coins-=80;profile.collectibles.push('purple-cloth');return {ok:true,at:now.toISOString()};
}
export function settleHarborExchange(profile,choice,now=new Date()){
 const cost=HARBOR_EVENT_COSTS[choice];if(!ready(profile)||!cost||new Set(reports(profile).map(record=>record.route).filter(route=>HARBOR_ROUTES[route])).size<2||events(profile).some(record=>record.id==='crossed-manifests')||profile.coins<cost)return {ok:false,reason:'unavailable'};
 profile.coins-=cost;
 if(choice==='audit'){profile.politics.reputation=clamp(profile.politics.reputation+3);profile.politics.corruption=clamp(profile.politics.corruption-1)}
 else{profile.politics.aristocrats=clamp(profile.politics.aristocrats+3);profile.politics.corruption=clamp(profile.politics.corruption+2)}
 const record={id:'crossed-manifests',choice,at:now.toISOString(),cost};events(profile).push(record);
 if(!profile.collectibles.includes('merchant-ledger'))profile.collectibles.push('merchant-ledger');
 return {ok:true,record};
}
export function grainContractReviewAvailable(profile){
 if(!ready(profile)||events(profile).some(record=>record.id==='grain-contractor-review'))return false;
 const decisions=Array.isArray(profile.decisions)?profile.decisions:[];
 const index=decisions.findIndex(decision=>decision.id==='grain'&&decision.choice===1);
 return index>=0&&decisions.length-index-1>=3;
}
export function settleGrainContractReview(profile,choice,now=new Date()){
 if(!grainContractReviewAvailable(profile)||!Object.hasOwn(GRAIN_CONTRACT_COSTS,choice))return {ok:false,reason:'unavailable'};
 const cost=GRAIN_CONTRACT_COSTS[choice];
 if(profile.coins<cost)return {ok:false,reason:'coins'};
 profile.coins-=cost;
 const effects=grainContractEffects[choice];
 for(const [key,change] of Object.entries(effects))profile.politics[key]=clamp((profile.politics[key]??50)+change);
 const claimed=claimReward(profile,'harbor:grain-contractor-review',25);
 const record={id:'grain-contractor-review',choice,at:now.toISOString(),cost,effects:{...effects},coinsClaimed:claimed?25:0};
 events(profile).push(record);
 profile.collectibles||=[];
 if(!profile.collectibles.includes('grain-contract-review'))profile.collectibles.push('grain-contract-review');
 return {ok:true,record,coins:record.coinsClaimed};
}
