export function validPlayableCampaign(data){
 if(!data||!Array.isArray(data.regions)||!data.regions.length||!Array.isArray(data.armies)||!data.factions?.[data.player])return false;
 if(['caesar','senate'].includes(data.player))return true;
 if(data.localCampaign?.id!==data.player||data.scenario!=='local_city'||!data.regions.some(region=>region.localEntities?.some(entity=>entity.id===data.player&&entity.type==='city_state'&&entity.procedural)))return false;
 const validOffer=(offer,max)=>offer==null||!Array.isArray(offer)&&typeof offer==='object'&&typeof offer.host==='string'&&offer.host!==data.player&&!!data.factions[offer.host]&&Number.isInteger(offer.remaining)&&offer.remaining>=1&&offer.remaining<=max;
 const offers=[data.localCampaign.tradeOffer,data.localCampaign.protectionOffer,data.localCampaign.independenceOffer];
 return validOffer(offers[0],2)&&validOffer(offers[1],3)&&validOffer(offers[2],2)&&offers.filter(Boolean).length<=1;
}
